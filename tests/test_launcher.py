"""
AI-Chan Demo Launcher & Automation Verification Suite
Path: tests/test_launcher.py
Validates:
  - run-demo.bat and run-demo.ps1 entrypoint integrity
  - Root directory resolution from disparate current working directories
  - Window title, CMD command line, and banner formatting
  - tools/tee.py unbuffered UTF-8 streaming and file recording
  - Lifecycle management: structured PID tracking, process-tree termination, stop cleanup
  - Secret masking in logs, commands, and console titles
"""

import os
import sys
import json
import time
import subprocess
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
VENV_PYTHON = REPO_ROOT / "ai-backend" / ".venv" / "Scripts" / "python.exe"
PYTHON_EXE = str(VENV_PYTHON) if VENV_PYTHON.exists() else sys.executable


class TestLauncherScripts(unittest.TestCase):
    """Verifies existence, syntax, and basic invocation of launcher entrypoints."""

    def test_entrypoint_files_exist(self):
        bat = REPO_ROOT / "run-demo.bat"
        ps1 = REPO_ROOT / "run-demo.ps1"
        stop_bat = REPO_ROOT / "stop-demo.bat"
        tee_py = REPO_ROOT / "tools" / "tee.py"

        self.assertTrue(bat.exists(), "run-demo.bat must exist")
        self.assertTrue(ps1.exists(), "run-demo.ps1 must exist")
        self.assertTrue(stop_bat.exists(), "stop-demo.bat must exist")
        self.assertTrue(tee_py.exists(), "tools/tee.py must exist")

    def test_service_wrapper_scripts_exist_and_have_titles(self):
        expected_wrappers = {
            "run-backend.cmd": "AI-Chan ^| Backend API",
            "run-frontend.cmd": "AI-Chan ^| Frontend",
            "run-runner.cmd": "AI-Chan ^| Agent Runner",
            "run-discord.cmd": "AI-Chan ^| Discord Bot"
        }

        for fname, title_str in expected_wrappers.items():
            fpath = REPO_ROOT / "tools" / fname
            self.assertTrue(fpath.exists(), f"Service wrapper {fname} must exist in tools/")
            content = fpath.read_text(encoding="utf-8", errors="replace")
            self.assertIn("title " + title_str, content, f"{fname} must set CMD title to {title_str}")
            self.assertIn("tools\\tee.py", content, f"{fname} must route output through tools/tee.py")
            self.assertIn("pause", content, f"{fname} must include pause on exit to preserve error inspection")

    def test_preflight_diagnostics_check_flag(self):
        cmd = [
            "powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass",
            "-File", str(REPO_ROOT / "run-demo.ps1"), "-Check"
        ]
        res = subprocess.run(cmd, cwd=str(REPO_ROOT), capture_output=True, text=True, timeout=15)
        self.assertEqual(res.returncode, 0, f"run-demo.ps1 -Check must exit with 0. Output:\n{res.stdout}\n{res.stderr}")
        self.assertIn("AI-Chan Preflight Diagnostics", res.stdout)
        self.assertIn("Python Interpreter", res.stdout)
        self.assertIn("Node.js", res.stdout)
        self.assertIn("Preflight Diagnostics Complete", res.stdout)

    def test_root_directory_resolution_from_disparate_cwd(self):
        # Run run-demo.bat --check with cwd set to user home directory
        cmd = [str(REPO_ROOT / "run-demo.bat"), "--check"]
        res = subprocess.run(cmd, cwd=str(Path.home()), capture_output=True, text=True, timeout=15)
        self.assertEqual(res.returncode, 0, f"run-demo.bat must execute cleanly from different cwd:\n{res.stdout}\n{res.stderr}")
        self.assertIn("Preflight Diagnostics Complete", res.stdout)

    def test_cmd_argument_quoting_does_not_trigger_filename_syntax_error(self):
        """Verifies that double-quoted arguments to cmd.exe execute without filename syntax error."""
        ps_script = (
            '$testScript = Join-Path $PWD.Path "test_dummy.cmd"; '
            'Set-Content -Path $testScript -Value "@echo off`necho SUCCESS_ECHO"; '
            'try { '
            '  $arg = "/c `"`"$testScript`" 8000 `"dummy_arg`"`""; '
            '  $proc = Start-Process -FilePath "cmd.exe" -ArgumentList $arg -PassThru -Wait -NoNewWindow; '
            '  exit $proc.ExitCode '
            '} finally { '
            '  if (Test-Path $testScript) { Remove-Item $testScript -Force } '
            '}'
        )
        cmd = [
            "powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass",
            "-Command", ps_script
        ]
        res = subprocess.run(cmd, cwd=str(REPO_ROOT), capture_output=True, text=True, timeout=10)
        self.assertEqual(res.returncode, 0, f"cmd.exe double quote parsing failed:\n{res.stdout}\n{res.stderr}")
        self.assertNotIn("The filename, directory name, or volume label syntax is incorrect", res.stdout)
        self.assertIn("SUCCESS_ECHO", res.stdout)



class TestTeeUtility(unittest.TestCase):
    """Verifies that tools/tee.py reliably streams unbuffered text to stdout and appends to log file."""

    def setUp(self):
        self.test_log = REPO_ROOT / "logs" / "test_tee_verify.log"
        if self.test_log.exists():
            self.test_log.unlink()

    def tearDown(self):
        if self.test_log.exists():
            self.test_log.unlink()

    def test_tee_streams_stdout_and_writes_file(self):
        tee_script = REPO_ROOT / "tools" / "tee.py"
        input_data = "Line 1: Hello AI-Chan\nLine 2: 🤖 Emoji and UTF-8 verification\nLine 3: Finished\n"

        cmd = [PYTHON_EXE, "-u", str(tee_script), str(self.test_log)]
        res = subprocess.run(cmd, input=input_data, capture_output=True, text=True, encoding="utf-8", timeout=5)

        self.assertEqual(res.returncode, 0)
        norm_stdout = res.stdout.replace("\r\n", "\n")
        self.assertIn("Line 1: Hello AI-Chan", norm_stdout)
        self.assertIn("Line 2: 🤖 Emoji and UTF-8 verification", norm_stdout)

        self.assertTrue(self.test_log.exists(), "Log file must be created")
        log_content = self.test_log.read_text(encoding="utf-8").replace("\r\n", "\n")
        self.assertIn("Line 1: Hello AI-Chan", log_content)
        self.assertIn("Line 2: 🤖 Emoji and UTF-8 verification", log_content)


class TestLifecycleAndProcessManagement(unittest.TestCase):
    """Verifies structured PID tracking, stop handler, and clean process-tree shutdown."""

    def test_stop_handler_with_no_pids_exits_cleanly(self):
        cmd = [
            "powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass",
            "-File", str(REPO_ROOT / "run-demo.ps1"), "-Stop"
        ]
        res = subprocess.run(cmd, cwd=str(REPO_ROOT), capture_output=True, text=True, timeout=10)
        self.assertEqual(res.returncode, 0)
        self.assertIn("Stopping AI-Chan Demo Services", res.stdout)
        self.assertIn("All demo processes stopped cleanly", res.stdout)

    def test_mock_service_process_tree_termination(self):
        """Spawns a mock CMD process tree, writes mock .demo_pids.json, and verifies Stop cleanly kills it."""
        mock_pid_file = REPO_ROOT / ".demo_pids.json"

        # Spawn a long-running CMD process
        cmd_proc = subprocess.Popen(
            ["cmd.exe", "/k", "title AI-Chan ^| Mock Test & ping 127.0.0.1 -n 30 > nul"],
            cwd=str(REPO_ROOT)
        )

        try:
            self.assertIsNone(cmd_proc.poll(), "Mock process should be running")

            # Write structured PID file
            mock_data = {
                "session_id": "test_mock_session",
                "started_at": "2026-10-16T21:40:00Z",
                "backend": {"pid": cmd_proc.pid, "service": "Mock Backend"}
            }
            mock_pid_file.write_text(json.dumps(mock_data), encoding="utf-8")

            # Invoke stop
            cmd = [
                "powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass",
                "-File", str(REPO_ROOT / "run-demo.ps1"), "-Stop"
            ]
            res = subprocess.run(cmd, cwd=str(REPO_ROOT), capture_output=True, text=True, timeout=10)
            self.assertEqual(res.returncode, 0)
            self.assertIn(f"Stopped Mock Backend (PID: {cmd_proc.pid})", res.stdout)

            # Confirm process was terminated
            time.sleep(0.5)
            self.assertIsNotNone(cmd_proc.poll(), "cmd.exe process must be terminated")
            self.assertFalse(mock_pid_file.exists(), ".demo_pids.json must be removed after clean stop")
        finally:
            if cmd_proc.poll() is None:
                cmd_proc.kill()
            if mock_pid_file.exists():
                mock_pid_file.unlink()


class TestSecretMasking(unittest.TestCase):
    """Ensures no tokens or secrets appear in wrapper scripts or console outputs."""

    def test_no_raw_secrets_in_wrapper_scripts(self):
        for cmd_file in (REPO_ROOT / "tools").glob("*.cmd"):
            content = cmd_file.read_text(encoding="utf-8", errors="replace")
            self.assertNotIn("DISCORD_BOT_TOKEN=", content)
            self.assertNotIn("runner_secret", content)
            self.assertNotIn("ANTIGRAVITY_API_KEY", content)


if __name__ == "__main__":
    unittest.main()
