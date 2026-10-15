# Software Requirements Specification (SRS)
## Capability: Development Workspace & Agent Runner

> **Document ID:** SRS-ORCH-01  
> **Version:** 1.0.0  
> **Status:** PROPOSED (Prompt 01 Baseline)  
> **Target System:** AI-Chan Platform (`ai-backend` + `ai-frontend` + `ai-runner`)  
> **Standard:** ISO/IEC/IEEE 29148:2018 Compliant  
> **Fact Classification:** `FACT` (verified codebase reality), `DECISION` (architecture rule), `ASSUMPTION` (working hypothesis).

---

## 1. Introduction & Context

### 1.1 Purpose
This specification defines the functional, non-functional, security, and interface requirements for the **Development Workspace** and **Agent Runner** capabilities within the AI-Chan Development Orchestrator. 

### 1.2 Core Domain Concepts
- **AI-Chan Project:** Visual canvas agent/workflow configuration stored in `projects` (`graph_data` JSON).
- **Development Workspace (`DOM-WKR-001`):** A physical software repository context (local filesystem root on developer host, optional remote git URL, default branch, validation status) operated on by tasks.
- **Agent Runner (`DOM-RUN-001`):** A host execution daemon running on the developer workstation with access to the filesystem, git binary, and local CLI tools (Antigravity CLI, Claude Code).
- **MVP Relationship Rule (`BR-WKR-001`):** Exactly **1 AI-Chan Project binds to 1 Development Workspace** at MVP. The database design supports 1:N relations for future evolution.

---

## 2. Business Rules & Constraints

| ID | Title | Rule Statement | Fact Classification |
|---|---|---|---|
| **BR-WKR-001** | Project-Workspace Binding | In MVP, an AI-Chan Project links to at most one Development Workspace (`project.workspace_id`). A Workspace belongs to exactly one User (`owner_id`). | `DECISION` |
| **BR-WKR-002** | Path Validation Authority | Local paths (`local_path`) exist only on the host running the Agent Runner. The central Backend MUST NEVER treat `local_path` as a path on the backend server. Path existence and git integrity MUST be validated by the paired Runner. | `DECISION` |
| **BR-WKR-003** | Tenant Isolation & IDOR Guard | A user can only view, edit, validate, or delete workspaces and runners where `owner_id == current_user.id`. Changing the `id` in requests yields `404 Not Found` or `403 Forbidden`. | `DECISION` |
| **BR-WKR-004** | Busy Workspace Protection | A workspace cannot be deleted or disabled while an active task is in state `PLANNING`, `RUNNING`, or `WAITING_APPROVAL`. The user must abort or finish tasks first. | `DECISION` |
| **BR-WKR-005** | Runner Capability Verification | A task requesting runtime `antigravity` or `claude_code` can only be dispatched to an Agent Runner whose reported `capabilities` explicitly include that runtime with status `AVAILABLE`. | `DECISION` |
| **BR-WKR-006** | Outbound Network Boundary | Agent Runners must initiate all connections outbound to the Backend. The Backend and Runner must NEVER expose an unauthenticated inbound TCP/shell port. | `DECISION` |
| **BR-WKR-007** | Heartbeat Expiration | If a Runner fails to submit a heartbeat within 60 seconds (`TTL = 60s`), the Backend marks its status as `OFFLINE`. Active running tasks transition to `SUSPENDED_OFFLINE`. | `DECISION` |

---

## 3. Functional Requirements

### 3.1 Development Workspace Management

| ID | Title | Description | Priority |
|---|---|---|---|
| **FR-WKR-001** | Create Workspace | The system shall allow an authenticated user to create a Development Workspace by providing `name`, `local_path` (runner filesystem path), optional `git_remote_url`, and associating an online `runner_id`. | P0 |
| **FR-WKR-002** | Initial Workspace Status | Newly created workspaces shall enter status `PENDING_VALIDATION` until verified by the associated Runner. | P0 |
| **FR-WKR-003** | Validate Workspace Path | The system shall instruct the paired Runner to verify that `local_path` exists, is a readable/writable directory, and check whether it contains a valid Git repository (`.git`). | P0 |
| **FR-WKR-004** | Update Workspace Status | Upon validation receipt from Runner, status transitions to `READY` (if valid git repo), `NON_GIT_READY` (if folder valid but not git), or `UNAVAILABLE` (if path not found or permission denied). | P0 |
| **FR-WKR-005** | List User Workspaces | The system shall list all workspaces owned by the authenticated user with status badges, runner name, default branch, and timestamp. | P0 |
| **FR-WKR-006** | Get Workspace Detail | The system shall return workspace details including active branch, last git commit hash, validation error details (if any), and active task count. | P0 |
| **FR-WKR-007** | Update Workspace Metadata | The system shall allow updating workspace `name`, `default_branch`, or re-linking to another Runner owned by the same user. | P1 |
| **FR-WKR-008** | Disable / Enable Workspace | The system shall allow transitioning workspace status to `DISABLED` to prevent new task dispatches without deleting history. | P1 |
| **FR-WKR-009** | Delete Workspace | The system shall allow soft-deleting or hard-deleting a workspace if no active tasks are running (`BR-WKR-004`). Deleting a workspace removes database metadata; it MUST NEVER delete files on the developer host. | P0 |
| **FR-WKR-010** | Revalidate Workspace | The system shall allow on-demand revalidation of a workspace (e.g. after the user fixes disk permissions or clones git). | P1 |
| **FR-WKR-011** | Bind Workspace to Project | The system shall allow associating a `workspace_id` to an existing `projects` record via `PUT /api/v1/projects/{project_id}`. | P0 |
| **FR-WKR-012** | Sensitive Path Masking | The system shall mask system-level user home paths in UI responses when viewed in non-owner contexts (e.g. `C:\Users\***\Project\ai-chan`). | P1 |

### 3.2 Agent Runner Registration & Lifecycle

| ID | Title | Description | Priority |
|---|---|---|---|
| **FR-RUN-001** | Generate Pairing Token | An authenticated user shall be able to request a single-use Pairing Token (`rpt_<uuid>`) with a 15-minute time-to-live (TTL). | P0 |
| **FR-RUN-002** | Runner Handshake / Pairing | The Runner shall exchange the Pairing Token with the Backend along with machine fingerprint, hostname, OS, and platform architecture (`POST /api/v1/orchestrator/runners/pair`). | P0 |
| **FR-RUN-003** | Issue Runner Credentials | Upon successful pairing, the Backend shall invalidate the pairing token and return a permanent `runner_id` and a hashed Runner Secret Key (`rsk_<base64>`). | P0 |
| **FR-RUN-004** | Runner Heartbeat Protocol | The Runner shall send a periodic heartbeat (`POST /api/v1/orchestrator/runners/{id}/heartbeat`) every 15–30 seconds containing CPU/RAM metrics, active task status, and timestamp. | P0 |
| **FR-RUN-005** | Capability Discovery | During handshake and heartbeat, the Runner shall detect and report local CLI runtimes (`antigravity` CLI path & version, `claude` CLI version, `git` version). | P0 |
| **FR-RUN-006** | Secret Filtering | The Runner MUST filter and strip all environment variables, API keys, tokens, and cookies from capability reports and heartbeat payloads before transmission. | P0 |
| **FR-RUN-007** | Runner Status Transitions | Runner status shall follow: `PENDING` -> `ONLINE` <-> `OFFLINE`; or `REVOKED`. Status auto-transitions to `OFFLINE` if heartbeat expires (`BR-WKR-007`). | P0 |
| **FR-RUN-008** | List User Runners | The system shall list all runners registered to the authenticated user with status pills, IP/hostname, last seen delta, and detected tools. | P0 |
| **FR-RUN-009** | Revoke Runner | The system shall allow the user to immediately revoke a Runner (`POST /api/v1/orchestrator/runners/{id}/revoke`). All subsequent requests from the runner must return `401 Unauthorized`. | P0 |
| **FR-RUN-010** | Rotate Runner Secret | The system shall allow rotating the runner secret key by generating a new secret and invalidating the prior secret after an optional grace period. | P1 |
| **FR-RUN-011** | Long-Polling / Event Dispatch | The Runner shall listen for assigned tasks via long-polling or SSE stream (`GET /api/v1/orchestrator/runners/{id}/task-channel`). | P0 |
| **FR-RUN-012** | Automatic Reconnect & Backoff | Upon connection loss, the Runner shall retry connecting with exponential backoff with jitter (initial: 2s, max: 60s). | P0 |
| **FR-RUN-013** | Protocol Version Negotiation | The Runner and Backend shall exchange protocol version headers (`X-Runner-Protocol-Version: 1.0`). Incompatible major versions shall return `426 Upgrade Required`. | P1 |
| **FR-RUN-014** | Clean Runner Teardown | On shutdown (SIGINT/SIGTERM), the Runner shall send a farewell beacon (`POST /api/v1/orchestrator/runners/{id}/offline`) to transition status to `OFFLINE` immediately. | P1 |

---

## 4. Use Cases

### 4.1 UC-WKR-01: Create and Validate Development Workspace
- **Primary Actor:** Authenticated Developer
- **Preconditions:**
  - Developer is logged into AI-Chan (`current_user` authenticated).
  - An Agent Runner is registered and in `ONLINE` status.
- **Main Flow:**
  1. Developer navigates to `/workspaces` and clicks "New Workspace".
  2. Developer enters Workspace Name (e.g., `ai-chan-core`), selects an online Runner, and inputs the Host Local Path (e.g., `C:\Users\PC\Project\ai-chan`).
  3. Developer clicks "Create & Verify".
  4. Backend creates workspace record in database with status `PENDING_VALIDATION`.
  5. Backend emits a validation challenge to the selected Runner via its active event channel.
  6. Runner verifies:
     - Directory exists on host filesystem.
     - Process has read/write permissions.
     - Directory contains `.git` folder and executes `git status --porcelain` and `git rev-parse --abbrev-ref HEAD`.
  7. Runner sends validation result back to Backend (`status: READY, branch: main, clean: true`).
  8. Backend updates workspace status to `READY` and default branch to `main`.
  9. Frontend displays green `READY` badge with branch details.
- **Alternate / Error Flows:**
  - *AF-1 (Runner Offline):* Selected Runner is not online. UI prevents submission with message "Selected Runner is currently offline."
  - *AF-2 (Path Does Not Exist):* Runner reports path missing. Status set to `UNAVAILABLE`. UI displays "Directory not found on runner host."
  - *AF-3 (Non-Git Folder):* Runner confirms folder exists, but no `.git` directory. Status set to `NON_GIT_READY`. UI displays warning "Folder is not a Git repository. Version control features will be disabled."
  - *AF-4 (Dirty Working Tree):* Runner reports uncommitted changes. Status set to `READY` with warning flag `has_uncommitted_changes: true`.
- **Permissions:** Owner only (`workspace.owner_id == current_user.id`).
- **Acceptance Criteria:**
  - Workspace created in database with accurate status.
  - Zero disk operations occur on the backend server itself.
  - Local path validated strictly on the runner host.

---

### 4.2 UC-RUN-01: Pair Agent Runner using One-Time Token
- **Primary Actor:** Developer (initiator) & Agent Runner Daemon (client)
- **Preconditions:** Developer is logged into AI-Chan web interface.
- **Main Flow:**
  1. Developer navigates to `/settings/runners` and clicks "Pair New Runner".
  2. Backend generates a 15-minute pairing token `rpt_d3a8...` and displays pairing command:
     `ai-chan-runner pair --token rpt_d3a8... --server http://localhost:8000`
  3. Developer executes command in terminal on developer workstation.
  4. Runner gathers host metadata (OS, architecture, hostname, detected CLI tools: `agy`, `claude`, `git`).
  5. Runner calls `POST /api/v1/orchestrator/runners/pair` with pairing token and host metadata.
  6. Backend verifies pairing token is valid and unexpired:
     - Creates new runner in database with status `ONLINE`.
     - Generates permanent `runner_id` and cryptographically random `runner_secret` (`rsk_...`).
     - Stores hash of `runner_secret` in database.
     - Invalidates the one-time pairing token.
  7. Backend responds with `runner_id`, `runner_secret`, and heartbeat interval (30s).
  8. Runner persists credentials locally in secure configuration (`~/.ai-chan/runner.json` with `0600` permissions) and initiates heartbeat loop.
  9. Frontend automatically detects pairing completion via SSE/polling and displays runner card as `ONLINE`.
- **Alternate / Error Flows:**
  - *AF-1 (Expired / Invalid Token):* Runner sends expired token. Backend responds `400 Bad Request` (`TOKEN_EXPIRED`). Runner terminates with clear error message.
  - *AF-2 (Replay Attack):* Token used a second time. Backend responds `409 Conflict` (`TOKEN_ALREADY_USED`).
- **Permissions:** Authenticated user creates token; anonymous runner pairs with valid token.
- **Acceptance Criteria:**
  - Pairing token single-use enforced.
  - Runner secret returned in plaintext exactly once; database stores only salted hash (SHA-256 / bcrypt).

---

### 4.3 UC-RUN-02: Runner Heartbeat & Offline Detection
- **Primary Actor:** Agent Runner Daemon & Backend Scheduler
- **Main Flow:**
  1. Every 25 seconds, Runner calls `POST /api/v1/orchestrator/runners/{id}/heartbeat` with headers `X-Runner-Id` and `Authorization: Bearer <runner_secret>`.
  2. Payload includes CPU%, Memory%, current task ID (if busy), and timestamp.
  3. Backend validates runner secret hash, updates `last_heartbeat_at`, and responds `200 OK`.
  4. Backend scheduled sweep (runs every 30s) identifies any runner with `last_heartbeat_at < NOW() - 60s`.
  5. Runner status automatically updated to `OFFLINE`.
  6. Any active task assigned to this runner transitions to `SUSPENDED_OFFLINE`.

---

## 5. Non-Functional Requirements

| ID | Category | Requirement Statement | Metric / Target |
|---|---|---|---|
| **NFR-WKR-001** | Performance | Workspace validation round-trip (Frontend -> Backend -> Runner -> Backend -> Frontend) shall complete within 3 seconds under normal network conditions. | < 3,000 ms (p95) |
| **NFR-RUN-001** | Scalability | Backend shall support at least 100 concurrent runner heartbeats per second with < 5% CPU utilization on SQLite/FastAPI. | > 100 req/sec |
| **NFR-SEC-001** | Security | Runner secrets must be generated with at least 256 bits of cryptographic entropy and stored hashed at rest. | SHA-256 with salt |
| **NFR-REL-001** | Reliability | Runner must automatically reconnect upon transient network disconnects without process crash or credential invalidation. | 100% recovery after network restored |
| **NFR-UX-001** | Usability | Workspace and Runner status badges must be color-coded and provide tooltip explanations for error states. | Accessibility WCAG AA contrast |
