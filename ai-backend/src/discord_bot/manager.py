"""Multi-Discord Bot Runtime Lifecycle Manager (BR-031..034, SEC-008, SEC-013).

Manages concurrent AIChanDiscordBot client instances with robust exception isolation,
individual health monitoring, lifecycle operations (connect, disconnect, reconnect),
and atomic status synchronization with the Bot Registry.
"""

import asyncio
import logging
from typing import Optional, Dict, Any

import discord

from src.core.config import settings as backend_settings
from src.db import query_one, execute_commit
from src.discord_bot.config import Settings
from src.discord_bot.main import AIChanDiscordBot, setup_tree_error_handler

logger = logging.getLogger("src.discord_bot.manager")


class MultiBotManager:
    """Central singleton managing concurrent Discord bot client instances."""

    def __init__(self) -> None:
        self._bots: Dict[str, AIChanDiscordBot] = {}
        self._tasks: Dict[str, asyncio.Task] = {}
        self._status_cache: Dict[str, Dict[str, Any]] = {}
        self._lock: asyncio.Lock = asyncio.Lock()

    def is_running(self, bot_id: str) -> bool:
        """Checks if a bot runtime task is actively running and not closed."""
        task = self._tasks.get(bot_id)
        bot = self._bots.get(bot_id)
        if task and not task.done() and bot and not bot.is_closed():
            return True
        return False

    def get_bot_instance(self, bot_id: str) -> Optional[AIChanDiscordBot]:
        """Returns the active AIChanDiscordBot instance if available."""
        return self._bots.get(bot_id)

    def get_runtime_status(self, bot_id: str) -> Dict[str, Any]:
        """Retrieves runtime health and metrics for a specific bot."""
        bot = self._bots.get(bot_id)
        task = self._tasks.get(bot_id)
        running = task is not None and not task.done() and bot is not None and not bot.is_closed()
        ready = bot is not None and bot.is_ready()

        db_row = query_one(
            "SELECT status, last_connected_at, last_error_code, last_error_summary FROM discord_bot_configs WHERE id = ?",
            (bot_id,)
        )
        db_status = db_row["status"] if db_row else "NOT_CONFIGURED"

        return {
            "bot_id": bot_id,
            "is_running": running,
            "is_ready": ready,
            "status": "CONNECTED" if ready else (db_status if not running else "CONNECTING"),
            "guild_count": len(bot.guilds) if ready and bot else 0,
            "latency_ms": round(bot.latency * 1000, 2) if ready and bot and bot.latency is not None else None,
            "last_connected_at": db_row.get("last_connected_at") if db_row else None,
            "last_error_code": db_row.get("last_error_code") if db_row else None,
            "last_error_summary": db_row.get("last_error_summary") if db_row else None,
        }

    def _update_db_status(
        self,
        bot_id: str,
        status: str,
        error_code: Optional[str] = None,
        error_summary: Optional[str] = None,
        app_id: Optional[str] = None,
    ) -> None:
        """Atomically updates bot status and sanitized error details in the database."""
        try:
            # Sanitize error summary: never allow secrets/tokens to leak
            clean_summary = error_summary[:250] if error_summary else None
            execute_commit(
                """
                UPDATE discord_bot_configs
                SET status = ?,
                    last_error_code = ?,
                    last_error_summary = ?,
                    discord_application_id = COALESCE(?, discord_application_id),
                    client_id = COALESCE(?, client_id),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (status, error_code, clean_summary, app_id, app_id, bot_id)
            )
        except Exception as exc:
            logger.error("Failed to update status in DB for bot %s: %s", bot_id, exc)

    async def start_bot(
        self,
        bot_id: str,
        user_id: Optional[str] = None,
        token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Starts a specific Discord Bot client with individual exception isolation."""
        async with self._lock:
            # 1. Prevent duplicate active connections for the same bot
            if self.is_running(bot_id):
                return {
                    "success": True,
                    "status": "CONNECTED" if self._bots[bot_id].is_ready() else "CONNECTING",
                    "message": f"Discord Bot '{bot_id}' is already running.",
                    "bot_id": bot_id,
                }

            # 2. Retrieve bot record from database
            bot_cfg = query_one(
                "SELECT * FROM discord_bot_configs WHERE id = ?",
                (bot_id,)
            )
            if not bot_cfg:
                return {
                    "success": False,
                    "status": "NOT_CONFIGURED",
                    "message": f"Bot '{bot_id}' not found.",
                    "bot_id": bot_id,
                }

            # 3. Resolve decrypted token
            raw_token = token
            if not raw_token:
                from src.services.bot_service import BotService
                try:
                    owner_id = user_id or bot_cfg["user_id"]
                    raw_token = BotService.get_decrypted_token(owner_id, bot_id)
                except Exception as exc:
                    self._update_db_status(
                        bot_id,
                        status="INVALID_CREDENTIALS",
                        error_code="TOKEN_DECRYPT_FAILED",
                        error_summary="Failed to decrypt token or token not configured."
                    )
                    return {
                        "success": False,
                        "status": "INVALID_CREDENTIALS",
                        "message": "Không thể giải mã Discord Bot Token. Vui lòng cập nhật token mới.",
                        "bot_id": bot_id,
                    }

            if not raw_token or not raw_token.strip():
                self._update_db_status(bot_id, status="NOT_CONFIGURED")
                return {
                    "success": False,
                    "status": "NOT_CONFIGURED",
                    "message": "Bot chưa có Token Discord.",
                    "bot_id": bot_id,
                }

            # 4. Prepare Settings instance for this bot
            guild_id_int = None
            if bot_cfg.get("guild_id"):
                try:
                    guild_id_int = int(bot_cfg["guild_id"])
                except (ValueError, TypeError):
                    guild_id_int = None

            bot_settings = Settings(
                DISCORD_BOT_TOKEN=raw_token,
                DISCORD_GUILD_ID=guild_id_int,
                DISCORD_BOT_API_BASE_URL=f"http://localhost:{backend_settings.PORT}",
                DISCORD_BOT_API_KEY=backend_settings.SECRET_KEY,
                ENVIRONMENT="development" if backend_settings.DEBUG else "production",
                LOG_LEVEL="INFO",
            )

            # 5. Instantiate AIChanDiscordBot
            bot = AIChanDiscordBot(
                settings=bot_settings,
                bot_config_id=bot_id,
                bot_alias=bot_cfg.get("alias"),
            )
            setup_tree_error_handler(bot)

            # 6. Spawn isolated background task
            self._bots[bot_id] = bot
            self._update_db_status(bot_id, status="CONNECTING")

            task = asyncio.create_task(
                self._run_bot_loop(bot_id, bot, raw_token),
                name=f"discord_bot_{bot_id}",
            )
            self._tasks[bot_id] = task

            logger.info("Launched isolated runtime task for Discord Bot ID: %s (alias: %s)", bot_id, bot_cfg.get("alias"))
            return {
                "success": True,
                "status": "CONNECTING",
                "message": f"Đã khởi động tiến trình kết nối cho Bot '{bot_cfg.get('name') or bot_id}'.",
                "bot_id": bot_id,
            }

    async def _run_bot_loop(self, bot_id: str, bot: AIChanDiscordBot, token: str) -> None:
        """Dedicated execution loop for a bot instance with granular exception isolation."""
        try:
            await bot.start(token)
        except discord.errors.LoginFailure as exc:
            logger.error("Authentication failed for Discord Bot %s: Invalid token.", bot_id)
            self._update_db_status(
                bot_id,
                status="INVALID_CREDENTIALS",
                error_code="LOGIN_FAILURE",
                error_summary="Discord Bot Token is invalid or expired. Check Discord Developer Portal."
            )
        except discord.errors.PrivilegedIntentsRequired as exc:
            logger.error("Privileged Intents missing for Discord Bot %s.", bot_id)
            self._update_db_status(
                bot_id,
                status="ERROR",
                error_code="PRIVILEGED_INTENTS_REQUIRED",
                error_summary="Message Content Intent must be enabled in Discord Developer Portal > Bot > Privileged Gateway Intents."
            )
        except (discord.errors.GatewayNotFound, discord.errors.HTTPException) as exc:
            logger.error("Gateway / Network error for Discord Bot %s: %s", bot_id, exc)
            self._update_db_status(
                bot_id,
                status="DEGRADED",
                error_code="GATEWAY_ERROR",
                error_summary="Unable to reach Discord Gateway or network timeout."
            )
        except asyncio.CancelledError:
            logger.info("Runtime task cancelled for Discord Bot %s.", bot_id)
            self._update_db_status(bot_id, status="DISCONNECTED")
        except Exception as exc:
            logger.error("Unexpected runtime error in Discord Bot %s: %s", bot_id, exc, exc_info=True)
            self._update_db_status(
                bot_id,
                status="ERROR",
                error_code="RUNTIME_ERROR",
                error_summary=str(exc)[:200]
            )
        finally:
            try:
                if not bot.is_closed():
                    await bot.close()
            except Exception as close_exc:
                logger.warning("Error closing bot %s: %s", bot_id, close_exc)

            # Cleanup internal references
            self._bots.pop(bot_id, None)
            self._tasks.pop(bot_id, None)
            logger.info("Lifecycle loop terminated for Discord Bot %s.", bot_id)

    async def stop_bot(self, bot_id: str) -> Dict[str, Any]:
        """Gracefully disconnects and stops a running bot instance."""
        async with self._lock:
            bot = self._bots.get(bot_id)
            task = self._tasks.get(bot_id)

            if not bot and not task:
                self._update_db_status(bot_id, status="DISCONNECTED")
                return {
                    "success": True,
                    "status": "DISCONNECTED",
                    "message": f"Bot '{bot_id}' is not currently running.",
                    "bot_id": bot_id,
                }

            logger.info("Initiating graceful shutdown for Discord Bot %s...", bot_id)
            if bot and not bot.is_closed():
                try:
                    await bot.close()
                except Exception as exc:
                    logger.warning("Warning during bot.close() for %s: %s", bot_id, exc)

            if task and not task.done():
                task.cancel()
                try:
                    await task
                except (asyncio.CancelledError, Exception):
                    pass

            self._bots.pop(bot_id, None)
            self._tasks.pop(bot_id, None)
            self._update_db_status(bot_id, status="DISCONNECTED")

            return {
                "success": True,
                "status": "DISCONNECTED",
                "message": f"Đã ngắt kết nối Bot '{bot_id}' thành công.",
                "bot_id": bot_id,
            }

    def stop_bot_sync(self, bot_id: str) -> None:
        """Synchronous wrapper to terminate a bot from non-async contexts."""
        bot = self._bots.get(bot_id)
        task = self._tasks.get(bot_id)
        if task and not task.done():
            task.cancel()
        if bot and not bot.is_closed():
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.create_task(bot.close())
                else:
                    loop.run_until_complete(bot.close())
            except Exception as exc:
                logger.debug("stop_bot_sync exception ignored: %s", exc)
        self._bots.pop(bot_id, None)
        self._tasks.pop(bot_id, None)
        self._update_db_status(bot_id, status="DISCONNECTED")

    async def restart_bot(self, bot_id: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Restarts a bot by cleanly stopping it and then launching a fresh connection."""
        await self.stop_bot(bot_id)
        await asyncio.sleep(0.5)
        return await self.start_bot(bot_id, user_id=user_id)

    async def start_all_enabled_bots(self) -> int:
        """Queries all enabled bots with configured credentials and starts them asynchronously."""
        from src.services.bot_service import BotService
        # 1. Bootstrap legacy .env bot if present
        try:
            BotService.bootstrap_legacy_env_bot()
        except Exception as exc:
            logger.warning("Legacy .env bot bootstrap notice: %s", exc)

        # 2. Query enabled bots
        enabled_bots = query_one(
            "SELECT id, user_id, name, alias FROM discord_bot_configs WHERE is_enabled = 1 AND token_ciphertext IS NOT NULL"
        )
        started_count = 0
        for bot_row in enabled_bots:
            b_id = bot_row["id"]
            try:
                res = await self.start_bot(b_id, user_id=bot_row["user_id"])
                if res.get("success"):
                    started_count += 1
            except Exception as exc:
                logger.error("Failed to autostart enabled bot %s: %s", b_id, exc)

        logger.info("MultiBotManager started %d enabled Discord Bot(s).", started_count)
        return started_count

    async def stop_all(self) -> None:
        """Stops all active Discord bot instances gracefully during application shutdown."""
        active_ids = list(self._tasks.keys())
        logger.info("MultiBotManager shutting down %d active Discord bot(s)...", len(active_ids))
        for b_id in active_ids:
            try:
                await self.stop_bot(b_id)
            except Exception as exc:
                logger.warning("Error stopping bot %s during shutdown: %s", b_id, exc)


# Global singleton instance
multi_bot_manager = MultiBotManager()
