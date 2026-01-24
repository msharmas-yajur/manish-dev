from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import structlog

from app.config.settings import settings
from app.config.database import init_postgres, close_postgres, init_mongo, close_mongo, init_redis, close_redis
from app.routers import health, patients, practitioners, appointments, medical_records

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
    logger.info("Starting up backend service...")
    try:
        await init_postgres()
        logger.info("PostgreSQL initialized")
    except Exception as e:
        logger.error(f"Failed to initialize PostgreSQL: {e}")

    try:
        await init_mongo()
        logger.info("MongoDB initialized")
    except Exception as e:
        logger.error(f"Failed to initialize MongoDB: {e}")

    try:
        await init_redis()
        logger.info("Redis initialized")
    except Exception as e:
        logger.error(f"Failed to initialize Redis: {e}")

    logger.info("Backend startup complete")

    yield

    # Shutdown
    logger.info("Shutting down backend service...")
    await close_postgres()
    await close_mongo()
    await close_redis()
    logger.info("All connections closed")


app = FastAPI(
    title="Healthcare Backend API",
    description="Python FastAPI backend for healthcare application",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(patients.router, prefix="/api/patients", tags=["Patients"])
app.include_router(practitioners.router, prefix="/api/practitioners", tags=["Practitioners"])
app.include_router(appointments.router, prefix="/api/appointments", tags=["Appointments"])
app.include_router(medical_records.router, prefix="/api/medical-records", tags=["Medical Records"])


@app.get("/")
async def root():
    return {
        "service": "Healthcare Backend API",
        "version": "1.0.0",
        "docs": "/docs",
    }
