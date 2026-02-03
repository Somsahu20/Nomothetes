from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
from pathlib import Path
from sqlalchemy.engine import URL

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
ENV_FILE = BASE_DIR / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    APP_NAME: str = "Nomothetes"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database
    DB_PORT: int
    PASSWORD: str
    DB_NAME: str
    DB_HOST: str
    DB_USER: str

    # Redis
    REDIS_URL: str

    # JWT Configuration
    JWT_SECRET: str
    ALGORITHM: str 
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_DAYS: int

    # Security
    PASSWORD_MIN_LENGTH: int = 8
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_MINUTES: int = 15

    # Rate Limiting
    RATE_LIMIT_LOGIN: str = "5/15minute"
    RATE_LIMIT_REGISTER: str = "3/hour"
    RATE_LIMIT_UPLOAD: str = "10/hour"
    RATE_LIMIT_ANALYZE: str = "5/hour"
    RATE_LIMIT_SEARCH: str = "100/hour"
    RATE_LIMIT_REPROCESS: str = "5/hour"
    RATE_LIMIT_SUGGESTIONS: str = "200/hour"
    RATE_LIMIT_NETWORK_GRAPH: str = "30/hour"
    RATE_LIMIT_TASK_RETRY: str = "10/hour"
    RATE_LIMIT_REFRESH: str = "30/hour"
    RATE_LIMIT_LOGOUT_ALL: str = "5/hour"

    # File Upload
    UPLOAD_PATH: str
    MAX_FILE_SIZE: int = 50 * 1024 * 1024 

    DATABASE_URL: str

    # CORS
    ALLOWED_ORIGINS: str

    # AI (Phase 7)
    GEMINI_API_KEY: str
    VITE_API_URL: str

    model_config = SettingsConfigDict(
        case_sensitive=False,
        env_file_encoding="utf-8",
        env_file=str(ENV_FILE)
    )

    


settings = Settings() #type: ignore
# import os
# print("ENV VARS:", {k: v for k, v in os.environ.items() if k in [
#     "DB_PORT", "PASSWORD", "DB_NAME", "DB_HOST", "DB_USER", "JWT_SECRET", "ALGORITHM", "ACCESS_TOKEN_EXPIRE_MINUTES", "REFRESH_TOKEN_EXPIRE_DAYS"
# ]})
# print(ENV_FILE)
# print("DB_PORT from settings:", settings.DB_PORT)
# print("DB_NAME from settings:", settings.DB_NAME)
# print("DB_USER from settings:", settings.DB_USER)
# print("JWT_SECRET from settings:", settings.JWT_SECRET)

# print(settings.get_db_url)