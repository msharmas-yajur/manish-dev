from abc import ABC, abstractmethod
from app.models.schemas import ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse


class BaseLLMProvider(ABC):
    """Base class for LLM providers."""

    provider_id: str = ""
    name: str = ""

    def __init__(self, api_key: str | None = None, base_url: str | None = None):
        self.api_key = api_key
        self.base_url = base_url

    @abstractmethod
    async def chat_completion(self, request: ChatRequest) -> ChatResponse:
        """Generate a chat completion."""
        pass

    @abstractmethod
    async def create_embedding(self, request: EmbeddingRequest) -> EmbeddingResponse:
        """Generate embeddings for the given input."""
        pass

    @abstractmethod
    async def verify_api_key(self) -> bool:
        """Verify the API key is valid."""
        pass

    @abstractmethod
    async def list_models(self) -> list[str]:
        """List available models for this provider."""
        pass
