import time
import uuid
from anthropic import AsyncAnthropic
import structlog

from .base import BaseLLMProvider
from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    ChatMessage,
    ChatChoice,
    Usage,
    EmbeddingRequest,
    EmbeddingResponse,
)

logger = structlog.get_logger()


class AnthropicProvider(BaseLLMProvider):
    """Anthropic (Claude) LLM Provider."""

    provider_id = "anthropic"
    name = "Anthropic"

    def __init__(self, api_key: str | None = None, base_url: str | None = None):
        super().__init__(api_key, base_url)
        self.client = AsyncAnthropic(api_key=api_key)

    async def chat_completion(self, request: ChatRequest) -> ChatResponse:
        """Generate a chat completion using Anthropic Claude."""
        try:
            # Extract system message if present
            system_message = ""
            messages = []
            for m in request.messages:
                if m.role == "system":
                    system_message = m.content
                else:
                    messages.append({"role": m.role, "content": m.content})

            response = await self.client.messages.create(
                model=request.model,
                max_tokens=request.max_tokens,
                messages=messages,
                system=system_message if system_message else None,
                temperature=request.temperature,
                top_p=request.top_p,
            )

            # Convert Anthropic response to OpenAI-compatible format
            return ChatResponse(
                id=response.id,
                object="chat.completion",
                created=int(time.time()),
                model=response.model,
                choices=[
                    ChatChoice(
                        index=0,
                        message=ChatMessage(
                            role="assistant",
                            content=response.content[0].text if response.content else "",
                        ),
                        finish_reason=response.stop_reason,
                    )
                ],
                usage=Usage(
                    prompt_tokens=response.usage.input_tokens,
                    completion_tokens=response.usage.output_tokens,
                    total_tokens=response.usage.input_tokens + response.usage.output_tokens,
                ),
            )
        except Exception as e:
            logger.error(f"Anthropic chat completion error: {e}")
            raise

    async def create_embedding(self, request: EmbeddingRequest) -> EmbeddingResponse:
        """Anthropic doesn't support embeddings directly - raise error."""
        raise NotImplementedError("Anthropic does not support embeddings. Use OpenAI or another provider.")

    async def verify_api_key(self) -> bool:
        """Verify the Anthropic API key is valid."""
        try:
            # Make a minimal API call to verify the key
            await self.client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=10,
                messages=[{"role": "user", "content": "Hi"}],
            )
            return True
        except Exception as e:
            logger.error(f"Anthropic API key verification failed: {e}")
            return False

    async def list_models(self) -> list[str]:
        """List available Anthropic models."""
        # Anthropic doesn't have a models list API, return known models
        return [
            "claude-3-opus-20240229",
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307",
            "claude-3-5-sonnet-20241022",
        ]
