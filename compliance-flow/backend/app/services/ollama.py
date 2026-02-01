"""
Ollama integration service for ComplianceFlow.

Provides async interface for interacting with local Ollama instance including:
- Model listing and management
- Completions (streaming and non-streaming)
- Chat completions with conversation history
- Health checks and model information
"""

from typing import AsyncGenerator, Optional
from datetime import datetime
import httpx
from loguru import logger
from pydantic import BaseModel, Field

from app.core.config import settings


# ============================================================================
# Pydantic Models for Request/Response Types
# ============================================================================


class OllamaModelInfo(BaseModel):
    """Information about an available Ollama model."""

    name: str = Field(..., description="Model name/identifier")
    size: Optional[int] = Field(None, description="Model size in bytes")
    digest: Optional[str] = Field(None, description="Model digest/hash")
    modified_at: Optional[datetime] = Field(None, description="When model was last modified")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "llama3.2",
                "size": 3826087936,
                "digest": "6fef3b...",
                "modified_at": "2024-01-15T10:30:00Z",
            }
        }


class OllamaModelDetails(BaseModel):
    """Detailed information about a model."""

    name: str
    modified_at: datetime
    size: int
    digest: str
    details: Optional[dict] = Field(default=None, description="Model-specific details")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "llama3.2",
                "modified_at": "2024-01-15T10:30:00Z",
                "size": 3826087936,
                "digest": "6fef3b...",
                "details": {"families": ["llama"]},
            }
        }


class CompletionRequest(BaseModel):
    """Request parameters for text completion."""

    model: str = Field(..., description="Model name to use")
    prompt: str = Field(..., description="Input prompt")
    suffix: Optional[str] = Field(None, description="Optional suffix")
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0)
    top_p: Optional[float] = Field(1.0, ge=0.0, le=1.0)
    top_k: Optional[int] = Field(40)
    num_predict: Optional[int] = Field(-1, description="Max tokens to predict (-1 = no limit)")
    repeat_penalty: Optional[float] = Field(1.1)
    stop: Optional[list[str]] = Field(None, description="Stop sequences")
    context: Optional[list[int]] = Field(None, description="Context tokens from previous requests")

    class Config:
        json_schema_extra = {
            "example": {
                "model": "llama3.2",
                "prompt": "What is Python?",
                "temperature": 0.7,
            }
        }


class CompletionResponse(BaseModel):
    """Response from text completion."""

    model: str
    created_at: datetime
    response: str = Field(..., description="Generated text")
    done: bool
    total_duration: Optional[int] = None
    load_duration: Optional[int] = None
    prompt_eval_count: Optional[int] = None
    prompt_eval_duration: Optional[int] = None
    eval_count: Optional[int] = None
    eval_duration: Optional[int] = None
    context: Optional[list[int]] = None

    class Config:
        json_schema_extra = {
            "example": {
                "model": "llama3.2",
                "created_at": "2024-01-15T10:30:00Z",
                "response": "Python is a versatile programming language...",
                "done": True,
            }
        }


class ChatMessage(BaseModel):
    """A message in a chat conversation."""

    role: str = Field(..., description="Role: 'system', 'user', or 'assistant'")
    content: str = Field(..., description="Message content")

    class Config:
        json_schema_extra = {
            "example": {
                "role": "user",
                "content": "What is Python?",
            }
        }


class ChatRequest(BaseModel):
    """Request parameters for chat completion."""

    model: str = Field(..., description="Model name to use")
    messages: list[ChatMessage] = Field(..., description="Conversation history")
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0)
    top_p: Optional[float] = Field(1.0, ge=0.0, le=1.0)
    top_k: Optional[int] = Field(40)
    num_predict: Optional[int] = Field(-1, description="Max tokens to predict")
    repeat_penalty: Optional[float] = Field(1.1)
    stop: Optional[list[str]] = Field(None, description="Stop sequences")

    class Config:
        json_schema_extra = {
            "example": {
                "model": "llama3.2",
                "messages": [
                    {"role": "user", "content": "What is Python?"}
                ],
            }
        }


class ChatResponse(BaseModel):
    """Response from chat completion."""

    model: str
    created_at: datetime
    message: ChatMessage
    done: bool
    total_duration: Optional[int] = None
    load_duration: Optional[int] = None
    prompt_eval_count: Optional[int] = None
    prompt_eval_duration: Optional[int] = None
    eval_count: Optional[int] = None
    eval_duration: Optional[int] = None

    class Config:
        json_schema_extra = {
            "example": {
                "model": "llama3.2",
                "created_at": "2024-01-15T10:30:00Z",
                "message": {
                    "role": "assistant",
                    "content": "Python is a versatile programming language...",
                },
                "done": True,
            }
        }


class HealthCheckResponse(BaseModel):
    """Health check response."""

    status: str = Field(..., description="Health status: 'healthy', 'unhealthy'")
    base_url: str = Field(..., description="Ollama base URL")
    timestamp: datetime
    models_available: Optional[int] = None
    error: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "base_url": "http://localhost:11434",
                "timestamp": "2024-01-15T10:30:00Z",
                "models_available": 3,
            }
        }


# ============================================================================
# Ollama Service
# ============================================================================


class OllamaService:
    """
    Async service for interacting with Ollama API.

    Provides methods for:
    - Model management (list, pull, show)
    - Text completions (streaming and non-streaming)
    - Chat completions
    - Health checks
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout: Optional[int] = None,
    ):
        """
        Initialize Ollama service.

        Args:
            base_url: Ollama base URL (defaults to settings.OLLAMA_BASE_URL)
            timeout: Request timeout in seconds (defaults to settings.OLLAMA_TIMEOUT)
        """
        self.base_url = base_url or settings.OLLAMA_BASE_URL
        self.timeout = timeout or settings.OLLAMA_TIMEOUT
        self._client: Optional[httpx.AsyncClient] = None

        logger.debug(f"Initializing OllamaService with base_url={self.base_url}")

    async def __aenter__(self):
        """Async context manager entry."""
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=self.timeout,
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self._client:
            await self._client.aclose()
            self._client = None

    @property
    def client(self) -> httpx.AsyncClient:
        """Get or create async HTTP client."""
        if not self._client:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=self.timeout,
            )
        return self._client

    async def close(self):
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None
            logger.debug("OllamaService client closed")

    # ========================================================================
    # Health Check
    # ========================================================================

    async def health_check(self) -> HealthCheckResponse:
        """
        Check health of Ollama instance.

        Returns:
            HealthCheckResponse with status and available models count

        Raises:
            httpx.RequestError: If connection fails
            httpx.HTTPStatusError: If request returns error status
        """
        logger.info("Performing health check on Ollama instance")
        try:
            response = await self.client.get("/api/tags")
            response.raise_for_status()

            data = response.json()
            models = data.get("models", [])

            health_response = HealthCheckResponse(
                status="healthy",
                base_url=self.base_url,
                timestamp=datetime.utcnow(),
                models_available=len(models),
            )
            logger.info(f"Ollama health check passed: {len(models)} models available")
            return health_response

        except (httpx.RequestError, httpx.HTTPStatusError) as e:
            logger.error(f"Ollama health check failed: {str(e)}")
            return HealthCheckResponse(
                status="unhealthy",
                base_url=self.base_url,
                timestamp=datetime.utcnow(),
                error=str(e),
            )
        except Exception as e:
            logger.error(f"Unexpected error during health check: {str(e)}", exc_info=True)
            return HealthCheckResponse(
                status="unhealthy",
                base_url=self.base_url,
                timestamp=datetime.utcnow(),
                error=f"Unexpected error: {str(e)}",
            )

    # ========================================================================
    # Model Management
    # ========================================================================

    async def list_models(self) -> list[OllamaModelInfo]:
        """
        List all available models.

        Returns:
            List of available models with metadata

        Raises:
            httpx.RequestError: If connection fails
            httpx.HTTPStatusError: If request returns error status
        """
        logger.debug("Listing available models")
        try:
            response = await self.client.get("/api/tags")
            response.raise_for_status()

            data = response.json()
            models = data.get("models", [])

            model_list = [
                OllamaModelInfo(
                    name=model.get("name"),
                    size=model.get("size"),
                    digest=model.get("digest"),
                    modified_at=model.get("modified_at"),
                )
                for model in models
            ]

            logger.info(f"Listed {len(model_list)} models")
            return model_list

        except httpx.RequestError as e:
            logger.error(f"Failed to list models - connection error: {str(e)}")
            raise
        except httpx.HTTPStatusError as e:
            logger.error(f"Failed to list models - HTTP error: {e.status_code} {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error listing models: {str(e)}", exc_info=True)
            raise

    async def pull_model(self, model_name: str) -> bool:
        """
        Pull (download) a model from Ollama registry.

        Args:
            model_name: Name of model to pull (e.g., 'llama3.2', 'mistral')

        Returns:
            True if successful

        Raises:
            httpx.RequestError: If connection fails
            httpx.HTTPStatusError: If request returns error status
        """
        logger.info(f"Pulling model: {model_name}")
        try:
            response = await self.client.post(
                "/api/pull",
                json={"name": model_name},
            )
            response.raise_for_status()

            logger.info(f"Successfully pulled model: {model_name}")
            return True

        except httpx.RequestError as e:
            logger.error(f"Failed to pull model {model_name} - connection error: {str(e)}")
            raise
        except httpx.HTTPStatusError as e:
            logger.error(
                f"Failed to pull model {model_name} - HTTP error: {e.status_code}"
            )
            raise
        except Exception as e:
            logger.error(f"Unexpected error pulling model {model_name}: {str(e)}", exc_info=True)
            raise

    async def show_model(self, model_name: str) -> OllamaModelDetails:
        """
        Get detailed information about a model.

        Args:
            model_name: Name of model

        Returns:
            Detailed model information

        Raises:
            httpx.RequestError: If connection fails
            httpx.HTTPStatusError: If request returns error status
        """
        logger.debug(f"Getting details for model: {model_name}")
        try:
            response = await self.client.post(
                "/api/show",
                json={"name": model_name},
            )
            response.raise_for_status()

            data = response.json()

            model_details = OllamaModelDetails(
                name=data.get("name"),
                modified_at=data.get("modified_at"),
                size=data.get("size"),
                digest=data.get("digest"),
                details=data.get("details"),
            )

            logger.debug(f"Retrieved details for model: {model_name}")
            return model_details

        except httpx.RequestError as e:
            logger.error(
                f"Failed to get model details {model_name} - connection error: {str(e)}"
            )
            raise
        except httpx.HTTPStatusError as e:
            logger.error(
                f"Failed to get model details {model_name} - HTTP error: {e.status_code}"
            )
            raise
        except Exception as e:
            logger.error(f"Unexpected error getting model details: {str(e)}", exc_info=True)
            raise

    # ========================================================================
    # Text Completion
    # ========================================================================

    async def generate(self, request: CompletionRequest) -> CompletionResponse:
        """
        Generate text completion (non-streaming).

        Args:
            request: CompletionRequest with model, prompt, and parameters

        Returns:
            CompletionResponse with generated text

        Raises:
            httpx.RequestError: If connection fails
            httpx.HTTPStatusError: If request returns error status
        """
        logger.debug(
            f"Generating completion for model={request.model}, "
            f"prompt_len={len(request.prompt)}"
        )
        try:
            payload = request.model_dump(exclude_none=True)
            payload["stream"] = False  # Disable streaming to get single JSON response

            response = await self.client.post(
                "/api/generate",
                json=payload,
            )
            response.raise_for_status()

            data = response.json()

            completion_response = CompletionResponse(
                model=data.get("model"),
                created_at=data.get("created_at", datetime.utcnow()),
                response=data.get("response", ""),
                done=data.get("done", False),
                total_duration=data.get("total_duration"),
                load_duration=data.get("load_duration"),
                prompt_eval_count=data.get("prompt_eval_count"),
                prompt_eval_duration=data.get("prompt_eval_duration"),
                eval_count=data.get("eval_count"),
                eval_duration=data.get("eval_duration"),
                context=data.get("context"),
            )

            logger.info(
                f"Generated completion: {request.model} "
                f"(tokens: {data.get('eval_count', 0)})"
            )
            return completion_response

        except httpx.RequestError as e:
            logger.error(f"Failed to generate completion - connection error: {str(e)}")
            raise
        except httpx.HTTPStatusError as e:
            logger.error(f"Failed to generate completion - HTTP error: {e.status_code}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error generating completion: {str(e)}", exc_info=True)
            raise

    async def generate_stream(
        self, request: CompletionRequest
    ) -> AsyncGenerator[CompletionResponse, None]:
        """
        Generate text completion with streaming.

        Yields partial CompletionResponse objects as tokens are generated.

        Args:
            request: CompletionRequest with model, prompt, and parameters

        Yields:
            CompletionResponse objects with streaming data

        Raises:
            httpx.RequestError: If connection fails
            httpx.HTTPStatusError: If request returns error status
        """
        logger.debug(
            f"Starting streaming completion for model={request.model}, "
            f"prompt_len={len(request.prompt)}"
        )
        try:
            payload = request.model_dump(exclude_none=True)

            async with self.client.stream(
                "POST",
                "/api/generate",
                json=payload,
            ) as response:
                response.raise_for_status()

                async for line in response.aiter_lines():
                    if not line:
                        continue

                    try:
                        data = response.json(line) if hasattr(response, "json") else {}
                        if not data:
                            import json

                            data = json.loads(line)

                        completion_response = CompletionResponse(
                            model=data.get("model"),
                            created_at=data.get("created_at", datetime.utcnow()),
                            response=data.get("response", ""),
                            done=data.get("done", False),
                            total_duration=data.get("total_duration"),
                            load_duration=data.get("load_duration"),
                            prompt_eval_count=data.get("prompt_eval_count"),
                            prompt_eval_duration=data.get("prompt_eval_duration"),
                            eval_count=data.get("eval_count"),
                            eval_duration=data.get("eval_duration"),
                            context=data.get("context"),
                        )

                        yield completion_response

                    except Exception as e:
                        logger.warning(f"Failed to parse streaming line: {str(e)}")
                        continue

            logger.info(f"Streaming completion finished for model={request.model}")

        except httpx.RequestError as e:
            logger.error(f"Failed to stream completion - connection error: {str(e)}")
            raise
        except httpx.HTTPStatusError as e:
            logger.error(f"Failed to stream completion - HTTP error: {e.status_code}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in streaming completion: {str(e)}", exc_info=True)
            raise

    # ========================================================================
    # Chat Completion
    # ========================================================================

    async def chat(self, request: ChatRequest) -> ChatResponse:
        """
        Generate chat completion (non-streaming).

        Args:
            request: ChatRequest with model, messages, and parameters

        Returns:
            ChatResponse with assistant message

        Raises:
            httpx.RequestError: If connection fails
            httpx.HTTPStatusError: If request returns error status
        """
        logger.debug(
            f"Generating chat completion for model={request.model}, "
            f"messages={len(request.messages)}"
        )
        try:
            payload = {
                "model": request.model,
                "messages": [msg.model_dump() for msg in request.messages],
                "stream": False,  # Disable streaming to get single JSON response
                **request.model_dump(
                    exclude={"model", "messages"},
                    exclude_none=True,
                ),
            }

            response = await self.client.post(
                "/api/chat",
                json=payload,
            )
            response.raise_for_status()

            data = response.json()
            message_data = data.get("message", {})

            chat_response = ChatResponse(
                model=data.get("model"),
                created_at=data.get("created_at", datetime.utcnow()),
                message=ChatMessage(
                    role=message_data.get("role", "assistant"),
                    content=message_data.get("content", ""),
                ),
                done=data.get("done", False),
                total_duration=data.get("total_duration"),
                load_duration=data.get("load_duration"),
                prompt_eval_count=data.get("prompt_eval_count"),
                prompt_eval_duration=data.get("prompt_eval_duration"),
                eval_count=data.get("eval_count"),
                eval_duration=data.get("eval_duration"),
            )

            logger.info(
                f"Generated chat completion: {request.model} "
                f"(tokens: {data.get('eval_count', 0)})"
            )
            return chat_response

        except httpx.RequestError as e:
            logger.error(f"Failed to generate chat completion - connection error: {str(e)}")
            raise
        except httpx.HTTPStatusError as e:
            logger.error(f"Failed to generate chat completion - HTTP error: {e.status_code}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in chat completion: {str(e)}", exc_info=True)
            raise

    async def chat_stream(
        self, request: ChatRequest
    ) -> AsyncGenerator[ChatResponse, None]:
        """
        Generate chat completion with streaming.

        Yields partial ChatResponse objects as tokens are generated.

        Args:
            request: ChatRequest with model, messages, and parameters

        Yields:
            ChatResponse objects with streaming data

        Raises:
            httpx.RequestError: If connection fails
            httpx.HTTPStatusError: If request returns error status
        """
        logger.debug(
            f"Starting streaming chat for model={request.model}, "
            f"messages={len(request.messages)}"
        )
        try:
            payload = {
                "model": request.model,
                "messages": [msg.model_dump() for msg in request.messages],
                **request.model_dump(
                    exclude={"model", "messages"},
                    exclude_none=True,
                ),
            }

            async with self.client.stream(
                "POST",
                "/api/chat",
                json=payload,
            ) as response:
                response.raise_for_status()

                async for line in response.aiter_lines():
                    if not line:
                        continue

                    try:
                        import json

                        data = json.loads(line)
                        message_data = data.get("message", {})

                        chat_response = ChatResponse(
                            model=data.get("model"),
                            created_at=data.get("created_at", datetime.utcnow()),
                            message=ChatMessage(
                                role=message_data.get("role", "assistant"),
                                content=message_data.get("content", ""),
                            ),
                            done=data.get("done", False),
                            total_duration=data.get("total_duration"),
                            load_duration=data.get("load_duration"),
                            prompt_eval_count=data.get("prompt_eval_count"),
                            prompt_eval_duration=data.get("prompt_eval_duration"),
                            eval_count=data.get("eval_count"),
                            eval_duration=data.get("eval_duration"),
                        )

                        yield chat_response

                    except Exception as e:
                        logger.warning(f"Failed to parse streaming chat line: {str(e)}")
                        continue

            logger.info(f"Streaming chat finished for model={request.model}")

        except httpx.RequestError as e:
            logger.error(f"Failed to stream chat - connection error: {str(e)}")
            raise
        except httpx.HTTPStatusError as e:
            logger.error(f"Failed to stream chat - HTTP error: {e.status_code}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in streaming chat: {str(e)}", exc_info=True)
            raise

    # ========================================================================
    # Helper Methods
    # ========================================================================

    async def is_model_available(self, model_name: str) -> bool:
        """
        Check if a specific model is available locally.

        Args:
            model_name: Name of model to check

        Returns:
            True if model is available, False otherwise
        """
        try:
            models = await self.list_models()
            return any(m.name == model_name for m in models)
        except Exception as e:
            logger.warning(f"Error checking model availability: {str(e)}")
            return False

    async def ensure_model(self, model_name: str) -> bool:
        """
        Ensure a model is available, pulling it if necessary.

        Args:
            model_name: Name of model to ensure

        Returns:
            True if model is available, False otherwise
        """
        try:
            if await self.is_model_available(model_name):
                logger.debug(f"Model {model_name} is already available")
                return True

            logger.info(f"Model {model_name} not found, attempting to pull...")
            await self.pull_model(model_name)
            return await self.is_model_available(model_name)

        except Exception as e:
            logger.error(f"Failed to ensure model {model_name}: {str(e)}")
            return False

    async def quick_generate(
        self,
        model: str,
        prompt: str,
        temperature: float = 0.7,
        num_predict: int = 512,
    ) -> str:
        """
        Quick convenience method for simple text generation.

        Args:
            model: Model name
            prompt: Input prompt
            temperature: Temperature parameter
            num_predict: Maximum tokens to generate

        Returns:
            Generated text

        Raises:
            httpx.RequestError: If connection fails
            ValueError: If completion fails
        """
        try:
            request = CompletionRequest(
                model=model,
                prompt=prompt,
                temperature=temperature,
                num_predict=num_predict,
            )
            response = await self.generate(request)
            return response.response
        except Exception as e:
            logger.error(f"Quick generate failed: {str(e)}")
            raise ValueError(f"Failed to generate text: {str(e)}")

    async def quick_chat(
        self,
        model: str,
        messages: list[dict],
        temperature: float = 0.7,
        num_predict: int = 512,
    ) -> str:
        """
        Quick convenience method for chat completion.

        Args:
            model: Model name
            messages: List of message dicts with 'role' and 'content' keys
            temperature: Temperature parameter
            num_predict: Maximum tokens to generate

        Returns:
            Assistant's response text

        Raises:
            httpx.RequestError: If connection fails
            ValueError: If completion fails
        """
        try:
            chat_messages = [ChatMessage(**msg) for msg in messages]
            request = ChatRequest(
                model=model,
                messages=chat_messages,
                temperature=temperature,
                num_predict=num_predict,
            )
            response = await self.chat(request)
            return response.message.content
        except Exception as e:
            logger.error(f"Quick chat failed: {str(e)}")
            raise ValueError(f"Failed to generate chat response: {str(e)}")


# ============================================================================
# Singleton Instance
# ============================================================================


_ollama_instance: Optional[OllamaService] = None


def get_ollama_service() -> OllamaService:
    """
    Get or create a singleton OllamaService instance.

    Returns:
        OllamaService instance

    Example:
        >>> ollama = get_ollama_service()
        >>> models = await ollama.list_models()
    """
    global _ollama_instance
    if _ollama_instance is None:
        _ollama_instance = OllamaService()
    return _ollama_instance


async def close_ollama_service():
    """Close and cleanup the singleton OllamaService instance."""
    global _ollama_instance
    if _ollama_instance:
        await _ollama_instance.close()
        _ollama_instance = None
