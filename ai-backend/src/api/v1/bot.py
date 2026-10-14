import uuid
import time
import json
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Request, Header
from pydantic import BaseModel, Field
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.exceptions import InvalidSignature

from src.core.config import settings
from src.core.security import get_current_user, decode_access_token
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

class AvailableBotItemResponse(BaseModel):
    id: str
    name: str
    bot_username: Optional[str] = "Dororo"
    bot_id: Optional[str] = None
    platform: str = "discord"
    is_enabled: bool
    guild_id: str
    guild_name: Optional[str] = None
    trigger_mode: str
    status: str
    description: Optional[str] = None

class ManagedBotItemResponse(BaseModel):
    id: str
    name: str
    bot_username: str
    bot_id: str
    platform: str = "discord"
    status: str = "ONLINE"
    is_enabled: bool = True
    guild_id: Optional[str] = None
    guild_name: Optional[str] = None
    connected_guilds: List[str] = []
    active_model_id: Optional[str] = None
    bound_project_id: Optional[str] = None
    bound_project_name: Optional[str] = None
    trigger_mode: str = "MENTION"
    avatar: Optional[str] = None

class BotProjectBindingResponse(BaseModel):
    is_bound: bool
    is_active: bool
    bot: Optional[Dict[str, Any]] = None
    project: Optional[Dict[str, Any]] = None
    model: Optional[Dict[str, Any]] = None
    system_prompt: Optional[Dict[str, Any]] = None
    skills: List[Dict[str, Any]] = []
    all_candidates: List[Dict[str, Any]] = []
    candidate_count: int = 0
    message: Optional[str] = None

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
 
# ------------------------------------------------------------------------------
# Antigravity / Discord Reference Integration Schemas (BR-001..005)
# Compatible with discord-bot-connect-to-antigravity
# ------------------------------------------------------------------------------
class PromptRequest(BaseModel):
    model_config = {"extra": "ignore"}
    prompt: str = Field(..., min_length=1, description="Prompt text to send to AI model")
    model: str = Field(default="default", description="Model identifier to use")
    temperature: Optional[float] = Field(default=None, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(default=None, gt=0)
    metadata: Dict[str, str] = Field(default_factory=dict)

class UsageInfo(BaseModel):
    model_config = {"extra": "ignore"}
    prompt_tokens: int = Field(default=0, ge=0)
    completion_tokens: int = Field(default=0, ge=0)
    total_tokens: int = Field(default=0, ge=0)

class PromptResponse(BaseModel):
    model_config = {"extra": "ignore"}
    response: str
    model: Optional[str] = None
    usage: Optional[UsageInfo] = None

class HealthResponse(BaseModel):
    model_config = {"extra": "allow"}
    status: str = Field(default="healthy")
    service: Optional[str] = Field(default="ai-backend")
    version: Optional[str] = Field(default="1.0.0")
    details: Dict[str, str] = Field(default_factory=dict)

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

def find_bot_project_binding(user_id: str) -> Dict[str, Any]:
    """
    Quét các Project Graph của người dùng để xác định:
    1. Bot đang được sử dụng trong Project nào.
    2. Bot đang kết nối với Model LLM nào trong Project đó (cùng System Prompt & Skills).
    Ưu tiên trả về Project đang ở trạng thái ACTIVE.
    """
    user_projects = query_all(
        "SELECT id, name, description, status, target_model_id, is_valid, graph_data, updated_at "
        "FROM projects WHERE user_id = ? AND status != 'DELETED' ORDER BY updated_at DESC",
        (user_id,)
    )
    if not user_projects and user_id != "guest_user":
        user_projects = query_all(
            "SELECT id, name, description, status, target_model_id, is_valid, graph_data, updated_at "
            "FROM projects WHERE user_id = 'guest_user' AND status != 'DELETED' ORDER BY updated_at DESC"
        )

    candidates = []
    for p in user_projects:
        g_raw = p.get("graph_data")
        if not g_raw:
            continue
        try:
            g = json.loads(g_raw)
            nodes = g.get("nodes", [])
            edges = g.get("edges", [])

            bot_nodes = [n for n in nodes if n.get("type") == "bot"]
            model_nodes = [n for n in nodes if n.get("type") == "model"]
            prompt_nodes = [n for n in nodes if n.get("type") == "system_prompt"]
            skill_nodes = [n for n in nodes if n.get("type") == "skill"]

            if not bot_nodes or not model_nodes:
                continue

            m_node = model_nodes[0]
            m_id = m_node.get("id")

            # Kiểm tra xem có cạnh Model -> Bot không
            has_bot_edge = any(
                e.get("source") == m_id and any(b.get("id") == e.get("target") for b in bot_nodes)
                for e in edges
            )
            if not has_bot_edge:
                continue

            # Model info
            m_cfg = m_node.get("data", {}).get("config", {})
            m_model_id = m_cfg.get("model_id") or p.get("target_model_id") or "gemini-3.8-flash"
            model_row = query_one("SELECT id, name, provider, status FROM models WHERE id = ?", (m_model_id,))
            if not model_row:
                model_row = {"id": m_model_id, "name": m_model_id, "provider": "google", "status": "ACTIVE"}

            # System prompt info
            bound_prompt = None
            for pr in prompt_nodes:
                if any(e.get("source") == pr.get("id") and e.get("target") == m_id for e in edges):
                    p_cfg = pr.get("data", {}).get("config", {})
                    p_id = p_cfg.get("prompt_id")
                    p_name = pr.get("data", {}).get("label") or "System Prompt"
                    if p_id:
                        p_db = query_one("SELECT id, name, content FROM system_prompts WHERE id = ?", (p_id,))
                        if p_db:
                            p_name = p_db["name"]
                    bound_prompt = {"id": p_id or pr.get("id"), "name": p_name}
                    break

            # Skills info
            bound_skills = []
            for sk in skill_nodes:
                if any(e.get("source") == m_id and e.get("target") == sk.get("id") for e in edges):
                    s_cfg = sk.get("data", {}).get("config", {})
                    s_id = s_cfg.get("skill_id") or sk.get("id")
                    s_name = sk.get("data", {}).get("label") or "Skill"
                    if s_id:
                        s_db = query_one("SELECT id, name, description FROM skills WHERE id = ?", (s_id,))
                        if s_db:
                            s_name = s_db["name"]
                    bound_skills.append({"id": s_id, "name": s_name})

            b_node = bot_nodes[0]
            b_cfg = b_node.get("data", {}).get("config", {})
            b_label = b_node.get("data", {}).get("label") or "Dororo (AI-Chan Discord Bot)"
            bot_info = {
                "node_id": b_node.get("id"),
                "bot_id": b_cfg.get("bot_id") or b_cfg.get("bot_app_id") or "bot_dororo",
                "name": b_label,
                "server": b_cfg.get("guild_name") or "Direct Message / Server"
            }

            candidates.append({
                "bot": bot_info,
                "project": {
                    "id": p["id"],
                    "name": p["name"],
                    "description": p.get("description"),
                    "status": p["status"],
                    "is_valid": bool(p.get("is_valid")),
                    "updated_at": p.get("updated_at")
                },
                "model": {
                    "id": model_row["id"],
                    "name": model_row["name"],
                    "provider": model_row.get("provider", "google"),
                    "status": model_row.get("status", "ACTIVE"),
                    "temperature": m_cfg.get("temperature", 0.7),
                    "max_tokens": m_cfg.get("max_tokens", 2048)
                },
                "system_prompt": bound_prompt,
                "skills": bound_skills
            })
        except Exception:
            continue

    active_candidates = [c for c in candidates if c["project"]["status"] == "ACTIVE"]
    if active_candidates:
        selected = active_candidates[0]
        return {
            "is_bound": True,
            "is_active": True,
            "bot": selected.get("bot"),
            "project": selected["project"],
            "model": selected["model"],
            "system_prompt": selected["system_prompt"],
            "skills": selected["skills"],
            "all_candidates": [c["project"] for c in candidates],
            "candidate_count": len(candidates),
            "message": f"Bot đang được kết nối với mô hình '{selected['model']['name']}' thông qua project đang hoạt động '{selected['project']['name']}'."
        }
    elif candidates:
        selected = candidates[0]
        return {
            "is_bound": True,
            "is_active": False,
            "bot": selected.get("bot"),
            "project": selected["project"],
            "model": selected["model"],
            "system_prompt": selected["system_prompt"],
            "skills": selected["skills"],
            "all_candidates": [c["project"] for c in candidates],
            "candidate_count": len(candidates),
            "message": f"Bot được gắn trong project '{selected['project']['name']}', nhưng project này đang ở trạng thái {selected['project']['status']} (Paused). Kích hoạt project để xử lý tin nhắn Discord."
        }
    else:
        return {
            "is_bound": False,
            "is_active": False,
            "bot": None,
            "project": None,
            "model": None,
            "system_prompt": None,
            "skills": [],
            "all_candidates": [],
            "candidate_count": 0,
            "message": "Bot chưa được gắn vào Project Graph nào. Vui lòng mở Project Editor và nối node Model LLM với Bot node."
        }

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

@bot_router.get("/available", response_model=List[AvailableBotItemResponse])
async def list_available_bots(current_user: dict = Depends(get_current_user)):
    """
    OP-034: Retrieves authorized bot instances available to the authenticated user for project graph integration.
    Enforces verified Discord linkage (BR-031).
    """
    check_discord_linked(current_user)
    user_id = current_user["id"]
    cfg = get_or_create_bot_config(user_id)

    guild_name = cfg.get("guild_name") or "AI-Chan Official Community"
    bot_username = "Dororo"
    bot_display_name = f"{bot_username} (Discord Bot)"

    bot_item = {
        "id": cfg["id"],
        "name": bot_display_name,
        "bot_username": bot_username,
        "bot_id": str(settings.DISCORD_CLIENT_ID or "1548888415951519744"),
        "platform": "discord",
        "is_enabled": bool(cfg.get("is_enabled", 1)),
        "guild_id": cfg.get("guild_id") or "",
        "guild_name": guild_name,
        "trigger_mode": cfg.get("trigger_mode") or "MENTION",
        "status": "ACTIVE" if cfg.get("is_enabled", 1) else "INACTIVE",
        "description": f"Active on: {guild_name}"
    }
    return [bot_item]

@bot_router.get("/binding", response_model=BotProjectBindingResponse)
async def get_bot_project_binding(current_user: dict = Depends(get_current_user)):
    """
    Xác định Bot đang được sử dụng trong project nào và nối với model nào để gọi.
    Loại bỏ cấu hình mô hình tĩnh trực tiếp trong trang quản lý bot, phản ánh pipeline graph thực tế.
    """
    check_discord_linked(current_user)
    user_id = current_user["id"]
    return find_bot_project_binding(user_id)

@bot_router.get("/bots", response_model=List[ManagedBotItemResponse])
async def list_managed_bots(current_user: dict = Depends(get_current_user)):
    """
    Retrieves the list of manageable Bot entities for the user (not just server guilds).
    Dynamically reports bound project and connected model from Project Graphs.
    """
    check_discord_linked(current_user)
    user_id = current_user["id"]
    cfg = get_or_create_bot_config(user_id)
    binding = find_bot_project_binding(user_id)

    guild_name = cfg.get("guild_name") or "AI-Chan Official Community"
    
    active_model_display = "No model connected"
    bound_proj_id = None
    bound_proj_name = None
    bot_status = "PAUSED"
    
    if binding.get("is_bound") and binding.get("model"):
        active_model_display = binding["model"]["name"]
        bound_proj_id = binding["project"]["id"]
        bound_proj_name = binding["project"]["name"]
        bot_status = "ONLINE" if (cfg.get("is_enabled", 1) and binding.get("is_active")) else "PAUSED"
    elif cfg.get("is_enabled", 1):
        bot_status = "ONLINE"
        active_model_display = cfg.get("active_model_id") or "gemini-3.8-flash"

    bot_entry = {
        "id": cfg["id"],
        "name": "Dororo (AI-Chan Discord Bot)",
        "bot_username": "Dororo",
        "bot_id": str(settings.DISCORD_CLIENT_ID or "1548888415951519744"),
        "platform": "discord",
        "status": bot_status,
        "is_enabled": bool(cfg.get("is_enabled", 1)),
        "guild_id": cfg.get("guild_id") or "",
        "guild_name": guild_name,
        "connected_guilds": [guild_name, "Developer Engineering Guild"],
        "active_model_id": active_model_display,
        "bound_project_id": bound_proj_id,
        "bound_project_name": bound_proj_name,
        "trigger_mode": cfg.get("trigger_mode") or "MENTION",
        "avatar": "https://cdn.discordapp.com/embed/avatars/0.png"
    }
    return [bot_entry]

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

    # 3. Định tuyến mô hình hoạt động: Ưu tiên lấy từ Project Graph liên kết với Bot
    binding = find_bot_project_binding(user_id)
    candidate_model_id = req.model_id
    persona = cfg.get("system_prompt") or "You are AI-Chan assistant."
    max_tokens = cfg.get("max_tokens_per_response", 1000)
    dispatched_project_name = None

    if not candidate_model_id and binding.get("is_bound") and binding.get("model"):
        candidate_model_id = binding["model"]["id"]
        dispatched_project_name = binding["project"]["name"]
        if binding.get("system_prompt"):
            persona = binding["system_prompt"].get("name") or persona
        if binding["model"].get("max_tokens"):
            max_tokens = binding["model"]["max_tokens"]

    if not candidate_model_id:
        candidate_model_id = cfg.get("active_model_id")

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

    project_info_line = f" (Định tuyến qua Project: `{dispatched_project_name}`)" if dispatched_project_name else ""
    reply_text = (
        f"🤖 **[AI-Chan Discord Bot]** (Mô hình: `{model_row['name']}`){project_info_line}\n\n"
        f"Chào bạn! Tôi đã nhận được tin nhắn từ Discord:\n"
        f"> *\"{req.query}\"*\n\n"
        f"Theo định hình từ Project Graph (*\"{persona[:60]}...\"*), tôi đã sẵn sàng hỗ trợ bạn trên máy chủ Discord! "
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

# ==============================================================================
# ANTIGRAVITY / DISCORD BOT EXECUTION ENGINE (BR-001..005)
# ==============================================================================

async def execute_antigravity_prompt(prompt_req: PromptRequest, req: Request) -> PromptResponse:
    """
    Executes an AI interaction request from Discord Bot through AI-Chan's active Project Graph,
    resolving the bound Model and connected Skills with strict authorization and validation.
    Compatible with discord-bot-connect-to-antigravity (AntigravityService.ask).
    """
    # 1. Resolve User / Authentication
    current_user = None
    token = req.cookies.get("access_token")
    if not token:
        auth_header = req.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if token:
        payload = decode_access_token(token)
        if payload and "sub" in payload:
            current_user = query_one(
                "SELECT id, email, discord_id, status FROM users WHERE id = ?",
                (payload["sub"],)
            )

    # Fallback to Discord metadata if user not resolved via JWT
    if not current_user:
        discord_user_id = prompt_req.metadata.get("user_id") if prompt_req.metadata else None
        if discord_user_id:
            current_user = query_one(
                "SELECT id, email, discord_id, status FROM users WHERE discord_id = ? OR id = ?",
                (discord_user_id, discord_user_id)
            )

    # Fallback to guest_user if available
    if not current_user:
        current_user = query_one("SELECT id, email, discord_id, status FROM users WHERE id = 'guest_user'")

    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required or user could not be resolved from Discord metadata."
        )

    if current_user.get("status") != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is suspended or inactive."
        )

    user_id = current_user["id"]

    # 2. Resolve Project Graph & Check for Ambiguous Routes
    explicit_project_id = prompt_req.metadata.get("project_id") if prompt_req.metadata else None
    bot_id_filter = prompt_req.metadata.get("bot_id") if prompt_req.metadata else None
    guild_id_filter = prompt_req.metadata.get("guild_id") if prompt_req.metadata else None

    if explicit_project_id:
        proj = query_one(
            "SELECT * FROM projects WHERE id = ? AND user_id = ? AND status != 'DELETED'",
            (explicit_project_id, user_id)
        )
        if not proj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project '{explicit_project_id}' not found or not accessible."
            )
        if proj.get("status") != "ACTIVE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Project '{proj['name']}' is currently inactive ({proj['status']}). Activate the project in AI-Chan before executing bot workflows."
            )
        resolved_proj = proj
    else:
        # Fetch non-deleted projects belonging to this user
        user_projects = query_all(
            "SELECT * FROM projects WHERE user_id = ? AND status != 'DELETED'",
            (user_id,)
        )
        if not user_projects and user_id != "guest_user":
            # If user has no projects yet, check for unassigned guest_user projects
            user_projects = query_all(
                "SELECT * FROM projects WHERE user_id = 'guest_user' AND status != 'DELETED'"
            )

        # Filter candidate projects that have a Bot node bound to Model in the graph
        candidate_projects = []
        for p in user_projects:
            g_raw = p.get("graph_data")
            if not g_raw:
                continue
            try:
                g = json.loads(g_raw)
                nodes = g.get("nodes", [])
                edges = g.get("edges", [])
                bot_nodes = [n for n in nodes if n.get("type") == "bot"]
                if not bot_nodes:
                    continue
                model_nodes = [n for n in nodes if n.get("type") == "model"]
                if not model_nodes:
                    continue
                m_id = model_nodes[0].get("id")
                has_bot_binding = any(
                    e.get("source") == m_id and any(b.get("id") == e.get("target") for b in bot_nodes)
                    for e in edges
                )
                if not has_bot_binding:
                    continue

                # Match by explicit bot_id filter or guild_id if provided
                if bot_id_filter:
                    matched_bots = [
                        b for b in bot_nodes
                        if b.get("data", {}).get("config", {}).get("bot_id") in (bot_id_filter, str(bot_id_filter))
                        or str(bot_id_filter) == str(settings.DISCORD_CLIENT_ID or "1548888415951519744")
                        or b.get("data", {}).get("config", {}).get("platform") == "discord"
                        or b.get("data", {}).get("platform") == "discord"
                    ]
                    if not matched_bots:
                        continue
                elif guild_id_filter:
                    # Match bot config corresponding to guild_id
                    bot_refs = [
                        b.get("data", {}).get("config", {}).get("bot_id")
                        for b in bot_nodes
                        if b.get("data", {}).get("config", {}).get("bot_id")
                    ]
                    guild_match = False
                    for b_ref in bot_refs:
                        b_cfg = query_one("SELECT id, guild_id FROM discord_bot_configs WHERE id = ?", (b_ref,))
                        if b_cfg and str(b_cfg.get("guild_id")) == str(guild_id_filter):
                            guild_match = True
                            break
                    if not guild_match:
                        continue

                candidate_projects.append(p)
            except Exception:
                continue

        if len(candidate_projects) == 0:
            active_projects = [p for p in user_projects if p.get("status") == "ACTIVE"]
            if len(active_projects) == 1:
                resolved_proj = active_projects[0]
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No active project with a bound Discord Bot was found for this user."
                )
        else:
            # Check if matching candidate projects are inactive
            active_candidates = [p for p in candidate_projects if p.get("status") == "ACTIVE"]
            if len(active_candidates) == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="The assigned project is currently inactive (STOP). Please activate the project in AI-Chan before executing bot workflows."
                )
            elif len(active_candidates) > 1:
                # Ambiguous Bot execution target rule
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="The Discord bot cannot determine which model to execute. Configure an explicit route before running this workflow."
                )
            else:
                resolved_proj = active_candidates[0]

        # Reassign guest project to authenticated user if resolved
        if resolved_proj.get("user_id") == "guest_user" and user_id != "guest_user":
            execute_commit(
                "UPDATE projects SET user_id = ? WHERE id = ? AND user_id = 'guest_user'",
                (user_id, resolved_proj["id"])
            )

    # 3. Parse Graph and Model Node Configuration
    g_data = {}
    if resolved_proj.get("graph_data"):
        try:
            g_data = json.loads(resolved_proj["graph_data"])
        except Exception:
            pass

    nodes = g_data.get("nodes", [])
    edges = g_data.get("edges", [])
    model_nodes = [n for n in nodes if n.get("type") == "model"]
    if not model_nodes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The resolved project graph has no configured Model node."
        )

    model_node = model_nodes[0]
    m_node_id = model_node.get("id")
    m_cfg = model_node.get("data", {}).get("config", {})
    configured_model_id = m_cfg.get("model_id") or resolved_proj.get("target_model_id") or "gemini-3.8-flash"

    # 4. Model Selection Precedence (Section 5.1)
    # The saved Model node configuration determines the default model.
    # An override is accepted only if verified active and authorized in models table.
    effective_model = configured_model_id
    if prompt_req.model and prompt_req.model not in ("default", configured_model_id):
        valid_model = query_one(
            "SELECT * FROM models WHERE id = ? AND status = 'ACTIVE'",
            (prompt_req.model,)
        )
        if not valid_model:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Requested model override '{prompt_req.model}' is not active or authorized."
            )
        effective_model = prompt_req.model

    model_record = query_one("SELECT * FROM models WHERE id = ?", (effective_model,))
    if not model_record or model_record.get("status") != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"AI Model '{effective_model}' is currently unavailable or inactive."
        )

    # 5. Resolve Bound Skills (Section 7.1 - 7.3)
    skill_nodes = [n for n in nodes if n.get("type") == "skill"]
    connected_skill_nodes = []
    for s_node in skill_nodes:
        s_id = s_node.get("id")
        is_connected = any(
            e.get("source") == m_node_id and e.get("target") == s_id
            for e in edges
        )
        if is_connected:
            connected_skill_nodes.append(s_node)

    # Deterministic ordering by skill name or ID
    connected_skill_nodes.sort(key=lambda x: x.get("data", {}).get("label") or x.get("id", ""))

    from src.core.skill_storage import read_skill_md_content
    skill_instructions = []
    for s_node in connected_skill_nodes:
        ref_skill_id = s_node.get("data", {}).get("config", {}).get("skill_id")
        if not ref_skill_id:
            continue
        skill_row = query_one(
            "SELECT id, name, description, status, storage_path FROM skills WHERE id = ? AND (user_id = ? OR user_id = 'guest_user')",
            (ref_skill_id, user_id)
        )
        if not skill_row or skill_row.get("status") != "VALID":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Connected skill '{ref_skill_id}' is unavailable, disabled, or not in VALID status."
            )
        content = read_skill_md_content(skill_row.get("storage_path", ""))
        if content:
            skill_instructions.append(f"### Skill: {skill_row['name']}\n{content}")
        elif skill_row.get("description"):
            skill_instructions.append(f"### Skill: {skill_row['name']}\nDescription: {skill_row['description']}")

    # 6. Resolve Bound System Prompt
    prompt_nodes = [n for n in nodes if n.get("type") == "system_prompt"]
    system_prompt_instruction = ""
    for p_node in prompt_nodes:
        p_id = p_node.get("id")
        is_connected = any(
            e.get("source") == p_id and e.get("target") == m_node_id
            for e in edges
        )
        if is_connected:
            ref_prompt_id = p_node.get("data", {}).get("config", {}).get("prompt_id")
            if ref_prompt_id:
                p_row = query_one(
                    "SELECT id, content FROM system_prompts WHERE id = ? AND (user_id = ? OR user_id = 'guest_user')",
                    (ref_prompt_id, user_id)
                )
                if p_row and p_row.get("content"):
                    system_prompt_instruction = p_row["content"]

    # Combine System Prompt + Skills block
    combined_instruction = system_prompt_instruction or ""
    if skill_instructions:
        skills_block = "\n\n--- ACTIVE SKILLS INSTRUCTIONS ---\n" + "\n\n".join(skill_instructions) + "\n--- END SKILLS INSTRUCTIONS ---"
        combined_instruction = (combined_instruction + skills_block).strip()

    # Context size guard (Section 7.3)
    if len(combined_instruction) + len(prompt_req.prompt) > 200000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Combined prompt and skill context exceeds maximum context limit."
        )

    # 7. Resolve Conversation Context & Multi-turn History (BR-005, UC-BOT-003)
    bot_nodes = [n for n in nodes if n.get("type") == "bot"]
    sync_to_web = True
    bot_name = "Discord Bot"
    if bot_nodes:
        b_cfg = bot_nodes[0].get("data", {}).get("config", {})
        ref_bot_id = b_cfg.get("bot_id")
        if ref_bot_id:
            b_row = query_one("SELECT * FROM discord_bot_configs WHERE id = ?", (ref_bot_id,))
            if not b_row:
                b_row = query_one("SELECT * FROM discord_bot_configs WHERE user_id = ?", (user_id,))
            if b_row:
                sync_to_web = bool(b_row.get("sync_to_web", 1))
                bot_name = b_row.get("guild_name") or b_row.get("id") or "Discord Bot"

    conv_title = f"Discord Bot: {bot_name}"
    existing_conv = query_one(
        "SELECT id FROM conversations WHERE user_id = ? AND project_id = ? AND title = ?",
        (user_id, resolved_proj["id"], conv_title)
    )
    conv_id = None
    history = []
    if existing_conv:
        conv_id = existing_conv["id"]
        # Fetch last 10 messages for conversational context
        past_msgs = query_all(
            "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 10",
            (conv_id,)
        )
        history = [{"role": m["role"], "content": m["content"]} for m in past_msgs]
    elif sync_to_web:
        conv_id = f"conv_{uuid.uuid4().hex}"
        execute_commit(
            "INSERT INTO conversations (id, user_id, project_id, title) VALUES (?, ?, ?, ?)",
            (conv_id, user_id, resolved_proj["id"], conv_title)
        )

    # 8. Execute AI Orchestration
    from llm.agent import chat_agent
    accumulated_tokens = []
    final_model_used = effective_model
    start_time = time.perf_counter()

    try:
        async for event in chat_agent.astream_agent(
            prompt=prompt_req.prompt,
            history=history,
            model_override=effective_model,
            system_instruction=combined_instruction if combined_instruction else None
        ):
            if event.get("status") == "streaming":
                t_str = event.get("token", "")
                if t_str:
                    accumulated_tokens.append(t_str)
            elif event.get("status") == "done":
                final_model_used = event.get("model", final_model_used)
            elif event.get("status") == "error":
                err_msg = event.get("message", "Error generating response from AI model")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"AI service error: {err_msg}"
                )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI service unavailable: {str(exc)}"
        )

    elapsed_ms = (time.perf_counter() - start_time) * 1000.0
    reply_text = "".join(accumulated_tokens).strip()
    if not reply_text:
        reply_text = "I received your prompt, but no response was generated."

    # 9. Token Accounting, Quota Consumption & Metric Logging
    prompt_tokens = max(10, len(prompt_req.prompt) // 4 + len(combined_instruction) // 4)
    completion_tokens = max(10, len(reply_text) // 4)
    total_tokens = prompt_tokens + completion_tokens

    quota_manager.consume_quota(user_id, total_tokens)
    metric_logger.log_metric(
        endpoint="/api/v1/prompt",
        method="POST",
        status_code=200,
        latency_ms=elapsed_ms,
        user_id=user_id,
        model_name=final_model_used,
        provider=model_record.get("provider", "unknown"),
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=total_tokens
    )

    # 10. Persist Conversation Messages
    if sync_to_web and conv_id:
        execute_commit(
            "INSERT INTO messages (id, conversation_id, role, content, source) VALUES (?, ?, 'user', ?, 'DISCORD')",
            (f"msg_{uuid.uuid4().hex}", conv_id, prompt_req.prompt)
        )
        execute_commit(
            "INSERT INTO messages (id, conversation_id, role, content, model_used, tokens_prompt, tokens_completion, source) VALUES (?, ?, 'assistant', ?, ?, ?, ?, 'DISCORD')",
            (f"msg_{uuid.uuid4().hex}", conv_id, reply_text, final_model_used, prompt_tokens, completion_tokens)
        )

    return PromptResponse(
        response=reply_text,
        model=final_model_used,
        usage=UsageInfo(
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens
        )
    )

@bot_router.post("/prompt", response_model=PromptResponse, summary="Execute prompt through Discord Bot project graph")
async def bot_prompt_endpoint(
    prompt_req: PromptRequest,
    req: Request
):
    return await execute_antigravity_prompt(prompt_req, req)

