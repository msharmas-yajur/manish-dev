from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.config.database import get_db
from app.models.schemas import ChatRequest, ChatResponse
from app.services.router import LLMRouter

router = APIRouter()
logger = structlog.get_logger()


@router.post("/v1/chat/completions", response_model=ChatResponse)
async def chat_completions(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a chat completion.

    This endpoint routes to the appropriate LLM provider based on:
    1. The model name in the request
    2. User's pipeline configuration (if pipeline is specified)
    3. User's provider settings

    Users must configure their API keys before using commercial providers.
    Ollama (self-hosted) is available without API keys.
    """
    try:
        llm_router = LLMRouter(db)
        response = await llm_router.chat_completion(request)
        return response
    except ValueError as e:
        logger.warning(f"Chat completion validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Chat completion error: {e}")
        raise HTTPException(status_code=500, detail=f"LLM request failed: {str(e)}")


@router.post("/v1/chat", response_model=ChatResponse)
async def chat_simple(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """Alias for /v1/chat/completions for convenience."""
    return await chat_completions(request, db)
