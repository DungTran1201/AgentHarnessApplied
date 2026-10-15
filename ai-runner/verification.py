"""
AI-Chan Agent Runner — Verification Pipeline
Path: ai-runner/verification.py
Implements: SRS-ORCH-01 (FR-RUN-010..014), ADR-015, Prompt 06 Scope B
"""

import os
import sys
import time
import shlex
import shutil
import signal
import subprocess
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Dict, Any, Optional, List, Tuple

# Allowed base executables for verification commands
ALLOWED_EXECUTABLES = {
    "npm", "npx", "pnpm", "yarn", "bun",
    "pytest", "python", "python3",
    "cargo", "go",
    "ruff", "flake8", "mypy", "black", "isort",
    "tsc", "eslint", "vitest", "jest"
}

# Explicitly banned binaries and commands
BANNED_EXECUTABLES = {
    "curl", "wget", "nc", "netcat", "socat",
    "sh", "bash", "zsh", "cmd", "cmd.exe", "powershell", "powershell.exe", "pwsh",
    "eval", "exec", "sudo", "su", "rm", "del", "git", "ssh", "scp",
    "dd", "mkfs", "chmod", "chown"
}

# Dangerous shell characters / operators (chaining, redirection, command substitution)
BANNED_OPERATORS = {"&", ";", "|", ">", "<", "`", "$", "\n"}

MAX_PREVIEW_BYTES = 64 * 1024  # 64 KB per stream preview


@dataclass
class StepResult:
    step_name: str
    command: str
    status: str  # "PASSED" | "FAILED" | "ERROR" | "SKIPPED_BY_POLICY" | "NOT_RUN"
    exit_code: Optional[int] = None
    duration_seconds: float = 0.0
    stdout_preview: str = ""
    stderr_preview: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class VerificationPolicy:
    """Configurable verification policy per workspace."""
    def __init__(
        self,
        test_command: Optional[str] = None,
        lint_command: Optional[str] = None,
        typecheck_command: Optional[str] = None,
        build_command: Optional[str] = None,
        timeout_seconds: int = 120,
        stop_on_first_failure: bool = False
    ):
        self.test_command = test_command
        self.lint_command = lint_command
        self.typecheck_command = typecheck_command
        self.build_command = build_command
        self.timeout_seconds = max(1, min(timeout_seconds, 600))
        self.stop_on_first_failure = stop_on_first_failure

    @classmethod
    def from_dict(cls, data: Optional[Dict[str, Any]]) -> "VerificationPolicy":
        if not data:
            return cls()
        return cls(
            test_command=data.get("test_command"),
            lint_command=data.get("lint_command"),
            typecheck_command=data.get("typecheck_command"),
            build_command=data.get("build_command"),
            timeout_seconds=data.get("timeout_seconds", 120),
            stop_on_first_failure=data.get("stop_on_first_failure", False)
        )


class CommandSecurityValidator:
    """Validates commands against strict allowlists without naive substring matching."""

    @staticmethod
    def validate_command(command_str: str) -> Tuple[bool, Optional[str], Optional[List[str]]]:
        if not command_str or not command_str.strip():
            return False, "Command is empty", None

        # Check for dangerous operators
        for op in BANNED_OPERATORS:
            if op in command_str:
                return False, f"Command contains forbidden shell operator or chaining character: '{op}'", None

        # Parse command tokens (posix=True cleanly extracts quotes across OSes)
        try:
            tokens = shlex.split(command_str, posix=True)
        except Exception as e:
            return False, f"Failed to parse command arguments: {e}", None

        if not tokens:
            return False, "Empty token list", None

        raw_binary = tokens[0].lower()
        base_binary = Path(raw_binary).stem.lower()

        if base_binary in BANNED_EXECUTABLES:
            return False, f"Execution of binary '{base_binary}' is strictly forbidden by policy", None

        if base_binary not in ALLOWED_EXECUTABLES:
            return False, f"Executable '{base_binary}' is not in the allowed verification binaries list", None

        return True, None, tokens


class VerificationPipeline:
    """
    Executes verification steps (lint, typecheck, test, build) in an isolated workspace.
    Manages process lifecycles, output caps, timeouts, and state categorization.
    """

    def __init__(self, workspace_path: str, policy: Optional[VerificationPolicy] = None):
        self.workspace_path = Path(workspace_path).resolve()
        self.policy = policy or VerificationPolicy()
        self.active_process: Optional[subprocess.Popen] = None

    def execute_step(self, step_name: str, command: Optional[str]) -> StepResult:
        if not command or not command.strip():
            return StepResult(
                step_name=step_name,
                command="",
                status="NOT_RUN",
                exit_code=0,
                duration_seconds=0.0,
                stdout_preview="Step not configured"
            )

        # 1. Security validate command
        is_valid, reason, tokens = CommandSecurityValidator.validate_command(command)
        if not is_valid:
            return StepResult(
                step_name=step_name,
                command=command,
                status="SKIPPED_BY_POLICY",
                exit_code=-1,
                duration_seconds=0.0,
                stderr_preview=f"Command rejected by verification policy: {reason}"
            )

        # 2. Resolve executable on Windows (e.g., npm -> npm.cmd)
        exec_path = tokens[0]
        if sys.platform.startswith("win"):
            which_res = shutil.which(exec_path)
            if which_res:
                tokens[0] = which_res

        # 3. Spawn process without shell=True
        start_time = time.time()
        stdout_data = ""
        stderr_data = ""
        exit_code = -1
        step_status = "ERROR"

        try:
            proc = subprocess.Popen(
                tokens,
                cwd=str(self.workspace_path),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding="utf-8",
                errors="replace"
            )
            self.active_process = proc

            try:
                out, err = proc.communicate(timeout=self.policy.timeout_seconds)
                exit_code = proc.returncode
                duration = round(time.time() - start_time, 2)

                stdout_data = (out or "")[:MAX_PREVIEW_BYTES]
                stderr_data = (err or "")[:MAX_PREVIEW_BYTES]

                if exit_code == 0:
                    step_status = "PASSED"
                else:
                    step_status = "FAILED"

            except subprocess.TimeoutExpired:
                self.terminate_active_process()
                duration = round(time.time() - start_time, 2)
                step_status = "ERROR"
                exit_code = -1
                stderr_data = f"Step timed out after {self.policy.timeout_seconds} seconds."

        except Exception as e:
            duration = round(time.time() - start_time, 2)
            step_status = "ERROR"
            stderr_data = f"Failed to launch command: {e}"
        finally:
            self.active_process = None

        return StepResult(
            step_name=step_name,
            command=command,
            status=step_status,
            exit_code=exit_code,
            duration_seconds=duration,
            stdout_preview=stdout_data,
            stderr_preview=stderr_data
        )

    def terminate_active_process(self):
        """Terminates active process and all child processes cleanly."""
        if not self.active_process:
            return
        try:
            pid = self.active_process.pid
            if sys.platform.startswith("win"):
                subprocess.run(
                    ["taskkill", "/T", "/F", "/PID", str(pid)],
                    capture_output=True,
                    timeout=5
                )
            else:
                self.active_process.kill()
        except Exception:
            pass

    def run_all(self) -> Dict[str, Any]:
        """
        Executes all configured verification steps in sequence:
        1. Lint
        2. Type-Check
        3. Test Suite
        4. Build
        """
        steps_to_run = [
            ("lint", self.policy.lint_command),
            ("typecheck", self.policy.typecheck_command),
            ("test", self.policy.test_command),
            ("build", self.policy.build_command)
        ]

        results: List[StepResult] = []
        any_failed = False
        all_passed = True
        has_executed_any = False

        for step_name, cmd in steps_to_run:
            step_res = self.execute_step(step_name, cmd)
            results.append(step_res)

            if step_res.status in ("FAILED", "ERROR"):
                any_failed = True
                all_passed = False
                if self.policy.stop_on_first_failure:
                    break
            elif step_res.status == "PASSED":
                has_executed_any = True
            elif step_res.status == "SKIPPED_BY_POLICY":
                all_passed = False

        if not has_executed_any and not any_failed:
            overall_status = "NOT_RUN"
        elif any_failed:
            overall_status = "FAILED"
        elif all_passed:
            overall_status = "PASSED"
        else:
            overall_status = "PARTIAL"

        return {
            "overall_status": overall_status,
            "all_passed": all_passed,
            "has_failures": any_failed,
            "steps": [r.to_dict() for r in results]
        }
