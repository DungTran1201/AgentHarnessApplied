import pytest
import uuid
import hashlib
from fastapi.testclient import TestClient

from src.main import app
from src.db import execute_commit, query_one, query_all

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_test_orchestrator_data():
    """Wipes test entities before and after each test."""
    execute_commit("DELETE FROM task_verification_reports")
    execute_commit("DELETE FROM task_events")
    execute_commit("DELETE FROM task_artifacts")
    execute_commit("DELETE FROM task_approvals")
    execute_commit("DELETE FROM task_attempts")
    execute_commit("DELETE FROM development_tasks")
    execute_commit("DELETE FROM workspace_validations")
    execute_commit("DELETE FROM development_workspaces")
    execute_commit("DELETE FROM runner_pairing_tokens")
    execute_commit("DELETE FROM agent_runners")
    yield
    execute_commit("DELETE FROM task_verification_reports")
    execute_commit("DELETE FROM task_events")
    execute_commit("DELETE FROM task_artifacts")
    execute_commit("DELETE FROM task_approvals")
    execute_commit("DELETE FROM task_attempts")
    execute_commit("DELETE FROM development_tasks")
    execute_commit("DELETE FROM workspace_validations")
    execute_commit("DELETE FROM development_workspaces")
    execute_commit("DELETE FROM runner_pairing_tokens")
    execute_commit("DELETE FROM agent_runners")


def setup_runner_and_workspace():
    """Helper to set up an active paired runner and valid workspace."""
    # 1. Create runner
    raw_secret = f"rsk_{uuid.uuid4().hex}"
    secret_hash = hashlib.sha256(raw_secret.encode("utf-8")).hexdigest()
    runner_id = f"run_{uuid.uuid4().hex[:16]}"
    execute_commit(
        """
        INSERT INTO agent_runners (id, user_id, name, machine_name, platform, architecture, status, secret_hash, capabilities, last_heartbeat_at)
        VALUES (?, 'guest_user', 'DevRunner', 'DevWorkstation', 'windows', 'x86_64', 'ONLINE', ?, '{"antigravity": true}', CURRENT_TIMESTAMP)
        """,
        (runner_id, secret_hash)
    )

    # 2. Create project
    project_id = f"prj_{uuid.uuid4().hex[:16]}"
    execute_commit(
        "INSERT OR IGNORE INTO projects (id, user_id, name) VALUES (?, 'guest_user', 'Core Project')",
        (project_id,)
    )

    # 3. Create workspace
    workspace_id = f"ws_{uuid.uuid4().hex[:16]}"
    execute_commit(
        """
        INSERT INTO development_workspaces (id, user_id, runner_id, name, local_path, status)
        VALUES (?, 'guest_user', ?, 'Local Repo', 'C:\\Users\\PC\\Project\\ai-chan', 'READY')
        """,
        (workspace_id, runner_id)
    )

    return {
        "runner_id": runner_id,
        "runner_secret": raw_secret,
        "project_id": project_id,
        "workspace_id": workspace_id
    }


class TestDevelopmentTaskAPI:

    def test_task_creation_and_idempotency(self):
        env = setup_runner_and_workspace()
        idem_key = f"idem_{uuid.uuid4().hex}"

        payload = {
            "project_id": env["project_id"],
            "workspace_id": env["workspace_id"],
            "title": "Refactor auth token expiration",
            "prompt": "Inspect auth.py and change expire to 24h",
            "runtime": "antigravity",
            "mode": "plan"
        }

        # First request
        res1 = client.post(
            "/api/v1/orchestrator/tasks",
            json=payload,
            headers={"Idempotency-Key": idem_key}
        )
        assert res1.status_code == 201
        data1 = res1.json()
        assert data1["id"].startswith("tsk_")
        assert data1["status"] == "DRAFT"
        assert data1["title"] == payload["title"]

        # Duplicate submission with same Idempotency-Key
        res2 = client.post(
            "/api/v1/orchestrator/tasks",
            json=payload,
            headers={"Idempotency-Key": idem_key}
        )
        assert res2.status_code == 201 or res2.status_code == 200
        data2 = res2.json()
        assert data2["id"] == data1["id"]

    def test_task_dispatch_lifecycle(self):
        env = setup_runner_and_workspace()

        # Create task
        res = client.post(
            "/api/v1/orchestrator/tasks",
            json={
                "project_id": env["project_id"],
                "workspace_id": env["workspace_id"],
                "title": "Update README docs",
                "prompt": "Add architecture overview to README.md",
                "mode": "plan"
            }
        )
        assert res.status_code == 201
        task_id = res.json()["id"]

        # Dispatch task
        dispatch_res = client.post(f"/api/v1/orchestrator/tasks/{task_id}/dispatch")
        assert dispatch_res.status_code == 200
        disp_data = dispatch_res.json()
        assert disp_data["status"] == "QUEUED"
        assert disp_data["attempt_id"].startswith("att_")
        assert disp_data["attempt_number"] == 1

        # Check task state in database
        task_detail = client.get(f"/api/v1/orchestrator/tasks/{task_id}").json()
        assert task_detail["status"] == "QUEUED"
        assert task_detail["current_attempt"] is not None
        assert task_detail["current_attempt"]["runner_id"] == env["runner_id"]

        # Re-dispatch conflict
        redispatch_res = client.post(f"/api/v1/orchestrator/tasks/{task_id}/dispatch")
        assert redispatch_res.status_code == 409

    def test_task_cancellation(self):
        env = setup_runner_and_workspace()

        res = client.post(
            "/api/v1/orchestrator/tasks",
            json={
                "project_id": env["project_id"],
                "workspace_id": env["workspace_id"],
                "title": "Task to cancel",
                "prompt": "Work on something long",
                "mode": "plan"
            }
        )
        task_id = res.json()["id"]

        # Cancel DRAFT task directly
        cancel_res = client.post(
            f"/api/v1/orchestrator/tasks/{task_id}/cancel",
            json={"reason": "No longer needed"}
        )
        assert cancel_res.status_code == 202
        assert cancel_res.json()["status"] == "CANCELLED"

    def test_human_approval_flow(self):
        env = setup_runner_and_workspace()

        res = client.post(
            "/api/v1/orchestrator/tasks",
            json={
                "project_id": env["project_id"],
                "workspace_id": env["workspace_id"],
                "title": "Plan approval test",
                "prompt": "Create plan first",
                "mode": "plan"
            }
        )
        task_id = res.json()["id"]
        client.post(f"/api/v1/orchestrator/tasks/{task_id}/dispatch")

        # Simulate agent finishing plan -> state becomes AWAITING_APPROVAL
        execute_commit("UPDATE development_tasks SET status = 'AWAITING_APPROVAL' WHERE id = ?", (task_id,))

        # Submit user approval
        app_res = client.post(
            f"/api/v1/orchestrator/tasks/{task_id}/approval",
            json={"decision": "APPROVED", "reason": "Plan looks verified and sound."}
        )
        assert app_res.status_code == 200
        assert app_res.json()["status"] == "RUNNING"

        # Verify DB updated
        detail = client.get(f"/api/v1/orchestrator/tasks/{task_id}").json()
        assert detail["status"] == "RUNNING"
        assert len(detail["approvals"]) == 1
        assert detail["approvals"][0]["decision"] == "APPROVED"

    def test_runner_batch_events_and_token_accounting(self):
        env = setup_runner_and_workspace()

        res = client.post(
            "/api/v1/orchestrator/tasks",
            json={
                "project_id": env["project_id"],
                "workspace_id": env["workspace_id"],
                "title": "Token test",
                "prompt": "Test event ingestion",
                "mode": "plan"
            }
        )
        task_id = res.json()["id"]
        disp = client.post(f"/api/v1/orchestrator/tasks/{task_id}/dispatch").json()
        attempt_id = disp["attempt_id"]

        # Runner sends batch normalized events
        events_payload = {
            "attempt_id": attempt_id,
            "events": [
                {
                    "event_id": f"evt_{uuid.uuid4().hex[:12]}",
                    "sequence_number": 1,
                    "task_id": task_id,
                    "attempt_id": attempt_id,
                    "event_type": "TASK_INITIALIZED",
                    "severity": "INFO",
                    "payload": {"cwd": "C:\\Users\\PC\\Project\\ai-chan", "model": "gemini-2.5-pro"}
                },
                {
                    "event_id": f"evt_{uuid.uuid4().hex[:12]}",
                    "sequence_number": 2,
                    "task_id": task_id,
                    "attempt_id": attempt_id,
                    "event_type": "TOKEN_USAGE",
                    "severity": "INFO",
                    "payload": {"input_tokens": 1250, "output_tokens": 340, "cost_estimate": 0.0042}
                }
            ]
        }

        ingest_res = client.post(
            "/api/v1/orchestrator/runners/tasks/events",
            json=events_payload,
            headers={"Authorization": f"Bearer {env['runner_secret']}"}
        )
        assert ingest_res.status_code == 200
        assert ingest_res.json()["received"] == 2

        # Verify token metrics in database
        att_row = query_one("SELECT * FROM task_attempts WHERE id = ?", (attempt_id,))
        assert att_row["tokens_in"] == 1250
        assert att_row["tokens_out"] == 340

    def test_runner_task_complete_with_artifacts(self):
        env = setup_runner_and_workspace()

        res = client.post(
            "/api/v1/orchestrator/tasks",
            json={
                "project_id": env["project_id"],
                "workspace_id": env["workspace_id"],
                "title": "Artifact completion test",
                "prompt": "Create patch diff",
                "mode": "accept-edits"
            }
        )
        task_id = res.json()["id"]
        disp = client.post(f"/api/v1/orchestrator/tasks/{task_id}/dispatch?mode=accept-edits").json()
        attempt_id = disp["attempt_id"]

        complete_payload = {
            "attempt_id": attempt_id,
            "status": "COMPLETED",
            "exit_code": 0,
            "duration_seconds": 14.5,
            "tokens_in": 3500,
            "tokens_out": 820,
            "summary": "Updated token expiration logic successfully.",
            "artifacts": [
                {
                    "artifact_type": "diff",
                    "file_path": "changes.patch",
                    "content": "--- a/auth.py\n+++ b/auth.py\n@@ -1,1 +1,1 @@\n-EXPIRE = 60\n+EXPIRE = 1440\n"
                }
            ]
        }

        comp_res = client.post(
            "/api/v1/orchestrator/runners/tasks/complete",
            json=complete_payload,
            headers={"Authorization": f"Bearer {env['runner_secret']}"}
        )
        assert comp_res.status_code == 200

        # In accept-edits mode, completion transitions task to REVIEW_REQUIRED
        task_row = query_one("SELECT * FROM development_tasks WHERE id = ?", (task_id,))
        assert task_row["status"] == "REVIEW_REQUIRED"

        # Check diff endpoint
        diff_res = client.get(f"/api/v1/orchestrator/tasks/{task_id}/diff")
        assert diff_res.status_code == 200
        assert "EXPIRE = 1440" in diff_res.json()["diff"]

    def test_workspace_concurrency_lock(self):
        """Verifies only 1 active task can run concurrently per workspace."""
        env = setup_runner_and_workspace()

        # Task 1
        res1 = client.post(
            "/api/v1/orchestrator/tasks",
            json={
                "project_id": env["project_id"],
                "workspace_id": env["workspace_id"],
                "title": "Task 1 Running",
                "prompt": "Work on feature 1",
                "mode": "plan"
            }
        )
        task1_id = res1.json()["id"]
        disp1 = client.post(f"/api/v1/orchestrator/tasks/{task1_id}/dispatch")
        assert disp1.status_code == 200

        # Task 2 on the same workspace
        res2 = client.post(
            "/api/v1/orchestrator/tasks",
            json={
                "project_id": env["project_id"],
                "workspace_id": env["workspace_id"],
                "title": "Task 2 Conflict",
                "prompt": "Work on feature 2",
                "mode": "plan"
            }
        )
        task2_id = res2.json()["id"]

        # Attempting to dispatch Task 2 while Task 1 is active must fail with 409
        disp2 = client.post(f"/api/v1/orchestrator/tasks/{task2_id}/dispatch")
        assert disp2.status_code == 409
        assert "đang bận thực thi tác vụ khác" in disp2.json()["detail"]

        # Once Task 1 is cancelled, Task 2 can be dispatched
        cancel_res = client.post(
            f"/api/v1/orchestrator/tasks/{task1_id}/cancel",
            json={"reason": "Yield to task 2"}
        )
        assert cancel_res.status_code == 202 or cancel_res.status_code == 200

        # Now Task 2 dispatches successfully
        disp2_retry = client.post(f"/api/v1/orchestrator/tasks/{task2_id}/dispatch")
        assert disp2_retry.status_code == 200

    def test_review_decision_approve_accept(self):
        """Verifies APPROVE/ACCEPT completes the task and marks review_status APPROVED."""
        env = setup_runner_and_workspace()
        res = client.post(
            "/api/v1/orchestrator/tasks",
            json={
                "project_id": env["project_id"],
                "workspace_id": env["workspace_id"],
                "title": "Review Approve Test",
                "prompt": "Write migration",
                "mode": "accept-edits"
            }
        )
        task_id = res.json()["id"]
        disp = client.post(f"/api/v1/orchestrator/tasks/{task_id}/dispatch?mode=accept-edits").json()
        attempt_id = disp["attempt_id"]

        # Complete attempt -> REVIEW_REQUIRED
        client.post(
            "/api/v1/orchestrator/runners/tasks/complete",
            json={"attempt_id": attempt_id, "status": "COMPLETED"},
            headers={"Authorization": f"Bearer {env['runner_secret']}"}
        )

        # Submit APPROVE review
        rev_res = client.post(
            f"/api/v1/orchestrator/tasks/{task_id}/review",
            json={"decision": "APPROVE", "commit_message": "Approved by Senior QA"}
        )
        assert rev_res.status_code == 200
        data = rev_res.json()
        assert data["status"] == "COMPLETED"
        assert data["review_status"] == "APPROVED"

        # Check DB state
        task_row = query_one("SELECT * FROM development_tasks WHERE id = ?", (task_id,))
        assert task_row["status"] == "COMPLETED"
        assert task_row["review_status"] == "APPROVED"

    def test_review_decision_request_changes_spawns_attempt(self):
        """Verifies REQUEST_CHANGES creates follow-up attempt linked to parent attempt."""
        env = setup_runner_and_workspace()
        res = client.post(
            "/api/v1/orchestrator/tasks",
            json={
                "project_id": env["project_id"],
                "workspace_id": env["workspace_id"],
                "title": "Request Changes Test",
                "prompt": "Implement API v2",
                "mode": "accept-edits"
            }
        )
        task_id = res.json()["id"]
        disp = client.post(f"/api/v1/orchestrator/tasks/{task_id}/dispatch?mode=accept-edits").json()
        att1_id = disp["attempt_id"]

        # Complete attempt 1 -> REVIEW_REQUIRED
        client.post(
            "/api/v1/orchestrator/runners/tasks/complete",
            json={"attempt_id": att1_id, "status": "COMPLETED"},
            headers={"Authorization": f"Bearer {env['runner_secret']}"}
        )

        # Request Changes review
        rev_res = client.post(
            f"/api/v1/orchestrator/tasks/{task_id}/review",
            json={
                "decision": "REQUEST_CHANGES",
                "feedback": "Please add docstrings to handlers and write unit tests."
            }
        )
        assert rev_res.status_code == 200
        rev_data = rev_res.json()
        assert rev_data["status"] == "QUEUED"
        assert rev_data["review_status"] == "CHANGES_REQUESTED"
        assert rev_data["attempt_number"] == 2
        att2_id = rev_data["attempt_id"]
        assert att2_id != att1_id

        # Verify Attempt 2 link in DB
        att2_row = query_one("SELECT * FROM task_attempts WHERE id = ?", (att2_id,))
        assert att2_row["attempt_number"] == 2
        assert att2_row["parent_attempt_id"] == att1_id
        assert "Please add docstrings" in att2_row["review_feedback"]
        assert att2_row["mode"] == "accept-edits"

        # Verify Task reflects attempt 2 as current
        task_row = query_one("SELECT * FROM development_tasks WHERE id = ?", (task_id,))
        assert task_row["current_attempt_id"] == att2_id

    def test_review_decision_reject(self):
        """Verifies REJECT cancels the task and marks review_status REJECTED."""
        env = setup_runner_and_workspace()
        res = client.post(
            "/api/v1/orchestrator/tasks",
            json={
                "project_id": env["project_id"],
                "workspace_id": env["workspace_id"],
                "title": "Reject Task Test",
                "prompt": "Broken feature",
                "mode": "accept-edits"
            }
        )
        task_id = res.json()["id"]
        disp = client.post(f"/api/v1/orchestrator/tasks/{task_id}/dispatch?mode=accept-edits").json()
        attempt_id = disp["attempt_id"]

        client.post(
            "/api/v1/orchestrator/runners/tasks/complete",
            json={"attempt_id": attempt_id, "status": "COMPLETED"},
            headers={"Authorization": f"Bearer {env['runner_secret']}"}
        )

        # Submit REJECT
        rev_res = client.post(
            f"/api/v1/orchestrator/tasks/{task_id}/review",
            json={"decision": "REJECT", "feedback": "Completely wrong approach."}
        )
        assert rev_res.status_code == 200
        assert rev_res.json()["status"] == "CANCELLED"
        assert rev_res.json()["review_status"] == "REJECTED"

    def test_verification_reports_ingestion_and_retrieval(self):
        """Verifies runner can post verification reports and user can retrieve them."""
        env = setup_runner_and_workspace()
        res = client.post(
            "/api/v1/orchestrator/tasks",
            json={
                "project_id": env["project_id"],
                "workspace_id": env["workspace_id"],
                "title": "Verification Pipeline Test",
                "prompt": "Run full verification test suite",
                "mode": "accept-edits"
            }
        )
        task_id = res.json()["id"]
        disp = client.post(f"/api/v1/orchestrator/tasks/{task_id}/dispatch?mode=accept-edits").json()
        attempt_id = disp["attempt_id"]

        verif_payload = {
            "attempt_id": attempt_id,
            "overall_status": "PASSED",
            "steps": [
                {
                    "step_name": "lint",
                    "command": "npm run lint",
                    "status": "PASSED",
                    "exit_code": 0,
                    "duration_seconds": 1.2,
                    "stdout_preview": "Lint checked 15 files cleanly."
                },
                {
                    "step_name": "typecheck",
                    "command": "npx tsc --noEmit",
                    "status": "PASSED",
                    "exit_code": 0,
                    "duration_seconds": 2.5,
                    "stdout_preview": "0 TypeScript errors found."
                },
                {
                    "step_name": "test",
                    "command": "npm test",
                    "status": "PASSED",
                    "exit_code": 0,
                    "duration_seconds": 4.8,
                    "stdout_preview": "31 passed across 5 test suites."
                }
            ]
        }

        # Runner posts verification reports
        post_res = client.post(
            "/api/v1/orchestrator/runners/tasks/verification-reports",
            json=verif_payload,
            headers={"Authorization": f"Bearer {env['runner_secret']}"}
        )
        assert post_res.status_code == 200
        assert post_res.json()["saved_steps"] == 3

        # User queries verifications endpoint
        get_res = client.get(f"/api/v1/orchestrator/tasks/{task_id}/verifications")
        assert get_res.status_code == 200
        v_data = get_res.json()
        assert v_data["all_passed"] is True
        assert v_data["has_failures"] is False
        assert len(v_data["reports"]) == 3
        steps = [r["step_name"] for r in v_data["reports"]]
        assert "lint" in steps
        assert "typecheck" in steps
        assert "test" in steps

        # Check that GET /tasks/{id} returns verifications as well
        detail_res = client.get(f"/api/v1/orchestrator/tasks/{task_id}")
        assert detail_res.status_code == 200
        assert len(detail_res.json().get("verifications", [])) == 3

    @pytest.mark.asyncio
    async def test_dispatch_channel_offline_and_reconciliation(self):
        from src.api.v1.orchestrator import runner_channel_mgr, reconcile_queued_tasks_for_runner
        env = setup_runner_and_workspace()

        # Ensure channel is disconnected initially
        runner_channel_mgr.unregister(env["runner_id"])

        res = client.post(
            "/api/v1/orchestrator/tasks",
            json={
                "project_id": env["project_id"],
                "workspace_id": env["workspace_id"],
                "title": "Offline dispatch test",
                "prompt": "Test dispatch when runner channel not open",
                "mode": "plan"
            }
        )
        task_id = res.json()["id"]

        # Dispatch when channel offline
        disp_res = client.post(f"/api/v1/orchestrator/tasks/{task_id}/dispatch")
        assert disp_res.status_code == 200
        disp_data = disp_res.json()
        assert disp_data["status"] == "QUEUED"
        assert disp_data["dispatch_state"] == "WAITING_FOR_RUNNER"
        assert disp_data["channel_dispatched"] is False

        # Task in DB has WAITING_FOR_RUNNER
        task_row = query_one("SELECT dispatch_state FROM development_tasks WHERE id = ?", (task_id,))
        assert task_row["dispatch_state"] == "WAITING_FOR_RUNNER"

        # Now simulate runner connecting channel
        q = runner_channel_mgr.register(env["runner_id"])
        try:
            # Run reconciliation
            await reconcile_queued_tasks_for_runner(env["runner_id"])

            # Check queue received TASK_DISPATCH message
            assert not q.empty()
            item = q.get_nowait()
            assert item["event"] == "TASK_DISPATCH"
            assert item["data"]["task_id"] == task_id

            # Verify task updated to DISPATCHED
            task_row2 = query_one("SELECT dispatch_state FROM development_tasks WHERE id = ?", (task_id,))
            assert task_row2["dispatch_state"] == "DISPATCHED"
        finally:
            runner_channel_mgr.unregister(env["runner_id"])

    def test_runner_claim_task_ack_and_idempotency(self):
        env = setup_runner_and_workspace()

        res = client.post(
            "/api/v1/orchestrator/tasks",
            json={
                "project_id": env["project_id"],
                "workspace_id": env["workspace_id"],
                "title": "Claim test",
                "prompt": "Test runner claim ACK",
                "mode": "plan"
            }
        )
        task_id = res.json()["id"]
        disp = client.post(f"/api/v1/orchestrator/tasks/{task_id}/dispatch").json()
        attempt_id = disp["attempt_id"]

        # 1. Runner calls claim endpoint
        claim_res = client.post(
            "/api/v1/orchestrator/runners/tasks/claim",
            json={"attempt_id": attempt_id},
            headers={"Authorization": f"Bearer {env['runner_secret']}"}
        )
        assert claim_res.status_code == 200
        claim_data = claim_res.json()
        assert claim_data["claimed"] is True
        assert claim_data["attempt_id"] == attempt_id

        # Verify DB updated
        att_row = query_one("SELECT status, claimed_at FROM task_attempts WHERE id = ?", (attempt_id,))
        assert att_row["status"] == "DISPATCHING"
        assert att_row["claimed_at"] is not None

        task_row = query_one("SELECT dispatch_state FROM development_tasks WHERE id = ?", (task_id,))
        assert task_row["dispatch_state"] == "CLAIMED"

        # 2. Duplicate claim is idempotent
        claim_res2 = client.post(
            "/api/v1/orchestrator/runners/tasks/claim",
            json={"attempt_id": attempt_id},
            headers={"Authorization": f"Bearer {env['runner_secret']}"}
        )
        assert claim_res2.status_code == 200
        assert claim_res2.json()["already_claimed"] is True

    def test_attempt_scoping_and_terminal_idempotency(self):
        env = setup_runner_and_workspace()

        res = client.post(
            "/api/v1/orchestrator/tasks",
            json={
                "project_id": env["project_id"],
                "workspace_id": env["workspace_id"],
                "title": "Attempt scoping test",
                "prompt": "Test multiple attempts scoping",
                "mode": "accept-edits"
            }
        )
        task_id = res.json()["id"]
        disp1 = client.post(f"/api/v1/orchestrator/tasks/{task_id}/dispatch", params={"mode": "accept-edits"}).json()
        att1_id = disp1["attempt_id"]

        # Simulate attempt 1 completes and user requests changes, creating attempt 2
        client.post(
            "/api/v1/orchestrator/runners/tasks/complete",
            json={"attempt_id": att1_id, "status": "COMPLETED"},
            headers={"Authorization": f"Bearer {env['runner_secret']}"}
        )

        review_res = client.post(
            f"/api/v1/orchestrator/tasks/{task_id}/review",
            json={"decision": "REQUEST_CHANGES", "feedback": "Fix the error handling"}
        )
        assert review_res.status_code == 200
        att2_id = review_res.json()["attempt_id"]
        assert att2_id != att1_id

        # Verify task's current_attempt_id is att2_id
        t_row = query_one("SELECT current_attempt_id, status FROM development_tasks WHERE id = ?", (task_id,))
        assert t_row["current_attempt_id"] == att2_id
        assert t_row["status"] == "QUEUED"

        # Now attempt 1 sends an event or late completion
        # Attempt 1 events must NOT overwrite task status!
        late_event_res = client.post(
            "/api/v1/orchestrator/runners/tasks/events",
            json={
                "attempt_id": att1_id,
                "events": [
                    {
                        "event_id": "late_ev_01",
                        "sequence_number": 999,
                        "task_id": task_id,
                        "attempt_id": att1_id,
                        "event_type": "STATUS_TRANSITION",
                        "severity": "INFO",
                        "payload": {"to_status": "RUNNING"}
                    }
                ]
            },
            headers={"Authorization": f"Bearer {env['runner_secret']}"}
        )
        assert late_event_res.status_code == 200

        # Verify task is STILL QUEUED (att2), not overwritten by late att1 event
        t_row_after = query_one("SELECT current_attempt_id, status FROM development_tasks WHERE id = ?", (task_id,))
        assert t_row_after["current_attempt_id"] == att2_id
        assert t_row_after["status"] == "QUEUED"

    @pytest.mark.asyncio
    async def test_first_event_at_and_sse_replay_last_event_id(self):
        from starlette.requests import Request
        from src.api.v1.orchestrator import stream_task_events
        env = setup_runner_and_workspace()

        res = client.post(
            "/api/v1/orchestrator/tasks",
            json={
                "project_id": env["project_id"],
                "workspace_id": env["workspace_id"],
                "title": "Replay test",
                "prompt": "Test event replay with Last-Event-ID",
                "mode": "plan"
            }
        )
        task_id = res.json()["id"]
        disp = client.post(f"/api/v1/orchestrator/tasks/{task_id}/dispatch").json()
        attempt_id = disp["attempt_id"]

        # Post sequence of events 1, 2, 3
        events = [
            {
                "event_id": f"ev_{seq}",
                "sequence_number": seq,
                "task_id": task_id,
                "attempt_id": attempt_id,
                "event_type": "PROCESS_STDOUT",
                "severity": "INFO",
                "payload": {"text": f"Line {seq}"}
            }
            for seq in [1, 2, 3]
        ]
        post_ev = client.post(
            "/api/v1/orchestrator/runners/tasks/events",
            json={"attempt_id": attempt_id, "events": events},
            headers={"Authorization": f"Bearer {env['runner_secret']}"}
        )
        assert post_ev.status_code == 200

        # Verify first_event_at is recorded
        att_row = query_one("SELECT first_event_at FROM task_attempts WHERE id = ?", (attempt_id,))
        assert att_row["first_event_at"] is not None

        # Build mock ASGI request with Last-Event-ID
        scope = {
            "type": "http",
            "method": "GET",
            "path": f"/api/v1/orchestrator/tasks/{task_id}/events",
            "headers": [(b"last-event-id", b"evt_2")],
        }
        mock_req = Request(scope)

        resp = await stream_task_events(
            id=task_id,
            request=mock_req,
            since_seq=0,
            attempt_id=attempt_id,
            user={"id": "guest_user"}
        )
        chunk = await resp.body_iterator.__anext__()
        assert "Line 3" in chunk
        assert "Line 1" not in chunk
        assert "Line 2" not in chunk

    def test_plan_review_creates_real_markdown_artifact_and_metadata(self):
        """Prompt 04: Plan/Review must create real inspectable and downloadable Markdown artifact."""
        import hashlib
        env = setup_runner_and_workspace()

        # 1. Create task specifically requesting codebase review report
        create_res = client.post(
            "/api/v1/orchestrator/tasks",
            json={
                "project_id": env["project_id"],
                "workspace_id": env["workspace_id"],
                "title": "Review codebase và tạo báo cáo",
                "prompt": "Khảo sát kiến trúc repository và xuất báo cáo đánh giá chi tiết",
                "mode": "plan"
            }
        )
        assert create_res.status_code == 201
        task_id = create_res.json()["id"]

        # 2. Dispatch task
        disp_res = client.post(f"/api/v1/orchestrator/tasks/{task_id}/dispatch")
        assert disp_res.status_code == 200
        attempt_id = disp_res.json()["attempt_id"]

        # 3. Simulate runner completing with genuine markdown review artifact
        review_md = (
            "# Báo Cáo Phân Tích Codebase AI-Chan\n\n"
            "## 1. Executive Summary\n"
            "Dự án AI-Chan là nền tảng quản lý dự án và điều phối tác vụ kỹ thuật tự động.\n\n"
            "## 2. Tech Stack\n"
            "- Python 3.12 (FastAPI, SQLite)\n"
            "- Frontend: Next.js / TypeScript\n\n"
            "## 3. Findings\n"
            "- [INFO] Kiến trúc tách biệt Orchestrator và Runner daemon an toàn qua SSE token.\n"
        )
        content_bytes = review_md.encode("utf-8")
        expected_checksum = hashlib.sha256(content_bytes).hexdigest()

        complete_res = client.post(
            "/api/v1/orchestrator/runners/tasks/complete",
            json={
                "attempt_id": attempt_id,
                "status": "COMPLETED",
                "exit_code": 0,
                "duration_seconds": 2.5,
                "summary": "Đã hoàn thành khảo sát codebase và tạo báo cáo.",
                "artifacts": [
                    {
                        "artifact_type": "review",
                        "display_name": "Báo cáo Phân tích Codebase",
                        "file_path": "codebase_review.md",
                        "content": review_md,
                        "mime_type": "text/markdown",
                        "byte_size": len(content_bytes),
                        "checksum_sha256": expected_checksum
                    }
                ]
            },
            headers={"Authorization": f"Bearer {env['runner_secret']}"}
        )
        assert complete_res.status_code == 200
        assert complete_res.json()["status"] == "AWAITING_APPROVAL"

        # 4. Verify list artifacts API returns metadata without heavy content payload
        list_res = client.get(f"/api/v1/orchestrator/tasks/{task_id}/artifacts")
        assert list_res.status_code == 200
        artifacts = list_res.json()
        assert len(artifacts) >= 1
        art_meta = next(a for a in artifacts if a["file_path"] == "codebase_review.md")
        assert art_meta["display_name"] == "Báo cáo Phân tích Codebase"
        assert art_meta["mime_type"] == "text/markdown"
        assert art_meta["byte_size"] == len(content_bytes)
        assert art_meta["checksum_sha256"] == expected_checksum
        assert "content" not in art_meta

        # 5. Verify detail API returns content
        detail_res = client.get(f"/api/v1/orchestrator/tasks/{task_id}/artifacts/{art_meta['id']}")
        assert detail_res.status_code == 200
        art_detail = detail_res.json()
        assert art_detail["content"] == review_md
        assert art_detail["checksum_sha256"] == expected_checksum

        # 6. Verify download API returns attachment header and valid bytes
        download_res = client.get(f"/api/v1/orchestrator/tasks/{task_id}/artifacts/{art_meta['id']}/download")
        assert download_res.status_code == 200
        assert 'attachment; filename="codebase_review.md"' in download_res.headers.get("content-disposition", "")
        assert "text/markdown" in download_res.headers.get("content-type", "")
        assert download_res.content == content_bytes
        assert download_res.headers.get("x-artifact-checksum") == expected_checksum

    def test_empty_runtime_output_fails_without_fake_artifact(self):
        """Prompt 04: Empty runtime response must not produce fake reports or mark success."""
        env = setup_runner_and_workspace()

        # 1. Create task
        create_res = client.post(
            "/api/v1/orchestrator/tasks",
            json={
                "project_id": env["project_id"],
                "workspace_id": env["workspace_id"],
                "title": "Task with empty runtime",
                "prompt": "Review something but runtime outputs nothing",
                "mode": "plan"
            }
        )
        task_id = create_res.json()["id"]

        disp_res = client.post(f"/api/v1/orchestrator/tasks/{task_id}/dispatch")
        attempt_id = disp_res.json()["attempt_id"]

        # 2. Simulate runner returning COMPLETED but with empty summary and no artifacts
        complete_res = client.post(
            "/api/v1/orchestrator/runners/tasks/complete",
            json={
                "attempt_id": attempt_id,
                "status": "COMPLETED",
                "exit_code": 0,
                "summary": "   ",
                "artifacts": []
            },
            headers={"Authorization": f"Bearer {env['runner_secret']}"}
        )
        assert complete_res.status_code == 200
        # Backend must fail the task instead of claiming success!
        assert complete_res.json()["status"] == "FAILED"

        task_row = query_one("SELECT status, failure_code FROM development_tasks WHERE id = ?", (task_id,))
        assert task_row["status"] == "FAILED"
        assert task_row["failure_code"] == "EMPTY_RUNTIME_OUTPUT"

        # Verify NO fake artifacts were inserted into the DB
        arts = query_all("SELECT id FROM task_artifacts WHERE task_id = ? OR attempt_id = ?", (task_id, attempt_id))
        assert len(arts) == 0

    def test_artifact_download_auth_and_path_traversal_defense(self):
        """Prompt 04: Download verifies ownership and sanitizes dangerous filenames."""
        env = setup_runner_and_workspace()

        create_res = client.post(
            "/api/v1/orchestrator/tasks",
            json={
                "project_id": env["project_id"],
                "workspace_id": env["workspace_id"],
                "title": "Security test",
                "prompt": "Test path traversal in filename",
                "mode": "plan"
            }
        )
        task_id = create_res.json()["id"]
        disp_res = client.post(f"/api/v1/orchestrator/tasks/{task_id}/dispatch")
        attempt_id = disp_res.json()["attempt_id"]

        # Malicious filename attempting path traversal
        client.post(
            "/api/v1/orchestrator/runners/tasks/complete",
            json={
                "attempt_id": attempt_id,
                "status": "COMPLETED",
                "exit_code": 0,
                "summary": "Security test completed.",
                "artifacts": [
                    {
                        "artifact_type": "report",
                        "display_name": "Traversal Test",
                        "file_path": "../../etc/shadow",
                        "content": "safe_content",
                        "mime_type": "text/plain"
                    }
                ]
            },
            headers={"Authorization": f"Bearer {env['runner_secret']}"}
        )

        list_res = client.get(f"/api/v1/orchestrator/tasks/{task_id}/artifacts")
        assert list_res.status_code == 200
        art = list_res.json()[0]
        # Filename must be sanitized to pure basename without '../'
        assert art["file_path"] == "shadow"
        assert ".." not in art["file_path"]

        # Attempt download
        dl_res = client.get(f"/api/v1/orchestrator/tasks/{task_id}/artifacts/{art['id']}/download")
        assert dl_res.status_code == 200
        assert 'filename="shadow"' in dl_res.headers.get("content-disposition", "")
        assert dl_res.content == b"safe_content"

    def test_artifact_retry_recovers_without_rerunning_coding_task(self):
        """Prompt 04: Storage retry endpoint recovers artifact from events without running CLI again."""
        env = setup_runner_and_workspace()

        create_res = client.post(
            "/api/v1/orchestrator/tasks",
            json={
                "project_id": env["project_id"],
                "workspace_id": env["workspace_id"],
                "title": "Review codebase for retry",
                "prompt": "Review codebase architecture",
                "mode": "plan"
            }
        )
        task_id = create_res.json()["id"]
        disp_res = client.post(f"/api/v1/orchestrator/tasks/{task_id}/dispatch")
        attempt_id = disp_res.json()["attempt_id"]

        # Emit PLAN_CREATED event
        plan_content = "# Verified Plan from Event Stream\nArchitecture is sound."
        client.post(
            "/api/v1/orchestrator/runners/tasks/events",
            json={
                "attempt_id": attempt_id,
                "events": [
                    {
                        "event_id": "ev_p1",
                        "sequence_number": 1,
                        "task_id": task_id,
                        "attempt_id": attempt_id,
                        "event_type": "PLAN_CREATED",
                        "severity": "INFO",
                        "payload": {"plan_markdown": plan_content}
                    }
                ]
            },
            headers={"Authorization": f"Bearer {env['runner_secret']}"}
        )

        # Simulate task with ARTIFACT_STORAGE_ERROR
        execute_commit(
            "UPDATE development_tasks SET status = 'FAILED', failure_code = 'ARTIFACT_STORAGE_ERROR' WHERE id = ?",
            (task_id,)
        )

        # Call retry endpoint
        retry_res = client.post(f"/api/v1/orchestrator/tasks/{task_id}/artifacts/retry")
        assert retry_res.status_code == 200
        retry_data = retry_res.json()
        assert retry_data["success"] is True
        assert retry_data["file_path"] == "codebase_review.md"

        # Verify task is now AWAITING_APPROVAL and failure_code cleared
        t_row = query_one("SELECT status, failure_code FROM development_tasks WHERE id = ?", (task_id,))
        assert t_row["status"] == "AWAITING_APPROVAL"
        assert t_row["failure_code"] is None

        # Verify artifact is now persisted in DB
        arts = client.get(f"/api/v1/orchestrator/tasks/{task_id}/artifacts").json()
        assert len(arts) == 1
        assert arts[0]["file_path"] == "codebase_review.md"


