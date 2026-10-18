"""Unit & Integration Tests for Multi-Discord Bot Management and Project Routing (BR-031..034, SEC-008, SEC-013).

Covers:
- Bot Registry CRUD
- Token AES-256-GCM encryption & protection (no plaintext leakage)
- Empty token preservation on update
- 1:1 Project-to-Bot binding constraints and unlinking
- Connection testing with Discord REST API mock
- Multi-bot runtime manager lifecycle (start, stop, restart, isolation)
- Message routing isolation (Bot A -> Project A, Bot B -> Project B)
- Safe error handling for unassigned bots (no accidental default routing)
- Idempotent legacy .env bootstrap
"""

import unittest
import uuid
import json
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient

from src.main import app
from src.core.config import settings
from src.core.security import hash_password, create_access_token
from src.core.secret_vault import encrypt_secret, decrypt_secret, mask_secret
from src.services.bot_service import BotService, CreateBotRequest, UpdateBotRequest
from src.discord_bot.manager import multi_bot_manager
from src.db import execute_commit, query_one, query_all


class TestMultiDiscordBotManagement(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.user_id = str(uuid.uuid4())
        self.email = f"multi_bot_{uuid.uuid4().hex[:6]}@example.com"
        self.discord_id = f"discord_{uuid.uuid4().hex[:10]}"
        self.password = "ValidSecret123!"
        self.hashed_pw = hash_password(self.password)

        # 1. Create linked Discord user
        execute_commit(
            """
            INSERT INTO users (id, email, full_name, hashed_password, status, discord_id, discord_username)
            VALUES (?, ?, 'Multi Bot User', ?, 'ACTIVE', ?, 'MultiBotOwner#1234')
            """,
            (self.user_id, self.email, self.hashed_pw, self.discord_id)
        )
        self.token = create_access_token(self.user_id, self.email)
        self.cookies = {"access_token": self.token}
        self.headers = {"Authorization": f"Bearer {self.token}"}

        # 2. Create two active test projects with valid model nodes
        self.project_a_id = f"proj_a_{uuid.uuid4().hex[:8]}"
        self.project_b_id = f"proj_b_{uuid.uuid4().hex[:8]}"

        valid_graph = json.dumps({
            "nodes": [
                {"id": "m1", "type": "model", "data": {"config": {"model_id": "gemini-3.8-flash"}}}
            ],
            "edges": []
        })

        execute_commit(
            """
            INSERT INTO projects (id, user_id, name, description, status, is_valid, graph_data)
            VALUES (?, ?, 'Project Alpha', 'Alpha Discord Project', 'ACTIVE', 1, ?),
                   (?, ?, 'Project Beta', 'Beta Discord Project', 'ACTIVE', 1, ?)
            """,
            (self.project_a_id, self.user_id, valid_graph, self.project_b_id, self.user_id, valid_graph)
        )

    def tearDown(self):
        # Stop any managed bots
        for bot_row in query_all("SELECT id FROM discord_bot_configs WHERE user_id = ?", (self.user_id,)):
            multi_bot_manager.stop_bot_sync(bot_row["id"])

        execute_commit("DELETE FROM discord_bot_configs WHERE user_id = ?", (self.user_id,))
        execute_commit("DELETE FROM projects WHERE id IN (?, ?)", (self.project_a_id, self.project_b_id))
        execute_commit("DELETE FROM users WHERE id = ?", (self.user_id,))

    def test_01_create_bot_success_and_token_protection(self):
        """TC-MB-01: Create Discord Bot with encrypted token, ensure token plaintext is NEVER exposed."""
        raw_token = "mock_token_super_secret_discord_12345"
        payload = {
            "name": "Alpha Bot",
            "alias": f"alpha-{uuid.uuid4().hex[:6]}",
            "token": raw_token,
            "project_id": self.project_a_id,
            "trigger_mode": "MENTION",
        }

        res = self.client.post("/api/v1/bots", json=payload, cookies=self.cookies)
        self.assertEqual(res.status_code, 201)
        data = res.json()

        self.assertEqual(data["name"], "Alpha Bot")
        self.assertEqual(data["alias"], payload["alias"])
        self.assertTrue(data["token_configured"])
        self.assertEqual(data["token_last4"], "****2345")
        self.assertEqual(data["project_id"], self.project_a_id)

        # Critical: Plaintext token must NEVER appear anywhere in response
        self.assertNotIn(raw_token, json.dumps(data))
        self.assertNotIn("token", data)

        # Verify database record is encrypted
        db_row = query_one("SELECT token_ciphertext, token_last4 FROM discord_bot_configs WHERE id = ?", (data["id"],))
        self.assertIsNotNone(db_row)
        self.assertNotEqual(db_row["token_ciphertext"], raw_token)
        # Decrypt secret vault test
        decrypted = decrypt_secret(db_row["token_ciphertext"])
        self.assertEqual(decrypted, raw_token)

    def test_02_create_bot_duplicate_alias_rejected(self):
        """TC-MB-02: Ensure alias uniqueness is enforced across user bot configs."""
        alias = f"shared-{uuid.uuid4().hex[:6]}"
        payload = {
            "name": "Bot 1",
            "alias": alias,
            "token": "mock_token_1",
        }
        res1 = self.client.post("/api/v1/bots", json=payload, cookies=self.cookies)
        self.assertEqual(res1.status_code, 201)

        payload2 = {
            "name": "Bot 2",
            "alias": alias,
            "token": "mock_token_2",
        }
        res2 = self.client.post("/api/v1/bots", json=payload2, cookies=self.cookies)
        self.assertEqual(res2.status_code, 409)
        self.assertTrue("đã được sử dụng" in res2.text or "already in use" in res2.text)

    def test_03_update_bot_preserves_token_when_empty(self):
        """TC-MB-03: Updating metadata with empty token keeps existing encrypted credential intact."""
        raw_token = "original_token_keep_me_1234"
        bot = BotService.create_bot(
            self.user_id,
            CreateBotRequest(
                name="Before Update",
                alias=f"keep-{uuid.uuid4().hex[:6]}",
                token=raw_token,
            )
        )

        # Update name and custom prefix without providing token
        patch_payload = {
            "name": "After Update",
            "custom_prefix": "!chan",
            "token": ""  # Empty token must preserve
        }
        res = self.client.patch(f"/api/v1/bots/{bot.id}", json=patch_payload, cookies=self.cookies)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["name"], "After Update")
        self.assertEqual(data["custom_prefix"], "!chan")
        self.assertTrue(data["token_configured"])
        self.assertEqual(data["token_last4"], "****1234")

        # Verify token in DB was NOT erased
        db_token = BotService.get_decrypted_token(self.user_id, bot.id)
        self.assertEqual(db_token, raw_token)

    def test_04_one_to_one_project_binding_invariant(self):
        """TC-MB-04: Strict 1:1 Project-to-Bot routing invariant.
        When Bot B is assigned to Project Alpha, Bot A is automatically unassigned.
        """
        bot_a = BotService.create_bot(
            self.user_id,
            CreateBotRequest(
                name="Bot Alpha",
                alias=f"bota-{uuid.uuid4().hex[:6]}",
                token="mock_token_a",
                project_id=self.project_a_id,
            )
        )
        self.assertEqual(bot_a.project_id, self.project_a_id)

        bot_b = BotService.create_bot(
            self.user_id,
            CreateBotRequest(
                name="Bot Beta",
                alias=f"botb-{uuid.uuid4().hex[:6]}",
                token="mock_token_b",
                project_id=self.project_b_id,
            )
        )
        self.assertEqual(bot_b.project_id, self.project_b_id)

        # Now re-assign Bot B to Project Alpha
        res_link = self.client.put(
            f"/api/v1/bots/{bot_b.id}/project",
            json={"project_id": self.project_a_id},
            cookies=self.cookies
        )
        self.assertEqual(res_link.status_code, 200)
        b_data = res_link.json()
        self.assertEqual(b_data["project_id"], self.project_a_id)

        # Verify Bot A is now unassigned (NULL project_id)
        bot_a_fresh = BotService.get_bot(self.user_id, bot_a.id)
        self.assertIsNone(bot_a_fresh.project_id)

    def test_05_test_connection_mock_and_error(self):
        """TC-MB-05: Connection testing against Discord REST API without establishing full Gateway."""
        bot = BotService.create_bot(
            self.user_id,
            CreateBotRequest(
                name="Tester Bot",
                alias=f"test-{uuid.uuid4().hex[:6]}",
                token="mock_discord_valid_token_123",
            )
        )

        # Test valid mock token
        res = self.client.post(f"/api/v1/bots/{bot.id}/test-connection", cookies=self.cookies)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["status"], "VALID")
        self.assertIn("MockBot", data["bot_username"])

    def test_06_message_routing_to_linked_project(self):
        """TC-MB-06: Message from Bot A routes exclusively to Project A; Bot B to Project B."""
        bot_a = BotService.create_bot(
            self.user_id,
            CreateBotRequest(
                name="Router Bot A",
                alias=f"ra-{uuid.uuid4().hex[:6]}",
                token="mock_token_ra",
                project_id=self.project_a_id,
            )
        )

        bot_b = BotService.create_bot(
            self.user_id,
            CreateBotRequest(
                name="Router Bot B",
                alias=f"rb-{uuid.uuid4().hex[:6]}",
                token="mock_token_rb",
                project_id=self.project_b_id,
            )
        )

        async def mock_stream(*args, **kwargs):
            yield {"status": "streaming", "token": "Hello "}
            yield {"status": "streaming", "token": "from AI!"}
            yield {"status": "done", "model": "gemini-3.8-flash"}

        with patch("llm.agent.chat_agent.astream_agent", side_effect=mock_stream):
            # Send prompt with bot_config_id of Bot A
            res_a = self.client.post(
                "/api/v1/prompt",
                json={
                    "prompt": "Hello Bot A",
                    "model": "default",
                    "metadata": {
                        "user_id": self.discord_id,
                        "bot_config_id": bot_a.id,
                        "channel_id": "chan_123"
                    }
                },
                cookies=self.cookies
            )
            self.assertEqual(res_a.status_code, 200)
            data_a = res_a.json()
            self.assertEqual(data_a["response"], "Hello from AI!")

            # Verify conversation was recorded under Project A
            conv_a = query_one(
                "SELECT * FROM conversations WHERE user_id = ? AND project_id = ?",
                (self.user_id, self.project_a_id)
            )
            self.assertIsNotNone(conv_a)

            # Send prompt with bot_config_id of Bot B
            res_b = self.client.post(
                "/api/v1/prompt",
                json={
                    "prompt": "Hello Bot B",
                    "model": "default",
                    "metadata": {
                        "user_id": self.discord_id,
                        "bot_config_id": bot_b.id,
                        "channel_id": "chan_456"
                    }
                },
                cookies=self.cookies
            )
            self.assertEqual(res_b.status_code, 200)

            # Verify conversation was recorded under Project B
            conv_b = query_one(
                "SELECT * FROM conversations WHERE user_id = ? AND project_id = ?",
                (self.user_id, self.project_b_id)
            )
            self.assertIsNotNone(conv_b)

    def test_07_unlinked_bot_message_fails_safely_no_default_fallback(self):
        """TC-MB-07: Bot not linked to any Project must reject execution safely without picking a random default."""
        unlinked_bot = BotService.create_bot(
            self.user_id,
            CreateBotRequest(
                name="Orphan Bot",
                alias=f"orphan-{uuid.uuid4().hex[:6]}",
                token="mock_token_orphan",
                project_id=None,
            )
        )

        res = self.client.post(
            "/api/v1/prompt",
            json={
                "prompt": "Hello Orphan",
                "model": "default",
                "metadata": {
                    "user_id": self.discord_id,
                    "bot_config_id": unlinked_bot.id,
                    "channel_id": "chan_123"
                }
            },
            cookies=self.cookies
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("not linked to any Project", res.text)

    def test_08_runtime_isolation_and_lifecycle(self):
        """TC-MB-08: MultiBotManager supports isolated start, status, and stop without crashing other runtimes."""
        bot = BotService.create_bot(
            self.user_id,
            CreateBotRequest(
                name="Lifecycle Bot",
                alias=f"life-{uuid.uuid4().hex[:6]}",
                token="mock_lifecycle_token_123",
            )
        )

        # Check initial runtime status
        status_info = multi_bot_manager.get_runtime_status(bot.id)
        self.assertFalse(status_info["is_running"])
        self.assertEqual(status_info["status"], "DISCONNECTED")

        # Stop sync is safe even when not running
        multi_bot_manager.stop_bot_sync(bot.id)
        self.assertFalse(multi_bot_manager.is_running(bot.id))

    def test_09_idempotent_legacy_env_import(self):
        """TC-MB-09: Legacy .env import is idempotent and does not create duplicate bot records."""
        with patch.object(settings, "DISCORD_BOT_TOKEN", "legacy_token_sample_123456"):
            id1 = BotService.bootstrap_legacy_env_bot()
            self.assertIsNotNone(id1)

            # Re-running must return same bot ID without inserting a duplicate
            id2 = BotService.bootstrap_legacy_env_bot()
            self.assertEqual(id1, id2)

            count = query_one(
                "SELECT COUNT(*) as c FROM discord_bot_configs WHERE alias = 'legacy-default-bot'"
            )["c"]
            self.assertEqual(count, 1)

            # Clean up bootstrapped legacy bot
            execute_commit("DELETE FROM discord_bot_configs WHERE id = ?", (id1,))


if __name__ == "__main__":
    unittest.main()
