"""Health and diagnostic cog for AI-Chan Discord Bot."""

import logging
from typing import TYPE_CHECKING, Optional

import discord
from discord import app_commands
from discord.ext import commands

from src.discord_bot.exceptions import DiscordBotError

if TYPE_CHECKING:
    from src.discord_bot.client import AIChanClient

logger = logging.getLogger(__name__)


class DiagnosticsCog(commands.Cog, name="Diagnostics"):
    """Cog containing health check and latency diagnostics."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @property
    def aichan_client(self) -> Optional["AIChanClient"]:
        """Get AIChanClient instance attached to bot."""
        return (
            getattr(self.bot, "aichan_client", None)
            or getattr(self.bot, "antigravity_client", None)
            or getattr(self.bot, "antigravity_service", None)
        )

    # Backward compatibility property for reference tests
    @property
    def antigravity_service(self) -> Optional["AIChanClient"]:
        """Backward compatibility property returning AIChanClient."""
        return self.aichan_client

    @app_commands.command(name="ping", description="Check Discord Bot websocket latency")
    async def ping(self, interaction: discord.Interaction) -> None:
        """Measure and display bot latency."""
        latency_ms = round(self.bot.latency * 1000, 2)
        logger.debug("Ping command invoked by %s. Latency: %sms", interaction.user, latency_ms)

        embed = discord.Embed(
            title="🏓 Pong!",
            description=f"Bot latency is **{latency_ms} ms**.",
            color=discord.Color.green(),
        )
        await interaction.response.send_message(embed=embed, ephemeral=False)

    @app_commands.command(name="health", description="Check Bot and AI-Chan Backend health status")
    async def health(self, interaction: discord.Interaction) -> None:
        """Check overall system health including AI-Chan Backend status."""
        await interaction.response.defer(ephemeral=False, thinking=True)

        bot_latency_ms = round(self.bot.latency * 1000, 2)
        api_status = "Unknown"
        api_color = discord.Color.gold()

        if self.aichan_client is None:
            api_status = "⚠️ Service not initialized"
            api_color = discord.Color.orange()
        else:
            try:
                health_res = await self.aichan_client.health_check()
                api_status = f"✅ Connected ({health_res.status})"
                api_color = discord.Color.green()
            except DiscordBotError as exc:
                api_status = f"❌ Error: {exc.message}"
                api_color = discord.Color.red()
            except Exception as exc:
                logger.error("Unexpected error during health check: %s", exc, exc_info=True)
                api_status = f"❌ Error: {exc}"
                api_color = discord.Color.red()

        embed = discord.Embed(
            title="🩺 AI-Chan System Health Diagnostics",
            color=api_color,
        )
        embed.add_field(name="Bot Status", value="🟢 Online", inline=True)
        embed.add_field(name="Bot Latency", value=f"{bot_latency_ms} ms", inline=True)
        embed.add_field(name="AI-Chan Backend", value=api_status, inline=False)
        embed.set_footer(text=f"Requested by {interaction.user.name}")

        await interaction.followup.send(embed=embed)


# Backward compatibility alias
HealthCog = DiagnosticsCog


async def setup(bot: commands.Bot) -> None:
    """Load DiagnosticsCog into Discord bot."""
    await bot.add_cog(DiagnosticsCog(bot))
    logger.info("Loaded Cog: DiagnosticsCog")
