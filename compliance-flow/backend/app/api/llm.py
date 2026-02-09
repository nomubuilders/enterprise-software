"""LLM/Ollama endpoints for AI model interaction."""

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import json

from app.services.ollama import CompletionRequest as OllamaCompletionRequest

router = APIRouter(prefix="/llm")


class GenerateRequest(BaseModel):
    model: str = "qwen3:8b"
    prompt: str
    system: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 2048
    stream: bool = False


class ChatMessage(BaseModel):
    role: str  # system, user, assistant
    content: str


class ChatRequest(BaseModel):
    model: str = "qwen3:8b"
    messages: list[ChatMessage]
    temperature: float = 0.7
    max_tokens: int = 2048
    stream: bool = False


class GenerateResponse(BaseModel):
    model: str
    response: str
    done: bool = True
    total_duration: Optional[int] = None
    eval_count: Optional[int] = None


@router.get("/models")
async def list_models(request: Request):
    """List all available Ollama models."""
    try:
        ollama = request.app.state.ollama
        models = await ollama.list_models()  # Returns list[OllamaModelInfo]

        return {
            "models": [
                {
                    "name": m.name or "",
                    "size": m.size or 0,
                    "modified_at": m.modified_at or "",
                    "digest": (m.digest or "")[:12],
                }
                for m in models
            ],
            "count": len(models),
        }
    except Exception as e:
        return {"models": [], "count": 0, "error": str(e)}


@router.get("/models/{model_name}")
async def get_model_info(model_name: str, request: Request):
    """Get detailed information about a specific model."""
    try:
        ollama = request.app.state.ollama
        info = await ollama.show_model(model_name)
        return {"model": model_name, "info": info}
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Model not found: {e}")


@router.post("/models/{model_name}/pull")
async def pull_model(model_name: str, request: Request):
    """Pull/download a model from Ollama registry."""
    try:
        ollama = request.app.state.ollama
        result = await ollama.pull_model(model_name)
        return {"model": model_name, "status": "pulled", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to pull model: {e}")


@router.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest, request: Request):
    """Generate text completion (non-streaming)."""
    try:
        ollama = request.app.state.ollama

        if req.stream:
            # Return streaming response - create proper CompletionRequest
            stream_request = OllamaCompletionRequest(
                model=req.model,
                prompt=req.prompt,
                system=req.system,
                temperature=req.temperature,
                num_predict=req.max_tokens,
            )

            async def generate_stream():
                async for chunk in ollama.generate_stream(stream_request):
                    yield f"data: {json.dumps({'response': chunk.response, 'done': chunk.done})}\n\n"
                yield "data: [DONE]\n\n"

            return StreamingResponse(
                generate_stream(),
                media_type="text/event-stream",
            )

        # Non-streaming response - create proper CompletionRequest
        completion_request = OllamaCompletionRequest(
            model=req.model,
            prompt=req.prompt,
            system=req.system,
            temperature=req.temperature,
            num_predict=req.max_tokens,
        )
        result = await ollama.generate(completion_request)

        return GenerateResponse(
            model=req.model,
            response=result.response or "",
            done=result.done,
            total_duration=result.total_duration,
            eval_count=result.eval_count,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {e}")


@router.post("/chat")
async def chat(req: ChatRequest, request: Request):
    """Chat completion with conversation history."""
    try:
        from app.services.ollama import ChatRequest as OllamaChatRequest, ChatMessage as OllamaChatMessage

        ollama = request.app.state.ollama

        # Convert to Ollama's ChatRequest format
        ollama_messages = [
            OllamaChatMessage(role=m.role, content=m.content)
            for m in req.messages
        ]

        ollama_request = OllamaChatRequest(
            model=req.model,
            messages=ollama_messages,
            temperature=req.temperature,
            num_predict=req.max_tokens,
        )

        if req.stream:
            async def chat_stream():
                async for chunk in ollama.chat_stream(ollama_request):
                    yield f"data: {json.dumps(chunk)}\n\n"
                yield "data: [DONE]\n\n"

            return StreamingResponse(
                chat_stream(),
                media_type="text/event-stream",
            )

        result = await ollama.chat(ollama_request)

        return {
            "model": req.model,
            "message": {"role": result.message.role, "content": result.message.content} if result.message else {},
            "done": result.done,
            "total_duration": result.total_duration,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {e}")


@router.post("/generate/stream")
async def generate_stream_endpoint(req: GenerateRequest, request: Request):
    """Generate text completion with streaming response."""
    try:
        ollama = request.app.state.ollama

        # Create proper CompletionRequest
        stream_request = OllamaCompletionRequest(
            model=req.model,
            prompt=req.prompt,
            system=req.system,
            temperature=req.temperature,
            num_predict=req.max_tokens,
        )

        async def stream_generator():
            async for chunk in ollama.generate_stream(stream_request):
                yield f"data: {json.dumps({'response': chunk.response, 'done': chunk.done})}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            stream_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Streaming failed: {e}")
