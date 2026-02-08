"""Voice transcription and TTS proxy API routes."""

from fastapi import APIRouter, Request, UploadFile, File, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional
import httpx

router = APIRouter(prefix="/voice")

MAX_AUDIO_SIZE = 25 * 1024 * 1024  # 25MB


class TranscribeRequest(BaseModel):
    """Query parameters for transcription (sent alongside the file)."""

    model: str = "small"
    language: Optional[str] = None


@router.post("/transcribe")
async def transcribe_audio(
    request: Request,
    file: UploadFile = File(...),
    model: str = "small",
    language: Optional[str] = None,
):
    """Transcribe an uploaded audio file using faster-whisper.

    Accepts WAV (preferred: 16kHz mono PCM Float32) or other common formats.
    Returns transcript text, timed segments, detected language, and timing info.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    audio_bytes = await file.read()

    if len(audio_bytes) > MAX_AUDIO_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Audio file too large. Maximum: {MAX_AUDIO_SIZE // (1024 * 1024)}MB",
        )

    if len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty audio file")

    try:
        voice_service = request.app.state.voice
        result = await voice_service.transcribe(
            audio_bytes=audio_bytes,
            model_name=model,
            language=language,
        )
        return {
            "success": True,
            "text": result.text,
            "segments": [s.model_dump() for s in result.segments],
            "language": result.language,
            "language_probability": result.language_probability,
            "duration_seconds": result.duration_seconds,
            "processing_time_seconds": result.processing_time_seconds,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")


@router.post("/tts")
async def text_to_speech(request: Request):
    """Synthesize speech. Uses built-in Piper TTS by default, or proxies to an
    external server when a ``url`` field is provided in the JSON body."""
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    url = body.pop("url", None)
    text = body.get("text", "")

    if not text:
        raise HTTPException(status_code=400, detail="Missing 'text' field")

    # External TTS server (PersonaPlex or other) — fall back to built-in on failure
    if url:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(url, json=body)
                resp.raise_for_status()
            return Response(
                content=resp.content,
                media_type=resp.headers.get("content-type", "audio/wav"),
            )
        except (httpx.HTTPStatusError, httpx.RequestError):
            pass  # fall through to built-in Piper TTS

    # Built-in Piper TTS
    try:
        tts_service = request.app.state.tts
        audio_bytes = await tts_service.synthesize(text)
        return Response(content=audio_bytes, media_type="audio/wav")
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS synthesis failed: {e}")


@router.get("/models")
async def list_voice_models(request: Request):
    """List available whisper models with download and loaded status."""
    try:
        voice_service = request.app.state.voice
        models = await voice_service.list_models()
        return {
            "models": [m.model_dump() for m in models],
            "count": len(models),
        }
    except Exception as e:
        return {"models": [], "count": 0, "error": str(e)}


@router.post("/models/{model_name}/download")
async def download_voice_model(model_name: str, request: Request):
    """Trigger download of a whisper model. Returns immediately with status."""
    try:
        voice_service = request.app.state.voice
        result = await voice_service.download_model(model_name)
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {e}")
