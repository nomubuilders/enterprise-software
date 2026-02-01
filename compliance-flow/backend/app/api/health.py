"""Health check endpoints."""

from fastapi import APIRouter, Request
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str
    services: dict


@router.get("/health", response_model=HealthResponse)
async def health_check(request: Request):
    """Check API and service health status."""
    ollama_status = "unknown"
    ollama_models = []

    try:
        ollama = request.app.state.ollama
        health = await ollama.health_check()
        ollama_status = health.get("status", "unknown")
        if ollama_status == "ok":
            models = await ollama.list_models()
            ollama_models = [m.get("name", "") for m in models.get("models", [])]
    except Exception:
        ollama_status = "disconnected"

    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow().isoformat(),
        version=request.app.version,
        services={
            "api": "running",
            "ollama": {
                "status": ollama_status,
                "models": ollama_models[:5],  # First 5 models
            },
            "compliance": {
                "gdpr": "enabled",
                "eu_ai_act": "enabled",
            },
        },
    )


@router.get("/health/ollama")
async def ollama_health(request: Request):
    """Check Ollama LLM service health."""
    try:
        ollama = request.app.state.ollama
        health = await ollama.health_check()
        models = await ollama.list_models()
        return {
            "status": health.get("status", "unknown"),
            "models": models.get("models", []),
            "model_count": len(models.get("models", [])),
        }
    except Exception as e:
        return {"status": "error", "error": str(e), "models": [], "model_count": 0}
