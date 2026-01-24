from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.models.schemas import ProviderConfig, PipelineConfig
from .encryption import encrypt_api_key, decrypt_api_key

logger = structlog.get_logger()


class UserConfigService:
    """Service for managing user LLM configurations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_providers(self, user_id: str) -> list[ProviderConfig]:
        """Get all configured providers for a user."""
        query = text("""
            SELECT
                ulp.provider_id,
                lp.name,
                ulp.is_enabled,
                ulp.is_verified,
                ulp.api_key_encrypted IS NOT NULL as has_api_key,
                ulp.custom_endpoint,
                ulp.last_used_at
            FROM user_llm_providers ulp
            JOIN llm_providers lp ON ulp.provider_id = lp.id
            WHERE ulp.user_id = :user_id
        """)
        result = await self.db.execute(query, {"user_id": user_id})
        rows = result.fetchall()

        return [
            ProviderConfig(
                provider_id=row.provider_id,
                name=row.name,
                is_enabled=row.is_enabled,
                is_verified=row.is_verified,
                has_api_key=row.has_api_key,
                custom_endpoint=row.custom_endpoint,
                last_used_at=row.last_used_at,
            )
            for row in rows
        ]

    async def get_user_api_key(self, user_id: str, provider_id: str) -> str | None:
        """Get decrypted API key for a user's provider."""
        query = text("""
            SELECT api_key_encrypted
            FROM user_llm_providers
            WHERE user_id = :user_id AND provider_id = :provider_id AND is_enabled = true
        """)
        result = await self.db.execute(query, {"user_id": user_id, "provider_id": provider_id})
        row = result.fetchone()

        if row and row.api_key_encrypted:
            try:
                return decrypt_api_key(row.api_key_encrypted)
            except Exception as e:
                logger.error(f"Failed to decrypt API key: {e}")
                return None
        return None

    async def get_custom_endpoint(self, user_id: str, provider_id: str) -> str | None:
        """Get custom endpoint for a user's provider (e.g., Ollama)."""
        query = text("""
            SELECT custom_endpoint
            FROM user_llm_providers
            WHERE user_id = :user_id AND provider_id = :provider_id AND is_enabled = true
        """)
        result = await self.db.execute(query, {"user_id": user_id, "provider_id": provider_id})
        row = result.fetchone()

        return row.custom_endpoint if row else None

    async def save_provider_config(
        self,
        user_id: str,
        provider_id: str,
        api_key: str | None = None,
        custom_endpoint: str | None = None,
    ) -> bool:
        """Save or update a user's provider configuration."""
        encrypted_key = encrypt_api_key(api_key) if api_key else None

        query = text("""
            INSERT INTO user_llm_providers (user_id, provider_id, api_key_encrypted, custom_endpoint, is_enabled)
            VALUES (:user_id, :provider_id, :api_key_encrypted, :custom_endpoint, true)
            ON CONFLICT (user_id, provider_id)
            DO UPDATE SET
                api_key_encrypted = COALESCE(:api_key_encrypted, user_llm_providers.api_key_encrypted),
                custom_endpoint = COALESCE(:custom_endpoint, user_llm_providers.custom_endpoint),
                updated_at = NOW()
        """)
        await self.db.execute(
            query,
            {
                "user_id": user_id,
                "provider_id": provider_id,
                "api_key_encrypted": encrypted_key,
                "custom_endpoint": custom_endpoint,
            },
        )
        await self.db.commit()
        return True

    async def verify_provider(self, user_id: str, provider_id: str, is_verified: bool) -> None:
        """Update provider verification status."""
        query = text("""
            UPDATE user_llm_providers
            SET is_verified = :is_verified, updated_at = NOW()
            WHERE user_id = :user_id AND provider_id = :provider_id
        """)
        await self.db.execute(
            query,
            {"user_id": user_id, "provider_id": provider_id, "is_verified": is_verified},
        )
        await self.db.commit()

    async def update_last_used(self, user_id: str, provider_id: str) -> None:
        """Update the last used timestamp for a provider."""
        query = text("""
            UPDATE user_llm_providers
            SET last_used_at = NOW()
            WHERE user_id = :user_id AND provider_id = :provider_id
        """)
        await self.db.execute(query, {"user_id": user_id, "provider_id": provider_id})
        await self.db.commit()

    async def get_pipeline_config(self, user_id: str, pipeline_type: str) -> PipelineConfig | None:
        """Get user's configuration for a specific pipeline."""
        query = text("""
            SELECT
                upc.pipeline_type_id as pipeline_type,
                pt.name,
                pt.description,
                upc.model_id,
                lm.provider_id,
                upc.temperature,
                upc.max_tokens,
                upc.top_p,
                upc.frequency_penalty,
                upc.presence_penalty,
                upc.system_prompt,
                upc.is_enabled
            FROM user_pipeline_configs upc
            JOIN pipeline_types pt ON upc.pipeline_type_id = pt.id
            JOIN llm_models lm ON upc.model_id = lm.id
            WHERE upc.user_id = :user_id AND upc.pipeline_type_id = :pipeline_type
        """)
        result = await self.db.execute(
            query, {"user_id": user_id, "pipeline_type": pipeline_type}
        )
        row = result.fetchone()

        if row:
            return PipelineConfig(
                pipeline_type=row.pipeline_type,
                name=row.name,
                description=row.description,
                model_id=row.model_id,
                provider_id=row.provider_id,
                temperature=float(row.temperature),
                max_tokens=row.max_tokens,
                top_p=float(row.top_p),
                frequency_penalty=float(row.frequency_penalty),
                presence_penalty=float(row.presence_penalty),
                system_prompt=row.system_prompt,
                is_enabled=row.is_enabled,
            )
        return None

    async def get_default_pipeline_config(self, pipeline_type: str) -> PipelineConfig | None:
        """Get default configuration for a pipeline (when user hasn't configured it)."""
        query = text("""
            SELECT
                pt.id as pipeline_type,
                pt.name,
                pt.description,
                pt.default_model_id as model_id,
                lm.provider_id,
                0.7 as temperature,
                2048 as max_tokens,
                1.0 as top_p,
                0.0 as frequency_penalty,
                0.0 as presence_penalty,
                NULL as system_prompt,
                true as is_enabled
            FROM pipeline_types pt
            JOIN llm_models lm ON pt.default_model_id = lm.id
            WHERE pt.id = :pipeline_type
        """)
        result = await self.db.execute(query, {"pipeline_type": pipeline_type})
        row = result.fetchone()

        if row:
            return PipelineConfig(
                pipeline_type=row.pipeline_type,
                name=row.name,
                description=row.description,
                model_id=row.model_id,
                provider_id=row.provider_id,
                temperature=float(row.temperature),
                max_tokens=row.max_tokens,
                top_p=float(row.top_p),
                frequency_penalty=float(row.frequency_penalty),
                presence_penalty=float(row.presence_penalty),
                system_prompt=row.system_prompt,
                is_enabled=row.is_enabled,
            )
        return None

    async def save_pipeline_config(
        self,
        user_id: str,
        pipeline_type: str,
        model_id: str,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        top_p: float = 1.0,
        frequency_penalty: float = 0.0,
        presence_penalty: float = 0.0,
        system_prompt: str | None = None,
    ) -> bool:
        """Save or update a user's pipeline configuration."""
        query = text("""
            INSERT INTO user_pipeline_configs
                (user_id, pipeline_type_id, model_id, temperature, max_tokens, top_p,
                 frequency_penalty, presence_penalty, system_prompt, is_enabled)
            VALUES
                (:user_id, :pipeline_type, :model_id, :temperature, :max_tokens, :top_p,
                 :frequency_penalty, :presence_penalty, :system_prompt, true)
            ON CONFLICT (user_id, pipeline_type_id)
            DO UPDATE SET
                model_id = :model_id,
                temperature = :temperature,
                max_tokens = :max_tokens,
                top_p = :top_p,
                frequency_penalty = :frequency_penalty,
                presence_penalty = :presence_penalty,
                system_prompt = :system_prompt,
                updated_at = NOW()
        """)
        await self.db.execute(
            query,
            {
                "user_id": user_id,
                "pipeline_type": pipeline_type,
                "model_id": model_id,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "top_p": top_p,
                "frequency_penalty": frequency_penalty,
                "presence_penalty": presence_penalty,
                "system_prompt": system_prompt,
            },
        )
        await self.db.commit()
        return True

    async def has_configured_provider(self, user_id: str) -> bool:
        """Check if user has at least one configured and verified provider."""
        query = text("""
            SELECT COUNT(*) as count
            FROM user_llm_providers
            WHERE user_id = :user_id AND is_enabled = true AND is_verified = true
        """)
        result = await self.db.execute(query, {"user_id": user_id})
        row = result.fetchone()
        return row.count > 0 if row else False
