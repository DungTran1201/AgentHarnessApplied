# Development Task Lifecycle & State Machine
## AI-Chan Development Orchestrator

> **Document ID:** SPEC-LFC-01  
> **Version:** 1.0.0  
> **Target Subsystem:** Task Orchestration State Supervisor  
> **Fact Classification:** `DECISION` (state machine rules, valid transitions, guard conditions).

---

## 1. Lifecycle State Machine Overview

The Development Task Lifecycle models a software engineering change from inception to completion. It enforces verification gates, human approvals, and deterministic failure recovery.

```
                  +-----------------------------------------+
                  |                 DRAFT                   |
                  +--------------------+--------------------+
                                       | User Clicks "Dispatch"
                                       v
                  +-----------------------------------------+
       +--------->|                QUEUED                   |
       |          +--------------------+--------------------+
       |                               | Runner Leases Task
       |                               v
       |          +-----------------------------------------+
       |          |              DISPATCHING                |
       |          +--------------------+--------------------+
       |                               | Pre-flight Pass (Branch ready, CLI ready)
       |                               v
       |          +-----------------------------------------+
       |          |                PLANNING                 |
       |          +--------------------+--------------------+
       |                               | Agent Emits Plan
       |                               v
       |          +-----------------------------------------+
       |          |           AWAITING_APPROVAL             |<------+
       |          +--------------------+--------------------+       |
       |                               | User Clicks "Approve Plan" |
       |                               v                            |
       |          +-----------------------------------------+       |
       |          |                RUNNING                  |-------+ (Needs Tool Approval)
       |          +--------------------+--------------------+
       |                               | CLI Emits Result & Exit 0
       |                               v
       |          +-----------------------------------------+
       |          |               VERIFYING                 |
       |          +--------------------+--------------------+
       |                               | Diff & Tests Pass
       |                               v
       |          +-----------------------------------------+
       |          |            REVIEW_REQUIRED              |
       |          +--------------------+--------------------+
       |                               | User Clicks "Accept Changes"
       |                               v
       |                  ===========================
       |                  ||       COMPLETED       || (Terminal Success)
       |                  ===========================
       |
       |  (Retries spawn new Attempt)
       +----------------------------------------------------+
       |                                                    |
       v                                                    v
===========================                      ===========================
||        FAILED         ||                      ||       CANCELLED       || (Terminal Aborted)
===========================                      ===========================
         ^                                                    ^
         | (Error / Crash)                                    | (Process Killed Acknowledged)
         |                                                    |
         +------------------+                    +------------+
                            |                    |
                  +---------+----------+  +------+------------+
                  |     TIMED_OUT      |  |    CANCELLING     |
                  +--------------------+  +-------------------+
```

---

## 2. Comprehensive State Specifications

### 2.1 State: `DRAFT`
- **Meaning:** Task record created in database; prompt entered, but not yet submitted for execution.
- **Valid Next States:** `QUEUED`, `CANCELLED`.
- **Trigger:** User saves draft or clicks "Create Task" from chat.
- **Entry Condition:** Verbatim prompt text present, workspace selected.
- **Exit Condition:** User clicks "Dispatch" or cancels draft.
- **Timeout:** None.
- **Audit Event:** `TASK_CREATED`.
- **UI Presentation:** Muted Gray Badge `[DRAFT]`. Edit buttons enabled.

### 2.2 State: `QUEUED`
- **Meaning:** Task submitted and queued; awaiting runner lease and pre-flight validation.
- **Valid Next States:** `DISPATCHING`, `BLOCKED`, `CANCELLED`.
- **Trigger:** System queue worker or Runner polling.
- **Entry Condition:** Workspace status is `READY` or `NON_GIT_READY`.
- **Exit Condition:** Online runner leases the task.
- **Timeout:** 5 minutes. If no runner claims task, transitions to `BLOCKED`.
- **Audit Event:** `TASK_QUEUED`.
- **UI Presentation:** Amber Badge `[QUEUED]`. Shows queue position.

### 2.3 State: `DISPATCHING`
- **Meaning:** Runner has leased the task; preparing git worktree/branch and verifying CLI environment.
- **Valid Next States:** `PLANNING`, `RUNNING`, `BLOCKED`, `CANCELLING`.
- **Trigger:** Runner acknowledges lease.
- **Entry Condition:** Runner `ONLINE`, capabilities match requested runtime.
- **Exit Condition:** Working tree prepped, subprocess spawning.
- **Timeout:** 60 seconds.
- **Audit Event:** `TASK_DISPATCHED`.
- **UI Presentation:** Blue Animated Badge `[DISPATCHING]`.

### 2.4 State: `PLANNING`
- **Meaning:** Agent is executing in read-only mode (`mode: "plan"`), inspecting files, and formulating an approach.
- **Valid Next States:** `AWAITING_APPROVAL`, `RUNNING`, `FAILED`, `CANCELLING`, `TIMED_OUT`.
- **Trigger:** Subprocess spawned with `--mode plan`.
- **Entry Condition:** Clean working directory confirmed.
- **Exit Condition:** Agent finishes planning turn and produces an action plan.
- **Timeout:** `ExecutionPolicy.timeout_seconds` (default 900s).
- **Audit Event:** `TASK_PLANNING_STARTED`.
- **UI Presentation:** Purple Badge `[PLANNING]`. Live text streaming active.

### 2.5 State: `AWAITING_APPROVAL`
- **Meaning:** Execution paused; human approval required before any files are modified or destructive tools run.
- **Valid Next States:** `RUNNING`, `CANCELLED`, `TIMED_OUT`.
- **Trigger:** Agent emits plan or requests tool permission.
- **Entry Condition:** Structured plan or diff generated.
- **Exit Condition:** User clicks `Approve Plan` (transitions to `RUNNING`) or `Reject` (transitions to `CANCELLED`).
- **Timeout:** 24 hours. If no approval received, task auto-cancels.
- **Audit Event:** `TASK_APPROVAL_REQUESTED`.
- **UI Presentation:** Bright Amber Pulsing Badge `[AWAITING APPROVAL]`. Approval modal with "Approve" / "Reject" buttons.

### 2.6 State: `RUNNING`
- **Meaning:** Agent is actively executing tools, modifying code, and compiling/testing.
- **Valid Next States:** `VERIFYING`, `AWAITING_APPROVAL`, `FAILED`, `CANCELLING`, `TIMED_OUT`.
- **Trigger:** User approved plan or previous tool execution completed.
- **Entry Condition:** Mode switched to `accept-edits` with user approval token.
- **Exit Condition:** Subprocess outputs terminal `result` event with exit code `0`.
- **Timeout:** 900 seconds.
- **Audit Event:** `TASK_EXECUTION_RESUMED`.
- **UI Presentation:** Indigo Animated Badge `[RUNNING]`. Real-time tool cards and terminal output stream.

### 2.7 State: `VERIFYING`
- **Meaning:** Agent execution finished; automated verification checks are running (generating unified diff, running sanity tests).
- **Valid Next States:** `REVIEW_REQUIRED`, `FAILED`, `CANCELLING`.
- **Trigger:** Process exits 0; Runner executes verification script.
- **Entry Condition:** `result` event received and exit code == 0.
- **Exit Condition:** `git diff` generated and test report created.
- **Timeout:** 180 seconds.
- **Audit Event:** `TASK_VERIFYING_STARTED`.
- **UI Presentation:** Cyan Badge `[VERIFYING]`. Spinner next to test suite runner.

### 2.8 State: `REVIEW_REQUIRED`
- **Meaning:** All automated work and tests completed; awaiting final human acceptance of generated code changes.
- **Valid Next States:** `COMPLETED`, `DRAFT` (revision requested), `CANCELLED`.
- **Trigger:** Verification completes successfully.
- **Entry Condition:** Unified diff artifact stored and verified.
- **Exit Condition:** User clicks `Accept Changes` or `Reject / Revert`.
- **Timeout:** 7 days.
- **Audit Event:** `TASK_REVIEW_REQUIRED`.
- **UI Presentation:** Emerald Badge `[REVIEW READY]`. Diff viewer open with "Accept & Merge" and "Revert" actions.

### 2.9 State: `COMPLETED` (Terminal Success)
- **Meaning:** Task changes accepted and committed to target branch.
- **Valid Next States:** None (Terminal).
- **Trigger:** User clicks "Accept Changes" or policy auto-accepts.
- **Audit Event:** `TASK_COMPLETED`.
- **UI Presentation:** Solid Green Badge `[COMPLETED]`. Final summary, token usage, and commit link displayed.

### 2.10 State: `CANCELLING`
- **Meaning:** User or timeout requested abort; Runner is killing the child process tree and draining buffers.
- **Valid Next States:** `CANCELLED`.
- **Trigger:** User clicks "Cancel" or turn timeout fires.
- **Exit Condition:** Runner confirms process tree is dead via farewell beacon.
- **Timeout:** 15 seconds. If Runner unresponsive, force-mark `CANCELLED`.
- **Audit Event:** `TASK_CANCELLATION_REQUESTED`.
- **UI Presentation:** Orange Badge `[ABORTING...]`. Buttons disabled.

### 2.11 State: `CANCELLED` (Terminal Aborted)
- **Meaning:** Task terminated cleanly without applying partial changes.
- **Valid Next States:** None (Terminal).
- **Trigger:** Runner acknowledges process termination.
- **Audit Event:** `TASK_CANCELLED`.
- **UI Presentation:** Muted Red Badge `[CANCELLED]`. Option to "Start New Task".

### 2.12 State: `FAILED` (Terminal Error)
- **Meaning:** Execution failed due to process crash, unrecoverable syntax error, or non-zero exit code.
- **Valid Next States:** None (Terminal). Retrying spawns a new `TaskAttempt`.
- **Trigger:** Subprocess exits non-zero or exception caught.
- **Audit Event:** `TASK_FAILED`.
- **UI Presentation:** Red Badge `[FAILED]`. Detailed error category and diagnostic log displayed.

### 2.13 State: `TIMED_OUT` (Terminal Timeout)
- **Meaning:** Turn execution exceeded the 900s time budget.
- **Valid Next States:** `CANCELLING` -> `CANCELLED` or `FAILED`.
- **Trigger:** Watchdog timer fires.
- **Audit Event:** `TASK_TIMED_OUT`.
- **UI Presentation:** Red Pill `[TIMED OUT]`.

### 2.14 State: `BLOCKED`
- **Meaning:** Task cannot proceed due to missing prerequisites (e.g. Runner offline, dirty working tree, invalid path).
- **Valid Next States:** `QUEUED` (when unblocked), `CANCELLED`.
- **Trigger:** Pre-flight validation fails.
- **Audit Event:** `TASK_BLOCKED`.
- **UI Presentation:** Amber Alert Box `[BLOCKED]`. Clear explanation and "Retry Pre-flight" button.

---

## 3. State Transition Matrix & Guard Rules

| From State | To State | Trigger / Event | Guard Condition | Side Effect |
|---|---|---|---|---|
| `DRAFT` | `QUEUED` | `USER_DISPATCH` | Workspace valid & prompt not empty | Insert `task_attempts` (Attempt #1) |
| `QUEUED` | `DISPATCHING` | `RUNNER_LEASE` | Runner status is `ONLINE` | Lock task with lease TTL |
| `QUEUED` | `BLOCKED` | `PREFLIGHT_FAIL` | Runner offline or dirty git tree | Emit alert to UI |
| `DISPATCHING` | `PLANNING` | `PROCESS_SPAWNED`| Initial process spawned in `--mode plan` | Start turn watchdog timer |
| `PLANNING` | `AWAITING_APPROVAL`| `PLAN_PRODUCED` | Structured plan extracted from stream | Store plan artifact; notify UI |
| `AWAITING_APPROVAL`| `RUNNING` | `USER_APPROVE` | User has owner role | Emit approval signal to runner |
| `AWAITING_APPROVAL`| `CANCELLED` | `USER_REJECT` | User clicks reject | Revert working branch |
| `RUNNING` | `AWAITING_APPROVAL`| `TOOL_GUARD` | Tool is destructive & policy requires check | Pause stream; prompt user |
| `RUNNING` | `VERIFYING` | `RESULT_SUCCESS` | CLI emitted `result` & exit code 0 | Trigger diff & test check |
| `RUNNING` | `FAILED` | `PROCESS_ERROR` | Process exit != 0 or stream corrupt | Record error category in attempt |
| `RUNNING` | `CANCELLING` | `USER_CANCEL` | User clicks cancel button | Send SIGINT to runner |
| `VERIFYING` | `REVIEW_REQUIRED` | `VERIFY_PASS` | Unified diff generated | Store diff artifact; notify UI |
| `REVIEW_REQUIRED` | `COMPLETED` | `USER_ACCEPT` | User approves diff | Merge branch or keep changes |
| `CANCELLING` | `CANCELLED` | `PROCESS_DEAD` | Runner sends kill beacon | Reclaim working tree; mark done |

### Client Protection Rule:
The API MUST NOT expose an endpoint like `PATCH /tasks/{id} { "status": "COMPLETED" }`. Clients can only dispatch high-level semantic actions:
- `POST /tasks/{id}/dispatch`
- `POST /tasks/{id}/approval`
- `POST /tasks/{id}/cancel`
- `POST /tasks/{id}/review`
All internal state transitions are strictly controlled by the backend state supervisor.
