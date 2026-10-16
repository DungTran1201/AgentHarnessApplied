"""Application configuration for AI-Chan Discord Bot using Pydantic Settings v2."""

from functools import lru_cache
from pathlib import Path
from typing import Literal, Optional

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE_PATHS = [
    Path(".env"),
    BASE_DIR / ".env",
    BASE_DIR.parent / ".env",
]
PLACEHOLDER_TOKEN_VALUE = "your_discord_bot_token_here"  # noqa: S105


class Settings(BaseSettings):
    """AI-Chan Discord Bot application settings."""

    model_config = SettingsConfigDict(
        env_file=tuple(str(p) for p in ENV_FILE_PATHS if p.exists()) or ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Discord Bot Settings
    DISCORD_BOT_TOKEN: str = Field(
        default="",
        description="Discord Bot Token from Discord Developer Portal",
    )
    DISCORD_GUILD_ID: Optional[int] = Field(
        default=None,
        description="Discord Guild ID for rapid command sync during development",
    )

    # AI Backend API Settings (Supports unified AI-Chan URL and legacy Antigravity aliases)
    DISCORD_BOT_API_BASE_URL: str = Field(
        default="http://localhost:8000",
        description="Base URL for AI-Chan Backend API",
    )
    DISCORD_BOT_API_KEY: Optional[str] = Field(
        default=None,
        description="Internal API Key / Service Token for backend authentication",
    )
    DISCORD_BOT_TIMEOUT_SECONDS: float = Field(
        default=30.0,
        gt=0.0,
        description="Timeout in seconds for backend API requests",
    )

    # Legacy Compatibility Fields
    ANTIGRAVITY_API_URL: Optional[str] = Field(
        default=None,
        description="Backward compatibility alias for DISCORD_BOT_API_BASE_URL",
    )
    ANTIGRAVITY_API_KEY: Optional[str] = Field(
        default=None,
        description="Backward compatibility alias for DISCORD_BOT_API_KEY",
    )
    ANTIGRAVITY_TIMEOUT_SECONDS: Optional[float] = Field(
        default=None,
        gt=0.0,
        description="Backward compatibility alias for DISCORD_BOT_TIMEOUT_SECONDS",
    )

    # General App Settings
    ENVIRONMENT: Literal["development", "staging", "production"] = Field(
        default="development",
        description="Application running environment",
    )
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = Field(
        default="INFO",
        description="Application logging level",
    )

    @field_validator("DISCORD_BOT_TOKEN")
    @classmethod
    def validate_discord_bot_token(cls, v: str) -> str:
        """Ensure Discord Bot Token is not an empty string or placeholder."""
        cleaned_token = v.strip()
        if not cleaned_token or cleaned_token == PLACEHOLDER_TOKEN_VALUE:  # noqa: S105
            raise ValueError(
                "DISCORD_BOT_TOKEN is required. "
                "Please configure a valid bot token in your .env file."
            )
        return cleaned_token

    @model_validator(mode="after")
    def synchronize_aliases(self) -> "Settings":
        """Synchronize unified DISCORD_BOT_API_* settings with legacy ANTIGRAVITY_* aliases."""
        if self.ANTIGRAVITY_API_URL and self.DISCORD_BOT_API_BASE_URL == "http://localhost:8000":
            self.DISCORD_BOT_API_BASE_URL = self.ANTIGRAVITY_API_URL
        elif not self.ANTIGRAVITY_API_URL:
            self.ANTIGRAVITY_API_URL = self.DISCORD_BOT_API_BASE_URL

        if self.ANTIGRAVITY_API_KEY and not self.DISCORD_BOT_API_KEY:
            self.DISCORD_BOT_API_KEY = self.ANTIGRAVITY_API_KEY
        elif self.DISCORD_BOT_API_KEY and not self.ANTIGRAVITY_API_KEY:
            self.ANTIGRAVITY_API_KEY = self.DISCORD_BOT_API_KEY

        if self.ANTIGRAVITY_TIMEOUT_SECONDS is not None:
            self.DISCORD_BOT_TIMEOUT_SECONDS = self.ANTIGRAVITY_TIMEOUT_SECONDS
        else:
            self.ANTIGRAVITY_TIMEOUT_SECONDS = self.DISCORD_BOT_TIMEOUT_SECONDS

        return self


@lru_cache
def get_settings() -> Settings:
    """Retrieve cached application settings instance."""
    return Settings()
