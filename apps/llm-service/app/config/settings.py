from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Environment
    environment: str = "development"
    debug: bool = True

    # Database
    postgres_host: str = "postgres"
    postgres_port: int = 5432
    postgres_user: str = "manish"
    postgres_password: str = "manish_secret"
    postgres_db: str = "manish_dev"

    @property
    def database_url(self) -> str:
        return f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"

    # Redis
    redis_host: str = "redis"
    redis_port: int = 6379
    redis_password: str = "manish_secret"

    @property
    def redis_url(self) -> str:
        return f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}/0"

    # Encryption
    encryption_key: str = "change_this_32_char_encryption_key"

    # Ollama (self-hosted)
    ollama_host: str = "http://ollama:11434"

    # Request settings
    default_timeout: int = 60
    max_retries: int = 3

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
