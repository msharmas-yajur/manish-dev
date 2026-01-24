from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from motor.motor_asyncio import AsyncIOMotorClient
import redis.asyncio as redis
import structlog

from app.config.settings import settings

logger = structlog.get_logger()

# SQLAlchemy Base
Base = declarative_base()

# PostgreSQL
postgres_engine = None
AsyncSessionLocal = None


async def init_postgres():
    global postgres_engine, AsyncSessionLocal
    postgres_engine = create_async_engine(
        settings.postgres_url,
        echo=settings.environment == "development",
        pool_size=20,
        max_overflow=10,
    )
    AsyncSessionLocal = async_sessionmaker(
        postgres_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    logger.info("PostgreSQL connection pool initialized")


async def close_postgres():
    global postgres_engine
    if postgres_engine:
        await postgres_engine.dispose()
        logger.info("PostgreSQL connection pool closed")


async def get_postgres_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session


# MongoDB
mongo_client: AsyncIOMotorClient = None
mongo_db = None


async def init_mongo():
    global mongo_client, mongo_db
    mongo_client = AsyncIOMotorClient(settings.mongo_url)
    mongo_db = mongo_client[settings.mongo_db]
    # Test connection
    await mongo_client.admin.command('ping')
    logger.info("MongoDB connection established")


async def close_mongo():
    global mongo_client
    if mongo_client:
        mongo_client.close()
        logger.info("MongoDB connection closed")


def get_mongo_db():
    return mongo_db


# Redis
redis_client: redis.Redis = None


async def init_redis():
    global redis_client
    redis_client = redis.Redis(
        host=settings.redis_host,
        port=settings.redis_port,
        password=settings.redis_password,
        decode_responses=True,
    )
    await redis_client.ping()
    logger.info("Redis connection established")


async def close_redis():
    global redis_client
    if redis_client:
        await redis_client.close()
        logger.info("Redis connection closed")


def get_redis():
    return redis_client
