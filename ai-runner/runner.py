"""
AI-Chan Agent Runner — Host Daemon & Client
Path: ai-runner/runner.py
Implements: SRS-ORCH-01 (FR-RUN-001..014), API-ORCH-01, ADR-015

Usage:
    python -m runner pair --server http://localhost:8000 --token rpt_...
    python -m runner start --server http://localhost:8000
    python -m runner status
"""

import os
import sys
import json
import time
import uuid
import shutil
import hashlib
import random
import signal
import platform
import argparse
import subprocess
import threading
from pathlib import Path
from typing import Dict, Any, Optional, List, Set

if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

try:
    import urllib.request
    import urllib.error
except ImportError:
    pass

# Ensure adapters package can be loaded
sys.path.insert(0, str(Path(__file__).resolve().parent))
try:
    from adapters import AntigravityCLIAdapter, ExecutionSpec, ExecutionPolicy, NormalizedEvent
    from isolation import GitIsolationManager, GitIsolationError
    from verification import VerificationPipeline, VerificationPolicy
except ImportError:
    from .adapters import AntigravityCLIAdapter, ExecutionSpec, ExecutionPolicy, NormalizedEvent
    from .isolation import GitIsolationManager, GitIsolationError
    from .verification import VerificationPipeline, VerificationPolicy

CONFIG_DIR = Path.home() / ".ai-chan"
CONFIG_FILE = CONFIG_DIR / "runner.json"

active_adapters: Dict[str, AntigravityCLIAdapter] = {}
active_attempts: Set[str] = set()
saved_task_contexts: Dict[str, Dict[str, Any]] = {}

def get_platform_info() -> Dict[str, Any]:
    os_name = sys.platform
    if os_name.startswith("win"):
        plat = "windows"
    elif os_name.startswith("darwin"):
        plat = "darwin"
    else:
        plat = "linux"

    return {
        "platform": plat,
        "architecture": platform.machine().lower(),
        "machine_name": platform.node(),
        "os_version": platform.platform()
    }

def detect_cli_capabilities() -> Dict[str, Any]:
    caps = {}

    # 1. Detect Antigravity CLI
    agy_path = shutil.which("agy")
    if not agy_path and sys.platform.startswith("win"):
        win_agy = Path(os.environ.get("LOCALAPPDATA", "")) / "agy" / "bin" / "agy.exe"
        if win_agy.exists():
            agy_path = str(win_agy)

    if agy_path:
        try:
            out = subprocess.check_output([agy_path, "--version"], text=True, timeout=5).strip()
            caps["antigravity"] = {"available": True, "path": agy_path, "version": out}
        except Exception:
            caps["antigravity"] = {"available": True, "path": agy_path, "version": "unknown"}
    else:
        caps["antigravity"] = {"available": False}

    # 2. Detect Git
    git_path = shutil.which("git")
    if git_path:
        try:
            out = subprocess.check_output([git_path, "--version"], text=True, timeout=5).strip()
            caps["git"] = {"available": True, "path": git_path, "version": out}
        except Exception:
            caps["git"] = {"available": True, "path": git_path}
    else:
        caps["git"] = {"available": False}

    # 3. Detect Claude Code CLI
    claude_path = shutil.which("claude")
    if claude_path:
        try:
            out = subprocess.check_output([claude_path, "--version"], text=True, timeout=5).strip()
            caps["claude_code"] = {"available": True, "path": claude_path, "version": out}
        except Exception:
            caps["claude_code"] = {"available": True, "path": claude_path}
    else:
        caps["claude_code"] = {"available": False}

    return caps

def save_config(data: Dict[str, Any]):
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    # Secure permissions on POSIX
    if not sys.platform.startswith("win"):
        try:
            os.chmod(CONFIG_FILE, 0o600)
        except Exception:
            pass

def load_config() -> Optional[Dict[str, Any]]:
    if not CONFIG_FILE.exists():
        return None
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None

def http_json_post(url: str, body: Dict[str, Any], headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)

    req_data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=req_data, headers=req_headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            content = resp.read().decode("utf-8")
            return json.loads(content)
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        try:
            err_json = json.loads(err_msg)
            detail = err_json.get("detail", err_msg)
        except Exception:
            detail = err_msg
        raise RuntimeError(f"HTTP {e.code}: {detail}")
    except Exception as e:
        raise RuntimeError(f"Network error: {str(e)}")

# ==============================================================================
# WORKSPACE VALIDATION ON HOST FILESYSTEM
# ==============================================================================

def validate_host_path(local_path: str, allowed_roots: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Validates physical workspace path on runner host.
    Checks directory existence, canonicalization, read/write permissions, Git status,
    UNC path rejection, operating system root protection, and allowlist policy.
    """
    if not local_path or not local_path.strip():
        return {
            "is_valid": False,
            "is_git_repo": False,
            "error_message": "Workspace path cannot be empty."
        }

    clean_path = local_path.strip()

    # 1. Reject UNC and network share paths (e.g., \\server\share) for security
    if clean_path.startswith(("\\\\", "//")):
        return {
            "is_valid": False,
            "is_git_repo": False,
            "error_message": f"UNC network paths are forbidden for security reasons: {clean_path}"
        }

    try:
        canonical = os.path.realpath(os.path.abspath(clean_path))
    except Exception as e:
        return {
            "is_valid": False,
            "is_git_repo": False,
            "error_message": f"Invalid path syntax: {str(e)}"
        }

    # 2. Drive root and Filesystem root protection
    if sys.platform.startswith("win"):
        drive, rest = os.path.splitdrive(canonical)
        if rest in ("\\", "/", ""):
            return {
                "is_valid": False,
                "is_git_repo": False,
                "error_message": f"Drive root '{canonical}' cannot be used directly as a workspace."
            }
    else:
        if canonical == "/":
            return {
                "is_valid": False,
                "is_git_repo": False,
                "error_message": "Filesystem root '/' cannot be used directly as a workspace."
            }

    # 3. Protected operating system directories check
    canonical_lower = canonical.lower()
    if sys.platform.startswith("win"):
        sys_root = os.environ.get("SystemRoot", "C:\\Windows").lower()
        prog_files = os.environ.get("ProgramFiles", "C:\\Program Files").lower()
        prog_files_x86 = os.environ.get("ProgramFiles(x86)", "C:\\Program Files (x86)").lower()
        forbidden_win = [sys_root, "c:\\windows", prog_files + "\\common files", prog_files_x86 + "\\common files"]
        for f_dir in forbidden_win:
            if canonical_lower == f_dir or canonical_lower.startswith(f_dir + "\\") or canonical_lower.startswith(f_dir + "/"):
                return {
                    "is_valid": False,
                    "is_git_repo": False,
                    "error_message": f"Workspace cannot be located in protected operating system directory: {canonical}"
                }
    else:
        forbidden_posix = ("/etc", "/bin", "/sbin", "/usr", "/var", "/proc", "/sys", "/dev", "/boot", "/root")
        for f_dir in forbidden_posix:
            if canonical == f_dir or canonical.startswith(f_dir + "/"):
                return {
                    "is_valid": False,
                    "is_git_repo": False,
                    "error_message": f"Workspace cannot be located in protected operating system directory: {canonical}"
                }

    # 4. Allowlist policy verification (if configured in runner config or environment)
    roots_to_check = allowed_roots
    if not roots_to_check:
        env_roots = os.environ.get("AI_CHAN_ALLOWED_WORKSPACE_ROOTS")
        if env_roots:
            roots_to_check = [r.strip() for r in env_roots.split(os.pathsep) if r.strip()]
        else:
            cfg = load_config()
            if cfg and cfg.get("allowed_roots"):
                roots_to_check = cfg.get("allowed_roots")

    if roots_to_check:
        is_allowed = False
        for ar in roots_to_check:
            try:
                canon_ar = os.path.realpath(os.path.abspath(ar))
                if canonical == canon_ar or Path(canonical).is_relative_to(Path(canon_ar)):
                    is_allowed = True
                    break
            except Exception:
                pass
        if not is_allowed:
            return {
                "is_valid": False,
                "is_git_repo": False,
                "error_message": f"Workspace '{canonical}' is outside the permitted workspace root allowlist."
            }

    # 5. Path existence and directory type
    if not os.path.exists(canonical):
        return {
            "is_valid": False,
            "is_git_repo": False,
            "error_message": f"Thư mục không tồn tại trên máy Runner: {canonical}"
        }

    if not os.path.isdir(canonical):
        return {
            "is_valid": False,
            "is_git_repo": False,
            "error_message": f"Đường dẫn không phải là một thư mục: {canonical}"
        }

    # 6. Read / Write permissions check
    if not os.access(canonical, os.R_OK):
        return {
            "is_valid": False,
            "is_git_repo": False,
            "error_message": f"Không có quyền đọc (Read) thư mục: {canonical}"
        }

    if not os.access(canonical, os.W_OK):
        return {
            "is_valid": False,
            "is_git_repo": False,
            "error_message": f"Không có quyền ghi (Write) vào thư mục: {canonical}"
        }

    # 7. Check Git repository status
    git_dir = Path(canonical) / ".git"
    is_git = git_dir.exists()

    default_branch = "main"
    last_commit_hash = None
    has_uncommitted = False

    if is_git:
        git_cmd = shutil.which("git")
        if git_cmd:
            try:
                # Get current branch
                out_branch = subprocess.check_output(
                    [git_cmd, "rev-parse", "--abbrev-ref", "HEAD"],
                    cwd=canonical,
                    text=True,
                    timeout=5
                ).strip()
                if out_branch:
                    default_branch = out_branch
            except Exception:
                pass

            try:
                # Get last commit
                out_commit = subprocess.check_output(
                    [git_cmd, "rev-parse", "HEAD"],
                    cwd=canonical,
                    text=True,
                    timeout=5
                ).strip()
                if out_commit:
                    last_commit_hash = out_commit
            except Exception:
                pass

            try:
                # Check uncommitted changes
                out_status = subprocess.check_output(
                    [git_cmd, "status", "--porcelain"],
                    cwd=canonical,
                    text=True,
                    timeout=5
                ).strip()
                has_uncommitted = len(out_status) > 0
            except Exception:
                pass

    return {
        "is_valid": True,
        "is_git_repo": is_git,
        "canonical_path": canonical,
        "default_branch": default_branch,
        "last_commit_hash": last_commit_hash,
        "has_uncommitted_changes": has_uncommitted,
        "error_message": None
    }


def run_attempt_execution(
    ctx: Dict[str, Any],
    mode: str,
    server: str,
    secret: str
):
    """Executes an attempt (initial plan or resumed accept-edits) with reliable event delivery."""
    task_id = ctx["task_id"]
    attempt_id = ctx["attempt_id"]
    target_workspace = ctx["target_workspace"]
    prompt = ctx["prompt"]
    title = ctx["title"]
    verif_policy_data = ctx.get("verif_policy_data")
    is_isolated = ctx.get("is_isolated", False)
    git_mgr = ctx.get("git_mgr")
    base_commit = ctx.get("base_commit", "HEAD")

    adapter = AntigravityCLIAdapter()
    spec = ExecutionSpec(
        task_id=task_id,
        attempt_id=attempt_id,
        workspace_path=target_workspace,
        prompt=prompt,
        mode=mode,
        title=title
    )
    policy = ExecutionPolicy()

    event_batch: List[Dict[str, Any]] = []
    last_batch_time = time.time()
    batch_lock = threading.Lock()
    is_running = True

    PRIORITY_EVENTS = {"STATUS_TRANSITION", "TASK_TERMINATED", "PROCESS_STARTED", "ERROR"}

    def flush_events():
        nonlocal event_batch, last_batch_time
        with batch_lock:
            if not event_batch:
                return
            to_send = list(event_batch)
            event_batch.clear()
            last_batch_time = time.time()

        max_retries = 3
        for retry in range(max_retries):
            try:
                http_json_post(
                    f"{server}/api/v1/orchestrator/runners/tasks/events",
                    {"attempt_id": attempt_id, "events": to_send},
                    headers={"Authorization": f"Bearer {secret}"}
                )
                return
            except Exception as e:
                print(f"[!] Warning: failed to send event batch (attempt {retry+1}/{max_retries}): {e}")
                if retry < max_retries - 1:
                    time.sleep(0.3 * (2 ** retry))
                else:
                    with batch_lock:
                        event_batch = to_send + event_batch

    def event_cb(evt: NormalizedEvent):
        nonlocal last_batch_time
        is_priority = evt.event_type in PRIORITY_EVENTS
        with batch_lock:
            event_batch.append(evt.to_dict())
            count = len(event_batch)

        if is_priority or count >= 5 or (time.time() - last_batch_time) > 0.5:
            flush_events()

    def flush_worker():
        while is_running:
            time.sleep(0.35)
            with batch_lock:
                has_items = bool(event_batch)
                elapsed = time.time() - last_batch_time
            if has_items and elapsed >= 0.4:
                flush_events()

    worker_thread = threading.Thread(target=flush_worker, daemon=True)
    worker_thread.start()

    active_adapters[attempt_id] = adapter
    diff_stat = None

    try:
        result = adapter.execute(spec, policy, event_cb)
        flush_events()

        # If execution succeeded in accept-edits mode, run Verification Pipeline and collect diff
        if result.status == "COMPLETED" and mode == "accept-edits":
            print(f"[*] Running Verification Pipeline for task {task_id}...")
            event_cb(NormalizedEvent(
                sequence_number=9990,
                task_id=task_id,
                attempt_id=attempt_id,
                runner_id=None,
                runtime="antigravity",
                event_type="STATUS_TRANSITION",
                payload={"from_status": "RUNNING", "to_status": "VERIFYING"}
            ))
            flush_events()

            vp = VerificationPolicy.from_dict(verif_policy_data)
            v_pipeline = VerificationPipeline(target_workspace, vp)
            v_res = v_pipeline.run_all()

            print(f"[+] Verification completed: overall_status={v_res['overall_status']}")
            for step in v_res["steps"]:
                print(f"    - Step '{step['step_name']}': {step['status']} ({step['command']}) in {step['duration_seconds']}s")

            try:
                http_json_post(
                    f"{server}/api/v1/orchestrator/runners/tasks/verification-reports",
                    {
                        "attempt_id": attempt_id,
                        "steps": v_res["steps"],
                        "overall_status": v_res["overall_status"]
                    },
                    headers={"Authorization": f"Bearer {secret}"}
                )
            except Exception as e:
                print(f"[!] Warning: failed to send verification reports: {e}")

            if is_isolated and git_mgr:
                try:
                    diff_res = git_mgr.collect_diff(target_workspace, base_commit=base_commit)
                    diff_stat = diff_res.get("stat")
                    diff_content = diff_res["diff"]
                    diff_bytes = diff_content.encode("utf-8")
                    result.artifacts.append({
                        "artifact_type": "diff",
                        "display_name": "Unified Git Diff",
                        "file_path": "worktree.diff",
                        "content": diff_content,
                        "byte_size": len(diff_bytes),
                        "mime_type": "text/x-diff",
                        "checksum_sha256": hashlib.sha256(diff_bytes).hexdigest()
                    })
                    print(f"[+] Unified Git diff collected: {diff_res['byte_size']} bytes (capped={diff_res['is_truncated']})")
                except Exception as e:
                    print(f"[!] Warning: failed to collect worktree diff: {e}")

        # Send task completion to backend
        http_json_post(
            f"{server}/api/v1/orchestrator/runners/tasks/complete",
            {
                "attempt_id": attempt_id,
                "status": result.status,
                "exit_code": result.exit_code,
                "duration_seconds": result.duration_seconds,
                "tokens_in": result.tokens_in,
                "tokens_out": result.tokens_out,
                "cost_estimate": result.cost_estimate,
                "summary": result.summary,
                "error_message": result.error_message,
                "artifacts": result.artifacts,
                "worktree_path": target_workspace if is_isolated else None,
                "is_isolated": is_isolated,
                "diff_stat": diff_stat
            },
            headers={"Authorization": f"Bearer {secret}"}
        )
        print(f"[<-] Task {task_id} attempt {attempt_id} completed: status={result.status} (exit={result.exit_code}, duration={result.duration_seconds}s)")
    except Exception as e:
        print(f"[!] Error during task execution: {e}")
        try:
            http_json_post(
                f"{server}/api/v1/orchestrator/runners/tasks/complete",
                {
                    "attempt_id": attempt_id,
                    "status": "FAILED",
                    "exit_code": -1,
                    "error_message": str(e)
                },
                headers={"Authorization": f"Bearer {secret}"}
            )
        except Exception:
            pass
    finally:
        is_running = False
        flush_events()
        active_adapters.pop(attempt_id, None)
        active_attempts.discard(attempt_id)


def handle_task_dispatch(data_obj: Dict[str, Any], server: str, runner_id: str, secret: str):
    """Handles an incoming TASK_DISPATCH message from orchestrator."""
    task_id = data_obj.get("task_id")
    attempt_id = data_obj.get("attempt_id")
    attempt_number = data_obj.get("attempt_number", 1)
    local_path = data_obj.get("local_path") or (data_obj.get("workspace", {}).get("local_path") if isinstance(data_obj.get("workspace"), dict) else None)
    prompt = data_obj.get("prompt") or (data_obj.get("spec", {}).get("prompt") if isinstance(data_obj.get("spec"), dict) else None)
    mode = data_obj.get("mode") or (data_obj.get("spec", {}).get("mode") if isinstance(data_obj.get("spec"), dict) else None) or "plan"
    title = data_obj.get("title", "")
    verif_policy_data = data_obj.get("verification_policy")

    # Idempotency guard: prevent duplicate concurrent execution of same attempt
    if attempt_id in active_attempts:
        print(f"[!] Attempt {attempt_id} is already active. Ignoring duplicate dispatch.")
        return
    active_attempts.add(attempt_id)

    print(f"\n[->] Dispatched Task received: {task_id}")
    print(f"     Attempt: {attempt_id} (#{attempt_number}) | Mode: {mode}")
    print(f"     Title: {title}")
    print(f"     Workspace: {local_path}")

    # Explicit ACK/Claim to backend
    try:
        http_json_post(
            f"{server}/api/v1/orchestrator/runners/tasks/claim",
            {"attempt_id": attempt_id},
            headers={"Authorization": f"Bearer {secret}"}
        )
        print(f"[+] Task attempt {attempt_id} claimed successfully.")
    except Exception as e:
        print(f"[!] Warning: Claim failed for attempt {attempt_id}: {e}")

    # Validate workspace path on host first
    val = validate_host_path(local_path)
    if not val["is_valid"]:
        print(f"[!] Workspace path validation failed: {val['error_message']}")
        try:
            http_json_post(
                f"{server}/api/v1/orchestrator/runners/tasks/complete",
                {
                    "attempt_id": attempt_id,
                    "status": "FAILED",
                    "exit_code": -1,
                    "error_message": val["error_message"]
                },
                headers={"Authorization": f"Bearer {secret}"}
            )
        except Exception as e:
            print(f"[!] Error reporting task failure: {e}")
        finally:
            active_attempts.discard(attempt_id)
        return

    canonical_ws = val.get("canonical_path", local_path)
    target_workspace = canonical_ws
    git_mgr = None
    is_isolated = False
    worktree_path = None
    base_commit = "HEAD"

    # Check Git repository & setup Worktree isolation
    if val.get("is_git_repo"):
        try:
            git_mgr = GitIsolationManager(canonical_ws)
            wt_status = git_mgr.check_working_tree_status()
            if wt_status.get("has_uncommitted_changes"):
                print(f"[*] Main working tree has {wt_status.get('uncommitted_file_count')} uncommitted modifications.")
                print("    Creating clean isolated worktree off HEAD to protect user working directory...")

            wt_info = git_mgr.create_worktree(
                task_id=task_id,
                attempt_id=attempt_id,
                attempt_number=attempt_number,
                base_commit="HEAD"
            )
            target_workspace = wt_info["worktree_path"]
            worktree_path = wt_info["worktree_path"]
            is_isolated = True
            base_commit = wt_info.get("base_commit", "HEAD")
            print(f"[+] Isolated Git worktree prepared at: {target_workspace} (branch: {wt_info['branch_name']})")
        except Exception as e:
            print(f"[!] Warning: Git worktree isolation failed ({e}). Falling back to main working tree.")
            target_workspace = canonical_ws
            is_isolated = False

    # Safety Invariant: Before Implement / accept-edits:
    # If working tree has uncommitted modifications and worktree isolation is NOT available,
    # refuse destructive execution to preserve user uncommitted work.
    if mode == "accept-edits" and not is_isolated and val.get("has_uncommitted_changes"):
        err_msg = (
            "Không thể thực thi accept-edits trực tiếp: Workspace đang có thay đổi chưa commit "
            "(uncommitted changes) và không thể thiết lập Git worktree isolation. "
            "Vui lòng commit hoặc dọn dẹp các thay đổi trước để bảo vệ mã nguồn."
        )
        print(f"[!] Safety check failed: {err_msg}")
        try:
            http_json_post(
                f"{server}/api/v1/orchestrator/runners/tasks/complete",
                {
                    "attempt_id": attempt_id,
                    "status": "FAILED",
                    "exit_code": -1,
                    "error_message": err_msg
                },
                headers={"Authorization": f"Bearer {secret}"}
            )
        except Exception as e:
            print(f"[!] Error reporting safety rejection: {e}")
        finally:
            active_attempts.discard(attempt_id)
        return

    # Save context for resumption when plan is approved
    ctx = {
        "task_id": task_id,
        "attempt_id": attempt_id,
        "attempt_number": attempt_number,
        "canonical_ws": canonical_ws,
        "target_workspace": target_workspace,
        "git_mgr": git_mgr,
        "is_isolated": is_isolated,
        "worktree_path": worktree_path,
        "base_commit": base_commit,
        "prompt": prompt,
        "title": title,
        "verif_policy_data": verif_policy_data
    }
    saved_task_contexts[attempt_id] = ctx

    run_attempt_execution(ctx, mode, server, secret)


def handle_task_resume(ctx: Dict[str, Any], server: str, runner_id: str, secret: str):
    """Resumes execution of an approved task in accept-edits mode."""
    attempt_id = ctx["attempt_id"]
    if attempt_id in active_attempts:
        print(f"[!] Attempt {attempt_id} is already executing. Ignoring duplicate resume.")
        return
    active_attempts.add(attempt_id)

    print(f"\n[->] Resuming execution for approved task: {ctx['task_id']} (attempt: {attempt_id})")
    run_attempt_execution(ctx, "accept-edits", server, secret)

# ==============================================================================
# RUNNER COMMAND HANDLERS
# ==============================================================================

def cmd_pair(args):
    server = args.server.rstrip("/")
    token = args.token
    name = args.name or f"{platform.node()}-{sys.platform}"

    print(f"[*] Pairing with AI-Chan server at {server}...")
    plat_info = get_platform_info()
    caps = detect_cli_capabilities()

    payload = {
        "pairing_token": token,
        "name": name,
        "machine_name": plat_info["machine_name"],
        "platform": plat_info["platform"],
        "architecture": plat_info["architecture"],
        "capabilities": caps,
        "system_info": {"os_version": plat_info["os_version"]}
    }

    try:
        res = http_json_post(f"{server}/api/v1/orchestrator/runners/pair", payload)
    except Exception as e:
        print(f"[!] Pairing failed: {e}")
        sys.exit(1)

    runner_id = res["runner_id"]
    runner_secret = res["runner_secret"]

    save_config({
        "server_url": server,
        "runner_id": runner_id,
        "runner_secret": runner_secret,
        "paired_at": time.time(),
        "name": name
    })

    print(f"[+] Pairing SUCCESSFUL!")
    print(f"    Runner ID:     {runner_id}")
    print(f"    Credentials:   Saved securely to {CONFIG_FILE}")
    print(f"\nNext: Run daemon using: python -m runner start")


def cmd_status(args):
    cfg = load_config()
    if not cfg:
        print(f"[-] No runner paired yet. Use `python -m runner pair` first.")
        sys.exit(1)

    print(f"[i] AI-Chan Agent Runner Status:")
    print(f"    Server:     {cfg.get('server_url')}")
    print(f"    Runner ID:  {cfg.get('runner_id')}")
    print(f"    Name:       {cfg.get('name')}")
    caps = detect_cli_capabilities()
    print(f"    Antigravity CLI: {'Installed (' + caps['antigravity'].get('version', '') + ')' if caps.get('antigravity', {}).get('available') else 'Not Found'}")
    print(f"    Git CLI:         {'Installed (' + caps['git'].get('version', '') + ')' if caps.get('git', {}).get('available') else 'Not Found'}")


def cmd_start(args):
    cfg = load_config()
    if not cfg:
        print(f"[!] No paired runner configuration found. Please run `pair` first.")
        sys.exit(1)

    server = (args.server or cfg.get("server_url", "http://localhost:8000")).rstrip("/")
    runner_id = cfg["runner_id"]
    runner_secret = cfg["runner_secret"]

    print(f"[*] Starting AI-Chan Agent Runner daemon...")
    print(f"    Runner ID: {runner_id}")
    print(f"    Server:    {server}")

    running = True

    def handle_sigint(sig, frame):
        nonlocal running
        print("\n[*] Received shutdown signal. Stopping runner cleanly...")
        running = False

    signal.signal(signal.SIGINT, handle_sigint)
    signal.signal(signal.SIGTERM, handle_sigint)

    headers = {"Authorization": f"Bearer {runner_secret}"}

    # Initial Heartbeat
    try:
        http_json_post(
            f"{server}/api/v1/orchestrator/runners/{runner_id}/heartbeat",
            {"cpu_percent": 5.0, "memory_percent": 40.0},
            headers=headers
        )
        print("[+] Initial heartbeat acknowledged by server.")
    except Exception as e:
        print(f"[!] Warning: Initial heartbeat failed ({e}). Retrying in loop...")

    # Outbound long-lived SSE / polling loop
    backoff = 2.0
    last_hb = time.time()

    channel_url = f"{server}/api/v1/orchestrator/runners/{runner_id}/channel"
    print(f"[*] Connecting outbound channel to {channel_url}...")

    while running:
        try:
            req = urllib.request.Request(channel_url, headers=headers)
            with urllib.request.urlopen(req, timeout=30) as resp:
                print(f"[+] Outbound SSE Channel connected! Listening for tasks & challenges...")
                backoff = 2.0

                current_event = None
                for line in resp:
                    if not running:
                        break
                    line_str = line.decode("utf-8").strip()
                    if not line_str:
                        continue

                    if line_str.startswith("event:"):
                        current_event = line_str.split(":", 1)[1].strip()
                    elif line_str.startswith("data:"):
                        data_str = line_str.split(":", 1)[1].strip()
                        try:
                            data_obj = json.loads(data_str)
                        except Exception:
                            data_obj = {}

                        # Handle Event
                        if current_event == "validate_workspace":
                            ws_id = data_obj.get("workspace_id")
                            l_path = data_obj.get("local_path")
                            ch_id = data_obj.get("challenge_id")
                            print(f"[->] Received Workspace Validation Challenge: {ws_id} ({l_path})")

                            val_result = validate_host_path(l_path)
                            val_result["workspace_id"] = ws_id
                            val_result["challenge_id"] = ch_id

                            try:
                                http_json_post(
                                    f"{server}/api/v1/orchestrator/runners/{runner_id}/validation-result",
                                    val_result,
                                    headers=headers
                                )
                                print(f"[<-] Posted validation result: status={val_result.get('is_valid')} (git={val_result.get('is_git_repo')})")
                            except Exception as e:
                                print(f"[!] Error posting validation result: {e}")

                        elif current_event == "TASK_DISPATCH":
                            threading.Thread(
                                target=handle_task_dispatch,
                                args=(data_obj, server, runner_id, runner_secret),
                                daemon=True
                            ).start()

                        elif current_event == "TASK_CANCEL":
                            att_id = data_obj.get("attempt_id")
                            if att_id and att_id in active_adapters:
                                print(f"[!] Received cancellation for attempt: {att_id}")
                                active_adapters[att_id].cancel(att_id)

                        elif current_event == "TASK_RESUME_APPROVED":
                            att_id = data_obj.get("attempt_id")
                            print(f"[->] Plan approved for attempt: {att_id}. Resuming execution in accept-edits mode...")
                            saved_ctx = saved_task_contexts.get(att_id)
                            if saved_ctx:
                                threading.Thread(
                                    target=handle_task_resume,
                                    args=(saved_ctx, server, runner_id, runner_secret),
                                    daemon=True
                                ).start()
                            else:
                                print(f"[!] Warning: No saved context for attempt {att_id} to resume.")

                        elif current_event == "ping":
                            pass  # Keepalive ping received

                    # Periodic Heartbeat check
                    if time.time() - last_hb > 25:
                        try:
                            http_json_post(
                                f"{server}/api/v1/orchestrator/runners/{runner_id}/heartbeat",
                                {"cpu_percent": 10.0, "memory_percent": 45.0},
                                headers=headers
                            )
                            last_hb = time.time()
                        except Exception:
                            pass

        except Exception as e:
            if not running:
                break
            sleep_time = min(backoff + random.uniform(0, 1), 30.0)
            print(f"[!] Channel disconnected ({e}). Reconnecting in {sleep_time:.1f}s...")
            time.sleep(sleep_time)
            backoff = min(backoff * 1.5, 30.0)

            # Still send heartbeat if channel failed
            if time.time() - last_hb > 25:
                try:
                    http_json_post(
                        f"{server}/api/v1/orchestrator/runners/{runner_id}/heartbeat",
                        {},
                        headers=headers
                    )
                    last_hb = time.time()
                except Exception:
                    pass

    print("[*] Runner daemon stopped.")


def main():
    parser = argparse.ArgumentParser(description="AI-Chan Agent Runner Daemon")
    parser.add_argument("--version", action="version", version="AI-Chan Agent Runner 1.0.0")
    subparsers = parser.add_subparsers(dest="command")

    p_pair = subparsers.add_parser("pair", help="Pair runner with AI-Chan backend using token")
    p_pair.add_argument("--server", required=True, help="AI-Chan backend URL (e.g. http://localhost:8000)")
    p_pair.add_argument("--token", required=True, help="One-time pairing token (rpt_...)")
    p_pair.add_argument("--name", help="Display name for this runner")

    p_start = subparsers.add_parser("start", help="Start background runner listener daemon")
    p_start.add_argument("--server", help="Override backend URL")

    p_status = subparsers.add_parser("status", help="Show runner pairing and status")

    p_val = subparsers.add_parser("validate-path", help="Test local filesystem validation on a path")
    p_val.add_argument("path", help="Local directory path to test")

    p_task = subparsers.add_parser("run-task", help="Execute a task directly on local workspace")
    p_task.add_argument("--prompt", required=True, help="Task prompt")
    p_task.add_argument("--workspace", required=True, help="Workspace directory path")
    p_task.add_argument("--mode", default="plan", choices=["plan", "accept-edits"], help="Execution mode")

    args = parser.parse_args()

    if args.command == "pair":
        cmd_pair(args)
    elif args.command == "start":
        cmd_start(args)
    elif args.command == "status":
        cmd_status(args)
    elif args.command == "validate-path":
        res = validate_host_path(args.path)
        print(json.dumps(res, indent=2))
    elif args.command == "run-task":
        adapter = AntigravityCLIAdapter()
        prereqs = adapter.check_prerequisites()
        if not prereqs["available"]:
            print(f"[!] CLI Check failed: {prereqs.get('error')}")
            sys.exit(1)
        print(f"[+] Using Antigravity CLI: {prereqs.get('executable')} ({prereqs.get('version')})")
        spec = ExecutionSpec(
            task_id=f"tsk_cli_{uuid.uuid4().hex[:8]}",
            attempt_id=f"att_cli_{uuid.uuid4().hex[:8]}",
            workspace_path=args.workspace,
            prompt=args.prompt,
            mode=args.mode
        )
        policy = ExecutionPolicy()
        def print_evt(evt):
            if evt.event_type == "TEXT_DELTA":
                sys.stdout.write(evt.payload.get("text_delta", ""))
                sys.stdout.flush()
            elif evt.event_type in ("TOOL_CALL_START", "TOOL_CALL_END", "TASK_INITIALIZED", "TASK_COMPLETED", "TASK_FAILED"):
                print(f"\n[{evt.event_type}] {json.dumps(evt.payload, ensure_ascii=False)}")
        res = adapter.execute(spec, policy, print_evt)
        print(f"\n[+] Execution Finished: status={res.status}, exit_code={res.exit_code}, duration={res.duration_seconds}s")
    else:
        parser.print_help()


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
    main()

