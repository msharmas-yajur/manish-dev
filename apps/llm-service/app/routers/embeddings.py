from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.config.database import get_db
from app.models.schemas import EmbeddingRequest, EmbeddingResponse
from app.services.router import LLMRouter

router = APIRouter()
logger = structlog.get_logger()


@router.post("/v1/embeddings", response_model=EmbeddingResponse)
async def create_embeddings(
    request: EmbeddingRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Create embeddings for the given input.

    Supported models:
    - OpenAI: text-embedding-3-small, text-embedding-3-large, text-embedding-ada-002
    - Ollama: nomic-embed-text, mxbai-embed-large (requires model to be pulled)

    Users must configure their API keys for commercial providers.
    """
    try:
        llm_router = LLMRouter(db)
        response = await llm_router.create_embedding(request)
        return response
    except ValueError as e:
        logger.warning(f"Embedding validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except NotImplementedError as e:
        logger.warning(f"Embedding not supported: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Embedding error: {e}")
        raise HTTPException(status_code=500, detail=f"Embedding request failed: {str(e)}")
