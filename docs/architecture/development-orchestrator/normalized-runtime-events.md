# Normalized Runtime Events Specification
## AI-Chan Development Orchestrator

> **Document ID:** SPEC-EVT-01  
> **Version:** 1.0.0  
> **Standard:** AI-Chan Domain Event Model  
> **Fact Classification:** `DECISION` (selected normalization envelope & presentation tiers).

---

## 1. Three-Tier Event Model

To maintain strict boundaries between raw CLI outputs, internal domain state, and user-facing presentation, all events pass through a three-tier pipeline:

```
[ Tier 1: Raw CLI Output ]
   (Antigravity NDJSON / Claude Code Stream)
             |
             v  Adapter Normalizer & Redaction Pipeline
[ Tier 2: Normalized Domain Event ]
   (Typed AI-Chan Domain Event Envelope - Internal Protocol)
             |
             v  Presentation & SSE Filter
[ Tier 3: UI Presentation View ]
   (Sanitized, Masked Markdown & Activity Cards for Frontend)
```

1. **Tier 1 — Raw CLI Event:** Proprietary, unvalidated vendor output directly from `stdout`/`stderr`.
2. **Tier 2 — Normalized Domain Event:** Structured, version-controlled JSON schema with monotonic sequence numbers, correlation IDs, and unified event types. Stored in memory / event logs.
3. **Tier 3 — UI Presentation View:** Filtered representation sent over SSE to the browser. Strips internal memory pointers, masks user home paths, redacts leaked tokens, and formats tool calls into human-readable cards.

---

## 2. Normalized Event Schema (Tier 2)

Every event emitted by a Runtime Adapter conforms to the following JSON structure:

```json
{
  "event_id": "evt_01J9X6F4G5H6J7K8L9M0",
  "sequence_number": 42,
  "task_id": "tsk_e4b6c31a-5b12-4f88-872e-84b238f83710",
  "runner_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "runtime": "antigravity",
  "timestamp": "2026-10-15T10:12:00.123Z",
  "event_type": "TOOL_CALL_START",
  "severity": "INFO",
  "payload": {
    "tool_name": "replace_file_content",
    "call_id": "call_9a8b",
    "target_file": "src/auth/jwt.py",
    "summary": "Updating token expiration logic from 1h to 24h"
  }
}
```

### 2.1 Core Envelope Fields
| Field | Type | Description |
|---|---|---|
| `event_id` | `string` | Unique identifier (ULID or UUIDv7) providing millisecond-accurate time ordering. |
| `sequence_number` | `integer` | Strictly monotonic integer (1, 2, 3...) per task execution turn. Used for gap detection. |
| `task_id` | `string` | Associated `development_tasks` UUID. |
| `runner_id` | `string` | Originating `agent_runners` UUID. |
| `runtime` | `string` | Runtime engine identifier: `"antigravity"`, `"claude_code"`, or `"system"`. |
| `timestamp` | `string` | ISO 8601 UTC timestamp with millisecond precision. |
| `event_type` | `string` | Standardized event categorization (see catalog below). |
| `severity` | `string` | Logging level: `"DEBUG"`, `"INFO"`, `"WARN"`, `"ERROR"`, `"CRITICAL"`. |
| `payload` | `object` | Type-specific data payload. |

---

## 3. Normalized Event Type Catalog

| Event Type | Severity | Description | Payload Key Properties |
|---|---|---|---|
| `TASK_INITIALIZED` | `INFO` | Subprocess spawned and session configured. | `cwd`, `model`, `tools_available`, `runtime_session_id`. |
| `TEXT_DELTA` | `INFO` | Incremental fragment of agent explanation text. | `text_delta`, `accumulated_length`. |
| `TOOL_CALL_START` | `INFO` | Agent begins executing a specific tool. | `tool_name`, `call_id`, `target_file`, `arguments_preview`. |
| `TOOL_CALL_END` | `INFO` | Tool execution completed with result or error. | `tool_name`, `call_id`, `duration_seconds`, `status`, `diff_preview`. |
| `APPROVAL_REQUIRED` | `WARN` | Execution paused awaiting user approval. | `action_type`, `description`, `diff`, `allowed_decisions`. |
| `STATUS_TRANSITION`| `INFO` | Task state machine transitioned. | `from_status`, `to_status`, `reason`. |
| `DIAGNOSTIC_LOG` | `DEBUG`/`WARN` | Raw diagnostic or stderr message. | `stream` (`stdout`/`stderr`), `message`. |
| `TOKEN_USAGE` | `INFO` | Token metrics updated. | `input_tokens`, `output_tokens`, `total_tokens`, `cost_estimate`. |
| `TASK_COMPLETED` | `INFO` | Task completed successfully. | `exit_code: 0`, `duration_seconds`, `summary`, `artifacts`. |
| `TASK_FAILED` | `ERROR` | Task terminated due to error or crash. | `exit_code`, `error_category`, `error_message`, `traceback`. |
| `TASK_CANCELLED` | `WARN` | Task aborted by user or timeout. | `reason`, `cancelled_by`, `cleanup_status`. |

---

## 4. UI Presentation & Redaction Rules (Tier 3)

Before events are broadcast over Server-Sent Events (SSE) to the frontend client, the **Redaction Filter** sanitizes the payload:

### 4.1 Secret Redaction Rules
1. **API Keys & Tokens:**
   - Matches regex patterns for OpenAI (`sk-[a-zA-Z0-9]{32,}`), Google (`AIza[0-9A-Za-z-_]{35}`), GitHub (`ghp_[a-zA-Z0-9]{36}`), and Bearer tokens (`Bearer\s+[a-zA-Z0-9._-]+`).
   - Replacement: `[REDACTED_SECRET]`.
2. **Local Host User Paths:**
   - Windows path pattern: `C:\Users\<username>\...` -> `C:\Users\***\...`
   - POSIX path pattern: `/home/<username>/...` -> `/home/***\...`
3. **Environment Blocks:**
   - Raw environment variables dumps (`os.environ`) are completely stripped from presentation events.

### 4.2 Stream Resumption & Reconnection
- The frontend includes `Last-Event-ID: evt_...` in the request header when reconnecting to `/api/v1/tasks/{id}/events`.
- The backend SSE hub replays all events with `sequence_number > last_seen_sequence` from the task's in-memory buffer before streaming live events.
