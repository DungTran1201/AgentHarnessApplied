import os
import sys
import json
import time
import uuid
import tempfile
import unittest
from pathlib import Path

# Add ai-runner root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from adapters.base import ExecutionSpec, ExecutionPolicy, NormalizedEvent, ExecutionResult
from adapters.antigravity import AntigravityCLIAdapter, redact_sensitive_text


class TestAntigravityAdapterUnit(unittest.TestCase):

    def test_sensitive_text_redaction(self):
        sample = (
            "Calling API with sk-abc123456789012345678901234567890 and "
            "token Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret and "
            "Google key AIzaSyA1234567890123456789012345678901 and "
            "GitHub token ghp_123456789012345678901234567890123456"
        )
        redacted = redact_sensitive_text(sample)
        self.assertNotIn("sk-abc123456789012345678901234567890", redacted)
        self.assertNotIn("ghp_123456789012345678901234567890123456", redacted)
        self.assertNotIn("AIzaSyA1234567890123456789012345678901", redacted)
        self.assertIn("[REDACTED_API_KEY]", redacted)
        self.assertIn("[REDACTED_GITHUB_TOKEN]", redacted)
        self.assertIn("[REDACTED_GOOGLE_KEY]", redacted)

    def test_prerequisites_check(self):
        adapter = AntigravityCLIAdapter()
        res = adapter.check_prerequisites()
        # On this workstation, agy is installed (verified 1.2.16)
        if res.get("available"):
            self.assertTrue(res["available"])
            self.assertIn("1.2.16", res["version"])
            self.assertIn("plan", res["supported_modes"])

    def test_mock_executable_ndjson_stream_parsing(self):
        """Tests adapter against a Python mock executable emitting real Antigravity NDJSON events."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            mock_exe_script = os.path.join(tmp_dir, "fake_agy.py")
            with open(mock_exe_script, "w", encoding="utf-8") as f:
                f.write(
                    "import sys, time, json\n"
                    "print(json.dumps({'event': 'init', 'cwd': 'C:/workspace', 'model': 'gemini-2.5-pro', 'tools': ['view_file']}))\n"
                    "sys.stdout.flush()\n"
                    "time.sleep(0.05)\n"
                    "print(json.dumps({'event': 'step_update', 'type': 'agent_response', 'text_delta': 'Analyzing repository...'}))\n"
                    "sys.stdout.flush()\n"
                    "time.sleep(0.05)\n"
                    "print(json.dumps({'event': 'step_update', 'type': 'tool', 'state': 'ACTIVE', 'tool_name': 'view_file'}))\n"
                    "sys.stdout.flush()\n"
                    "time.sleep(0.05)\n"
                    "print(json.dumps({'event': 'step_update', 'type': 'tool', 'state': 'DONE', 'tool_name': 'view_file', 'duration_seconds': 0.12}))\n"
                    "sys.stdout.flush()\n"
                    "time.sleep(0.05)\n"
                    "print('MALFORMED_LINE_HERE_NOT_JSON')\n"
                    "sys.stdout.flush()\n"
                    "time.sleep(0.05)\n"
                    "print(json.dumps({'event': 'result', 'status': 'SUCCESS', 'summary': 'Plan created', 'usage': {'input_tokens': 1200, 'output_tokens': 300}}))\n"
                    "sys.stdout.flush()\n"
                )

            # Wrapper launcher to run python fake_agy.py
            launcher = os.path.join(tmp_dir, "run_mock.bat" if sys.platform == "win32" else "run_mock.sh")
            with open(launcher, "w", encoding="utf-8") as f:
                if sys.platform == "win32":
                    f.write(f'@"{sys.executable}" "{mock_exe_script}" %*\n')
                else:
                    f.write(f'#!/bin/sh\nexec "{sys.executable}" "{mock_exe_script}" "$@"\n')
            if sys.platform != "win32":
                os.chmod(launcher, 0o755)

            adapter = AntigravityCLIAdapter(executable_path=launcher)
            spec = ExecutionSpec(
                task_id="tsk_mock_01",
                attempt_id="att_mock_01",
                workspace_path=tmp_dir,
                prompt="Analyze code",
                mode="plan"
            )
            policy = ExecutionPolicy()

            received_events = []
            def on_event(evt: NormalizedEvent):
                received_events.append(evt)

            result = adapter.execute(spec, policy, on_event)

            self.assertEqual(result.status, "COMPLETED")
            self.assertEqual(result.exit_code, 0)
            self.assertEqual(result.tokens_in, 1200)
            self.assertEqual(result.tokens_out, 300)
            self.assertIn("Plan created", result.summary)

            event_types = [e.event_type for e in received_events]
            self.assertIn("STATUS_TRANSITION", event_types)
            self.assertIn("TASK_INITIALIZED", event_types)
            self.assertIn("TEXT_DELTA", event_types)
            self.assertIn("TOOL_CALL_START", event_types)
            self.assertIn("TOOL_CALL_END", event_types)
            self.assertIn("DIAGNOSTIC_LOG", event_types)  # Malformed line handled gracefully
            self.assertIn("TOKEN_USAGE", event_types)
            self.assertIn("TASK_COMPLETED", event_types)

    def test_mock_executable_nonzero_exit_code(self):
        """Tests adapter handling of non-zero exit code with stderr diagnostics."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            mock_exe_script = os.path.join(tmp_dir, "fail_agy.py")
            with open(mock_exe_script, "w", encoding="utf-8") as f:
                f.write(
                    "import sys\n"
                    "sys.stderr.write('Fatal: Model context exceeded limit\\n')\n"
                    "sys.exit(2)\n"
                )

            launcher = os.path.join(tmp_dir, "run_fail.bat" if sys.platform == "win32" else "run_fail.sh")
            with open(launcher, "w", encoding="utf-8") as f:
                if sys.platform == "win32":
                    f.write(f'@"{sys.executable}" "{mock_exe_script}" %*\n')
                else:
                    f.write(f'#!/bin/sh\nexec "{sys.executable}" "{mock_exe_script}" "$@"\n')
            if sys.platform != "win32":
                os.chmod(launcher, 0o755)

            adapter = AntigravityCLIAdapter(executable_path=launcher)
            spec = ExecutionSpec(
                task_id="tsk_fail_01",
                attempt_id="att_fail_01",
                workspace_path=tmp_dir,
                prompt="Do something that fails",
                mode="plan"
            )
            policy = ExecutionPolicy()

            received_events = []
            result = adapter.execute(spec, policy, lambda e: received_events.append(e))

            self.assertEqual(result.status, "FAILED")
            self.assertEqual(result.exit_code, 2)
            self.assertIn("Fatal: Model context exceeded limit", result.error_message)

    def test_process_cancellation(self):
        """Tests process cancellation killing long-running execution."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            mock_exe_script = os.path.join(tmp_dir, "sleep_agy.py")
            with open(mock_exe_script, "w", encoding="utf-8") as f:
                f.write(
                    "import time\n"
                    "time.sleep(30)\n"
                )

            launcher = os.path.join(tmp_dir, "run_sleep.bat" if sys.platform == "win32" else "run_sleep.sh")
            with open(launcher, "w", encoding="utf-8") as f:
                if sys.platform == "win32":
                    f.write(f'@"{sys.executable}" "{mock_exe_script}" %*\n')
                else:
                    f.write(f'#!/bin/sh\nexec "{sys.executable}" "{mock_exe_script}" "$@"\n')
            if sys.platform != "win32":
                os.chmod(launcher, 0o755)

            adapter = AntigravityCLIAdapter(executable_path=launcher)
            attempt_id = f"att_cancel_{uuid.uuid4().hex[:8]}"
            spec = ExecutionSpec(
                task_id="tsk_cancel_01",
                attempt_id=attempt_id,
                workspace_path=tmp_dir,
                prompt="Sleep turn",
                mode="plan"
            )
            policy = ExecutionPolicy(timeout_seconds=60)

            # Trigger cancel after 0.5 second in background thread
            import threading
            def delayed_cancel():
                time.sleep(0.5)
                adapter.cancel(attempt_id)

            t = threading.Thread(target=delayed_cancel)
            t.start()

            result = adapter.execute(spec, policy, lambda e: None)
            t.join()

            self.assertEqual(result.status, "CANCELLED")


if __name__ == "__main__":
    unittest.main()
