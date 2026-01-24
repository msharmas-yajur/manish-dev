from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import structlog

from app.config.settings import settings
from app.config.database import init_postgres, close_postgres, init_redis, close_redis
from app.routers import health_router, chat_router, embeddings_router, models_router, providers_router

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting LLM Service...")
    try:
        await init_postgres()
        logger.info("PostgreSQL initialized")
    except Exception as e:
        logger.error(f"Failed to initialize PostgreSQL: {e}")

    try:
        await init_redis()
        logger.info("Redis initialized")
    except Exception as e:
        logger.error(f"Failed to initialize Redis: {e}")

    logger.info("LLM Service startup complete")

    yield

    # Shutdown
    logger.info("Shutting down LLM Service...")
    await close_postgres()
    await close_redis()
    logger.info("LLM Service shutdown complete")


app = FastAPI(
    title="LLM Service",
    description="Multi-provider LLM router for Caladrius Health AI Studio",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure based on environment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_router)
app.include_router(chat_router)
app.include_router(embeddings_router)
app.include_router(models_router)
app.include_router(providers_router, prefix="/api/llm")
