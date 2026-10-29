import os
import unittest
import uuid
import sys
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.main import app
from src.core.security import hash_password, create_access_token
from src.db import execute_commit, query_one, query_all
from src.services.credential_service import CredentialService, SUPPORTED_PROVIDERS


OLD_TEST_CREDENTIAL = "sk-proj-OLD_TEST_CREDENTIAL_1111"
NEW_TEST_CREDENTIAL = "sk-proj-NEW_TEST_CREDENTIAL_2222"
SYSTEM_TEST_CREDENTIAL = "sk-proj-SYS_TEST_CREDENTIAL_9999"
CANDIDATE_TEST_CREDENTIAL = "sk-proj-CANDIDATE_TEST_CRED_3333"


class TestUserApiKeysAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        CredentialService.clear_connection_validators()

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
        CredentialService.clear_connection_validators()
        execute_commit(
            "DELETE FROM user_api_keys WHERE user_id IN (?, ?, ?)",
            (self.user_a_id, self.user_b_id, self.admin_id)
        )
        execute_commit(
            "DELETE FROM users WHERE id IN (?, ?, ?)",
            (self.user_a_id, self.user_b_id, self.admin_id)
        )

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
        for expected in ("google", "openai", "anthropic", "groq", "ollama", "brave", "serpapi"):
            self.assertIn(expected, returned_providers)

        for item in data:
            self.assertIn("provider", item)
            self.assertIn("name", item)
            self.assertIn("is_configured", item)
            self.assertIn("source", item)
            self.assertIn("effective_source", item)
            self.assertIn("masked_hint", item)
            self.assertIn("key_fingerprint", item)
            self.assertIn("decryption_error", item)
            self.assertNotIn("key_ciphertext", item)
            self.assertNotIn("api_key", item)
            self.assertNotIn("raw_key", item)

    def test_replace_personal_key_updates_in_place_without_duplicates(self):
        """Replacing an existing personal key updates the single (user_id, provider) row, suffix, and fingerprint."""
        # 1. Save OLD_TEST_CREDENTIAL
        res_old = self.client.put(
            "/api/v1/settings/api-keys/openai",
            json={"api_key": OLD_TEST_CREDENTIAL},
            cookies=self.cookies_a
        )
        self.assertEqual(res_old.status_code, 200)
        old_data = res_old.json()
        self.assertEqual(old_data["masked_hint"], "****1111")
        old_fp = old_data["key_fingerprint"]
        self.assertTrue(len(old_fp) == 8)
        self.assertNotIn(OLD_TEST_CREDENTIAL, str(old_data))

        # 2. Replace with NEW_TEST_CREDENTIAL (also test alias canonicalization for 'gemini' -> 'google')
        res_new = self.client.put(
            "/api/v1/settings/api-keys/openai",
            json={"api_key": NEW_TEST_CREDENTIAL},
            cookies=self.cookies_a
        )
        self.assertEqual(res_new.status_code, 200)
        new_data = res_new.json()
        self.assertEqual(new_data["masked_hint"], "****2222")
        new_fp = new_data["key_fingerprint"]
        self.assertNotEqual(old_fp, new_fp)
        self.assertNotIn(NEW_TEST_CREDENTIAL, str(new_data))

        # 3. Verify only ONE record exists in user_api_keys for (user_a_id, 'openai')
        rows = query_all(
            "SELECT id, key_last4, key_fingerprint, is_active FROM user_api_keys WHERE user_id = ? AND provider = 'openai'",
            (self.user_a_id,)
        )
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["key_last4"], "2222")
        self.assertEqual(rows[0]["key_fingerprint"], new_fp)
        self.assertEqual(rows[0]["is_active"], 1)

        # 4. Verify runtime resolver returns NEW_TEST_CREDENTIAL
        self.assertEqual(
            CredentialService.get_effective_key(self.user_a_id, "openai"),
            NEW_TEST_CREDENTIAL
        )

        # 5. Verify diagnostics endpoint returns sanitized metadata for the new key
        diag_res = self.client.get(
            "/api/v1/settings/api-keys/openai/diagnostics",
            cookies=self.cookies_a
        )
        self.assertEqual(diag_res.status_code, 200)
        diag = diag_res.json()
        self.assertEqual(diag["effective_source"], "PERSONAL")
        self.assertEqual(diag["masked_hint"], "****2222")
        self.assertEqual(diag["key_fingerprint"], new_fp)
        self.assertFalse(diag["decryption_error"])
        self.assertNotIn(NEW_TEST_CREDENTIAL, str(diag))

    def test_candidate_connection_test_does_not_overwrite_saved_key_status(self):
        """Testing an unsaved candidate key must NOT overwrite the stored personal key's validation_status."""
        # Save valid personal key and mark it VALID via saved test
        self.client.put(
            "/api/v1/settings/api-keys/openai",
            json={"api_key": OLD_TEST_CREDENTIAL},
            cookies=self.cookies_a
        )

        def mock_validator(key: str):
            if key == CANDIDATE_TEST_CREDENTIAL:
                raise ValueError(f"401 Unauthorized for {key}")
            return True

        CredentialService.register_connection_validator("openai", mock_validator)

        # Test saved key -> marks stored key VALID
        saved_test = self.client.post("/api/v1/settings/api-keys/openai/test", cookies=self.cookies_a)
        self.assertEqual(saved_test.status_code, 200)
        self.assertTrue(saved_test.json()["healthy"])
        self.assertEqual(saved_test.json()["tested_source"], "PERSONAL")

        # Now test an invalid unsaved CANDIDATE key
        cand_test = self.client.post(
            "/api/v1/settings/api-keys/openai/test",
            json={"candidate_key": CANDIDATE_TEST_CREDENTIAL},
            cookies=self.cookies_a
        )
        self.assertEqual(cand_test.status_code, 200)
        cand_json = cand_test.json()
        self.assertFalse(cand_json["healthy"])
        self.assertEqual(cand_json["tested_source"], "CANDIDATE")
        self.assertNotIn(CANDIDATE_TEST_CREDENTIAL, cand_json["message"])

        # Stored personal key in DB must STILL have validation_status == 'VALID' and no error summary!
        row = query_one(
            "SELECT validation_status, last_error_summary FROM user_api_keys WHERE user_id = ? AND provider = 'openai'",
            (self.user_a_id,)
        )
        self.assertEqual(row["validation_status"], "VALID")
        self.assertIsNone(row["last_error_summary"])

    def test_corrupted_personal_key_does_not_silently_fallback_to_system_key(self):
        """If a stored personal key cannot be decrypted, get_effective_key must NOT silently return the system key."""
        with patch.dict(os.environ, {"OPENAI_API_KEY": SYSTEM_TEST_CREDENTIAL}):
            # Insert a corrupted ciphertext for User A
            execute_commit(
                """
                INSERT INTO user_api_keys (id, user_id, provider, key_ciphertext, key_last4, key_fingerprint, validation_status, is_active)
                VALUES (?, ?, 'openai', 'corrupted_not_valid_base64_gcm', '1111', 'deadbeef', 'VALID', 1)
                """,
                (str(uuid.uuid4()), self.user_a_id)
            )

            # Must NOT return SYSTEM_TEST_CREDENTIAL
            eff = CredentialService.get_effective_key(self.user_a_id, "openai")
            self.assertIsNone(eff)

            # Status endpoint must surface decryption_error = True and validation_status = 'INVALID'
            res = self.client.get("/api/v1/settings/api-keys", cookies=self.cookies_a)
            self.assertEqual(res.status_code, 200)
            openai_status = next(p for p in res.json() if p["provider"] == "openai")
            self.assertTrue(openai_status["decryption_error"])
            self.assertFalse(openai_status["is_configured"])
            self.assertEqual(openai_status["validation_status"], "INVALID")

    def test_user_isolation(self):
        """User A's personal key is never accessible to User B."""
        self.client.put(
            "/api/v1/settings/api-keys/anthropic",
            json={"api_key": OLD_TEST_CREDENTIAL},
            cookies=self.cookies_a
        )

        res_a = self.client.get("/api/v1/settings/api-keys", cookies=self.cookies_a)
        anthropic_a = next(item for item in res_a.json() if item["provider"] == "anthropic")
        self.assertTrue(anthropic_a["has_personal_key"])
        self.assertEqual(anthropic_a["source"], "PERSONAL")

        res_b = self.client.get("/api/v1/settings/api-keys", cookies=self.cookies_b)
        anthropic_b = next(item for item in res_b.json() if item["provider"] == "anthropic")
        self.assertFalse(anthropic_b["has_personal_key"])
        self.assertNotEqual(anthropic_b["source"], "PERSONAL")

        eff_b = CredentialService.get_effective_key(self.user_b_id, "anthropic")
        self.assertNotEqual(eff_b, OLD_TEST_CREDENTIAL)

    def test_rejection_of_unsupported_provider(self):
        """Setting a key for an unapproved/random provider must return HTTP 400."""
        res = self.client.put(
            "/api/v1/settings/api-keys/malicious_provider",
            json={"api_key": "some_key"},
            cookies=self.cookies_a
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("allowlist", res.json()["detail"].lower())

    def test_delete_user_key_reverts_precedence_to_system_or_none(self):
        """Deleting a personal key reverts source to SYSTEM (if system env configured) or NONE."""
        with patch.dict(os.environ, {"GEMINI_API_KEY": SYSTEM_TEST_CREDENTIAL}):
            self.client.put(
                "/api/v1/settings/api-keys/google",
                json={"api_key": NEW_TEST_CREDENTIAL},
                cookies=self.cookies_a
            )
            self.assertEqual(
                CredentialService.get_effective_key(self.user_a_id, "google"),
                NEW_TEST_CREDENTIAL
            )

            del_res = self.client.delete("/api/v1/settings/api-keys/google", cookies=self.cookies_a)
            self.assertEqual(del_res.status_code, 200)
            del_json = del_res.json()
            self.assertEqual(del_json["source"], "SYSTEM")
            self.assertTrue(del_json["is_configured"])
            self.assertEqual(del_json["masked_hint"], "****9999")

            # Effective key now resolves to SYSTEM_TEST_CREDENTIAL
            self.assertEqual(
                CredentialService.get_effective_key(self.user_a_id, "google"),
                SYSTEM_TEST_CREDENTIAL
            )

    def test_system_env_update_forbidden_for_regular_user(self):
        """Normal non-admin user cannot edit global system environment."""
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


if __name__ == "__main__":
    unittest.main()
