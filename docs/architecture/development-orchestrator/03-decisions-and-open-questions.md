# 03. Decisions, ADRs, and Open Questions — Development Orchestrator

> **Status:** Baseline Architecture Proposal
> **Audience:** Core Engineering Team & Product Architecture
> **Fact Classification Policy:**
> - `FACT`: Empirically verified in repository code, tests, or environment.
> - `DECISION`: Architectural choice made for safety, maintainability, and compatibility.
> - `ASSUMPTION`: Working hypothesis based on domain standards, subject to validation.
> - `OPEN QUESTION`: Trade-off requiring user/stakeholder feedback or empirical benchmarking.

---

## 1. Architectural Decision Records (ADRs)

### ADR-DO-001: Separation of Development Workspace & Task from Visual Project Graph

- **Context:** The existing `projects` table stores node-link visual workflow graphs in JSON (`graph_data`). A user could be tempted to store development workspace paths or active CLI execution sessions as nodes in this graph.
- **Decision:** **Separate entities entirely.** Introduce `development_workspaces` and `development_tasks` as dedicated database entities. AI-Chan Projects may optionally reference a Development Workspace as an execution context, but never store repository filesystem paths or live child process states inside `projects.graph_data`.
- **Rationale:** 
  - Visual prompt graphs are declarative and persistent; development tasks are transient, stateful, and tied to physical host machines.
  - Keeps the React Flow canvas editor clean and focused on prompt engineering without breaking existing project workflows.
- **Consequences:** 
  - Positive: Clean separation of concerns, zero schema migration risks for existing projects.
  - Negative: Requires new dedicated navigation and management screens in the frontend.

---

### ADR-DO-002: Outbound Agent Runner Architecture (Zero Inbound Ports)

- **Context:** The user requested orchestrating local developer tools (Antigravity CLI and Claude Code). Developer machines are typically behind NATs, firewalls, or dynamic IPs. Opening an SSH/PTY/shell port directly on the host or exposing an unauthenticated shell endpoint on the backend creates an extreme Remote Code Execution (RCE) vulnerability.
- **Decision:** **Outbound Agent Runner Pattern.** The Agent Runner process runs on the developer's workstation alongside the target repository. It connects **outbound** to the AI-Chan Backend Control Plane (using authenticated HTTP long-polling, SSE, or WebSocket). The backend dispatches tasks down the established channel; the runner executes CLI commands locally and streams events back.
- **Rationale:** 
  - Zero open inbound ports required on the developer's computer.
  - Protects against public exposure and network scanning.
  - Allows running tasks across any operating system (Windows, macOS, Linux) without exposing firewall holes.
- **Consequences:**
  - Positive: Military-grade security model; works seamlessly in corporate networks, VPNs, and home NATs.
  - Negative: Requires running an agent daemon on the local developer machine.

---

### ADR-DO-003: SQLite Migration for Orchestrator State

- **Context:** `ai-backend` currently utilizes synchronous standard library `sqlite3` connecting to `database/app.db` managed by sequential SQL migration files (`002` to `010`).
- **Decision:** Add migration `011_create_orchestrator_tables.sql` defining:
  - `development_workspaces`
  - `agent_runners`
  - `development_tasks`
  - `task_artifacts`
  - `task_logs`
- **Rationale:** Preserves exact database pattern already tested and proven in the codebase. Avoids disrupting existing services or introducing premature ORM refactoring.
- **Consequences:**
  - Positive: Immediate compatibility with `ai-backend/database/apply_migrations.py`.
  - Negative: Heavy real-time log writes should be batched or buffered in memory to prevent SQLite disk locking during rapid streaming.

---

### ADR-DO-004: Standardized Runtime Adapter Interface

- **Context:** Antigravity CLI (`agy`) and Claude Code CLI (`claude`) have different CLI flags, subcommands, and stream outputs.
- **Decision:** Implement an abstract class `BaseRuntimeAdapter` defining a polymorphic interface:
  - `check_availability()` -> checks CLI binary presence, version, and credentials.
  - `start_task(workspace_path, prompt, options)` -> spawns subprocess with controlled flags.
  - `stream_events()` -> yields structured events (`stdout`, `stderr`, `tool_call`, `approval_needed`).
  - `submit_approval(approved)` -> passes user approval signal to awaiting process.
  - `abort_task()` -> terminates process tree safely.
- **Rationale:** Decouples task lifecycle logic from specific CLI vendor quirks. New CLI tools (e.g., Aider, Copilot Workspace) can be added without modifying the core orchestrator.
- **Consequences:**
  - Positive: High testability, clear mock boundaries for unit testing.
  - Negative: Requires writing adapter parsers for each CLI tool's unique output format.

---

### ADR-DO-005: Server-Sent Events (SSE) for Real-Time Task Telemetry

- **Context:** The frontend needs to stream terminal output, step progress, and approval gates.
- **Decision:** Use FastAPI `StreamingResponse` with Server-Sent Events (`text/event-stream`), matching the established pattern in `FloatingProjectChat.tsx` and `projects.py:chat`. User approval decisions and cancel requests are sent via standard REST POST requests (`POST /api/v1/tasks/{id}/approval`).
- **Rationale:** 
  - SSE is unidirectional and perfectly suited for streaming logs from backend to frontend.
  - Existing frontend stack already includes `@microsoft/fetch-event-source` and handles automatic reconnection and error states cleanly.
  - Avoids adding complex WebSocket framing or Redis pub/sub dependencies.
- **Consequences:**
  - Positive: Zero new npm packages or python packages needed.
  - Negative: Two-way control (approvals/cancellations) uses HTTP POST instead of full-duplex WebSocket frames.

---

## 2. Fact Classification Register

| ID | Item Description | Classification | Evidence / Basis |
|---|---|---|---|
| **FC-01** | Antigravity CLI v1.2.16 is installed on the local developer host (`C:\Users\PC\AppData\Local\agy\bin\agy.exe`). | `FACT` | Verified via terminal execution `agy --version` on 2026-10-15. |
| **FC-02** | Claude Code CLI v2.1.300 is available on npm registry, but not currently installed on the host. | `FACT` | Verified via npm registry query on 2026-10-15. |
| **FC-03** | AI-Chan backend does not currently have any shell execution or runner infrastructure. | `FACT` | Source tree audit verified zero `subprocess` or `pty` usage in `ai-backend`. |
| **FC-04** | Local development environment uses SQLite at `ai-backend/database/app.db`. | `FACT` | Verified in [ai-backend/src/db.py](file:///c:/Users/PC/Project/ai-chan/ai-backend/src/db.py). |
| **FC-05** | The user expects the Development Orchestrator to support both Antigravity CLI and Claude Code as interchangeable runtimes. | `ASSUMPTION` | Target requirement outlined in project design goals. |
| **FC-06** | The developer workstation will run both the AI-Chan backend and the local codebase being modified in single-user mode initially. | `ASSUMPTION` | Default local developer workflow assumption. |
| **FC-07** | Git repository changes must be isolated to a dedicated branch before running agent modifications. | `DECISION` | Prevents corrupting user's working tree or causing accidental uncommitted data loss. |
| **FC-08** | Task logs and terminal output will be streamed via SSE using standard event envelopes. | `DECISION` | Extends proven pattern from [FloatingProjectChat.tsx](file:///c:/Users/PC/Project/ai-chan/ai-frontend/src/components/chat/FloatingProjectChat.tsx). |
| **FC-09** | Should the Agent Runner be packaged as an embedded in-process worker or a standalone CLI daemon? | `OPEN QUESTION` | Detailed below with recommended safe default. |
| **FC-10** | How should terminal ANSI color codes and interactive prompts be rendered in the frontend? | `OPEN QUESTION` | Detailed below with recommended safe default. |

---

## 3. Open Questions and Recommended Safe Defaults

### Question 1: Runner Packaging Mode (Embedded vs. Standalone Daemon)
- **Question:** Should the initial Agent Runner implementation run as an embedded thread/process inside the FastAPI backend, or as an independent standalone daemon process (`ai-chan-runner`)?
- **Analysis:**
  - *Embedded Worker:* Simpler to run for local development (single `uvicorn` command runs everything). However, it couples backend server uptime to runner execution.
  - *Standalone Daemon:* Clean architectural separation; runner can run on any host and communicates strictly over HTTP.
- **Recommended Safe Default (`DECISION`):**
  - **Phase 1 (Immediate / Prompt 01-02):** Implement a modular `HostRunnerService` that can run embedded within the local backend for seamless single-command development, while strictly maintaining the HTTP/REST client interface boundaries so it can be extracted into a standalone executable daemon in Phase 2 without rewriting execution logic.

### Question 2: Handling Interactive CLI Prompts & Approval Gates
- **Question:** Both Antigravity CLI and Claude Code can prompt for interactive user confirmation (e.g., file edit approval, terminal command execution). How should interactive input be handled?
- **Analysis:**
  - Directly running an unbuffered PTY (pseudo-terminal) over WebSocket is complex and brittle across Windows/POSIX shells.
  - Running in non-interactive/automation mode with explicit checkpoint approvals allows AI-Chan to parse structured diffs and present a clean GUI approval modal.
- **Recommended Safe Default (`DECISION`):**
  - Run CLI engines with automation/headless flags where supported (e.g. `--non-interactive` or equivalent instructions).
  - Intercept planned tool execution and present the user with a unified diff and structured action list inside the AI-Chan UI before the agent proceeds to write to disk.

### Question 3: ANSI Terminal Rendering vs. Structured Step Cards
- **Question:** Should the UI display a raw black terminal screen with ANSI escape codes, or parse steps into modern structured UI cards?
- **Analysis:**
  - Raw terminal feels like a developer tool, but unstructured log dumping misses the elegance of the AI-Chan design system.
  - Structured step cards (e.g., "Planning", "Running `npm test`", "Editing `src/utils.ts`") give clean visibility.
- **Recommended Safe Default (`DECISION`):**
  - **Hybrid Console:** Provide a split or collapsible view:
    1. Structured Step Progress Timeline at the top (status badges, duration, tool name).
    2. Expandable Raw Terminal Output drawer at the bottom (styled with dark theme `--bg-surface` and monospace font, stripping or parsing basic ANSI colors).

---

## 4. Canonical Architecture References & ADR Index
- [ADR-015: Development Workspace and Agent Runner Architecture](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-015-development-workspace-and-agent-runner.md)
- [SRS Specification: Development Workspace & Agent Runner](file:///c:/Users/PC/Project/ai-chan/docs/architecture/development-orchestrator/workspace-runner-srs.md)
- [Domain Model & DDL Migration Specification — Workspace & Runner](file:///c:/Users/PC/Project/ai-chan/docs/architecture/development-orchestrator/workspace-runner-domain-model.md)
- [API Contract Specification — Workspace & Runner](file:///c:/Users/PC/Project/ai-chan/docs/architecture/development-orchestrator/workspace-runner-api-contract.md)
- [UX Specifications & User Flows — Workspace & Runner](file:///c:/Users/PC/Project/ai-chan/docs/architecture/development-orchestrator/workspace-runner-ux-flows.md)
- [Security Specification & Threat Model — Workspace & Runner](file:///c:/Users/PC/Project/ai-chan/docs/architecture/development-orchestrator/workspace-runner-security-threat-model.md)
- [Mermaid Diagrams Compilation — Workspace & Runner](file:///c:/Users/PC/Project/ai-chan/docs/architecture/development-orchestrator/diagrams/workspace-runner.mmd)
- [Runtime Adapter Contract Specification](file:///c:/Users/PC/Project/ai-chan/docs/architecture/development-orchestrator/runtime-adapter-contract.md)
- [Antigravity CLI Adapter Specification](file:///c:/Users/PC/Project/ai-chan/docs/architecture/development-orchestrator/antigravity-adapter-spec.md)
- [Normalized Runtime Events Specification](file:///c:/Users/PC/Project/ai-chan/docs/architecture/development-orchestrator/normalized-runtime-events.md)
- [Runtime Security Policy & Failure Taxonomy](file:///c:/Users/PC/Project/ai-chan/docs/architecture/development-orchestrator/runtime-security-policy.md)
- [Mermaid Diagrams Compilation — Runtime Adapter](file:///c:/Users/PC/Project/ai-chan/docs/architecture/development-orchestrator/diagrams/runtime-adapter.mmd)
- [Development Task SRS Specification](file:///c:/Users/PC/Project/ai-chan/docs/architecture/development-orchestrator/development-task-srs.md)
- [Development Task Lifecycle & State Machine](file:///c:/Users/PC/Project/ai-chan/docs/architecture/development-orchestrator/development-task-lifecycle.md)
- [Development Task Domain Model & Persistence Specification](file:///c:/Users/PC/Project/ai-chan/docs/architecture/development-orchestrator/development-task-domain-model.md)
- [Development Task API Contract Specification](file:///c:/Users/PC/Project/ai-chan/docs/architecture/development-orchestrator/development-task-api-contract.md)
- [Development Task UX Specifications](file:///c:/Users/PC/Project/ai-chan/docs/architecture/development-orchestrator/development-task-ux.md)
- [Development Task Security & Operations Specification](file:///c:/Users/PC/Project/ai-chan/docs/architecture/development-orchestrator/development-task-security-and-operations.md)
- [Mermaid Diagrams Compilation — Task Lifecycle](file:///c:/Users/PC/Project/ai-chan/docs/architecture/development-orchestrator/diagrams/task-lifecycle.mmd)

---

## 5. Immediate Execution Checklist for Prompts 01–03

- [x] **Prompt 00 Complete:** Baseline audit, capability gap matrix, context boundaries, and decisions documented.
- [x] **Prompt 01 Complete:** Detailed specification for Development Workspace and Agent Runner (SRS, Domain Model, API Contract, UX Flows, Threat Model, 7 Mermaid Diagrams, ADR-015).
- [x] **Prompt 02 Complete:** Runtime Adapter Contract, Antigravity CLI Adapter Spec (verified with local `agy.exe` v1.2.16 & official headless docs), Normalized Events, Security Policy & Failure Taxonomy, 6 Mermaid Diagrams.
- [x] **Prompt 03 Complete:** Development Task Management, 14-state Machine, Domain Model (TaskAttempt, TaskEvent, TaskArtifact, TaskApproval), API Contract, UX Specifications, Security & Operations, 10 Mermaid Diagrams.
