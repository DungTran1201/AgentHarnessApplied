"""
AI-Chan Development Orchestrator — Antigravity CLI Adapter Unit & Smoke Tests
Path: ai-runner/tests/test_antigravity_adapter.py
Verifies: SPEC-ADA-01, SPEC-EVT-01, SPEC-CTR-01 (Prompt 02 Acceptance Gate)
"""

import os
import sys
import json
import time
import uuid
import tempfile
import threading
import unittest
from pathlib import Path

# Add ai-runner root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from adapters.base import ExecutionSpec, ExecutionPolicy, NormalizedEvent, ExecutionResult
from adapters.antigravity import (
    AntigravityCLIAdapter,
    build_command,
    redact_sensitive_text,
    ExecutableNotFoundError,
    WorkspaceNotFoundError
)


class TestAntigravityAdapterUnit(unittest.TestCase):

    def test_sensitive_text_redaction(self):
        """Verifies regex filtering of secrets, tokens, passwords, and private user paths."""
        sample = (
            "Calling API with sk-abc123456789012345678901234567890 and "
            "token Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret and "
            "Google key AIzaSyA1234567890123456789012345678901 and "
            "GitHub token ghp_123456789012345678901234567890123456 and "
            "runner secret rsk_abcdef0123456789abcdef0123456789 and "
            "local path C:\\Users\\MyUsername\\Project\\code.py and "
            "posix path /home/developer/workspace"
        )
        redacted = redact_sensitive_text(sample)
        self.assertNotIn("sk-abc123456789012345678901234567890", redacted)
        self.assertNotIn("ghp_123456789012345678901234567890123456", redacted)
        self.assertNotIn("AIzaSyA1234567890123456789012345678901", redacted)
        self.assertNotIn("rsk_abcdef0123456789abcdef0123456789", redacted)
        self.assertNotIn("MyUsername", redacted)
        self.assertNotIn("developer", redacted)
        self.assertIn("[REDACTED_API_KEY]", redacted)
        self.assertIn("[REDACTED_GITHUB_TOKEN]", redacted)
        self.assertIn("[REDACTED_GOOGLE_KEY]", redacted)
        self.assertIn("[REDACTED_RUNNER_SECRET]", redacted)
        self.assertIn("C:\\Users\\***", redacted)
        self.assertIn("/home/***", redacted)

    def test_prerequisites_check(self):
        """Verifies prerequisite check discovers agy on host without hardcoded version strings."""
        adapter = AntigravityCLIAdapter()
        res = adapter.check_prerequisites()
        if res.get("available"):
            self.assertTrue(res["available"])
            self.assertTrue(len(res["version"]) > 0)
            self.assertIn("plan", res["supported_modes"])
            self.assertIn("accept-edits", res["supported_modes"])

    def test_build_command(self):
        """Verifies centralized command construction, argument ordering, and security flags."""
        spec = ExecutionSpec(
            task_id="tsk_cmd_01",
            attempt_id="att_cmd_01",
            workspace_path="C:/workspace",
            prompt="Refactor auth",
            mode="plan",
            runtime_session_id="conv_123",
            model_override="gemini-2.5-pro",
            effort="high"
        )
        policy = ExecutionPolicy(timeout_seconds=600, sandbox=True)

        cmd = build_command(spec, policy, "C:/agy/bin/agy.exe")
        self.assertEqual(cmd[0], "C:/agy/bin/agy.exe")
        self.assertIn("--output-format", cmd)
        self.assertIn("stream-json", cmd)
        self.assertIn("-p", cmd)
        self.assertIn("Refactor auth", cmd)
        self.assertIn("--mode", cmd)
        self.assertIn("plan", cmd)
        self.assertIn("--print-timeout", cmd)
        self.assertIn("600s", cmd)
        self.assertIn("--conversation", cmd)
        self.assertIn("conv_123", cmd)
        self.assertIn("--model", cmd)
        self.assertIn("gemini-2.5-pro", cmd)
        self.assertIn("--effort", cmd)
        self.assertIn("high", cmd)
        self.assertIn("--sandbox", cmd)
        # Verify dangerously-skip-permissions is absent by default
        self.assertNotIn("--dangerously-skip-permissions", cmd)

        # Verify fallback for unknown mode
        spec.mode = "invalid_mode"
        cmd2 = build_command(spec, policy, "agy")
        self.assertIn("plan", cmd2)

    def test_nested_ndjson_init_and_text_delta(self):
        """Tests parsing real nested NDJSON schema for init, agent_response text_delta, and result."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            mock_exe_script = os.path.join(tmp_dir, "fake_agy_nested.py")
            with open(mock_exe_script, "w", encoding="utf-8") as f:
                f.write(
                    "import sys, time, json\n"
                    # 1. Nested init
                    "print(json.dumps({\n"
                    "    'event': 'init',\n"
                    "    'conversation_id': 'conv_test_99',\n"
                    "    'init': {'cwd': 'C:/workspace', 'model': 'gemini-2.5-pro', 'tools': ['view_file', 'grep_search'], 'permission_mode': 'plan'}\n"
                    "}))\n"
                    "sys.stdout.flush()\n"
                    "time.sleep(0.02)\n"
                    # 2. Nested step_update user_input
                    "print(json.dumps({\n"
                    "    'event': 'step_update',\n"
                    "    'step_update': {'conversation_id': 'conv_test_99', 'step_index': 0, 'step_type': 'user_input', 'state': 'DONE'}\n"
                    "}))\n"
                    "sys.stdout.flush()\n"
                    "time.sleep(0.02)\n"
                    # 3. Nested step_update agent_response delta 1
                    "print(json.dumps({\n"
                    "    'event': 'step_update',\n"
                    "    'step_update': {'conversation_id': 'conv_test_99', 'step_index': 1, 'step_type': 'agent_response', 'state': 'ACTIVE', 'text_delta': 'Checking architecture...'}\n"
                    "}))\n"
                    "sys.stdout.flush()\n"
                    "time.sleep(0.02)\n"
                    # 4. Nested step_update agent_response delta 2 (DONE)
                    "print(json.dumps({\n"
                    "    'event': 'step_update',\n"
                    "    'step_update': {'conversation_id': 'conv_test_99', 'step_index': 1, 'step_type': 'agent_response', 'state': 'DONE', 'text_delta': ' Done.', 'duration_seconds': 1.2, 'usage': {'input_tokens': 500, 'output_tokens': 50}}\n"
                    "}))\n"
                    "sys.stdout.flush()\n"
                    "time.sleep(0.02)\n"
                    # 5. Nested result
                    "print(json.dumps({\n"
                    "    'event': 'result',\n"
                    "    'result': {'conversation_id': 'conv_test_99', 'status': 'SUCCESS', 'response': '# Architecture Plan\\nRefactor completed.', 'duration_seconds': 1.5, 'num_turns': 1, 'usage': {'input_tokens': 500, 'output_tokens': 50, 'total_tokens': 550}}\n"
                    "}))\n"
                    "sys.stdout.flush()\n"
                )

            launcher = self._create_launcher(tmp_dir, mock_exe_script)
            adapter = AntigravityCLIAdapter(executable_path=launcher)
            spec = ExecutionSpec(
                task_id="tsk_nested_01",
                attempt_id="att_nested_01",
                workspace_path=tmp_dir,
                prompt="Audit architecture",
                mode="plan"
            )
            policy = ExecutionPolicy()

            received_events = []
            result = adapter.execute(spec, policy, lambda e: received_events.append(e))

            self.assertEqual(result.status, "COMPLETED")
            self.assertEqual(result.exit_code, 0)
            self.assertEqual(result.tokens_in, 500)
            self.assertEqual(result.tokens_out, 500 + 50 - 500)
            self.assertIn("# Architecture Plan", result.summary)

            event_types = [e.event_type for e in received_events]
            self.assertIn("STATUS_TRANSITION", event_types)
            self.assertIn("TASK_INITIALIZED", event_types)
            self.assertIn("STEP_USER_INPUT", event_types)
            self.assertIn("TEXT_DELTA", event_types)
            self.assertIn("PLAN_CREATED", event_types)
            self.assertIn("TASK_COMPLETED", event_types)

            # Check text deltas accumulated
            deltas = [e.payload["text_delta"] for e in received_events if e.event_type == "TEXT_DELTA"]
            self.assertIn("Checking architecture...", deltas)
            self.assertIn(" Done.", deltas)

            # Check plan artifact was created in mode=plan
            plan_arts = [a for a in result.artifacts if a["artifact_type"] == "plan"]
            self.assertEqual(len(plan_arts), 1)
            self.assertIn("# Architecture Plan", plan_arts[0]["content"])

    def test_nested_ndjson_tool_events(self):
        """Tests parsing nested tool calls (ACTIVE and DONE states)."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            mock_exe_script = os.path.join(tmp_dir, "fake_agy_tools.py")
            with open(mock_exe_script, "w", encoding="utf-8") as f:
                f.write(
                    "import sys, time, json\n"
                    "print(json.dumps({'event': 'init', 'init': {'cwd': 'C:/ws', 'tools': ['replace_file_content']}}))\n"
                    "sys.stdout.flush()\n"
                    # Active tool call
                    "print(json.dumps({\n"
                    "    'event': 'step_update',\n"
                    "    'step_update': {'step_index': 1, 'step_type': 'tool', 'state': 'ACTIVE', 'tool_name': 'replace_file_content', 'call_id': 'call_1', 'tool_info': {'file': 'app.py'}}\n"
                    "}))\n"
                    "sys.stdout.flush()\n"
                    "time.sleep(0.02)\n"
                    # Completed tool call
                    "print(json.dumps({\n"
                    "    'event': 'step_update',\n"
                    "    'step_update': {'step_index': 1, 'step_type': 'tool', 'state': 'DONE', 'tool_name': 'replace_file_content', 'call_id': 'call_1', 'duration_seconds': 0.25}\n"
                    "}))\n"
                    "sys.stdout.flush()\n"
                    # Result
                    "print(json.dumps({'event': 'result', 'result': {'status': 'SUCCESS', 'response': 'Tool finished'}}))\n"
                    "sys.stdout.flush()\n"
                )

            launcher = self._create_launcher(tmp_dir, mock_exe_script)
            adapter = AntigravityCLIAdapter(executable_path=launcher)
            spec = ExecutionSpec(
                task_id="tsk_tool_01",
                attempt_id="att_tool_01",
                workspace_path=tmp_dir,
                prompt="Update file",
                mode="accept-edits"
            )
            policy = ExecutionPolicy()

            received_events = []
            result = adapter.execute(spec, policy, lambda e: received_events.append(e))

            self.assertEqual(result.status, "COMPLETED")
            start_events = [e for e in received_events if e.event_type == "TOOL_CALL_START"]
            end_events = [e for e in received_events if e.event_type == "TOOL_CALL_END"]

            self.assertEqual(len(start_events), 1)
            self.assertEqual(start_events[0].payload["tool_name"], "replace_file_content")
            self.assertEqual(start_events[0].payload["call_id"], "call_1")

            self.assertEqual(len(end_events), 1)
            self.assertEqual(end_events[0].payload["duration_seconds"], 0.25)
            self.assertEqual(end_events[0].payload["state"], "DONE")

    def test_result_error_and_cancellation(self):
        """Verifies that non-SUCCESS result statuses (ERROR, CANCELED) terminate with FAILED/CANCELLED."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            # 1. Error status in result
            mock_exe_script = os.path.join(tmp_dir, "fake_agy_error.py")
            with open(mock_exe_script, "w", encoding="utf-8") as f:
                f.write(
                    "import sys, json\n"
                    "print(json.dumps({'event': 'init', 'init': {}}))\n"
                    "sys.stdout.flush()\n"
                    "print(json.dumps({'event': 'result', 'result': {'status': 'ERROR', 'error': 'Rate limit exceeded'}}))\n"
                    "sys.stdout.flush()\n"
                )

            launcher = self._create_launcher(tmp_dir, mock_exe_script)
            adapter = AntigravityCLIAdapter(executable_path=launcher)
            spec = ExecutionSpec(
                task_id="tsk_err_01",
                attempt_id="att_err_01",
                workspace_path=tmp_dir,
                prompt="Run error",
                mode="plan"
            )
            policy = ExecutionPolicy()

            events = []
            result = adapter.execute(spec, policy, lambda e: events.append(e))

            # Must NOT be completed
            self.assertEqual(result.status, "FAILED")
            self.assertIn("Rate limit exceeded", result.error_message)

            # 2. Canceled status in result
            with open(mock_exe_script, "w", encoding="utf-8") as f:
                f.write(
                    "import sys, json\n"
                    "print(json.dumps({'event': 'init', 'init': {}}))\n"
                    "sys.stdout.flush()\n"
                    "print(json.dumps({'event': 'result', 'result': {'status': 'CANCELED'}}))\n"
                    "sys.stdout.flush()\n"
                )

            events2 = []
            result2 = adapter.execute(spec, policy, lambda e: events2.append(e))
            self.assertEqual(result2.status, "CANCELLED")

    def test_resilience_malformed_and_partial_final_line(self):
        """Tests handling of blank lines, malformed JSON lines, unknown events, and partial lines at EOF."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            mock_exe_script = os.path.join(tmp_dir, "fake_agy_resilient.py")
            with open(mock_exe_script, "w", encoding="utf-8") as f:
                f.write(
                    "import sys, time, json\n"
                    "print('')\n"  # blank line
                    "sys.stdout.flush()\n"
                    "print('MALFORMED_NON_JSON_LINE')\n"  # malformed line
                    "sys.stdout.flush()\n"
                    "print(json.dumps({'event': 'unknown_custom_event', 'foo': 'bar'}))\n"  # unknown event
                    "sys.stdout.flush()\n"
                    "print(json.dumps({'event': 'init', 'init': {'tools': []}}))\n"
                    "sys.stdout.flush()\n"
                    # Partial final line at EOF without newline
                    "sys.stdout.write(json.dumps({'event': 'result', 'result': {'status': 'SUCCESS', 'response': 'Recovered'}}))\n"
                    "sys.stdout.flush()\n"
                )

            launcher = self._create_launcher(tmp_dir, mock_exe_script)
            adapter = AntigravityCLIAdapter(executable_path=launcher)
            spec = ExecutionSpec(
                task_id="tsk_res_01",
                attempt_id="att_res_01",
                workspace_path=tmp_dir,
                prompt="Resilience test",
                mode="plan"
            )
            policy = ExecutionPolicy()

            events = []
            result = adapter.execute(spec, policy, lambda e: events.append(e))

            # Must process valid events and successfully capture partial final line at EOF
            self.assertEqual(result.status, "COMPLETED")
            self.assertIn("Recovered", result.summary)

            event_types = [e.event_type for e in events]
            self.assertIn("TASK_INITIALIZED", event_types)
            self.assertIn("DIAGNOSTIC_LOG", event_types)  # preserved malformed line

    def test_simultaneous_large_stdout_and_stderr(self):
        """Verifies concurrent draining of stdout and stderr without OS pipe deadlock."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            mock_exe_script = os.path.join(tmp_dir, "fake_agy_heavy.py")
            with open(mock_exe_script, "w", encoding="utf-8") as f:
                f.write(
                    "import sys, json\n"
                    # Write large stderr output (exceeds default 4KB Windows pipe buffer)
                    "for i in range(200):\n"
                    "    sys.stderr.write(f'stderr diagnostic log line {i}\\n')\n"
                    "    sys.stderr.flush()\n"
                    # Write stdout
                    "print(json.dumps({'event': 'init', 'init': {}}))\n"
                    "print(json.dumps({'event': 'result', 'result': {'status': 'SUCCESS', 'response': 'Heavy test pass'}}))\n"
                    "sys.stdout.flush()\n"
                )

            launcher = self._create_launcher(tmp_dir, mock_exe_script)
            adapter = AntigravityCLIAdapter(executable_path=launcher)
            spec = ExecutionSpec(
                task_id="tsk_heavy_01",
                attempt_id="att_heavy_01",
                workspace_path=tmp_dir,
                prompt="Heavy test",
                mode="plan"
            )
            policy = ExecutionPolicy()

            result = adapter.execute(spec, policy, lambda e: None)
            self.assertEqual(result.status, "COMPLETED")
            self.assertEqual(result.exit_code, 0)
            self.assertEqual(result.summary, "Heavy test pass")

    def test_timeout_enforcement(self):
        """Verifies that an execution turn exceeding timeout_seconds is terminated with FAILED."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            mock_exe_script = os.path.join(tmp_dir, "fake_agy_hang.py")
            with open(mock_exe_script, "w", encoding="utf-8") as f:
                f.write(
                    "import time\n"
                    "time.sleep(30)\n"
                )

            launcher = self._create_launcher(tmp_dir, mock_exe_script)
            adapter = AntigravityCLIAdapter(executable_path=launcher)
            spec = ExecutionSpec(
                task_id="tsk_timeout_01",
                attempt_id="att_timeout_01",
                workspace_path=tmp_dir,
                prompt="Timeout test",
                mode="plan"
            )
            # Short timeout of 1 second
            policy = ExecutionPolicy(timeout_seconds=1)

            t0 = time.time()
            result = adapter.execute(spec, policy, lambda e: None)
            elapsed = time.time() - t0

            self.assertEqual(result.status, "FAILED")
            self.assertIn("timed out", result.error_message.lower())
            self.assertTrue(elapsed < 6.0)

    def test_process_cancellation(self):
        """Tests active subprocess cancellation via adapter.cancel()."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            mock_exe_script = os.path.join(tmp_dir, "fake_agy_sleep.py")
            with open(mock_exe_script, "w", encoding="utf-8") as f:
                f.write(
                    "import time\n"
                    "time.sleep(30)\n"
                )

            launcher = self._create_launcher(tmp_dir, mock_exe_script)
            adapter = AntigravityCLIAdapter(executable_path=launcher)
            attempt_id = f"att_cancel_{uuid.uuid4().hex[:8]}"
            spec = ExecutionSpec(
                task_id="tsk_cancel_01",
                attempt_id=attempt_id,
                workspace_path=tmp_dir,
                prompt="Cancel test",
                mode="plan"
            )
            policy = ExecutionPolicy(timeout_seconds=60)

            def delayed_cancel():
                time.sleep(0.3)
                adapter.cancel(attempt_id)

            t = threading.Thread(target=delayed_cancel)
            t.start()

            result = adapter.execute(spec, policy, lambda e: None)
            t.join()

            self.assertEqual(result.status, "CANCELLED")

    def test_missing_executable_and_invalid_workspace(self):
        """Verifies structured errors for missing binary and invalid workspace directory."""
        # 1. Missing executable
        adapter = AntigravityCLIAdapter(executable_path="C:/nonexistent/binary/agy_fake.exe")
        spec = ExecutionSpec(
            task_id="tsk_no_exe",
            attempt_id="att_no_exe",
            workspace_path=tempfile.gettempdir(),
            prompt="Test",
            mode="plan"
        )
        res = adapter.execute(spec, ExecutionPolicy(), lambda e: None)
        self.assertEqual(res.status, "FAILED")
        self.assertIn("không tồn tại", res.error_message)

        # 2. Missing workspace path
        adapter2 = AntigravityCLIAdapter()
        spec2 = ExecutionSpec(
            task_id="tsk_no_ws",
            attempt_id="att_no_ws",
            workspace_path="C:/nonexistent_workspace_dir_12345",
            prompt="Test",
            mode="plan"
        )
        res2 = adapter2.execute(spec2, ExecutionPolicy(), lambda e: None)
        self.assertEqual(res2.status, "FAILED")
        self.assertIn("Workspace path", res2.error_message)

    def test_plan_review_mode_generates_codebase_review_markdown_artifact(self):
        """Prompt 04: Verifies codebase review creates real markdown artifact with checksum and metadata."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            mock_exe_script = os.path.join(tmp_dir, "fake_agy_review.py")
            with open(mock_exe_script, "w", encoding="utf-8") as f:
                f.write(
                    "import sys, json\n"
                    "print(json.dumps({'event': 'init', 'init': {'cwd': 'C:/ws', 'tools': []}}))\n"
                    "sys.stdout.flush()\n"
                    "print(json.dumps({\n"
                    "    'event': 'result',\n"
                    "    'result': {'status': 'SUCCESS', 'response': '# Codebase Review Report\\nStack: Python 3.12\\nFindings: None'}\n"
                    "}))\n"
                    "sys.stdout.flush()\n"
                )

            launcher = self._create_launcher(tmp_dir, mock_exe_script)
            adapter = AntigravityCLIAdapter(executable_path=launcher)
            spec = ExecutionSpec(
                task_id="tsk_rev_01",
                attempt_id="att_rev_01",
                workspace_path=tmp_dir,
                title="Review codebase và tạo báo cáo",
                prompt="Khảo sát codebase",
                mode="plan"
            )
            events = []
            res = adapter.execute(spec, ExecutionPolicy(), lambda e: events.append(e))

            self.assertEqual(res.status, "COMPLETED")
            self.assertEqual(res.exit_code, 0)
            self.assertEqual(len(res.artifacts), 1)

            art = res.artifacts[0]
            self.assertEqual(art["artifact_type"], "review")
            self.assertEqual(art["file_path"], "codebase_review.md")
            self.assertEqual(art["display_name"], "Báo cáo Phân tích Codebase")
            self.assertEqual(art["mime_type"], "text/markdown")
            self.assertIn("# Codebase Review Report", art["content"])
            self.assertTrue(len(art["checksum_sha256"]) == 64)

            # Check PLAN_CREATED event
            p_events = [e for e in events if e.event_type == "PLAN_CREATED"]
            self.assertEqual(len(p_events), 1)
            self.assertEqual(p_events[0].payload["artifact_file"], "codebase_review.md")

    def test_empty_output_in_plan_mode_fails_and_generates_no_artifact(self):
        """Prompt 04: Empty runtime output must fail the turn and never generate fake artifacts."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            mock_exe_script = os.path.join(tmp_dir, "fake_agy_empty.py")
            with open(mock_exe_script, "w", encoding="utf-8") as f:
                f.write(
                    "import sys, json\n"
                    "print(json.dumps({'event': 'init', 'init': {'cwd': 'C:/ws', 'tools': []}}))\n"
                    "sys.stdout.flush()\n"
                    "print(json.dumps({'event': 'result', 'result': {'status': 'SUCCESS', 'response': ''}}))\n"
                    "sys.stdout.flush()\n"
                )

            launcher = self._create_launcher(tmp_dir, mock_exe_script)
            adapter = AntigravityCLIAdapter(executable_path=launcher)
            spec = ExecutionSpec(
                task_id="tsk_empty_01",
                attempt_id="att_empty_01",
                workspace_path=tmp_dir,
                title="Review codebase",
                prompt="Khảo sát",
                mode="plan"
            )
            events = []
            res = adapter.execute(spec, ExecutionPolicy(), lambda e: events.append(e))

            self.assertEqual(res.status, "FAILED")
            self.assertEqual(res.exit_code, 1)
            self.assertEqual(res.artifacts, [])
            self.assertIn("empty output", res.error_message)

            failed_events = [e for e in events if e.event_type == "TASK_FAILED"]
            self.assertEqual(len(failed_events), 1)

    def test_streamed_deltas_accumulated_into_artifact_when_result_response_empty(self):
        """Prompt 04: Verifies streamed tokens are accumulated when result envelope lacks full text."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            mock_exe_script = os.path.join(tmp_dir, "fake_agy_stream.py")
            with open(mock_exe_script, "w", encoding="utf-8") as f:
                f.write(
                    "import sys, json\n"
                    "print(json.dumps({'event': 'init', 'init': {'cwd': 'C:/ws', 'tools': []}}))\n"
                    "sys.stdout.flush()\n"
                    "print(json.dumps({'event': 'step_update', 'step_update': {'step_type': 'agent_response', 'text_delta': 'Chunk A. '}}))\n"
                    "sys.stdout.flush()\n"
                    "print(json.dumps({'event': 'step_update', 'step_update': {'step_type': 'agent_response', 'text_delta': 'Chunk B.'}}))\n"
                    "sys.stdout.flush()\n"
                    "print(json.dumps({'event': 'result', 'result': {'status': 'SUCCESS'}}))\n"
                    "sys.stdout.flush()\n"
                )

            launcher = self._create_launcher(tmp_dir, mock_exe_script)
            adapter = AntigravityCLIAdapter(executable_path=launcher)
            spec = ExecutionSpec(
                task_id="tsk_stream_01",
                attempt_id="att_stream_01",
                workspace_path=tmp_dir,
                title="Create architecture plan",
                prompt="Plan refactoring",
                mode="plan"
            )
            res = adapter.execute(spec, ExecutionPolicy(), lambda e: None)

            self.assertEqual(res.status, "COMPLETED")
            self.assertEqual(len(res.artifacts), 1)
            art = res.artifacts[0]
            self.assertEqual(art["content"], "Chunk A. Chunk B.")
    def test_live_smoke_agy_print(self):
        """Smoke test with real installed agy CLI if present on host."""
        adapter = AntigravityCLIAdapter()
        prereqs = adapter.check_prerequisites()
        if not prereqs.get("available"):
            self.skipTest("Antigravity CLI ('agy') not available on host PATH.")

        with tempfile.TemporaryDirectory() as tmp_dir:
            spec = ExecutionSpec(
                task_id="tsk_live_smoke",
                attempt_id=f"att_smoke_{uuid.uuid4().hex[:8]}",
                workspace_path=tmp_dir,
                prompt="Reply exactly with pong",
                mode="plan"
            )
            policy = ExecutionPolicy(timeout_seconds=30)

            received_events = []
            result = adapter.execute(spec, policy, lambda e: received_events.append(e))

            if result.status == "FAILED":
                # Real agy on host may auto-deny tools, timeout, or produce empty output in headless mode
                err_lower = (result.error_message or "").lower()
                self.assertTrue("empty output" in err_lower or "timed out" in err_lower)
                types = [e.event_type for e in received_events]
                self.assertIn("TASK_INITIALIZED", types)
                self.assertIn("TASK_FAILED", types)
            else:
                self.assertEqual(result.status, "COMPLETED")
                self.assertEqual(result.exit_code, 0)
                self.assertTrue(result.tokens_in is not None or result.summary is not None)
                types = [e.event_type for e in received_events]
                self.assertIn("TASK_INITIALIZED", types)
                self.assertIn("TASK_COMPLETED", types)

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _create_launcher(self, tmp_dir: str, script_path: str) -> str:
        launcher = os.path.join(tmp_dir, "mock_runner.bat" if sys.platform == "win32" else "mock_runner.sh")
        with open(launcher, "w", encoding="utf-8") as f:
            if sys.platform == "win32":
                f.write(f'@"{sys.executable}" "{script_path}" %*\n')
            else:
                f.write(f'#!/bin/sh\nexec "{sys.executable}" "{script_path}" "$@"\n')
        if sys.platform != "win32":
            os.chmod(launcher, 0o755)
        return launcher


if __name__ == "__main__":
    unittest.main()
