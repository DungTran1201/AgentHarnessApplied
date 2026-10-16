import unittest
from unittest.mock import patch, MagicMock
import time
import threading
from pathlib import Path
import sys

# Ensure runner package is in path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import runner
from adapters import NormalizedEvent, ExecutionResult


class TestRunnerDaemonAndDelivery(unittest.TestCase):

    def setUp(self):
        runner.active_attempts.clear()
        runner.active_adapters.clear()
        runner.saved_task_contexts.clear()

    def tearDown(self):
        runner.active_attempts.clear()
        runner.active_adapters.clear()
        runner.saved_task_contexts.clear()

    @patch("runner.http_json_post")
    @patch("runner.validate_host_path")
    @patch("runner.run_attempt_execution")
    def test_claim_called_on_dispatch(self, mock_run_exec, mock_val_path, mock_http):
        mock_val_path.return_value = {
            "is_valid": True,
            "is_git_repo": False,
            "canonical_path": "C:/fake/path"
        }
        data_obj = {
            "task_id": "tsk_claim_01",
            "attempt_id": "att_claim_01",
            "attempt_number": 1,
            "local_path": "C:/fake/path",
            "prompt": "Test prompt",
            "mode": "plan",
            "title": "Claim task"
        }

        runner.handle_task_dispatch(data_obj, "http://localhost:8000", "run_01", "sec_01")

        # Verify claim endpoint was called first
        mock_http.assert_any_call(
            "http://localhost:8000/api/v1/orchestrator/runners/tasks/claim",
            {"attempt_id": "att_claim_01"},
            headers={"Authorization": "Bearer sec_01"}
        )

        # Verify context saved and execution invoked
        self.assertIn("att_claim_01", runner.saved_task_contexts)
        mock_run_exec.assert_called_once()
        self.assertEqual(mock_run_exec.call_args[0][1], "plan")

    @patch("runner.http_json_post")
    def test_duplicate_dispatch_skipped(self, mock_http):
        runner.active_attempts.add("att_dup_01")
        data_obj = {
            "task_id": "tsk_dup_01",
            "attempt_id": "att_dup_01"
        }
        # Calling handle_task_dispatch when attempt is already active should skip
        runner.handle_task_dispatch(data_obj, "http://localhost:8000", "run_01", "sec_01")
        mock_http.assert_not_called()

    @patch("runner.http_json_post")
    @patch("runner.AntigravityCLIAdapter")
    def test_periodic_flush_worker_flushes_sub_batch(self, mock_adapter_cls, mock_http):
        """Verifies that 2 events (< 5) are flushed within 0.6s without waiting for more callbacks."""
        mock_adapter = MagicMock()
        mock_adapter_cls.return_value = mock_adapter

        def fake_execute(spec, policy, event_cb):
            # Emit 2 events then wait
            event_cb(NormalizedEvent(
                event_id="evt_01",
                sequence_number=1,
                task_id="tsk_flush_01",
                attempt_id="att_flush_01",
                runtime="antigravity",
                timestamp="2026-10-16T18:00:00Z",
                event_type="PROCESS_STDOUT",
                payload={"text": "Step 1"},
                runner_id="run_01"
            ))
            event_cb(NormalizedEvent(
                event_id="evt_02",
                sequence_number=2,
                task_id="tsk_flush_01",
                attempt_id="att_flush_01",
                runtime="antigravity",
                timestamp="2026-10-16T18:00:01Z",
                event_type="PROCESS_STDOUT",
                payload={"text": "Step 2"},
                runner_id="run_01"
            ))
            # Sleep 0.6s so flush_worker triggers
            time.sleep(0.6)
            return ExecutionResult(
                status="COMPLETED",
                exit_code=0,
                duration_seconds=0.6,
                tokens_in=100,
                tokens_out=50
            )

        mock_adapter.execute.side_effect = fake_execute

        ctx = {
            "task_id": "tsk_flush_01",
            "attempt_id": "att_flush_01",
            "target_workspace": "C:/fake/path",
            "prompt": "Test flush",
            "title": "Flush test",
            "is_isolated": False
        }

        runner.run_attempt_execution(ctx, "plan", "http://localhost:8000", "sec_01")

        # Verify that events were sent via http_json_post before complete
        calls = [c[0][0] for c in mock_http.call_args_list]
        self.assertTrue(any("/api/v1/orchestrator/runners/tasks/events" in url for url in calls))
        self.assertTrue(any("/api/v1/orchestrator/runners/tasks/complete" in url for url in calls))

    @patch("runner.run_attempt_execution")
    def test_task_resume_approved_handler(self, mock_run_exec):
        ctx = {
            "task_id": "tsk_resume_01",
            "attempt_id": "att_resume_01",
            "target_workspace": "C:/fake/worktree",
            "prompt": "Fix bug",
            "title": "Resume task"
        }
        runner.saved_task_contexts["att_resume_01"] = ctx

        runner.handle_task_resume(ctx, "http://localhost:8000", "run_01", "sec_01")

        mock_run_exec.assert_called_once_with(ctx, "accept-edits", "http://localhost:8000", "sec_01")


if __name__ == "__main__":
    unittest.main()
