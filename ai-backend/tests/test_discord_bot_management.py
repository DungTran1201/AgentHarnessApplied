import unittest
import sys
import uuid
import time
from pathlib import Path
from fastapi.testclient import TestClient
from cryptography.hazmat.primitives.asymmetric import ed25519

# Add src and parent to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.main import app
from src.core.config import settings
from src.core.security import hash_password, create_access_token
from src.core.telemetry import quota_manager
from src.db import execute_commit, query_one, query_all

class TestDiscordBotManagement(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        
        # 1. Tạo người dùng đã liên kết Discord
        self.linked_user_id = str(uuid.uuid4())
        self.linked_email = f"linked_bot_{uuid.uuid4().hex[:6]}@example.com"
        self.linked_discord_id = f"discord_{uuid.uuid4().hex[:10]}"
        self.password = "ValidSecret123!"
        self.hashed_pw = hash_password(self.password)

        execute_commit(
            """
            INSERT INTO users (id, email, full_name, hashed_password, status, discord_id, discord_username)
            VALUES (?, ?, 'Linked Discord User', ?, 'ACTIVE', ?, 'DiscordUser#1234')
            """,
            (self.linked_user_id, self.linked_email, self.hashed_pw, self.linked_discord_id)
        )
        self.linked_token = create_access_token(self.linked_user_id, self.linked_email)
        self.linked_cookies = {"access_token": self.linked_token}

        # Khởi tạo Quota
        quota_manager.get_or_create_quota(self.linked_user_id)

        # 2. Tạo người dùng CHƯA liên kết Discord (để kiểm tra BR-031 / TC-040)
        self.unlinked_user_id = str(uuid.uuid4())
        self.unlinked_email = f"unlinked_{uuid.uuid4().hex[:6]}@example.com"
        execute_commit(
            """
            INSERT INTO users (id, email, full_name, hashed_password, status, discord_id, discord_username)
            VALUES (?, ?, 'Unlinked User', ?, 'ACTIVE', NULL, NULL)
            """,
            (self.unlinked_user_id, self.unlinked_email, self.hashed_pw)
        )
        self.unlinked_token = create_access_token(self.unlinked_user_id, self.unlinked_email)
        self.unlinked_cookies = {"access_token": self.unlinked_token}

    def tearDown(self):
        # Dọn dẹp dữ liệu kiểm thử
        execute_commit("DELETE FROM discord_bot_configs WHERE user_id IN (?, ?)", (self.linked_user_id, self.unlinked_user_id))
        execute_commit("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id IN (?, ?))", (self.linked_user_id, self.unlinked_user_id))
        execute_commit("DELETE FROM conversations WHERE user_id IN (?, ?)", (self.linked_user_id, self.unlinked_user_id))
        execute_commit("DELETE FROM api_metric_logs WHERE user_id IN (?, ?)", (self.linked_user_id, self.unlinked_user_id))
        execute_commit("DELETE FROM user_quotas WHERE user_id IN (?, ?)", (self.linked_user_id, self.unlinked_user_id))
        execute_commit("DELETE FROM users WHERE id IN (?, ?)", (self.linked_user_id, self.unlinked_user_id))
        execute_commit("DELETE FROM models WHERE id LIKE 'test_%'")

    def test_bot_config_requires_discord_linked(self):
        """TC-040: Từ chối truy cập cấu hình bot khi tài khoản chưa liên kết Discord (BR-031)."""
        # GET /api/v1/bot/discord/config
        res_get = self.client.get("/api/v1/bot/discord/config", cookies=self.unlinked_cookies)
        self.assertEqual(res_get.status_code, 403)
        self.assertIn("DISCORD_NOT_LINKED", res_get.text)

        # PUT /api/v1/bot/discord/config
        res_put = self.client.put(
            "/api/v1/bot/discord/config",
            json={"trigger_mode": "MENTION"},
            cookies=self.unlinked_cookies
        )
        self.assertEqual(res_put.status_code, 403)
        self.assertIn("DISCORD_NOT_LINKED", res_put.text)

        # GET /api/v1/bot/discord/guilds
        res_guilds = self.client.get("/api/v1/bot/discord/guilds", cookies=self.unlinked_cookies)
        self.assertEqual(res_guilds.status_code, 403)

        # POST /api/v1/bot/discord/test-dispatch
        res_dispatch = self.client.post(
            "/api/v1/bot/discord/test-dispatch",
            json={"query": "Hello world"},
            cookies=self.unlinked_cookies
        )
        self.assertEqual(res_dispatch.status_code, 403)

    def test_get_and_update_bot_config_success(self):
        """TC-039: Đọc và cập nhật cấu hình Discord bot thành công cho người dùng đã liên kết (OP-031, OP-032)."""
        # 1. GET ban đầu -> tự động khởi tạo cấu hình mặc định
        res_get = self.client.get("/api/v1/bot/discord/config", cookies=self.linked_cookies)
        self.assertEqual(res_get.status_code, 200)
        data = res_get.json()
        self.assertEqual(data["user_id"], self.linked_user_id)
        self.assertTrue(data["is_enabled"])
        self.assertEqual(data["trigger_mode"], "MENTION")

        # 2. PUT cập nhật cấu hình
        new_payload = {
            "guild_id": "112233445566778899",
            "guild_name": "Official Community Hub",
            "trigger_mode": "PREFIX",
            "custom_prefix": "!chan",
            "system_prompt": "You are AI-Chan with witty persona.",
            "max_tokens_per_response": 1200,
            "is_enabled": True,
            "sync_to_web": True
        }
        res_put = self.client.put("/api/v1/bot/discord/config", json=new_payload, cookies=self.linked_cookies)
        self.assertEqual(res_put.status_code, 200)
        updated = res_put.json()
        self.assertEqual(updated["guild_id"], "112233445566778899")
        self.assertEqual(updated["guild_name"], "Official Community Hub")
        self.assertEqual(updated["trigger_mode"], "PREFIX")
        self.assertEqual(updated["custom_prefix"], "!chan")
        self.assertEqual(updated["max_tokens_per_response"], 1200)

        # 3. Kiểm tra DB lưu trữ thực tế
        db_cfg = query_one("SELECT * FROM discord_bot_configs WHERE user_id = ?", (self.linked_user_id,))
        self.assertIsNotNone(db_cfg)
        self.assertEqual(db_cfg["custom_prefix"], "!chan")
        self.assertEqual(db_cfg["max_tokens_per_response"], 1200)

    def test_reject_inactive_model_on_config_update(self):
        """BR-033: Từ chối lưu cấu hình khi active_model_id không tồn tại hoặc mang trạng thái INACTIVE."""
        # Chèn mô hình không hoạt động
        test_model_id = f"test_inactive_{uuid.uuid4().hex[:6]}"
        execute_commit(
            """
            INSERT INTO models (id, name, provider, status, is_default)
            VALUES (?, 'Inactive Test Model', 'google', 'INACTIVE', 0)
            """,
            (test_model_id,)
        )

        res = self.client.put(
            "/api/v1/bot/discord/config",
            json={"active_model_id": test_model_id},
            cookies=self.linked_cookies
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("ACTIVE", res.text)

    def test_guild_admin_permission_filtering(self):
        """BR-034: Kiểm tra khám phá máy chủ phân quyền bitwise và từ chối máy chủ không có quyền."""
        # 1. GET /api/v1/bot/discord/guilds
        res = self.client.get("/api/v1/bot/discord/guilds", cookies=self.linked_cookies)
        self.assertEqual(res.status_code, 200)
        guilds = res.json()
        self.assertGreaterEqual(len(guilds), 1)

        for g in guilds:
            ADMINISTRATOR = 0x8
            MANAGE_GUILD = 0x20
            expected_admin = bool((g["permissions"] & ADMINISTRATOR) or (g["permissions"] & MANAGE_GUILD))
            self.assertEqual(g["has_admin_rights"], expected_admin)

        # 2. Cố tình gửi cấu hình với guild không có quyền
        res_invalid = self.client.put(
            "/api/v1/bot/discord/config",
            json={"guild_id": "unauthorized_guild_123"},
            cookies=self.linked_cookies
        )
        self.assertEqual(res_invalid.status_code, 403)
        self.assertIn("BR-034", res_invalid.text)

    def test_quota_enforcement_and_rejection_upon_exhaustion(self):
        """TC-041 / BR-032: Kiểm tra dùng chung quota và từ chối HTTP 429 khi người dùng cạn kiệt token trong ngày."""
        # 1. Ép quota chạm ngưỡng 100%
        quota = quota_manager.get_or_create_quota(self.linked_user_id)
        limit = quota["daily_token_limit"]
        execute_commit(
            "UPDATE user_quotas SET daily_tokens_used = ? WHERE user_id = ?",
            (limit, self.linked_user_id)
        )

        # 2. Gửi lệnh tương tác bot
        res = self.client.post(
            "/api/v1/bot/discord/test-dispatch",
            json={"query": "Hỏi câu thử nghiệm khi hết quota"},
            cookies=self.linked_cookies
        )
        self.assertEqual(res.status_code, 429)
        self.assertIn("BR-032", res.text)

        # 3. Xác nhận metric log ghi nhận 429
        log = query_one(
            "SELECT status_code, error_code FROM api_metric_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
            (self.linked_user_id,)
        )
        self.assertIsNotNone(log)
        self.assertEqual(log["status_code"], 429)
        self.assertEqual(log["error_code"], "DAILY_QUOTA_EXCEEDED")

    def test_automatic_failover_to_default_model(self):
        """TC-042 / BR-033: Tự động failover về mô hình mặc định khi mô hình chỉ định không khả dụng."""
        # 1. Chèn mô hình mang trạng thái INACTIVE để kiểm tra failover (BR-033)
        test_inactive_model = f"test_inact_{uuid.uuid4().hex[:6]}"
        execute_commit(
            """
            INSERT INTO models (id, name, provider, status, is_default)
            VALUES (?, 'Test Inactive Model', 'google', 'INACTIVE', 0)
            """,
            (test_inactive_model,)
        )

        execute_commit(
            """
            INSERT OR REPLACE INTO discord_bot_configs (id, user_id, active_model_id, is_enabled, sync_to_web)
            VALUES (?, ?, ?, 1, 1)
            """,
            (str(uuid.uuid4()), self.linked_user_id, test_inactive_model)
        )

        # 2. Gửi lệnh dispatch
        res = self.client.post(
            "/api/v1/bot/discord/test-dispatch",
            json={"query": "Thử nghiệm tự động failover mô hình", "model_id": test_inactive_model},
            cookies=self.linked_cookies
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertTrue(data["is_fallback"])
        # Mô hình failover phải là mô hình mặc định hoạt động
        self.assertNotEqual(data["model_used"], test_inactive_model)

    def test_discord_to_web_history_sync(self):
        """FR-047 / UC-BOT-003: Đồng bộ lịch sử trò chuyện Discord sang Web với cờ source = 'DISCORD'."""
        # 1. Đảm bảo bot bật và có tên guild
        self.client.put(
            "/api/v1/bot/discord/config",
            json={
                "guild_id": "8877665544",
                "guild_name": "AI-Chan Alpha Server",
                "is_enabled": True,
                "sync_to_web": True
            },
            cookies=self.linked_cookies
        )

        # 2. Gửi test dispatch
        prompt_text = "Hỏi bot kiểm tra đồng bộ lịch sử hội thoại"
        res = self.client.post(
            "/api/v1/bot/discord/test-dispatch",
            json={"query": prompt_text},
            cookies=self.linked_cookies
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["web_synced"])
        conv_id = data["conversation_id"]
        self.assertIsNotNone(conv_id)

        # 3. Kiểm tra conversation trong DB
        conv = query_one("SELECT * FROM conversations WHERE id = ?", (conv_id,))
        self.assertIsNotNone(conv)
        self.assertIn("Discord Bot: AI-Chan Alpha Server", conv["title"])

        # 4. Kiểm tra messages trong DB bảo đảm thứ tự chèn (user trước, assistant sau)
        msgs = query_all("SELECT role, content, source FROM messages WHERE conversation_id = ? ORDER BY rowid ASC", (conv_id,))
        self.assertEqual(len(msgs), 2)
        self.assertEqual(msgs[0]["role"], "user")
        self.assertEqual(msgs[0]["content"], prompt_text)
        self.assertEqual(msgs[0]["source"], "DISCORD")
        self.assertEqual(msgs[1]["role"], "assistant")
        self.assertEqual(msgs[1]["source"], "DISCORD")

    def test_ed25519_signature_verification_security(self):
        """SEC-013 / CTRL-012: Kiểm tra xác thực chữ ký số Ed25519 cho Discord Webhook Interaction."""
        # 1. Tạo cặp khóa Ed25519 ngẫu nhiên
        private_key = ed25519.Ed25519PrivateKey.generate()
        public_key = private_key.public_key()
        pub_bytes = public_key.public_bytes_raw()
        pub_hex = pub_bytes.hex()

        # Giả lập settings.DISCORD_PUBLIC_KEY
        original_key = settings.DISCORD_PUBLIC_KEY
        settings.DISCORD_PUBLIC_KEY = pub_hex

        try:
            timestamp = str(int(time.time()))
            body = b'{"type": 1}'
            signature = private_key.sign(timestamp.encode("utf-8") + body).hex()

            # A. Chữ ký hợp lệ -> 200 OK với Pong {"type": 1}
            headers = {
                "X-Signature-Ed25519": signature,
                "X-Signature-Timestamp": timestamp,
                "Content-Type": "application/json"
            }
            res_valid = self.client.post("/api/v1/bot/discord/interactions", content=body, headers=headers)
            self.assertEqual(res_valid.status_code, 200)
            self.assertEqual(res_valid.json(), {"type": 1})

            # B. Chữ ký sai hoặc giả mạo -> 401 Unauthorized
            bad_headers = {
                "X-Signature-Ed25519": "0" * 128,
                "X-Signature-Timestamp": timestamp,
                "Content-Type": "application/json"
            }
            res_invalid = self.client.post("/api/v1/bot/discord/interactions", content=body, headers=bad_headers)
            self.assertEqual(res_invalid.status_code, 401)
        finally:
            settings.DISCORD_PUBLIC_KEY = original_key

if __name__ == "__main__":
    unittest.main()
