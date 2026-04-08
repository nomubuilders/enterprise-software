import logging
from pydantic_settings import BaseSettings
from typing import Optional
from functools import lru_cache

logger = logging.getLogger(__name__)

_INSECURE_DEFAULT_KEY = "your-secret-key-change-in-production"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App
    APP_NAME: str = "ComplianceFlow API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    API_PREFIX: str = "/api/v1"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Ollama
    OLLAMA_BASE_URL: str = "http://127.0.0.1:11434"
    OLLAMA_TIMEOUT: int = 120  # seconds

    # PostgreSQL
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "compliance_flow"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = ""

    # MySQL
    MYSQL_HOST: str = "localhost"
    MYSQL_PORT: int = 3306
    MYSQL_DB: str = "compliance_flow"
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = ""

    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB: str = "compliance_flow"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # Docker
    DOCKER_SOCKET: str = "unix:///var/run/docker.sock"
    DOCKER_TIMEOUT: int = 300
    APPROVED_IMAGES_PATH: str = "../config/approved-images.json"
    AUDIT_LOG_PATH: str = "../data/audit/container-executions.jsonl"

    # Security
    SECRET_KEY: str = ""
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    @property
    def postgres_url(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    @property
    def mysql_url(self) -> str:
        return f"mysql+aiomysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DB}"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if s.SECRET_KEY == _INSECURE_DEFAULT_KEY:
        if s.DEBUG:
            logger.warning("SECRET_KEY is using the insecure default. Set SECRET_KEY env var before deploying to production.")
        else:
            raise RuntimeError("SECRET_KEY must be changed from the default value in production (DEBUG=False). Set the SECRET_KEY environment variable.")
    return s


settings = get_settings()
