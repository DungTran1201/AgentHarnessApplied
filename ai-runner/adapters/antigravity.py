"""
AI-Chan Development Orchestrator — Antigravity CLI Runtime Adapter
Path: ai-runner/adapters/antigravity.py
Implements: SPEC-ADA-01, SPEC-EVT-01, ADR-015
Verified CLI: agy 1.2.16 (https://antigravity.google/docs/cli/headless/)
"""

import os
import sys
import json
import time
import uuid
import re
import shutil
import threading
import subprocess
from collections import deque
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Callable

from .base import RuntimeAdapter, ExecutionSpec, ExecutionPolicy, NormalizedEvent, ExecutionResult


# ── Secret & Sensitive Path Redaction Patterns ────────────────────────────────
SECRET_PATTERNS = [
    (re.compile(r"sk-[a-zA-Z0-9]{32,}"), "[REDACTED_API_KEY]"),
    (re.compile(r"ghp_[a-zA-Z0-9]{36}"), "[REDACTED_GITHUB_TOKEN]"),
    (re.compile(r"AIza[0-9A-Za-z-_]{30,}"), "[REDACTED_GOOGLE_KEY]"),
    (re.compile(r"Bearer\s+[a-zA-Z0-9._-]{20,}", re.IGNORECASE), "Bearer [REDACTED_BEARER_TOKEN]"),
    (re.compile(r"rsk_[a-f0-9]{32,}", re.IGNORECASE), "[REDACTED_RUNNER_SECRET]"),
]

def redact_sensitive_text(text: str) -> str:
    """Sanitizes credentials and tokens from text before emitting events."""
    if not text or not isinstance(text, str):
        return text
    cleaned = text
    for pattern, replacement in SECRET_PATTERNS:
        cleaned = pattern.sub(replacement, cleaned)
    return cleaned


class AntigravityCLIAdapter(RuntimeAdapter):
    """Runtime Adapter executing coding tasks using Antigravity CLI (agy)."""

    def __init__(self, executable_path: Optional[str] = None):
        self._custom_executable = executable_path
        self._active_processes: Dict[str, subprocess.Popen] = {}
        self._cancellation_flags: Dict[str, bool] = {}

    def find_executable(self) -> Optional[str]:
        """Locates the agy binary on PATH or Windows local app data."""
        if self._custom_executable and os.path.isfile(self._custom_executable):
            return self._custom_executable

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
        """Kills the running agy process and its entire child process tree."""
        self._cancellation_flags[attempt_id] = True
        proc = self._active_processes.get(attempt_id)
        if not proc:
            return False

        try:
            if sys.platform == "win32":
                # Process tree cleanup on Windows using taskkill
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
            return True
        except Exception:
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
            return ExecutionResult(
                status="FAILED",
                exit_code=-1,
                error_message="Antigravity CLI ('agy') không tồn tại trên máy Runner."
            )

        if not os.path.isdir(spec.workspace_path):
            return ExecutionResult(
                status="FAILED",
                exit_code=-1,
                error_message=f"Workspace path '{spec.workspace_path}' không tồn tại trên máy Runner."
            )

        # Build safe command args (No shell=True)
        cmd_args = [
            exe,
            "--output-format", "stream-json",
            "-p", spec.prompt,
            "--mode", spec.mode,
        ]

        if policy.timeout_seconds > 0:
            cmd_args.extend(["--print-timeout", f"{policy.timeout_seconds}s"])

        if spec.runtime_session_id:
            cmd_args.extend(["--conversation", spec.runtime_session_id])

        if spec.model_override:
            cmd_args.extend(["--model", spec.model_override])

        if spec.effort:
            cmd_args.extend(["--effort", spec.effort])

        # Security policy enforcement: sandbox enabled by default
        if policy.sandbox and spec.custom_options.get("sandbox", True):
            cmd_args.append("--sandbox")

        # Explicitly guarded: never pass dangerously-skip-permissions unless verified
        if spec.custom_options.get("dangerously_skip_permissions", False):
            cmd_args.append("--dangerously-skip-permissions")

        # Safe environment allowlist (strip internal runner credentials)
        clean_env = os.environ.copy()
        for k in list(clean_env.keys()):
            if "SECRET" in k or "TOKEN" in k or "PASSWORD" in k:
                if k not in ("PATH", "LOCALAPPDATA", "APPDATA", "USERPROFILE", "HOMEPATH", "TEMP", "TMP"):
                    clean_env.pop(k, None)

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
        emit_event(
            "STATUS_TRANSITION",
            {"from_status": "DISPATCHING", "to_status": "RUNNING", "mode": spec.mode}
        )

        stderr_ring_buffer = deque(maxlen=200)
        start_time = time.time()
        tokens_in = None
        tokens_out = None
        cost_estimate = None
        summary_text = None

        self._cancellation_flags[spec.attempt_id] = False

        try:
            proc = subprocess.Popen(
                cmd_args,
                cwd=spec.workspace_path,
                env=clean_env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                stdin=subprocess.DEVNULL,
                creationflags=creation_flags,
                text=False  # read raw bytes to handle partial chunking safely
            )
            self._active_processes[spec.attempt_id] = proc
        except Exception as e:
            return ExecutionResult(
                status="FAILED",
                exit_code=-1,
                error_message=f"Không thể khởi tạo tiến trình agy: {str(e)}"
            )

        # Background thread to drain stderr
        def drain_stderr():
            try:
                for line in proc.stderr:
                    decoded = line.decode("utf-8", errors="replace").strip()
                    if decoded:
                        stderr_ring_buffer.append(decoded)
            except Exception:
                pass

        stderr_thread = threading.Thread(target=drain_stderr, daemon=True)
        stderr_thread.start()

        # Drain stdout line-by-line (NDJSON)
        line_buffer = bytearray()
        try:
            while True:
                chunk = proc.stdout.read(4096)
                if not chunk:
                    break
                line_buffer.extend(chunk)

                # Process complete lines
                while b"\n" in line_buffer:
                    line_bytes, _, line_buffer = line_buffer.partition(b"\n")
                    if not line_bytes:
                        continue

                    # Guard against runaway line size DoS
                    if len(line_bytes) > policy.max_line_length_bytes:
                        line_bytes = line_bytes[:policy.max_line_length_bytes]
                        emit_event(
                            "DIAGNOSTIC_LOG",
                            {"stream": "stdout", "message": "Truncated oversized NDJSON line from agy"},
                            severity="WARN"
                        )

                    raw_text = line_bytes.decode("utf-8", errors="replace").strip()
                    if not raw_text:
                        continue

                    # Parse NDJSON
                    try:
                        raw_json = json.loads(raw_text)
                    except Exception:
                        emit_event(
                            "DIAGNOSTIC_LOG",
                            {"stream": "stdout", "message": redact_sensitive_text(raw_text)},
                            severity="DEBUG"
                        )
                        continue

                    # Map raw Antigravity CLI events to Normalized AI-Chan Events
                    event_type = raw_json.get("event") or raw_json.get("type")

                    if event_type == "init":
                        emit_event("TASK_INITIALIZED", {
                            "cwd": redact_sensitive_text(raw_json.get("cwd", spec.workspace_path)),
                            "model": raw_json.get("model", "default"),
                            "tools_available": raw_json.get("tools", []),
                            "permission_mode": raw_json.get("permission_mode", spec.mode)
                        })

                    elif event_type == "step_update":
                        step_type = raw_json.get("step_type") or raw_json.get("type")
                        
                        if step_type == "user_input":
                            emit_event("STEP_USER_INPUT", {
                                "step_index": raw_json.get("step_index", 0),
                                "state": raw_json.get("state", "DONE")
                            })

                        elif step_type == "agent_response":
                            text_delta = raw_json.get("text_delta") or raw_json.get("text", "")
                            if text_delta:
                                emit_event("TEXT_DELTA", {
                                    "text_delta": redact_sensitive_text(text_delta),
                                    "step_index": raw_json.get("step_index", 0)
                                })

                        elif step_type == "tool":
                            state = raw_json.get("state")
                            tool_info = raw_json.get("tool_info", {})
                            tool_name = raw_json.get("tool_name") or tool_info.get("name", "unknown_tool")

                            if state == "ACTIVE":
                                emit_event("TOOL_CALL_START", {
                                    "tool_name": tool_name,
                                    "step_index": raw_json.get("step_index", 0),
                                    "tool_info": redact_sensitive_text(str(tool_info))
                                })
                            else:
                                emit_event("TOOL_CALL_END", {
                                    "tool_name": tool_name,
                                    "step_index": raw_json.get("step_index", 0),
                                    "duration_seconds": raw_json.get("duration_seconds", 0.0),
                                    "state": state
                                })

                        elif step_type == "checkpoint":
                            emit_event("CHECKPOINT_SAVED", {
                                "step_index": raw_json.get("step_index", 0),
                                "conversation_id": raw_json.get("conversation_id")
                            })

                    elif event_type == "result":
                        summary_text = raw_json.get("summary") or raw_json.get("structured_output")
                        usage = raw_json.get("usage", {})
                        tokens_in = usage.get("input_tokens") or raw_json.get("input_tokens")
                        tokens_out = usage.get("output_tokens") or raw_json.get("output_tokens")
                        cost_estimate = raw_json.get("cost_estimate")

                        if tokens_in or tokens_out:
                            emit_event("TOKEN_USAGE", {
                                "input_tokens": tokens_in,
                                "output_tokens": tokens_out,
                                "total_tokens": (tokens_in or 0) + (tokens_out or 0),
                                "cost_estimate": cost_estimate
                            })

        finally:
            self._active_processes.pop(spec.attempt_id, None)
            try:
                if proc.stdout:
                    proc.stdout.close()
                if proc.stderr:
                    proc.stderr.close()
            except Exception:
                pass

        exit_code = proc.wait()
        stderr_thread.join(timeout=2)
        duration_seconds = round(time.time() - start_time, 2)

        is_cancelled = self._cancellation_flags.pop(spec.attempt_id, False)
        if is_cancelled:
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

        # Collect artifacts (e.g. git diff if workspace is git repo)
        artifacts = []
        git_diff_content = self._collect_git_diff(spec.workspace_path)
        if git_diff_content:
            artifacts.append({
                "artifact_type": "diff",
                "file_path": "changes.diff",
                "content": redact_sensitive_text(git_diff_content)
            })

        emit_event("TASK_COMPLETED", {
            "exit_code": 0,
            "duration_seconds": duration_seconds,
            "summary": summary_text or "Task hoàn thành thành công."
        })

        return ExecutionResult(
            status="COMPLETED",
            exit_code=0,
            duration_seconds=duration_seconds,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            cost_estimate=cost_estimate,
            summary=summary_text,
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
