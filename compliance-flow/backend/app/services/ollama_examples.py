"""
Usage examples for the Ollama integration service.

This file demonstrates how to use the OllamaService for various tasks.
"""

import asyncio
from app.services.ollama import (
    OllamaService,
    CompletionRequest,
    ChatRequest,
    ChatMessage,
    get_ollama_service,
)


# ============================================================================
# Example 1: Health Check
# ============================================================================


async def example_health_check():
    """Check if Ollama instance is running and healthy."""
    ollama = get_ollama_service()
    try:
        health = await ollama.health_check()
        print(f"Ollama Status: {health.status}")
        print(f"Available Models: {health.models_available}")
        print(f"Base URL: {health.base_url}")
    except Exception as e:
        print(f"Health check failed: {e}")
    finally:
        await ollama.close()


# ============================================================================
# Example 2: List Available Models
# ============================================================================


async def example_list_models():
    """List all available models."""
    ollama = get_ollama_service()
    try:
        models = await ollama.list_models()
        print("Available Models:")
        for model in models:
            print(f"  - {model.name} ({model.size} bytes)")
    except Exception as e:
        print(f"Failed to list models: {e}")
    finally:
        await ollama.close()


# ============================================================================
# Example 3: Pull a Model
# ============================================================================


async def example_pull_model():
    """Download a model from Ollama registry."""
    ollama = get_ollama_service()
    try:
        print("Pulling model 'mistral'...")
        success = await ollama.pull_model("mistral")
        if success:
            print("Model pulled successfully")
    except Exception as e:
        print(f"Failed to pull model: {e}")
    finally:
        await ollama.close()


# ============================================================================
# Example 4: Get Model Details
# ============================================================================


async def example_show_model():
    """Get detailed information about a model."""
    ollama = get_ollama_service()
    try:
        details = await ollama.show_model("llama3.2")
        print(f"Model: {details.name}")
        print(f"Size: {details.size} bytes")
        print(f"Digest: {details.digest}")
        print(f"Details: {details.details}")
    except Exception as e:
        print(f"Failed to get model details: {e}")
    finally:
        await ollama.close()


# ============================================================================
# Example 5: Simple Text Generation (Non-Streaming)
# ============================================================================


async def example_generate_text():
    """Generate text using a model."""
    ollama = get_ollama_service()
    try:
        request = CompletionRequest(
            model="llama3.2",
            prompt="What is the capital of France?",
            temperature=0.7,
            num_predict=100,
        )

        response = await ollama.generate(request)
        print(f"Model: {response.model}")
        print(f"Response: {response.response}")
        print(f"Tokens Generated: {response.eval_count}")
        print(f"Duration: {response.total_duration}ms")

    except Exception as e:
        print(f"Failed to generate text: {e}")
    finally:
        await ollama.close()


# ============================================================================
# Example 6: Streaming Text Generation
# ============================================================================


async def example_generate_text_streaming():
    """Generate text with streaming (useful for large outputs)."""
    ollama = get_ollama_service()
    try:
        request = CompletionRequest(
            model="llama3.2",
            prompt="Write a short poem about Python programming.",
            temperature=0.8,
            num_predict=256,
        )

        print("Generating text (streaming):")
        async for chunk in ollama.generate_stream(request):
            if chunk.response:
                print(chunk.response, end="", flush=True)
            if chunk.done:
                print(f"\n\nTokens: {chunk.eval_count}, Duration: {chunk.total_duration}ms")

    except Exception as e:
        print(f"Failed to generate text stream: {e}")
    finally:
        await ollama.close()


# ============================================================================
# Example 7: Chat Completion (Non-Streaming)
# ============================================================================


async def example_chat():
    """Have a multi-turn conversation."""
    ollama = get_ollama_service()
    try:
        messages = [
            ChatMessage(role="system", content="You are a helpful assistant."),
            ChatMessage(role="user", content="What is Python?"),
        ]

        request = ChatRequest(
            model="llama3.2",
            messages=messages,
            temperature=0.7,
            num_predict=200,
        )

        response = await ollama.chat(request)
        print(f"Assistant: {response.message.content}")
        print(f"Tokens: {response.eval_count}")

    except Exception as e:
        print(f"Failed in chat completion: {e}")
    finally:
        await ollama.close()


# ============================================================================
# Example 8: Streaming Chat Completion
# ============================================================================


async def example_chat_streaming():
    """Have a conversation with streaming responses."""
    ollama = get_ollama_service()
    try:
        messages = [
            ChatMessage(role="system", content="You are a coding expert."),
            ChatMessage(role="user", content="Explain async/await in Python"),
        ]

        request = ChatRequest(
            model="mistral",
            messages=messages,
            temperature=0.7,
            num_predict=300,
        )

        print("Assistant (streaming):")
        async for chunk in ollama.chat_stream(request):
            if chunk.message.content:
                print(chunk.message.content, end="", flush=True)
            if chunk.done:
                print(f"\n\nCompleted with {chunk.eval_count} tokens")

    except Exception as e:
        print(f"Failed in streaming chat: {e}")
    finally:
        await ollama.close()


# ============================================================================
# Example 9: Quick Convenience Methods
# ============================================================================


async def example_quick_methods():
    """Use convenience methods for simpler API."""
    ollama = get_ollama_service()
    try:
        # Quick text generation
        text = await ollama.quick_generate(
            model="llama3.2",
            prompt="Explain machine learning in one sentence.",
            temperature=0.7,
            num_predict=100,
        )
        print(f"Quick Generate: {text}")

        # Quick chat
        messages = [
            {"role": "system", "content": "You are helpful."},
            {"role": "user", "content": "What is an API?"},
        ]
        response = await ollama.quick_chat(
            model="mistral",
            messages=messages,
            temperature=0.7,
        )
        print(f"Quick Chat: {response}")

    except Exception as e:
        print(f"Quick methods failed: {e}")
    finally:
        await ollama.close()


# ============================================================================
# Example 10: Model Availability Checks
# ============================================================================


async def example_model_checks():
    """Check and ensure model availability."""
    ollama = get_ollama_service()
    try:
        # Check if model is available
        available = await ollama.is_model_available("llama3.2")
        print(f"Llama3.2 available: {available}")

        # Ensure model is available (pull if needed)
        success = await ollama.ensure_model("codellama")
        print(f"CodeLlama ensured: {success}")

    except Exception as e:
        print(f"Model check failed: {e}")
    finally:
        await ollama.close()


# ============================================================================
# Example 11: Using Context Manager
# ============================================================================


async def example_context_manager():
    """Use OllamaService as context manager for automatic cleanup."""
    try:
        async with OllamaService() as ollama:
            # Service is automatically initialized
            models = await ollama.list_models()
            print(f"Found {len(models)} models")

            # Perform operations
            response = await ollama.health_check()
            print(f"Status: {response.status}")

        # Service is automatically closed and cleaned up
    except Exception as e:
        print(f"Context manager example failed: {e}")


# ============================================================================
# Example 12: Multi-Turn Conversation
# ============================================================================


async def example_multi_turn_conversation():
    """Maintain conversation state across multiple turns."""
    ollama = get_ollama_service()
    try:
        messages = [
            ChatMessage(
                role="system",
                content="You are a helpful Python programming assistant.",
            ),
        ]

        # Turn 1
        messages.append(ChatMessage(role="user", content="What is async/await?"))
        request = ChatRequest(model="llama3.2", messages=messages)
        response = await ollama.chat(request)
        messages.append(response.message)

        print(f"Assistant: {response.message.content}\n")

        # Turn 2
        messages.append(ChatMessage(role="user", content="How do I use it with HTTP requests?"))
        request = ChatRequest(model="llama3.2", messages=messages)
        response = await ollama.chat(request)
        messages.append(response.message)

        print(f"Assistant: {response.message.content}\n")

        print(f"Conversation turns: {len([m for m in messages if m.role == 'user'])}")

    except Exception as e:
        print(f"Multi-turn conversation failed: {e}")
    finally:
        await ollama.close()


# ============================================================================
# Example 13: Error Handling
# ============================================================================


async def example_error_handling():
    """Demonstrate proper error handling."""
    ollama = get_ollama_service()
    try:
        # Try to use non-existent model
        try:
            response = await ollama.generate(
                CompletionRequest(
                    model="nonexistent-model",
                    prompt="This will fail",
                )
            )
        except Exception as e:
            print(f"Caught expected error: {type(e).__name__}: {e}")

        # Health check shows service state
        health = await ollama.health_check()
        print(f"Service status: {health.status}")
        if health.error:
            print(f"Error details: {health.error}")

    finally:
        await ollama.close()


# ============================================================================
# Main Execution
# ============================================================================


async def main():
    """Run examples (comment out which ones to run)."""
    print("=" * 70)
    print("Example 1: Health Check")
    print("=" * 70)
    await example_health_check()

    print("\n" + "=" * 70)
    print("Example 2: List Models")
    print("=" * 70)
    await example_list_models()

    print("\n" + "=" * 70)
    print("Example 9: Quick Methods")
    print("=" * 70)
    await example_quick_methods()

    # Uncomment to run other examples:
    # await example_pull_model()
    # await example_show_model()
    # await example_generate_text()
    # await example_generate_text_streaming()
    # await example_chat()
    # await example_chat_streaming()
    # await example_model_checks()
    # await example_context_manager()
    # await example_multi_turn_conversation()
    # await example_error_handling()


if __name__ == "__main__":
    asyncio.run(main())
