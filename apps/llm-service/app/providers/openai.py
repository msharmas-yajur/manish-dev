import time
import uuid
from openai import AsyncOpenAI
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
    EmbeddingData,
)

logger = structlog.get_logger()


class OpenAIProvider(BaseLLMProvider):
    """OpenAI LLM Provider."""

    provider_id = "openai"
    name = "OpenAI"

    def __init__(self, api_key: str | None = None, base_url: str | None = None):
        super().__init__(api_key, base_url)
        self.client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url or "https://api.openai.com/v1",
        )

    async def chat_completion(self, request: ChatRequest) -> ChatResponse:
        """Generate a chat completion using OpenAI."""
        try:
            messages = [{"role": m.role, "content": m.content} for m in request.messages]

            response = await self.client.chat.completions.create(
                model=request.model,
                messages=messages,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                top_p=request.top_p,
                frequency_penalty=request.frequency_penalty,
                presence_penalty=request.presence_penalty,
            )

            return ChatResponse(
                id=response.id,
                object="chat.completion",
                created=response.created,
                model=response.model,
                choices=[
                    ChatChoice(
                        index=choice.index,
                        message=ChatMessage(
                            role=choice.message.role,
                            content=choice.message.content or "",
                        ),
                        finish_reason=choice.finish_reason,
                    )
                    for choice in response.choices
                ],
                usage=Usage(
                    prompt_tokens=response.usage.prompt_tokens,
                    completion_tokens=response.usage.completion_tokens,
                    total_tokens=response.usage.total_tokens,
                ),
            )
        except Exception as e:
            logger.error(f"OpenAI chat completion error: {e}")
            raise

    async def create_embedding(self, request: EmbeddingRequest) -> EmbeddingResponse:
        """Generate embeddings using OpenAI."""
        try:
            response = await self.client.embeddings.create(
                model=request.model or "text-embedding-3-small",
                input=request.input,
            )

            return EmbeddingResponse(
                object="list",
                data=[
                    EmbeddingData(
                        object="embedding",
                        index=item.index,
                        embedding=item.embedding,
                    )
                    for item in response.data
                ],
                model=response.model,
                usage=Usage(
                    prompt_tokens=response.usage.prompt_tokens,
                    completion_tokens=0,
                    total_tokens=response.usage.total_tokens,
                ),
            )
        except Exception as e:
            logger.error(f"OpenAI embedding error: {e}")
            raise

    async def verify_api_key(self) -> bool:
        """Verify the OpenAI API key is valid."""
        try:
            await self.client.models.list()
            return True
        except Exception as e:
            logger.error(f"OpenAI API key verification failed: {e}")
            return False

    async def list_models(self) -> list[str]:
        """List available OpenAI models."""
        try:
            response = await self.client.models.list()
            return [model.id for model in response.data if "gpt" in model.id.lower()]
        except Exception as e:
            logger.error(f"Failed to list OpenAI models: {e}")
            return []
