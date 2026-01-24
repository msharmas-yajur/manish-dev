from fastapi import APIRouter, HTTPException
from datetime import datetime
from sqlalchemy import text
import structlog

from app.config.settings import settings
from app.config import database

router = APIRouter()
logger = structlog.get_logger()


@router.get("/health")
async def health_check():
    """Comprehensive health check endpoint."""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "backend",
        "version": "1.0.0",
        "environment": settings.environment,
        "dependencies": {}
    }

    # Check PostgreSQL
    try:
        if database.postgres_engine is None:
            raise Exception("PostgreSQL not initialized")
        async with database.postgres_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        health_status["dependencies"]["postgres"] = "healthy"
    except Exception as e:
        logger.error("PostgreSQL health check failed", error=str(e))
        health_status["dependencies"]["postgres"] = "unhealthy"
        health_status["status"] = "degraded"

    # Check MongoDB
    try:
        if database.mongo_client is None:
            raise Exception("MongoDB not initialized")
        await database.mongo_client.admin.command('ping')
        health_status["dependencies"]["mongodb"] = "healthy"
    except Exception as e:
        logger.error("MongoDB health check failed", error=str(e))
        health_status["dependencies"]["mongodb"] = "unhealthy"
        health_status["status"] = "degraded"

    # Check Redis
    try:
        if database.redis_client is None:
            raise Exception("Redis not initialized")
        await database.redis_client.ping()
        health_status["dependencies"]["redis"] = "healthy"
    except Exception as e:
        logger.error("Redis health check failed", error=str(e))
        health_status["dependencies"]["redis"] = "unhealthy"
        health_status["status"] = "degraded"

    if health_status["status"] != "healthy":
        raise HTTPException(status_code=503, detail=health_status)

    return health_status


@router.get("/health/ready")
async def readiness_check():
    """Kubernetes readiness probe."""
    try:
        if database.postgres_engine is None or database.mongo_client is None or database.redis_client is None:
            raise Exception("Database connections not initialized")
        async with database.postgres_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        await database.mongo_client.admin.command('ping')
        await database.redis_client.ping()
        return {"ready": True}
    except Exception:
        raise HTTPException(status_code=503, detail={"ready": False})


@router.get("/health/live")
async def liveness_check():
    """Kubernetes liveness probe."""
    return {"alive": True}
