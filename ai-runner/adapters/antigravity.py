"""
AI-Chan Development Orchestrator — Antigravity CLI Runtime Adapter
Path: ai-runner/adapters/antigravity.py
Implements: SPEC-ADA-01, SPEC-EVT-01, SPEC-CTR-01, ADR-015
Verified CLI: agy 1.3.5 / 1.4.0 (https://antigravity.google/docs/cli/headless/)
"""

import os
import sys
import json
import time
import uuid
import re
import shutil
import hashlib
import logging
import threading
import subprocess
from collections import deque
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Callable

from .base import RuntimeAdapter, ExecutionSpec, ExecutionPolicy, NormalizedEvent, ExecutionResult

logger = logging.getLogger("ai_runner.adapters.antigravity")


# ── Custom Exceptions ─────────────────────────────────────────────────────────

class AntigravityError(Exception):
    """Base exception for Antigravity runtime adapter errors."""
    pass

class ExecutableNotFoundError(AntigravityError):
    """Raised when agy binary is not found on host."""
    pass

class WorkspaceNotFoundError(AntigravityError):
    """Raised when the specified workspace directory is invalid or missing."""
    pass

class CLIExecutionError(AntigravityError):
    """Raised when process fails to start or encounters fatal execution errors."""
    pass

class CLITimeoutError(AntigravityError):
    """Raised when turn execution exceeds configured timeout."""
    pass


# ── Secret & Sensitive Path Redaction Patterns ────────────────────────────────

SECRET_PATTERNS = [
    (re.compile(r"sk-[a-zA-Z0-9_-]{20,}"), "[REDACTED_API_KEY]"),
    (re.compile(r"ghp_[a-zA-Z0-9]{36}"), "[REDACTED_GITHUB_TOKEN]"),
    (re.compile(r"AIza[0-9A-Za-z-_]{30,}"), "[REDACTED_GOOGLE_KEY]"),
    (re.compile(r"rsk_[a-f0-9]{32,}", re.IGNORECASE), "[REDACTED_RUNNER_SECRET]"),
    (re.compile(r"rpt_[a-f0-9]{16,}", re.IGNORECASE), "[REDACTED_PAIRING_TOKEN]"),
    (re.compile(r"Bearer\s+[a-zA-Z0-9._-]{20,}", re.IGNORECASE), "Bearer [REDACTED_BEARER_TOKEN]"),
    (re.compile(r"Basic\s+[a-zA-Z0-9+/=]{20,}", re.IGNORECASE), "Basic [REDACTED_BASIC_AUTH]"),
    (re.compile(r"eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]+"), "[REDACTED_JWT]"),
    (re.compile(r"(Set-Cookie|Cookie)\s*:\s*[^\r\n]+", re.IGNORECASE), r"\1: [REDACTED_COOKIE]"),
    (re.compile(r"((?:AWS_SECRET_ACCESS_KEY|DATABASE_URL|OPENAI_API_KEY|DISCORD_BOT_TOKEN|SECRET_KEY|AUTH_SECRET|PRIVATE_KEY)\s*=\s*)[^\r\n]+", re.IGNORECASE), r"\1[REDACTED]"),
    (re.compile(r"(password|client_secret|api_key|token)\s*[:=]\s*['\"]?[^\s'\"]+", re.IGNORECASE), r"\1=[REDACTED]"),
    # Redact Windows / POSIX user account paths
    (re.compile(r"[A-Za-z]:[/\\]Users[/\\]([A-Za-z0-9_.-]+)", re.IGNORECASE), r"C:\\Users\\***"),
    (re.compile(r"/home/([A-Za-z0-9_.-]+)"), r"/home/***"),
]

def redact_sensitive_text(text: str) -> str:
    """Sanitizes credentials, secrets, and private host paths from text before emitting events."""
    if not text or not isinstance(text, str):
        return text
    cleaned = text
    for pattern, replacement in SECRET_PATTERNS:
        cleaned = pattern.sub(replacement, cleaned)
    return cleaned


SAFE_ENV_ALLOWLIST = {
    # System & execution essentials
    "SYSTEMROOT", "SYSTEMDRIVE", "WINDIR", "COMSPEC", "PATHEXT", "PATH",
    "TEMP", "TMP", "USERPROFILE", "LOCALAPPDATA", "APPDATA",
    "HOMEDRIVE", "HOMEPATH", "PROGRAMFILES", "PROGRAMFILES(X86)", "PROGRAMDATA",
    "COMMONPROGRAMFILES", "COMMONPROGRAMFILES(X86)",
    "HOME", "USER", "LOGNAME", "SHELL", "LANG", "LC_ALL", "TERM", "TMPDIR",
    # Dev tooling & runtimes
    "GIT_EXEC_PATH", "NODE_PATH", "PYTHONPATH", "PYTHONHOME", "NVM_BIN", "NVM_INC",
    # Specific agent / model keys explicitly configured for LLM/CLI
    "ANTIGRAVITY_API_KEY", "GOOGLE_APPLICATION_CREDENTIALS", "GEMINI_API_KEY"
}


def build_safe_subprocess_env(base_env: Optional[Dict[str, str]] = None) -> Dict[str, str]:
    """
    Builds a minimal, sanitized environment dictionary for subprocess execution
    using a strict whitelist to prevent leaking host/runner secrets.
    """
    source = base_env if base_env is not None else os.environ
    safe_env: Dict[str, str] = {}
    for key, val in source.items():
        key_upper = key.upper()
        if any(key_upper == allowed.upper() for allowed in SAFE_ENV_ALLOWLIST):
            if any(term in key_upper for term in ("SECRET", "TOKEN", "PASSWORD")) and key_upper not in ("ANTIGRAVITY_API_KEY", "GEMINI_API_KEY"):
                continue
            safe_env[key] = val
    return safe_env



# ── Command Construction ──────────────────────────────────────────────────────

def build_command(
    spec: ExecutionSpec,
    policy: ExecutionPolicy,
    executable_path: str
) -> List[str]:
    """
    Constructs the verified command-line invocation for Antigravity CLI.
    Enforces headless print mode, stream-json output, mode restrictions, and sandbox policy.
    No shell=True is ever used.

    Args:
        spec: Task execution specification containing workspace, prompt, and execution mode.
        policy: Execution policy containing timeout, line limits, and sandbox options.
        executable_path: Verified absolute path to agy binary.

    Returns:
        List of command-line argument strings ready for subprocess invocation.
    """
    if not executable_path:
        raise ExecutableNotFoundError("executable_path is required to build command")

    cmd = [
        executable_path,
        "--output-format", "stream-json",
        "-p", spec.prompt or ""
    ]

    # Mode mapping: agy supports (plan, accept-edits, auto)
    if spec.mode in ("plan", "accept-edits", "auto"):
        cmd.extend(["--mode", spec.mode])
    else:
        # Default fallback to safe read-only plan mode if unknown
        cmd.extend(["--mode", "plan"])

    if policy.timeout_seconds and policy.timeout_seconds > 0:
        cmd.extend(["--print-timeout", f"{policy.timeout_seconds}s"])

    if spec.runtime_session_id:
        cmd.extend(["--conversation", spec.runtime_session_id])

    if spec.model_override:
        cmd.extend(["--model", spec.model_override])

    if spec.effort:
        cmd.extend(["--effort", spec.effort])

    # Security policy enforcement: sandbox enabled by default
    if policy.sandbox and spec.custom_options.get("sandbox", True):
        cmd.append("--sandbox")

    # Explicitly guarded: never pass dangerously-skip-permissions unless verified
    if spec.custom_options.get("dangerously_skip_permissions", False):
        cmd.append("--dangerously-skip-permissions")

    return cmd


# ── Antigravity CLI Adapter ───────────────────────────────────────────────────

class AntigravityCLIAdapter(RuntimeAdapter):
    """Runtime Adapter executing coding tasks using Antigravity CLI (agy)."""

    def __init__(self, executable_path: Optional[str] = None):
        self._custom_executable = executable_path
        self._active_processes: Dict[str, subprocess.Popen] = {}
        self._cancellation_flags: Dict[str, bool] = {}

    def find_executable(self) -> Optional[str]:
        """Locates the agy binary on PATH or Windows local app data."""
        if self._custom_executable:
            if os.path.isfile(self._custom_executable):
                return self._custom_executable
            return None  # Custom executable explicitly specified but not found on host

        # Check standard PATH
        bin_path = shutil.which("agy") or shutil.which("agy.exe")
        if bin_path:
            return bin_path

        # Windows default location
        local_app_data = os.environ.get("LOCALAPPDATA", "")
        if local_app_data:
            candidate = os.path.join(local_app_data, "agy", "bin", "agy.exe")
            if os.path.isfile(candidate):
                return candidate

        return None

    def check_prerequisites(self) -> Dict[str, Any]:
        """Validates that agy is installed and reports capabilities."""
        exe = self.find_executable()
        if not exe:
            return {
                "available": False,
                "error": "Antigravity CLI ('agy') không được tìm thấy trên PATH hoặc %LOCALAPPDATA%\\agy\\bin\\agy.exe."
            }

        try:
            res = subprocess.run(
                [exe, "--version"],
                capture_output=True,
                text=True,
                timeout=5,
                check=False
            )
            version_str = (res.stdout or res.stderr or "").strip()
            return {
                "available": True,
                "executable": exe,
                "version": version_str,
                "supported_modes": ["plan", "accept-edits"],
                "supported_output_formats": ["stream-json", "json", "text"],
                "headless_capable": True
            }
        except Exception as e:
            return {
                "available": False,
                "executable": exe,
                "error": f"Lỗi khi kiểm tra phiên bản agy: {str(e)}"
            }

    def cancel(self, attempt_id: str, reason: str = "User cancelled") -> bool:
        """Kills the running agy process and its entire child process tree on host."""
        self._cancellation_flags[attempt_id] = True
        proc = self._active_processes.get(attempt_id)
        if not proc:
            return False

        try:
            logger.info(f"[AntigravityAdapter] Cancelling attempt {attempt_id} (PID {proc.pid}): {reason}")
            if sys.platform == "win32":
                # Process tree cleanup on Windows using taskkill /T /F
                subprocess.run(
                    ["taskkill", "/T", "/F", "/PID", str(proc.pid)],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    check=False
                )
            else:
                proc.terminate()
                try:
                    proc.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    proc.kill()

            # Confirm process termination
            deadline = time.time() + 3.0
            while time.time() < deadline:
                if proc.poll() is not None:
                    break
                time.sleep(0.1)

            return True
        except Exception as e:
            logger.warning(f"[AntigravityAdapter] Error terminating process for {attempt_id}: {e}")
            return False

    def execute(
        self,
        spec: ExecutionSpec,
        policy: ExecutionPolicy,
        event_callback: Callable[[NormalizedEvent], None]
    ) -> ExecutionResult:
        """Executes a development turn via Antigravity CLI."""
        exe = self.find_executable()
        if not exe:
            err = "Antigravity CLI ('agy') không tồn tại trên máy Runner."
            logger.error(f"[AntigravityAdapter] {err}")
            return ExecutionResult(status="FAILED", exit_code=-1, error_message=err)

        canonical_ws = os.path.realpath(os.path.abspath(spec.workspace_path))
        if not os.path.isdir(canonical_ws):
            err = f"Workspace path '{spec.workspace_path}' không tồn tại trên máy Runner."
            logger.error(f"[AntigravityAdapter] {err}")
            return ExecutionResult(status="FAILED", exit_code=-1, error_message=err)

        try:
            cmd_args = build_command(spec, policy, exe)
        except Exception as e:
            err = f"Lỗi khi khởi tạo lệnh CLI: {str(e)}"
            logger.error(f"[AntigravityAdapter] {err}")
            return ExecutionResult(status="FAILED", exit_code=-1, error_message=err)

        # Environment scrubbing: strict allowlist prevents leaking host/runner secrets
        clean_env = build_safe_subprocess_env()

        creation_flags = 0
        if sys.platform == "win32":
            creation_flags = subprocess.CREATE_NO_WINDOW

        seq_counter = 0

        def emit_event(event_type: str, payload: Dict[str, Any], severity: str = "INFO"):
            nonlocal seq_counter
            seq_counter += 1
            evt = NormalizedEvent(
                event_id=f"evt_{uuid.uuid4().hex[:16]}",
                sequence_number=seq_counter,
                task_id=spec.task_id,
                attempt_id=spec.attempt_id,
                runtime="antigravity",
                timestamp=datetime.now(timezone.utc).isoformat(),
                event_type=event_type,
                severity=severity,
                payload=payload
            )
            event_callback(evt)

        # Notify initial task transition
        target_mode_status = "PLANNING" if spec.mode == "plan" else "RUNNING"
        emit_event(
            "STATUS_TRANSITION",
            {"from_status": "DISPATCHING", "to_status": target_mode_status, "mode": spec.mode}
        )

        stderr_ring_buffer = deque(maxlen=500)
        start_time = time.time()
        first_output_time = None
        tokens_in = None
        tokens_out = None
        cost_estimate = None
        summary_text = None
        accumulated_response_chunks: List[str] = []
        result_received = False
        result_status = None
        result_error = None
        conversation_id = spec.runtime_session_id

        self._cancellation_flags[spec.attempt_id] = False

        try:
            proc = subprocess.Popen(
                cmd_args,
                cwd=canonical_ws,
                env=clean_env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                stdin=subprocess.DEVNULL,
                creationflags=creation_flags,
                text=False  # Byte-level streaming
            )
            self._active_processes[spec.attempt_id] = proc
            logger.info(
                f"[AntigravityAdapter] Subprocess started (PID={proc.pid}) for attempt {spec.attempt_id} "
                f"in {canonical_ws} [mode={spec.mode}, timeout={policy.timeout_seconds}s]"
            )
        except Exception as e:
            err = f"Không thể khởi tạo tiến trình agy: {str(e)}"
            logger.error(f"[AntigravityAdapter] {err}")
            return ExecutionResult(status="FAILED", exit_code=-1, error_message=err)

        # Watchdog timeout timer
        timed_out = threading.Event()
        def on_timeout():
            timed_out.set()
            logger.warning(f"[AntigravityAdapter] Attempt {spec.attempt_id} exceeded timeout {policy.timeout_seconds}s. Terminating.")
            self.cancel(spec.attempt_id, reason=f"Timeout of {policy.timeout_seconds}s reached")

        timer = None
        if policy.timeout_seconds and policy.timeout_seconds > 0:
            timer = threading.Timer(policy.timeout_seconds, on_timeout)
            timer.daemon = True
            timer.start()

        # Concurrent stderr draining thread
        def drain_stderr():
            try:
                for raw_err in iter(proc.stderr.readline, b""):
                    if not raw_err:
                        break
                    decoded = raw_err.decode("utf-8", errors="replace").strip()
                    if decoded:
                        sanitized = redact_sensitive_text(decoded)
                        stderr_ring_buffer.append(sanitized)
            except Exception:
                pass

        stderr_thread = threading.Thread(target=drain_stderr, daemon=True)
        stderr_thread.start()

        # Main stdout stream processing (Line-by-line, handling nested NDJSON)
        try:
            for raw_line in iter(proc.stdout.readline, b""):
                if not raw_line:
                    break

                if first_output_time is None:
                    first_output_time = time.time()
                    elapsed = round(first_output_time - start_time, 3)
                    logger.debug(f"[AntigravityAdapter] First output received after {elapsed}s (PID={proc.pid})")

                # Oversized Line Guard (DoS defense)
                if len(raw_line) > policy.max_line_length_bytes:
                    raw_line = raw_line[:policy.max_line_length_bytes]
                    emit_event(
                        "DIAGNOSTIC_LOG",
                        {"stream": "stdout", "message": "Truncated oversized NDJSON line from agy"},
                        severity="WARN"
                    )

                raw_text = raw_line.decode("utf-8", errors="replace").strip()
                if not raw_text:
                    continue

                # Parse JSON safely
                try:
                    raw_json = json.loads(raw_text)
                except Exception:
                    # Malformed JSON line is preserved as diagnostic log without crashing
                    emit_event(
                        "DIAGNOSTIC_LOG",
                        {"stream": "stdout", "message": redact_sensitive_text(raw_text)},
                        severity="DEBUG"
                    )
                    continue

                if not isinstance(raw_json, dict):
                    continue

                # Map raw Antigravity CLI events to Normalized AI-Chan Events
                event_type = raw_json.get("event") or raw_json.get("type")
                container = raw_json.get(event_type) if isinstance(raw_json.get(event_type), dict) else raw_json

                if raw_json.get("conversation_id"):
                    conversation_id = raw_json.get("conversation_id")
                elif container.get("conversation_id"):
                    conversation_id = container.get("conversation_id")

                # 1. Event: init
                if event_type == "init":
                    cwd_val = container.get("cwd") or raw_json.get("cwd") or canonical_ws
                    model_val = container.get("model") or raw_json.get("model", "default")
                    tools_val = container.get("tools") or raw_json.get("tools", [])
                    perm_val = container.get("permission_mode") or raw_json.get("permission_mode", spec.mode)
                    agent_val = container.get("agent") or raw_json.get("agent")

                    emit_event("TASK_INITIALIZED", {
                        "cwd": redact_sensitive_text(str(cwd_val)),
                        "model": model_val,
                        "tools_available": tools_val,
                        "permission_mode": perm_val,
                        "conversation_id": conversation_id,
                        "agent": agent_val
                    })

                # 2. Event: step_update
                elif event_type == "step_update":
                    step_type = container.get("step_type") or container.get("type") or raw_json.get("step_type")
                    step_idx = container.get("step_index", raw_json.get("step_index", 0))
                    state = container.get("state", raw_json.get("state"))

                    if step_type == "user_input":
                        emit_event("STEP_USER_INPUT", {
                            "step_index": step_idx,
                            "state": state or "DONE"
                        })

                    elif step_type == "agent_response":
                        text_delta = container.get("text_delta") or container.get("text") or raw_json.get("text_delta") or ""
                        if text_delta:
                            accumulated_response_chunks.append(text_delta)
                            emit_event("TEXT_DELTA", {
                                "text_delta": redact_sensitive_text(text_delta),
                                "step_index": step_idx
                            })

                        # Capture step-level usage if emitted
                        step_usage = container.get("usage")
                        if isinstance(step_usage, dict):
                            s_in = step_usage.get("input_tokens")
                            s_out = step_usage.get("output_tokens")
                            s_cost = step_usage.get("cost_estimate")
                            if s_in or s_out:
                                emit_event("TOKEN_USAGE", {
                                    "input_tokens": s_in,
                                    "output_tokens": s_out,
                                    "total_tokens": (s_in or 0) + (s_out or 0),
                                    "cost_estimate": s_cost,
                                    "step_index": step_idx
                                })

                    elif step_type in ("tool", "tool_call"):
                        tool_info = container.get("tool_info") or raw_json.get("tool_info") or {}
                        tool_name = (
                            container.get("tool_name")
                            or raw_json.get("tool_name")
                            or (tool_info.get("name") if isinstance(tool_info, dict) else "unknown_tool")
                        )
                        call_id = (
                            container.get("call_id")
                            or raw_json.get("call_id")
                            or (tool_info.get("call_id") if isinstance(tool_info, dict) else None)
                        )
                        dur = container.get("duration_seconds", raw_json.get("duration_seconds", 0.0))

                        if state == "ACTIVE":
                            emit_event("TOOL_CALL_START", {
                                "tool_name": tool_name,
                                "call_id": call_id,
                                "step_index": step_idx,
                                "tool_info": redact_sensitive_text(str(tool_info))
                            })
                        else:
                            emit_event("TOOL_CALL_END", {
                                "tool_name": tool_name,
                                "call_id": call_id,
                                "step_index": step_idx,
                                "duration_seconds": dur,
                                "state": state or "DONE"
                            })

                    elif step_type == "subagent_info":
                        sub_info = container.get("subagent_info") or raw_json.get("subagent_info") or {}
                        emit_event("SUBAGENT_ACTIVITY", {
                            "step_index": step_idx,
                            "subagent_info": redact_sensitive_text(str(sub_info))
                        })

                    elif step_type == "checkpoint":
                        emit_event("CHECKPOINT_SAVED", {
                            "step_index": step_idx,
                            "conversation_id": conversation_id
                        })

                    else:
                        emit_event("DIAGNOSTIC_LOG", {
                            "stream": "stdout",
                            "message": f"Unknown step_type: {step_type}"
                        }, severity="DEBUG")

                # 3. Event: result
                elif event_type == "result":
                    result_received = True
                    result_status = container.get("status") or raw_json.get("status")
                    summary_text = (
                        container.get("response")
                        or container.get("summary")
                        or container.get("structured_output")
                        or raw_json.get("response")
                        or ""
                    )
                    result_error = container.get("error") or container.get("error_message") or raw_json.get("error")

                    usage_obj = container.get("usage") or raw_json.get("usage") or {}
                    if isinstance(usage_obj, dict):
                        tokens_in = usage_obj.get("input_tokens") or raw_json.get("input_tokens")
                        tokens_out = usage_obj.get("output_tokens") or raw_json.get("output_tokens")
                        cost_estimate = usage_obj.get("cost_estimate") or raw_json.get("cost_estimate")

                    if tokens_in or tokens_out:
                        emit_event("TOKEN_USAGE", {
                            "input_tokens": tokens_in,
                            "output_tokens": tokens_out,
                            "total_tokens": (tokens_in or 0) + (tokens_out or 0),
                            "cost_estimate": cost_estimate
                        })

                else:
                    # Unknown root event: preserve without crashing
                    short_event = str(event_type)[:100]
                    emit_event("DIAGNOSTIC_LOG", {
                        "stream": "stdout",
                        "message": f"Unknown root event: {short_event}"
                    }, severity="DEBUG")

        finally:
            if timer:
                timer.cancel()
            self._active_processes.pop(spec.attempt_id, None)
            try:
                if proc.stdout:
                    proc.stdout.close()
            except Exception:
                pass
            try:
                if proc.stderr:
                    proc.stderr.close()
            except Exception:
                pass

        try:
            exit_code = proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self.cancel(spec.attempt_id, reason="Process reap timeout expired")
            exit_code = proc.wait()

        stderr_thread.join(timeout=2)
        duration_seconds = round(time.time() - start_time, 2)

        is_cancelled = self._cancellation_flags.pop(spec.attempt_id, False)

        if timed_out.is_set():
            err_msg = f"Task execution timed out after {policy.timeout_seconds}s."
            logger.warning(f"[AntigravityAdapter] {err_msg} for {spec.attempt_id}")
            emit_event("TASK_FAILED", {"exit_code": -1, "error_message": err_msg}, severity="ERROR")
            return ExecutionResult(
                status="FAILED",
                exit_code=-1,
                duration_seconds=duration_seconds,
                tokens_in=tokens_in,
                tokens_out=tokens_out,
                cost_estimate=cost_estimate,
                error_message=err_msg
            )

        if is_cancelled:
            logger.info(f"[AntigravityAdapter] Execution cancelled for {spec.attempt_id}")
            emit_event("STATUS_TRANSITION", {"to_status": "CANCELLED", "reason": "User cancelled"})
            return ExecutionResult(
                status="CANCELLED",
                exit_code=exit_code,
                duration_seconds=duration_seconds,
                tokens_in=tokens_in,
                tokens_out=tokens_out,
                cost_estimate=cost_estimate,
                summary="Task đã bị hủy theo yêu cầu."
            )

        if exit_code != 0:
            err_msg = "\n".join(stderr_ring_buffer) or f"Process thoát với mã lỗi {exit_code}"
            if "unauthorized" in err_msg.lower() or "authentication" in err_msg.lower():
                err_msg = f"Lỗi xác thực Antigravity CLI: {err_msg}"
            elif "permission denied" in err_msg.lower():
                err_msg = f"Lỗi quyền thực thi trên host: {err_msg}"

            logger.error(f"[AntigravityAdapter] Process non-zero exit ({exit_code}) for {spec.attempt_id}: {err_msg}")
            emit_event("TASK_FAILED", {
                "exit_code": exit_code,
                "error_message": redact_sensitive_text(err_msg)
            }, severity="ERROR")
            return ExecutionResult(
                status="FAILED",
                exit_code=exit_code,
                duration_seconds=duration_seconds,
                tokens_in=tokens_in,
                tokens_out=tokens_out,
                cost_estimate=cost_estimate,
                error_message=redact_sensitive_text(err_msg)
            )

        # Invariant: Exit 0 must have emitted a valid result event to be marked success
        if not result_received:
            err_msg = "Tiến trình CLI kết thúc (exit 0) nhưng không trả về sự kiện terminal result."
            if stderr_ring_buffer:
                err_msg += f" Stderr: {' '.join(list(stderr_ring_buffer)[-3:])}"
            logger.error(f"[AntigravityAdapter] {err_msg} for {spec.attempt_id}")
            emit_event("TASK_FAILED", {"exit_code": exit_code, "error_message": err_msg}, severity="ERROR")
            return ExecutionResult(
                status="FAILED",
                exit_code=exit_code,
                duration_seconds=duration_seconds,
                tokens_in=tokens_in,
                tokens_out=tokens_out,
                cost_estimate=cost_estimate,
                error_message=err_msg
            )

        # Invariant: CLI result status must be SUCCESS
        if result_status and result_status.upper() not in ("SUCCESS", "COMPLETED"):
            status_upper = result_status.upper()
            if status_upper in ("CANCELED", "CANCELLED", "INTERRUPTED"):
                emit_event("STATUS_TRANSITION", {"to_status": "CANCELLED", "reason": f"CLI status: {result_status}"})
                return ExecutionResult(
                    status="CANCELLED",
                    exit_code=exit_code,
                    duration_seconds=duration_seconds,
                    tokens_in=tokens_in,
                    tokens_out=tokens_out,
                    cost_estimate=cost_estimate,
                    summary=f"Task đã bị hủy bởi CLI runtime ({result_status})."
                )
            else:
                err_msg = result_error or f"CLI runtime trả về trạng thái không thành công: '{result_status}'"
                logger.error(f"[AntigravityAdapter] {err_msg} for {spec.attempt_id}")
                emit_event("TASK_FAILED", {"exit_code": exit_code, "error_message": err_msg}, severity="ERROR")
                return ExecutionResult(
                    status="FAILED",
                    exit_code=exit_code,
                    duration_seconds=duration_seconds,
                    tokens_in=tokens_in,
                    tokens_out=tokens_out,
                    cost_estimate=cost_estimate,
                    error_message=err_msg
                )

        # Determine final response text combining summary and accumulated streamed deltas
        streamed_response = "".join(accumulated_response_chunks).strip()
        final_response_text = ""
        if summary_text and summary_text.strip():
            if streamed_response and len(streamed_response) > len(summary_text.strip()):
                final_response_text = streamed_response
            else:
                final_response_text = summary_text.strip()
        else:
            final_response_text = streamed_response

        # Invariant for Plan / Review mode: response must not be empty!
        # If response is empty, mark task FAILED with clear diagnostic - never create fake artifacts
        if spec.mode == "plan" and not final_response_text:
            err_msg = "Runtime CLI hoàn tất nhưng không tạo ra nội dung phản hồi (empty output)."
            logger.error(f"[AntigravityAdapter] {err_msg} for {spec.attempt_id}")
            emit_event("TASK_FAILED", {"exit_code": 1, "error_message": err_msg}, severity="ERROR")
            return ExecutionResult(
                status="FAILED",
                exit_code=1,
                duration_seconds=duration_seconds,
                tokens_in=tokens_in,
                tokens_out=tokens_out,
                cost_estimate=cost_estimate,
                error_message=err_msg,
                artifacts=[]
            )

        # Collect artifacts
        artifacts = []
        if spec.mode == "accept-edits":
            git_diff_content = self._collect_git_diff(canonical_ws)
            if git_diff_content:
                diff_bytes = git_diff_content.encode("utf-8")
                artifacts.append({
                    "artifact_type": "diff",
                    "display_name": "Unified Git Diff",
                    "file_path": "changes.diff",
                    "content": redact_sensitive_text(git_diff_content),
                    "mime_type": "text/x-diff",
                    "byte_size": len(diff_bytes),
                    "checksum_sha256": hashlib.sha256(diff_bytes).hexdigest()
                })
            if final_response_text:
                sum_bytes = final_response_text.encode("utf-8")
                artifacts.append({
                    "artifact_type": "summary",
                    "display_name": "Tóm tắt Thay đổi Mã nguồn",
                    "file_path": "implementation_summary.md",
                    "content": redact_sensitive_text(final_response_text),
                    "mime_type": "text/markdown",
                    "byte_size": len(sum_bytes),
                    "checksum_sha256": hashlib.sha256(sum_bytes).hexdigest()
                })

        if spec.mode == "plan" and final_response_text:
            # Check read-only invariant on target workspace
            post_plan_diff = self._collect_git_diff(canonical_ws)
            if post_plan_diff:
                emit_event(
                    "DIAGNOSTIC_LOG",
                    {"stream": "stdout", "message": "Cảnh báo: Phát hiện thay đổi trong workspace ở chế độ Read-Only Plan."},
                    severity="WARN"
                )

            is_review = any(term in (spec.title or "").lower() or term in (spec.prompt or "").lower() 
                            for term in ("review", "đánh giá"))
            filename = "codebase_review.md" if is_review else "plan.md"
            display_name = "Báo cáo Phân tích Codebase" if is_review else "Kế hoạch Thực thi (Plan)"
            art_type = "review" if is_review else "plan"

            plan_content = redact_sensitive_text(final_response_text)
            plan_bytes = plan_content.encode("utf-8")
            artifacts.append({
                "artifact_type": art_type,
                "display_name": display_name,
                "file_path": filename,
                "content": plan_content,
                "mime_type": "text/markdown",
                "byte_size": len(plan_bytes),
                "checksum_sha256": hashlib.sha256(plan_bytes).hexdigest()
            })

            emit_event("PLAN_CREATED", {
                "plan_markdown": plan_content,
                "conversation_id": conversation_id,
                "artifact_file": filename
            })

        emit_event("TASK_COMPLETED", {
            "exit_code": 0,
            "duration_seconds": duration_seconds,
            "summary": final_response_text[:500] if len(final_response_text) > 500 else (final_response_text or "Task hoàn thành thành công.")
        })

        logger.info(
            f"[AntigravityAdapter] Task {spec.task_id} attempt {spec.attempt_id} completed successfully "
            f"in {duration_seconds}s (tokens_in={tokens_in}, tokens_out={tokens_out})"
        )

        return ExecutionResult(
            status="COMPLETED",
            exit_code=0,
            duration_seconds=duration_seconds,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            cost_estimate=cost_estimate,
            summary=final_response_text,
            artifacts=artifacts
        )

    def _collect_git_diff(self, workspace_path: str) -> Optional[str]:
        """Captures unified diff from the local git workspace if modified."""
        try:
            res = subprocess.run(
                ["git", "diff", "HEAD"],
                cwd=workspace_path,
                capture_output=True,
                text=True,
                timeout=10,
                check=False
            )
            if res.returncode == 0 and res.stdout.strip():
                return res.stdout
        except Exception:
            pass
        return None
