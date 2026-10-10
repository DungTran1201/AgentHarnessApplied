import time
import json
import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field

from src.core.security import get_current_user
from src.core.dag_engine import (
    validate_pipeline_dag,
    get_or_create_default_pipeline,
    execute_pipeline_dag
)
from src.db import query_one, query_all, execute_commit, get_db_connection

bot_pipeline_router = APIRouter(prefix="/bot/discord/pipeline", tags=["Discord Bot Visual Pipeline"])

# ==============================================================================
# PYDANTIC SCHEMAS
# ==============================================================================

class PipelineNodeSchema(BaseModel):
    id: str
    node_type: str = Field(description="Loại khối: discord_ingress, model_binding, transform_filter, discord_egress")
    label: str
    position_x: float = 100.0
    position_y: float = 100.0
    config: Optional[Any] = Field(default_factory=dict)

class PipelineEdgeSchema(BaseModel):
    id: str
    source_node_id: str
    target_node_id: str
    source_handle: Optional[str] = "output"
    target_handle: Optional[str] = "input"

class SavePipelineRequest(BaseModel):
    name: Optional[str] = "Discord AI Pipeline"
    viewport_x: Optional[float] = 0.0
    viewport_y: Optional[float] = 0.0
    viewport_zoom: Optional[float] = 1.0
    nodes: List[PipelineNodeSchema]
    edges: List[PipelineEdgeSchema]

class ChangePipelineStateRequest(BaseModel):
    state: str = Field(pattern="^(STOPPED|RUNNING|PAUSED)$")

class ValidateDAGRequest(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]

class SimulateRunRequest(BaseModel):
    input_text: str = Field(min_length=1, max_length=2000, description="Nội dung tin nhắn thử nghiệm luồng")

# ==============================================================================
# HELPER FUNCTIONS
# ==============================================================================

def check_discord_linked(current_user: dict):
    """Kiểm tra điều kiện tiên quyết: tài khoản phải liên kết Discord (BR-031)."""
    if not current_user.get("discord_id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="DISCORD_NOT_LINKED"
        )

# ==============================================================================
# API ENDPOINTS (OP-035 -> OP-039)
# ==============================================================================

@bot_pipeline_router.get("")
@bot_pipeline_router.get("/")
async def get_bot_pipeline(current_user: dict = Depends(get_current_user)):
    """
    OP-035: Lấy cấu hình đồ thị Pipeline kéo thả hiện tại của người dùng (FR-048, FR-049).
    Tự động sinh Pipeline mẫu mặc định nếu tài khoản chưa có.
    """
    check_discord_linked(current_user)
    user_id = current_user["id"]
    pipeline_data = get_or_create_default_pipeline(user_id)

    # Bổ sung trạng thái hiển thị Discord Presence theo BR-038
    state = pipeline_data["state"]
    presence_map = {
        "RUNNING": {"status": "online", "color": "green", "label": "Online (Sẵn sàng phục vụ)"},
        "PAUSED": {"status": "idle", "color": "amber", "label": "Idle (Tạm dừng)"},
        "STOPPED": {"status": "invisible", "color": "grey", "label": "Offline (Đã dừng)"}
    }

    return {
        **pipeline_data,
        "presence": presence_map.get(state, presence_map["STOPPED"])
    }


@bot_pipeline_router.put("")
@bot_pipeline_router.put("/")
async def save_bot_pipeline(
    req: SavePipelineRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    OP-036: Lưu trữ và cập nhật cấu hình đồ thị Pipeline (nodes, edges, viewport).
    Tự động thẩm định chu trình lặp (BR-035) và ràng buộc mô hình ACTIVE (BR-037).
    """
    check_discord_linked(current_user)
    user_id = current_user["id"]

    # 1. Thẩm định DAG bằng Kahn's Algorithm
    raw_nodes = [n.model_dump() for n in req.nodes]
    raw_edges = [e.model_dump() for e in req.edges]

    is_valid, cycle_detected, cycle_path, topo_order, errors = validate_pipeline_dag(raw_nodes, raw_edges)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Cấu trúc đồ thị Pipeline không hợp lệ hoặc vi phạm quy tắc an toàn (BR-035, BR-037).",
                "errors": errors,
                "cycle_detected": cycle_detected,
                "cycle_path": cycle_path
            }
        )

    # 2. Lưu vào CSDL trong một transaction
    existing = query_one("SELECT id, state FROM bot_pipelines WHERE user_id = ?", (user_id,))
    if not existing:
        pipeline_id = str(uuid.uuid4())
        execute_commit(
            """
            INSERT INTO bot_pipelines (id, user_id, name, state, viewport_x, viewport_y, viewport_zoom, is_valid)
            VALUES (?, ?, ?, 'STOPPED', ?, ?, ?, 1)
            """,
            (pipeline_id, user_id, req.name, req.viewport_x, req.viewport_y, req.viewport_zoom)
        )
    else:
        pipeline_id = existing["id"]
        execute_commit(
            """
            UPDATE bot_pipelines
            SET name = ?, viewport_x = ?, viewport_y = ?, viewport_zoom = ?, is_valid = 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (req.name, req.viewport_x, req.viewport_y, req.viewport_zoom, pipeline_id)
        )

    with get_db_connection() as conn:
        cursor = conn.cursor()
        # Xóa các nodes và edges cũ
        cursor.execute("DELETE FROM pipeline_edges WHERE pipeline_id = ?", (pipeline_id,))
        cursor.execute("DELETE FROM pipeline_nodes WHERE pipeline_id = ?", (pipeline_id,))

        # Thêm các nodes mới
        for n in req.nodes:
            cfg_str = json.dumps(n.config) if isinstance(n.config, dict) else str(n.config or "{}")
            cursor.execute(
                """
                INSERT INTO pipeline_nodes (id, pipeline_id, node_type, label, position_x, position_y, config)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (n.id, pipeline_id, n.node_type, n.label, n.position_x, n.position_y, cfg_str)
            )

        # Thêm các edges mới
        for e in req.edges:
            cursor.execute(
                """
                INSERT INTO pipeline_edges (id, pipeline_id, source_node_id, target_node_id, source_handle, target_handle)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (e.id, pipeline_id, e.source_node_id, e.target_node_id, e.source_handle, e.target_handle)
            )
        conn.commit()

    return {
        "success": True,
        "message": "Đã lưu trữ và cập nhật Pipeline thành công.",
        "pipeline_id": pipeline_id,
        "nodes_count": len(req.nodes),
        "edges_count": len(req.edges),
        "is_valid": True
    }


@bot_pipeline_router.patch("/state")
async def change_pipeline_state(
    req: ChangePipelineStateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    OP-037: Điều khiển chuyển đổi 3 trạng thái vòng đời Pipeline (FR-050, FR-051, STATE-001, BR-036).
    Đồng bộ phản ánh màu sắc Discord Presence thời gian thực (BR-038).
    """
    check_discord_linked(current_user)
    user_id = current_user["id"]

    pipeline = query_one("SELECT * FROM bot_pipelines WHERE user_id = ?", (user_id,))
    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chưa tìm thấy Pipeline của người dùng. Vui lòng mở trang thiết lập trước."
        )

    pipeline_id = pipeline["id"]
    target_state = req.state.upper()

    # Nếu chuyển sang RUNNING, bắt buộc kiểm tra tính hợp lệ DAG (BR-035, BR-037)
    if target_state == "RUNNING":
        nodes = query_all("SELECT * FROM pipeline_nodes WHERE pipeline_id = ?", (pipeline_id,))
        edges = query_all("SELECT * FROM pipeline_edges WHERE pipeline_id = ?", (pipeline_id,))
        is_valid, cycle_detected, cycle_path, topo_order, errors = validate_pipeline_dag(nodes, edges)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Không thể khởi chạy Pipeline do đồ thị chưa hợp lệ: {'; '.join(errors)}"
            )

    execute_commit(
        "UPDATE bot_pipelines SET state = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (target_state, pipeline_id)
    )

    presence_map = {
        "RUNNING": {"status": "online", "color": "green", "label": "Online (Xanh lá - Sẵn sàng)"},
        "PAUSED": {"status": "idle", "color": "amber", "label": "Idle (Vàng cam - Tạm dừng)"},
        "STOPPED": {"status": "invisible", "color": "grey", "label": "Offline (Xám - Dừng hoạt động)"}
    }

    presence = presence_map[target_state]

    return {
        "success": True,
        "pipeline_id": pipeline_id,
        "previous_state": pipeline["state"],
        "state": target_state,
        "presence": presence,
        "message": f"Pipeline đã chuyển sang trạng thái {target_state}. Bot Discord hiển thị {presence['label']}."
    }


@bot_pipeline_router.post("/validate")
async def validate_dag_endpoint(
    req: ValidateDAGRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    OP-038: Thẩm định cấu trúc DAG tức thời từ Canvas UI (BR-035, SEC-014, NFR-026 <= 50ms).
    """
    check_discord_linked(current_user)
    t0 = time.perf_counter()

    is_valid, cycle_detected, cycle_path, topo_order, errors = validate_pipeline_dag(req.nodes, req.edges)
    elapsed_ms = (time.perf_counter() - t0) * 1000.0

    return {
        "is_valid": is_valid,
        "cycle_detected": cycle_detected,
        "cycle_path": cycle_path,
        "topo_order": topo_order,
        "errors": errors,
        "validation_time_ms": round(elapsed_ms, 2)
    }


@bot_pipeline_router.post("/simulate-run")
async def simulate_pipeline_run(
    req: SimulateRunRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    OP-039: Chạy thử nghiệm mô phỏng Pipeline từ bảng điều khiển (FR-052, UX-012, NFR-027 <= 30ms overhead).
    """
    check_discord_linked(current_user)
    user_id = current_user["id"]

    pipeline = query_one("SELECT * FROM bot_pipelines WHERE user_id = ?", (user_id,))
    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chưa tìm thấy Pipeline của người dùng để thực thi."
        )

    result = execute_pipeline_dag(
        pipeline_id=pipeline["id"],
        user_id=user_id,
        input_text=req.input_text,
        trigger_source="SIMULATION",
        is_simulation=True
    )

    return result


@bot_pipeline_router.get("/executions")
async def list_pipeline_executions(
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """
    Truy xuất danh sách các lượt thực thi gần nhất của Pipeline.
    """
    check_discord_linked(current_user)
    user_id = current_user["id"]

    pipeline = query_one("SELECT id FROM bot_pipelines WHERE user_id = ?", (user_id,))
    if not pipeline:
        return []

    executions = query_all(
        """
        SELECT id, trigger_source, input_message, output_message, model_used,
               tokens_consumed, pipeline_overhead_ms, llm_latency_ms, status, error_detail, created_at
        FROM pipeline_executions
        WHERE pipeline_id = ? AND user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
        """,
        (pipeline["id"], user_id, limit)
    )

    return executions
