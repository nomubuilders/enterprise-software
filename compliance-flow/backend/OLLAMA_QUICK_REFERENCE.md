# Ollama Service - Quick Reference Card

## Import Statements
```python
from app.services.ollama import (
    OllamaService,
    get_ollama_service,
    close_ollama_service,
    CompletionRequest,
    CompletionResponse,
    ChatRequest,
    ChatMessage,
    ChatResponse,
    OllamaModelInfo,
    OllamaModelDetails,
    HealthCheckResponse,
)
```

## Singleton Service (Recommended)
```python
ollama = get_ollama_service()

# Use ollama...

# On shutdown:
await close_ollama_service()
```

## Context Manager
```python
async with OllamaService() as ollama:
    # Use ollama...
    # Automatically closed
```

## Health Check
```python
health = await ollama.health_check()
# → HealthCheckResponse
#   - status: "healthy" | "unhealthy"
#   - models_available: int
#   - error: Optional[str]
```

## List Models
```python
models = await ollama.list_models()
# → List[OllamaModelInfo]
for model in models:
    print(f"{model.name}: {model.size} bytes")
```

## Pull Model
```python
success = await ollama.pull_model("llama3.2")
# → bool
```

## Show Model Details
```python
details = await ollama.show_model("llama3.2")
# → OllamaModelDetails
#   - name, size, digest, modified_at, details
```

## Quick Text Generation
```python
text = await ollama.quick_generate(
    model="llama3.2",
    prompt="What is Python?",
    temperature=0.7,
    num_predict=200,
)
# → str (generated text)
```

## Text Generation (Full Control)
```python
request = CompletionRequest(
    model="llama3.2",
    prompt="What is Python?",
    temperature=0.7,
    top_p=1.0,
    top_k=40,
    num_predict=200,
    repeat_penalty=1.1,
    stop=[".\n", "!\n"],
)
response = await ollama.generate(request)
# → CompletionResponse
#   - response: str
#   - eval_count: int (tokens)
#   - total_duration: int (ms)
```

## Streaming Text Generation
```python
request = CompletionRequest(
    model="llama3.2",
    prompt="Write a poem...",
)
async for chunk in ollama.generate_stream(request):
    print(chunk.response, end="", flush=True)
    if chunk.done:
        print(f"\nDone: {chunk.eval_count} tokens")
```

## Quick Chat
```python
response = await ollama.quick_chat(
    model="llama3.2",
    messages=[
        {"role": "system", "content": "You are helpful."},
        {"role": "user", "content": "What is AI?"},
    ],
)
# → str (assistant message)
```

## Chat Completion (Full Control)
```python
request = ChatRequest(
    model="llama3.2",
    messages=[
        ChatMessage(role="system", content="You are helpful."),
        ChatMessage(role="user", content="What is AI?"),
    ],
    temperature=0.7,
    num_predict=300,
)
response = await ollama.chat(request)
# → ChatResponse
#   - message: ChatMessage (role + content)
#   - eval_count: int
#   - total_duration: int
```

## Streaming Chat
```python
request = ChatRequest(
    model="llama3.2",
    messages=[...],
)
async for chunk in ollama.chat_stream(request):
    print(chunk.message.content, end="", flush=True)
```

## Multi-turn Conversation
```python
messages = [
    ChatMessage(role="system", content="You are helpful."),
]

# Turn 1
messages.append(ChatMessage(role="user", content="What is async?"))
response = await ollama.chat(ChatRequest(
    model="llama3.2",
    messages=messages
))
messages.append(response.message)

# Turn 2 (context includes Turn 1)
messages.append(ChatMessage(role="user", content="How do I use it?"))
response = await ollama.chat(ChatRequest(
    model="llama3.2",
    messages=messages
))
messages.append(response.message)
```

## Model Availability
```python
available = await ollama.is_model_available("llama3.2")
# → bool

# Auto-pull if needed:
success = await ollama.ensure_model("mistral")
# → bool
```

## Error Handling
```python
import httpx

try:
    response = await ollama.generate(request)
except httpx.RequestError as e:
    # Connection error, timeout
    pass
except httpx.HTTPStatusError as e:
    # HTTP error (4xx, 5xx)
    pass
except Exception as e:
    # Other errors
    pass
finally:
    await ollama.close()
```

## FastAPI Integration
```python
from fastapi import FastAPI, HTTPException

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
async def generate_endpoint(model: str, prompt: str):
    try:
        ollama = get_ollama_service()
        request = CompletionRequest(model=model, prompt=prompt)
        return await ollama.generate(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat/stream")
async def chat_stream_endpoint(model: str, messages: list[dict]):
    from fastapi.responses import StreamingResponse
    import json
    
    ollama = get_ollama_service()
    chat_messages = [ChatMessage(**msg) for msg in messages]
    request = ChatRequest(model=model, messages=chat_messages)
    
    async def generate():
        async for chunk in ollama.chat_stream(request):
            yield json.dumps(chunk.model_dump()) + "\n"
    
    return StreamingResponse(generate(), media_type="application/x-ndjson")
```

## Concurrent Requests
```python
import asyncio

ollama = get_ollama_service()
requests = [req1, req2, req3]
responses = await asyncio.gather(
    ollama.generate(requests[0]),
    ollama.generate(requests[1]),
    ollama.generate(requests[2]),
)
```

## Common Model Names
```
llama3.2           # Latest, balanced
mistral            # Fast, good quality
codellama          # Code generation
neural-chat        # Conversational
orca-mini          # Lightweight
tinyllama          # Very lightweight
llama2             # Stable
dolphin-mixtral    # Advanced reasoning
```

## Configuration
```python
# Environment variables (.env)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_TIMEOUT=120

# Or custom:
ollama = OllamaService(
    base_url="http://remote:11434",
    timeout=300
)
```

## Logging
```python
from loguru import logger

# Operations are automatically logged at:
# DEBUG - Detailed tracking
# INFO  - High-level operations
# WARNING - Non-critical issues
# ERROR - Errors with stack traces

# View logs with loguru configuration:
logger.enable("app.services.ollama")
```

## Parameter Guide
- `temperature`: 0.0-2.0 (higher = more creative)
- `top_p`: 0.0-1.0 (nucleus sampling)
- `top_k`: int (top-k sampling)
- `num_predict`: -1 = unlimited, else max tokens
- `repeat_penalty`: penalty for repeats (default 1.1)
- `stop`: list of stop sequences

## Response Fields
```
CompletionResponse:
  - response: str (generated text)
  - eval_count: int (tokens generated)
  - prompt_eval_count: int (tokens in prompt)
  - total_duration: int (ms)
  - load_duration: int (ms)
  - prompt_eval_duration: int (ms)
  - eval_duration: int (ms)
  - context: list[int] (for next request)

ChatResponse:
  - message: ChatMessage (role + content)
  - eval_count: int
  - done: bool
  - (plus timing fields)
```

## File References
- Service: `/backend/app/services/ollama.py`
- Examples: `/backend/app/services/ollama_examples.py`
- Full Docs: `/backend/app/services/OLLAMA_SERVICE.md`
- Integration: `/backend/OLLAMA_INTEGRATION_GUIDE.md`

## Common Tasks

**Check if Ollama is running:**
```python
health = await ollama.health_check()
if health.status == "healthy":
    print(f"Ready with {health.models_available} models")
```

**Ensure a model is available:**
```python
await ollama.ensure_model("llama3.2")
response = await ollama.quick_generate(
    model="llama3.2",
    prompt="...",
)
```

**Stream long response:**
```python
async for chunk in ollama.generate_stream(request):
    print(chunk.response, end="", flush=True)
```

**Count tokens:**
```python
response = await ollama.generate(request)
print(f"Input tokens: {response.prompt_eval_count}")
print(f"Output tokens: {response.eval_count}")
```

**Get response time:**
```python
response = await ollama.generate(request)
print(f"Total time: {response.total_duration}ms")
print(f"Generation time: {response.eval_duration}ms")
```
