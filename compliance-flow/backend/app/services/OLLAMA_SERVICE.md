# Ollama Integration Service

Complete async service for integrating Ollama with ComplianceFlow backend.

## Overview

The `OllamaService` provides a comprehensive async interface to a local Ollama instance, enabling:

- **Model Management**: List, pull, and inspect models
- **Text Generation**: Streaming and non-streaming completions
- **Chat Completions**: Multi-turn conversations with context history
- **Health Monitoring**: Connection and availability checks
- **Error Handling**: Comprehensive logging and exception handling
- **Async/Await**: Full async/await support for non-blocking operations

## Features

### 1. Model Management

#### List Available Models
```python
ollama = get_ollama_service()
models = await ollama.list_models()
for model in models:
    print(f"{model.name}: {model.size} bytes")
```

#### Pull/Download Models
```python
# Download a model from registry
success = await ollama.pull_model("mistral")
success = await ollama.pull_model("llama3.2")
success = await ollama.pull_model("codellama")
```

#### Get Model Details
```python
details = await ollama.show_model("llama3.2")
print(details.name)
print(details.size)
print(details.digest)
print(details.details)
```

#### Check Model Availability
```python
available = await ollama.is_model_available("llama3.2")
if not available:
    await ollama.pull_model("llama3.2")

# Or automatically pull if needed
success = await ollama.ensure_model("mistral")
```

### 2. Health Checks

```python
health = await ollama.health_check()
print(health.status)  # "healthy" or "unhealthy"
print(health.models_available)
print(health.base_url)
if health.error:
    print(health.error)
```

### 3. Text Generation (Non-Streaming)

Basic completion request:

```python
from app.services.ollama import CompletionRequest

request = CompletionRequest(
    model="llama3.2",
    prompt="What is Python?",
    temperature=0.7,
    num_predict=200,
)

response = await ollama.generate(request)
print(response.response)  # Generated text
print(response.eval_count)  # Tokens generated
print(response.total_duration)  # Total time in ms
```

**Available Parameters:**
- `model` (str): Model name (required)
- `prompt` (str): Input prompt (required)
- `suffix` (str, optional): Text suffix
- `temperature` (float): 0.0-2.0, higher = more creative (default: 0.7)
- `top_p` (float): 0.0-1.0, nucleus sampling (default: 1.0)
- `top_k` (int): Top-k sampling (default: 40)
- `num_predict` (int): Max tokens, -1 = unlimited (default: -1)
- `repeat_penalty` (float): Penalty for repeated tokens (default: 1.1)
- `stop` (list[str]): Stop sequences
- `context` (list[int]): Previous context tokens for continuity

### 4. Streaming Text Generation

For large outputs or real-time response display:

```python
request = CompletionRequest(
    model="llama3.2",
    prompt="Write a poem about programming.",
    temperature=0.8,
    num_predict=500,
)

async for chunk in ollama.generate_stream(request):
    print(chunk.response, end="", flush=True)
    if chunk.done:
        print(f"\nGenerated {chunk.eval_count} tokens")
```

**Benefits:**
- Real-time output display
- Lower latency perception
- Can process longer outputs
- Reduce memory usage

### 5. Chat Completions (Non-Streaming)

Multi-turn conversations with context:

```python
from app.services.ollama import ChatRequest, ChatMessage

messages = [
    ChatMessage(role="system", content="You are a helpful assistant."),
    ChatMessage(role="user", content="What is machine learning?"),
]

request = ChatRequest(
    model="mistral",
    messages=messages,
    temperature=0.7,
    num_predict=300,
)

response = await ollama.chat(request)
print(response.message.content)  # Assistant response
print(response.eval_count)  # Tokens generated
```

**Message Roles:**
- `system`: System prompt/instructions
- `user`: User input
- `assistant`: Model response (in history)

### 6. Streaming Chat Completions

Real-time chat with streaming:

```python
messages = [
    ChatMessage(role="system", content="You are a Python expert."),
    ChatMessage(role="user", content="Explain decorators in Python."),
]

request = ChatRequest(model="llama3.2", messages=messages)

async for chunk in ollama.chat_stream(request):
    print(chunk.message.content, end="", flush=True)
    if chunk.done:
        print(f"\n✓ Done ({chunk.eval_count} tokens)")
```

### 7. Multi-Turn Conversations

Maintain conversation state across multiple requests:

```python
messages = [
    ChatMessage(role="system", content="You are a helpful assistant."),
]

# Turn 1
messages.append(ChatMessage(role="user", content="What is async?"))
response = await ollama.chat(ChatRequest(model="llama3.2", messages=messages))
messages.append(response.message)
print(f"Assistant: {response.message.content}")

# Turn 2 - context includes Turn 1
messages.append(ChatMessage(role="user", content="How do I use it with databases?"))
response = await ollama.chat(ChatRequest(model="llama3.2", messages=messages))
messages.append(response.message)
print(f"Assistant: {response.message.content}")
```

### 8. Quick Convenience Methods

For simple use cases:

```python
# Quick text generation
text = await ollama.quick_generate(
    model="llama3.2",
    prompt="What is an API?",
    temperature=0.7,
    num_predict=100,
)
print(text)

# Quick chat
messages = [
    {"role": "system", "content": "You are helpful."},
    {"role": "user", "content": "Explain REST APIs."},
]
response = await ollama.quick_chat(
    model="mistral",
    messages=messages,
    temperature=0.7,
)
print(response)
```

## Configuration

Configuration is loaded from environment variables via `app.core.config.Settings`:

```python
# Default values
OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_TIMEOUT = 120  # seconds
```

### Environment Variables

```bash
# .env file
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_TIMEOUT=120
```

### Custom Configuration

```python
ollama = OllamaService(
    base_url="http://remote-server:11434",
    timeout=300,
)
```

## Error Handling

The service provides comprehensive error handling:

```python
import httpx
from app.services.ollama import OllamaService

ollama = get_ollama_service()

try:
    response = await ollama.generate(request)
except httpx.RequestError as e:
    # Connection error, timeout, etc.
    print(f"Connection error: {e}")
except httpx.HTTPStatusError as e:
    # HTTP error responses (4xx, 5xx)
    print(f"HTTP error {e.status_code}: {e}")
except ValueError as e:
    # Validation or response parsing error
    print(f"Value error: {e}")
except Exception as e:
    # Other unexpected errors
    print(f"Unexpected error: {e}")
finally:
    await ollama.close()
```

### Logging

All operations are logged using loguru:

```python
from loguru import logger

# Enable logging to see service operations
logger.enable("app.services.ollama")

# Different log levels
logger.debug("...")   # Detailed debugging
logger.info("...")    # General information
logger.warning("...")  # Warnings
logger.error("...")   # Errors
```

Log output includes:
- Model operations (list, pull, show)
- Generation requests and results
- Health checks
- Connection errors
- Token counts and timing

## Context Manager Usage

Use as a context manager for automatic resource cleanup:

```python
async with OllamaService() as ollama:
    models = await ollama.list_models()
    response = await ollama.generate(request)
# Client is automatically closed
```

## Response Models

All responses use Pydantic models for type safety:

### OllamaModelInfo
```python
name: str              # Model name
size: Optional[int]    # Size in bytes
digest: Optional[str]  # Model hash
modified_at: Optional[datetime]
```

### CompletionResponse
```python
model: str
created_at: datetime
response: str          # Generated text
done: bool
eval_count: Optional[int]           # Tokens generated
total_duration: Optional[int]        # Total time in ms
prompt_eval_count: Optional[int]
prompt_eval_duration: Optional[int]
load_duration: Optional[int]
context: Optional[list[int]]         # For next request
```

### ChatResponse
```python
model: str
created_at: datetime
message: ChatMessage   # {role: str, content: str}
done: bool
eval_count: Optional[int]
total_duration: Optional[int]
# ... other timing fields
```

### HealthCheckResponse
```python
status: str                    # "healthy" or "unhealthy"
base_url: str
timestamp: datetime
models_available: Optional[int]
error: Optional[str]
```

## Supported Models

The service supports any model available in Ollama:

**Recommended Models:**

| Model | Size | Use Case |
|-------|------|----------|
| llama3.2 | ~4-7GB | General purpose, balanced |
| mistral | ~7GB | Fast, good quality |
| codellama | ~7-13GB | Code generation and analysis |
| neural-chat | ~4GB | Conversational |
| orca-mini | ~3GB | Lightweight, efficient |

**Example Pull Commands:**
```python
await ollama.pull_model("llama3.2")
await ollama.pull_model("mistral")
await ollama.pull_model("codellama")
await ollama.pull_model("neural-chat")
```

## Performance Tips

1. **Use Streaming for Large Outputs**
   ```python
   # Better for long responses
   async for chunk in ollama.generate_stream(request):
       process(chunk)
   ```

2. **Batch Requests Efficiently**
   ```python
   tasks = [
       ollama.generate(request1),
       ollama.generate(request2),
   ]
   results = await asyncio.gather(*tasks)
   ```

3. **Reuse Client Connection**
   ```python
   ollama = get_ollama_service()  # Singleton
   # Use ollama for multiple requests
   ```

4. **Set Appropriate Timeouts**
   ```python
   ollama = OllamaService(timeout=300)  # For slow models
   ```

5. **Monitor Token Usage**
   ```python
   response = await ollama.generate(request)
   tokens_used = response.eval_count
   cost = tokens_used * price_per_token
   ```

## Integration with FastAPI

Example FastAPI integration:

```python
from fastapi import FastAPI, HTTPException
from app.services.ollama import get_ollama_service, CompletionRequest

app = FastAPI()

@app.on_event("shutdown")
async def shutdown():
    from app.services.ollama import close_ollama_service
    await close_ollama_service()

@app.get("/api/health")
async def health():
    ollama = get_ollama_service()
    return await ollama.health_check()

@app.post("/api/generate")
async def generate(model: str, prompt: str):
    ollama = get_ollama_service()
    try:
        request = CompletionRequest(model=model, prompt=prompt)
        response = await ollama.generate(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat(model: str, messages: list[dict]):
    ollama = get_ollama_service()
    try:
        from app.services.ollama import ChatRequest, ChatMessage
        chat_messages = [ChatMessage(**msg) for msg in messages]
        request = ChatRequest(model=model, messages=chat_messages)
        response = await ollama.chat(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## Testing

Example test setup:

```python
import pytest
from app.services.ollama import OllamaService

@pytest.fixture
async def ollama():
    service = OllamaService(base_url="http://localhost:11434")
    yield service
    await service.close()

@pytest.mark.asyncio
async def test_health_check(ollama):
    health = await ollama.health_check()
    assert health.status in ["healthy", "unhealthy"]

@pytest.mark.asyncio
async def test_list_models(ollama):
    models = await ollama.list_models()
    assert isinstance(models, list)

@pytest.mark.asyncio
async def test_generate(ollama):
    from app.services.ollama import CompletionRequest
    request = CompletionRequest(
        model="llama3.2",
        prompt="Hello",
        num_predict=10,
    )
    response = await ollama.generate(request)
    assert response.model == "llama3.2"
    assert len(response.response) > 0
```

## Troubleshooting

### Connection Refused
```
httpx.RequestError: [Errno 111] Connection refused

Solution:
1. Ensure Ollama is running: ollama serve
2. Check OLLAMA_BASE_URL in .env
3. Verify port 11434 is accessible
```

### Model Not Found
```
Error: model 'nonexistent' not found

Solution:
1. List available models: await ollama.list_models()
2. Pull model: await ollama.pull_model("llama3.2")
3. Wait for download to complete
```

### Timeout Errors
```
httpx.ReadTimeout: The read operation timed out

Solution:
1. Increase timeout: OllamaService(timeout=300)
2. Use streaming for large outputs
3. Check system resources (RAM, CPU)
```

### Out of Memory
```
Error: out of memory (etc.)

Solution:
1. Use smaller models (orca-mini, neural-chat)
2. Close unused services
3. Check system memory: free -h
4. Reduce num_predict parameter
```

## Dependencies

Required packages:
- `httpx`: Async HTTP client
- `pydantic`: Data validation
- `loguru`: Logging
- `pydantic-settings`: Settings management

Install:
```bash
pip install httpx pydantic loguru pydantic-settings
```

## File Locations

- **Service**: `/backend/app/services/ollama.py`
- **Examples**: `/backend/app/services/ollama_examples.py`
- **Documentation**: `/backend/app/services/OLLAMA_SERVICE.md`

## License

Part of ComplianceFlow project. See main LICENSE file.
