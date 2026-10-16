# Decommission Inventory & Dependency Map — External Project Development / Workspace / Task Orchestrator

**Status:** APPROVED FOR DECOMMISSION  
**Date:** 2026-10-16  
**Target Subsystem:** Legacy External Project Development, Workspace Manager, Task Orchestrator, Local Agent Runner (`ai-runner`), and Antigravity Runtime Adapter.

---

## 1. Executive Summary & Context

Hệ thống điều phối coding CLI qua giao diện website AI-Chan (Workspace Manager, Task Orchestrator, Local Agent Runner daemon, Antigravity CLI Adapter) đã được đánh giá không đạt mục tiêu sử dụng và cần được **gỡ bỏ hoàn toàn có kiểm soát**.
Mục tiêu là đưa codebase về trạng thái sạch, ổn định, bảo toàn 100% các tính năng độc lập (Chat, Auth, Project Builder / Canvas, System Prompts, Skills, Models/Providers, Telemetry, và Discord Bot hiện có), chuẩn bị cho việc xây dựng Discord CLI Bridge ở nhiệm vụ tiếp theo.

---

## 2. Inventory & Dependency Map

| Path/Component | Purpose | References / Consumers | Shared or Dedicated | Action | Risk | Verification Plan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `ai-frontend/src/app/(app)/workspaces/` | Trang quản lý Workspace (list, create, detail, runner pairing dialog) | User navigation, Sidebar `workspaces` | **Dedicated** | **REMOVE** | Low | Next.js build passes; route 404s gracefully without runtime crashes. |
| `ai-frontend/src/app/(app)/tasks/` | Trang danh sách & chi tiết Task (terminal stream, timeline, diff, verification, artifacts) | User navigation, Sidebar `tasks` | **Dedicated** | **REMOVE** | Low | Next.js build passes; route 404s gracefully without runtime crashes. |
| `ai-frontend/src/components/ui/SafeMarkdown.tsx` | Sanitize & render markdown stream & artifact content | Only imported in `tasks/[id]/page.tsx` | **Dedicated** | **REMOVE** | Low | Grep confirms 0 external imports across frontend. |
| `ai-frontend/src/lib/taskObservability.ts` | State machine parser, event normalizer, and display helpers for tasks | `tasks/[id]/page.tsx`, `taskObservability.test.ts` | **Dedicated** | **REMOVE** | Low | Grep confirms 0 external imports across frontend. |
| `ai-frontend/src/tests/taskObservability.test.ts` | Unit tests for taskObservability | None | **Dedicated** | **REMOVE** | Low | Node test runner clean. |
| `ai-frontend/src/tests/tasksLifecycle.test.ts` | Integration tests for task creation & lifecycle | None | **Dedicated** | **REMOVE** | Low | Node test runner clean. |
| `ai-frontend/src/tests/workspacesRunner.test.ts` | Tests for workspace & runner pairing flow | None | **Dedicated** | **REMOVE** | Low | Node test runner clean. |
| `ai-frontend/src/components/chat/Sidebar.tsx` | Global navigation sidebar | AppShellLayout | **Shared** | **REFACTOR** | Med | Remove `'workspaces'` and `'tasks'` from `NAV_ITEMS`. Retain Chat, Projects, Bot, Prompts, Skills, Dashboard, Settings. |
| `ai-frontend/src/tests/botNavigationAccess.test.ts` | Nav ordering & Discord bot access specification | Node test runner | **Shared** | **REFACTOR** | Low | Update expected `keys` array in test 1 to match new `NAV_ITEMS` (remove workspaces/tasks). All 7 assertions must PASS. |
| `ai-backend/src/api/v1/orchestrator.py` | FastAPI router for workspaces, tasks, attempts, events, diff, verifications, runner pairing & SSE dispatch | `src/api/v1/router.py`, `tests/test_tasks.py`, `tests/test_orchestrator.py` | **Dedicated** | **REMOVE** | Med | Remove file. Endpoints removed from OpenAPI schema. |
| `ai-backend/src/api/v1/router.py` | Master API router mounting sub-routers | `src/main.py` | **Shared** | **REFACTOR** | Low | Remove `orchestrator_router` import and mount. Health endpoint (`/health`) remains functional. |
| `ai-backend/tests/test_orchestrator.py` | Backend tests for orchestrator & runner registration/pairing | pytest | **Dedicated** | **REMOVE** | Low | pytest passes on preserved suites. |
| `ai-backend/tests/test_tasks.py` | Backend tests for task lifecycle, isolation, dispatch, verifications | pytest | **Dedicated** | **REMOVE** | Low | pytest passes on preserved suites. |
| `ai-runner/` (entire directory) | Local daemon process running task execution loop & Antigravity CLI adapter | `run-demo.ps1`, `tools/run-runner.cmd` | **Dedicated** | **REMOVE** | Med | Directory deleted cleanly. No daemon startup hooks left in backend. |
| `tools/run-runner.cmd` | Standalone runner launcher console script | `run-demo.ps1` | **Dedicated** | **REMOVE** | Low | Delete file. |
| `run-demo.ps1` & `run-demo.bat` | AI-Chan supervisor launcher script | End-user / demo environment | **Shared** | **REFACTOR** | Med | Remove Agent Runner launch, runner pairing check, runner health poll. Update backend health check to `/api/v1/health`. Retain Backend, Frontend, and Discord Bot. |
| `ai-backend/.env.example` | Template environment file | Developers | **Shared** | **REFACTOR** | Low | Remove `ORCHESTRATOR_ENABLED`, `RUNNER_*`, `AGY_*` legacy variables. |
| `ai-backend/database/apply_migrations.py` | Database migration runner | Backend startup / dev scripts | **Shared** | **REFACTOR** | Med | Remove runner/workspace/task migration steps (12-14) or ensure database sunset migration is cleanly tracked without mutating core tables. |
| `ai-backend/database/migrations/011_orchestrator_foundation.sql` | Migration creating `agent_runners`, `runner_pairing_tokens`, `development_workspaces`, `workspace_validations` | `apply_migrations.py` | **Dedicated** | **ARCHIVE / SUNSET** | High | Archive / supersede with clean drop migration after backup verification. |
| `ai-backend/database/migrations/012_development_task_management.sql` | Migration creating `development_tasks`, `task_attempts`, `task_events`, `task_artifacts`, `task_approvals` | `apply_migrations.py` | **Dedicated** | **ARCHIVE / SUNSET** | High | Archive / supersede with clean drop migration after backup verification. |
| `ai-backend/database/migrations/013_verification_and_review_gates.sql` | Migration creating `task_verification_reports` | `apply_migrations.py` | **Dedicated** | **ARCHIVE / SUNSET** | High | Archive / supersede with clean drop migration after backup verification. |
| `ai-backend/database/app.db` (10 legacy tables) | Database tables holding legacy workspace/runner/task data | Dedicated to legacy subsystem | **Dedicated** | **BACKUP & DROP** | High | 1. Atomic SQLite backup to `database/backups/`. 2. JSON dump export. 3. Verification of restore. 4. Clean DROP of 10 tables. |
| `docs/architecture/development-orchestrator/` | Design documents and audits for orchestrator | Internal engineering docs | **Dedicated** | **ARCHIVE / DEPRECATE** | Low | Update README to status DEPRECATED / DECOMMISSIONED. Keep for historical reference. |

---

## 3. Strict Preservation Boundaries (Verified Safe)

The following components are strictly preserved and MUST NOT be modified or impacted:
1. **Core AI-Chan Backend**:
   - `src/api/v1/auth.py`, `src/api/v1/chat.py`, `src/api/v1/conversations.py`, `src/api/v1/users.py`, `src/api/v1/models.py`, `src/api/v1/resources.py`, `src/api/v1/prompts.py`, `src/api/v1/skills.py`.
   - `src/api/v1/projects.py` (Visual Graph Canvas / Project Builder — independent from external workspaces).
   - `src/core/security.py`, `src/core/config.py`, `src/db.py`.
   - `llm/agent.py`, `llm/factory.py`, `llm/token_tracker.py`.
2. **AI-Chan Discord Bot**:
   - `ai-backend/src/discord_bot/` (`main.py`, `bot.py`, `client.py`, `cogs/`, `services/`, `utils/`).
   - `src/api/v1/bot.py`.
3. **Core Database Tables**:
   - `users`, `conversations`, `messages`, `models`, `api_metric_logs`, `user_quotas`, `projects`, `system_prompts`, `skills`, `skill_files`, `discord_bot_configs`.
4. **Frontend Core**:
   - `ai-frontend/src/app/(app)/chat/`, `projects/`, `bot/`, `prompts/`, `skills/`, `dashboard/`, `settings/`.
   - `ai-frontend/src/context/AppContext.tsx`, `DesktopHeader.tsx`.

---

## 4. Gate 1 Review Checklist

- [x] All legacy entrypoints and dependencies identified and categorized.
- [x] Shared vs. dedicated files strictly distinguished.
- [x] Verified zero shared consumers for `ai-runner/` and `src/api/v1/orchestrator.py`.
- [x] Verified that Project Builder (`projects`) has no hard dependencies on `development_workspaces`.
- [x] Preserved suites identified for regression verification.
