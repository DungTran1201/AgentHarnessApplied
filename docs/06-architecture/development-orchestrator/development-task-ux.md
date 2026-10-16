# Frontend UX & UI Specifications
## Development Task Console & Diff Review

> **Document ID:** UX-TSK-01  
> **Version:** 1.0.0  
> **Design Tokens:** AI-Chan Custom Design System (`globals.css`, Dark Palette)  
> **Target Framework:** Next.js 16 (App Router) + React 19  
> **Component Library:** Native React + Custom Pure SVGs (zero Tailwind, zero external icon packs)

---

## 1. Chat Entry Point & Intent Separation

A major design requirement is preventing conversational chat messages from accidentally triggering terminal execution.

```
+--------------------------------------------------------------------------+
|  AI-Chan Floating Project Chat (FloatingProjectChat.tsx)                 |
+--------------------------------------------------------------------------+
|  User: Can we update the access token expiration to 24 hours?            |
|                                                                          |
|  AI-Chan Assistant:                                                      |
|  To extend the token expiration, we need to modify auth.py line 15:      |
|  ACCESS_TOKEN_EXPIRE_MINUTES = 60 -> 1440.                              |
|                                                                          |
|  +--------------------------------------------------------------------+  |
|  | [Hammer Icon] Action Available: Software Change Request            |  |
|  | Target: ai-chan-core (main) | Runtime: Antigravity CLI             |  |
|  |                                                                    |  |
|  | [ Convert to Development Task ]               [ Continue Chatting ]|  |
|  +--------------------------------------------------------------------+  |
+--------------------------------------------------------------------------+
```

### Intent Separation Rules:
1. Standard user queries remain conversational LLM responses streamed via `/api/v1/projects/{id}/chat`.
2. When the user clicks **"Convert to Development Task"**, a modal opens pre-filling:
   - Target Workspace (derived from `project.workspace_id`).
   - Task Title & Prompt.
   - Execution Mode: `Plan Only` (default) vs `Direct Implementation`.
3. Clicking "Create & Dispatch" calls `POST /api/v1/orchestrator/tasks` and navigates to the Task Console.

---

## 2. Task Console Detail Screen (`/tasks/[id]`)

```
+---------------------------------------------------------------------------------------+
|  AI-Chan AppShell Header  [CPU: 14%] [RAM: 48%]                        [User Avatar]  |
+------------+--------------------------------------------------------------------------+
|  SIDEBAR   |  Task: Fix token expiration in auth.py                 [Cancel Task]     |
|            |  Status: [AWAITING APPROVAL] (Amber Pulse) | Duration: 01:24 | Runner: Win11|
|  Projects  |  Target: ai-chan-core | Branch: ai-chan/task-01J9X8 | Runtime: Antigravity|
|  Skills    |                                                                          |
| >Workspaces|  [ Progress Timeline ]   [ Plan & Approval ]*   [ Diff Review ]   [ Logs ] |
|  Settings  |  +--------------------------------------------------------------------+  |
|            |  | ACTION PLAN AWAITING HUMAN APPROVAL                                 |  |
|            |  | The agent has formulated the following implementation plan:        |  |
|            |  |                                                                    |  |
|            |  | 1. Read ai-backend/src/core/auth.py to verify token constant.      |  |
|            |  | 2. Replace ACCESS_TOKEN_EXPIRE_MINUTES = 60 with 1440.             |  |
|            |  | 3. Run pytest tests/test_auth.py to verify token generation.        |  |
|            |  |                                                                    |  |
|            |  | [ Reject / Abort ]                              [ Approve & Run ]  |  |
|            |  +--------------------------------------------------------------------+  |
|            |                                                                          |
|            |  STEP PROGRESS:                                                          |
|            |  [v] Step 1: Initialized Antigravity CLI session (gemini-2.5-pro) (0.8s)    |
|            |  [v] Step 2: Inspected ai-backend/src/core/auth.py (0.4s)                 |
|            |  [o] Step 3: Awaiting user approval to modify file...                    |
|            |                                                                          |
|            |  +-- EXPANDABLE RAW TERMINAL DRAWER (Click to expand) -----------------+ |
|            |  | > agy.exe -p "Inspect..." --output-format stream-json --mode plan     | |
|            |  | [INFO] Session c_9f8b initialized. Tools: [view_file, replace...]     | |
|            |  +--------------------------------------------------------------------+  |
+------------+--------------------------------------------------------------------------+
```

---

## 3. Unified Diff & Artifact Review Modal

When the task enters `REVIEW_REQUIRED`, the developer reviews the changes before committing:

```
+---------------------------------------------------------------------------------------+
|  Review Code Changes — Task: Fix token expiration in auth.py                      [X] |
+---------------------------------------------------------------------------------------+
|  Files Modified (1):                                                                  |
|  [v] ai-backend/src/core/auth.py  (+1, -1)                                            |
|                                                                                       |
|  UNIFIED DIFF:                                                                        |
|  @@ -14,3 +14,3 @@                                                                    |
|   SECRET_KEY = settings.SECRET_KEY                                                    |
|  -ACCESS_TOKEN_EXPIRE_MINUTES = 60                                                    |
|  +ACCESS_TOKEN_EXPIRE_MINUTES = 1440                                                   |
|   ALGORITHM = "HS256"                                                                 |
|                                                                                       |
|  AUTOMATED TEST SUMMARY:                                                              |
|  [v] pytest tests/test_auth.py (All 12 tests passed in 1.4s)                          |
|                                                                                       |
|  Commit Message:                                                                      |
|  [ fix(auth): extend access token expiration to 24 hours                            ] |
|                                                                                       |
|  [ Reject & Revert Changes ]                          [ Accept & Commit to main ]     |
+---------------------------------------------------------------------------------------+
```

---

## 4. Real-Time Streaming & Reconnection Architecture

The Task Console implements resilient SSE handling via `@microsoft/fetch-event-source`:
1. **Exponential Backoff with Jitter:** If the SSE connection drops (e.g., temporary WiFi disconnect), the client reconnects with delay `min(1000 * 2^attempt, 15000)` ms.
2. **Replay via `Last-Event-ID`:** On reconnect, the client passes the last processed `event_id`. The backend streams back missed events from the server ring buffer before resuming live events, preventing gap flickers.
3. **Connection State Pill:** The UI displays a live connection indicator in the header:
   - Green Dot: `Connected (Streaming)`
   - Amber Pulse: `Reconnecting (Attempt 2/5)...`
   - Red Warning: `Connection Lost. [Click to Reconnect]`
