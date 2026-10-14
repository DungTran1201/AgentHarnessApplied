"""Unit tests for AI-Chan Discord Bot configuration loading and validation."""

import pytest
from pydantic import ValidationError

from src.discord_bot.config import Settings


def test_settings_initialization_with_valid_data() -> None:
    """Test that Settings initializes properly with valid data."""
    settings = Settings(
        DISCORD_BOT_TOKEN="mock_discord_token_12345",
        DISCORD_GUILD_ID=123456789012345678,
        DISCORD_BOT_API_BASE_URL="http://mock-api.local",
        DISCORD_BOT_API_KEY="mock_api_key",
        DISCORD_BOT_TIMEOUT_SECONDS=5.0,
        ENVIRONMENT="development",
        LOG_LEVEL="DEBUG",
    )
    assert settings.DISCORD_BOT_TOKEN == "mock_discord_token_12345"
    assert settings.DISCORD_GUILD_ID == 123456789012345678
    assert settings.DISCORD_BOT_API_BASE_URL == "http://mock-api.local"
    assert settings.DISCORD_BOT_API_KEY == "mock_api_key"
    assert settings.DISCORD_BOT_TIMEOUT_SECONDS == 5.0
    assert settings.ENVIRONMENT == "development"
    assert settings.LOG_LEVEL == "DEBUG"


def test_settings_legacy_antigravity_aliases() -> None:
    """Test backward compatibility aliases for ANTIGRAVITY_* settings."""
    settings = Settings(
        DISCORD_BOT_TOKEN="mock_discord_token_12345",
        ANTIGRAVITY_API_URL="http://mock-antigravity.local",
        ANTIGRAVITY_API_KEY="mock_secret_key",
        ANTIGRAVITY_TIMEOUT_SECONDS=12.0,
    )
    assert settings.ANTIGRAVITY_API_URL == "http://mock-antigravity.local"
    assert settings.ANTIGRAVITY_API_KEY == "mock_secret_key"
    assert settings.ANTIGRAVITY_TIMEOUT_SECONDS == 12.0
    # Unified fields should mirror legacy aliases
    assert settings.DISCORD_BOT_API_BASE_URL == "http://mock-antigravity.local"
    assert settings.DISCORD_BOT_API_KEY == "mock_secret_key"
    assert settings.DISCORD_BOT_TIMEOUT_SECONDS == 12.0


def test_settings_empty_token_raises_validation_error() -> None:
    """Test that empty or whitespace DISCORD_BOT_TOKEN raises ValidationError."""
    with pytest.raises(ValidationError):
        Settings(DISCORD_BOT_TOKEN="")

    with pytest.raises(ValidationError):
        Settings(DISCORD_BOT_TOKEN="   ")


def test_settings_placeholder_token_raises_validation_error() -> None:
    """Test that default placeholder DISCORD_BOT_TOKEN raises ValidationError."""
    with pytest.raises(ValidationError):
        Settings(DISCORD_BOT_TOKEN="your_discord_bot_token_here")


def test_settings_invalid_timeout_raises_error() -> None:
    """Test that negative or zero timeout raises ValidationError."""
    with pytest.raises(ValidationError):
        Settings(
            DISCORD_BOT_TOKEN="mock_token",
            DISCORD_BOT_TIMEOUT_SECONDS=-5.0,
        )
