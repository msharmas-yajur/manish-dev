from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import structlog

from app.config.database import get_db
from app.models.schemas import (
    ProviderConfig,
    PipelineConfig,
    ProviderSetupRequest,
    ProviderSetupResponse,
    PipelineSetupRequest,
)
from app.services.user_config import UserConfigService
from app.services.router import LLMRouter

router = APIRouter()
logger = structlog.get_logger()


def get_user_id(x_user_id: str | None = Header(None)) -> str:
    """Extract user ID from header."""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    return x_user_id


# Provider Management
@router.get("/providers")
async def list_providers(db: AsyncSession = Depends(get_db)):
    """List all available LLM providers."""
    query = text("""
        SELECT id, name, description, requires_api_key, base_url
        FROM llm_providers
        WHERE is_active = true
        ORDER BY name
    """)
    result = await db.execute(query)
    rows = result.fetchall()

    return {
        "providers": [
            {
                "id": row.id,
                "name": row.name,
                "description": row.description,
                "requires_api_key": row.requires_api_key,
                "base_url": row.base_url,
            }
            for row in rows
        ]
    }


@router.get("/providers/configured")
async def get_configured_providers(
    user_id: str = Depends(get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get user's configured providers."""
    service = UserConfigService(db)
    providers = await service.get_user_providers(user_id)
    return {"providers": [p.model_dump() for p in providers]}


@router.post("/providers/setup", response_model=ProviderSetupResponse)
async def setup_provider(
    request: ProviderSetupRequest,
    user_id: str = Depends(get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Set up or update a provider configuration."""
    service = UserConfigService(db)
    llm_router = LLMRouter(db)

    # Save the configuration
    await service.save_provider_config(
        user_id=user_id,
        provider_id=request.provider_id,
        api_key=request.api_key,
        custom_endpoint=request.custom_endpoint,
    )

    # Verify the API key
    is_verified = await llm_router.verify_provider(
        user_id=user_id,
        provider_id=request.provider_id,
        api_key=request.api_key,
    )

    if is_verified:
        return ProviderSetupResponse(
            provider_id=request.provider_id,
            is_verified=True,
            message=f"{request.provider_id} configured successfully!",
        )
    else:
        return ProviderSetupResponse(
            provider_id=request.provider_id,
            is_verified=False,
            message=f"Failed to verify {request.provider_id} API key. Please check your credentials.",
        )


@router.delete("/providers/{provider_id}")
async def remove_provider(
    provider_id: str,
    user_id: str = Depends(get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Remove a provider configuration."""
    query = text("""
        DELETE FROM user_llm_providers
        WHERE user_id = :user_id AND provider_id = :provider_id
    """)
    await db.execute(query, {"user_id": user_id, "provider_id": provider_id})
    await db.commit()
    return {"message": f"Provider {provider_id} removed successfully"}


# Pipeline Management
@router.get("/pipelines")
async def list_pipelines(db: AsyncSession = Depends(get_db)):
    """List all available pipeline types."""
    query = text("""
        SELECT pt.id, pt.name, pt.description, pt.default_model_id,
               lm.provider_id as default_provider
        FROM pipeline_types pt
        JOIN llm_models lm ON pt.default_model_id = lm.id
        ORDER BY pt.name
    """)
    result = await db.execute(query)
    rows = result.fetchall()

    return {
        "pipelines": [
            {
                "id": row.id,
                "name": row.name,
                "description": row.description,
                "default_model": row.default_model_id,
                "default_provider": row.default_provider,
            }
            for row in rows
        ]
    }


@router.get("/pipelines/configured")
async def get_configured_pipelines(
    user_id: str = Depends(get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get user's pipeline configurations."""
    query = text("""
        SELECT
            upc.pipeline_type_id,
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
        WHERE upc.user_id = :user_id
    """)
    result = await db.execute(query, {"user_id": user_id})
    rows = result.fetchall()

    return {
        "pipelines": [
            {
                "pipeline_type": row.pipeline_type_id,
                "name": row.name,
                "description": row.description,
                "model_id": row.model_id,
                "provider_id": row.provider_id,
                "temperature": float(row.temperature),
                "max_tokens": row.max_tokens,
                "top_p": float(row.top_p),
                "frequency_penalty": float(row.frequency_penalty),
                "presence_penalty": float(row.presence_penalty),
                "system_prompt": row.system_prompt,
                "is_enabled": row.is_enabled,
            }
            for row in rows
        ]
    }


@router.post("/pipelines/setup")
async def setup_pipeline(
    request: PipelineSetupRequest,
    user_id: str = Depends(get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Set up or update a pipeline configuration."""
    service = UserConfigService(db)

    # Verify the model exists
    query = text("SELECT id FROM llm_models WHERE id = :model_id")
    result = await db.execute(query, {"model_id": request.model_id})
    if not result.fetchone():
        raise HTTPException(status_code=400, detail=f"Model {request.model_id} not found")

    # Verify the pipeline type exists
    query = text("SELECT id FROM pipeline_types WHERE id = :pipeline_type")
    result = await db.execute(query, {"pipeline_type": request.pipeline_type})
    if not result.fetchone():
        raise HTTPException(status_code=400, detail=f"Pipeline type {request.pipeline_type} not found")

    await service.save_pipeline_config(
        user_id=user_id,
        pipeline_type=request.pipeline_type,
        model_id=request.model_id,
        temperature=request.temperature,
        max_tokens=request.max_tokens,
        top_p=request.top_p,
        frequency_penalty=request.frequency_penalty,
        presence_penalty=request.presence_penalty,
        system_prompt=request.system_prompt,
    )

    return {"message": f"Pipeline {request.pipeline_type} configured successfully"}


@router.delete("/pipelines/{pipeline_type}")
async def remove_pipeline_config(
    pipeline_type: str,
    user_id: str = Depends(get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Remove a pipeline configuration (revert to default)."""
    query = text("""
        DELETE FROM user_pipeline_configs
        WHERE user_id = :user_id AND pipeline_type_id = :pipeline_type
    """)
    await db.execute(query, {"user_id": user_id, "pipeline_type": pipeline_type})
    await db.commit()
    return {"message": f"Pipeline {pipeline_type} configuration removed"}
