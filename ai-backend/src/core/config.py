import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

from pathlib import Path
_backend_dir = Path(__file__).resolve().parent.parent.parent
_env_path = str(_backend_dir / ".env") if (_backend_dir / ".env").exists() else ".env"

class Settings(BaseSettings):
    APP_ENV: str = "development"
    APP_NAME: str = "ai-chan-backend"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True

    SECRET_KEY: str = "insecure-default-change-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    DATABASE_URL: str = "sqlite+aiosqlite:///./ai_chan.db"
    REDIS_URL: str = "redis://localhost:6379/0"

    # LLM Settings
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    DEFAULT_LLM_PROVIDER: str = "gemini"
    DEFAULT_LLM_MODEL: str = "gemini-1.5-flash"

    # Discord OAuth2 & Bot Settings (ADR-007, ADR-012, SEC-008, SEC-013)
    DISCORD_CLIENT_ID: str = ""
    DISCORD_CLIENT_SECRET: str = ""
    DISCORD_REDIRECT_URI: str = "http://localhost:3000/api/v1/auth/discord/callback"
    DISCORD_BOT_TOKEN: str = ""
    DISCORD_PUBLIC_KEY: str = ""
    # Project Management Settings
    MAX_ACTIVE_PROJECTS: int = 3

    # File Upload & Asset Settings (Unified File Upload System)
    MAX_FILE_SIZE_MB: int = 20
    MAX_FILES_PER_REQUEST: int = 5
    UPLOAD_DIR: str = ""

    model_config = SettingsConfigDict(
        env_file=_env_path,
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

settings = Settings()
