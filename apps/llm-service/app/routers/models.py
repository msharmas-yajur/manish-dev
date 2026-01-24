from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import structlog

from app.config.database import get_db
from app.models.schemas import ModelInfo

router = APIRouter()
logger = structlog.get_logger()


@router.get("/v1/models")
async def list_models(
    provider: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """
    List all available models.

    Optionally filter by provider (openai, anthropic, ollama, google).
    """
    try:
        query = text("""
            SELECT
                lm.id,
                lm.name,
                lm.provider_id as provider,
                lm.description,
                lm.context_window,
                lm.supports_vision,
                lm.supports_function_calling,
                lm.input_cost_per_1k,
                lm.output_cost_per_1k
            FROM llm_models lm
            WHERE lm.is_active = true
            AND (:provider IS NULL OR lm.provider_id = :provider)
            ORDER BY lm.provider_id, lm.name
        """)
        result = await db.execute(query, {"provider": provider})
        rows = result.fetchall()

        models = [
            ModelInfo(
                id=row.id,
                name=row.name,
                provider=row.provider,
                description=row.description,
                context_window=row.context_window,
                supports_vision=row.supports_vision,
                supports_function_calling=row.supports_function_calling,
                input_cost_per_1k=float(row.input_cost_per_1k) if row.input_cost_per_1k else None,
                output_cost_per_1k=float(row.output_cost_per_1k) if row.output_cost_per_1k else None,
            )
            for row in rows
        ]

        return {"object": "list", "data": models}
    except Exception as e:
        logger.error(f"Failed to list models: {e}")
        raise HTTPException(status_code=500, detail="Failed to list models")


@router.get("/v1/models/{model_id}")
async def get_model(
    model_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get details for a specific model."""
    try:
        query = text("""
            SELECT
                lm.id,
                lm.name,
                lm.provider_id as provider,
                lm.description,
                lm.context_window,
                lm.supports_vision,
                lm.supports_function_calling,
                lm.input_cost_per_1k,
                lm.output_cost_per_1k
            FROM llm_models lm
            WHERE lm.id = :model_id AND lm.is_active = true
        """)
        result = await db.execute(query, {"model_id": model_id})
        row = result.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail=f"Model {model_id} not found")

        return ModelInfo(
            id=row.id,
            name=row.name,
            provider=row.provider,
            description=row.description,
            context_window=row.context_window,
            supports_vision=row.supports_vision,
            supports_function_calling=row.supports_function_calling,
            input_cost_per_1k=float(row.input_cost_per_1k) if row.input_cost_per_1k else None,
            output_cost_per_1k=float(row.output_cost_per_1k) if row.output_cost_per_1k else None,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get model {model_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get model")
