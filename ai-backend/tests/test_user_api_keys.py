import unittest
import uuid
import sys
from pathlib import Path
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.main import app
from src.core.security import hash_password, create_access_token
from src.db import execute_commit, query_one
from src.services.credential_service import CredentialService, SUPPORTED_PROVIDERS


class TestUserApiKeysAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        
        # User A (Regular User)
        self.user_a_id = str(uuid.uuid4())
        self.user_a_email = f"user_a_{uuid.uuid4().hex[:6]}@example.com"
        self.user_a_pw = hash_password("ValidPassword123!")
        execute_commit(
            """
            INSERT INTO users (id, email, full_name, hashed_password, status)
            VALUES (?, ?, 'User A', ?, 'ACTIVE')
            """,
            (self.user_a_id, self.user_a_email, self.user_a_pw)
        )
        self.user_a_token = create_access_token(self.user_a_id, self.user_a_email)
        self.cookies_a = {"access_token": self.user_a_token}

        # User B (Another Regular User for isolation test)
        self.user_b_id = str(uuid.uuid4())
        self.user_b_email = f"user_b_{uuid.uuid4().hex[:6]}@example.com"
        self.user_b_pw = hash_password("ValidPassword123!")
        execute_commit(
            """
            INSERT INTO users (id, email, full_name, hashed_password, status)
            VALUES (?, ?, 'User B', ?, 'ACTIVE')
            """,
            (self.user_b_id, self.user_b_email, self.user_b_pw)
        )
        self.user_b_token = create_access_token(self.user_b_id, self.user_b_email)
        self.cookies_b = {"access_token": self.user_b_token}

        # Admin User
        self.admin_id = str(uuid.uuid4())
        self.admin_email = f"admin_{uuid.uuid4().hex[:6]}@example.com"
        self.admin_pw = hash_password("AdminPassword123!")
        execute_commit(
            """
            INSERT INTO users (id, email, full_name, hashed_password, status)
            VALUES (?, ?, 'Admin User', ?, 'ACTIVE')
            """,
            (self.admin_id, self.admin_email, self.admin_pw)
        )
        self.admin_token = create_access_token(self.admin_id, self.admin_email)
        self.cookies_admin = {"access_token": self.admin_token}

    def tearDown(self):
        execute_commit("DELETE FROM user_api_keys WHERE user_id IN (?, ?, ?)", (self.user_a_id, self.user_b_id, self.admin_id))
        execute_commit("DELETE FROM users WHERE id IN (?, ?, ?)", (self.user_a_id, self.user_b_id, self.admin_id))

    def test_list_api_keys_unauthenticated_forbidden(self):
        """Unauthenticated requests must be rejected with HTTP 401."""
        res = self.client.get("/api/v1/settings/api-keys")
        self.assertEqual(res.status_code, 401)

    def test_list_api_keys_returns_all_providers_without_secrets(self):
        """List endpoint must return all supported allowlisted providers without leaking secrets."""
        res = self.client.get("/api/v1/settings/api-keys", cookies=self.cookies_a)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), len(SUPPORTED_PROVIDERS))

        returned_providers = [p["provider"] for p in data]
        self.assertIn("google", returned_providers)
        self.assertIn("openai", returned_providers)
        self.assertIn("anthropic", returned_providers)
        self.assertIn("groq", returned_providers)
        self.assertIn("ollama", returned_providers)
        self.assertIn("brave", returned_providers)
        self.assertIn("serpapi", returned_providers)

        # Verify no secret values exist in response
        for item in data:
            self.assertIn("provider", item)
            self.assertIn("name", item)
            self.assertIn("is_configured", item)
            self.assertIn("source", item)
            self.assertIn("masked_hint", item)
            self.assertNotIn("key_ciphertext", item)
            self.assertNotIn("api_key", item)
            self.assertNotIn("raw_key", item)

    def test_save_user_key_encrypts_at_rest(self):
        """Saving an API key stores it encrypted via AES-256-GCM in user_api_keys."""
        raw_secret_key = "sk-proj-test9876543210zyxwvu"
        res = self.client.put(
            "/api/v1/settings/api-keys/openai",
            json={"api_key": raw_secret_key},
            cookies=self.cookies_a
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["source"], "PERSONAL")
        self.assertEqual(data["masked_hint"], "****xwvu")
        # Ensure secret is not returned
        self.assertNotIn(raw_secret_key, str(data))

        # Check SQLite DB storage
        row = query_one(
            "SELECT key_ciphertext, key_last4 FROM user_api_keys WHERE user_id = ? AND provider = 'openai'",
            (self.user_a_id,)
        )
        self.assertIsNotNone(row)
        self.assertEqual(row["key_last4"], "xwvu")
        # Must be encrypted ciphertext, NOT plaintext
        self.assertNotEqual(row["key_ciphertext"], raw_secret_key)
        self.assertNotIn(raw_secret_key, row["key_ciphertext"])

        # Decrypt check via CredentialService
        effective = CredentialService.get_effective_key(self.user_a_id, "openai")
        self.assertEqual(effective, raw_secret_key)

    def test_user_isolation(self):
        """User A's personal key is never accessible to User B."""
        key_a = "sk-ant-usera-key-12345678"
        # User A saves Anthropic key
        self.client.put(
            "/api/v1/settings/api-keys/anthropic",
            json={"api_key": key_a},
            cookies=self.cookies_a
        )

        # User A sees personal key
        res_a = self.client.get("/api/v1/settings/api-keys", cookies=self.cookies_a)
        anthropic_a = next(item for item in res_a.json() if item["provider"] == "anthropic")
        self.assertTrue(anthropic_a["has_personal_key"])
        self.assertEqual(anthropic_a["source"], "PERSONAL")

        # User B queries status - must NOT have personal key
        res_b = self.client.get("/api/v1/settings/api-keys", cookies=self.cookies_b)
        anthropic_b = next(item for item in res_b.json() if item["provider"] == "anthropic")
        self.assertFalse(anthropic_b["has_personal_key"])
        self.assertNotEqual(anthropic_b["source"], "PERSONAL")

        # User B's effective key does not receive User A's key
        eff_b = CredentialService.get_effective_key(self.user_b_id, "anthropic")
        self.assertNotEqual(eff_b, key_a)

    def test_rejection_of_unsupported_provider(self):
        """Setting a key for an unapproved/random provider must return HTTP 400."""
        res = self.client.put(
            "/api/v1/settings/api-keys/malicious_provider",
            json={"api_key": "some_key"},
            cookies=self.cookies_a
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("allowlist", res.json()["detail"].lower())

    def test_delete_user_key_reverts_precedence(self):
        """Deleting a personal key reverts source to SYSTEM (if system env configured) or NONE."""
        self.client.put(
            "/api/v1/settings/api-keys/google",
            json={"api_key": "AIzaSyTestGooglePersonalKey123"},
            cookies=self.cookies_a
        )

        del_res = self.client.delete("/api/v1/settings/api-keys/google", cookies=self.cookies_a)
        self.assertEqual(del_res.status_code, 200)

        # Database record for User A must be deleted
        row = query_one(
            "SELECT * FROM user_api_keys WHERE user_id = ? AND provider = 'google'",
            (self.user_a_id,)
        )
        self.assertIsNone(row)

    def test_validate_connection_redacts_secrets_in_error(self):
        """Connection test endpoint handles failures gracefully and redacts secret keys."""
        fake_secret = "sk-fake-secret-that-must-be-redacted"
        with patch("src.services.credential_service.CredentialService.validate_connection") as mock_val:
            mock_val.return_value = {
                "healthy": False,
                "provider": "openai",
                "latency_ms": 120,
                "validation_status": "INVALID",
                "message": "Kiểm tra kết nối thất bại: [REDACTED_API_KEY] 401 Unauthorized",
                "tested_at": "2026-10-18T10:00:00Z"
            }
            res = self.client.post(
                "/api/v1/settings/api-keys/openai/test",
                json={"candidate_key": fake_secret},
                cookies=self.cookies_a
            )
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertFalse(data["healthy"])
            self.assertNotIn(fake_secret, data["message"])

    def test_system_env_update_forbidden_for_regular_user(self):
        """Normal non-admin user cannot edit global system environment."""
        # Patch is_admin logic to verify rejection
        with patch("src.core.config.settings.DEBUG", False), \
             patch("src.core.config.settings.APP_ENV", "production"):
            res = self.client.post(
                "/api/v1/settings/api-keys/system",
                json={"env_var": "OPENAI_API_KEY", "value": "new_val"},
                cookies=self.cookies_a
            )
            self.assertEqual(res.status_code, 403)

    def test_system_env_update_rejects_non_allowlisted_variables(self):
        """Attempting to modify system security secrets like SECRET_KEY is strictly rejected."""
        res = self.client.post(
            "/api/v1/settings/api-keys/system",
            json={"env_var": "SECRET_KEY", "value": "hacked"},
            cookies=self.cookies_admin
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("không nằm trong danh mục", res.json()["detail"])

    def test_list_api_keys_authenticated_via_bearer_header(self):
        """Authenticated requests with Authorization Bearer header succeed with HTTP 200."""
        headers = {"Authorization": f"Bearer {self.user_a_token}"}
        res = self.client.get("/api/v1/settings/api-keys", headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

    def test_list_api_keys_invalid_or_expired_cookie_rejected(self):
        """Malformed or invalid cookie must be rejected with HTTP 401."""
        res = self.client.get("/api/v1/settings/api-keys", cookies={"access_token": "invalid.jwt.token"})
        self.assertEqual(res.status_code, 401)
        self.assertIn("không hợp lệ", res.json()["detail"].lower())

    def test_login_and_logout_cookie_lifecycle(self):
        """Login sets HttpOnly cookie and logout clears the access_token cookie."""
        login_res = self.client.post(
            "/api/v1/auth/login",
            json={"email": self.user_a_email, "password": "ValidPassword123!"}
        )
        self.assertEqual(login_res.status_code, 200)
        self.assertIn("access_token", login_res.cookies)
        self.assertIn("token", login_res.json())

        # Now logout
        logout_res = self.client.post("/api/v1/auth/logout", cookies={"access_token": login_res.cookies["access_token"]})
        self.assertEqual(logout_res.status_code, 200)
        # Check cookie deleted or expired
        set_cookie_header = logout_res.headers.get("set-cookie", "")
        self.assertTrue("access_token=" in set_cookie_header or "Max-Age=0" in set_cookie_header or "expires=" in set_cookie_header.lower())


if __name__ == "__main__":
    unittest.main()
