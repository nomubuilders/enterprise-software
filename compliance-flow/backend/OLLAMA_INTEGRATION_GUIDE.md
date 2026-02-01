# Ollama Integration Guide for ComplianceFlow

Quick start guide for integrating Ollama into ComplianceFlow backend.

## Installation

### 1. Install Ollama

Download from: https://ollama.ai

Or on Linux:
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### 2. Install Python Dependencies

```bash
pip install httpx pydantic loguru pydantic-settings
```

These are already included in the service requirements.

### 3. Configuration

Update `.env` file in project root:

```env
# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_TIMEOUT=120
```

## Quick Start

### 1. Start Ollama Service

```bash
ollama serve
```

Server starts at http://localhost:11434

### 2. Pull a Model

```bash
ollama pull llama3.2
ollama pull mistral
ollama pull codellama
```

### 3. Use in FastAPI Application

```python
from fastapi import FastAPI
from app.services.ollama import get_ollama_service, close_ollama_service

app = FastAPI()

@app.on_event("startup")
async def startup():
    # Service initializes on first use
    pass

@app.on_event("shutdown")
async def shutdown():
    await close_ollama_service()

@app.get("/api/health")
async def health():
    ollama = get_ollama_service()
    return await ollama.health_check()
```

## API Endpoints Examples

### List Models
```python
@app.get("/api/models")
async def list_models():
    ollama = get_ollama_service()
    return await ollama.list_models()
```

### Generate Text
```python
from app.services.ollama import CompletionRequest

@app.post("/api/generate")
async def generate(model: str, prompt: str):
    ollama = get_ollama_service()
    request = CompletionRequest(model=model, prompt=prompt)
    return await ollama.generate(request)
```

### Chat
```python
from app.services.ollama import ChatRequest, ChatMessage

@app.post("/api/chat")
async def chat_endpoint(model: str, messages: list[dict]):
    ollama = get_ollama_service()
    chat_messages = [ChatMessage(**msg) for msg in messages]
    request = ChatRequest(model=model, messages=chat_messages)
    return await ollama.chat(request)
```

### Streaming Chat
```python
from fastapi.responses import StreamingResponse
import json

@app.post("/api/chat/stream")
async def chat_stream(model: str, messages: list[dict]):
    ollama = get_ollama_service()
    chat_messages = [ChatMessage(**msg) for msg in messages]
    request = ChatRequest(model=model, messages=chat_messages)

    async def generate():
        async for chunk in ollama.chat_stream(request):
            yield json.dumps(chunk.model_dump()) + "\n"

    return StreamingResponse(generate(), media_type="application/x-ndjson")
```

## Service File Structure

```
/backend/app/services/
├── ollama.py                 # Main service implementation
├── ollama_examples.py        # Usage examples
├── OLLAMA_SERVICE.md         # Complete documentation
├── database.py               # Existing database service
├── executor.py               # Existing executor service
└── __init__.py
```

## Available Models

Install models with:
```bash
ollama pull <model-name>
```

### Recommended Models

**General Purpose:**
- `llama3.2` - Latest, balanced performance and quality
- `llama2` - Stable, well-tested
- `mistral` - Fast, good quality

**Coding:**
- `codellama` - Code generation and analysis
- `neural-chat` - Good for conversations

**Lightweight:**
- `orca-mini` - 3GB, good for resource-constrained environments
- `tinyllama` - Very lightweight

**Specialized:**
- `dolphin-mixtral` - Advanced reasoning
- `neural-chat-7b` - Conversational

## Example Usage in Services

### In a Compliance Check Service

```python
from app.services.ollama import get_ollama_service, ChatRequest, ChatMessage

async def analyze_compliance_document(doc_content: str, doc_type: str) -> str:
    """Use Ollama to analyze compliance document."""
    ollama = get_ollama_service()

    messages = [
        ChatMessage(
            role="system",
            content=f"You are a compliance expert analyzing {doc_type} documents."
        ),
        ChatMessage(
            role="user",
            content=f"Analyze this document for compliance issues:\n\n{doc_content}"
        ),
    ]

    request = ChatRequest(
        model="llama3.2",
        messages=messages,
        num_predict=1000,
    )

    response = await ollama.chat(request)
    return response.message.content
```

### In a Document Processing Service

```python
from app.services.ollama import get_ollama_service, CompletionRequest

async def extract_key_information(text: str) -> str:
    """Extract key information from document."""
    ollama = get_ollama_service()

    prompt = f"""Extract key information from this text:

{text}

Key information:"""

    request = CompletionRequest(
        model="mistral",
        prompt=prompt,
        temperature=0.3,  # Lower temperature for more focused output
        num_predict=500,
    )

    response = await ollama.generate(request)
    return response.response
```

### Multi-turn Conversation Service

```python
from app.services.ollama import get_ollama_service, ChatRequest, ChatMessage

class ComplianceAdvisor:
    def __init__(self):
        self.messages = [
            ChatMessage(
                role="system",
                content="You are a compliance advisor helping organizations meet regulatory requirements."
            ),
        ]

    async def ask_question(self, question: str) -> str:
        """Ask a question and maintain conversation history."""
        ollama = get_ollama_service()

        # Add user message
        self.messages.append(ChatMessage(role="user", content=question))

        # Get response
        request = ChatRequest(model="llama3.2", messages=self.messages)
        response = await ollama.chat(request)

        # Add assistant response to history
        self.messages.append(response.message)

        return response.message.content

    async def chat(self, user_input: str) -> str:
        """Chat interface."""
        return await self.ask_question(user_input)
```

## Performance Considerations

### Hardware Requirements

| Model | RAM | GPU | Speed |
|-------|-----|-----|-------|
| orca-mini | 4GB | Optional | Fast |
| llama3.2 | 8GB | Recommended | Medium |
| mistral | 8GB | Recommended | Medium |
| codellama-13b | 16GB | Recommended | Slow |

### Optimization Tips

1. **Use Streaming for Long Outputs**
   ```python
   async for chunk in ollama.generate_stream(request):
       # Process chunk immediately
   ```

2. **Adjust Temperature for Use Case**
   - Lower (0.3-0.5): Focused, deterministic responses
   - Higher (0.7-0.9): Creative, varied responses

3. **Limit Token Generation**
   ```python
   request = CompletionRequest(
       model="llama3.2",
       prompt=prompt,
       num_predict=256,  # Limit tokens
   )
   ```

4. **Use Appropriate Model for Task**
   - Fast responses: mistral, neural-chat
   - Quality responses: llama3.2, codellama
   - Lightweight: orca-mini, tinyllama

## Monitoring and Logging

### Enable Logging

```python
from loguru import logger
import sys

# Configure loguru
logger.remove()
logger.add(
    sys.stdout,
    format="<level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level="DEBUG"
)
```

### Health Monitoring

```python
async def monitor_ollama():
    ollama = get_ollama_service()
    health = await ollama.health_check()

    if health.status != "healthy":
        logger.error(f"Ollama unhealthy: {health.error}")
        return False

    logger.info(f"Ollama healthy: {health.models_available} models available")
    return True
```

## Error Handling Best Practices

```python
import httpx
from loguru import logger

async def safe_generate(model: str, prompt: str) -> Optional[str]:
    """Generate text with proper error handling."""
    ollama = get_ollama_service()

    try:
        # Ensure model is available
        if not await ollama.is_model_available(model):
            logger.warning(f"Model {model} not available, pulling...")
            await ollama.pull_model(model)

        # Generate text
        request = CompletionRequest(model=model, prompt=prompt)
        response = await ollama.generate(request)
        return response.response

    except httpx.RequestError as e:
        logger.error(f"Connection error: {e}")
        return None
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error {e.status_code}: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        return None
```

## Testing

### Unit Test Example

```python
import pytest
from app.services.ollama import OllamaService, CompletionRequest

@pytest.mark.asyncio
async def test_ollama_generation():
    """Test basic text generation."""
    ollama = OllamaService()

    try:
        request = CompletionRequest(
            model="llama3.2",
            prompt="Hello",
            num_predict=10,
        )
        response = await ollama.generate(request)

        assert response.model == "llama3.2"
        assert len(response.response) > 0
        assert response.eval_count > 0
    finally:
        await ollama.close()
```

### Integration Test Example

```python
@pytest.mark.asyncio
async def test_ollama_chat():
    """Test chat completion."""
    from app.services.ollama import ChatRequest, ChatMessage

    ollama = OllamaService()

    try:
        messages = [
            ChatMessage(role="system", content="You are helpful."),
            ChatMessage(role="user", content="Say hello"),
        ]
        request = ChatRequest(model="llama3.2", messages=messages)
        response = await ollama.chat(request)

        assert response.message.role == "assistant"
        assert len(response.message.content) > 0
    finally:
        await ollama.close()
```

## Troubleshooting

### Ollama Not Running
```
httpx.ConnectError: [Errno 111] Connection refused

Fix:
1. Start Ollama: ollama serve
2. Check if running: ps aux | grep ollama
3. Check port: netstat -tlnp | grep 11434
```

### Model Not Available
```
Error: model 'xyz' not found

Fix:
1. List models: ollama list
2. Pull model: ollama pull llama3.2
3. Wait for download
```

### Out of Memory
```
Error: out of memory

Fix:
1. Use smaller model: ollama pull orca-mini
2. Close other applications
3. Increase swap: sudo fallocate -l 8G /swapfile
```

### Slow Responses
```
Fix:
1. Use faster model: mistral, neural-chat
2. Lower num_predict
3. Enable GPU acceleration
4. Check system load: top, htop
```

## Next Steps

1. **Run Examples**: See `ollama_examples.py` for 13 detailed examples
2. **Read Documentation**: See `OLLAMA_SERVICE.md` for complete API reference
3. **Integrate with APIs**: Create FastAPI endpoints using the service
4. **Monitor Health**: Set up health checks in your application
5. **Handle Errors**: Implement proper error handling in your code

## Resources

- Ollama: https://ollama.ai
- Model Library: https://ollama.ai/library
- Documentation: `/backend/app/services/OLLAMA_SERVICE.md`
- Examples: `/backend/app/services/ollama_examples.py`
- Source: `/backend/app/services/ollama.py`

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the examples
3. Check logs with `loguru`
4. Verify Ollama is running and accessible
5. Ensure required models are pulled and available
