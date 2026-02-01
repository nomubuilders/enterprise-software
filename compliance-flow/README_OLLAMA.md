# ComplianceFlow Ollama Integration

Complete async Ollama service for ComplianceFlow backend with comprehensive documentation and examples.

## Quick Links

- **Service Implementation**: `/backend/app/services/ollama.py` (889 lines)
- **Usage Examples**: `/backend/app/services/ollama_examples.py` (403 lines)
- **Quick Reference**: `/backend/OLLAMA_QUICK_REFERENCE.md` (Start here!)
- **Complete Docs**: `/backend/app/services/OLLAMA_SERVICE.md`
- **Integration Guide**: `/backend/OLLAMA_INTEGRATION_GUIDE.md`

## Features at a Glance

```python
from app.services.ollama import get_ollama_service

ollama = get_ollama_service()

# Health check
health = await ollama.health_check()

# List models
models = await ollama.list_models()

# Pull models
await ollama.pull_model("llama3.2")

# Generate text
text = await ollama.quick_generate(
    model="llama3.2",
    prompt="What is Python?"
)

# Chat with context
messages = [
    {"role": "system", "content": "You are helpful."},
    {"role": "user", "content": "Explain async/await"},
]
response = await ollama.quick_chat(
    model="mistral",
    messages=messages
)

# Stream large outputs
async for chunk in ollama.generate_stream(request):
    print(chunk.response, end="")
```

## What's Included

### Core Service (ollama.py)

**18+ Public Methods:**
- Health checks and monitoring
- Model listing, pulling, and info
- Text generation (streaming & non-streaming)
- Chat completions (streaming & non-streaming)
- Multi-turn conversations
- Convenience methods

**9 Pydantic Models:**
- Request types: CompletionRequest, ChatRequest, ChatMessage
- Response types: CompletionResponse, ChatResponse
- Info types: OllamaModelInfo, OllamaModelDetails, HealthCheckResponse

**Advanced Features:**
- Async/await throughout
- httpx for async HTTP
- loguru logging
- Comprehensive error handling
- Context manager support
- Singleton pattern

### Documentation

**OLLAMA_QUICK_REFERENCE.md** (Start here!)
- All imports
- Common usage patterns
- Parameter guide
- Response fields
- FastAPI examples
- Model names

**OLLAMA_SERVICE.md** (Complete reference)
- Detailed API documentation
- Configuration guide
- Performance tips
- Troubleshooting
- Testing examples
- Dependencies

**OLLAMA_INTEGRATION_GUIDE.md** (Integration patterns)
- Quick start (3 steps)
- Installation
- API endpoint examples
- Service patterns
- Compliance examples
- Hardware requirements
- Monitoring setup
- Error handling
- Unit/integration tests

### Examples

**ollama_examples.py** - 13 complete, runnable examples:

1. Health Check
2. List Models
3. Pull Model
4. Show Model Details
5. Generate Text (Non-Streaming)
6. Generate Text (Streaming)
7. Chat Completion (Non-Streaming)
8. Chat Completion (Streaming)
9. Quick Convenience Methods
10. Model Availability Checks
11. Context Manager Usage
12. Multi-turn Conversation
13. Error Handling

## Installation

```bash
# Install Ollama from https://ollama.ai
ollama serve

# In another terminal, pull models:
ollama pull llama3.2
ollama pull mistral
ollama pull codellama

# Python dependencies (already in project):
pip install httpx pydantic loguru pydantic-settings
```

## Basic Usage

### Singleton Service

```python
from app.services.ollama import get_ollama_service

async def main():
    ollama = get_ollama_service()
    
    # Check health
    health = await ollama.health_check()
    print(f"Status: {health.status}")
    
    # List models
    models = await ollama.list_models()
    print(f"Available: {len(models)} models")
    
    # Generate text
    text = await ollama.quick_generate(
        model="llama3.2",
        prompt="Explain Python in one sentence"
    )
    print(text)
```

### Context Manager

```python
async with OllamaService() as ollama:
    response = await ollama.generate(request)
    # Automatically cleaned up
```

### Chat with History

```python
messages = [
    ChatMessage(role="system", content="You are helpful."),
]

# Turn 1
messages.append(ChatMessage(role="user", content="What is async?"))
r1 = await ollama.chat(ChatRequest(model="llama3.2", messages=messages))
messages.append(r1.message)

# Turn 2 (has context from Turn 1)
messages.append(ChatMessage(role="user", content="Show me an example"))
r2 = await ollama.chat(ChatRequest(model="llama3.2", messages=messages))
messages.append(r2.message)
```

## FastAPI Integration

```python
from fastapi import FastAPI
from app.services.ollama import get_ollama_service, close_ollama_service

app = FastAPI()

@app.on_event("shutdown")
async def shutdown():
    await close_ollama_service()

@app.get("/api/health")
async def health():
    ollama = get_ollama_service()
    return await ollama.health_check()

@app.post("/api/generate")
async def generate(model: str, prompt: str):
    ollama = get_ollama_service()
    return await ollama.quick_generate(model=model, prompt=prompt)
```

## Configuration

Environment variables (defaults in parentheses):

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_TIMEOUT=120
```

Or custom in code:

```python
ollama = OllamaService(
    base_url="http://remote-server:11434",
    timeout=300
)
```

## Supported Models

**General Purpose:**
- llama3.2 (latest, recommended)
- mistral (fast)
- llama2 (stable)

**Code Generation:**
- codellama
- codellama-34b

**Lightweight:**
- orca-mini (3GB)
- tinyllama (tiny)

**Any Ollama model supported!**

Pull new models:
```bash
ollama pull neural-chat
ollama pull dolphin-mixtral
```

## API Examples

### List Models
```python
models = await ollama.list_models()
# List[OllamaModelInfo]
for m in models:
    print(f"{m.name}: {m.size} bytes")
```

### Generate Text
```python
from app.services.ollama import CompletionRequest

request = CompletionRequest(
    model="llama3.2",
    prompt="What is Python?",
    temperature=0.7,
    num_predict=200
)
response = await ollama.generate(request)
print(response.response)
print(f"Tokens: {response.eval_count}")
```

### Stream Text
```python
async for chunk in ollama.generate_stream(request):
    print(chunk.response, end="", flush=True)
```

### Chat
```python
from app.services.ollama import ChatRequest, ChatMessage

messages = [
    ChatMessage(role="user", content="Hello!"),
]
response = await ollama.chat(ChatRequest(
    model="llama3.2",
    messages=messages
))
print(response.message.content)
```

### Stream Chat
```python
async for chunk in ollama.chat_stream(request):
    print(chunk.message.content, end="", flush=True)
```

## Error Handling

```python
import httpx

try:
    response = await ollama.generate(request)
except httpx.RequestError:
    # Connection error, timeout
    pass
except httpx.HTTPStatusError as e:
    # HTTP error (4xx, 5xx)
    print(f"HTTP {e.status_code}")
except Exception as e:
    # Other errors
    pass
finally:
    await ollama.close()
```

## Logging

All operations are automatically logged with loguru:

```python
from loguru import logger

# DEBUG - Detailed tracking
# INFO  - Operation summaries
# WARNING - Non-critical issues
# ERROR - Error conditions with stack traces
```

Check logs to see:
- Model operations
- Generation requests
- Token counts
- Response times
- Errors and exceptions

## Performance Tips

1. **Use Streaming for Large Outputs**
   ```python
   async for chunk in ollama.generate_stream(request):
       process(chunk)
   ```

2. **Adjust Temperature**
   - Lower (0.3): Focused, deterministic
   - Higher (0.8): Creative, varied

3. **Limit Token Generation**
   ```python
   request = CompletionRequest(
       model="llama3.2",
       prompt=prompt,
       num_predict=256  # Limit tokens
   )
   ```

4. **Choose Appropriate Model**
   - Fast: mistral, neural-chat
   - Quality: llama3.2, codellama
   - Lightweight: orca-mini

5. **Concurrent Requests**
   ```python
   results = await asyncio.gather(
       ollama.generate(req1),
       ollama.generate(req2),
   )
   ```

## Troubleshooting

### "Connection refused"
```
ollama serve  # Start Ollama
netstat -tlnp | grep 11434  # Verify running
```

### "Model not found"
```
ollama list  # List installed models
ollama pull llama3.2  # Download model
```

### "Out of memory"
```
ollama pull orca-mini  # Smaller model
ulimit -v unlimited  # Increase limits
# Or reduce num_predict parameter
```

### Slow responses
```
# Check hardware
top, htop

# Use faster model
ollama pull mistral

# Lower num_predict
num_predict=256
```

## File Structure

```
/backend/
├── app/services/
│   ├── ollama.py                    # Main service (889 lines)
│   ├── ollama_examples.py           # 13 examples (403 lines)
│   └── OLLAMA_SERVICE.md            # Complete docs
├── OLLAMA_INTEGRATION_GUIDE.md       # Integration patterns
├── OLLAMA_QUICK_REFERENCE.md        # Quick lookup
└── README_OLLAMA.md                 # This file
```

## Testing

Example unit test:

```python
import pytest
from app.services.ollama import OllamaService, CompletionRequest

@pytest.mark.asyncio
async def test_generate():
    ollama = OllamaService()
    try:
        request = CompletionRequest(
            model="llama3.2",
            prompt="Hello",
            num_predict=10,
        )
        response = await ollama.generate(request)
        assert len(response.response) > 0
    finally:
        await ollama.close()
```

## Documentation Index

1. **OLLAMA_QUICK_REFERENCE.md** (Start here!)
   - Imports
   - Common patterns
   - Parameters
   - Response fields

2. **OLLAMA_SERVICE.md** (Complete reference)
   - All methods
   - Parameter details
   - Configuration
   - Troubleshooting
   - Testing guide

3. **OLLAMA_INTEGRATION_GUIDE.md** (Integration)
   - Quick start
   - API examples
   - Service patterns
   - Performance guide
   - Error handling

4. **ollama_examples.py** (Code examples)
   - 13 runnable examples
   - All features covered
   - Error handling patterns

## Next Steps

1. Start Ollama: `ollama serve`
2. Pull a model: `ollama pull llama3.2`
3. Review OLLAMA_QUICK_REFERENCE.md
4. Run examples: `python ollama_examples.py`
5. Integrate with FastAPI
6. Deploy!

## Support & Resources

- **Ollama**: https://ollama.ai
- **Models**: https://ollama.ai/library
- **Documentation**: See files above
- **Examples**: `/backend/app/services/ollama_examples.py`

## Summary

Complete Ollama integration service for ComplianceFlow:
- 889 lines of production-ready code
- 9 Pydantic models for type safety
- 18+ public methods
- Full async/await support
- Comprehensive error handling
- Complete documentation
- 13 usage examples
- Ready for immediate deployment

Start with OLLAMA_QUICK_REFERENCE.md for quick API overview!
