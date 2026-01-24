import time
import uuid
import httpx
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
from app.config.settings import settings

logger = structlog.get_logger()


class OllamaProvider(BaseLLMProvider):
    """Ollama (self-hosted) LLM Provider."""

    provider_id = "ollama"
    name = "Ollama"

    def __init__(self, api_key: str | None = None, base_url: str | None = None):
        super().__init__(api_key, base_url)
        self.base_url = base_url or settings.ollama_host

    async def chat_completion(self, request: ChatRequest) -> ChatResponse:
        """Generate a chat completion using Ollama."""
        try:
            messages = [{"role": m.role, "content": m.content} for m in request.messages]

            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/chat",
                    json={
                        "model": request.model,
                        "messages": messages,
                        "stream": False,
                        "options": {
                            "temperature": request.temperature,
                            "top_p": request.top_p,
                            "num_predict": request.max_tokens,
                        },
                    },
                )
                response.raise_for_status()
                data = response.json()

            # Estimate token counts (Ollama may not provide accurate counts)
            prompt_tokens = data.get("prompt_eval_count", 0)
            completion_tokens = data.get("eval_count", 0)

            return ChatResponse(
                id=f"ollama-{uuid.uuid4().hex[:8]}",
                object="chat.completion",
                created=int(time.time()),
                model=request.model,
                choices=[
                    ChatChoice(
                        index=0,
                        message=ChatMessage(
                            role="assistant",
                            content=data.get("message", {}).get("content", ""),
                        ),
                        finish_reason="stop",
                    )
                ],
                usage=Usage(
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    total_tokens=prompt_tokens + completion_tokens,
                ),
            )
        except Exception as e:
            logger.error(f"Ollama chat completion error: {e}")
            raise

    async def create_embedding(self, request: EmbeddingRequest) -> EmbeddingResponse:
        """Generate embeddings using Ollama."""
        try:
            inputs = [request.input] if isinstance(request.input, str) else request.input
            embeddings = []

            async with httpx.AsyncClient(timeout=60.0) as client:
                for i, text in enumerate(inputs):
                    response = await client.post(
                        f"{self.base_url}/api/embeddings",
                        json={
                            "model": request.model or "nomic-embed-text",
                            "prompt": text,
                        },
                    )
                    response.raise_for_status()
                    data = response.json()

                    embeddings.append(
                        EmbeddingData(
                            object="embedding",
                            index=i,
                            embedding=data.get("embedding", []),
                        )
                    )

            return EmbeddingResponse(
                object="list",
                data=embeddings,
                model=request.model or "nomic-embed-text",
                usage=Usage(
                    prompt_tokens=0,  # Ollama doesn't report token counts for embeddings
                    completion_tokens=0,
                    total_tokens=0,
                ),
            )
        except Exception as e:
            logger.error(f"Ollama embedding error: {e}")
            raise

    async def verify_api_key(self) -> bool:
        """Verify Ollama is accessible (no API key needed)."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                return response.status_code == 200
        except Exception as e:
            logger.error(f"Ollama connection verification failed: {e}")
            return False

    async def list_models(self) -> list[str]:
        """List available Ollama models."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                response.raise_for_status()
                data = response.json()
                return [model["name"] for model in data.get("models", [])]
        except Exception as e:
            logger.error(f"Failed to list Ollama models: {e}")
            return []

    async def pull_model(self, model_name: str) -> bool:
        """Pull a model from Ollama registry."""
        try:
            async with httpx.AsyncClient(timeout=600.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/pull",
                    json={"name": model_name, "stream": False},
                )
                return response.status_code == 200
        except Exception as e:
            logger.error(f"Failed to pull Ollama model {model_name}: {e}")
            return False
