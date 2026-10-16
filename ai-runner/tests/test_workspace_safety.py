"""
Tests for Workspace Safety, Path Validation, Dirty Git Preservation,
Secret Redaction, and Subprocess Environment Whitelisting.
"""

import os
import sys
import unittest
import tempfile
import shutil
from unittest.mock import patch, MagicMock

# Add ai-runner directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from runner import validate_host_path
from adapters.antigravity import (
    build_safe_subprocess_env,
    redact_sensitive_text,
    SECRET_PATTERNS,
)


class TestWorkspaceValidation(unittest.TestCase):
    """Verifies canonical path resolution, path traversal, UNC, and root boundary enforcement."""

    def setUp(self):
        self.test_dir = tempfile.mkdtemp(prefix="ai_chan_test_ws_")
        self.allowed_dir = tempfile.mkdtemp(prefix="ai_chan_allowed_")

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)
        shutil.rmtree(self.allowed_dir, ignore_errors=True)

    def test_valid_path_returns_canonical(self):
        res = validate_host_path(self.test_dir)
        self.assertTrue(res["is_valid"])
        self.assertEqual(res["canonical_path"], os.path.realpath(os.path.abspath(self.test_dir)))

    def test_empty_or_whitespace_path_rejected(self):
        res_empty = validate_host_path("")
        self.assertFalse(res_empty["is_valid"])
        self.assertIn("cannot be empty", res_empty["error_message"])

        res_space = validate_host_path("   ")
        self.assertFalse(res_space["is_valid"])
        self.assertIn("cannot be empty", res_space["error_message"])

    def test_nonexistent_path_rejected(self):
        fake_path = os.path.join(self.test_dir, "does_not_exist_xyz123")
        res = validate_host_path(fake_path)
        self.assertFalse(res["is_valid"])
        self.assertIn("không tồn tại", res["error_message"])

    def test_unc_path_rejected(self):
        res = validate_host_path(r"\\remote-server\share\repo")
        self.assertFalse(res["is_valid"])
        self.assertIn("UNC network paths are forbidden", res["error_message"])

        res2 = validate_host_path("//remote-server/share/repo")
        self.assertFalse(res2["is_valid"])
        self.assertIn("UNC network paths are forbidden", res2["error_message"])

    def test_filesystem_root_rejected(self):
        if sys.platform == "win32":
            drive_root = os.path.splitdrive(os.path.abspath(self.test_dir))[0] + "\\"
            res = validate_host_path(drive_root)
            self.assertFalse(res["is_valid"])
            self.assertIn("Drive root", res["error_message"])
        else:
            res = validate_host_path("/")
            self.assertFalse(res["is_valid"])
            self.assertIn("root", res["error_message"])

    def test_protected_system_directory_rejected(self):
        if sys.platform == "win32":
            sys_root = os.environ.get("SystemRoot", r"C:\Windows")
            if os.path.isdir(sys_root):
                res = validate_host_path(sys_root)
                self.assertFalse(res["is_valid"])
                self.assertIn("protected operating system directory", res["error_message"])
        else:
            if os.path.isdir("/etc"):
                res = validate_host_path("/etc")
                self.assertFalse(res["is_valid"])
                self.assertIn("protected operating system directory", res["error_message"])

    def test_allowlist_enforcement(self):
        # Allowed inside self.allowed_dir
        sub_ws = os.path.join(self.allowed_dir, "my_project")
        os.makedirs(sub_ws, exist_ok=True)

        # Passes when within allowed root
        res_ok = validate_host_path(sub_ws, allowed_roots=[self.allowed_dir])
        self.assertTrue(res_ok["is_valid"])
        self.assertEqual(res_ok["canonical_path"], os.path.realpath(os.path.abspath(sub_ws)))

        # Rejected when outside allowed root
        outside_ws = os.path.join(self.test_dir, "outside_project")
        os.makedirs(outside_ws, exist_ok=True)
        res_fail = validate_host_path(outside_ws, allowed_roots=[self.allowed_dir])
        self.assertFalse(res_fail["is_valid"])
        self.assertIn("outside the permitted workspace root allowlist", res_fail["error_message"])

    def test_path_traversal_escaping_root_rejected(self):
        sub_dir = os.path.join(self.allowed_dir, "sub")
        os.makedirs(sub_dir, exist_ok=True)
        # Attempt to traverse out of allowed_dir using relative segments
        traversal = os.path.join(sub_dir, "..", "..", os.path.basename(self.test_dir))
        res = validate_host_path(traversal, allowed_roots=[sub_dir])
        self.assertFalse(res["is_valid"])


class TestDirtyGitWorkingTreeSafety(unittest.TestCase):
    """
    Verifies that uncommitted local modifications are protected from being overwritten,
    and that accept-edits without isolation is safely rejected.
    """

    def setUp(self):
        self.test_dir = tempfile.mkdtemp(prefix="ai_chan_git_ws_")

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_accept_edits_rejected_when_unisolated_and_dirty(self):
        from runner import handle_task_dispatch

        task_data = {
            "task_id": "task_safety_test_01",
            "attempt_id": "att_01",
            "server": "http://localhost:8000",
            "runner_secret": "test_secret_123",
            "mode": "accept-edits",
            "local_path": self.test_dir,
            "workspace": {
                "local_path": self.test_dir
            },
            "spec": {
                "task_id": "task_safety_test_01",
                "attempt_id": "att_01",
                "workspace_path": self.test_dir,
                "prompt": "Modify code",
                "mode": "accept-edits"
            },
            "policy": {
                "timeout_seconds": 60,
                "sandbox": True,
                "auto_approve_tools": False
            }
        }

        mock_val = {
            "is_valid": True,
            "is_git_repo": True,
            "canonical_path": self.test_dir,
            "current_branch": "main",
            "head_commit": "abc1234",
            "has_uncommitted_changes": True
        }

        # Mock GitIsolationManager to fail worktree creation, simulating isolation failure
        mock_git_mgr = MagicMock()
        mock_git_mgr.check_working_tree_status.return_value = {
            "has_uncommitted_changes": True,
            "uncommitted_file_count": 3
        }
        mock_git_mgr.create_worktree.side_effect = RuntimeError("Failed to create worktree")

        with patch("runner.validate_host_path", return_value=mock_val), \
             patch("runner.GitIsolationManager", return_value=mock_git_mgr), \
             patch("runner.http_json_post") as mock_post, \
             patch("runner.AntigravityCLIAdapter") as mock_adapter:

            handle_task_dispatch(
                task_data,
                server="http://localhost:8000",
                runner_id="runner_test_id",
                secret="test_secret_123"
            )

            # Antigravity CLI must NEVER be invoked on dirty unisolated working tree!
            self.assertEqual(mock_adapter.call_count, 0)

            # Runner must report task failure with uncommitted changes error message
            self.assertTrue(mock_post.called)
            completion_payload = mock_post.call_args[0][1]
            self.assertEqual(completion_payload["status"], "FAILED")
            self.assertIn("thay đổi chưa commit", completion_payload["error_message"])


class TestSecretSanitizationAndEnvironment(unittest.TestCase):
    """Verifies that secrets are scrubbed and environments are strictly whitelisted."""

    def test_safe_subprocess_env_whitelist(self):
        dirty_env = {
            "PATH": "/usr/bin;C:\\Windows",
            "SYSTEMROOT": "C:\\Windows",
            "USERPROFILE": "C:\\Users\\Developer",
            "LOCALAPPDATA": "C:\\Users\\Developer\\AppData\\Local",
            "RUNNER_SECRET": "rsk_abcdef1234567890abcdef1234567890",
            "AI_CHAN_INTERNAL_TOKEN": "secret_internal_token_value",
            "DATABASE_URL": "postgresql://user:pass@localhost:5432/db",
            "DISCORD_BOT_TOKEN": "my_discord_bot_secret_token",
            "JWT_SECRET_KEY": "super_secret_jwt_key",
            "ANTIGRAVITY_API_KEY": "valid_agent_key"
        }

        safe_env = build_safe_subprocess_env(dirty_env)

        # Essential keys are kept
        self.assertIn("PATH", safe_env)
        self.assertIn("SYSTEMROOT", safe_env)
        self.assertIn("USERPROFILE", safe_env)
        self.assertIn("LOCALAPPDATA", safe_env)
        self.assertIn("ANTIGRAVITY_API_KEY", safe_env)

        # Dangerous runner / backend secrets are excluded
        self.assertNotIn("RUNNER_SECRET", safe_env)
        self.assertNotIn("AI_CHAN_INTERNAL_TOKEN", safe_env)
        self.assertNotIn("DATABASE_URL", safe_env)
        self.assertNotIn("DISCORD_BOT_TOKEN", safe_env)
        self.assertNotIn("JWT_SECRET_KEY", safe_env)

    def test_redact_sensitive_text_credentials(self):
        samples = [
            ("Connecting with sk-proj-1234567890abcdef1234567890abcdef here", "[REDACTED_API_KEY]"),
            ("GitHub push ghp_123456789012345678901234567890123456 done", "[REDACTED_GITHUB_TOKEN]"),
            ("Google API key AIzaSyD123456789012345678901234567890 in config", "[REDACTED_GOOGLE_KEY]"),
            ("Runner paired with rsk_1234567890abcdef1234567890abcdef99", "[REDACTED_RUNNER_SECRET]"),
            ("Runner pairing token rpt_1234567890abcdef", "[REDACTED_PAIRING_TOKEN]"),
            ("Authorization: Bearer my_secret_bearer_token_1234567890", "Bearer [REDACTED_BEARER_TOKEN]"),
            ("Authorization: Basic dXNlcjpwYXNzd29yZDEyMzQ1Njc4", "Basic [REDACTED_BASIC_AUTH]"),
            ("Cookie: session_id=abcdef123456789; secure", "Cookie: [REDACTED_COOKIE]"),
            ("DISCORD_BOT_TOKEN=my_bot_token_secret_123", "DISCORD_BOT_TOKEN=[REDACTED]"),
            ("DATABASE_URL=postgresql://admin:secret@localhost:5432/aichan", "DATABASE_URL=[REDACTED]"),
        ]

        for raw, expected_token in samples:
            redacted = redact_sensitive_text(raw)
            self.assertIn(expected_token, redacted)

    def test_redact_host_user_paths(self):
        win_path = r"Error loading file C:\Users\JohnDoe\secret_project\main.py"
        redacted = redact_sensitive_text(win_path)
        self.assertNotIn("JohnDoe", redacted)
        self.assertIn(r"C:\Users\***", redacted)

        posix_path = "/home/developer_name/project/config.json"
        redacted_posix = redact_sensitive_text(posix_path)
        self.assertNotIn("developer_name", redacted_posix)
        self.assertIn("/home/***", redacted_posix)


if __name__ == "__main__":
    unittest.main()
