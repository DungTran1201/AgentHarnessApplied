import unittest
import sys
import uuid
from unittest.mock import patch
from pathlib import Path
from fastapi.testclient import TestClient

# Add src and parent to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.main import app
from src.core.security import hash_password, create_access_token, generate_oauth_state
from src.db import execute_commit, query_one

class TestDiscordAccountLinking(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        
        # Tạo Người dùng A (Có mật khẩu)
        self.user_a_id = str(uuid.uuid4())
        self.user_a_email = f"user_a_{uuid.uuid4().hex[:8]}@example.com"
        self.user_a_password = "SecretPassword123!"
        self.user_a_hashed = hash_password(self.user_a_password)
        execute_commit(
            """
            INSERT INTO users (id, email, full_name, hashed_password, status)
            VALUES (?, ?, 'User A Test', ?, 'ACTIVE')
            """,
            (self.user_a_id, self.user_a_email, self.user_a_hashed)
        )
        self.token_a = create_access_token(self.user_a_id, self.user_a_email)
        self.cookies_a = {"access_token": self.token_a}

        # Tạo Người dùng B (Đã liên kết Discord ID "discord_existing_999")
        self.user_b_id = str(uuid.uuid4())
        self.user_b_email = f"user_b_{uuid.uuid4().hex[:8]}@example.com"
        self.user_b_hashed = hash_password("PasswordB123!")
        execute_commit(
            """
            INSERT INTO users (id, email, full_name, hashed_password, discord_id, discord_username, status)
            VALUES (?, ?, 'User B Test', ?, 'discord_existing_999', 'ExistingDiscordUser', 'ACTIVE')
            """,
            (self.user_b_id, self.user_b_email, self.user_b_hashed)
        )
        self.token_b = create_access_token(self.user_b_id, self.user_b_email)
        self.cookies_b = {"access_token": self.token_b}

        # Tạo Người dùng C (Đăng ký qua Discord, Mật khẩu NULL - BR-018)
        self.user_c_id = str(uuid.uuid4())
        self.user_c_email = f"user_c_{uuid.uuid4().hex[:8]}@example.com"
        execute_commit(
            """
            INSERT INTO users (id, email, full_name, hashed_password, discord_id, discord_username, status)
            VALUES (?, ?, 'User C Test', NULL, 'discord_c_111', 'DiscordUserC', 'ACTIVE')
            """,
            (self.user_c_id, self.user_c_email)
        )
        self.token_c = create_access_token(self.user_c_id, self.user_c_email)
        self.cookies_c = {"access_token": self.token_c}

    def tearDown(self):
        execute_commit(
            "DELETE FROM users WHERE id IN (?, ?, ?)",
            (self.user_a_id, self.user_b_id, self.user_c_id)
        )

    # --------------------------------------------------------------------------
    # OP-029 / FR-042: Kiểm tra endpoint lấy trạng thái liên kết
    # --------------------------------------------------------------------------
    def test_get_connections_endpoint(self):
        # User A chưa liên kết Discord, có mật khẩu
        resp_a = self.client.get("/api/v1/users/me/connections", cookies=self.cookies_a)
        self.assertEqual(resp_a.status_code, 200)
        data_a = resp_a.json()
        self.assertTrue(data_a["has_password"])
        self.assertFalse(data_a["connections"]["discord"]["connected"])
        self.assertIsNone(data_a["connections"]["discord"]["discord_id"])

        # User B đã liên kết Discord, có mật khẩu
        resp_b = self.client.get("/api/v1/users/me/connections", cookies=self.cookies_b)
        self.assertEqual(resp_b.status_code, 200)
        data_b = resp_b.json()
        self.assertTrue(data_b["has_password"])
        self.assertTrue(data_b["connections"]["discord"]["connected"])
        self.assertEqual(data_b["connections"]["discord"]["discord_id"], "discord_existing_999")
        self.assertEqual(data_b["connections"]["discord"]["discord_username"], "ExistingDiscordUser")

        # User C đã liên kết Discord, KHÔNG có mật khẩu (has_password = False)
        resp_c = self.client.get("/api/v1/users/me/connections", cookies=self.cookies_c)
        self.assertEqual(resp_c.status_code, 200)
        data_c = resp_c.json()
        self.assertFalse(data_c["has_password"])
        self.assertTrue(data_c["connections"]["discord"]["connected"])

    # --------------------------------------------------------------------------
    # OP-026 / FR-040: Khởi tạo luồng liên kết
    # --------------------------------------------------------------------------
    def test_initiate_discord_link_success(self):
        resp = self.client.get("/api/v1/auth/discord/link", cookies=self.cookies_a)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("authorization_url", data)
        self.assertIn("state", data)
        self.assertIn("oauth_state", resp.cookies)

    def test_initiate_discord_link_already_linked_rejected(self):
        # User B đã có discord_id -> Bị từ chối HTTP 400
        resp = self.client.get("/api/v1/auth/discord/link", cookies=self.cookies_b)
        self.assertEqual(resp.status_code, 400)
        self.assertIn("đã có liên kết Discord", resp.json()["detail"])

    # --------------------------------------------------------------------------
    # TC-031 / FR-040: Liên kết Discord thành công cho người dùng đã đăng nhập
    # --------------------------------------------------------------------------
    def test_tc_031_link_discord_success(self):
        # 1. User A khởi tạo liên kết
        init_resp = self.client.get("/api/v1/auth/discord/link", cookies=self.cookies_a)
        state = init_resp.json()["state"]
        cookie_state = init_resp.cookies.get("oauth_state")

        # 2. Mock hồ sơ Discord trả về một discord_id mới chưa ai dùng
        mock_profile = {
            "id": "discord_new_user_12345",
            "username": "NewDiscordUser",
            "email": "discord.fresh@example.com",
            "verified": True,
            "avatar": None
        }

        # 3. Callback với state và code
        self.client.cookies.set("oauth_state", cookie_state)
        with patch("src.api.v1.auth.fetch_discord_user_profile", return_value=mock_profile):
            callback_resp = self.client.get(
                f"/api/v1/auth/discord/callback?code=mock_code_link&state={state}",
                follow_redirects=False
            )

        # 4. Kiểm tra redirect về trang cài đặt thành công
        self.assertEqual(callback_resp.status_code, 307)
        self.assertIn("/settings?tab=connections&status=linked_success", callback_resp.headers.get("Location", ""))

        # 5. Kiểm tra CSDL bản ghi User A đã có discord_id mới
        user = query_one("SELECT discord_id, discord_username FROM users WHERE id = ?", (self.user_a_id,))
        self.assertEqual(user["discord_id"], "discord_new_user_12345")
        self.assertEqual(user["discord_username"], "NewDiscordUser")

    # --------------------------------------------------------------------------
    # TC-032 / BR-025: Từ chối liên kết khi Discord ID đã thuộc tài khoản khác (Conflict)
    # --------------------------------------------------------------------------
    def test_tc_032_link_discord_conflict_rejection(self):
        # User A cố liên kết với tài khoản Discord đã được gắn với User B ("discord_existing_999")
        init_resp = self.client.get("/api/v1/auth/discord/link", cookies=self.cookies_a)
        state = init_resp.json()["state"]
        cookie_state = init_resp.cookies.get("oauth_state")

        mock_profile = {
            "id": "discord_existing_999",  # Trùng với User B
            "username": "ExistingDiscordUser",
            "email": "user_b_discord@example.com",
            "verified": True
        }

        self.client.cookies.set("oauth_state", cookie_state)
        with patch("src.api.v1.auth.fetch_discord_user_profile", return_value=mock_profile):
            callback_resp = self.client.get(
                f"/api/v1/auth/discord/callback?code=mock_code_conflict&state={state}",
                follow_redirects=False
            )

        # Kiểm tra redirect về settings kèm lỗi discord_already_linked (BR-025)
        self.assertEqual(callback_resp.status_code, 307)
        self.assertIn("error=discord_already_linked", callback_resp.headers.get("Location", ""))

        # Xác minh User A vẫn chưa bị ghi đè discord_id
        user_a = query_one("SELECT discord_id FROM users WHERE id = ?", (self.user_a_id,))
        self.assertIsNone(user_a["discord_id"])

    # --------------------------------------------------------------------------
    # TC-033 / FR-041 / BR-027: Hủy liên kết an toàn thành công với xác thực mật khẩu
    # --------------------------------------------------------------------------
    def test_tc_033_unlink_discord_success(self):
        # User B có mật khẩu và đã liên kết Discord -> Gửi yêu cầu hủy với đúng mật khẩu
        resp = self.client.request(
            "DELETE",
            "/api/v1/users/me/discord",
            json={"password": "PasswordB123!"},
            cookies=self.cookies_b
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("Hủy liên kết tài khoản Discord thành công", data["message"])
        self.assertIsNone(data["discord_id"])

        # Kiểm tra CSDL bản ghi User B đã gỡ discord_id thành NULL
        user_b = query_one("SELECT discord_id, discord_username FROM users WHERE id = ?", (self.user_b_id,))
        self.assertIsNone(user_b["discord_id"])
        self.assertIsNone(user_b["discord_username"])

    # --------------------------------------------------------------------------
    # TC-034 / BR-026: Chốt chặn từ chối hủy liên kết khi tài khoản chưa có mật khẩu
    # --------------------------------------------------------------------------
    def test_tc_034_unlink_discord_lockout_prevention(self):
        # User C không có mật khẩu (hashed_password IS NULL) -> Phải bị từ chối với HTTP 400
        resp = self.client.request(
            "DELETE",
            "/api/v1/users/me/discord",
            json={"password": "AnyRandomPassword123!"},
            cookies=self.cookies_c
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("chưa thiết lập mật khẩu đăng nhập", resp.json()["detail"])
        self.assertIn("BR-026", resp.json()["detail"])

        # Đảm bảo liên kết Discord của User C vẫn được giữ nguyên để không mất tài khoản
        user_c = query_one("SELECT discord_id FROM users WHERE id = ?", (self.user_c_id,))
        self.assertEqual(user_c["discord_id"], "discord_c_111")

    # --------------------------------------------------------------------------
    # BR-027: Từ chối hủy liên kết khi nhập sai mật khẩu (HTTP 401)
    # --------------------------------------------------------------------------
    def test_unlink_discord_wrong_password_rejection(self):
        resp = self.client.request(
            "DELETE",
            "/api/v1/users/me/discord",
            json={"password": "IncorrectPassword999!"},
            cookies=self.cookies_b
        )
        self.assertEqual(resp.status_code, 401)
        self.assertIn("Mật khẩu xác nhận không chính xác", resp.json()["detail"])

        # Bản ghi vẫn được giữ nguyên
        user_b = query_one("SELECT discord_id FROM users WHERE id = ?", (self.user_b_id,))
        self.assertEqual(user_b["discord_id"], "discord_existing_999")

    # --------------------------------------------------------------------------
    # Từ chối khi tài khoản chưa từng liên kết Discord (HTTP 400)
    # --------------------------------------------------------------------------
    def test_unlink_discord_not_linked_rejection(self):
        resp = self.client.request(
            "DELETE",
            "/api/v1/users/me/discord",
            json={"password": self.user_a_password},
            cookies=self.cookies_a
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("chưa liên kết với Discord", resp.json()["detail"])


if __name__ == "__main__":
    unittest.main()
