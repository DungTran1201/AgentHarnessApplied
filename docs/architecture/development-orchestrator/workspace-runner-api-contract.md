# API Contract Specification
## Capability: Development Workspace & Agent Runner

> **Document ID:** API-ORCH-01  
> **Version:** 1.0.0  
> **Target Framework:** FastAPI 0.115 (`ai-backend`)  
> **Base Path:** `/api/v1/orchestrator`  
> **Auth Convention:** 
> - User Endpoints: Bearer JWT in `Authorization` header or HTTP-only cookie (`get_current_user`).
> - Runner Endpoints: Bearer Runner Secret Key in `Authorization: Bearer rsk_...` with `X-Runner-Id`.
> **Standard Error Envelope:** `{"detail": {"code": "ERROR_CODE", "message": "Readable explanation", "context": {}}}`

---

## 1. Summary of Endpoints

| Category | Method | Path | Auth Scope | Description |
|---|---|---|---|---|
| **Workspace** | `POST` | `/workspaces` | User (Bearer) | Create new workspace & dispatch validation challenge |
| **Workspace** | `GET` | `/workspaces` | User (Bearer) | List all workspaces owned by current user |
| **Workspace** | `GET` | `/workspaces/{id}` | User (Bearer) | Retrieve workspace detail, git state & validation log |
| **Workspace** | `PUT` | `/workspaces/{id}` | User (Bearer) | Update workspace metadata (name, branch, runner) |
| **Workspace** | `POST` | `/workspaces/{id}/validate` | User (Bearer) | Trigger manual on-demand re-validation via Runner |
| **Workspace** | `POST` | `/workspaces/{id}/disable` | User (Bearer) | Disable workspace from accepting new tasks |
| **Workspace** | `DELETE` | `/workspaces/{id}` | User (Bearer) | Delete workspace (fails if tasks active) |
| **Project Binding** | `PUT` | `/projects/{project_id}/workspace` | User (Bearer) | Bind or unbind workspace to an AI-Chan Project |
| **Runner** | `POST` | `/runners/pairing-token` | User (Bearer) | Generate a 15-minute one-time pairing token |
| **Runner** | `POST` | `/runners/pair` | Anonymous (Token) | Runner exchanges pairing token for ID & Secret |
| **Runner** | `GET` | `/runners` | User (Bearer) | List all registered runners for current user |
| **Runner** | `GET` | `/runners/{id}` | User (Bearer) | Get runner status, capabilities, and system metrics |
| **Runner** | `POST` | `/runners/{id}/heartbeat` | Runner (Secret) | Runner submits periodic telemetry & health |
| **Runner** | `POST` | `/runners/{id}/revoke` | User (Bearer) | Revoke runner access immediately |
| **Runner** | `POST` | `/runners/{id}/rotate-secret` | User (Bearer) | Rotate runner secret key |
| **Runner Channel** | `GET` | `/runners/{id}/channel` | Runner (Secret) | SSE long-lived channel for task/challenge dispatch |
| **Runner Result** | `POST` | `/runners/{id}/validation-result`| Runner (Secret) | Runner reports workspace validation outcome |
| **Task Claim** | `POST` | `/runners/tasks/claim` | Runner (Secret) | Runner confirms task attempt claim (ACK) |
| **Task Events** | `POST` | `/runners/tasks/events` | Runner (Secret) | Runner flushes normalized domain events batch |
| **Task Complete** | `POST` | `/runners/tasks/complete` | Runner (Secret) | Runner finalizes task run with artifacts |
| **Artifacts** | `GET` | `/tasks/{id}/artifacts` | User (Bearer) | List metadata of all artifacts for a Task |
| **Artifact Detail**| `GET` | `/tasks/{id}/artifacts/{artifact_id}` | User (Bearer) | Retrieve artifact content and metadata |
| **Artifact Download**| `GET` | `/tasks/{id}/artifacts/{artifact_id}/download` | User (Bearer/Token) | Download raw artifact file with Content-Disposition |
| **Artifact Retry** | `POST` | `/tasks/{id}/artifacts/retry` | User (Bearer) | Recover and persist artifact from event stream |

---

## 2. Workspace Endpoints

### 2.1 Create Workspace
- **Route:** `POST /api/v1/orchestrator/workspaces`
- **Rate Limit:** 30 requests / minute per user
- **Request Body:**
```json
{
  "name": "ai-chan-core",
  "local_path": "C:\\Users\\PC\\Project\\ai-chan",
  "git_remote_url": "https://github.com/DungTran1201/ai-chan.git",
  "default_branch": "main",
  "runner_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
}
```
- **Response `201 Created`:**
```json
{
  "id": "e4b6c31a-5b12-4f88-872e-84b238f83710",
  "name": "ai-chan-core",
  "local_path": "C:\\Users\\PC\\Project\\ai-chan",
  "git_remote_url": "https://github.com/DungTran1201/ai-chan.git",
  "default_branch": "main",
  "status": "PENDING_VALIDATION",
  "is_git_repo": false,
  "runner_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "created_at": "2026-10-15T09:50:00Z",
  "updated_at": "2026-10-15T09:50:00Z"
}
```
- **Error Responses:**
  - `400 Bad Request`: Runner is not in `ONLINE` status.
  - `404 Not Found`: `runner_id` does not exist or does not belong to user.
  - `422 Unprocessable Entity`: Invalid path syntax or empty name.

---

### 2.2 List Workspaces
- **Route:** `GET /api/v1/orchestrator/workspaces`
- **Query Parameters:**
  - `status`: Optional filter (`READY`, `UNAVAILABLE`, etc.)
  - `runner_id`: Optional filter by runner UUID
  - `limit`: Default 50, max 100
  - `offset`: Default 0
- **Response `200 OK`:**
```json
{
  "total": 1,
  "items": [
    {
      "id": "e4b6c31a-5b12-4f88-872e-84b238f83710",
      "name": "ai-chan-core",
      "local_path": "C:\\Users\\PC\\Project\\ai-chan",
      "status": "READY",
      "is_git_repo": true,
      "default_branch": "main",
      "last_commit_hash": "17135ea78d461e892c9f99e3a35b1d5a7d32c91a",
      "runner_name": "Desktop-Win11-Main",
      "runner_status": "ONLINE",
      "last_validated_at": "2026-10-15T09:50:05Z",
      "created_at": "2026-10-15T09:50:00Z"
    }
  ]
}
```

---

### 2.3 Re-Validate Workspace
- **Route:** `POST /api/v1/orchestrator/workspaces/{id}/validate`
- **Response `202 Accepted`:**
```json
{
  "workspace_id": "e4b6c31a-5b12-4f88-872e-84b238f83710",
  "status": "VALIDATION_DISPATCHED",
  "message": "Validation request queued for runner Desktop-Win11-Main."
}
```

---

### 2.4 Delete Workspace
- **Route:** `DELETE /api/v1/orchestrator/workspaces/{id}`
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Workspace deleted successfully."
}
```
- **Error Responses:**
  - `409 Conflict`: `ACTIVE_TASKS_RUNNING` — Workspace has active tasks running; cannot delete until finished.

---

## 3. Project-Workspace Binding

### 3.1 Bind Workspace to Project
- **Route:** `PUT /api/v1/projects/{project_id}/workspace`
- **Request Body:**
```json
{
  "workspace_id": "e4b6c31a-5b12-4f88-872e-84b238f83710"
}
```
- **Response `200 OK`:**
```json
{
  "project_id": "18d5ea64-b99b-4901-ae86-4b70d0bfb35b",
  "workspace_id": "e4b6c31a-5b12-4f88-872e-84b238f83710",
  "workspace_name": "ai-chan-core",
  "workspace_status": "READY"
}
```

---

## 4. Runner Registration & Lifecycle Endpoints

### 4.1 Generate Pairing Token
- **Route:** `POST /api/v1/orchestrator/runners/pairing-token`
- **Request Body:**
```json
{
  "label": "My Dev Machine"
}
```
- **Response `201 Created`:**
```json
{
  "pairing_token": "rpt_9a4f2c1d8e7b4a3c2d1e0f9a8b7c6d5e",
  "expires_at": "2026-10-15T10:05:00Z",
  "ttl_seconds": 900,
  "cli_command": "ai-chan-runner pair --server http://localhost:8000 --token rpt_9a4f2c1d8e7b4a3c2d1e0f9a8b7c6d5e"
}
```

---

### 4.2 Runner Pair Handshake
- **Route:** `POST /api/v1/orchestrator/runners/pair`
- **Auth:** Public endpoint secured by single-use `pairing_token`
- **Request Body:**
```json
{
  "pairing_token": "rpt_9a4f2c1d8e7b4a3c2d1e0f9a8b7c6d5e",
  "name": "Desktop-Win11-Main",
  "machine_name": "DESKTOP-8K9L2M",
  "platform": "windows",
  "architecture": "x86_64",
  "capabilities": {
    "antigravity": {
      "available": true,
      "version": "1.2.16",
      "path": "C:\\Users\\PC\\AppData\\Local\\agy\\bin\\agy.exe"
    },
    "claude_code": {
      "available": false,
      "version": null
    },
    "git": {
      "available": true,
      "version": "2.44.0"
    }
  },
  "system_info": {
    "cpu_cores": 16,
    "total_memory_gb": 32.0,
    "os_version": "Windows 11 Build 22631"
  }
}
```
- **Response `200 OK`:**
```json
{
  "runner_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "runner_secret": "rsk_4f8a7e6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f",
  "heartbeat_interval_seconds": 25,
  "channel_url": "/api/v1/orchestrator/runners/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d/channel"
}
```
- **Error Responses:**
  - `400 Bad Request`: `TOKEN_EXPIRED` (TTL elapsed).
  - `409 Conflict`: `TOKEN_ALREADY_USED`.

---

### 4.3 Runner Heartbeat
- **Route:** `POST /api/v1/orchestrator/runners/{id}/heartbeat`
- **Headers:**
  - `Authorization: Bearer rsk_...`
  - `X-Runner-Id: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d`
- **Request Body:**
```json
{
  "timestamp": "2026-10-15T09:51:30Z",
  "cpu_percent": 14.2,
  "memory_percent": 48.5,
  "active_task_id": null,
  "capabilities_hash": "a1b2c3d4"
}
```
- **Response `200 OK`:**
```json
{
  "status": "ACK",
  "server_time": "2026-10-15T09:51:30Z",
  "pending_challenges": 0
}
```

---

### 4.4 Runner Long-Lived Channel (SSE)
- **Route:** `GET /api/v1/orchestrator/runners/{id}/channel`
- **Headers:** `Authorization: Bearer rsk_...`
- **Response Stream (`text/event-stream`):**
```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

event: ping
data: {"timestamp": "2026-10-15T09:51:40Z"}

event: validate_workspace
data: {"challenge_id": "vch_01", "workspace_id": "e4b6c31a", "local_path": "C:\\Users\\PC\\Project\\ai-chan"}

event: TASK_DISPATCH
data: {"task_id": "tsk_01", "attempt_id": "att_01", "attempt_number": 1, "workspace_id": "e4b6c31a", "local_path": "C:\\Users\\PC\\Project\\ai-chan", "runtime": "antigravity", "mode": "plan", "title": "...", "prompt": "..."}
```

---

### 4.5 Runner Task Claim (ACK)
- **Route:** `POST /api/v1/orchestrator/runners/tasks/claim`
- **Headers:** `Authorization: Bearer rsk_...`
- **Request Body:**
```json
{
  "attempt_id": "att_4920fc0298a14b51"
}
```
- **Response `200 OK`:**
```json
{
  "claimed": true,
  "attempt_id": "att_4920fc0298a14b51",
  "runner_id": "run_9b1deb4d3b7d4bad",
  "claimed_at": "2026-10-16T18:20:00Z"
}
```

---

### 4.6 Runner Validation Result
- **Route:** `POST /api/v1/orchestrator/runners/{id}/validation-result`
- **Headers:** `Authorization: Bearer rsk_...`
- **Request Body:**
```json
{
  "challenge_id": "vch_01",
  "workspace_id": "e4b6c31a-5b12-4f88-872e-84b238f83710",
  "is_valid": true,
  "is_git_repo": true,
  "default_branch": "main",
  "last_commit_hash": "17135ea78d461e892c9f99e3a35b1d5a7d32c91a",
  "has_uncommitted_changes": false,
  "error_message": null
}
```
- **Response `200 OK`:**
```json
{
  "acknowledged": true,
  "workspace_status": "READY"
}
```

---

### 4.6 Revoke Runner
- **Route:** `POST /api/v1/orchestrator/runners/{id}/revoke`
- **Response `200 OK`:**
```json
{
  "runner_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "status": "REVOKED",
  "message": "Runner access has been permanently revoked."
}
```

---

## 5. Task Deliverables & Artifact Endpoints

### 5.1 List Task Artifacts
- **Route:** `GET /api/v1/orchestrator/tasks/{id}/artifacts`
- **Auth:** User Bearer JWT
- **Query Parameters:** `attempt_id` (optional filter)
- **Response `200 OK`:**
```json
[
  {
    "id": "art_9fa281b3c94d0192",
    "task_id": "tsk_01",
    "attempt_id": "att_01",
    "artifact_type": "review",
    "display_name": "Báo cáo Phân tích Codebase",
    "file_path": "codebase_review.md",
    "mime_type": "text/markdown",
    "byte_size": 4096,
    "checksum_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "created_at": "2026-10-16T18:30:00Z"
  }
]
```

### 5.2 Get Artifact Detail
- **Route:** `GET /api/v1/orchestrator/tasks/{id}/artifacts/{artifact_id}`
- **Auth:** User Bearer JWT
- **Response `200 OK`:** Returns metadata and full `content`.

### 5.3 Download Artifact
- **Route:** `GET /api/v1/orchestrator/tasks/{id}/artifacts/{artifact_id}/download`
- **Auth:** User Bearer JWT or `?token=` query parameter for direct browser download.
- **Headers:**
  - `Content-Disposition: attachment; filename="<safe_filename>"`
  - `Content-Type: text/markdown` or `text/x-diff`
  - `X-Artifact-Checksum: <sha256>`
- **Security:** Filename is sanitized to basename; path traversal (`../`) is blocked.

### 5.4 Retry Artifact Persistence
- **Route:** `POST /api/v1/orchestrator/tasks/{id}/artifacts/retry`
- **Auth:** User Bearer JWT
- **Behavior:** Recovers artifact from recorded event stream (`PLAN_CREATED`, `TEXT_DELTA`) without re-running the coding task turn. Clears `ARTIFACT_STORAGE_ERROR`.

