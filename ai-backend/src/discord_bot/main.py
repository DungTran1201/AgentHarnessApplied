"""Application entrypoint and lifecycle management for AI-Chan Integrated Discord Bot."""

import asyncio
import logging
import signal
import sys
from pathlib import Path

import discord
from discord import app_commands
from discord.ext import commands

from src.discord_bot.client import AIChanClient
from src.discord_bot.config import Settings, get_settings
from src.discord_bot.logger import setup_logging

logger = logging.getLogger("src.discord_bot.main")


class AIChanDiscordBot(commands.Bot):
    """Custom Discord Bot client integrating AI-Chan AI orchestration service."""

    def __init__(self, settings: Settings) -> None:
        intents = discord.Intents.default()
        intents.message_content = True

        super().__init__(
            command_prefix=commands.when_mentioned,
            intents=intents,
            help_command=None,
        )
        self.settings: Settings = settings

        # AI-Chan HTTP Service client
        self.aichan_client: AIChanClient = AIChanClient(
            base_url=self.settings.DISCORD_BOT_API_BASE_URL,
            api_key=self.settings.DISCORD_BOT_API_KEY,
            timeout_seconds=self.settings.DISCORD_BOT_TIMEOUT_SECONDS,
        )
        # Backward compatibility aliases for reference bot
        self.antigravity_client: AIChanClient = self.aichan_client
        self.antigravity_service: AIChanClient = self.aichan_client

    async def setup_hook(self) -> None:
        """Asynchronous setup hook to dynamically load cogs and synchronize application commands."""
        logger.info("Initializing bot setup hook: loading cogs and syncing slash commands...")

        # Dynamically discover and load all cogs from cogs directory
        cogs_dir = Path(__file__).parent / "cogs"
        if cogs_dir.exists() and cogs_dir.is_dir():
            for file in cogs_dir.glob("*.py"):
                if not file.name.startswith("__"):
                    cog_extension = f"src.discord_bot.cogs.{file.stem}"
                    try:
                        await self.load_extension(cog_extension)
                        logger.info("Successfully registered extension: %s", cog_extension)
                    except Exception as exc:
                        logger.error(
                            "Failed to load extension %s: %s",
                            cog_extension,
                            exc,
                            exc_info=True,
                        )

        # Synchronize slash commands
        if self.settings.DISCORD_GUILD_ID:
            guild = discord.Object(id=self.settings.DISCORD_GUILD_ID)
            self.tree.copy_global_to(guild=guild)
            synced = await self.tree.sync(guild=guild)
            logger.info(
                "Synchronized %d slash command(s) instantly to Dev Guild ID: %s",
                len(synced),
                guild.id,
            )
        else:
            synced = await self.tree.sync()
            logger.info("Synchronized %d global slash command(s)", len(synced))

    async def on_ready(self) -> None:
        """Event listener dispatched when the bot has successfully connected to Discord Gateway."""
        bot_user = self.user
        user_name = bot_user.name if bot_user else "Unknown"
        user_id = bot_user.id if bot_user else 0
        guild_count = len(self.guilds)
        latency_ms = round(self.latency * 1000, 2)

        # Rich presence activity
        activity = discord.Activity(
            type=discord.ActivityType.watching,
            name="AI-Chan AI | /ask",
        )
        await self.change_presence(activity=activity, status=discord.Status.online)

        logger.info("==================================================")
        logger.info("🤖 AI-Chan Discord Bot is ONLINE & Connected!")
        logger.info("Bot Username              : %s (ID: %s)", user_name, user_id)
        logger.info("Connected Servers (Guilds): %d", guild_count)
        logger.info("Websocket Latency         : %.2f ms", latency_ms)
        logger.info("Presence Status           : Watching %s", activity.name)
        logger.info("Environment               : %s", self.settings.ENVIRONMENT)
        logger.info("Logging Level             : %s", self.settings.LOG_LEVEL)
        logger.info("Backend API Base URL      : %s", self.settings.DISCORD_BOT_API_BASE_URL)
        logger.info("==================================================")

    async def close(self) -> None:
        """Gracefully shutdown bot, closing HTTP client and Gateway connections."""
        logger.info("Initiating graceful shutdown sequence...")
        try:
            if hasattr(self, "aichan_client"):
                await self.aichan_client.close()
                logger.info("Closed AI-Chan HTTP client session.")
        except Exception as exc:
            logger.warning("Error while closing AI-Chan client: %s", exc)

        await super().close()
        logger.info("Closed Discord Gateway connection.")


# Backward compatibility alias
AntigravityBot = AIChanDiscordBot


def setup_tree_error_handler(bot: AIChanDiscordBot) -> None:
    """Register centralized error handler for application slash commands."""

    @bot.tree.error
    async def on_app_command_error(
        interaction: discord.Interaction,
        error: app_commands.AppCommandError,
    ) -> None:
        """Global error handler for slash commands."""
        command_name = interaction.command.name if interaction.command else "Unknown"
        logger.error(
            "Unhandled slash command error in '/%s' executed by %s: %s",
            command_name,
            interaction.user,
            error,
            exc_info=True,
        )

        error_message = "❌ An unexpected error occurred while executing this command."
        if isinstance(error, app_commands.CommandOnCooldown):
            error_message = (
                f"⏳ This command is on cooldown. Please try again in {error.retry_after:.1f}s."
            )
        elif isinstance(error, app_commands.MissingPermissions):
            error_message = "🚫 You do not have the required permissions to use this command."
        elif isinstance(error, app_commands.CheckFailure):
            error_message = "🚫 Command execution check failed."

        try:
            if interaction.response.is_done():
                await interaction.followup.send(error_message, ephemeral=True)
            else:
                await interaction.response.send_message(error_message, ephemeral=True)
        except discord.HTTPException as exc:
            logger.error("Failed to send error message to interaction: %s", exc)


async def run_bot_async(settings: Settings) -> None:
    """Run Discord Bot with robust lifecycle management and graceful shutdown."""
    bot = AIChanDiscordBot(settings=settings)
    setup_tree_error_handler(bot)

    loop = asyncio.get_running_loop()

    # Register OS signal handlers if supported (Unix)
    if sys.platform != "win32":
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, lambda: asyncio.create_task(bot.close()))

    try:
        async with bot:
            await bot.start(settings.DISCORD_BOT_TOKEN)
    except discord.errors.LoginFailure:
        logger.critical(
            "Authentication failed: Invalid Discord Bot Token provided. "
            "Please check DISCORD_BOT_TOKEN in your .env file."
        )
        sys.exit(1)
    except discord.errors.PrivilegedIntentsRequired:
        logger.critical(
            "Privileged Intents Error: 'Message Content Intent' is not enabled in "
            "Discord Developer Portal. Please enable it under Bot > Privileged Gateway Intents."
        )
        sys.exit(1)
    except discord.errors.GatewayNotFound:
        logger.critical("Discord Gateway was not found. Please verify your network connection.")
        sys.exit(1)
    except discord.errors.ConnectionClosed as exc:
        logger.error("Discord Gateway connection was closed: %s", exc)
    except (KeyboardInterrupt, asyncio.CancelledError):
        logger.info("Shutdown requested via KeyboardInterrupt / cancellation.")
    except Exception as exc:
        logger.critical("Unexpected fatal error in bot execution: %s", exc, exc_info=True)
        sys.exit(1)
    finally:
        if not bot.is_closed():
            await bot.close()
        logger.info("AI-Chan Discord Bot lifecycle terminated cleanly.")


def main() -> None:
    """Main application execution entrypoint."""
    setup_logging("INFO")
    try:
        settings = get_settings()
        setup_logging(settings.LOG_LEVEL)
    except Exception as exc:
        logger.critical("Failed to load application settings: %s", exc)
        sys.exit(1)

    logger.info("Starting AI-Chan Integrated Discord Bot (Python 3.12 Async)...")

    try:
        asyncio.run(run_bot_async(settings))
    except KeyboardInterrupt:
        logger.info("Bot execution terminated by user.")


if __name__ == "__main__":
    main()
