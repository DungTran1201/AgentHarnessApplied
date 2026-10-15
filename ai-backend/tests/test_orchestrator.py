import unittest
import sys
import uuid
import json
import time
from pathlib import Path
from fastapi.testclient import TestClient

# Add src and backend root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.main import app
from src.core.security import hash_password, create_access_token
from src.db import execute_commit, query_one, query_all

class TestOrchestratorAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.user_id = str(uuid.uuid4())
        self.email = f"orch_tester_{uuid.uuid4().hex[:8]}@example.com"
        self.password = "ValidPass123!"
        self.hashed_pw = hash_password(self.password)

        # User 2 for Anti-IDOR testing
        self.user2_id = str(uuid.uuid4())
        self.email2 = f"orch_tester2_{uuid.uuid4().hex[:8]}@example.com"

        # Insert test users
        execute_commit(
            "INSERT INTO users (id, email, full_name, hashed_password, status) VALUES (?, ?, 'Orch Tester 1', ?, 'ACTIVE')",
            (self.user_id, self.email, self.hashed_pw)
        )
        execute_commit(
            "INSERT INTO users (id, email, full_name, hashed_password, status) VALUES (?, ?, 'Orch Tester 2', ?, 'ACTIVE')",
            (self.user2_id, self.email2, self.hashed_pw)
        )

        self.token = create_access_token(self.user_id, self.email)
        self.token2 = create_access_token(self.user2_id, self.email2)

        self.headers_user1 = {"Authorization": f"Bearer {self.token}"}
        self.headers_user2 = {"Authorization": f"Bearer {self.token2}"}

    def tearDown(self):
        # Clean up records created for test users
        execute_commit("DELETE FROM workspace_validations WHERE runner_id IN (SELECT id FROM agent_runners WHERE user_id IN (?, ?))", (self.user_id, self.user2_id))
        execute_commit("DELETE FROM development_workspaces WHERE user_id IN (?, ?)", (self.user_id, self.user2_id))
        execute_commit("DELETE FROM agent_runners WHERE user_id IN (?, ?)", (self.user_id, self.user2_id))
        execute_commit("DELETE FROM runner_pairing_tokens WHERE user_id IN (?, ?)", (self.user_id, self.user2_id))
        execute_commit("DELETE FROM users WHERE id IN (?, ?)", (self.user_id, self.user2_id))

    def test_orchestrator_health(self):
        res = self.client.get("/api/v1/orchestrator/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["subsystem"], "development_orchestrator")
        self.assertIn("workspaces_count", data)
        self.assertIn("runners_count", data)

    def test_runner_pairing_token_lifecycle(self):
        # 1. Create pairing token
        res = self.client.post(
            "/api/v1/orchestrator/runners/pairing-token",
            json={"label": "Test Dev Laptop"},
            headers=self.headers_user1
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["pairing_token"].startswith("rpt_"))
        self.assertEqual(data["ttl_seconds"], 900)
        self.assertIn("cli_command", data)

        # Verify token in DB
        row = query_one("SELECT * FROM runner_pairing_tokens WHERE token = ?", (data["pairing_token"],))
        self.assertIsNotNone(row)
        self.assertEqual(row["user_id"], self.user_id)
        self.assertEqual(row["is_used"], 0)

    def test_runner_pairing_handshake_and_single_use(self):
        # 1. Generate token
        res_token = self.client.post(
            "/api/v1/orchestrator/runners/pairing-token",
            json={"label": "Handshake Test"},
            headers=self.headers_user1
        )
        pairing_token = res_token.json()["pairing_token"]

        # 2. Pair runner (public endpoint with token)
        pair_payload = {
            "pairing_token": pairing_token,
            "name": "Desktop-Win11",
            "machine_name": "DESKTOP-TEST",
            "platform": "windows",
            "architecture": "x86_64",
            "capabilities": {
                "antigravity": {"available": True, "version": "1.2.16"},
                "git": {"available": True, "version": "2.44.0"}
            },
            "system_info": {"os_version": "Windows 11 Build 22631"}
        }

        res_pair = self.client.post("/api/v1/orchestrator/runners/pair", json=pair_payload)
        self.assertEqual(res_pair.status_code, 200)
        pair_data = res_pair.json()
        self.assertIn("runner_id", pair_data)
        self.assertTrue(pair_data["runner_secret"].startswith("rsk_"))
        self.assertEqual(pair_data["heartbeat_interval_seconds"], 25)

        runner_id = pair_data["runner_id"]

        # Verify DB status
        runner_row = query_one("SELECT * FROM agent_runners WHERE id = ?", (runner_id,))
        self.assertIsNotNone(runner_row)
        self.assertEqual(runner_row["status"], "ONLINE")
        self.assertEqual(runner_row["user_id"], self.user_id)
        # Verify secret is hashed, NOT plaintext
        self.assertNotEqual(runner_row["secret_hash"], pair_data["runner_secret"])

        # 3. Replay attack: try pairing again with same token -> MUST fail with 409
        res_replay = self.client.post("/api/v1/orchestrator/runners/pair", json=pair_payload)
        self.assertEqual(res_replay.status_code, 409)

    def test_runner_heartbeat_and_auth(self):
        # Pair runner first
        res_token = self.client.post("/api/v1/orchestrator/runners/pairing-token", json={}, headers=self.headers_user1)
        token = res_token.json()["pairing_token"]
        pair_res = self.client.post("/api/v1/orchestrator/runners/pair", json={
            "pairing_token": token,
            "name": "Heartbeat-Runner",
            "machine_name": "HOST-01",
            "platform": "linux",
            "architecture": "x86_64"
        }).json()

        runner_id = pair_res["runner_id"]
        runner_secret = pair_res["runner_secret"]

        # 1. Valid Heartbeat
        hb_res = self.client.post(
            f"/api/v1/orchestrator/runners/{runner_id}/heartbeat",
            json={"cpu_percent": 12.5, "memory_percent": 50.0},
            headers={"Authorization": f"Bearer {runner_secret}"}
        )
        self.assertEqual(hb_res.status_code, 200)
        self.assertEqual(hb_res.json()["status"], "ACK")

        # 2. Invalid Secret -> 401 Unauthorized
        hb_fail = self.client.post(
            f"/api/v1/orchestrator/runners/{runner_id}/heartbeat",
            json={},
            headers={"Authorization": "Bearer rsk_invalidsecret12345"}
        )
        self.assertEqual(hb_fail.status_code, 401)

        # 3. Missing Header -> 401 Unauthorized
        hb_no_auth = self.client.post(f"/api/v1/orchestrator/runners/{runner_id}/heartbeat", json={})
        self.assertEqual(hb_no_auth.status_code, 401)

    def test_runner_revocation(self):
        # Pair runner
        res_token = self.client.post("/api/v1/orchestrator/runners/pairing-token", json={}, headers=self.headers_user1)
        token = res_token.json()["pairing_token"]
        pair_res = self.client.post("/api/v1/orchestrator/runners/pair", json={
            "pairing_token": token,
            "name": "Revoke-Test",
            "machine_name": "HOST-02",
            "platform": "darwin",
            "architecture": "arm64"
        }).json()
        runner_id = pair_res["runner_id"]
        runner_secret = pair_res["runner_secret"]

        # User revokes runner
        res_revoke = self.client.post(f"/api/v1/orchestrator/runners/{runner_id}/revoke", headers=self.headers_user1)
        self.assertEqual(res_revoke.status_code, 200)
        self.assertEqual(res_revoke.json()["status"], "REVOKED")

        # Subsequent heartbeat MUST fail with 401
        hb_after = self.client.post(
            f"/api/v1/orchestrator/runners/{runner_id}/heartbeat",
            json={},
            headers={"Authorization": f"Bearer {runner_secret}"}
        )
        self.assertEqual(hb_after.status_code, 401)

    def test_workspace_crud_and_owner_isolation(self):
        # 1. User 1 creates workspace
        ws_payload = {
            "name": "ai-chan-core",
            "local_path": "C:\\Users\\PC\\Project\\ai-chan",
            "git_remote_url": "https://github.com/DungTran1201/ai-chan.git",
            "default_branch": "main"
        }
        res_create = self.client.post("/api/v1/orchestrator/workspaces", json=ws_payload, headers=self.headers_user1)
        self.assertEqual(res_create.status_code, 201)
        ws = res_create.json()
        ws_id = ws["id"]
        self.assertEqual(ws["name"], "ai-chan-core")
        self.assertEqual(ws["status"], "PENDING_VALIDATION")
        self.assertEqual(ws["user_id"], self.user_id)

        # 2. User 1 can list workspace
        res_list = self.client.get("/api/v1/orchestrator/workspaces", headers=self.headers_user1)
        self.assertEqual(res_list.status_code, 200)
        items = res_list.json()["items"]
        self.assertTrue(any(item["id"] == ws_id for item in items))

        # 3. User 2 (Anti-IDOR) MUST NOT see User 1's workspace
        res_list_u2 = self.client.get("/api/v1/orchestrator/workspaces", headers=self.headers_user2)
        self.assertEqual(res_list_u2.status_code, 200)
        items_u2 = res_list_u2.json()["items"]
        self.assertFalse(any(item["id"] == ws_id for item in items_u2))

        # 4. User 2 cannot get detail -> 404
        res_get_u2 = self.client.get(f"/api/v1/orchestrator/workspaces/{ws_id}", headers=self.headers_user2)
        self.assertEqual(res_get_u2.status_code, 404)

        # 5. User 2 cannot update -> 404
        res_put_u2 = self.client.put(
            f"/api/v1/orchestrator/workspaces/{ws_id}",
            json={"name": "Hacked Name"},
            headers=self.headers_user2
        )
        self.assertEqual(res_put_u2.status_code, 404)

        # 6. User 2 cannot delete -> 404
        res_del_u2 = self.client.delete(f"/api/v1/orchestrator/workspaces/{ws_id}", headers=self.headers_user2)
        self.assertEqual(res_del_u2.status_code, 404)

        # 7. User 1 can update
        res_update = self.client.put(
            f"/api/v1/orchestrator/workspaces/{ws_id}",
            json={"name": "ai-chan-updated", "default_branch": "develop"},
            headers=self.headers_user1
        )
        self.assertEqual(res_update.status_code, 200)
        self.assertEqual(res_update.json()["name"], "ai-chan-updated")
        self.assertEqual(res_update.json()["default_branch"], "develop")

        # 8. User 1 can toggle disable
        res_dis = self.client.post(f"/api/v1/orchestrator/workspaces/{ws_id}/disable", headers=self.headers_user1)
        self.assertEqual(res_dis.status_code, 200)
        self.assertEqual(res_dis.json()["status"], "DISABLED")

        # 9. User 1 can delete
        res_del = self.client.delete(f"/api/v1/orchestrator/workspaces/{ws_id}", headers=self.headers_user1)
        self.assertEqual(res_del.status_code, 200)

        # Verify deleted
        res_check = self.client.get(f"/api/v1/orchestrator/workspaces/{ws_id}", headers=self.headers_user1)
        self.assertEqual(res_check.status_code, 404)

    def test_workspace_validation_flow(self):
        # 1. Pair runner
        res_token = self.client.post("/api/v1/orchestrator/runners/pairing-token", json={}, headers=self.headers_user1)
        token = res_token.json()["pairing_token"]
        pair_res = self.client.post("/api/v1/orchestrator/runners/pair", json={
            "pairing_token": token,
            "name": "Val-Runner",
            "machine_name": "VAL-HOST",
            "platform": "windows",
            "architecture": "x86_64"
        }).json()
        runner_id = pair_res["runner_id"]
        runner_secret = pair_res["runner_secret"]

        # 2. Create workspace associated with runner
        res_ws = self.client.post(
            "/api/v1/orchestrator/workspaces",
            json={
                "name": "Validated Repo",
                "local_path": "C:\\Users\\PC\\Project\\ai-chan",
                "runner_id": runner_id
            },
            headers=self.headers_user1
        )
        self.assertEqual(res_ws.status_code, 201)
        ws_id = res_ws.json()["id"]

        # 3. Runner posts successful validation result
        val_res = self.client.post(
            f"/api/v1/orchestrator/runners/{runner_id}/validation-result",
            json={
                "workspace_id": ws_id,
                "is_valid": True,
                "is_git_repo": True,
                "default_branch": "main",
                "last_commit_hash": "17135ea78d461e892c9f99e3a35b1d5a7d32c91a",
                "has_uncommitted_changes": False
            },
            headers={"Authorization": f"Bearer {runner_secret}"}
        )
        self.assertEqual(val_res.status_code, 200)
        self.assertEqual(val_res.json()["status"], "READY")

        # 4. Verify workspace status is READY
        ws_detail = self.client.get(f"/api/v1/orchestrator/workspaces/{ws_id}", headers=self.headers_user1).json()
        self.assertEqual(ws_detail["status"], "READY")
        self.assertEqual(ws_detail["is_git_repo"], 1)
        self.assertEqual(ws_detail["last_commit_hash"], "17135ea78d461e892c9f99e3a35b1d5a7d32c91a")
        self.assertEqual(len(ws_detail["validations"]), 1)
        self.assertEqual(ws_detail["validations"][0]["status"], "SUCCESS")

        # 5. Runner posts failed validation (path not found)
        val_fail = self.client.post(
            f"/api/v1/orchestrator/runners/{runner_id}/validation-result",
            json={
                "workspace_id": ws_id,
                "is_valid": False,
                "is_git_repo": False,
                "error_message": "Directory not found on runner host"
            },
            headers={"Authorization": f"Bearer {runner_secret}"}
        )
        self.assertEqual(val_fail.status_code, 200)
        self.assertEqual(val_fail.json()["status"], "UNAVAILABLE")

        ws_detail2 = self.client.get(f"/api/v1/orchestrator/workspaces/{ws_id}", headers=self.headers_user1).json()
        self.assertEqual(ws_detail2["status"], "UNAVAILABLE")

if __name__ == "__main__":
    unittest.main()
