"""
ComplianceFlow Backend API
Enterprise AI Workflow Engine - 100% Local Processing
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
import sys

from app.core.config import settings
from app.api import health, databases, llm, workflows, outputs
from app.services.ollama import OllamaService
# Database connections are created on-demand via API endpoints


# Configure logging
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level="DEBUG" if settings.DEBUG else "INFO",
)


# Lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown."""
    logger.info("🚀 Starting ComplianceFlow API...")

    # Initialize services
    app.state.ollama = OllamaService()
    app.state.db_connectors = {}  # Store active database connectors by ID

    # Check Ollama connectivity
    try:
        health_status = await app.state.ollama.health_check()
        if health_status.status == "healthy":
            logger.info(f"✅ Ollama connected successfully ({health_status.models_available} models available)")
        else:
            logger.warning(f"⚠️ Ollama not available - LLM features disabled: {health_status.error}")
    except Exception as e:
        logger.warning(f"⚠️ Ollama connection failed: {e}")

    logger.info("✅ ComplianceFlow API ready!")

    yield

    # Cleanup
    logger.info("🛑 Shutting down ComplianceFlow API...")
    await app.state.ollama.close()
    logger.info("👋 Goodbye!")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Local AI Workflow Engine with GDPR & EU AI Act Compliance",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include routers
app.include_router(health.router, prefix=settings.API_PREFIX, tags=["Health"])
app.include_router(databases.router, prefix=settings.API_PREFIX, tags=["Databases"])
app.include_router(llm.router, prefix=settings.API_PREFIX, tags=["LLM"])
app.include_router(workflows.router, prefix=settings.API_PREFIX, tags=["Workflows"])
app.include_router(outputs.router, prefix=settings.API_PREFIX, tags=["Outputs"])


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": f"{settings.API_PREFIX}/health",
        "status": "running",
        "compliance": ["GDPR", "EU AI Act"],
        "processing": "100% Local",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="debug" if settings.DEBUG else "info",
    )
