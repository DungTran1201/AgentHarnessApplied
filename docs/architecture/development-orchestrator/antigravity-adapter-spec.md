# Antigravity CLI Runtime Adapter Specification
## AI-Chan Development Orchestrator

> **Document ID:** SPEC-ADA-01  
> **Version:** 1.0.0  
> **Target Runtime:** Antigravity CLI (`agy`)  
> **Empirical Validation Reference:**  
> - Host Executable: `agy.exe` (Version `1.3.5`, verified on host PATH 2026-10-16)  
> - Official Documentation: `https://antigravity.google/docs/cli/headless/` (verified 2026-10-16)  
> **Fact Classification:** `FACT` (verified CLI flags, nested NDJSON envelopes, and subprocess behavior), `DECISION` (adapter implementation choices).

---

## 1. Runtime Profile & Empirical Verification

The Antigravity CLI provides native support for automated and programmatic execution via headless print mode (`-p` / `--print`) and Newline-Delimited JSON (`--output-format stream-json`).

### Verified CLI Surface (`agy.exe --help`)
- `-p` / `--print`: Non-interactive execution of a single prompt turn.
- `--output-format stream-json`: Emits continuous NDJSON events on `stdout`.
- `--input-format stream-json`: Reads NDJSON messages on `stdin` for continuous piped turns.
- `--print-timeout <duration>`: Sets turn execution deadline (e.g. `900s`).
- `--mode <plan|accept-edits|auto>`: Execution mode (`plan` restricts to read-only inspection; `accept-edits` permits automated file changes).
- `--sandbox`: Runs in an isolated sandbox with terminal restrictions enabled.
- `--conversation <id>`: Resumes a specific historical conversation session.
- `--model <name>`: Model override (e.g., `gemini-2.5-pro`).
- `--effort <level>`: Reasoning effort (`low`, `medium`, `high`, `xhigh`, `max`).
- `--dangerously-skip-permissions`: **Strictly guarded.** Auto-approves all tool permission requests without prompting.

---

## 2. Process Execution Architecture (Runner Host)

### 2.1 Safe Subprocess Invocation
The adapter invokes the `agy.exe` binary directly without passing through a shell interpreter.

```python
# Safe argument list construction - NO shell=True
cmd_args = [
    executable_path,
    "--output-format", "stream-json",
    "-p", spec.prompt,
    "--mode", spec.execution_mode, # "plan" or "accept-edits"
    "--print-timeout", f"{policy.timeout_seconds}s",
]

if spec.runtime_session_id:
    cmd_args.extend(["--conversation", spec.runtime_session_id])

if spec.model_override:
    cmd_args.extend(["--model", spec.model_override])

if spec.effort:
    cmd_args.extend(["--effort", spec.effort])

# Crucial Security Rule:
# Under NO circumstances is --dangerously-skip-permissions passed by default.
if spec.custom_options.get("sandbox", True):
    cmd_args.append("--sandbox")
```

### 2.2 Windows-Specific Process Management (`FACT`)
On Windows hosts, child process trees can become orphaned if parent processes crash or terminate abruptly. The adapter implements the following Windows safeguards:
1. **Creation Flags:**
   ```python
   creation_flags = 0
   if sys.platform == "win32":
       creation_flags = subprocess.CREATE_NO_WINDOW
   ```
2. **Process Tree Termination:**
   On Windows, `process.terminate()` (which sends `WM_CLOSE` or `TerminateProcess`) often fails to kill child processes spawned by `agy.exe` (such as `git.exe` or `node.exe`). The adapter uses `taskkill` to forcefully reclaim the entire process tree:
   ```python
   if sys.platform == "win32":
       subprocess.run(
           ["taskkill", "/T", "/F", "/PID", str(process.pid)],
           stdout=subprocess.DEVNULL,
           stderr=subprocess.DEVNULL,
           check=False
       )
   ```

---

## 3. Stream Draining & Resilient Line Parsing

In `stream-json` mode, Antigravity CLI strictly separates data channels:
- `stdout`: Pure Newline-Delimited JSON (NDJSON) events.
- `stderr`: Human diagnostics, internal warning messages, authentication notices.

### Draining Architecture:
1. **Dual Asynchronous Tasks:**
   - Task A (`_drain_stdout`): Reads lines asynchronously from `process.stdout`.
   - Task B (`_drain_stderr`): Drains lines from `process.stderr` and appends them to a rolling ring buffer (max 1,000 lines) for diagnostics.
2. **Partial Line Buffer:**
   Chunks read from the stream are appended to an in-memory buffer until a newline `\n` is encountered.
3. **Oversized Line Guard:**
   To prevent denial of service from large runaway payloads (e.g. huge file dumps in tool output), a hard limit of **2 MB per line** is enforced. Lines exceeding this threshold are truncated, and a warning event is emitted.
4. **Malformed JSON & Missing Field Handling:**
   If a line fails `json.loads()`, the adapter does NOT crash. It packages the raw line into a `DIAGNOSTIC_LOG` event with severity `WARN` and continues reading subsequent lines. If an expected field is absent, default values (`None` / empty dict) are used safely.

---

## 4. Antigravity Event Mapping & Normalization

Antigravity CLI emits three primary event envelopes in `stream-json` mode (`FACT` empirically verified on `agy 1.3.5`):

```json
{"event":"init", "conversation_id":"...", "init":{"cwd":"...", "tools":[...], "permission_mode":"..."}}
{"event":"step_update", "step_update":{"conversation_id":"...", "step_index":1, "state":"ACTIVE|DONE", "step_type":"agent_response", "text_delta":"..."}}
{"event":"result", "result":{"conversation_id":"...", "status":"SUCCESS", "response":"...", "duration_seconds":..., "usage":{...}}}
```

### Event Mapping Specification:

| Raw CLI Event (`event`) | Nested Data Container | Extracted Fields | Normalized AI-Chan Event | Mapping Logic & Extraction Rule |
|---|---|---|---|---|
| `init` | `raw_json.get("init")` | `cwd`, `tools`, `permission_mode` | `TASK_INITIALIZED` | Extract from nested `init` object: `cwd = init_obj.get("cwd")`, `tools = init_obj.get("tools")`, `conversation_id = raw_json.get("conversation_id")`. |
| `step_update` (step_type: `user_input`) | `raw_json.get("step_update")` | `step_index`, `state` | `STEP_USER_INPUT` | Internal confirmation that prompt was ingested by CLI runtime. |
| `step_update` (step_type: `agent_response`) | `raw_json.get("step_update")` | `text_delta`, `step_index` | `TEXT_DELTA` | Extract `text_delta` from `step_update_obj.get("text_delta")`. Stream directly to frontend SSE. |
| `step_update` (step_type: `tool` / `tool_call`) | `raw_json.get("step_update")` | `tool_name`, `tool_info`, `state: ACTIVE` | `TOOL_CALL_START` | Extract tool details from `step_update_obj`. Capture call ID and sanitized parameters. |
| `step_update` (step_type: `tool` / `tool_call`) | `raw_json.get("step_update")` | `tool_info`, `duration_seconds`, `state: DONE` | `TOOL_CALL_END` | Extract tool duration and execution status. |
| `step_update` (step_type: `subagent_info`) | `raw_json.get("step_update")` | `subagent_id`, `task_summary` | `SUBAGENT_ACTIVITY` | Diagnostic tracking for subagents spawned by the CLI. |
| `result` | `raw_json.get("result")` | `status`, `response`, `duration_seconds`, `usage` | `TASK_TERMINATED` / `PLAN_CREATED` | Extract `result_obj.get("response")` (plan report or completion summary) and `usage` (`input_tokens`, `output_tokens`). |

### Empirical CLI Event Sample (`agy 1.3.5` output):
```json
{"event":"step_update","step_update":{"conversation_id":"77008a44-de37-44b0-90b6-047ddd1a55b7","step_index":1,"state":"ACTIVE","step_type":"agent_response","text_delta":"pong"}}
```

### Normalized AI-Chan Domain Event (Tier 2):
```json
{
  "event_id": "evt_01J9X4A8B2C3D4E5",
  "sequence_number": 3,
  "task_id": "tsk_01J9X48Z",
  "attempt_id": "att_639266a3ba0e4f4e",
  "runner_id": "rnr_9b1deb4d3b7d4bad",
  "runtime": "antigravity",
  "timestamp": "2026-10-16T10:39:27.124Z",
  "event_type": "TEXT_DELTA",
  "severity": "INFO",
  "payload": {
    "text_delta": "pong",
    "step_index": 1
  }
}
```

---

## 5. Security & Permission Mode Enforcement

### 5.1 Mode Selection Policy
- **Mode `plan` (Read-Only):**
  - Used during initial discovery, impact analysis, and task planning.
  - Restricts the CLI to safe inspection tools (`view_file`, `list_dir`, `grep_search`).
  - No file modifications can occur.
- **Mode `accept-edits` (Controlled Mutation):**
  - Used only after user approves the plan.
  - All file changes produce artifacts that must be reviewed before final git commit.

### 5.2 Prohibition of `--dangerously-skip-permissions`
The `--dangerously-skip-permissions` flag bypasses all safety prompts inside `agy`. In AI-Chan:
- It is **strictly disabled** for general development tasks.
- If an enterprise policy mandates headless unattended execution, it can only be enabled if `ExecutionPolicy.require_approval_for_tools == False` AND the workspace has a verified clean Git branch isolation (`BR-WKR-004`).
