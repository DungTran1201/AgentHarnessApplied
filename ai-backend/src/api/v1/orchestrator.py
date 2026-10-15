"""
AI-Chan Development Orchestrator — Workspace & Runner API
Path: ai-backend/src/api/v1/orchestrator.py
Implements: SRS-ORCH-01, API-ORCH-01, DOM-ORCH-01, ADR-015
"""

import os
import sys
import json
import uuid
import time
import secrets
import hashlib
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any, Set

from fastapi import APIRouter, HTTPException, status, Depends, Request, Query, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from src.core.config import settings
from src.core.security import decode_access_token, get_current_user
from src.db import get_db_connection, query_one, query_all, execute_commit

orchestrator_router = APIRouter(prefix="/orchestrator", tags=["Development Orchestrator"])

# ==============================================================================
# 1. IN-MEMORY RUNNER & TASK EVENT CHANNEL MANAGERS (OUTBOUND SSE / DISPATCH)
# ==============================================================================

class RunnerChannelManager:
    """Manages active outbound SSE connections from paired Agent Runners."""
    def __init__(self):
        # runner_id -> asyncio.Queue of messages
        self._queues: Dict[str, asyncio.Queue] = {}
        # runner_id -> connected timestamp
        self._connected_at: Dict[str, float] = {}

    def register(self, runner_id: str) -> asyncio.Queue:
        q = asyncio.Queue()
        self._queues[runner_id] = q
        self._connected_at[runner_id] = time.time()
        return q

    def unregister(self, runner_id: str):
        self._queues.pop(runner_id, None)
        self._connected_at.pop(runner_id, None)

    def is_connected(self, runner_id: str) -> bool:
        return runner_id in self._queues

    async def send_event(self, runner_id: str, event_type: str, data: Dict[str, Any]) -> bool:
        q = self._queues.get(runner_id)
        if q:
            await q.put({"event": event_type, "data": data})
            return True
        return False

runner_channel_mgr = RunnerChannelManager()


class TaskEventBroadcaster:
    """Manages active browser SSE subscribers listening to a task's real-time events."""
    def __init__(self):
        # task_id -> set of asyncio.Queue
        self._subscribers: Dict[str, Set[asyncio.Queue]] = {}

    def subscribe(self, task_id: str) -> asyncio.Queue:
        if task_id not in self._subscribers:
            self._subscribers[task_id] = set()
        q = asyncio.Queue()
        self._subscribers[task_id].add(q)
        return q

    def unsubscribe(self, task_id: str, q: asyncio.Queue):
        if task_id in self._subscribers:
            self._subscribers[task_id].discard(q)
            if not self._subscribers[task_id]:
                del self._subscribers[task_id]

    async def broadcast(self, task_id: str, event_data: Dict[str, Any]):
        queues = list(self._subscribers.get(task_id, set()))
        for q in queues:
            await q.put(event_data)

task_event_broadcaster = TaskEventBroadcaster()

# ==============================================================================
# 2. AUTHENTICATION & IDENTITY HELPERS
# ==============================================================================

GUEST_USER_ID = "guest_user"

async def get_orchestrator_user(request: Request) -> Dict[str, Any]:
    """
    Extracts authenticated user from Cookie or Authorization header.
    Falls back to guest_user for seamless local development, matching projects.py pattern.
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

    guest = query_one("SELECT * FROM users WHERE id = ?", (GUEST_USER_ID,))
    if not guest:
        execute_commit(
            "INSERT OR IGNORE INTO users (id, email, full_name, username, status) VALUES (?, ?, ?, ?, ?)",
            (GUEST_USER_ID, "guest@ai-chan.vn", "Khách Vãng Lai", "guest", "ACTIVE")
        )
        guest = query_one("SELECT * FROM users WHERE id = ?", (GUEST_USER_ID,))
    return dict(guest) if guest else {"id": GUEST_USER_ID, "email": "guest@ai-chan.vn"}


async def get_authenticated_runner(request: Request, runner_id: str) -> Dict[str, Any]:
    """
    Validates Runner bearer credentials (rsk_...) and ensures runner is not REVOKED.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Runner Bearer authorization."
        )

    runner_secret = auth_header.split(" ")[1]
    secret_hash = hashlib.sha256(runner_secret.encode("utf-8")).hexdigest()

    runner = query_one("SELECT * FROM agent_runners WHERE id = ?", (runner_id,))
    if not runner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Runner '{runner_id}' not found."
        )

    if runner.get("status") == "REVOKED":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Runner access has been revoked."
        )

    if runner.get("secret_hash") != secret_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid runner secret credentials."
        )

    return dict(runner)

# ==============================================================================
# 3. PYDANTIC SCHEMAS
# ==============================================================================

class WorkspaceCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Tên workspace")
    local_path: str = Field(..., min_length=1, max_length=1024, description="Đường dẫn cục bộ trên máy Runner")
    runner_id: Optional[str] = Field(None, description="UUID của Runner liên kết")
    git_remote_url: Optional[str] = Field(None, max_length=512, description="Git remote URL")
    default_branch: Optional[str] = Field("main", max_length=100, description="Nhánh Git mặc định")
    verification_policy: Optional[Dict[str, Any]] = Field(None, description="Chính sách kiểm thử (test, lint, typecheck, build)")

class WorkspaceUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    runner_id: Optional[str] = None
    git_remote_url: Optional[str] = None
    default_branch: Optional[str] = None
    verification_policy: Optional[Dict[str, Any]] = None

class RunnerPairingTokenCreateRequest(BaseModel):
    label: Optional[str] = Field(None, max_length=100, description="Tên gợi nhớ cho máy Runner")

class RunnerPairRequest(BaseModel):
    pairing_token: str = Field(..., description="Mã ghép nối 1 lần rpt_...")
    name: str = Field(..., min_length=1, max_length=100, description="Tên hiển thị của Runner")
    machine_name: str = Field(..., max_length=100, description="Hostname của máy")
    platform: str = Field(..., max_length=50, description="Hệ điều hành (windows, darwin, linux)")
    architecture: str = Field(..., max_length=30, description="Kiến trúc CPU (x86_64, arm64)")
    capabilities: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Các CLI đã cài đặt")
    system_info: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Thông số phần cứng")

class RunnerHeartbeatRequest(BaseModel):
    cpu_percent: Optional[float] = None
    memory_percent: Optional[float] = None
    active_task_id: Optional[str] = None
    capabilities_hash: Optional[str] = None

class WorkspaceValidationResultRequest(BaseModel):
    challenge_id: Optional[str] = None
    workspace_id: str
    is_valid: bool
    is_git_repo: bool
    default_branch: Optional[str] = "main"
    last_commit_hash: Optional[str] = None
    has_uncommitted_changes: bool = False
    error_message: Optional[str] = None

# ==============================================================================
# 4. HEALTH / DIAGNOSTIC ENDPOINT
# ==============================================================================

@orchestrator_router.get("/health", summary="Healthcheck Orchestrator Subsystem")
async def orchestrator_health():
    ws_count = query_one("SELECT COUNT(*) as cnt FROM development_workspaces")
    runners_count = query_one("SELECT COUNT(*) as cnt FROM agent_runners")
    return {
        "status": "healthy",
        "subsystem": "development_orchestrator",
        "workspaces_count": ws_count["cnt"] if ws_count else 0,
        "runners_count": runners_count["cnt"] if runners_count else 0,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# ==============================================================================
# 5. RUNNER LIFECYCLE & PAIRING ENDPOINTS
# ==============================================================================

@orchestrator_router.post("/runners/pairing-token", summary="Tạo Pairing Token 15 phút (User Auth)")
async def create_pairing_token(
    payload: RunnerPairingTokenCreateRequest,
    user: Dict = Depends(get_orchestrator_user)
):
    token = f"rpt_{secrets.token_hex(16)}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    execute_commit(
        """
        INSERT INTO runner_pairing_tokens (token, user_id, label, is_used, expires_at)
        VALUES (?, ?, ?, 0, ?)
        """,
        (token, user["id"], payload.label, expires_at.isoformat())
    )

    base_url = "http://localhost:8000"
    cli_cmd = f"python -m runner pair --server {base_url} --token {token}"

    return {
        "pairing_token": token,
        "expires_at": expires_at.isoformat(),
        "ttl_seconds": 900,
        "cli_command": cli_cmd
    }


@orchestrator_router.post("/runners/pair", summary="Bắt tay ghép nối Runner (Token Auth)")
async def pair_runner(payload: RunnerPairRequest):
    # 1. Kiểm tra tính hợp lệ của pairing token
    token_row = query_one(
        "SELECT * FROM runner_pairing_tokens WHERE token = ?",
        (payload.pairing_token,)
    )
    if not token_row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pairing token không tồn tại."
        )

    if token_row.get("is_used", 0) == 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Pairing token đã được sử dụng."
        )

    # Kiểm tra hạn dùng
    expires_at_str = token_row.get("expires_at")
    if expires_at_str:
        # SQLite string date check
        now_iso = datetime.now(timezone.utc).isoformat()
        if expires_at_str < now_iso:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Pairing token đã hết hạn (TTL 15 phút)."
            )

    user_id = token_row["user_id"]

    # 2. Sinh Runner ID & Runner Secret vĩnh viễn
    runner_id = str(uuid.uuid4())
    runner_secret = f"rsk_{secrets.token_hex(24)}"
    secret_hash = hashlib.sha256(runner_secret.encode("utf-8")).hexdigest()

    # 3. Đánh dấu token đã dùng & Lưu Runner trong transaction
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute("UPDATE runner_pairing_tokens SET is_used = 1 WHERE token = ?", (payload.pairing_token,))
        cur.execute(
            """
            INSERT INTO agent_runners (
                id, user_id, name, machine_name, platform, architecture,
                status, secret_hash, capabilities, system_info, last_heartbeat_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'ONLINE', ?, ?, ?, CURRENT_TIMESTAMP)
            """,
            (
                runner_id,
                user_id,
                payload.name,
                payload.machine_name,
                payload.platform,
                payload.architecture,
                secret_hash,
                json.dumps(payload.capabilities or {}),
                json.dumps(payload.system_info or {})
            )
        )
        conn.commit()

    return {
        "runner_id": runner_id,
        "runner_secret": runner_secret,
        "heartbeat_interval_seconds": 25,
        "channel_url": f"/api/v1/orchestrator/runners/{runner_id}/channel"
    }


@orchestrator_router.get("/runners", summary="Danh sách Runner của User")
async def list_runners(user: Dict = Depends(get_orchestrator_user)):
    rows = query_all(
        """
        SELECT id, name, machine_name, platform, architecture, status,
               capabilities, system_info, last_heartbeat_at, created_at
        FROM agent_runners
        WHERE user_id = ?
        ORDER BY created_at DESC
        """,
        (user["id"],)
    )

    items = []
    now = datetime.now(timezone.utc)
    for r in rows:
        item = dict(r)
        try:
            item["capabilities"] = json.loads(item["capabilities"]) if item.get("capabilities") else {}
        except Exception:
            item["capabilities"] = {}
        try:
            item["system_info"] = json.loads(item["system_info"]) if item.get("system_info") else {}
        except Exception:
            item["system_info"] = {}

        # Tính toán trạng thái OFFLINE động nếu quá 60s không heartbeat
        if item["status"] == "ONLINE":
            lh_str = item.get("last_heartbeat_at")
            if lh_str:
                try:
                    # Clean up iso timestamp
                    clean_ts = lh_str.replace(" ", "T")
                    if not clean_ts.endswith("Z") and "+" not in clean_ts:
                        clean_ts += "+00:00"
                    lh_dt = datetime.fromisoformat(clean_ts)
                    if (now - lh_dt).total_seconds() > 60:
                        item["status"] = "OFFLINE"
                except Exception:
                    pass

        # Check real-time channel connection
        item["is_channel_connected"] = runner_channel_mgr.is_connected(item["id"])
        items.append(item)

    return {"total": len(items), "items": items}


@orchestrator_router.get("/runners/{id}", summary="Chi tiết Runner")
async def get_runner_detail(id: str, user: Dict = Depends(get_orchestrator_user)):
    row = query_one(
        "SELECT * FROM agent_runners WHERE id = ? AND user_id = ?",
        (id, user["id"])
    )
    if not row:
        raise HTTPException(status_code=404, detail="Runner không tồn tại hoặc không thuộc quyền sở hữu.")

    res = dict(row)
    res.pop("secret_hash", None) # Bảo mật: không bao giờ trả hash ra ngoài
    try:
        res["capabilities"] = json.loads(res["capabilities"]) if res.get("capabilities") else {}
    except Exception:
        res["capabilities"] = {}
    try:
        res["system_info"] = json.loads(res["system_info"]) if res.get("system_info") else {}
    except Exception:
        res["system_info"] = {}
    return res


@orchestrator_router.post("/runners/{id}/heartbeat", summary="Runner gửi Heartbeat định kỳ")
async def runner_heartbeat(
    id: str,
    payload: RunnerHeartbeatRequest,
    request: Request
):
    await get_authenticated_runner(request, id)

    execute_commit(
        """
        UPDATE agent_runners
        SET last_heartbeat_at = CURRENT_TIMESTAMP,
            status = 'ONLINE',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        (id,)
    )

    return {
        "status": "ACK",
        "server_time": datetime.now(timezone.utc).isoformat()
    }


@orchestrator_router.post("/runners/{id}/revoke", summary="Thu hồi quyền Runner (User Action)")
async def revoke_runner(id: str, user: Dict = Depends(get_orchestrator_user)):
    runner = query_one("SELECT * FROM agent_runners WHERE id = ? AND user_id = ?", (id, user["id"]))
    if not runner:
        raise HTTPException(status_code=404, detail="Runner không tồn tại.")

    execute_commit(
        "UPDATE agent_runners SET status = 'REVOKED', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (id,)
    )

    # Đưa các workspace liên kết sang trạng thái UNAVAILABLE
    execute_commit(
        "UPDATE development_workspaces SET status = 'UNAVAILABLE' WHERE runner_id = ?",
        (id,)
    )

    runner_channel_mgr.unregister(id)

    return {
        "runner_id": id,
        "status": "REVOKED",
        "message": "Runner đã bị thu hồi quyền truy cập vĩnh viễn."
    }


@orchestrator_router.delete("/runners/{id}", summary="Xóa hẳn Runner (Hard Delete)")
async def delete_runner(id: str, user: Dict = Depends(get_orchestrator_user)):
    runner = query_one("SELECT * FROM agent_runners WHERE id = ? AND user_id = ?", (id, user["id"]))
    if not runner:
        raise HTTPException(status_code=404, detail="Runner không tồn tại.")

    execute_commit(
        "UPDATE development_workspaces SET runner_id = NULL WHERE runner_id = ?",
        (id,)
    )
    execute_commit(
        "DELETE FROM workspace_validations WHERE runner_id = ?",
        (id,)
    )
    execute_commit(
        "DELETE FROM agent_runners WHERE id = ?",
        (id,)
    )
    runner_channel_mgr.unregister(id)

    return {
        "runner_id": id,
        "deleted": True,
        "message": "Đã xóa vĩnh viễn Runner khỏi hệ thống."
    }


@orchestrator_router.post("/runners/purge-revoked", summary="Dọn dẹp tất cả Runner đã bị thu hồi")
async def purge_revoked_runners(user: Dict = Depends(get_orchestrator_user)):
    execute_commit(
        "UPDATE development_workspaces SET runner_id = NULL WHERE runner_id IN (SELECT id FROM agent_runners WHERE status = 'REVOKED' AND user_id = ?)",
        (user["id"],)
    )
    execute_commit(
        "DELETE FROM agent_runners WHERE status = 'REVOKED' AND user_id = ?",
        (user["id"],)
    )
    return {"message": "Đã dọn dẹp sạch các Runner đã thu hồi."}


@orchestrator_router.get("/runners/{id}/channel", summary="Kênh Outbound SSE Task/Challenge cho Runner")
async def runner_sse_channel(id: str, request: Request):
    await get_authenticated_runner(request, id)
    q = runner_channel_mgr.register(id)

    async def event_generator():
        yield f"event: connected\ndata: {json.dumps({'runner_id': id, 'time': datetime.now(timezone.utc).isoformat()})}\n\n"
        try:
            while True:
                try:
                    # Chờ challenge / task trong tối đa 15 giây, sau đó gửi ping
                    item = await asyncio.wait_for(q.get(), timeout=15.0)
                    ev_type = item.get("event", "message")
                    ev_data = json.dumps(item.get("data", {}))
                    yield f"event: {ev_type}\ndata: {ev_data}\n\n"
                except asyncio.TimeoutError:
                    # Gửi heartbeat ping giữ kết nối
                    yield f"event: ping\ndata: {json.dumps({'time': datetime.now(timezone.utc).isoformat()})}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            runner_channel_mgr.unregister(id)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@orchestrator_router.post("/runners/{id}/validation-result", summary="Runner trả kết quả kiểm tra Workspace")
async def submit_validation_result(
    id: str,
    payload: WorkspaceValidationResultRequest,
    request: Request
):
    await get_authenticated_runner(request, id)

    ws = query_one("SELECT * FROM development_workspaces WHERE id = ?", (payload.workspace_id,))
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace không tồn tại.")

    new_status = "READY"
    if not payload.is_valid:
        new_status = "UNAVAILABLE"
    elif not payload.is_git_repo:
        new_status = "NON_GIT_READY"

    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE development_workspaces
            SET status = ?,
                is_git_repo = ?,
                default_branch = COALESCE(?, default_branch),
                last_commit_hash = ?,
                last_validated_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (
                new_status,
                1 if payload.is_git_repo else 0,
                payload.default_branch,
                payload.last_commit_hash,
                payload.workspace_id
            )
        )
        cur.execute(
            """
            INSERT INTO workspace_validations (
                id, workspace_id, runner_id, status, branch_detected,
                has_uncommitted_changes, error_message, validated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """,
            (
                str(uuid.uuid4()),
                payload.workspace_id,
                id,
                "SUCCESS" if payload.is_valid else "FAILED",
                payload.default_branch,
                1 if payload.has_uncommitted_changes else 0,
                payload.error_message
            )
        )
        conn.commit()

    return {
        "acknowledged": True,
        "workspace_id": payload.workspace_id,
        "status": new_status
    }

# ==============================================================================
# 6. WORKSPACE MANAGEMENT ENDPOINTS
# ==============================================================================

@orchestrator_router.post("/workspaces", status_code=status.HTTP_201_CREATED, summary="Tạo Workspace mới")
async def create_workspace(
    payload: WorkspaceCreateRequest,
    user: Dict = Depends(get_orchestrator_user)
):
    # Tự động kích hoạt lại Runner nếu người dùng chọn runner này
    if payload.runner_id:
        runner = query_one(
            "SELECT * FROM agent_runners WHERE id = ? AND user_id = ?",
            (payload.runner_id, user["id"])
        )
        if runner and runner.get("status") == "REVOKED":
            execute_commit(
                "UPDATE agent_runners SET status = 'ONLINE', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (payload.runner_id,)
            )

    ws_id = str(uuid.uuid4())
    initial_status = "READY" if payload.runner_id else "PENDING_VALIDATION"

    verif_policy_json = json.dumps(payload.verification_policy) if payload.verification_policy else None

    execute_commit(
        """
        INSERT INTO development_workspaces (
            id, user_id, runner_id, name, local_path, git_remote_url,
            default_branch, verification_policy, status, is_git_repo, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """,
        (
            ws_id,
            user["id"],
            payload.runner_id,
            payload.name,
            payload.local_path,
            payload.git_remote_url,
            payload.default_branch or "main",
            verif_policy_json,
            initial_status
        )
    )

    # Nếu Runner online, gửi challenge xác thực qua channel trong nền
    if payload.runner_id and runner_channel_mgr.is_connected(payload.runner_id):
        await runner_channel_mgr.send_event(
            payload.runner_id,
            "validate_workspace",
            {
                "challenge_id": str(uuid.uuid4()),
                "workspace_id": ws_id,
                "local_path": payload.local_path
            }
        )

    row = query_one("SELECT * FROM development_workspaces WHERE id = ?", (ws_id,))
    return dict(row)


@orchestrator_router.get("/workspaces", summary="Danh sách Workspace")
async def list_workspaces(
    status_filter: Optional[str] = Query(None, alias="status"),
    runner_id: Optional[str] = None,
    user: Dict = Depends(get_orchestrator_user)
):
    if user["id"] == GUEST_USER_ID:
        sql = """
            SELECT w.*, r.name as runner_name, r.status as runner_status, r.machine_name
            FROM development_workspaces w
            LEFT JOIN agent_runners r ON w.runner_id = r.id
        """
        params = []
        if status_filter or runner_id:
            sql += " WHERE 1=1"
            if status_filter:
                sql += " AND w.status = ?"
                params.append(status_filter)
            if runner_id:
                sql += " AND w.runner_id = ?"
                params.append(runner_id)
        sql += " ORDER BY w.created_at DESC"
        rows = query_all(sql, tuple(params))
    else:
        sql = """
            SELECT w.*, r.name as runner_name, r.status as runner_status, r.machine_name
            FROM development_workspaces w
            LEFT JOIN agent_runners r ON w.runner_id = r.id
            WHERE w.user_id = ?
        """
        params = [user["id"]]
        if status_filter:
            sql += " AND w.status = ?"
            params.append(status_filter)
        if runner_id:
            sql += " AND w.runner_id = ?"
            params.append(runner_id)
        sql += " ORDER BY w.created_at DESC"
        rows = query_all(sql, tuple(params))

    rows_data = [dict(r) for r in rows]
    return {"total": len(rows), "items": rows_data, "workspaces": rows_data}


@orchestrator_router.get("/workspaces/{id}", summary="Chi tiết Workspace")
async def get_workspace(id: str, user: Dict = Depends(get_orchestrator_user)):
    if user["id"] == GUEST_USER_ID:
        row = query_one(
            """
            SELECT w.*, r.name as runner_name, r.status as runner_status, r.machine_name, r.platform
            FROM development_workspaces w
            LEFT JOIN agent_runners r ON w.runner_id = r.id
            WHERE w.id = ?
            """,
            (id,)
        )
    else:
        row = query_one(
            """
            SELECT w.*, r.name as runner_name, r.status as runner_status, r.machine_name, r.platform
            FROM development_workspaces w
            LEFT JOIN agent_runners r ON w.runner_id = r.id
            WHERE w.id = ? AND w.user_id = ?
            """,
            (id, user["id"])
        )
    if not row:
        raise HTTPException(status_code=404, detail="Workspace không tồn tại.")

    # Lấy lịch sử validation gần nhất
    validations = query_all(
        "SELECT * FROM workspace_validations WHERE workspace_id = ? ORDER BY validated_at DESC LIMIT 5",
        (id,)
    )

    res = dict(row)
    res["validations"] = [dict(v) for v in validations]
    return res


@orchestrator_router.put("/workspaces/{id}", summary="Cập nhật Workspace")
async def update_workspace(
    id: str,
    payload: WorkspaceUpdateRequest,
    user: Dict = Depends(get_orchestrator_user)
):
    ws = query_one("SELECT * FROM development_workspaces WHERE id = ? AND user_id = ?", (id, user["id"]))
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace không tồn tại.")

    if payload.runner_id:
        runner = query_one("SELECT * FROM agent_runners WHERE id = ? AND user_id = ?", (payload.runner_id, user["id"]))
        if not runner:
            raise HTTPException(status_code=404, detail="Runner mới không tồn tại.")

    updates = []
    params = []
    if payload.name is not None:
        updates.append("name = ?")
        params.append(payload.name)
    if payload.runner_id is not None:
        updates.append("runner_id = ?")
        params.append(payload.runner_id)
        updates.append("status = 'PENDING_VALIDATION'") # Trigger recheck when runner changes
    if payload.git_remote_url is not None:
        updates.append("git_remote_url = ?")
        params.append(payload.git_remote_url)
    if payload.default_branch is not None:
        updates.append("default_branch = ?")
        params.append(payload.default_branch)
    if payload.verification_policy is not None:
        updates.append("verification_policy = ?")
        params.append(json.dumps(payload.verification_policy) if payload.verification_policy else None)

    if updates:
        updates.append("updated_at = CURRENT_TIMESTAMP")
        params.append(id)
        execute_commit(
            f"UPDATE development_workspaces SET {', '.join(updates)} WHERE id = ?",
            tuple(params)
        )

    # Nếu vừa gán runner mới và runner đang online, gửi ngay challenge xác thực
    if payload.runner_id and runner_channel_mgr.is_connected(payload.runner_id):
        await runner_channel_mgr.send_event(
            payload.runner_id,
            "validate_workspace",
            {
                "challenge_id": str(uuid.uuid4()),
                "workspace_id": id,
                "local_path": ws["local_path"]
            }
        )

    updated = query_one("SELECT * FROM development_workspaces WHERE id = ?", (id,))
    return dict(updated)


@orchestrator_router.post("/workspaces/{id}/validate", summary="Kích hoạt kiểm tra Workspace thủ công")
async def trigger_workspace_validation(
    id: str,
    user: Dict = Depends(get_orchestrator_user)
):
    ws = query_one("SELECT * FROM development_workspaces WHERE id = ? AND user_id = ?", (id, user["id"]))
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace không tồn tại.")

    runner_id = ws.get("runner_id")
    if not runner_id:
        raise HTTPException(
            status_code=400,
            detail="Workspace chưa được gắn với Agent Runner nào. Hãy chọn Runner trước."
        )

    runner = query_one("SELECT * FROM agent_runners WHERE id = ?", (runner_id,))
    if not runner or runner.get("status") != "ONLINE":
        execute_commit(
            "UPDATE development_workspaces SET status = 'UNAVAILABLE', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (id,)
        )
        raise HTTPException(
            status_code=400,
            detail="Runner liên kết hiện đang Offline. Không thể kiểm tra đường dẫn."
        )

    execute_commit(
        "UPDATE development_workspaces SET status = 'PENDING_VALIDATION', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (id,)
    )

    challenge_id = str(uuid.uuid4())
    sent = await runner_channel_mgr.send_event(
        runner_id,
        "validate_workspace",
        {
            "challenge_id": challenge_id,
            "workspace_id": id,
            "local_path": ws["local_path"]
        }
    )

    return {
        "workspace_id": id,
        "challenge_id": challenge_id,
        "status": "PENDING_VALIDATION",
        "dispatched_to_channel": sent,
        "message": "Yêu cầu kiểm tra đã được gửi tới Runner."
    }


@orchestrator_router.post("/workspaces/{id}/disable", summary="Tạm dừng / Bật lại Workspace")
async def toggle_workspace_disabled(
    id: str,
    user: Dict = Depends(get_orchestrator_user)
):
    ws = query_one("SELECT * FROM development_workspaces WHERE id = ? AND user_id = ?", (id, user["id"]))
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace không tồn tại.")

    new_status = "READY" if ws["status"] == "DISABLED" else "DISABLED"
    execute_commit(
        "UPDATE development_workspaces SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (new_status, id)
    )
    return {"workspace_id": id, "status": new_status}


@orchestrator_router.delete("/workspaces/{id}", summary="Xóa Workspace")
async def delete_workspace(id: str, user: Dict = Depends(get_orchestrator_user)):
    ws = query_one("SELECT * FROM development_workspaces WHERE id = ? AND user_id = ?", (id, user["id"]))
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace không tồn tại.")

    execute_commit("DELETE FROM development_workspaces WHERE id = ?", (id,))
    return {"success": True, "message": "Workspace đã được xóa thành công."}


@orchestrator_router.post("/workspaces/{id}/open-ide", summary="Mở Workspace trên máy host")
async def open_workspace_in_ide(id: str, user: Dict = Depends(get_orchestrator_user)):
    ws = query_one(
        "SELECT * FROM development_workspaces WHERE id = ? AND (user_id = ? OR user_id = 'guest_user')",
        (id, user["id"])
    )
    if not ws:
        ws = query_one("SELECT * FROM development_workspaces WHERE id = ?", (id,))
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace không tồn tại.")

    local_path = ws["local_path"]
    if not os.path.exists(local_path):
        raise HTTPException(status_code=400, detail=f"Thư mục không tồn tại trên máy: {local_path}")

    opened = False
    message = f"Workspace path: {local_path}"
    if sys.platform == "win32":
        try:
            os.startfile(local_path)
            opened = True
            message = f"Đã mở thư mục '{local_path}' trên hệ thống."
        except Exception as e:
            message = f"Không thể tự động mở: {str(e)}"

    return {
        "success": True,
        "path": local_path,
        "opened": opened,
        "message": message
    }


# ==============================================================================
# 5. DEVELOPMENT TASK SCHEMAS & MANAGEMENT APIS (PROMPT 05)
# ==============================================================================

class CreateTaskRequest(BaseModel):
    project_id: Optional[str] = None
    workspace_id: str
    title: str = Field(..., min_length=1, max_length=200)
    prompt: str = Field(..., min_length=1)
    runtime: str = "antigravity"
    mode: str = "plan"  # "plan" | "accept-edits"
    auto_dispatch: bool = False


class TaskApprovalRequest(BaseModel):
    decision: str  # "APPROVED" | "REJECTED"
    reason: Optional[str] = None


class TaskCancelRequest(BaseModel):
    reason: Optional[str] = "User cancelled task execution."


class TaskReviewRequest(BaseModel):
    decision: str  # "APPROVE" | "ACCEPT" | "REQUEST_CHANGES" | "REJECT"
    feedback: Optional[str] = None
    commit_message: Optional[str] = None


class VerificationStepPayload(BaseModel):
    step_name: str
    command: str
    status: str  # "PASSED" | "FAILED" | "ERROR" | "SKIPPED_BY_POLICY" | "NOT_RUN"
    exit_code: Optional[int] = 0
    duration_seconds: Optional[float] = 0.0
    stdout_preview: Optional[str] = ""
    stderr_preview: Optional[str] = ""


class RunnerVerificationReportRequest(BaseModel):
    attempt_id: str
    steps: List[VerificationStepPayload]
    overall_status: Optional[str] = "PASSED"


class NormalizedEventPayload(BaseModel):
    event_id: str
    sequence_number: int
    task_id: str
    attempt_id: str
    runner_id: Optional[str] = None
    runtime: Optional[str] = "antigravity"
    event_type: str
    severity: str = "INFO"
    payload: Dict[str, Any] = Field(default_factory=dict)
    timestamp: Optional[str] = None


class RunnerBatchEventsRequest(BaseModel):
    attempt_id: str
    events: List[NormalizedEventPayload]


class RunnerTaskCompleteRequest(BaseModel):
    attempt_id: str
    status: str  # "COMPLETED" | "FAILED" | "CANCELLED"
    exit_code: Optional[int] = 0
    duration_seconds: Optional[float] = None
    tokens_in: Optional[int] = None
    tokens_out: Optional[int] = None
    cost_estimate: Optional[float] = None
    head_commit: Optional[str] = None
    summary: Optional[str] = None
    error_message: Optional[str] = None
    artifacts: Optional[List[Dict[str, Any]]] = None
    worktree_path: Optional[str] = None
    is_isolated: Optional[bool] = None
    diff_stat: Optional[str] = None


async def _dispatch_task_internal(task_id: str, user_id: str, mode: str = "plan") -> Dict[str, Any]:
    """Helper implementing strict lifecycle guard and runner dispatching."""
    task = query_one("SELECT * FROM development_tasks WHERE id = ? AND user_id = ?", (task_id, user_id))
    if not task:
        raise HTTPException(status_code=404, detail="Task không tồn tại hoặc không thuộc quyền sở hữu.")

    if task["status"] in ("QUEUED", "DISPATCHING", "PLANNING", "RUNNING", "AWAITING_APPROVAL"):
        raise HTTPException(
            status_code=409,
            detail=f"Task đang trong trạng thái '{task['status']}', không thể dispatch lại."
        )

    ws = query_one(
        "SELECT * FROM development_workspaces WHERE id = ? AND user_id = ?",
        (task["workspace_id"], user_id)
    )
    if not ws:
        raise HTTPException(status_code=400, detail="Workspace liên kết không tồn tại.")
    if ws["status"] == "DISABLED":
        raise HTTPException(status_code=400, detail="Workspace đang bị tạm dừng (DISABLED).")

    if not ws.get("runner_id"):
        raise HTTPException(status_code=400, detail="Workspace chưa được gắn với Agent Runner nào.")

    # Concurrency guard: Only 1 active mutating task per workspace
    active_ws_task = query_one(
        """
        SELECT id, title, status FROM development_tasks 
        WHERE workspace_id = ? AND id != ? 
          AND status IN ('QUEUED', 'DISPATCHING', 'PLANNING', 'RUNNING', 'AWAITING_APPROVAL', 'VERIFYING')
        LIMIT 1
        """,
        (ws["id"], task_id)
    )
    if active_ws_task:
        raise HTTPException(
            status_code=409,
            detail=f"Workspace '{ws['name']}' đang bận thực thi tác vụ khác ({active_ws_task['id']}: {active_ws_task['title']}). Mỗi workspace chỉ cho phép tối đa 1 task thực thi đồng thời để đảm bảo an toàn Git."
        )

    runner = query_one(
        "SELECT * FROM agent_runners WHERE id = ?",
        (ws["runner_id"],)
    )
    if not runner:
        raise HTTPException(status_code=400, detail="Agent Runner liên kết không tồn tại.")
    if runner.get("status") == "REVOKED":
        execute_commit("UPDATE agent_runners SET status = 'ONLINE', updated_at = CURRENT_TIMESTAMP WHERE id = ?", (runner["id"],))

    # Calculate monotonic attempt index
    prev_max_row = query_one(
        "SELECT COALESCE(MAX(attempt_number), 0) as max_att FROM task_attempts WHERE task_id = ?",
        (task_id,)
    )
    attempt_number = (prev_max_row["max_att"] if prev_max_row else 0) + 1
    attempt_id = f"att_{uuid.uuid4().hex[:16]}"
    git_branch = f"ai-chan/task-{task_id[:8]}"

    execute_commit(
        """
        INSERT INTO task_attempts (
            id, task_id, attempt_number, runner_id, runtime, mode, status, git_branch, started_at
        ) VALUES (?, ?, ?, ?, 'antigravity', ?, 'DISPATCHING', ?, CURRENT_TIMESTAMP)
        """,
        (attempt_id, task_id, attempt_number, runner["id"], mode, git_branch)
    )

    execute_commit(
        """
        UPDATE development_tasks 
        SET status = 'QUEUED', current_attempt_id = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
        """,
        (attempt_id, task_id)
    )

    # Parse workspace verification policy if configured
    verif_policy = {}
    if ws.get("verification_policy"):
        try:
            verif_policy = json.loads(ws["verification_policy"])
        except Exception:
            pass

    # Dispatch to Runner via outbound channel
    dispatched = await runner_channel_mgr.send_event(
        runner["id"],
        "TASK_DISPATCH",
        {
            "task_id": task_id,
            "attempt_id": attempt_id,
            "attempt_number": attempt_number,
            "workspace_id": ws["id"],
            "local_path": ws["local_path"],
            "git_branch": git_branch,
            "runtime": "antigravity",
            "mode": mode,
            "title": task["title"],
            "prompt": task["prompt"],
            "verification_policy": verif_policy
        }
    )

    return {
        "task_id": task_id,
        "attempt_id": attempt_id,
        "attempt_number": attempt_number,
        "status": "QUEUED",
        "runner_id": runner["id"],
        "channel_dispatched": dispatched,
        "message": "Task đã được đưa vào hàng đợi thực thi."
    }


@orchestrator_router.post("/tasks", status_code=201, summary="Tạo mới Development Task")
async def create_task(
    body: CreateTaskRequest,
    request: Request,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    user: Dict = Depends(get_orchestrator_user)
):
    # Idempotency deduplication
    if idempotency_key:
        existing = query_one(
            "SELECT * FROM development_tasks WHERE idempotency_key = ? AND user_id = ?",
            (idempotency_key, user["id"])
        )
        if existing:
            return dict(existing)

    ws = query_one(
        "SELECT * FROM development_workspaces WHERE id = ? AND (user_id = ? OR user_id = 'guest_user')",
        (body.workspace_id, user["id"])
    )
    if not ws:
        ws = query_one("SELECT * FROM development_workspaces WHERE id = ?", (body.workspace_id,))
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace không tồn tại hoặc không thuộc quyền sở hữu.")

    task_id = f"tsk_{uuid.uuid4().hex[:16]}"
    
    # Tự động gán project nếu không truyền hoặc rỗng
    proj_id = body.project_id
    if not proj_id or not proj_id.strip():
        first_proj = query_one(
            "SELECT id FROM projects WHERE (user_id = ? OR user_id = 'guest_user') AND status != 'DELETED' ORDER BY updated_at DESC LIMIT 1",
            (user["id"],)
        )
        if not first_proj:
            first_proj = query_one("SELECT id FROM projects WHERE status != 'DELETED' ORDER BY updated_at DESC LIMIT 1")
        proj_id = first_proj["id"] if first_proj else "default_project"

    execute_commit(
        """
        INSERT INTO development_tasks (
            id, user_id, project_id, workspace_id, title, prompt, status, idempotency_key, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'DRAFT', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """,
        (task_id, user["id"], proj_id, body.workspace_id, body.title, body.prompt, idempotency_key)
    )

    if body.auto_dispatch:
        dispatch_result = await _dispatch_task_internal(task_id, user["id"], mode=body.mode)
        task = query_one("SELECT * FROM development_tasks WHERE id = ?", (task_id,))
        res = dict(task)
        res["dispatch"] = dispatch_result
        return res

    task = query_one("SELECT * FROM development_tasks WHERE id = ?", (task_id,))
    return dict(task)


@orchestrator_router.get("/tasks", summary="Danh sách Development Tasks")
async def list_tasks(
    workspace_id: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: Dict = Depends(get_orchestrator_user)
):
    query = "SELECT * FROM development_tasks WHERE user_id = ?"
    params: List[Any] = [user["id"]]

    if workspace_id:
        query += " AND workspace_id = ?"
        params.append(workspace_id)
    if project_id:
        query += " AND project_id = ?"
        params.append(project_id)
    if status:
        query += " AND status = ?"
        params.append(status)

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    tasks = query_all(query, tuple(params))
    items = []
    for t in tasks:
        td = dict(t)
        if td.get("current_attempt_id"):
            att = query_one("SELECT * FROM task_attempts WHERE id = ?", (td["current_attempt_id"],))
            td["current_attempt"] = dict(att) if att else None
        else:
            td["current_attempt"] = None
        items.append(td)

    total_row = query_one("SELECT COUNT(*) as cnt FROM development_tasks WHERE user_id = ?", (user["id"],))
    total = total_row["cnt"] if total_row else 0
    return {"tasks": items, "total": total}


@orchestrator_router.get("/tasks/{id}", summary="Chi tiết Development Task")
async def get_task_detail(id: str, user: Dict = Depends(get_orchestrator_user)):
    task = query_one("SELECT * FROM development_tasks WHERE id = ? AND user_id = ?", (id, user["id"]))
    if not task:
        raise HTTPException(status_code=404, detail="Task không tồn tại hoặc không thuộc quyền sở hữu.")

    td = dict(task)
    # Workspace & Runner
    ws = query_one("SELECT * FROM development_workspaces WHERE id = ?", (td["workspace_id"],))
    td["workspace"] = dict(ws) if ws else None

    # Current & all attempts
    attempts = query_all("SELECT * FROM task_attempts WHERE task_id = ? ORDER BY attempt_number DESC", (id,))
    td["attempts"] = [dict(a) for a in attempts]
    
    current_att = None
    if td.get("current_attempt_id"):
        for a in td["attempts"]:
            if a["id"] == td["current_attempt_id"]:
                current_att = a
                break

    td["current_attempt"] = current_att

    # Artifacts of current attempt
    if current_att:
        artifacts = query_all("SELECT * FROM task_artifacts WHERE attempt_id = ?", (current_att["id"],))
        td["artifacts"] = [dict(art) for art in artifacts]
        approvals = query_all("SELECT * FROM task_approvals WHERE attempt_id = ?", (current_att["id"],))
        td["approvals"] = [dict(app) for app in approvals]
        verifications = query_all("SELECT * FROM task_verification_reports WHERE attempt_id = ? ORDER BY created_at ASC", (current_att["id"],))
        td["verifications"] = [dict(v) for v in verifications]
    else:
        td["artifacts"] = []
        td["approvals"] = []
        td["verifications"] = []

    return td


@orchestrator_router.post("/tasks/{id}/dispatch", summary="Bắt đầu thực thi Task")
async def dispatch_task(id: str, mode: str = Query("plan"), user: Dict = Depends(get_orchestrator_user)):
    return await _dispatch_task_internal(id, user["id"], mode=mode)


@orchestrator_router.post("/tasks/{id}/cancel", status_code=202, summary="Hủy thực thi Task")
async def cancel_task(id: str, body: TaskCancelRequest, user: Dict = Depends(get_orchestrator_user)):
    task = query_one("SELECT * FROM development_tasks WHERE id = ? AND user_id = ?", (id, user["id"]))
    if not task:
        raise HTTPException(status_code=404, detail="Task không tồn tại hoặc không thuộc quyền sở hữu.")

    if task["status"] in ("COMPLETED", "FAILED", "CANCELLED"):
        raise HTTPException(status_code=409, detail=f"Task đã ở trạng thái kết thúc ({task['status']}).")

    # If merely DRAFT or QUEUED without active execution run
    if task["status"] in ("DRAFT", "QUEUED") and not task.get("current_attempt_id"):
        execute_commit(
            "UPDATE development_tasks SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (id,)
        )
        return {"task_id": id, "status": "CANCELLED", "message": "Task đã được hủy."}

    # If executing, signal CANCELLING and forward to Runner
    execute_commit(
        "UPDATE development_tasks SET status = 'CANCELLING', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (id,)
    )

    if task.get("current_attempt_id"):
        att = query_one("SELECT * FROM task_attempts WHERE id = ?", (task["current_attempt_id"],))
        if att and att.get("runner_id"):
            await runner_channel_mgr.send_event(
                att["runner_id"],
                "TASK_CANCEL",
                {"task_id": id, "attempt_id": att["id"], "reason": body.reason}
            )

    await task_event_broadcaster.broadcast(
        id,
        {
            "event_type": "STATUS_TRANSITION",
            "task_id": id,
            "payload": {"from_status": task["status"], "to_status": "CANCELLING", "reason": body.reason}
        }
    )

    return {
        "task_id": id,
        "status": "CANCELLING",
        "message": "Tín hiệu hủy đã được truyền tới Agent Runner."
    }


@orchestrator_router.post("/tasks/{id}/approval", summary="Người dùng phê duyệt hoặc từ chối kế hoạch (Human-in-the-Loop)")
async def submit_task_approval(id: str, body: TaskApprovalRequest, user: Dict = Depends(get_orchestrator_user)):
    task = query_one("SELECT * FROM development_tasks WHERE id = ? AND user_id = ?", (id, user["id"]))
    if not task:
        raise HTTPException(status_code=404, detail="Task không tồn tại hoặc không thuộc quyền sở hữu.")

    if task["status"] not in ("AWAITING_APPROVAL", "PLANNING"):
        raise HTTPException(
            status_code=409,
            detail=f"Task hiện ở trạng thái '{task['status']}', không thể nhận quyết định phê duyệt."
        )

    current_att = task.get("current_attempt_id")
    if not current_att:
        raise HTTPException(status_code=400, detail="Không tìm thấy attempt đang hoạt động.")

    approval_id = f"app_{uuid.uuid4().hex[:16]}"
    execute_commit(
        """
        INSERT INTO task_approvals (id, attempt_id, action_type, decision, description, decided_by, decided_at)
        VALUES (?, ?, 'plan_approval', ?, ?, ?, CURRENT_TIMESTAMP)
        """,
        (approval_id, current_att, body.decision, body.reason, user["id"])
    )

    att = query_one("SELECT * FROM task_attempts WHERE id = ?", (current_att,))
    if body.decision == "APPROVED":
        execute_commit(
            "UPDATE task_attempts SET mode = 'accept-edits', status = 'RUNNING' WHERE id = ?",
            (current_att,)
        )
        execute_commit(
            "UPDATE development_tasks SET status = 'RUNNING', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (id,)
        )
        if att and att.get("runner_id"):
            await runner_channel_mgr.send_event(
                att["runner_id"],
                "TASK_RESUME_APPROVED",
                {"task_id": id, "attempt_id": current_att, "mode": "accept-edits"}
            )
        await task_event_broadcaster.broadcast(
            id,
            {
                "event_type": "STATUS_TRANSITION",
                "task_id": id,
                "payload": {"from_status": "AWAITING_APPROVAL", "to_status": "RUNNING", "decision": "APPROVED"}
            }
        )
        return {"task_id": id, "status": "RUNNING", "message": "Kế hoạch đã được phê duyệt. Tiến trình đang áp dụng chỉnh sửa."}
    else:
        execute_commit(
            "UPDATE task_attempts SET status = 'CANCELLED', finished_at = CURRENT_TIMESTAMP WHERE id = ?",
            (current_att,)
        )
        execute_commit(
            "UPDATE development_tasks SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (id,)
        )
        if att and att.get("runner_id"):
            await runner_channel_mgr.send_event(
                att["runner_id"],
                "TASK_CANCEL",
                {"task_id": id, "attempt_id": current_att, "reason": body.reason or "Kế hoạch bị từ chối."}
            )
        await task_event_broadcaster.broadcast(
            id,
            {
                "event_type": "STATUS_TRANSITION",
                "task_id": id,
                "payload": {"from_status": "AWAITING_APPROVAL", "to_status": "CANCELLED", "decision": "REJECTED"}
            }
        )
        return {"task_id": id, "status": "CANCELLED", "message": "Kế hoạch đã bị từ chối. Task được hủy."}


@orchestrator_router.post("/tasks/{id}/review", summary="Duyệt chấp thuận, yêu cầu chỉnh sửa hoặc từ chối kết quả cuối cùng")
async def submit_task_review(id: str, body: TaskReviewRequest, user: Dict = Depends(get_orchestrator_user)):
    task = query_one("SELECT * FROM development_tasks WHERE id = ? AND user_id = ?", (id, user["id"]))
    if not task:
        raise HTTPException(status_code=404, detail="Task không tồn tại hoặc không thuộc quyền sở hữu.")

    current_att_id = task.get("current_attempt_id")
    if not current_att_id:
        raise HTTPException(status_code=400, detail="Không tìm thấy attempt đang hoạt động.")

    decision_norm = body.decision.upper()

    if decision_norm in ("ACCEPT", "APPROVE"):
        approval_id = f"app_{uuid.uuid4().hex[:16]}"
        execute_commit(
            """
            INSERT INTO task_approvals (id, attempt_id, action_type, decision, description, decided_by, decided_at)
            VALUES (?, ?, 'diff_review', 'APPROVED', ?, ?, CURRENT_TIMESTAMP)
            """,
            (approval_id, current_att_id, body.commit_message or "Phê duyệt các thay đổi diff.", user["id"])
        )
        execute_commit(
            "UPDATE development_tasks SET status = 'COMPLETED', review_status = 'APPROVED', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (id,)
        )
        await task_event_broadcaster.broadcast(
            id,
            {
                "event_type": "STATUS_TRANSITION",
                "task_id": id,
                "payload": {"to_status": "COMPLETED", "review": "APPROVED", "review_status": "APPROVED"}
            }
        )
        return {"task_id": id, "status": "COMPLETED", "review_status": "APPROVED", "message": "Các thay đổi đã được chấp thuận hoàn tất."}

    elif decision_norm == "REQUEST_CHANGES":
        feedback_note = body.feedback or "Reviewer requested changes to the implementation."
        prev_att = query_one("SELECT * FROM task_attempts WHERE id = ?", (current_att_id,))
        runner_id = prev_att["runner_id"] if prev_att else None
        next_attempt_number = (prev_att["attempt_number"] if prev_att else 1) + 1
        new_attempt_id = f"att_{uuid.uuid4().hex[:16]}"
        git_branch = (prev_att.get("git_branch") if prev_att else None) or f"ai-chan/task-{id[:8]}"

        # Record approval review entry
        approval_id = f"app_{uuid.uuid4().hex[:16]}"
        execute_commit(
            """
            INSERT INTO task_approvals (id, attempt_id, action_type, decision, description, decided_by, decided_at)
            VALUES (?, ?, 'diff_review', 'REQUEST_CHANGES', ?, ?, CURRENT_TIMESTAMP)
            """,
            (approval_id, current_att_id, feedback_note, user["id"])
        )

        # Create new attempt linked via parent_attempt_id
        execute_commit(
            """
            INSERT INTO task_attempts (
                id, task_id, attempt_number, runner_id, runtime, mode, status, git_branch, review_feedback, parent_attempt_id, started_at
            ) VALUES (?, ?, ?, ?, 'antigravity', 'accept-edits', 'DISPATCHING', ?, ?, ?, CURRENT_TIMESTAMP)
            """,
            (new_attempt_id, id, next_attempt_number, runner_id, git_branch, feedback_note, current_att_id)
        )

        execute_commit(
            """
            UPDATE development_tasks 
            SET status = 'QUEUED', review_status = 'CHANGES_REQUESTED', current_attempt_id = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
            """,
            (new_attempt_id, id)
        )

        # Dispatch follow-up attempt to Runner with reviewer feedback included
        augmented_prompt = (
            f"{task['prompt']}\n\n"
            f"[REVIEW FEEDBACK FROM SENIOR REVIEWER]:\n{feedback_note}\n"
            f"Please address the feedback above and refine the implementation."
        )
        ws = query_one("SELECT * FROM development_workspaces WHERE id = ?", (task["workspace_id"],))

        verif_policy = {}
        if ws and ws.get("verification_policy"):
            try:
                verif_policy = json.loads(ws["verification_policy"])
            except Exception:
                pass

        if runner_id:
            await runner_channel_mgr.send_event(
                runner_id,
                "TASK_DISPATCH",
                {
                    "task_id": id,
                    "attempt_id": new_attempt_id,
                    "attempt_number": next_attempt_number,
                    "workspace_id": task["workspace_id"],
                    "local_path": ws["local_path"] if ws else "",
                    "git_branch": git_branch,
                    "runtime": "antigravity",
                    "mode": "accept-edits",
                    "title": f"{task['title']} (Follow-up Attempt #{next_attempt_number})",
                    "prompt": augmented_prompt,
                    "verification_policy": verif_policy,
                    "parent_attempt_id": current_att_id
                }
            )

        await task_event_broadcaster.broadcast(
            id,
            {
                "event_type": "STATUS_TRANSITION",
                "task_id": id,
                "payload": {
                    "to_status": "QUEUED",
                    "review": "REQUEST_CHANGES",
                    "review_status": "CHANGES_REQUESTED",
                    "attempt_number": next_attempt_number,
                    "attempt_id": new_attempt_id
                }
            }
        )

        return {
            "task_id": id,
            "status": "QUEUED",
            "review_status": "CHANGES_REQUESTED",
            "attempt_id": new_attempt_id,
            "attempt_number": next_attempt_number,
            "message": "Đã ghi nhận yêu cầu chỉnh sửa và khởi tạo follow-up attempt mới liên kết với attempt trước."
        }

    else:  # REJECT
        approval_id = f"app_{uuid.uuid4().hex[:16]}"
        execute_commit(
            """
            INSERT INTO task_approvals (id, attempt_id, action_type, decision, description, decided_by, decided_at)
            VALUES (?, ?, 'diff_review', 'REJECTED', ?, ?, CURRENT_TIMESTAMP)
            """,
            (approval_id, current_att_id, body.feedback or "Từ chối các thay đổi.", user["id"])
        )
        execute_commit(
            "UPDATE development_tasks SET status = 'CANCELLED', review_status = 'REJECTED', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (id,)
        )
        await task_event_broadcaster.broadcast(
            id,
            {
                "event_type": "STATUS_TRANSITION",
                "task_id": id,
                "payload": {"to_status": "CANCELLED", "review": "REJECTED", "review_status": "REJECTED"}
            }
        )
        return {"task_id": id, "status": "CANCELLED", "review_status": "REJECTED", "message": "Các thay đổi đã bị từ chối."}


@orchestrator_router.get("/tasks/{id}/events", summary="Server-Sent Events (SSE) Stream & Replay cho Task")
async def stream_task_events(
    id: str,
    request: Request,
    since_seq: int = Query(0, ge=0),
    user: Dict = Depends(get_orchestrator_user)
):
    task = query_one("SELECT * FROM development_tasks WHERE id = ? AND user_id = ?", (id, user["id"]))
    if not task:
        raise HTTPException(status_code=404, detail="Task không tồn tại.")

    async def event_generator():
        # 1. Replay historical events from SQLite database
        current_att = task.get("current_attempt_id")
        last_sent_seq = since_seq

        if current_att:
            db_events = query_all(
                """
                SELECT sequence_number, event_type, payload, created_at 
                FROM task_events 
                WHERE attempt_id = ? AND sequence_number > ? 
                ORDER BY sequence_number ASC
                """,
                (current_att, since_seq)
            )
            for ev in db_events:
                last_sent_seq = max(last_sent_seq, ev["sequence_number"])
                try:
                    payload_data = json.loads(ev["payload"])
                except Exception:
                    payload_data = {"raw": ev["payload"]}

                sse_chunk = f"id: evt_{ev['sequence_number']}\nevent: {ev['event_type']}\ndata: {json.dumps(payload_data)}\n\n"
                yield sse_chunk

        # 2. Subscribe to in-memory live stream
        q = task_event_broadcaster.subscribe(id)
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    msg = await asyncio.wait_for(q.get(), timeout=15.0)
                    ev_type = msg.get("event_type", "message")
                    ev_seq = msg.get("sequence_number")
                    if ev_seq is not None:
                        if ev_seq <= last_sent_seq:
                            continue
                        last_sent_seq = ev_seq
                        id_str = f"id: evt_{ev_seq}\n"
                    else:
                        id_str = ""

                    sse_chunk = f"{id_str}event: {ev_type}\ndata: {json.dumps(msg.get('payload', msg))}\n\n"
                    yield sse_chunk
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        finally:
            task_event_broadcaster.unsubscribe(id, q)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@orchestrator_router.get("/tasks/{id}/diff", summary="Lấy Unified Git Diff của Task")
async def get_task_diff(id: str, user: Dict = Depends(get_orchestrator_user)):
    task = query_one("SELECT * FROM development_tasks WHERE id = ? AND user_id = ?", (id, user["id"]))
    if not task:
        raise HTTPException(status_code=404, detail="Task không tồn tại.")

    current_att = task.get("current_attempt_id")
    if not current_att:
        return {"task_id": id, "diff": "", "stat": "", "files_changed": [], "byte_size": 0}

    att = query_one("SELECT * FROM task_attempts WHERE id = ?", (current_att,))
    diff_stat = att.get("diff_stat") if att else ""

    diff_art = query_one(
        "SELECT * FROM task_artifacts WHERE attempt_id = ? AND artifact_type = 'diff' ORDER BY created_at DESC LIMIT 1",
        (current_att,)
    )
    if diff_art:
        return {
            "task_id": id,
            "attempt_id": current_att,
            "diff": diff_art["content"],
            "stat": diff_stat or "",
            "byte_size": diff_art["byte_size"]
        }
    return {"task_id": id, "attempt_id": current_att, "diff": "", "stat": diff_stat or "", "byte_size": 0}


@orchestrator_router.get("/tasks/{id}/verifications", summary="Lấy báo cáo kiểm thử và verification pipeline của Task")
async def get_task_verifications(id: str, user: Dict = Depends(get_orchestrator_user)):
    task = query_one("SELECT * FROM development_tasks WHERE id = ? AND user_id = ?", (id, user["id"]))
    if not task:
        raise HTTPException(status_code=404, detail="Task không tồn tại.")

    current_att = task.get("current_attempt_id")
    reports = query_all(
        """
        SELECT * FROM task_verification_reports 
        WHERE task_id = ? 
        ORDER BY created_at DESC, step_name ASC
        """,
        (id,)
    )

    items = [dict(r) for r in reports]
    current_items = [r for r in items if r.get("attempt_id") == current_att] if current_att else items

    all_passed = len(current_items) > 0 and all(r.get("status") == "PASSED" for r in current_items)
    has_failures = any(r.get("status") in ("FAILED", "ERROR") for r in current_items)

    return {
        "task_id": id,
        "current_attempt_id": current_att,
        "all_passed": all_passed,
        "has_failures": has_failures,
        "reports": items,
        "current_attempt_reports": current_items
    }


# ==============================================================================
# 6. RUNNER INGESTION APIS (BEARER RUNNER SECRET AUTH)
# ==============================================================================

@orchestrator_router.post("/runners/tasks/verification-reports", summary="Runner gửi kết quả Verification Pipeline")
async def runner_post_verification_reports(
    body: RunnerVerificationReportRequest,
    request: Request
):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Thiếu Runner Secret Token.")

    secret = auth_header.split(" ")[1]
    secret_hash = hashlib.sha256(secret.encode("utf-8")).hexdigest()
    runner = query_one("SELECT * FROM agent_runners WHERE secret_hash = ? AND status != 'REVOKED'", (secret_hash,))
    if not runner:
        raise HTTPException(status_code=401, detail="Runner Secret không hợp lệ hoặc đã bị thu hồi.")

    att = query_one("SELECT * FROM task_attempts WHERE id = ?", (body.attempt_id,))
    if not att:
        raise HTTPException(status_code=404, detail="Execution attempt không tồn tại.")
    if att["runner_id"] != runner["id"]:
        raise HTTPException(status_code=403, detail="Attempt không thuộc về Runner này.")

    with get_db_connection() as conn:
        cur = conn.cursor()
        for step in body.steps:
            rep_id = f"vrp_{uuid.uuid4().hex[:16]}"
            cur.execute(
                """
                INSERT INTO task_verification_reports (
                    id, attempt_id, task_id, step_name, command, status,
                    exit_code, duration_seconds, stdout_preview, stderr_preview, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                """,
                (
                    rep_id,
                    body.attempt_id,
                    att["task_id"],
                    step.step_name,
                    step.command,
                    step.status,
                    step.exit_code,
                    step.duration_seconds,
                    step.stdout_preview,
                    step.stderr_preview
                )
            )
        conn.commit()

    # Broadcast verification report to UI SSE
    await task_event_broadcaster.broadcast(
        att["task_id"],
        {
            "event_type": "VERIFICATION_REPORT",
            "task_id": att["task_id"],
            "attempt_id": body.attempt_id,
            "payload": {
                "overall_status": body.overall_status,
                "step_count": len(body.steps),
                "steps": [s.model_dump() for s in body.steps]
            }
        }
    )

    return {"success": True, "saved_steps": len(body.steps), "attempt_id": body.attempt_id}


@orchestrator_router.post("/runners/tasks/events", summary="Runner gửi batch Normalized Events")
async def runner_post_task_events(
    batch: RunnerBatchEventsRequest,
    request: Request
):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Thiếu Runner Secret Token.")

    secret = auth_header.split(" ")[1]
    secret_hash = hashlib.sha256(secret.encode("utf-8")).hexdigest()
    runner = query_one("SELECT * FROM agent_runners WHERE secret_hash = ? AND status != 'REVOKED'", (secret_hash,))
    if not runner:
        raise HTTPException(status_code=401, detail="Runner Secret không hợp lệ hoặc đã bị thu hồi.")

    att = query_one("SELECT * FROM task_attempts WHERE id = ?", (batch.attempt_id,))
    if not att:
        raise HTTPException(status_code=404, detail="Execution attempt không tồn tại.")
    if att["runner_id"] != runner["id"]:
        raise HTTPException(status_code=403, detail="Attempt không thuộc về Runner này.")

    with get_db_connection() as conn:
        cur = conn.cursor()
        for ev in batch.events:
            cur.execute(
                """
                INSERT OR IGNORE INTO task_events (
                    id, attempt_id, sequence_number, event_type, severity, payload, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                """,
                (
                    ev.event_id,
                    batch.attempt_id,
                    ev.sequence_number,
                    ev.event_type,
                    ev.severity,
                    json.dumps(ev.payload)
                )
            )

            # Update status if state transition
            if ev.event_type == "STATUS_TRANSITION":
                to_status = ev.payload.get("to_status")
                if to_status:
                    cur.execute(
                        "UPDATE task_attempts SET status = ? WHERE id = ?",
                        (to_status, batch.attempt_id)
                    )
                    cur.execute(
                        "UPDATE development_tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                        (to_status, att["task_id"])
                    )

            # Update token usage if emitted
            if ev.event_type == "TOKEN_USAGE":
                tokens_in = ev.payload.get("input_tokens")
                tokens_out = ev.payload.get("output_tokens")
                cost = ev.payload.get("cost_estimate")
                cur.execute(
                    """
                    UPDATE task_attempts 
                    SET tokens_in = COALESCE(?, tokens_in), 
                        tokens_out = COALESCE(?, tokens_out), 
                        cost_estimate = COALESCE(?, cost_estimate)
                    WHERE id = ?
                    """,
                    (tokens_in, tokens_out, cost, batch.attempt_id)
                )

            # Broadcast to web SSE listeners
            asyncio.create_task(
                task_event_broadcaster.broadcast(att["task_id"], ev.model_dump())
            )

        conn.commit()

    return {"received": len(batch.events), "attempt_id": batch.attempt_id}


@orchestrator_router.post("/runners/tasks/complete", summary="Runner báo cáo kết quả hoàn thành Task")
async def runner_post_task_complete(
    body: RunnerTaskCompleteRequest,
    request: Request
):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Thiếu Runner Secret Token.")

    secret = auth_header.split(" ")[1]
    secret_hash = hashlib.sha256(secret.encode("utf-8")).hexdigest()
    runner = query_one("SELECT * FROM agent_runners WHERE secret_hash = ? AND status != 'REVOKED'", (secret_hash,))
    if not runner:
        raise HTTPException(status_code=401, detail="Runner Secret không hợp lệ hoặc đã bị thu hồi.")

    att = query_one("SELECT * FROM task_attempts WHERE id = ?", (body.attempt_id,))
    if not att:
        raise HTTPException(status_code=404, detail="Execution attempt không tồn tại.")
    if att["runner_id"] != runner["id"]:
        raise HTTPException(status_code=403, detail="Attempt không thuộc về Runner này.")

    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE task_attempts 
            SET status = ?, 
                exit_code = ?, 
                duration_seconds = ?, 
                tokens_in = COALESCE(?, tokens_in), 
                tokens_out = COALESCE(?, tokens_out), 
                cost_estimate = COALESCE(?, cost_estimate), 
                head_commit = ?, 
                worktree_path = COALESCE(?, worktree_path),
                is_isolated = COALESCE(?, is_isolated),
                diff_stat = COALESCE(?, diff_stat),
                finished_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (
                body.status,
                body.exit_code,
                body.duration_seconds,
                body.tokens_in,
                body.tokens_out,
                body.cost_estimate,
                body.head_commit,
                body.worktree_path,
                1 if body.is_isolated else (0 if body.is_isolated is not None else None),
                body.diff_stat,
                body.attempt_id
            )
        )

        # Ingest artifacts
        if body.artifacts:
            for art in body.artifacts:
                art_id = f"art_{uuid.uuid4().hex[:16]}"
                content = art.get("content", "")
                byte_size = len(content.encode("utf-8")) if content else 0
                cur.execute(
                    """
                    INSERT INTO task_artifacts (id, attempt_id, artifact_type, file_path, content, byte_size, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    """,
                    (
                        art_id,
                        body.attempt_id,
                        art.get("artifact_type", "diff"),
                        art.get("file_path", "patch.diff"),
                        content,
                        byte_size
                    )
                )

        # Transition top-level task status based on mode & terminal outcome
        task_new_status = body.status
        review_status_update = None
        if body.status == "COMPLETED":
            if att["mode"] == "plan":
                task_new_status = "AWAITING_APPROVAL"
            else:
                task_new_status = "REVIEW_REQUIRED"
                review_status_update = "PENDING"
        elif body.status == "FAILED":
            task_new_status = "FAILED"
        elif body.status == "CANCELLED":
            task_new_status = "CANCELLED"

        if review_status_update:
            cur.execute(
                "UPDATE development_tasks SET status = ?, review_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (task_new_status, review_status_update, att["task_id"])
            )
        else:
            cur.execute(
                "UPDATE development_tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (task_new_status, att["task_id"])
            )
        conn.commit()

    # Broadcast final completion event
    await task_event_broadcaster.broadcast(
        att["task_id"],
        {
            "event_type": "TASK_TERMINATED",
            "task_id": att["task_id"],
            "attempt_id": body.attempt_id,
            "payload": {
                "status": body.status,
                "task_status": task_new_status,
                "exit_code": body.exit_code,
                "duration_seconds": body.duration_seconds,
                "summary": body.summary,
                "error_message": body.error_message
            }
        }
    )

    return {"success": True, "task_id": att["task_id"], "status": task_new_status}

