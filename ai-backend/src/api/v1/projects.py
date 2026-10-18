import re
import json
import uuid
import asyncio
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from src.core.config import settings
from src.core.security import decode_access_token, get_current_user
from src.db import get_db_connection, query_one, query_all, execute_commit
from src.api.v1.models import check_provider_api_key

projects_router = APIRouter(prefix="/projects", tags=["Project Management"])

# ==============================================================================
# 1. PYDANTIC SCHEMAS (CONTRACT SPECIFICATIONS)
# ==============================================================================

class ProjectCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Tên project (1-100 ký tự)")
    description: Optional[str] = Field(None, max_length=500, description="Mô tả project (tối đa 500 ký tự)")

class ProjectUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Tên project mới")
    description: Optional[str] = Field(None, max_length=500, description="Mô tả project mới")

class GraphSaveRequest(BaseModel):
    viewport: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Tọa độ và zoom của canvas")
    nodes: List[Dict[str, Any]] = Field(..., description="Danh sách các node trên canvas")
    edges: List[Dict[str, Any]] = Field(..., description="Danh sách các cạnh kết nối giữa các node")

class ProjectChatRequest(BaseModel):
    message: str = Field(default="", description="Nội dung câu hỏi của người dùng")
    conversation_id: Optional[str] = Field(None, description="Định danh phiên hội thoại liên kết (tùy chọn)")
    attachments: Optional[List[str]] = Field(default=None, description="Danh sách attachment_id đính kèm cho lượt chat này")


# ==============================================================================
# 2. GRAPH VALIDATION ENGINE
# ==============================================================================

def validate_project_graph(graph_data: Dict[str, Any], user_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Xác thực tính toàn vẹn của cấu trúc đồ thị Graph (PRJ-BR-004, PRJ-BR-005, PRJ-BR-006, BR-SPN-001..007):
    1. Đủ các Node bắt buộc: web_input, model, output (mỗi loại đúng 1 node).
    2. Node tùy chọn: system_prompt (tối đa 1 node, DEC-SPN-02).
       Tổng số node hợp lệ: 3 (legacy) hoặc 4 (kèm system_prompt).
    3. Cạnh nối:
       - Bắt buộc: web_input -> model và model -> output.
       - Nếu có system_prompt: bắt buộc có cạnh system_prompt -> model.
       - Cấm cạnh nối tắt (input -> output), cấm chu trình, cấm nối prompt -> output.
       - Tổng số cạnh hợp lệ: 2 (nếu 3 node) hoặc 3 (nếu 4 node).
    4. Kiểm tra cấu hình System Prompt Node:
       - prompt_id phải tồn tại trong data.config.
       - prompt_id phải tồn tại trong bảng system_prompts trong DB (và thuộc user nếu user_id được cung cấp).
    5. Kiểm tra tham số: 10 <= max_words <= 4000.
    6. Kiểm tra model_id: Tồn tại trong DB models, status == 'ACTIVE', provider có API Key.
    7. Kiểm tra tham số model: temperature (0.0 - 2.0), max_tokens hợp lệ.
    """
    errors: List[str] = []
    nodes = graph_data.get("nodes", [])
    edges = graph_data.get("edges", [])

    # Phân loại các node
    node_by_type: Dict[str, List[Dict[str, Any]]] = {}
    node_by_id: Dict[str, Dict[str, Any]] = {}
    for n in nodes:
        ntype = n.get("type")
        nid = n.get("id")
        if nid:
            node_by_id[nid] = n
        if ntype:
            if ntype not in node_by_type:
                node_by_type[ntype] = []
            node_by_type[ntype].append(n)

    # 1. Kiểm tra các node bắt buộc
    input_nodes = node_by_type.get("web_input", [])
    model_nodes = node_by_type.get("model", [])
    output_nodes = node_by_type.get("output", [])
    prompt_nodes = node_by_type.get("system_prompt", [])

    if len(input_nodes) == 0:
        errors.append("Graph thiếu Web Input Node.")
    elif len(input_nodes) > 1:
        errors.append(f"Mỗi project chỉ được phép có 1 Web Input Node (hiện tại có {len(input_nodes)}).")

    if len(model_nodes) == 0:
        errors.append("Graph thiếu Model Node.")
    elif len(model_nodes) > 1:
        errors.append(f"Mỗi project chỉ được phép có 1 Model Node (hiện tại có {len(model_nodes)}).")

    if len(output_nodes) == 0:
        errors.append("Graph thiếu Output Node.")
    elif len(output_nodes) > 1:
        errors.append(f"Mỗi project chỉ được phép có 1 Output Node (hiện tại có {len(output_nodes)}).")

    # Kiểm tra số lượng system_prompt (DEC-SPN-02: 0..1)
    if len(prompt_nodes) > 1:
        errors.append(f"Mỗi Model chỉ được kết nối tối đa 1 System Prompt Node trong MVP (hiện tại có {len(prompt_nodes)}).")

    bot_nodes = node_by_type.get("bot", [])
    if len(bot_nodes) > 1:
        errors.append("This model can be connected to only one bot. Remove the existing bot connection before selecting another.")

    skill_nodes = node_by_type.get("skill", [])
    tool_nodes = node_by_type.get("tool", [])
    rule_nodes = node_by_type.get("rule", [])

    # Kiểm tra loại node không hợp lệ
    valid_types = {"web_input", "model", "output", "system_prompt", "bot", "skill", "tool", "rule"}
    for ntype in node_by_type.keys():
        if ntype not in valid_types:
            errors.append(f"Phát hiện loại node không được hỗ trợ: '{ntype}'.")

    # Kiểm tra tính duy nhất của node IDs
    node_ids = [n.get("id") for n in nodes if n.get("id")]
    if len(node_ids) != len(set(node_ids)):
        errors.append("Phát hiện ID node bị trùng lặp trong graph.")

    # Kiểm tra tính duy nhất của edge IDs
    edge_ids = [e.get("id") for e in edges if e.get("id")]
    if len(edge_ids) != len(set(edge_ids)):
        errors.append("Phát hiện ID edge bị trùng lặp trong graph.")

    input_node = input_nodes[0] if input_nodes else None
    model_node = model_nodes[0] if model_nodes else None
    output_node = output_nodes[0] if output_nodes else None
    prompt_node = prompt_nodes[0] if prompt_nodes else None
    bot_node = bot_nodes[0] if bot_nodes else None

    # 2. Kiểm tra các Edge và ràng buộc kết nối
    has_prompt = prompt_node is not None
    has_bot = bot_node is not None
    expected_edge_count = 2 + (1 if has_prompt else 0) + (1 if has_bot else 0) + len(skill_nodes) + len(tool_nodes) + len(rule_nodes)
    if len(edges) != expected_edge_count:
        errors.append(f"Graph yêu cầu chính xác {expected_edge_count} cạnh kết nối hợp lệ (hiện tại có {len(edges)} cạnh).")

    # Kiểm tra duplicate edges
    edge_pairs = [(e.get("source"), e.get("target")) for e in edges]
    if len(edge_pairs) != len(set(edge_pairs)):
        errors.append("Duplicate connections are rejected.")

    input_to_model_edge = False
    model_to_output_edge = False
    prompt_to_model_edge = False
    model_to_bot_edge = False
    connected_skill_ids: List[str] = []
    connected_tool_ids: List[str] = []
    connected_rule_ids: List[str] = []

    if input_node and model_node and output_node:
        in_id = input_node.get("id")
        model_id_node = model_node.get("id")
        out_id = output_node.get("id")
        prompt_id_node = prompt_node.get("id") if prompt_node else None
        bot_id_node = bot_node.get("id") if bot_node else None
        skill_id_nodes = {s.get("id"): s for s in skill_nodes if s.get("id")}
        tool_id_nodes = {t.get("id"): t for t in tool_nodes if t.get("id")}
        rule_id_nodes = {r.get("id"): r for r in rule_nodes if r.get("id")}

        for e in edges:
            src = e.get("source")
            tgt = e.get("target")
            src_node = node_by_id.get(src)
            tgt_node = node_by_id.get(tgt)
            src_type = src_node.get("type") if src_node else None
            tgt_type = tgt_node.get("type") if tgt_node else None

            # Kiểm tra hướng và loại hợp lệ
            if src == in_id and tgt == model_id_node:
                input_to_model_edge = True
            elif src == model_id_node and tgt == out_id:
                model_to_output_edge = True
            elif prompt_id_node and src == prompt_id_node and tgt == model_id_node:
                prompt_to_model_edge = True
            elif bot_id_node and src == model_id_node and tgt == bot_id_node:
                model_to_bot_edge = True
            elif src == model_id_node and tgt in skill_id_nodes:
                connected_skill_ids.append(tgt)
            elif src == model_id_node and tgt in tool_id_nodes:
                connected_tool_ids.append(tgt)
            elif src in rule_id_nodes and tgt == model_id_node:
                connected_rule_ids.append(src)
            elif src == model_id_node and tgt in rule_id_nodes:
                errors.append("Invalid reverse connection: Model cannot connect to Rule. Direction must be Rule -> Model.")
            elif src in rule_id_nodes and tgt in rule_id_nodes:
                errors.append("Invalid connection: Rule cannot connect to another Rule.")
            elif src in rule_id_nodes and tgt != model_id_node:
                errors.append("Invalid connection: Rule can only connect to Model Node.")
            elif src == bot_id_node and tgt == model_id_node:
                errors.append("Invalid reverse connection: Bot cannot connect to Model. Direction must be Model -> Bot.")
            elif tgt == model_id_node and src in skill_id_nodes:
                errors.append("Invalid reverse connection: Skill cannot connect to Model. Direction must be Model -> Skill.")
            elif src in tool_id_nodes and tgt == model_id_node:
                errors.append("Invalid reverse connection: Tool cannot connect to Model. Direction must be Model -> Tool.")
            elif src == in_id and tgt == out_id:
                errors.append("Phát hiện cạnh nối tắt trực tiếp từ Web Input sang Output (không được phép bỏ qua Model Node).")
            elif tgt == in_id:
                errors.append("Phát hiện cạnh nối ngược về Web Input Node (không được phép tạo chu trình hoặc nối ngược).")
            elif prompt_id_node and src == prompt_id_node and tgt == out_id:
                errors.append("Phát hiện cạnh nối từ System Prompt sang Output Node (không hợp lệ).")
            elif prompt_id_node and tgt == prompt_id_node:
                errors.append("Phát hiện cạnh nối đi vào System Prompt Node (System Prompt Node chỉ có cổng xuất).")
            else:
                errors.append(f"Kết nối không hợp lệ từ '{src_type}' sang '{tgt_type}'.")

        if not input_to_model_edge:
            errors.append("Thiếu kết nối có hướng từ Web Input Node sang Model Node.")
        if not model_to_output_edge:
            errors.append("Thiếu kết nối có hướng từ Model Node sang Output Node.")
        if has_prompt and not prompt_to_model_edge:
            errors.append("System Prompt Node chưa được kết nối vào Model Node.")
        if has_bot and not model_to_bot_edge:
            errors.append("Bot Node chưa được kết nối từ Model Node.")
        for sid, snode in skill_id_nodes.items():
            if sid not in connected_skill_ids:
                errors.append(f"Skill Node '{snode.get('data', {}).get('label', sid)}' chưa được kết nối từ Model Node.")
        for tid, tnode in tool_id_nodes.items():
            if tid not in connected_tool_ids:
                errors.append(f"Tool Node '{tnode.get('data', {}).get('label', tid)}' chưa được kết nối từ Model Node.")
        for rid, rnode in rule_id_nodes.items():
            if rid not in connected_rule_ids:
                errors.append(f"Rule Node '{rnode.get('data', {}).get('label', rid)}' chưa được kết nối vào Model Node.")

    # 3. Kiểm tra System Prompt Node cấu hình & tồn tại trong DB
    target_prompt_id = None
    if prompt_node:
        p_cfg = prompt_node.get("data", {}).get("config", {})
        target_prompt_id = p_cfg.get("prompt_id")
        if not target_prompt_id:
            errors.append("System Prompt Node chưa được liên kết với prompt nào (prompt_id bị rỗng).")
        else:
            if user_id:
                p_rec = query_one(
                    "SELECT id, name FROM system_prompts WHERE id = ? AND (user_id = ? OR user_id = 'guest_user')",
                    (target_prompt_id, user_id)
                )
            else:
                p_rec = query_one("SELECT id, name FROM system_prompts WHERE id = ?", (target_prompt_id,))
            if not p_rec:
                errors.append(f"System Prompt tham chiếu '{target_prompt_id}' không tồn tại hoặc đã bị xóa khỏi thư viện.")

    # 3.1 Kiểm tra Bot Node cấu hình & phân quyền Discord
    target_bot_id = None
    if bot_node:
        b_cfg = bot_node.get("data", {}).get("config", {})
        target_bot_id = b_cfg.get("bot_id")
        if not target_bot_id:
            errors.append("Bot Node chưa được gắn bot_id hợp lệ.")
        else:
            if user_id and user_id != 'guest_user':
                user_rec = query_one("SELECT id, discord_id FROM users WHERE id = ?", (user_id,))
                if not user_rec or not user_rec.get("discord_id"):
                    errors.append("Tài khoản chưa liên kết Discord để sử dụng Bot Node trong project.")
                bot_rec = query_one(
                    "SELECT id, is_enabled FROM discord_bot_configs WHERE (id = ? OR user_id = ?) AND user_id = ?",
                    (target_bot_id, user_id, user_id)
                )
                if not bot_rec and (
                    target_bot_id == str(settings.DISCORD_CLIENT_ID or "1548888415951519744")
                    or str(target_bot_id).startswith("bot_")
                ):
                    bot_rec = query_one("SELECT id, is_enabled FROM discord_bot_configs WHERE user_id = ?", (user_id,))
                if not bot_rec:
                    errors.append(f"Bot cấu hình '{target_bot_id}' không tồn tại hoặc bạn không có quyền truy cập.")
            else:
                bot_rec = query_one("SELECT id, is_enabled FROM discord_bot_configs WHERE id = ?", (target_bot_id,))
                if not bot_rec:
                    bot_rec = query_one("SELECT id, is_enabled FROM discord_bot_configs LIMIT 1")
                if not bot_rec:
                    errors.append(f"Bot cấu hình '{target_bot_id}' không tồn tại.")

    # 3.2 Kiểm tra Skill Nodes cấu hình & trạng thái VALID
    valid_skill_ids: List[str] = []
    seen_skill_ids: set = set()
    for s_node in skill_nodes:
        s_cfg = s_node.get("data", {}).get("config", {})
        ref_skill_id = s_cfg.get("skill_id")
        if not ref_skill_id:
            errors.append("Skill Node chưa được gắn skill_id hợp lệ.")
            continue
        if ref_skill_id in seen_skill_ids:
            errors.append(f"Phát hiện kỹ năng trùng lặp '{ref_skill_id}' trong cùng một Model.")
        seen_skill_ids.add(ref_skill_id)

        if user_id and user_id != 'guest_user':
            s_rec = query_one(
                "SELECT id, name, status FROM skills WHERE id = ? AND (user_id = ? OR user_id = 'guest_user')",
                (ref_skill_id, user_id)
            )
        else:
            s_rec = query_one("SELECT id, name, status FROM skills WHERE id = ?", (ref_skill_id,))
        if not s_rec:
            errors.append(f"Kỹ năng tham chiếu '{ref_skill_id}' không tồn tại hoặc đã bị xóa khỏi thư viện.")
        elif s_rec.get("status") != "VALID":
            errors.append(f"Kỹ năng '{s_rec.get('name', ref_skill_id)}' không ở trạng thái VALID (hiện tại: {s_rec.get('status')}).")
        else:
            valid_skill_ids.append(ref_skill_id)

    # 3.3 Kiểm tra Tool Nodes cấu hình & tồn tại trong DB
    valid_tool_ids: List[str] = []
    seen_tool_ids: set = set()
    for t_node in tool_nodes:
        t_cfg = t_node.get("data", {}).get("config", {})
        ref_tool_id = t_cfg.get("tool_id")
        if not ref_tool_id:
            errors.append("Tool Node chưa được gắn tool_id hợp lệ.")
            continue
        if ref_tool_id in seen_tool_ids:
            errors.append(f"Phát hiện công cụ trùng lặp '{ref_tool_id}' trong cùng một Model.")
        seen_tool_ids.add(ref_tool_id)

        t_rec = query_one("SELECT id, name, status FROM tools WHERE id = ?", (ref_tool_id,))
        if not t_rec:
            errors.append(f"Công cụ tham chiếu '{ref_tool_id}' không tồn tại trong Tool Registry.")
        else:
            valid_tool_ids.append(ref_tool_id)

    # 3.4 Kiểm tra Rule Nodes cấu hình & tồn tại trong DB
    valid_rule_ids: List[str] = []
    seen_rule_ids: set = set()
    for r_node in rule_nodes:
        r_cfg = r_node.get("data", {}).get("config", {})
        ref_rule_id = r_cfg.get("rule_id")
        if not ref_rule_id:
            errors.append("Rule Node chưa được gắn rule_id hợp lệ.")
            continue
        if ref_rule_id in seen_rule_ids:
            errors.append(f"Phát hiện quy tắc trùng lặp '{ref_rule_id}' được liên kết nhiều lần vào cùng một Model.")
        seen_rule_ids.add(ref_rule_id)

        if user_id and user_id != 'guest_user':
            r_rec = query_one(
                "SELECT id, name, status, scope FROM rules WHERE id = ? AND (user_id = ? OR scope = 'system') AND deleted_at IS NULL",
                (ref_rule_id, user_id)
            )
        else:
            r_rec = query_one(
                "SELECT id, name, status, scope FROM rules WHERE id = ? AND deleted_at IS NULL",
                (ref_rule_id,)
            )
        if not r_rec:
            errors.append(f"Quy tắc tham chiếu '{ref_rule_id}' không tồn tại hoặc đã bị xóa khỏi thư viện.")
        elif r_rec.get("status") != "active":
            errors.append(f"Quy tắc '{r_rec.get('name', ref_rule_id)}' hiện không hoạt động (status: {r_rec.get('status')}).")
        else:
            valid_rule_ids.append(ref_rule_id)

    # 4. Kiểm tra cấu hình Web Input Node
    max_words = 500
    if input_node:
        cfg = input_node.get("data", {}).get("config", {})
        try:
            max_words = int(cfg.get("max_words", 500))
            if max_words < 10 or max_words > 4000:
                errors.append(f"Giới hạn số từ (max_words) phải từ 10 đến 4000 từ (giá trị hiện tại: {max_words}).")
        except (ValueError, TypeError):
            errors.append("Tham số max_words của Web Input Node không phải là số hợp lệ.")

    # 5. Kiểm tra cấu hình Model Node
    target_model_id = None
    if model_node:
        cfg = model_node.get("data", {}).get("config", {})
        target_model_id = cfg.get("model_id")
        if not target_model_id:
            errors.append("Model Node chưa chọn Mô hình AI (model_id bị rỗng).")
        else:
            model_rec = query_one("SELECT * FROM models WHERE id = ?", (target_model_id,))
            if not model_rec:
                errors.append(f"Mô hình AI '{target_model_id}' không tồn tại trong danh mục hệ thống.")
            else:
                if model_rec.get("status") != "ACTIVE":
                    errors.append(f"Mô hình AI '{model_rec.get('name')}' hiện đang tạm ngừng hoạt động (status: {model_rec.get('status')}).")
                
                provider = model_rec.get("provider", "")
                if not check_provider_api_key(provider, user_id=user_id):
                    errors.append(f"Nhà cung cấp '{provider}' của mô hình '{model_rec.get('name')}' chưa được cấu hình API Key.")

                # Kiểm tra tham số temperature và max_tokens
                temp = cfg.get("temperature", 0.7)
                try:
                    temp_f = float(temp)
                    if temp_f < 0.0 or temp_f > 2.0:
                        errors.append(f"Nhiệt độ sáng tạo (temperature) phải từ 0.0 đến 2.0 (giá trị: {temp_f}).")
                except (ValueError, TypeError):
                    errors.append("Tham số temperature không hợp lệ.")

                tokens = cfg.get("max_tokens", 2048)
                try:
                    tokens_i = int(tokens)
                    max_allowed = model_rec.get("max_tokens", 4096)
                    if tokens_i < 256 or tokens_i > max_allowed:
                        errors.append(f"Số lượng max_tokens phải từ 256 đến {max_allowed} (giá trị: {tokens_i}).")
                except (ValueError, TypeError):
                    errors.append("Tham số max_tokens không hợp lệ.")

    return {
        "is_valid": len(errors) == 0,
        "errors": errors,
        "target_model_id": target_model_id,
        "max_words_limit": max_words,
        "prompt_id": target_prompt_id,
        "bot_id": target_bot_id if bot_nodes else None,
        "skill_ids": valid_skill_ids,
        "tool_ids": valid_tool_ids,
        "rule_ids": valid_rule_ids
    }

# ==============================================================================
# 3. HELPER FUNCTIONS
# ==============================================================================

def count_words(text: str) -> int:
    """Đếm số từ của văn bản hỗ trợ tiếng Việt và khoảng trắng Unicode."""
    if not text or not text.strip():
        return 0
    words = re.findall(r'\S+', text.strip())
    return len(words)

def format_project_response(row: Dict[str, Any]) -> Dict[str, Any]:
    """Định dạng bản ghi project trả về theo hợp đồng API."""
    graph_obj = None
    node_count = 0
    if row.get("graph_data"):
        try:
            graph_obj = json.loads(row["graph_data"])
            node_count = len(graph_obj.get("nodes", []))
        except Exception:
            pass

    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "name": row["name"],
        "description": row.get("description"),
        "status": row["status"],
        "is_valid": bool(row.get("is_valid", 0)),
        "target_model_id": row.get("target_model_id"),
        "max_words_limit": row.get("max_words_limit", 500),
        "node_count": node_count,
        "graph_data": graph_obj,
        "last_validated_at": row.get("last_validated_at"),
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at")
    }

GUEST_USER_ID = "guest_user"

async def get_optional_current_user(request: Request) -> Dict[str, Any]:
    """
    Lấy thông tin người dùng nếu có token xác thực.
    Nếu không có token hoặc chưa đăng nhập, tự động gán vào Guest User ('guest_user')
    để hỗ trợ tạo và quản lý project mà không yêu cầu xác thực tài khoản.
    """
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if token:
        payload = decode_access_token(token)
        if payload and "sub" in payload:
            user = query_one("SELECT * FROM users WHERE id = ?", (payload["sub"],))
            if user:
                return dict(user)

    # Đảm bảo guest_user tồn tại trong bảng users
    guest = query_one("SELECT * FROM users WHERE id = ?", (GUEST_USER_ID,))
    if not guest:
        execute_commit(
            "INSERT OR IGNORE INTO users (id, email, full_name, username, status) VALUES (?, ?, ?, ?, ?)",
            (GUEST_USER_ID, "guest@ai-chan.vn", "Khách Vãng Lai", "guest", "ACTIVE")
        )
        guest = query_one("SELECT * FROM users WHERE id = ?", (GUEST_USER_ID,))
    return dict(guest) if guest else {"id": GUEST_USER_ID, "email": "guest@ai-chan.vn"}

# ==============================================================================
# 4. REST API ENDPOINTS
# ==============================================================================

@projects_router.get("", summary="Lấy danh sách project của người dùng")
async def list_projects(
    status_filter: Optional[str] = Query(None, alias="status", description="Lọc theo trạng thái (ACTIVE, STOP, DEACTIVE)"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    user_id = current_user["id"]
    
    # Đếm quota active
    active_row = query_one(
        "SELECT COUNT(*) as count FROM projects WHERE user_id = ? AND status = 'ACTIVE'",
        (user_id,)
    )
    active_count = active_row["count"] if active_row else 0
    max_limit = settings.MAX_ACTIVE_PROJECTS
    remaining_slots = max(0, max_limit - active_count)

    # Truy vấn danh sách
    if status_filter:
        s_upper = status_filter.strip().upper()
        sql = """
            SELECT * FROM projects 
            WHERE user_id = ? AND status = ? AND status != 'DELETED'
            ORDER BY updated_at DESC LIMIT ? OFFSET ?
        """
        rows = query_all(sql, (user_id, s_upper, limit, offset))
        total_row = query_one("SELECT COUNT(*) as count FROM projects WHERE user_id = ? AND status = ? AND status != 'DELETED'", (user_id, s_upper))
    else:
        sql = """
            SELECT * FROM projects 
            WHERE user_id = ? AND status != 'DELETED'
            ORDER BY updated_at DESC LIMIT ? OFFSET ?
        """
        rows = query_all(sql, (user_id, limit, offset))
        total_row = query_one("SELECT COUNT(*) as count FROM projects WHERE user_id = ? AND status != 'DELETED'", (user_id,))

    # Nếu là guest_user và không tìm thấy project nào, fallback tìm tất cả project không bị xóa để không bị rào cản xác thực
    if user_id == GUEST_USER_ID and not rows:
        fallback_sql = "SELECT * FROM projects WHERE status != 'DELETED' ORDER BY updated_at DESC LIMIT ? OFFSET ?"
        rows = query_all(fallback_sql, (limit, offset))
        total_row = query_one("SELECT COUNT(*) as count FROM projects WHERE status != 'DELETED'")

    items = [format_project_response(r) for r in rows]
    total = total_row["count"] if total_row else len(items)

    return {
        "items": items,
        "projects": items,  # Hỗ trợ tương thích ngược cho các component dùng prjData.projects
        "total": total,
        "active_quota": {
            "active_count": active_count,
            "max_limit": max_limit,
            "remaining_slots": remaining_slots
        }
    }

@projects_router.post("", status_code=status.HTTP_201_CREATED, summary="Tạo mới project cơ bản")
async def create_project(
    payload: ProjectCreateRequest,
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    name = payload.name.strip()
    if not name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Tên project không được để trống hoặc chỉ chứa khoảng trắng"
        )

    project_id = f"proj_{uuid.uuid4().hex}"
    user_id = current_user["id"]
    description = payload.description.strip() if payload.description else None

    # Khởi tạo graph mặc định rỗng với viewport tiêu chuẩn
    initial_graph = {
        "viewport": {"x": 0, "y": 0, "zoom": 1},
        "nodes": [],
        "edges": []
    }
    graph_json = json.dumps(initial_graph)

    sql = """
        INSERT INTO projects (id, user_id, name, description, status, graph_data, is_valid, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'STOP', ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    """
    execute_commit(sql, (project_id, user_id, name, description, graph_json))

    created = query_one("SELECT * FROM projects WHERE id = ?", (project_id,))
    return format_project_response(created)

@projects_router.get("/active", summary="Lấy danh sách project ACTIVE phục vụ Trang Chủ")
async def get_active_projects(current_user: Dict[str, Any] = Depends(get_optional_current_user)):
    user_id = current_user["id"]
    rows = query_all(
        "SELECT * FROM projects WHERE user_id = ? AND status = 'ACTIVE' ORDER BY updated_at DESC",
        (user_id,)
    )
    return [format_project_response(r) for r in rows]

@projects_router.get("/quota", summary="Lấy thông tin hạn ngạch project active")
async def get_project_quota(current_user: Dict[str, Any] = Depends(get_optional_current_user)):
    user_id = current_user["id"]
    active_row = query_one(
        "SELECT COUNT(*) as count FROM projects WHERE user_id = ? AND status = 'ACTIVE'",
        (user_id,)
    )
    active_count = active_row["count"] if active_row else 0
    max_limit = settings.MAX_ACTIVE_PROJECTS
    return {
        "active_count": active_count,
        "max_limit": max_limit,
        "remaining_slots": max(0, max_limit - active_count)
    }

@projects_router.get("/{project_id}", summary="Lấy thông tin chi tiết project")
async def get_project_detail(
    project_id: str,
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    user_id = current_user["id"]
    row = query_one("SELECT * FROM projects WHERE id = ? AND user_id = ? AND status != 'DELETED'", (project_id, user_id))
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project không tồn tại hoặc bạn không có quyền truy cập"
        )
    return format_project_response(row)

@projects_router.patch("/{project_id}", summary="Cập nhật tên và mô tả project")
async def update_project(
    project_id: str,
    payload: ProjectUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    user_id = current_user["id"]
    row = query_one("SELECT * FROM projects WHERE id = ? AND user_id = ? AND status != 'DELETED'", (project_id, user_id))
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project không tồn tại")

    updates = []
    params = []
    if payload.name is not None:
        name_clean = payload.name.strip()
        if not name_clean:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Tên không được để trống")
        updates.append("name = ?")
        params.append(name_clean)

    if payload.description is not None:
        updates.append("description = ?")
        params.append(payload.description.strip() or None)

    if updates:
        updates.append("updated_at = CURRENT_TIMESTAMP")
        params.extend([project_id, user_id])
        sql = f"UPDATE projects SET {', '.join(updates)} WHERE id = ? AND user_id = ?"
        execute_commit(sql, tuple(params))

    updated = query_one("SELECT * FROM projects WHERE id = ?", (project_id,))
    return format_project_response(updated)

@projects_router.put("/{project_id}/graph", summary="Lưu cấu trúc đồ thị graph")
async def save_project_graph(
    project_id: str,
    payload: GraphSaveRequest,
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    user_id = current_user["id"]
    row = query_one("SELECT * FROM projects WHERE id = ? AND user_id = ? AND status != 'DELETED'", (project_id, user_id))
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project không tồn tại")

    graph_dict = payload.model_dump()
    val_result = validate_project_graph(graph_dict, user_id=user_id)
    
    graph_json = json.dumps(graph_dict)
    is_valid_flag = 1 if val_result["is_valid"] else 0
    target_model_id = val_result["target_model_id"]
    max_words_limit = val_result["max_words_limit"]

    sql = """
        UPDATE projects 
        SET graph_data = ?, 
            target_model_id = ?, 
            max_words_limit = ?, 
            is_valid = ?, 
            last_validated_at = CURRENT_TIMESTAMP, 
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
    """
    execute_commit(sql, (graph_json, target_model_id, max_words_limit, is_valid_flag, project_id, user_id))

    if val_result["is_valid"]:
        from src.services.tools.registry import ToolRegistryService
        tool_ids = val_result.get("tool_ids", [])
        tool_node_configs = {}
        for n in graph_dict.get("nodes", []):
            if n.get("type") == "tool":
                cfg = n.get("data", {}).get("config", {})
                tid = cfg.get("tool_id")
                if tid:
                    tool_node_configs[tid] = {
                        "is_enabled": cfg.get("is_enabled", True),
                        "custom_timeout_seconds": cfg.get("custom_timeout_seconds")
                    }

        current_bindings = query_all("SELECT tool_id FROM project_tool_bindings WHERE project_id = ?", (project_id,))
        current_tids = {b["tool_id"] for b in current_bindings}

        # Remove bindings for tools unlinked from canvas
        for old_tid in current_tids - set(tool_ids):
            ToolRegistryService.unbind_tool_from_project(project_id, old_tid)

        # Bind or update linked tools
        for tid in tool_ids:
            t_cfg = tool_node_configs.get(tid, {})
            ToolRegistryService.bind_tool_to_project(
                project_id,
                tid,
                is_enabled=t_cfg.get("is_enabled", True),
                custom_timeout_seconds=t_cfg.get("custom_timeout_seconds")
            )

        # Synchronize linked rules with project_rules table
        rule_ids = val_result.get("rule_ids", [])
        from src.services.rule_service import RuleService
        RuleService.sync_project_rules(user_id=user_id, project_id=project_id, rule_ids=rule_ids)
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error_code": "INVALID_GRAPH_STRUCTURE",
                "message": "Cấu trúc đồ thị chưa hợp lệ",
                "errors": val_result["errors"]
            }
        )

    return {
        "project_id": project_id,
        "is_valid": True,
        "message": "Đã lưu cấu trúc đồ thị thành công",
        "target_model_id": target_model_id,
        "max_words_limit": max_words_limit
    }

@projects_router.post("/{project_id}/validate", summary="Kiểm tra tính hợp lệ của graph không lưu")
async def validate_graph_only(
    project_id: str,
    payload: GraphSaveRequest,
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    user_id = current_user["id"]
    row = query_one("SELECT * FROM projects WHERE id = ? AND user_id = ? AND status != 'DELETED'", (project_id, user_id))
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project không tồn tại")

    val_result = validate_project_graph(payload.model_dump(), user_id=user_id)
    return val_result

@projects_router.post("/{project_id}/activate", summary="Kích hoạt project sang ACTIVE an toàn hạn ngạch")
async def activate_project(
    project_id: str,
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    user_id = current_user["id"]

    with get_db_connection() as conn:
        cursor = conn.cursor()
        # Khóa giao dịch độc quyền để chống Race Condition khi nhiều tab cùng bấm kích hoạt
        cursor.execute("BEGIN IMMEDIATE")

        # 1. Kiểm tra project
        cursor.execute("SELECT * FROM projects WHERE id = ? AND user_id = ? AND status != 'DELETED'", (project_id, user_id))
        proj = cursor.fetchone()
        if not proj:
            conn.rollback()
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project không tồn tại")

        # 2. Kiểm tra tính hợp lệ của graph
        if not proj.get("is_valid") or not proj.get("graph_data"):
            conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể kích hoạt: Cấu hình graph chưa hoàn thiện hoặc chưa hợp lệ. Vui lòng mở Editor kiểm tra lại."
            )

        # 3. Đếm số project đang ACTIVE
        cursor.execute("SELECT COUNT(*) as count FROM projects WHERE user_id = ? AND status = 'ACTIVE' AND id != ?", (user_id, project_id))
        active_count_other = cursor.fetchone()["count"]

        if active_count_other >= settings.MAX_ACTIVE_PROJECTS:
            conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error_code": "QUOTA_EXCEEDED",
                    "message": f"Không thể kích hoạt: Bạn đã đạt giới hạn tối đa {settings.MAX_ACTIVE_PROJECTS} project hoạt động đồng thời.",
                    "active_quota": {
                        "active_count": active_count_other,
                        "max_limit": settings.MAX_ACTIVE_PROJECTS,
                        "remaining_slots": 0
                    }
                }
            )

        # 4. Kích hoạt
        cursor.execute("UPDATE projects SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP WHERE id = ?", (project_id,))
        conn.commit()

    return {
        "id": project_id,
        "status": "ACTIVE",
        "active_quota": {
            "active_count": active_count_other + 1,
            "max_limit": settings.MAX_ACTIVE_PROJECTS,
            "remaining_slots": max(0, settings.MAX_ACTIVE_PROJECTS - (active_count_other + 1))
        },
        "message": "Kích hoạt project thành công"
    }

@projects_router.post("/{project_id}/stop", summary="Tạm dừng project (chuyển về STOP)")
async def stop_project(
    project_id: str,
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    user_id = current_user["id"]
    row = query_one("SELECT * FROM projects WHERE id = ? AND user_id = ? AND status != 'DELETED'", (project_id, user_id))
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project không tồn tại")

    execute_commit("UPDATE projects SET status = 'STOP', updated_at = CURRENT_TIMESTAMP WHERE id = ?", (project_id,))
    return {"id": project_id, "status": "STOP", "message": "Project đã được tạm dừng"}

@projects_router.post("/{project_id}/deactivate", summary="Vô hiệu hóa project (chuyển về DEACTIVE)")
async def deactivate_project(
    project_id: str,
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    user_id = current_user["id"]
    row = query_one("SELECT * FROM projects WHERE id = ? AND user_id = ? AND status != 'DELETED'", (project_id, user_id))
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project không tồn tại")

    execute_commit("UPDATE projects SET status = 'DEACTIVE', updated_at = CURRENT_TIMESTAMP WHERE id = ?", (project_id,))
    return {"id": project_id, "status": "DEACTIVE", "message": "Project đã bị vô hiệu hóa"}

@projects_router.delete("/{project_id}", summary="Xóa project (Soft delete)")
async def delete_project(
    project_id: str,
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    user_id = current_user["id"]
    row = query_one("SELECT * FROM projects WHERE id = ? AND user_id = ? AND status != 'DELETED'", (project_id, user_id))
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project không tồn tại")

    execute_commit("UPDATE projects SET status = 'DELETED', updated_at = CURRENT_TIMESTAMP WHERE id = ?", (project_id,))
    return {"id": project_id, "status": "DELETED", "message": "Project đã được xóa thành công"}

@projects_router.post("/{project_id}/chat", summary="Thực thi hội thoại chat qua Project đang ACTIVE (SSE)")
async def chat_through_project(
    project_id: str,
    payload: ProjectChatRequest,
    current_user: Dict[str, Any] = Depends(get_optional_current_user)
):
    user_id = current_user["id"]
    proj = query_one("SELECT * FROM projects WHERE id = ? AND user_id = ? AND status != 'DELETED'", (project_id, user_id))
    if not proj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project không tồn tại")

    if proj.get("status") != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error_code": "PROJECT_NOT_ACTIVE",
                "message": f"Project hiện đang ở trạng thái '{proj.get('status')}'. Vui lòng kích hoạt project trước khi chat."
            }
        )

    # 1. Kiểm tra nội dung tin nhắn và tệp đính kèm (PRJ-BR-008)
    message_text = payload.message.strip()
    if not message_text and not payload.attachments:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error_code": "EMPTY_MESSAGE",
                "message": "Nội dung câu hỏi không được để trống hoặc phải có tệp đính kèm."
            }
        )
    if not message_text and payload.attachments:
        message_text = "Vui lòng phân tích tệp đính kèm."

    # Kiểm tra giới hạn từ của Web Input Node (PRJ-BR-008)
    max_words_limit = proj.get("max_words_limit") or 500
    actual_words = count_words(message_text)
    if actual_words > max_words_limit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "WORD_LIMIT_EXCEEDED",
                "message": f"Nội dung câu hỏi có {actual_words} từ, vượt quá giới hạn tối đa {max_words_limit} từ của Project này.",
                "actual_words": actual_words,
                "max_words_limit": max_words_limit
            }
        )

    # 2. Đọc cấu hình Model Node
    target_model_id = proj.get("target_model_id") or "gemini-3.8-flash"

    model_rec = query_one("SELECT * FROM models WHERE id = ?", (target_model_id,))
    if not model_rec or model_rec.get("status") != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error_code": "MODEL_UNAVAILABLE",
                "message": f"Mô hình AI '{target_model_id}' hiện không khả dụng. Vui lòng mở Project Editor để chọn lại mô hình."
            }
        )

    # 2.5. Phân giải System Prompt, Bot, Skills, Tools và Rules liên kết nếu có trong graph (DEC-SPN-01, DEC-SPN-03, DEC-SPN-04)
    system_prompt_instruction: Optional[str] = None
    connected_bot_info: Optional[Dict[str, Any]] = None
    connected_skills_info: List[Dict[str, Any]] = []
    connected_tools_info: List[Dict[str, Any]] = []
    connected_rules_info: List[Dict[str, Any]] = []
    connected_tool_definitions: List[Dict[str, Any]] = []
    skill_instructions: List[str] = []
    rule_instructions: List[str] = []

    if proj.get("graph_data"):
        try:
            g_data = json.loads(proj["graph_data"])
            g_nodes = g_data.get("nodes", [])
            g_edges = g_data.get("edges", [])
            model_nodes = [n for n in g_nodes if n.get("type") == "model"]
            m_node_id = model_nodes[0].get("id") if model_nodes else None

            # Phân giải System Prompt
            prompt_nodes = [n for n in g_nodes if n.get("type") == "system_prompt"]
            if prompt_nodes and m_node_id:
                p_node = prompt_nodes[0]
                p_node_id = p_node.get("id")
                is_connected = any(
                    e.get("source") == p_node_id and e.get("target") == m_node_id
                    for e in g_edges
                )
                if is_connected:
                    ref_prompt_id = p_node.get("data", {}).get("config", {}).get("prompt_id")
                    if not ref_prompt_id:
                        raise HTTPException(
                            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail={
                                "error_code": "PROMPT_UNAVAILABLE",
                                "message": "System Prompt Node chưa được gắn ID prompt hợp lệ."
                            }
                        )
                    # Query SQLite DB for dynamic resolution (DEC-SPN-01, DEC-SPN-03)
                    prompt_record = query_one(
                        "SELECT id, content FROM system_prompts WHERE id = ? AND (user_id = ? OR user_id = 'guest_user')",
                        (ref_prompt_id, user_id)
                    )
                    if not prompt_record:
                        # Fail-closed per DEC-SPN-04
                        raise HTTPException(
                            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail={
                                "error_code": "PROMPT_UNAVAILABLE",
                                "message": f"System Prompt liên kết (ID: '{ref_prompt_id}') không tồn tại hoặc đã bị xóa khỏi thư viện. Vui lòng mở Project Editor để chọn lại prompt."
                            }
                        )
                    system_prompt_instruction = prompt_record.get("content")

            # Phân giải Bot liên kết (Model -> Bot)
            bot_nodes = [n for n in g_nodes if n.get("type") == "bot"]
            if bot_nodes and m_node_id:
                b_node = bot_nodes[0]
                b_node_id = b_node.get("id")
                is_bot_connected = any(
                    e.get("source") == m_node_id and e.get("target") == b_node_id
                    for e in g_edges
                )
                if is_bot_connected:
                    ref_bot_id = b_node.get("data", {}).get("config", {}).get("bot_id")
                    if not ref_bot_id:
                        raise HTTPException(
                            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail={
                                "error_code": "BOT_UNAVAILABLE",
                                "message": "Bot Node chưa được gắn ID bot hợp lệ."
                            }
                        )
                    if user_id and user_id != 'guest_user':
                        user_rec = query_one("SELECT id, discord_id FROM users WHERE id = ?", (user_id,))
                        if not user_rec or not user_rec.get("discord_id"):
                            raise HTTPException(
                                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                                detail={
                                    "error_code": "DISCORD_NOT_LINKED",
                                    "message": "Tài khoản chưa liên kết Discord để sử dụng Bot đã kết nối."
                                }
                            )
                        bot_rec = query_one(
                            "SELECT id, guild_name, trigger_mode, is_enabled FROM discord_bot_configs WHERE (id = ? OR user_id = ?) AND user_id = ?",
                            (ref_bot_id, user_id, user_id)
                        )
                        if not bot_rec and (
                            ref_bot_id == str(settings.DISCORD_CLIENT_ID or "1548888415951519744")
                            or str(ref_bot_id).startswith("bot_")
                        ):
                            bot_rec = query_one(
                                "SELECT id, guild_name, trigger_mode, is_enabled FROM discord_bot_configs WHERE user_id = ?",
                                (user_id,)
                            )
                    else:
                        bot_rec = query_one("SELECT id, guild_name, trigger_mode, is_enabled FROM discord_bot_configs WHERE id = ?", (ref_bot_id,))
                        if not bot_rec:
                            bot_rec = query_one("SELECT id, guild_name, trigger_mode, is_enabled FROM discord_bot_configs LIMIT 1")
                    if not bot_rec:
                        raise HTTPException(
                            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail={
                                "error_code": "BOT_UNAVAILABLE",
                                "message": f"Bot liên kết (ID: '{ref_bot_id}') không tồn tại hoặc bạn không có quyền truy cập."
                            }
                        )
                    connected_bot_info = {
                        "id": bot_rec["id"],
                        "name": bot_rec.get("guild_name") or "Discord Bot",
                        "platform": "discord",
                        "is_enabled": bool(bot_rec.get("is_enabled", 1)),
                        "trigger_mode": bot_rec.get("trigger_mode") or "MENTION"
                    }

            # Phân giải Skills liên kết (Model -> Skill)
            skill_nodes = [n for n in g_nodes if n.get("type") == "skill"]
            if skill_nodes and m_node_id:
                seen_skills: set = set()
                from src.core.skill_storage import read_skill_md_content
                for s_node in skill_nodes:
                    s_node_id = s_node.get("id")
                    is_skill_connected = any(
                        e.get("source") == m_node_id and e.get("target") == s_node_id
                        for e in g_edges
                    )
                    if is_skill_connected:
                        ref_skill_id = s_node.get("data", {}).get("config", {}).get("skill_id")
                        if not ref_skill_id or ref_skill_id in seen_skills:
                            continue
                        seen_skills.add(ref_skill_id)

                        if user_id and user_id != 'guest_user':
                            skill_rec = query_one(
                                "SELECT id, name, description, status, storage_path FROM skills WHERE id = ? AND (user_id = ? OR user_id = 'guest_user')",
                                (ref_skill_id, user_id)
                            )
                        else:
                            skill_rec = query_one("SELECT id, name, description, status, storage_path FROM skills WHERE id = ?", (ref_skill_id,))

                        if not skill_rec or skill_rec.get("status") != "VALID":
                            raise HTTPException(
                                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                                detail={
                                    "error_code": "SKILL_UNAVAILABLE",
                                    "message": f"Kỹ năng liên kết '{ref_skill_id}' không tồn tại hoặc không ở trạng thái VALID."
                                }
                            )
                        content = read_skill_md_content(skill_rec.get("storage_path", ""))
                        if content:
                            skill_instructions.append(f"### Skill: {skill_rec['name']}\n{content}")
                        elif skill_rec.get("description"):
                            skill_instructions.append(f"### Skill: {skill_rec['name']}\nDescription: {skill_rec['description']}")
                        connected_skills_info.append({
                            "id": skill_rec["id"],
                            "name": skill_rec["name"],
                            "status": skill_rec["status"]
                        })

            # Phân giải Tools liên kết (Model -> Tool)
            tool_nodes = [n for n in g_nodes if n.get("type") == "tool"]
            if tool_nodes and m_node_id:
                seen_tools: set = set()
                for t_node in tool_nodes:
                    t_node_id = t_node.get("id")
                    is_tool_connected = any(
                        e.get("source") == m_node_id and e.get("target") == t_node_id
                        for e in g_edges
                    )
                    if not is_tool_connected:
                        continue
                    t_cfg = t_node.get("data", {}).get("config", {})
                    ref_tool_id = t_cfg.get("tool_id")
                    if not ref_tool_id or ref_tool_id in seen_tools:
                        continue
                    seen_tools.add(ref_tool_id)

                    t_rec = query_one(
                        "SELECT id, name, description, category, status, input_schema, output_schema, timeout_seconds FROM tools WHERE id = ?",
                        (ref_tool_id,)
                    )
                    if not t_rec:
                        raise HTTPException(
                            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail={
                                "error_code": "TOOL_UNAVAILABLE",
                                "message": f"Công cụ liên kết '{ref_tool_id}' không tồn tại trong Tool Registry."
                            }
                        )
                    if t_rec.get("status") != "AVAILABLE":
                        raise HTTPException(
                            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail={
                                "error_code": "TOOL_DISABLED",
                                "message": f"Công cụ liên kết '{t_rec.get('name', ref_tool_id)}' hiện không khả dụng (status: {t_rec.get('status')})."
                            }
                        )

                    ptb = query_one(
                        "SELECT is_enabled, custom_timeout_seconds FROM project_tool_bindings WHERE project_id = ? AND tool_id = ?",
                        (project_id, ref_tool_id)
                    )
                    if ptb and not bool(ptb.get("is_enabled", 1)):
                        continue
                    if t_cfg.get("is_enabled") is False:
                        continue

                    timeout_sec = (ptb.get("custom_timeout_seconds") if ptb else None) or t_cfg.get("custom_timeout_seconds") or t_rec.get("timeout_seconds") or 30

                    connected_tools_info.append({
                        "id": t_rec["id"],
                        "name": t_rec["name"],
                        "category": t_rec["category"],
                        "status": t_rec["status"]
                    })
                    connected_tool_definitions.append({
                        "id": t_rec["id"],
                        "name": t_rec["name"],
                        "description": t_rec["description"],
                        "category": t_rec["category"],
                        "input_schema": json.loads(t_rec.get("input_schema") or "{}"),
                        "output_schema": json.loads(t_rec.get("output_schema") or "{}"),
                        "timeout_seconds": timeout_sec
                    })

            # Phân giải Rules liên kết (Rule -> Model)
            rule_nodes = [n for n in g_nodes if n.get("type") == "rule"]
            if rule_nodes and m_node_id:
                seen_rules: set = set()
                active_rules: List[Dict[str, Any]] = []
                for r_node in rule_nodes:
                    r_node_id = r_node.get("id")
                    is_rule_connected = any(
                        e.get("source") == r_node_id and e.get("target") == m_node_id
                        for e in g_edges
                    )
                    if not is_rule_connected:
                        continue
                    r_cfg = r_node.get("data", {}).get("config", {})
                    ref_rule_id = r_cfg.get("rule_id")
                    if not ref_rule_id or ref_rule_id in seen_rules:
                        continue
                    seen_rules.add(ref_rule_id)

                    if user_id and user_id != 'guest_user':
                        rule_rec = query_one(
                            "SELECT id, name, description, content, priority, status, scope FROM rules WHERE id = ? AND (user_id = ? OR scope = 'system') AND deleted_at IS NULL",
                            (ref_rule_id, user_id)
                        )
                    else:
                        rule_rec = query_one(
                            "SELECT id, name, description, content, priority, status, scope FROM rules WHERE id = ? AND deleted_at IS NULL",
                            (ref_rule_id,)
                        )

                    if not rule_rec:
                        raise HTTPException(
                            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail={
                                "error_code": "RULE_UNAVAILABLE",
                                "message": f"Quy tắc liên kết '{ref_rule_id}' không tồn tại hoặc đã bị xóa khỏi thư viện."
                            }
                        )
                    if rule_rec.get("status") != "active":
                        raise HTTPException(
                            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail={
                                "error_code": "RULE_DISABLED",
                                "message": f"Quy tắc liên kết '{rule_rec.get('name', ref_rule_id)}' hiện không ở trạng thái kích hoạt (status: {rule_rec.get('status')})."
                            }
                        )
                    active_rules.append(rule_rec)

                # Sắp xếp xác định (deterministic ordering): priority DESC, name ASC, id ASC
                active_rules.sort(key=lambda r: (-r.get("priority", 50), (r.get("name") or "").lower(), r.get("id") or ""))

                for r in active_rules:
                    rule_instructions.append(f"### Rule: {r['name']}\n{r['content']}")
                    connected_rules_info.append({
                        "id": r["id"],
                        "name": r["name"],
                        "scope": r.get("scope", "user"),
                        "priority": r.get("priority", 50),
                        "status": r.get("status", "active")
                    })
        except HTTPException:
            raise
        except Exception as e:
            pass

    # Fallback to bound rules if graph has no rule nodes connected
    if not connected_rules_info:
        bound_rules = query_all(
            """
            SELECT r.id, r.name, r.description, r.content, r.priority, r.status, r.scope
            FROM project_rules pr
            JOIN rules r ON pr.rule_id = r.id
            WHERE pr.project_id = ? AND pr.is_enabled = 1 AND r.deleted_at IS NULL AND r.status = 'active'
            """,
            (project_id,)
        )
        if bound_rules:
            bound_rules.sort(key=lambda r: (-r.get("priority", 50), (r.get("name") or "").lower(), r.get("id") or ""))
            for r in bound_rules:
                rule_instructions.append(f"### Rule: {r['name']}\n{r['content']}")
                connected_rules_info.append({
                    "id": r["id"],
                    "name": r["name"],
                    "scope": r.get("scope", "user"),
                    "priority": r.get("priority", 50),
                    "status": r.get("status", "active")
                })

    # Kết hợp chỉ dẫn: System Prompt + Rules + Skills + Tools (deterministic)
    combined_instruction = system_prompt_instruction or ""
    if rule_instructions:
        rules_block = "\n\n--- ACTIVE ENGINEERING RULES ---\n" + "\n\n".join(rule_instructions) + "\n--- END ACTIVE ENGINEERING RULES ---"
        combined_instruction = (combined_instruction + rules_block).strip()

    if skill_instructions:
        skills_block = "\n\n--- ACTIVE SKILLS INSTRUCTIONS ---\n" + "\n\n".join(skill_instructions) + "\n--- END SKILLS INSTRUCTIONS ---"
        combined_instruction = (combined_instruction + skills_block).strip()

    # Thêm mô tả các Tools được kết nối vào ngữ cảnh chỉ dẫn
    if connected_tool_definitions:
        tools_desc = [f"- **{td['name']}** (`{td['id']}`): {td['description']}" for td in connected_tool_definitions]
        tools_block = "\n\n--- AVAILABLE TOOLS FOR THIS MODEL ---\n" + "\n".join(tools_desc) + "\n--- END AVAILABLE TOOLS ---"
        combined_instruction = (combined_instruction + tools_block).strip()
    else:
        # Fallback to bound tools if existing project has project_tool_bindings
        bound_tools = query_all(
            """
            SELECT b.tool_id, t.name, t.description
            FROM project_tool_bindings b
            JOIN tools t ON b.tool_id = t.id
            WHERE b.project_id = ? AND b.is_enabled = 1 AND t.status = 'AVAILABLE'
            """,
            (project_id,)
        )
        if bound_tools:
            tools_desc = [f"- **{bt['name']}** (`{bt['tool_id']}`): {bt['description']}" for bt in bound_tools]
            tools_block = "\n\n--- AVAILABLE TOOLS FOR THIS PROJECT ---\n" + "\n".join(tools_desc) + "\n--- END AVAILABLE TOOLS ---"
            combined_instruction = (combined_instruction + tools_block).strip()

    # 3. Quản lý conversation (Anti-IDOR & Idempotent Primary Project Conversation)
    conv_id = payload.conversation_id
    if conv_id:
        conv = query_one(
            "SELECT id, user_id, project_id FROM conversations WHERE id = ?",
            (conv_id,)
        )
        if not conv or (conv["user_id"] != user_id and user_id != "guest_user"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cuộc trò chuyện không tồn tại hoặc bạn không có quyền truy cập."
            )
        if conv["project_id"] and conv["project_id"] != project_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cuộc trò chuyện không thuộc về Project này."
            )
        if not conv["project_id"]:
            execute_commit("UPDATE conversations SET project_id = ? WHERE id = ?", (project_id, conv_id))
    else:
        # Tự động gắn kết vào conversation chính của project cho user hiện tại
        primary_conv = query_one(
            """
            SELECT id FROM conversations
            WHERE project_id = ? AND user_id = ?
            ORDER BY updated_at DESC
            LIMIT 1
            """,
            (project_id, user_id)
        )
        if primary_conv:
            conv_id = primary_conv["id"]
        else:
            conv_id = f"conv_{uuid.uuid4().hex}"
            execute_commit(
                """
                INSERT INTO conversations (id, user_id, project_id, title, created_at, updated_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                (conv_id, user_id, project_id, f"Project Chat - {proj['name']}")
            )

    user_msg_id = f"msg_{uuid.uuid4().hex}"
    # Lưu tin nhắn user vào CSDL
    execute_commit(
        """
        INSERT INTO messages (id, conversation_id, role, content, model_used, status)
        VALUES (?, ?, 'user', ?, ?, 'COMPLETED')
        """,
        (user_msg_id, conv_id, message_text, target_model_id)
    )

    # Xử lý và xác thực attachments (Anti-IDOR)
    attachment_records: List[Dict[str, Any]] = []
    if payload.attachments:
        for att_id in payload.attachments:
            att = query_one(
                "SELECT * FROM attachments WHERE id = ? AND (user_id = ? OR user_id = 'guest_user')",
                (att_id, user_id)
            )
            if not att:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={
                        "error_code": "ATTACHMENT_NOT_FOUND",
                        "message": f"Tệp đính kèm '{att_id}' không tồn tại hoặc bạn không có quyền truy cập."
                    }
                )
            if att.get("status") not in ("READY", "ATTACHED"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "error_code": "ATTACHMENT_NOT_READY",
                        "message": f"Tệp đính kèm '{att.get('filename')}' chưa ở trạng thái sẵn sàng (READY)."
                    }
                )
            execute_commit(
                """
                UPDATE attachments
                SET message_id = ?, project_id = ?, conversation_id = ?, status = 'ATTACHED', updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (user_msg_id, project_id, conv_id, att_id)
            )
            attachment_records.append(att)

    # Lấy ngữ cảnh hội thoại gần nhất (loại trừ user_msg_id hiện tại để không nhân đôi prompt trong LLM context)
    context_msgs = query_all(
        """
        SELECT role, content FROM messages
        WHERE conversation_id = ? AND id != ?
        ORDER BY created_at DESC
        LIMIT 20
        """,
        (conv_id, user_msg_id)
    )
    context_msgs.reverse()

    from src.services.chat_turn_manager import ProjectChatTurnManager
    try:
        turn = ProjectChatTurnManager.start_turn(
            project_id=project_id,
            conversation_id=conv_id,
            user_id=user_id,
            user_msg_id=user_msg_id,
            message_text=message_text,
            context_msgs=context_msgs,
            target_model_id=target_model_id,
            combined_instruction=combined_instruction if combined_instruction else None,
            attachment_records=attachment_records if attachment_records else None,
            connected_tool_definitions=connected_tool_definitions if connected_tool_definitions else None,
            connected_bot_info=connected_bot_info,
            connected_skills_info=connected_skills_info,
            connected_tools_info=connected_tools_info,
            connected_rules_info=connected_rules_info if connected_rules_info else None,
            actual_words=actual_words,
        )
    except RuntimeError as re_err:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(re_err)
        )

    return StreamingResponse(
        ProjectChatTurnManager.stream_turn(turn),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@projects_router.get("/{project_id}/conversation")
async def get_or_create_project_conversation(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Lấy hoặc tạo cuộc hội thoại chính của Project cho người dùng hiện tại (Idempotent)."""
    user_id = current_user["id"]
    proj = query_one(
        "SELECT id, name FROM projects WHERE id = ? AND (user_id = ? OR user_id = 'guest_user')",
        (project_id, user_id)
    )
    if not proj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project không tồn tại hoặc bạn không có quyền truy cập."
        )

    conv = query_one(
        """
        SELECT id, user_id, project_id, title, created_at, updated_at
        FROM conversations
        WHERE project_id = ? AND user_id = ?
        ORDER BY updated_at DESC
        LIMIT 1
        """,
        (project_id, user_id)
    )

    if not conv:
        conv_id = f"conv_{uuid.uuid4().hex}"
        title = f"Project Chat - {proj['name']}"
        execute_commit(
            """
            INSERT INTO conversations (id, user_id, project_id, title, created_at, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """,
            (conv_id, user_id, project_id, title)
        )
        conv = query_one("SELECT id, user_id, project_id, title, created_at, updated_at FROM conversations WHERE id = ?", (conv_id,))

    return {"conversation": conv}


@projects_router.get("/{project_id}/chat/stream")
async def stream_project_chat_reconnect(
    project_id: str,
    conversation_id: str,
    after_seq: int = -1,
    current_user: dict = Depends(get_current_user)
):
    """Nối lại luồng SSE cho lượt sinh đang chạy trong Project Chat."""
    user_id = current_user["id"]
    conv = query_one(
        "SELECT id, user_id, project_id FROM conversations WHERE id = ? AND project_id = ?",
        (conversation_id, project_id)
    )
    if not conv or (conv["user_id"] != user_id and user_id != "guest_user"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cuộc trò chuyện không tồn tại hoặc bạn không có quyền truy cập."
        )

    from src.services.chat_turn_manager import ProjectChatTurnManager
    turn = ProjectChatTurnManager.get_active_turn(conversation_id)
    if not turn:
        # Nếu turn đã hoàn thành trong DB, trả về event done ngay lập tức
        last_msg = query_one(
            "SELECT id, role, content, model_used, status FROM messages WHERE conversation_id = ? ORDER BY created_at DESC, id DESC LIMIT 1",
            (conversation_id,)
        )
        if last_msg and last_msg["role"] == "assistant":
            done_payload = {
                "status": "done",
                "finish_reason": "stop",
                "message_id": last_msg["id"],
                "model": last_msg["model_used"],
                "conversation_id": conversation_id,
            }
            async def single_done_generator():
                yield f"event: done\ndata: {json.dumps(done_payload, ensure_ascii=False)}\n\n"
            return StreamingResponse(single_done_generator(), media_type="text/event-stream")

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không có lượt sinh nào đang hoạt động trong cuộc hội thoại này."
        )

    return StreamingResponse(
        ProjectChatTurnManager.stream_turn(turn, after_seq=after_seq),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


class CancelChatRequest(BaseModel):
    conversation_id: str


@projects_router.post("/{project_id}/chat/cancel")
async def cancel_project_chat(
    project_id: str,
    payload: CancelChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """Hủy lượt sinh đang thực thi theo yêu cầu chủ động của người dùng (Stop button)."""
    user_id = current_user["id"]
    from src.services.chat_turn_manager import ProjectChatTurnManager
    success = ProjectChatTurnManager.cancel_turn(payload.conversation_id, user_id)
    return {
        "success": success,
        "message": "Đã hủy lượt sinh thành công." if success else "Không có lượt sinh nào đang chạy để hủy."
    }


class ProjectBotBindingPayload(BaseModel):
    bot_id: Optional[str] = Field(default=None, description="ID của Discord Bot muốn liên kết, hoặc null để gỡ liên kết")


@projects_router.put("/{project_id}/bot", summary="Liên kết hoặc gỡ liên kết Discord Bot cho Project (1:1 constraint)")
async def bind_bot_to_project(
    project_id: str,
    payload: ProjectBotBindingPayload,
    current_user: dict = Depends(get_current_user)
):
    """Liên kết Discord Bot với Project hoặc gỡ bỏ liên kết, đảm bảo quan hệ 1:1 nghiêm ngặt."""
    user_id = current_user["id"]
    proj = query_one(
        "SELECT id, name FROM projects WHERE id = ? AND user_id = ? AND status != 'DELETED'",
        (project_id, user_id)
    )
    if not proj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project '{project_id}' không tồn tại hoặc bạn không có quyền truy cập."
        )

    from src.services.bot_service import BotService
    if payload.bot_id:
        res = BotService.link_project(user_id, payload.bot_id, project_id)
        return {
            "success": True,
            "project_id": project_id,
            "bot_id": payload.bot_id,
            "bot_name": res.name,
            "message": f"Đã liên kết Bot '{res.name}' với Project '{proj['name']}' thành công."
        }
    else:
        execute_commit(
            "UPDATE discord_bot_configs SET project_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE project_id = ? AND user_id = ?",
            (project_id, user_id)
        )
        return {
            "success": True,
            "project_id": project_id,
            "bot_id": None,
            "message": f"Đã gỡ liên kết Discord Bot khỏi Project '{proj['name']}'."
        }


