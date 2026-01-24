import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.schemas import ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse
from app.providers import OpenAIProvider, AnthropicProvider, OllamaProvider, BaseLLMProvider
from app.services.user_config import UserConfigService

logger = structlog.get_logger()

# Model prefix to provider mapping
MODEL_PROVIDER_MAP = {
    "gpt-": "openai",
    "claude-": "anthropic",
    "llama": "ollama",
    "mistral": "ollama",
    "codellama": "ollama",
    "mixtral": "ollama",
    "gemma": "ollama",
    "phi": "ollama",
    "qwen": "ollama",
    "text-embedding-": "openai",
    "nomic-embed": "ollama",
}


def get_provider_for_model(model: str) -> str:
    """Determine the provider for a given model name."""
    model_lower = model.lower()
    for prefix, provider in MODEL_PROVIDER_MAP.items():
        if model_lower.startswith(prefix):
            return provider
    # Default to ollama for unknown models (might be self-hosted)
    return "ollama"


class LLMRouter:
    """Routes LLM requests to the appropriate provider based on user config."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_config_service = UserConfigService(db)

    async def _get_provider(
        self, user_id: str | None, provider_id: str
    ) -> BaseLLMProvider:
        """Get a provider instance with user's API key."""
        api_key = None
        custom_endpoint = None

        if user_id:
            api_key = await self.user_config_service.get_user_api_key(user_id, provider_id)
            custom_endpoint = await self.user_config_service.get_custom_endpoint(user_id, provider_id)

        if provider_id == "openai":
            if not api_key:
                raise ValueError("OpenAI API key not configured. Please add your API key in settings.")
            return OpenAIProvider(api_key=api_key, base_url=custom_endpoint)
        elif provider_id == "anthropic":
            if not api_key:
                raise ValueError("Anthropic API key not configured. Please add your API key in settings.")
            return AnthropicProvider(api_key=api_key, base_url=custom_endpoint)
        elif provider_id == "ollama":
            return OllamaProvider(base_url=custom_endpoint)
        else:
            raise ValueError(f"Unknown provider: {provider_id}")

    async def chat_completion(self, request: ChatRequest) -> ChatResponse:
        """Route a chat completion request to the appropriate provider."""
        user_id = request.user_id
        pipeline = request.pipeline

        # Determine model and provider
        model = request.model
        provider_id = get_provider_for_model(model)

        # If pipeline is specified, get user's pipeline config
        if user_id and pipeline:
            pipeline_config = await self.user_config_service.get_pipeline_config(
                user_id, pipeline
            )
            if pipeline_config:
                model = pipeline_config.model_id
                provider_id = pipeline_config.provider_id
                # Apply pipeline settings to request
                request.model = model
                request.temperature = pipeline_config.temperature
                request.max_tokens = pipeline_config.max_tokens
                request.top_p = pipeline_config.top_p
                request.frequency_penalty = pipeline_config.frequency_penalty
                request.presence_penalty = pipeline_config.presence_penalty

                # Prepend system prompt if configured
                if pipeline_config.system_prompt:
                    from app.models.schemas import ChatMessage
                    system_msg = ChatMessage(role="system", content=pipeline_config.system_prompt)
                    request.messages = [system_msg] + request.messages

        # Check if user has configured this provider
        if user_id and provider_id != "ollama":
            has_provider = await self.user_config_service.get_user_api_key(user_id, provider_id)
            if not has_provider:
                raise ValueError(
                    f"You haven't configured {provider_id} provider. "
                    "Please add your API key in the LLM Settings page."
                )

        # Get provider and make request
        provider = await self._get_provider(user_id, provider_id)
        response = await provider.chat_completion(request)

        # Update last used timestamp
        if user_id:
            await self.user_config_service.update_last_used(user_id, provider_id)

        return response

    async def create_embedding(self, request: EmbeddingRequest) -> EmbeddingResponse:
        """Route an embedding request to the appropriate provider."""
        user_id = request.user_id
        model = request.model
        provider_id = get_provider_for_model(model)

        # Check if user has configured this provider
        if user_id and provider_id != "ollama":
            has_provider = await self.user_config_service.get_user_api_key(user_id, provider_id)
            if not has_provider:
                raise ValueError(
                    f"You haven't configured {provider_id} provider. "
                    "Please add your API key in the LLM Settings page."
                )

        # Get provider and make request
        provider = await self._get_provider(user_id, provider_id)
        response = await provider.create_embedding(request)

        # Update last used timestamp
        if user_id:
            await self.user_config_service.update_last_used(user_id, provider_id)

        return response

    async def verify_provider(
        self, user_id: str, provider_id: str, api_key: str | None = None
    ) -> bool:
        """Verify a provider's API key."""
        # Temporarily create provider with the key
        if provider_id == "openai":
            provider = OpenAIProvider(api_key=api_key)
        elif provider_id == "anthropic":
            provider = AnthropicProvider(api_key=api_key)
        elif provider_id == "ollama":
            custom_endpoint = await self.user_config_service.get_custom_endpoint(
                user_id, provider_id
            )
            provider = OllamaProvider(base_url=custom_endpoint)
        else:
            return False

        is_valid = await provider.verify_api_key()

        # Update verification status in database
        if user_id:
            await self.user_config_service.verify_provider(user_id, provider_id, is_valid)

        return is_valid
