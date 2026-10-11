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
from src.core.security import decode_access_token
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
    message: str = Field(..., min_length=1, description="Nội dung câu hỏi của người dùng")
    conversation_id: Optional[str] = Field(None, description="Định danh phiên hội thoại liên kết (tùy chọn)")

# ==============================================================================
# 2. GRAPH VALIDATION ENGINE
# ==============================================================================

def validate_project_graph(graph_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Xác thực tính toàn vẹn của cấu trúc đồ thị Graph (PRJ-BR-004, PRJ-BR-005, PRJ-BR-006):
    1. Đủ chính xác 3 Node: web_input, model, output.
    2. Đủ chính xác 2 Cạnh nối: web_input -> model và model -> output.
    3. Kiểm tra tham số: 10 <= max_words <= 4000.
    4. Kiểm tra model_id: Tồn tại trong DB models, status == 'ACTIVE', provider có API Key.
    5. Kiểm tra tham số model: temperature (0.0 - 2.0), max_tokens hợp lệ.
    """
    errors: List[str] = []
    nodes = graph_data.get("nodes", [])
    edges = graph_data.get("edges", [])

    # 1. Kiểm tra số lượng Node
    if len(nodes) != 3:
        errors.append(f"Graph phải chứa chính xác 3 Node: Web Input, Model và Output (hiện tại có {len(nodes)} node).")

    # Phân loại các node
    node_by_type: Dict[str, Dict[str, Any]] = {}
    node_by_id: Dict[str, Dict[str, Any]] = {}
    for n in nodes:
        ntype = n.get("type")
        nid = n.get("id")
        if nid:
            node_by_id[nid] = n
        if ntype:
            if ntype in node_by_type:
                errors.append(f"Mỗi project chỉ được phép có 1 node loại '{ntype}' (phát hiện trùng lặp).")
            node_by_type[ntype] = n

    input_node = node_by_type.get("web_input")
    model_node = node_by_type.get("model")
    output_node = node_by_type.get("output")

    if not input_node:
        errors.append("Graph thiếu Web Input Node.")
    if not model_node:
        errors.append("Graph thiếu Model Node.")
    if not output_node:
        errors.append("Graph thiếu Output Node.")

    # 2. Kiểm tra số lượng và chiều kết nối của các Edge
    if len(edges) != 2:
        errors.append(f"Graph phải chứa chính xác 2 cạnh kết nối liền mạch (hiện tại có {len(edges)} cạnh).")

    input_to_model_edge = False
    model_to_output_edge = False

    if input_node and model_node and output_node:
        in_id = input_node.get("id")
        model_id_node = model_node.get("id")
        out_id = output_node.get("id")

        for e in edges:
            src = e.get("source")
            tgt = e.get("target")
            if src == in_id and tgt == model_id_node:
                input_to_model_edge = True
            elif src == model_id_node and tgt == out_id:
                model_to_output_edge = True
            elif src == in_id and tgt == out_id:
                errors.append("Phát hiện cạnh nối tắt trực tiếp từ Web Input sang Output (không được phép bỏ qua Model Node).")
            elif tgt == in_id:
                errors.append("Phát hiện cạnh nối ngược về Web Input Node (không được phép tạo chu trình hoặc nối ngược).")

        if not input_to_model_edge:
            errors.append("Thiếu kết nối có hướng từ Web Input Node sang Model Node.")
        if not model_to_output_edge:
            errors.append("Thiếu kết nối có hướng từ Model Node sang Output Node.")

    # 3. Kiểm tra cấu hình Web Input Node
    max_words = 500
    if input_node:
        cfg = input_node.get("data", {}).get("config", {})
        try:
            max_words = int(cfg.get("max_words", 500))
            if max_words < 10 or max_words > 4000:
                errors.append(f"Giới hạn số từ (max_words) phải từ 10 đến 4000 từ (giá trị hiện tại: {max_words}).")
        except (ValueError, TypeError):
            errors.append("Tham số max_words của Web Input Node không phải là số hợp lệ.")

    # 4. Kiểm tra cấu hình Model Node
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
                if not check_provider_api_key(provider):
                    errors.append(f"Nhà cung cấp '{provider}' của mô hình '{model_rec.get('name')}' chưa được cấu hình API Key trên server.")

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
        "max_words_limit": max_words
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

    items = [format_project_response(r) for r in rows]
    total = total_row["count"] if total_row else len(items)

    return {
        "items": items,
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
    val_result = validate_project_graph(graph_dict)
    
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

    if not val_result["is_valid"]:
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

    val_result = validate_project_graph(payload.model_dump())
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

    # 1. Kiểm tra giới hạn từ của Web Input Node (PRJ-BR-008)
    max_words_limit = proj.get("max_words_limit") or 500
    actual_words = count_words(payload.message)
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

    # 3. Quản lý conversation
    conv_id = payload.conversation_id
    if not conv_id:
        conv_id = f"conv_{uuid.uuid4().hex}"
        execute_commit(
            "INSERT INTO conversations (id, user_id, project_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
            (conv_id, user_id, project_id, payload.message[:30] + "...")
        )

    # Lưu tin nhắn user
    execute_commit(
        "INSERT INTO messages (id, conversation_id, role, content, model_used) VALUES (?, ?, 'user', ?, ?)",
        (f"msg_{uuid.uuid4().hex}", conv_id, payload.message, target_model_id)
    )

    # Lấy ngữ cảnh hội thoại gần nhất (tối đa 20 tin nhắn)
    context_msgs = query_all(
        """
        SELECT role, content FROM messages
        WHERE conversation_id = ?
        ORDER BY created_at DESC
        LIMIT 20
        """,
        (conv_id,)
    )
    context_msgs.reverse()

    async def sse_stream_generator():
        start_payload = json.dumps({
            "project_id": project_id,
            "model": target_model_id,
            "conversation_id": conv_id
        }, ensure_ascii=False)
        yield f"event: start\ndata: {start_payload}\n\n"
        
        accumulated_chunks: List[str] = []
        final_model_used = target_model_id
        try:
            from llm.agent import chat_agent
            async for event in chat_agent.astream_agent(
                prompt=payload.message,
                history=context_msgs,
                model_override=target_model_id
            ):
                if event.get("status") == "streaming":
                    token_str = event.get("token", "")
                    if token_str:
                        accumulated_chunks.append(token_str)
                        chunk_payload = json.dumps({
                            "token": token_str,
                            "content": token_str,
                            "status": "streaming"
                        }, ensure_ascii=False)
                        yield f"event: chunk\ndata: {chunk_payload}\n\n"
                elif event.get("status") == "done":
                    final_model_used = event.get("model", final_model_used)
                elif event.get("status") == "error":
                    err_msg = event.get("message", "Lỗi sinh phản hồi từ mô hình")
                    err_payload = json.dumps({"status": "error", "message": err_msg}, ensure_ascii=False)
                    yield f"event: error\ndata: {err_payload}\n\n"
                    return
        except Exception as e:
            err_payload = json.dumps({"status": "error", "message": f"Dịch vụ AI tạm thời gián đoạn: {str(e)}"}, ensure_ascii=False)
            yield f"event: error\ndata: {err_payload}\n\n"
            return

        # Lưu tin nhắn assistant vào DB với nội dung text sạch (không chứa SSE headers)
        full_content = "".join(accumulated_chunks).strip()
        assistant_msg_id = f"msg_{uuid.uuid4().hex}"
        execute_commit(
            "INSERT INTO messages (id, conversation_id, role, content, model_used) VALUES (?, ?, 'assistant', ?, ?)",
            (assistant_msg_id, conv_id, full_content, final_model_used)
        )
        
        done_payload = json.dumps({
            "status": "done",
            "finish_reason": "stop",
            "message_id": assistant_msg_id,
            "model": final_model_used,
            "tokens_prompt": actual_words,
            "conversation_id": conv_id
        }, ensure_ascii=False)
        yield f"event: done\ndata: {done_payload}\n\n"

    return StreamingResponse(
        sse_stream_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
