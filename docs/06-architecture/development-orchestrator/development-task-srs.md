# Software Requirements Specification (SRS)
## Capability: Development Task Management

> **Document ID:** SRS-TSK-01  
> **Version:** 1.0.0  
> **Status:** PROPOSED (Prompt 03 Baseline)  
> **Standard:** ISO/IEC/IEEE 29148:2018 Compliant  
> **Fact Classification:** `FACT` (verified codebase conventions), `DECISION` (selected architecture rules), `ASSUMPTION` (working hypothesis).

---

## 1. Scope and Core Principles

The **Development Task Management** subsystem serves as the central control plane coordinating software engineering change requests executed by Agent Runners.

### 1.1 Core Architecture Principles
1. **Source of Truth (`DECISION`):** The `development_tasks` and `task_attempts` tables are the sole canonical source of truth for execution states, attempts, logs, and artifacts. State MUST NOT be stored in `projects.graph_data` or exclusively inside chat message histories.
2. **Chat as Interface Channel (`DECISION`):** Chat is an entry point and conversational view. Normal chat queries remain pure Q&A. Development Tasks are explicitly created when the user initiates a coding action ("Convert to Task" or explicit `/task` command), ensuring accidental chat messages never trigger unmonitored terminal commands.
3. **Multi-Entity Association (`DECISION`):** A task is linked to:
   - Tenant/User (`user_id`)
   - AI-Chan Project (`project_id`)
   - Development Workspace (`workspace_id`)
   - Agent Runner (`runner_id`)
   - Target Runtime (`runtime`: `"antigravity"` | `"claude_code"`)
4. **Execution Evidence vs. Acceptance (`DECISION`):** An LLM stating *"I have finished the task"* is NOT accepted as proof of completion. A task requires:
   - Process exit code `0` and a verified `TerminalResult`.
   - Verification policy passing (git diff generated, tests passing if requested).
   - Final review and acceptance by the human developer (`REVIEW_REQUIRED` -> `COMPLETED`).
5. **Single-Runtime Execution (MVP Rule, `BR-TSK-001`):** In MVP, a task is executed by exactly one runtime engine on one runner at any given time. Multi-agent runtime handoffs are deferred to future milestones.

---

## 2. Business Rules & Governance

| ID | Title | Rule Statement |
|---|---|---|
| **BR-TSK-001** | Single Runtime MVP | Exactly one Agent Runtime operates on a task during an execution attempt. |
| **BR-TSK-002** | Anti-Double Dispatch | A task can only have one active `task_attempts` record in state `DISPATCHING`, `RUNNING`, or `VERIFYING`. Duplicate dispatch calls return `409 Conflict`. |
| **BR-TSK-003** | Human Approval Gate | If a task or workspace policy requires plan approval (`ExecutionPolicy.require_approval_for_tools == True`), the runner pauses at `AWAITING_APPROVAL` and MUST NOT write to the filesystem until the user submits `APPROVED`. |
| **BR-TSK-004** | Acknowledged Cancellation | A task cannot transition to terminal `CANCELLED` until the Agent Runner sends an explicit process termination acknowledgment beacon confirming the process tree is killed. |
| **BR-TSK-005** | Mutating Retry Invariance | If an attempt fails after mutating workspace files, the orchestrator MUST NOT automatically re-execute without human confirmation. Re-running requires creating a new `TaskAttempt` (Attempt #2). |
| **BR-TSK-006** | Tenant Isolation | All task queries, event streams, artifacts, and actions MUST enforce `user_id == current_user.id`. IDOR requests yield `404 Not Found`. |
| **BR-TSK-007** | Clean Branch Isolation | Mutating tasks (`mode: "accept-edits"`) require the Runner to verify that `git status --porcelain` is clean or create an isolated branch (`ai-chan/task-{task_id}`) prior to tool execution. |
| **BR-TSK-008** | Workspace Concurrency Lock | At most ONE active task mutating files is permitted per workspace at any time. Dispatching a second task on an active workspace returns `409 Conflict`. |
| **BR-TSK-009** | Git Worktree Isolation | Every mutating task attempt operates inside an isolated Git worktree under `.ai-chan/worktrees/{attempt_id}` branching off `HEAD`. Main working tree uncommitted changes are strictly preserved and never overwritten or reset. |
| **BR-TSK-010** | Verification Command Allowlist | Verification commands (lint, test, typecheck, build) must execute binary executables directly (`shell=False`) from an approved allowlist. Banned shell operators (`|`, `&`, `;`, `>`, `<`, `$`, '`') are strictly rejected. |
| **BR-TSK-011** | Diff Security Redaction & Cap | Unified diff generation is capped at 500 KB and automatically redacts files matching credential patterns (`.env*`, `*.key`, `*.pem`, `id_rsa*`). |
| **BR-TSK-012** | Review Gates & Follow-Up Attempts | At `REVIEW_REQUIRED`, the reviewer may `APPROVE`, `REQUEST_CHANGES`, or `REJECT`. Requesting changes spawns a follow-up attempt linked via `parent_attempt_id` with reviewer feedback preserved and injected into the follow-up prompt. |

---

## 3. Functional Requirements

### 3.1 Task Creation & Pre-Flight

| ID | Title | Description | Priority |
|---|---|---|---|
| **FR-TSK-001** | Create Task from Chat | The system shall allow creating a Development Task directly from a project chat message or modal, preserving verbatim user prompt text. | P0 |
| **FR-TSK-002** | Explicit Task Intent | Conversational messages shall NOT automatically spawn CLI tasks. Creation requires explicit user action ("Create Task" button or intent toggle). | P0 |
| **FR-TSK-003** | Pre-Flight Validation | Before dispatch, the system shall verify: (a) Workspace status is `READY` or `NON_GIT_READY`, (b) Paired Runner is `ONLINE`, (c) Runtime is installed and reported as `AVAILABLE`. | P0 |
| **FR-TSK-004** | Idempotency Key | The task creation API shall accept an `Idempotency-Key` header to prevent double-clicks from generating duplicate tasks. | P0 |
| **FR-TSK-005** | Initial Plan Mode | All coding tasks shall default to `mode: "plan"` for initial discovery and plan generation before file edits are unlocked. | P0 |

### 3.2 Dispatch, Execution & Event Ingestion

| ID | Title | Description | Priority |
|---|---|---|---|
| **FR-TSK-006** | Task Dispatch | The system shall dispatch the task spec to the Runner via its long-lived SSE/polling channel and transition task state to `DISPATCHING` -> `RUNNING`. | P0 |
| **FR-TSK-007** | Sequential Event Storage | The system shall ingest normalized events from the Runner, validating monotonic sequence numbers and rejecting duplicates. | P0 |
| **FR-TSK-008** | Real-Time SSE Streaming | The system shall broadcast normalized events to connected frontend clients over Server-Sent Events (`/api/v1/orchestrator/tasks/{id}/events`). | P0 |
| **FR-TSK-009** | Reconnection & Catch-Up | Clients reconnecting with `Last-Event-ID` shall receive missed events from an in-memory ring buffer before live streaming resumes. | P0 |
| **FR-TSK-010** | Approval Interception | When the agent submits an action plan or requests destructive tool execution, the task shall transition to `AWAITING_APPROVAL` and notify the UI. | P0 |
| **FR-TSK-011** | Submit Approval Decision | The user shall be able to `APPROVE` or `REJECT` a pending plan/tool call via `POST /api/v1/orchestrator/tasks/{id}/approval`. | P0 |

### 3.3 Cancellation, Verification & Completion

| ID | Title | Description | Priority |
|---|---|---|---|
| **FR-TSK-012** | Cancel Running Task | The user shall be able to cancel a running task. The task transitions to `CANCELLING` while the Runner kills the process tree, entering `CANCELLED` once acknowledged. | P0 |
| **FR-TSK-013** | Verification Phase | When the agent finishes tool execution, the task shall enter `VERIFYING` to run automated sanity checks (e.g. `git diff` generation, lint/test check). | P0 |
| **FR-TSK-014** | Human Review Required | Upon successful verification, the task shall enter `REVIEW_REQUIRED`. The user reviews the unified diff, test outputs, and clicks `Accept Changes` or `Reject / Revert`. | P0 |
| **FR-TSK-015** | Task Completed | The task transitions to `COMPLETED` only when accepted by the user or auto-accepted if policy permits. | P0 |
| **FR-TSK-016** | Task Attempt History | Retrying a failed task shall spawn a new `TaskAttempt` (e.g., Attempt #2) linked to the parent task, retaining full audit logs of prior attempts. | P1 |
| **FR-TSK-017** | Session Resume | If the runtime supports conversation resume (`antigravity` via `--conversation`), the user can choose to continue the task session rather than starting from scratch. | P1 |
| **FR-TSK-018** | Worktree Isolation Manager | The runner shall create collision-proof worktrees under `.ai-chan/worktrees/{attempt_id}` and isolate all filesystem writes from the main branch. | P0 |
| **FR-TSK-019** | Verification Step Reports | The runner shall report per-step verification results (`PASSED`, `FAILED`, `ERROR`, `SKIPPED_BY_POLICY`, `NOT_RUN`) with command, exit code, duration, and output preview to `POST /runners/tasks/verification-reports`. | P0 |
| **FR-TSK-020** | Unified Diff Security Filter | The runner shall mask sensitive files matching `.env*`, `*.key`, `*.pem`, `id_rsa*` with `[REDACTED_SENSITIVE_CONTENT]` and cap diff size at 500 KB. | P0 |
| **FR-TSK-021** | Review Gate Decision API | The control plane shall support `APPROVE`, `REQUEST_CHANGES`, and `REJECT` via `POST /tasks/{id}/review`. | P0 |
| **FR-TSK-022** | Safe Worktree Cleanup | The system shall refuse destructive worktree cleanup if uncommitted changes exist, preserving changes until explicit developer confirmation. | P0 |

---

## 4. Non-Functional Requirements

| ID | Category | Requirement Statement | Metric / Target |
|---|---|---|---|
| **NFR-TSK-001** | Event Latency | Normalized events emitted by the Runner shall be visible in the user's browser within 500 ms under standard network conditions. | < 500 ms (p95) |
| **NFR-TSK-002** | Event Ingestion Throughput | The backend shall ingest up to 200 events/second per active task without database lock contention. | > 200 events/sec |
| **NFR-TSK-003** | Idempotency | Duplicate dispatch requests with the same idempotency key within 60 seconds shall return the existing attempt without spawning new processes. | 100% duplicate rejection |
| **NFR-TSK-004** | Cancellation Latency | Total elapsed time from user clicking "Cancel" to process tree termination confirmation shall not exceed 12 seconds. | < 12 seconds |
| **NFR-TSK-005** | Log Redaction Completeness | Zero API keys, passwords, or unmasked user home paths shall be present in Tier 3 presentation events. | 100% regex sanitization |
| **NFR-TSK-006** | Diff Payload Cap | Diff payloads transferred from runner to control plane and UI shall never exceed 500 KB. | <= 500 KB |
| **NFR-TSK-007** | Subprocess Tree Cleanup | Orphaned verification or runner subprocesses shall be terminated within 5 seconds using OS process group termination. | < 5 seconds |
