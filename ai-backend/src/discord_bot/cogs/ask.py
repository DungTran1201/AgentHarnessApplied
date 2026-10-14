"""AI-Chan AI interaction Cog for Discord Bot."""

import logging
from typing import TYPE_CHECKING, Optional

import discord
from discord import app_commands
from discord.ext import commands

from src.discord_bot.exceptions import DiscordBotError
from src.discord_bot.schemas import PromptRequest

if TYPE_CHECKING:
    from src.discord_bot.client import AIChanClient

logger = logging.getLogger(__name__)


class AskCog(commands.Cog, name="AI-Chan AI"):
    """Cog handling interactions with AI-Chan AI services."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @property
    def aichan_client(self) -> Optional["AIChanClient"]:
        """Get AI-Chan service client instance attached to bot."""
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

    @app_commands.command(
        name="ask",
        description="Ask a question or send a prompt to AI-Chan AI",
    )
    @app_commands.describe(
        prompt="The message or question for AI-Chan AI",
        model="Optional model name override",
    )
    async def ask(
        self,
        interaction: discord.Interaction,
        prompt: str,
        model: Optional[str] = None,
    ) -> None:
        """Process user AI prompt with interaction deferral and error handling."""
        # Defer immediately to adhere to the 3-second Discord interaction limit
        await interaction.response.defer(thinking=True)

        if self.aichan_client is None:
            logger.error("AIChanClient is not configured on bot.")
            await interaction.followup.send(
                "❌ **Error:** AI-Chan AI service is currently unavailable.",
                ephemeral=True,
            )
            return

        try:
            metadata: dict[str, str] = {
                "user_id": str(interaction.user.id),
                "channel_id": str(interaction.channel_id),
            }
            if interaction.guild_id:
                metadata["guild_id"] = str(interaction.guild_id)

            req = PromptRequest(
                prompt=prompt,
                model=model or "default",
                metadata=metadata,
            )
            response = await self.aichan_client.ask(req)

            # Format response text (handle Discord embed limit)
            content = response.response
            if len(content) > 4000:
                content = content[:3990] + "\n... *(response truncated)*"

            embed = discord.Embed(
                description=content,
                color=discord.Color.blurple(),
            )
            embed.set_author(
                name=f"Prompt by {interaction.user.display_name}",
                icon_url=interaction.user.display_avatar.url,
            )
            footer_text = f"Model: {response.model or 'default'}"
            if response.usage:
                footer_text += f" | Tokens: {response.usage.total_tokens}"
            embed.set_footer(text=footer_text)

            await interaction.followup.send(embed=embed)

        except DiscordBotError as exc:
            logger.warning(
                "AI-Chan service error for user %s: %s",
                interaction.user,
                exc.message,
            )
            await interaction.followup.send(
                f"⚠️ **AI-Chan AI Error:** {exc.message}",
                ephemeral=True,
            )
        except Exception as exc:
            logger.error("Unexpected error during /ask command: %s", exc, exc_info=True)
            await interaction.followup.send(
                "❌ An unexpected error occurred while processing your request.",
                ephemeral=True,
            )


# Backward compatibility alias
AntigravityCog = AskCog


async def setup(bot: commands.Bot) -> None:
    """Load AskCog into Discord bot."""
    await bot.add_cog(AskCog(bot))
    logger.info("Loaded Cog: AskCog (AI-Chan AI)")
