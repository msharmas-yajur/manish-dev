from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import httpx

from app.config.database import get_db, get_redis
from app.config.settings import settings
from app.models.schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check(db: AsyncSession = Depends(get_db)):
    """Health check endpoint."""
    # Check PostgreSQL
    postgres_status = "healthy"
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        postgres_status = "unhealthy"

    # Check Redis
    redis_status = "healthy"
    try:
        redis_client = get_redis()
        if redis_client:
            await redis_client.ping()
        else:
            redis_status = "not connected"
    except Exception:
        redis_status = "unhealthy"

    # Check Ollama
    ollama_status = "unknown"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{settings.ollama_host}/api/tags")
            ollama_status = "healthy" if response.status_code == 200 else "unhealthy"
    except Exception:
        ollama_status = "unavailable"

    overall_status = "healthy"
    if postgres_status != "healthy" or redis_status not in ["healthy", "not connected"]:
        overall_status = "degraded"

    return HealthResponse(
        status=overall_status,
        service="llm-service",
        version="1.0.0",
        postgres=postgres_status,
        redis=redis_status,
        providers={
            "ollama": ollama_status,
            "openai": "available",  # External API, always "available"
            "anthropic": "available",
        },
    )


@router.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "LLM Service",
        "version": "1.0.0",
        "description": "Multi-provider LLM router for Caladrius Health AI Studio",
        "docs": "/docs",
    }
