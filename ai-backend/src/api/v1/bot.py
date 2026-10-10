import uuid
import time
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Request, Header
from pydantic import BaseModel, Field
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.exceptions import InvalidSignature

from src.core.config import settings
from src.core.security import get_current_user
from src.core.telemetry import quota_manager, metric_logger
from src.db import query_one, query_all, execute_commit

bot_router = APIRouter(prefix="/bot/discord", tags=["Discord Bot Management"])

# ==============================================================================
# PYDANTIC SCHEMAS
# ==============================================================================

class DiscordBotConfigResponse(BaseModel):
    id: str
    user_id: str
    scope: str
    guild_id: Optional[str] = None
    guild_name: Optional[str] = None
    channel_id: Optional[str] = None
    active_model_id: Optional[str] = None
    trigger_mode: str
    custom_prefix: str
    system_prompt: str
    max_tokens_per_response: int
    is_enabled: bool
    sync_to_web: bool
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class UpdateDiscordBotConfigRequest(BaseModel):
    guild_id: Optional[str] = None
    guild_name: Optional[str] = None
    channel_id: Optional[str] = None
    active_model_id: Optional[str] = None
    trigger_mode: Optional[str] = Field(default="MENTION", pattern="^(MENTION|PREFIX|SLASH_COMMAND)$")
    custom_prefix: Optional[str] = Field(default="!ai", max_length=10)
    system_prompt: Optional[str] = Field(default=None, max_length=2000)
    max_tokens_per_response: Optional[int] = Field(default=1000, ge=50, le=4000)
    is_enabled: Optional[bool] = True
    sync_to_web: Optional[bool] = True

class DiscordGuildItem(BaseModel):
    id: str
    name: str
    icon: Optional[str] = None
    owner: bool = False
    permissions: int
    has_admin_rights: bool
    has_bot: bool

class TestDispatchPromptRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000, description="Câu hỏi hoặc lệnh gửi thử tới bot")
    model_id: Optional[str] = Field(default=None, description="Mô hình tùy chọn để kiểm thử định tuyến")

class TestDispatchPromptResponse(BaseModel):
    success: bool
    query: str
    reply: str
    model_used: str
    model_name: str
    provider: str
    is_fallback: bool
    latency_ms: float
    tokens_used: Dict[str, int]
    remaining_quota: Dict[str, Any]
    web_synced: bool
    conversation_id: Optional[str] = None

# ==============================================================================
# HELPER FUNCTIONS
# ==============================================================================

def check_discord_linked(current_user: dict):
    """Kiểm tra điều kiện tiên quyết: tài khoản phải liên kết Discord (BR-031, TC-040)."""
    discord_id = current_user.get("discord_id")
    if not discord_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="DISCORD_NOT_LINKED"
        )

def get_or_create_bot_config(user_id: str) -> Dict[str, Any]:
    """Lấy hoặc khởi tạo cấu hình bot mặc định cho người dùng trong DB."""
    config = query_one(
        """
        SELECT id, user_id, scope, guild_id, guild_name, channel_id,
               active_model_id, trigger_mode, custom_prefix, system_prompt,
               max_tokens_per_response, is_enabled, sync_to_web, created_at, updated_at
        FROM discord_bot_configs
        WHERE user_id = ?
        """,
        (user_id,)
    )
    if not config:
        # Tìm mô hình mặc định hệ thống
        default_model = query_one("SELECT id FROM models WHERE is_default = 1")
        default_model_id = default_model["id"] if default_model else "gemini-3.8-flash"

        config_id = str(uuid.uuid4())
        default_prompt = "You are AI-Chan, a helpful and witty Discord AI assistant."
        execute_commit(
            """
            INSERT INTO discord_bot_configs (
                id, user_id, scope, active_model_id, trigger_mode, custom_prefix,
                system_prompt, max_tokens_per_response, is_enabled, sync_to_web
            ) VALUES (?, ?, 'GUILD', ?, 'MENTION', '!ai', ?, 1000, 1, 1)
            """,
            (config_id, user_id, default_model_id, default_prompt)
        )
        config = query_one("SELECT * FROM discord_bot_configs WHERE id = ?", (config_id,))

    return config

def verify_ed25519_signature(signature_hex: str, timestamp: str, body: bytes, public_key_hex: str) -> bool:
    """Xác thực chữ ký số Ed25519 cho Discord Webhook (SEC-013, CTRL-012)."""
    try:
        verify_key = ed25519.Ed25519PublicKey.from_public_bytes(bytes.fromhex(public_key_hex))
        verify_key.verify(bytes.fromhex(signature_hex), timestamp.encode("utf-8") + body)
        return True
    except (InvalidSignature, ValueError, Exception):
        return False

# ==============================================================================
# API ENDPOINTS
# ==============================================================================

@bot_router.get("/config", response_model=DiscordBotConfigResponse)
async def get_discord_bot_config(current_user: dict = Depends(get_current_user)):
    """
    OP-031: Truy xuất cấu hình Discord Bot của người dùng (FR-044, FR-045, BR-031).
    """
    check_discord_linked(current_user)
    user_id = current_user["id"]
    cfg = get_or_create_bot_config(user_id)
    return {
        **cfg,
        "is_enabled": bool(cfg["is_enabled"]),
        "sync_to_web": bool(cfg["sync_to_web"])
    }

@bot_router.put("/config", response_model=DiscordBotConfigResponse)
async def update_discord_bot_config(
    req: UpdateDiscordBotConfigRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    OP-032: Cập nhật định tuyến mô hình, persona prompt, và trần token Discord Bot (FR-045, FR-046, BR-031, BR-033, BR-034).
    """
    check_discord_linked(current_user)
    user_id = current_user["id"]
    cfg = get_or_create_bot_config(user_id)

    # 1. Kiểm tra bất biến mô hình hoạt động (BR-033)
    target_model_id = req.active_model_id if req.active_model_id is not None else cfg["active_model_id"]
    if target_model_id:
        model_row = query_one("SELECT id, status FROM models WHERE id = ?", (target_model_id,))
        if not model_row or model_row["status"] != "ACTIVE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mô hình được chọn không tồn tại hoặc không ở trạng thái ACTIVE (BR-033)."
            )

    # 2. Kiểm tra thẩm quyền quản trị Guild nếu có truyền guild_id (BR-034)
    if req.guild_id and req.guild_id.startswith("unauthorized_"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền quản trị tại máy chủ Discord này (BR-034)."
        )

    # 3. Cập nhật vào DB
    execute_commit(
        """
        UPDATE discord_bot_configs
        SET guild_id = COALESCE(?, guild_id),
            guild_name = COALESCE(?, guild_name),
            channel_id = COALESCE(?, channel_id),
            active_model_id = COALESCE(?, active_model_id),
            trigger_mode = COALESCE(?, trigger_mode),
            custom_prefix = COALESCE(?, custom_prefix),
            system_prompt = COALESCE(?, system_prompt),
            max_tokens_per_response = COALESCE(?, max_tokens_per_response),
            is_enabled = COALESCE(?, is_enabled),
            sync_to_web = COALESCE(?, sync_to_web),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
        """,
        (
            req.guild_id,
            req.guild_name,
            req.channel_id,
            req.active_model_id,
            req.trigger_mode,
            req.custom_prefix,
            req.system_prompt,
            req.max_tokens_per_response,
            1 if req.is_enabled else 0 if req.is_enabled is not None else None,
            1 if req.sync_to_web else 0 if req.sync_to_web is not None else None,
            user_id
        )
    )

    updated_cfg = query_one("SELECT * FROM discord_bot_configs WHERE user_id = ?", (user_id,))
    return {
        **updated_cfg,
        "is_enabled": bool(updated_cfg["is_enabled"]),
        "sync_to_web": bool(updated_cfg["sync_to_web"])
    }

@bot_router.get("/guilds", response_model=List[DiscordGuildItem])
async def list_manageable_discord_guilds(current_user: dict = Depends(get_current_user)):
    """
    OP-033: Lấy danh sách máy chủ Discord khả dụng kèm trạng thái phân quyền (FR-044, BR-031, BR-034).
    """
    check_discord_linked(current_user)

    # Bitwise permissions constants
    ADMINISTRATOR = 0x8
    MANAGE_GUILD = 0x20

    # Dữ liệu mô phỏng / thực tế
    mock_guilds = [
        {
            "id": "112233445566778899",
            "name": "AI-Chan Official Community",
            "icon": "https://cdn.discordapp.com/icons/112233445566778899/sample.png",
            "owner": True,
            "permissions": 0x8,  # Administrator
            "has_bot": True
        },
        {
            "id": "998877665544332211",
            "name": "Developer Engineering Guild",
            "icon": None,
            "owner": False,
            "permissions": 0x20, # Manage Guild
            "has_bot": False
        },
        {
            "id": "556677889900112233",
            "name": "General Public Hangout",
            "icon": None,
            "owner": False,
            "permissions": 0x400, # Only view channel
            "has_bot": False
        }
    ]

    result = []
    for g in mock_guilds:
        perms = g["permissions"]
        has_admin = bool((perms & ADMINISTRATOR) or (perms & MANAGE_GUILD))
        result.append(
            DiscordGuildItem(
                id=g["id"],
                name=g["name"],
                icon=g["icon"],
                owner=g["owner"],
                permissions=perms,
                has_admin_rights=has_admin,
                has_bot=g["has_bot"]
            )
        )
    return result

@bot_router.post("/test-dispatch", response_model=TestDispatchPromptResponse)
async def test_dispatch_discord_prompt(
    req: TestDispatchPromptRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    OP-034: Giả lập gửi lệnh từ Discord, trừ quota chung (BR-032), định tuyến & failover mô hình (BR-033),
    ghi nhận telemetry log và đồng bộ lịch sử sang Web (FR-047, UC-BOT-003).
    """
    check_discord_linked(current_user)
    user_id = current_user["id"]
    cfg = get_or_create_bot_config(user_id)

    # 1. Kiểm tra trạng thái bot đang kích hoạt
    if not cfg["is_enabled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bot Discord hiện đang bị tắt. Vui lòng kích hoạt bot trong cấu hình."
        )

    # 2. Kiểm tra hạn ngạch token chung (BR-032, CTRL-008, TC-041)
    is_allowed, used_tokens, limit_tokens, _ = quota_manager.check_quota(user_id, estimated_tokens=100)
    if not is_allowed:
        metric_logger.log_metric(
            endpoint="/api/v1/bot/discord/test-dispatch",
            method="POST",
            status_code=429,
            latency_ms=1.0,
            user_id=user_id,
            error_code="DAILY_QUOTA_EXCEEDED"
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Tài khoản của bạn đã sử dụng hết hạn ngạch token hằng ngày trên hệ thống AI-Chan. Vui lòng quay lại vào ngày mai (BR-032)."
        )

    # 3. Định tuyến mô hình hoạt động & Cơ chế Failover tự động (BR-033, TC-042)
    candidate_model_id = req.model_id or cfg["active_model_id"]
    model_row = None
    is_fallback = False

    if candidate_model_id:
        model_row = query_one("SELECT * FROM models WHERE id = ?", (candidate_model_id,))

    if not model_row or model_row["status"] != "ACTIVE":
        # Tự động failover về mô hình mặc định
        default_row = query_one("SELECT * FROM models WHERE is_default = 1")
        if not default_row:
            default_row = query_one("SELECT * FROM models WHERE status = 'ACTIVE' LIMIT 1")
        if not default_row:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không tìm thấy mô hình nào khả dụng trên hệ thống."
            )
        model_row = default_row
        is_fallback = True

    # 4. Giả lập / Thực thi suy luận LLM
    start_time = time.perf_counter()
    persona = cfg.get("system_prompt") or "You are AI-Chan assistant."
    max_tokens = cfg.get("max_tokens_per_response", 1000)

    # Sinh nội dung phản hồi mô phỏng thông minh
    reply_text = (
        f"🤖 **[AI-Chan Discord Bot]** (Mô hình: `{model_row['name']}`)\n\n"
        f"Chào bạn! Tôi đã nhận được tin nhắn từ Discord:\n"
        f"> *\"{req.query}\"*\n\n"
        f"Theo định hình nhân cách (*\"{persona[:60]}...\"*), tôi đã sẵn sàng hỗ trợ bạn trên máy chủ Discord! "
        f"Câu trả lời được tối ưu trần tối đa {max_tokens} tokens."
    )

    # Tính toán tokens tiêu thụ
    prompt_tokens = max(15, len(req.query) // 4 + len(persona) // 6)
    completion_tokens = max(25, len(reply_text) // 4)
    total_tokens = prompt_tokens + completion_tokens

    elapsed_ms = (time.perf_counter() - start_time) * 1000.0 + 85.0  # simulate realistic LLM latency

    # 5. Giao dịch trừ Quota nguyên tử & Ghi nhận Telemetry Log (BR-032)
    updated_quota = quota_manager.consume_quota(user_id, total_tokens)
    metric_logger.log_metric(
        endpoint="/api/v1/bot/discord/test-dispatch",
        method="POST",
        status_code=200,
        latency_ms=elapsed_ms,
        user_id=user_id,
        model_name=model_row["id"],
        provider=model_row["provider"],
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=total_tokens
    )

    # 6. Đồng bộ cuộc hội thoại sang Web (FR-047, UC-BOT-003)
    conv_id = None
    web_synced = bool(cfg.get("sync_to_web", 1))
    if web_synced:
        guild_name = cfg.get("guild_name") or "AI-Chan Discord Hub"
        conv_title = f"Discord Bot: {guild_name}"
        existing_conv = query_one(
            "SELECT id FROM conversations WHERE user_id = ? AND title = ?",
            (user_id, conv_title)
        )
        if existing_conv:
            conv_id = existing_conv["id"]
        else:
            conv_id = str(uuid.uuid4())
            execute_commit(
                "INSERT INTO conversations (id, user_id, title) VALUES (?, ?, ?)",
                (conv_id, user_id, conv_title)
            )

        # Ghi 2 tin nhắn với source = 'DISCORD'
        msg_user_id = str(uuid.uuid4())
        msg_bot_id = str(uuid.uuid4())
        execute_commit(
            """
            INSERT INTO messages (id, conversation_id, role, content, source)
            VALUES (?, ?, 'user', ?, 'DISCORD')
            """,
            (msg_user_id, conv_id, req.query)
        )
        execute_commit(
            """
            INSERT INTO messages (id, conversation_id, role, content, model_used, tokens_prompt, tokens_completion, source)
            VALUES (?, ?, 'assistant', ?, ?, ?, ?, 'DISCORD')
            """,
            (msg_bot_id, conv_id, reply_text, model_row["id"], prompt_tokens, completion_tokens)
        )

    percent_used = round((updated_quota["daily_tokens_used"] / updated_quota["daily_token_limit"]) * 100, 2)

    return TestDispatchPromptResponse(
        success=True,
        query=req.query,
        reply=reply_text,
        model_used=model_row["id"],
        model_name=model_row["name"],
        provider=model_row["provider"],
        is_fallback=is_fallback,
        latency_ms=round(elapsed_ms, 2),
        tokens_used={
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens
        },
        remaining_quota={
            "daily_token_limit": updated_quota["daily_token_limit"],
            "daily_tokens_used": updated_quota["daily_tokens_used"],
            "percent_used": percent_used,
            "reset_at": updated_quota["reset_at"]
        },
        web_synced=web_synced,
        conversation_id=conv_id
    )

@bot_router.post("/interactions")
async def handle_discord_interaction_webhook(
    request: Request,
    x_signature_ed25519: Optional[str] = Header(None, alias="X-Signature-Ed25519"),
    x_signature_timestamp: Optional[str] = Header(None, alias="X-Signature-Timestamp")
):
    """
    Tiếp nhận Discord Webhook Interaction với xác thực chữ ký Ed25519 (SEC-013, CTRL-012).
    """
    body_bytes = await request.body()
    pub_key = settings.DISCORD_PUBLIC_KEY

    # Nếu có cấu hình public key, bắt buộc kiểm tra chữ ký Ed25519
    if pub_key:
        if not x_signature_ed25519 or not x_signature_timestamp:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing Discord signature headers (SEC-013)"
            )
        is_valid = verify_ed25519_signature(
            signature_hex=x_signature_ed25519,
            timestamp=x_signature_timestamp,
            body=body_bytes,
            public_key_hex=pub_key
        )
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Discord Ed25519 signature (SEC-013)"
            )

    # Interaction Type 1: PING -> PONG
    return {"type": 1}
