"""API Router for Multi-Discord Bot Registry and Lifecycle Management (BR-031..034, SEC-008, SEC-013).

Provides secure endpoints for creating, listing, updating, deleting, connection testing,
and linking bots to AI-Chan Projects with zero plaintext token leakage.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field

from src.core.security import get_current_user
from src.services.bot_service import (
    BotService,
    CreateBotRequest,
    UpdateBotRequest,
    BotResponse,
    LinkBotProjectRequest,
    TestConnectionResponse,
)
from src.discord_bot.manager import multi_bot_manager
from src.api.v1.bot import check_discord_linked

bots_router = APIRouter(prefix="/bots", tags=["Multi-Discord Bot Registry"])


class LinkProjectToBotRequest(BaseModel):
    bot_id: Optional[str] = Field(default=None, description="ID của Bot muốn liên kết với Project, hoặc null để gỡ liên kết")


@bots_router.get("", response_model=List[BotResponse], summary="List all Discord bots owned by authenticated user")
async def list_bots(current_user: dict = Depends(get_current_user)):
    """Retrieves all registered Discord bots with runtime statuses and project assignments (safe metadata only)."""
    check_discord_linked(current_user)
    user_id = current_user["id"]
    return BotService.list_bots(user_id)


@bots_router.post("", response_model=BotResponse, status_code=status.HTTP_201_CREATED, summary="Register a new Discord Bot")
async def create_bot(
    req: CreateBotRequest,
    current_user: dict = Depends(get_current_user)
):
    """Registers a new Discord Bot with encrypted credentials and initiates registry record."""
    check_discord_linked(current_user)
    user_id = current_user["id"]
    return BotService.create_bot(user_id, req)


@bots_router.get("/{bot_id}", response_model=BotResponse, summary="Get bot details (no secret token returned)")
async def get_bot(
    bot_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Retrieves details of a single bot configuration without revealing the plaintext token."""
    check_discord_linked(current_user)
    user_id = current_user["id"]
    return BotService.get_bot(user_id, bot_id)


@bots_router.patch("/{bot_id}", response_model=BotResponse, summary="Update bot metadata or replace token")
async def update_bot(
    bot_id: str,
    req: UpdateBotRequest,
    current_user: dict = Depends(get_current_user)
):
    """Updates bot configuration. If token is omitted or empty, preserves the existing encrypted credential."""
    check_discord_linked(current_user)
    user_id = current_user["id"]
    return BotService.update_bot(user_id, bot_id, req)


@bots_router.delete("/{bot_id}", summary="Delete a bot configuration and terminate its runtime")
async def delete_bot(
    bot_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Stops any running connection, cleans up project linkage, and deletes the bot registry entry."""
    check_discord_linked(current_user)
    user_id = current_user["id"]
    return BotService.delete_bot(user_id, bot_id)


@bots_router.post("/{bot_id}/test-connection", response_model=TestConnectionResponse, summary="Test bot token against Discord REST API")
async def test_bot_connection(
    bot_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Verifies token validity against Discord API without launching a long-lived Gateway connection."""
    check_discord_linked(current_user)
    user_id = current_user["id"]
    return await BotService.test_bot_credentials(user_id, bot_id)


@bots_router.post("/{bot_id}/connect", summary="Connect and launch Discord bot Gateway runtime")
async def connect_bot(
    bot_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Initiates an isolated Discord Gateway connection for this bot."""
    check_discord_linked(current_user)
    user_id = current_user["id"]
    res = await multi_bot_manager.start_bot(bot_id, user_id=user_id)
    if not res.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=res.get("message", "Failed to start bot connection.")
        )
    return res


@bots_router.post("/{bot_id}/disconnect", summary="Disconnect Discord bot Gateway runtime")
async def disconnect_bot(
    bot_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Gracefully terminates the Discord Gateway connection for this bot."""
    check_discord_linked(current_user)
    return await multi_bot_manager.stop_bot(bot_id)


@bots_router.post("/{bot_id}/reconnect", summary="Restart Discord bot Gateway runtime")
async def reconnect_bot(
    bot_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Restarts the Discord Gateway connection for this bot."""
    check_discord_linked(current_user)
    user_id = current_user["id"]
    res = await multi_bot_manager.restart_bot(bot_id, user_id=user_id)
    if not res.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=res.get("message", "Failed to reconnect bot.")
        )
    return res


@bots_router.put("/{bot_id}/project", response_model=BotResponse, summary="Link or unlink bot to a Project (1:1 constraint)")
async def link_bot_to_project(
    bot_id: str,
    req: LinkBotProjectRequest,
    current_user: dict = Depends(get_current_user)
):
    """Assigns bot to a Project, unbinding any previously bound bot to preserve strict 1:1 cardinality."""
    check_discord_linked(current_user)
    user_id = current_user["id"]
    return BotService.link_project(user_id, bot_id, req.project_id)
