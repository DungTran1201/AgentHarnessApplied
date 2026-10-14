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


import pytest
from unittest.mock import AsyncMock, MagicMock
from src.discord_bot.schemas import PromptResponse


@pytest.mark.asyncio
async def test_on_message_ignores_bot_messages() -> None:
    """Test that on_message ignores messages sent by bots."""
    mock_bot = MagicMock()
    mock_client = AsyncMock()
    mock_bot.aichan_client = mock_client
    cog = AskCog(bot=mock_bot)

    mock_msg = MagicMock()
    mock_msg.author.bot = True
    await cog.on_message(mock_msg)
    mock_client.ask.assert_not_called()


@pytest.mark.asyncio
async def test_on_message_handles_dm() -> None:
    """Test that on_message processes direct messages (DM) and replies."""
    mock_bot = MagicMock()
    mock_bot.user = MagicMock()
    mock_bot.user.id = 123456
    mock_client = AsyncMock()
    mock_client.ask.return_value = PromptResponse(
        response="Hello from AI-Chan in DM!",
        model="gemini-1.5-flash",
    )
    mock_bot.aichan_client = mock_client
    cog = AskCog(bot=mock_bot)

    mock_msg = MagicMock()
    mock_msg.author.bot = False
    mock_msg.author.id = 999
    mock_msg.author.display_name = "TestUser"
    mock_msg.author.display_avatar.url = "http://example.com/avatar.png"
    mock_msg.guild = None  # Direct Message
    mock_msg.content = "bạn hãy giới thiệu bản thân"
    mock_msg.id = 888
    mock_msg.reply = AsyncMock()

    # typing context manager
    typing_cm = MagicMock()
    typing_cm.__aenter__ = AsyncMock(return_value=None)
    typing_cm.__aexit__ = AsyncMock(return_value=None)
    mock_msg.channel.typing = MagicMock(return_value=typing_cm)

    await cog.on_message(mock_msg)

    mock_client.ask.assert_called_once()
    prompt_arg = mock_client.ask.call_args[0][0]
    assert prompt_arg.prompt == "bạn hãy giới thiệu bản thân"
    assert prompt_arg.metadata["user_id"] == "999"
    assert prompt_arg.metadata.get("guild_id") is None
    mock_msg.reply.assert_called_once()


@pytest.mark.asyncio
async def test_on_message_handles_raw_slash_text() -> None:
    """Test that typing '/ask prompt: ...' as raw text is handled."""
    mock_bot = MagicMock()
    mock_bot.user = MagicMock()
    mock_bot.user.id = 123456
    mock_client = AsyncMock()
    mock_client.ask.return_value = PromptResponse(
        response="Code Fibonacci...",
        model="gemini-1.5-flash",
    )
    mock_bot.aichan_client = mock_client
    cog = AskCog(bot=mock_bot)

    mock_msg = MagicMock()
    mock_msg.author.bot = False
    mock_msg.author.id = 999
    mock_msg.author.display_name = "TestUser"
    mock_msg.author.display_avatar.url = "http://example.com/avatar.png"
    mock_msg.guild = None
    mock_msg.content = "/ask prompt: Xin chào, bạn là ai và hãy viết giúp tôi một đoạn code Python tính số Fibonacci?"
    mock_msg.id = 889
    mock_msg.reply = AsyncMock()

    typing_cm = MagicMock()
    typing_cm.__aenter__ = AsyncMock(return_value=None)
    typing_cm.__aexit__ = AsyncMock(return_value=None)
    mock_msg.channel.typing = MagicMock(return_value=typing_cm)

    await cog.on_message(mock_msg)

    mock_client.ask.assert_called_once()
    prompt_arg = mock_client.ask.call_args[0][0]
    assert prompt_arg.prompt == "Xin chào, bạn là ai và hãy viết giúp tôi một đoạn code Python tính số Fibonacci?"
    mock_msg.reply.assert_called_once()
