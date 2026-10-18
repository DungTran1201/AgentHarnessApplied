"""AI-Chan AI interaction Cog for Discord Bot."""

import logging
from typing import TYPE_CHECKING, Optional

import discord
from discord import app_commands
from discord.ext import commands

from src.discord_bot.exceptions import DiscordBotError
from src.discord_bot.schemas import PromptRequest
from src.discord_bot.utils import split_discord_message

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
        """Process user AI prompt with interaction deferral, multi-chunk formatting, and error handling."""
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
                "interaction_id": str(interaction.id),
            }
            if interaction.guild_id:
                metadata["guild_id"] = str(interaction.guild_id)
            if self.bot.user:
                metadata["bot_id"] = str(self.bot.user.id)
            if getattr(self.bot, "bot_config_id", None):
                metadata["bot_config_id"] = str(self.bot.bot_config_id)
            if getattr(self.bot, "bot_alias", None):
                metadata["bot_alias"] = str(self.bot.bot_alias)

            req = PromptRequest(
                prompt=prompt,
                model=model or "default",
                metadata=metadata,
            )
            response = await self.aichan_client.ask(req)

            # Split response into valid chunks without breaking code fences
            chunks = split_discord_message(response.response, max_chunk_size=3900)
            total_parts = len(chunks)

            # First chunk embed
            first_embed = discord.Embed(
                description=chunks[0],
                color=discord.Color.blurple(),
            )
            first_embed.set_author(
                name=f"Prompt by {interaction.user.display_name}",
                icon_url=interaction.user.display_avatar.url,
            )

            footer_text = f"Model: {response.model or 'default'}"
            if response.usage:
                footer_text += f" | Tokens: {response.usage.total_tokens}"
            if total_parts > 1:
                footer_text += f" | Part 1/{total_parts}"
            first_embed.set_footer(text=footer_text)

            await interaction.followup.send(embed=first_embed)

            # Deliver subsequent chunks in order as sequential followups
            for idx in range(1, total_parts):
                part_embed = discord.Embed(
                    description=chunks[idx],
                    color=discord.Color.blurple(),
                )
                part_embed.set_footer(
                    text=f"Model: {response.model or 'default'} | Part {idx + 1}/{total_parts}"
                )
                await interaction.followup.send(embed=part_embed)

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

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message) -> None:
        """Process incoming chat messages in Direct Messages, mentions, or text /ask commands."""
        # 1. Ignore own messages and messages from other bots
        if message.author.bot:
            return

        # 2. Check if the message is directed at this bot
        is_dm = message.guild is None
        is_mention = self.bot.user in message.mentions if self.bot.user else False
        content_lower = message.content.strip().lower()
        starts_with_ask = content_lower.startswith(("/ask", "!ask"))

        if not (is_dm or is_mention or starts_with_ask):
            return

        # 3. Clean and extract prompt
        raw_content = message.content.strip()
        cleaned_prompt = raw_content

        if content_lower.startswith("/ask prompt:"):
            cleaned_prompt = raw_content[12:].strip()
        elif content_lower.startswith("/ask"):
            cleaned_prompt = raw_content[4:].strip()
        elif content_lower.startswith("!ask prompt:"):
            cleaned_prompt = raw_content[12:].strip()
        elif content_lower.startswith("!ask"):
            cleaned_prompt = raw_content[4:].strip()
        elif is_mention and self.bot.user:
            cleaned_prompt = raw_content.replace(f"<@{self.bot.user.id}>", "").replace(f"<@!{self.bot.user.id}>", "").strip()

        if not cleaned_prompt:
            embed = discord.Embed(
                title="🤖 AI-Chan Assistant",
                description="Xin chào! Bạn có thể gửi câu hỏi cho tôi trực tiếp qua tin nhắn này hoặc sử dụng lệnh `/ask`.",
                color=discord.Color.blurple(),
            )
            await message.reply(embed=embed)
            return

        if self.aichan_client is None:
            logger.error("AIChanClient is not configured on bot.")
            await message.reply("❌ **Error:** AI-Chan AI service is currently unavailable.")
            return

        # 4. Trigger typing indicator and dispatch prompt
        try:
            async with message.channel.typing():
                metadata: dict[str, str] = {
                    "user_id": str(message.author.id),
                    "channel_id": str(message.channel.id),
                    "interaction_id": f"msg_{message.id}",
                }
                if message.guild:
                    metadata["guild_id"] = str(message.guild.id)
                if self.bot.user:
                    metadata["bot_id"] = str(self.bot.user.id)
                if getattr(self.bot, "bot_config_id", None):
                    metadata["bot_config_id"] = str(self.bot.bot_config_id)
                if getattr(self.bot, "bot_alias", None):
                    metadata["bot_alias"] = str(self.bot.bot_alias)

                req = PromptRequest(
                    prompt=cleaned_prompt,
                    model="default",
                    metadata=metadata,
                )
                response = await self.aichan_client.ask(req)

                chunks = split_discord_message(response.response, max_chunk_size=3900)
                total_parts = len(chunks)

                first_embed = discord.Embed(
                    description=chunks[0],
                    color=discord.Color.blurple(),
                )
                first_embed.set_author(
                    name=f"Message by {message.author.display_name}",
                    icon_url=message.author.display_avatar.url,
                )
                footer_text = f"Model: {response.model or 'default'}"
                if response.usage:
                    footer_text += f" | Tokens: {response.usage.total_tokens}"
                if total_parts > 1:
                    footer_text += f" | Part 1/{total_parts}"
                first_embed.set_footer(text=footer_text)

                await message.reply(embed=first_embed)

                for idx in range(1, total_parts):
                    part_embed = discord.Embed(
                        description=chunks[idx],
                        color=discord.Color.blurple(),
                    )
                    part_embed.set_footer(
                        text=f"Model: {response.model or 'default'} | Part {idx + 1}/{total_parts}"
                    )
                    await message.channel.send(embed=part_embed)

        except DiscordBotError as exc:
            logger.warning("AI-Chan service error for message from %s: %s", message.author, exc.message)
            await message.reply(f"⚠️ **AI-Chan AI Error:** {exc.message}")
        except Exception as exc:
            logger.error("Unexpected error handling message: %s", exc, exc_info=True)
            await message.reply("❌ An unexpected error occurred while processing your request.")


# Backward compatibility alias
AntigravityCog = AskCog


async def setup(bot: commands.Bot) -> None:
    """Load AskCog into Discord bot."""
    await bot.add_cog(AskCog(bot))
    logger.info("Loaded Cog: AskCog (AI-Chan AI)")
