"""
AI-Chan Agent Runner — Git Isolation & Worktree Manager
Path: ai-runner/isolation.py
Implements: SRS-ORCH-01 (FR-RUN-008..012), ADR-015, Prompt 06 Scope A & C
"""

import os
import re
import sys
import shutil
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List

# Sensitive file patterns to redact from diffs and reviews
SENSITIVE_PATTERNS = [
    re.compile(r"(^|[/\\])\.env(\..+)?$", re.IGNORECASE),
    re.compile(r"\.(pem|key|p12|pfx|pkcs12|token|secret|credentials)$", re.IGNORECASE),
    re.compile(r"(^|[/\\])id_(rsa|ed25519|ecdsa|dsa)(\..+)?$", re.IGNORECASE),
    re.compile(r"(^|[/\\])secrets?\.(json|yaml|yml|toml)$", re.IGNORECASE),
    re.compile(r"(^|[/\\])\.git(hub)?[/\\]workflows[/\\]secrets\.", re.IGNORECASE),
]

MAX_DIFF_BYTE_SIZE = 512 * 1024  # 500 KB cap


class GitIsolationError(Exception):
    """Raised when git isolation fails."""
    pass


class GitIsolationManager:
    """
    Manages task isolation via dedicated Git worktrees.
    Protects user's working tree, isolates changes per attempt, sanitizes paths,
    and collects redacted unified diffs.
    """

    def __init__(self, repo_path: str):
        self.raw_path = Path(repo_path).resolve()
        self.git_bin = shutil.which("git")
        if not self.git_bin:
            raise GitIsolationError("Git executable ('git') was not found on PATH.")
        
        self.repo_root = self._get_repo_root()

    def _run_git(self, args: List[str], cwd: Optional[Path] = None, timeout: int = 30) -> Tuple[int, str, str]:
        """Runs a git command safely without shell=True."""
        target_cwd = str(cwd or self.repo_root)
        try:
            proc = subprocess.run(
                [self.git_bin] + args,
                cwd=target_cwd,
                capture_output=True,
                text=True,
                timeout=timeout,
                encoding="utf-8",
                errors="replace"
            )
            return proc.returncode, proc.stdout.strip(), proc.stderr.strip()
        except subprocess.TimeoutExpired:
            return -1, "", "Git command timed out"
        except Exception as e:
            return -1, "", str(e)

    def _get_repo_root(self) -> Path:
        """Finds top-level git repository root."""
        code, out, err = self._run_git(["rev-parse", "--show-toplevel"], cwd=self.raw_path)
        if code != 0:
            raise GitIsolationError(f"Directory '{self.raw_path}' is not a valid Git repository: {err}")
        return Path(out).resolve()

    def check_working_tree_status(self) -> Dict[str, Any]:
        """
        Inspects working tree of main repo before task execution.
        Identifies uncommitted modifications, staged items, or untracked files.
        """
        code, out, err = self._run_git(["status", "--porcelain"])
        if code != 0:
            return {"is_clean": False, "error": err, "files": []}

        lines = [line.strip() for line in out.splitlines() if line.strip()]
        return {
            "is_clean": len(lines) == 0,
            "has_uncommitted_changes": len(lines) > 0,
            "uncommitted_file_count": len(lines),
            "files": lines[:50]  # cap preview
        }

    def ensure_git_exclude(self):
        """Ensures .ai-chan worktree folder is in .git/info/exclude to avoid tracking."""
        exclude_file = self.repo_root / ".git" / "info" / "exclude"
        try:
            exclude_file.parent.mkdir(parents=True, exist_ok=True)
            current_content = ""
            if exclude_file.exists():
                with open(exclude_file, "r", encoding="utf-8") as f:
                    current_content = f.read()

            if ".ai-chan" not in current_content:
                with open(exclude_file, "a", encoding="utf-8") as f:
                    f.write("\n# AI-Chan Isolated Worktrees\n.ai-chan/\n")
        except Exception:
            pass

    def sanitize_identifier(self, ident: str) -> str:
        """Sanitizes identifier to prevent path traversal or special shell chars."""
        cleaned = re.sub(r"[^a-zA-Z0-9_\-]", "", ident)
        if not cleaned:
            raise GitIsolationError(f"Invalid identifier: '{ident}'")
        return cleaned

    def get_worktree_path(self, attempt_id: str) -> Path:
        """Generates canonical worktree path under .ai-chan/worktrees/{attempt_id}."""
        safe_attempt = self.sanitize_identifier(attempt_id)
        target = (self.repo_root / ".ai-chan" / "worktrees" / safe_attempt).resolve()
        
        # Verify no path traversal outside repo root
        try:
            target.relative_to(self.repo_root)
        except ValueError:
            raise GitIsolationError(f"Path traversal detected in worktree target: {target}")

        return target

    def get_branch_name(self, task_id: str, attempt_number: int = 1) -> str:
        """Generates branch name following convention ai-chan/task-{task_id[:8]}."""
        safe_task = self.sanitize_identifier(task_id)[:8]
        branch = f"ai-chan/task-{safe_task}"
        
        # Validate git ref format
        code, _, _ = self._run_git(["check-ref-format", "--branch", branch])
        if code != 0:
            branch = f"ai-chan-task-{safe_task}"
        return branch

    def create_worktree(
        self,
        task_id: str,
        attempt_id: str,
        attempt_number: int = 1,
        base_commit: str = "HEAD"
    ) -> Dict[str, Any]:
        """
        Creates an isolated Git worktree for the task attempt.
        Never touches the user's main working tree.
        """
        self.ensure_git_exclude()
        worktree_path = self.get_worktree_path(attempt_id)
        branch_name = self.get_branch_name(task_id, attempt_number)

        # Check if worktree directory already exists
        if worktree_path.exists():
            raise GitIsolationError(f"Worktree directory '{worktree_path}' already exists.")

        worktree_path.parent.mkdir(parents=True, exist_ok=True)

        # Check if branch already exists
        code, _, _ = self._run_git(["show-ref", "--verify", f"refs/heads/{branch_name}"])
        branch_exists = (code == 0)

        if branch_exists:
            # If follow-up attempt, checkout existing branch in new worktree
            # Or branch off existing branch for attempt isolation
            att_branch = f"{branch_name}-att{attempt_number}"
            code, out, err = self._run_git([
                "worktree", "add", "-b", att_branch, str(worktree_path), branch_name
            ])
            used_branch = att_branch
        else:
            # Create new branch from base_commit (default HEAD)
            code, out, err = self._run_git([
                "worktree", "add", "-b", branch_name, str(worktree_path), base_commit
            ])
            used_branch = branch_name

        if code != 0:
            # Fallback if worktree add failed
            raise GitIsolationError(f"Failed to create git worktree: {err}")

        # Get worktree commit hash
        _, commit_hash, _ = self._run_git(["rev-parse", "HEAD"], cwd=worktree_path)

        return {
            "worktree_path": str(worktree_path),
            "branch_name": used_branch,
            "base_commit": commit_hash,
            "is_isolated": True
        }

    def is_sensitive_file(self, file_path: str) -> bool:
        """Checks if a file path matches sensitive patterns (.env, keys, certs)."""
        norm_path = file_path.replace("\\", "/")
        for pattern in SENSITIVE_PATTERNS:
            if pattern.search(norm_path):
                return True
        return False

    def collect_diff(self, worktree_path: str, base_commit: str = "HEAD") -> Dict[str, Any]:
        """
        Collects unified diff and stats from the isolated worktree against base_commit.
        Redacts sensitive files and caps output size at MAX_DIFF_BYTE_SIZE.
        """
        wt = Path(worktree_path).resolve()
        if not wt.exists():
            return {"diff": "", "stat": "", "files_changed": [], "is_truncated": False}

        # 1. Diff stats
        _, stat_out, _ = self._run_git(["diff", "--stat", base_commit], cwd=wt)

        # 2. Changed file list
        _, files_out, _ = self._run_git(["diff", "--name-only", base_commit], cwd=wt)
        raw_files = [f.strip() for f in files_out.splitlines() if f.strip()]

        # Also check untracked files in worktree
        _, untracked_out, _ = self._run_git(["status", "--porcelain"], cwd=wt)
        untracked = []
        for line in untracked_out.splitlines():
            line = line.strip()
            if line.startswith("??"):
                untracked.append(line[3:].strip())

        all_changed_files = sorted(list(set(raw_files + untracked)))

        # 3. Raw unified diff
        _, raw_diff, _ = self._run_git(["diff", base_commit], cwd=wt)

        # Add untracked files diff preview if any
        if untracked and len(raw_diff) < MAX_DIFF_BYTE_SIZE:
            untracked_diff_blocks = []
            for uf in untracked:
                uf_path = wt / uf
                if uf_path.is_file():
                    try:
                        if self.is_sensitive_file(uf):
                            untracked_diff_blocks.append(
                                f"diff --git a/{uf} b/{uf}\n"
                                f"new file mode 100644\n"
                                f"--- /dev/null\n"
                                f"+++ b/{uf}\n"
                                f"@@ -0,0 +1,1 @@\n"
                                f"+[REDACTED_SENSITIVE_CONTENT: Sensitive file '{uf}' excluded from review diff]\n"
                            )
                        else:
                            content = uf_path.read_text(encoding="utf-8", errors="replace")
                            lines = content.splitlines()
                            diff_body = "\n".join(f"+{line}" for line in lines[:200])
                            untracked_diff_blocks.append(
                                f"diff --git a/{uf} b/{uf}\n"
                                f"new file mode 100644\n"
                                f"--- /dev/null\n"
                                f"+++ b/{uf}\n"
                                f"@@ -0,0 +1,{len(lines)} @@\n"
                                f"{diff_body}\n"
                            )
                    except Exception:
                        pass
            if untracked_diff_blocks:
                raw_diff = (raw_diff + "\n" + "\n".join(untracked_diff_blocks)).strip()

        # 4. Redact sensitive files in the unified diff
        redacted_diff, sanitized_files = self._sanitize_diff(raw_diff, all_changed_files)

        # 5. Output size cap
        is_truncated = False
        diff_bytes = redacted_diff.encode("utf-8")
        if len(diff_bytes) > MAX_DIFF_BYTE_SIZE:
            redacted_diff = diff_bytes[:MAX_DIFF_BYTE_SIZE].decode("utf-8", errors="ignore")
            redacted_diff += "\n\n[... DIFF EXCEEDED 500KB LIMIT — TRUNCATED FOR SECURITY AND PERFORMANCE ...]"
            is_truncated = True

        return {
            "diff": redacted_diff,
            "stat": stat_out,
            "files_changed": sanitized_files,
            "is_truncated": is_truncated,
            "byte_size": len(redacted_diff.encode("utf-8"))
        }

    def _sanitize_diff(self, diff_text: str, file_list: List[str]) -> Tuple[str, List[Dict[str, Any]]]:
        """Redacts sensitive file contents from git diff chunks."""
        file_meta = []
        for f in file_list:
            is_sens = self.is_sensitive_file(f)
            file_meta.append({"path": f, "is_sensitive": is_sens})

        # Process diff chunks line by line or file by file
        chunks = diff_text.split("diff --git ")
        sanitized_chunks = []

        for chunk in chunks:
            if not chunk.strip():
                continue
            first_line = chunk.splitlines()[0] if chunk.splitlines() else ""
            match = re.search(r"a/(\S+)\s+b/(\S+)", first_line)
            if match:
                file_a, file_b = match.group(1), match.group(2)
                if self.is_sensitive_file(file_a) or self.is_sensitive_file(file_b):
                    # Redact entire file hunk
                    masked_chunk = (
                        f"a/{file_a} b/{file_b}\n"
                        f"--- a/{file_a}\n"
                        f"+++ b/{file_b}\n"
                        f"@@ -0,0 +1,1 @@\n"
                        f"+[REDACTED_SENSITIVE_CONTENT: Sensitive file '{file_b}' excluded from review diff]\n"
                    )
                    sanitized_chunks.append(masked_chunk)
                    continue

            sanitized_chunks.append(chunk)

        reconstructed = "diff --git ".join([""] + sanitized_chunks).strip()
        return reconstructed, file_meta

    def cleanup_worktree(self, worktree_path: str, force: bool = False) -> Dict[str, Any]:
        """
        Safely removes worktree.
        Checks for uncommitted modifications first; does NOT delete if dirty unless force=True.
        """
        wt = Path(worktree_path).resolve()
        if not wt.exists():
            return {"removed": True, "message": "Worktree path does not exist."}

        # Check for uncommitted changes in worktree
        code, out, _ = self._run_git(["status", "--porcelain"], cwd=wt)
        if code == 0 and out.strip() and not force:
            return {
                "removed": False,
                "reason": "DIRTY_WORKTREE",
                "message": "Worktree has uncommitted modifications. Kept for review/recovery."
            }

        # Safe removal via git worktree remove
        remove_args = ["worktree", "remove"]
        if force:
            remove_args.append("--force")
        remove_args.append(str(wt))

        code, out, err = self._run_git(remove_args)
        if code != 0:
            # If git worktree remove failed, prune and retry or report
            self._run_git(["worktree", "prune"])
            return {"removed": False, "error": err}

        self._run_git(["worktree", "prune"])
        return {"removed": True, "message": "Worktree safely removed."}
