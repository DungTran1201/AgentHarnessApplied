"""Unit tests for AI-Chan Discord Bot Cogs and command tree registration."""

from unittest.mock import MagicMock

from src.discord_bot.cogs.ask import AskCog, AntigravityCog
from src.discord_bot.cogs.diagnostics import DiagnosticsCog, HealthCog
from src.discord_bot.main import AIChanDiscordBot, AntigravityBot
from src.discord_bot.config import Settings


def test_diagnostics_cog_properties() -> None:
    """Test DiagnosticsCog initialization and properties."""
    mock_bot = MagicMock()
    mock_client = MagicMock()
    mock_bot.aichan_client = mock_client
    mock_bot.antigravity_client = mock_client
    cog = DiagnosticsCog(bot=mock_bot)

    assert cog.bot == mock_bot
    assert cog.aichan_client == mock_client
    assert cog.antigravity_service == mock_client


def test_ask_cog_properties() -> None:
    """Test AskCog initialization and properties."""
    mock_bot = MagicMock()
    mock_client = MagicMock()
    mock_bot.aichan_client = mock_client
    mock_bot.antigravity_client = mock_client
    cog = AskCog(bot=mock_bot)

    assert cog.bot == mock_bot
    assert cog.aichan_client == mock_client
    assert cog.antigravity_service == mock_client


def test_cog_backward_compatibility_aliases() -> None:
    """Ensure AntigravityCog and HealthCog aliases match AskCog and DiagnosticsCog."""
    assert AntigravityCog is AskCog
    assert HealthCog is DiagnosticsCog
    assert AntigravityBot is AIChanDiscordBot


def test_bot_initialization_with_settings() -> None:
    """Test that AIChanDiscordBot initializes with settings and internal client."""
    settings = Settings(
        DISCORD_BOT_TOKEN="mock_token_for_init_test",
        DISCORD_BOT_API_BASE_URL="http://127.0.0.1:8000",
    )
    bot = AIChanDiscordBot(settings=settings)
    assert bot.settings == settings
    assert bot.aichan_client is not None
    assert bot.aichan_client.base_url == "http://127.0.0.1:8000"
    assert bot.antigravity_client is bot.aichan_client
