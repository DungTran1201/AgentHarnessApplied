# Antigravity CLI Runtime Adapter Specification
## AI-Chan Development Orchestrator

> **Document ID:** SPEC-ADA-01  
> **Version:** 1.0.0  
> **Target Runtime:** Antigravity CLI (`agy`)  
> **Empirical Validation Reference:**  
> - Host Executable: `C:\Users\PC\AppData\Local\agy\bin\agy.exe` (Version `1.2.16`, verified 2026-10-15)  
> - Official Documentation: `https://antigravity.google/docs/cli/headless/` (verified 2026-10-15)  
> **Fact Classification:** `FACT` (verified CLI flags and behavior), `DECISION` (adapter implementation choices).

---

## 1. Runtime Profile & Empirical Verification

The Antigravity CLI provides native support for automated and programmatic execution via headless print mode (`-p` / `--print`) and Newline-Delimited JSON (`--output-format stream-json`).

### Verified CLI Surface (`agy.exe --help`)
- `-p` / `--print`: Non-interactive execution of a single prompt turn.
- `--output-format stream-json`: Emits continuous NDJSON events on `stdout`.
- `--input-format stream-json`: Reads NDJSON messages on `stdin` for continuous piped turns.
- `--print-timeout <duration>`: Sets turn execution deadline (e.g. `900s`).
- `--mode <plan|accept-edits>`: Execution mode (`plan` restricts to read-only tools; `accept-edits` permits automated file changes).
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
4. **Malformed JSON Handling:**
   If a line fails `json.loads()`, the adapter does NOT crash. It packages the raw line into a `diagnostic_log` event with severity `WARN` and continues reading subsequent lines.

---

## 4. Antigravity Event Mapping & Normalization

Antigravity CLI emits three primary event types in `stream-json` mode:

| Raw CLI Event (`event`) | Raw Field Highlights | Normalized AI-Chan Event | Mapping Logic |
|---|---|---|---|
| `init` | `cwd`, `tools`, `permission_mode`, `model` | `TASK_INITIALIZED` | Extracts verified session tools, confirms working directory, captures initial model metadata. |
| `step_update` (type: `user_input`) | `step_index`, `state: DONE` | `STEP_USER_INPUT` | Internal echo confirmation of prompt. |
| `step_update` (type: `agent_response`) | `text_delta`, `step_index` | `TEXT_DELTA` | Streams partial markdown text directly to frontend chat/log view. |
| `step_update` (type: `tool`) | `tool_name`, `tool_info`, `state: ACTIVE` | `TOOL_EXECUTION_START` | Identifies tool being invoked (e.g. `view_file`, `replace_file_content`, `run_command`). |
| `step_update` (type: `tool`) | `tool_info`, `duration_seconds`, `state: DONE` | `TOOL_EXECUTION_END` | Captures tool duration, return status, and file diffs if applicable. |
| `step_update` (type: `checkpoint`) | `conversation_id`, `step_index` | `CHECKPOINT_SAVED` | Updates task progress milestone in database. |
| `result` | `status: SUCCESS`, `structured_output`, `usage`, `total_tokens` | `TASK_COMPLETED` | Extracts aggregate `input_tokens`, `output_tokens`, `total_tokens`, and marks task `COMPLETED`. |

### Raw Antigravity Event Sample:
```json
{"event": "step_update", "conversation_id": "c_9f8b", "step_index": 2, "state": "ACTIVE", "step_type": "agent_response", "text_delta": "Checking file structure..."}
```

### Normalized AI-Chan Domain Event:
```json
{
  "event_id": "evt_01J9X4A8B2C3D4E5",
  "sequence_number": 3,
  "task_id": "tsk_01J9X48Z",
  "runner_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "runtime": "antigravity",
  "timestamp": "2026-10-15T10:11:00.124Z",
  "event_type": "TEXT_DELTA",
  "severity": "INFO",
  "payload": {
    "text_delta": "Checking file structure...",
    "accumulated_length": 26
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
