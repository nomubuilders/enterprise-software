"""Voice transcription service using faster-whisper (CTranslate2)."""

import asyncio
import os
import time
from enum import Enum
from pathlib import Path
from typing import Optional

from loguru import logger
from pydantic import BaseModel


class WhisperModelSize(str, Enum):
    """Supported faster-whisper model sizes."""

    TINY = "tiny"
    SMALL = "small"
    MEDIUM = "medium"
    LARGE_V3_TURBO = "large-v3-turbo"


# Model metadata for UI display
MODEL_INFO = {
    WhisperModelSize.TINY: {"parameters": "39M", "vram_gb": 1.0, "relative_speed": 32},
    WhisperModelSize.SMALL: {"parameters": "244M", "vram_gb": 2.0, "relative_speed": 6},
    WhisperModelSize.MEDIUM: {"parameters": "769M", "vram_gb": 5.0, "relative_speed": 2},
    WhisperModelSize.LARGE_V3_TURBO: {"parameters": "809M", "vram_gb": 6.0, "relative_speed": 1},
}

# Default cache directory for faster-whisper models
DEFAULT_MODEL_DIR = os.environ.get(
    "WHISPER_MODEL_DIR",
    str(Path.home() / ".cache" / "huggingface" / "hub"),
)


class TranscriptionSegment(BaseModel):
    """A single transcription segment with timing."""

    start: float
    end: float
    text: str


class TranscriptionResult(BaseModel):
    """Result of a transcription request."""

    text: str
    segments: list[TranscriptionSegment]
    language: str
    language_probability: float
    duration_seconds: float
    processing_time_seconds: float


class ModelStatus(BaseModel):
    """Status of a whisper model."""

    name: str
    downloaded: bool
    parameters: str
    vram_gb: float
    relative_speed: int
    loaded: bool


class VoiceService:
    """Manages faster-whisper model lifecycle and transcription."""

    def __init__(self, model_dir: Optional[str] = None, device: str = "auto"):
        self._model = None
        self._loaded_model_name: Optional[str] = None
        self._model_dir = model_dir or DEFAULT_MODEL_DIR
        self._device = device
        self._lock = asyncio.Lock()
        self._download_tasks: dict[str, asyncio.Task] = {}
        logger.info(f"VoiceService initialized (device={device}, cache={self._model_dir})")

    # ------------------------------------------------------------------
    # Model management
    # ------------------------------------------------------------------

    def _model_is_downloaded(self, model_name: str) -> bool:
        """Check if a model's weights exist on disk."""
        try:
            from huggingface_hub import try_to_load_from_cache

            result = try_to_load_from_cache(
                repo_id=f"Systran/faster-whisper-{model_name}",
                filename="model.bin",
                cache_dir=self._model_dir,
            )
            return result is not None
        except Exception:
            # Fallback: scan the cache dir for the model folder
            cache_path = Path(self._model_dir)
            if not cache_path.exists():
                return False
            pattern = f"*faster-whisper-{model_name}*"
            return any(cache_path.glob(pattern))

    async def list_models(self) -> list[ModelStatus]:
        """List all supported models with their download/loaded status."""
        models = []
        for size in WhisperModelSize:
            info = MODEL_INFO[size]
            models.append(
                ModelStatus(
                    name=size.value,
                    downloaded=self._model_is_downloaded(size.value),
                    parameters=info["parameters"],
                    vram_gb=info["vram_gb"],
                    relative_speed=info["relative_speed"],
                    loaded=self._loaded_model_name == size.value,
                )
            )
        return models

    async def download_model(self, model_name: str) -> dict:
        """Download a model in the background. Returns immediately with status."""
        # Validate model name
        valid = {s.value for s in WhisperModelSize}
        if model_name not in valid:
            return {"success": False, "error": f"Unknown model: {model_name}. Valid: {sorted(valid)}"}

        if self._model_is_downloaded(model_name):
            return {"success": True, "status": "already_downloaded", "model": model_name}

        # Check if download already in progress
        if model_name in self._download_tasks and not self._download_tasks[model_name].done():
            return {"success": True, "status": "downloading", "model": model_name}

        # Start background download
        task = asyncio.create_task(self._download_model_background(model_name))
        self._download_tasks[model_name] = task
        return {"success": True, "status": "download_started", "model": model_name}

    async def _download_model_background(self, model_name: str) -> None:
        """Run the model download in a thread (blocking I/O)."""
        logger.info(f"Downloading whisper model: {model_name}")
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, self._download_model_sync, model_name)
            logger.info(f"Model download complete: {model_name}")
        except Exception as e:
            logger.error(f"Model download failed ({model_name}): {e}")

    def _download_model_sync(self, model_name: str) -> None:
        """Synchronous model download (runs in thread pool)."""
        from faster_whisper import WhisperModel

        # Loading the model triggers download if not cached
        WhisperModel(
            model_name,
            device="cpu",
            compute_type="int8",
            download_root=self._model_dir,
        )

    # ------------------------------------------------------------------
    # Model loading
    # ------------------------------------------------------------------

    async def _ensure_model(self, model_name: str) -> None:
        """Load a model if not already loaded. Thread-safe."""
        async with self._lock:
            if self._loaded_model_name == model_name and self._model is not None:
                return

            logger.info(f"Loading whisper model: {model_name}")
            loop = asyncio.get_event_loop()
            model = await loop.run_in_executor(None, self._load_model_sync, model_name)
            self._model = model
            self._loaded_model_name = model_name
            logger.info(f"Whisper model loaded: {model_name}")

    def _load_model_sync(self, model_name: str):
        """Synchronous model load (runs in thread pool)."""
        from faster_whisper import WhisperModel

        device = self._device
        if device == "auto":
            try:
                import torch
                device = "cuda" if torch.cuda.is_available() else "cpu"
            except ImportError:
                device = "cpu"

        compute_type = "float16" if device == "cuda" else "int8"
        return WhisperModel(
            model_name,
            device=device,
            compute_type=compute_type,
            download_root=self._model_dir,
        )

    # ------------------------------------------------------------------
    # Transcription
    # ------------------------------------------------------------------

    async def transcribe(
        self,
        audio_bytes: bytes,
        model_name: str = "small",
        language: Optional[str] = None,
    ) -> TranscriptionResult:
        """Transcribe audio bytes using faster-whisper.

        Args:
            audio_bytes: Raw audio file bytes (WAV, 16kHz mono PCM Float32 preferred).
            model_name: Which whisper model to use.
            language: Optional ISO language code to skip auto-detection.

        Returns:
            TranscriptionResult with text, segments, language info, and timing.
        """
        await self._ensure_model(model_name)

        start_time = time.monotonic()
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None, self._transcribe_sync, audio_bytes, language
        )
        elapsed = time.monotonic() - start_time

        result.processing_time_seconds = round(elapsed, 3)
        logger.info(
            f"Transcription complete: {result.duration_seconds:.1f}s audio "
            f"in {elapsed:.2f}s ({result.language})"
        )
        return result

    def _transcribe_sync(
        self, audio_bytes: bytes, language: Optional[str]
    ) -> TranscriptionResult:
        """Run transcription synchronously (thread pool)."""
        # Decode WAV bytes to numpy array
        audio_array = self._decode_audio(audio_bytes)

        kwargs = {"beam_size": 5, "vad_filter": True}
        if language:
            kwargs["language"] = language

        segments_iter, info = self._model.transcribe(audio_array, **kwargs)

        segments = []
        full_text_parts = []
        for seg in segments_iter:
            segments.append(
                TranscriptionSegment(
                    start=round(seg.start, 3),
                    end=round(seg.end, 3),
                    text=seg.text.strip(),
                )
            )
            full_text_parts.append(seg.text.strip())

        return TranscriptionResult(
            text=" ".join(full_text_parts),
            segments=segments,
            language=info.language,
            language_probability=round(info.language_probability, 3),
            duration_seconds=round(info.duration, 3),
            processing_time_seconds=0.0,  # filled by caller
        )

    @staticmethod
    def _decode_audio(audio_bytes: bytes):
        """Decode audio bytes to float32 numpy array at 16kHz mono.

        Accepts WAV files. For other formats the caller should convert first.
        """
        import io
        import wave

        import numpy as np

        buf = io.BytesIO(audio_bytes)
        try:
            with wave.open(buf, "rb") as wf:
                n_channels = wf.getnchannels()
                sampwidth = wf.getsampwidth()
                framerate = wf.getframerate()
                n_frames = wf.getnframes()
                raw = wf.readframes(n_frames)
        except Exception:
            # Not a valid WAV — pass raw bytes to faster-whisper which
            # uses ffmpeg internally via its own decoder
            return audio_bytes

        # Convert raw PCM to float32
        if sampwidth == 4:
            # Already float32 PCM
            audio = np.frombuffer(raw, dtype=np.float32)
        elif sampwidth == 2:
            audio = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
        else:
            audio = np.frombuffer(raw, dtype=np.uint8).astype(np.float32) / 128.0 - 1.0

        # Downmix to mono
        if n_channels > 1:
            audio = audio.reshape(-1, n_channels).mean(axis=1)

        # Resample to 16kHz if needed
        if framerate != 16000:
            target_len = int(len(audio) * 16000 / framerate)
            audio = np.interp(
                np.linspace(0, len(audio), target_len, endpoint=False),
                np.arange(len(audio)),
                audio,
            ).astype(np.float32)

        return audio

    # ------------------------------------------------------------------
    # Cleanup
    # ------------------------------------------------------------------

    async def close(self) -> None:
        """Release model and cancel pending downloads."""
        for name, task in self._download_tasks.items():
            if not task.done():
                task.cancel()
                logger.info(f"Cancelled download: {name}")
        self._download_tasks.clear()
        self._model = None
        self._loaded_model_name = None
        logger.info("VoiceService closed")
