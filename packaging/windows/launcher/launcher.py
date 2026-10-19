"""
AI-Chan Windows Desktop Launcher & Process Supervisor
Manages local services, health readiness, default browser navigation,
and graceful shutdown without requiring terminal windows or dev toolchains.
"""
import os
import sys
import time
import json
import socket
import logging
import sqlite3
import shutil
import ctypes
import argparse
import subprocess
import webbrowser
from pathlib import Path
from logging.handlers import RotatingFileHandler

# Windows API constants
CREATE_NO_WINDOW = 0x08000000
MB_ICONERROR = 0x00000010
MB_ICONINFORMATION = 0x00000040
MB_OK = 0x00000000
ERROR_ALREADY_EXISTS = 183

APP_NAME = "AI-Chan"
MUTEX_NAME = "Global\\AI_Chan_App_Instance_Mutex"


def get_app_dir() -> Path:
    """Returns application root directory where executable or scripts reside."""
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent.parent.parent


def get_user_data_dir() -> Path:
    """Resolves Windows user data directory %LOCALAPPDATA%\\AI-Chan."""
    local_app_data = os.environ.get("LOCALAPPDATA")
    if local_app_data:
        base = Path(local_app_data)
    else:
        base = Path.home() / "AppData" / "Local"
    app_data = base / APP_NAME
    app_data.mkdir(parents=True, exist_ok=True)
    return app_data


def show_message_box(title: str, message: str, is_error: bool = True):
    """Displays native Windows dialog without requiring console or terminal."""
    try:
        flags = MB_OK | (MB_ICONERROR if is_error else MB_ICONINFORMATION)
        ctypes.windll.user32.MessageBoxW(0, str(message), str(title), flags)
    except Exception:
        print(f"[{title}] {message}", file=sys.stderr)


class MaskingFormatter(logging.Formatter):
    """Redacts tokens, API keys, and credentials from log output."""
    SENSITIVE_KEYS = ["DISCORD_BOT_TOKEN", "OPENAI_API_KEY", "GEMINI_API_KEY", "ANTHROPIC_API_KEY", "GROQ_API_KEY", "SECRET_KEY"]

    def format(self, record):
        s = super().format(record)
        for key in self.SENSITIVE_KEYS:
            if key in s:
                import re
                s = re.sub(rf"({key}\s*[:=]\s*)(['\"][^'\"]+['\"]|\S+)", r"\1***REDACTED***", s)
        return s


def setup_logger(log_dir: Path) -> logging.Logger:
    """Initializes rotating logger in user data directory."""
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "launcher.log"
    logger = logging.getLogger("ai_chan_launcher")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()

    handler = RotatingFileHandler(
        str(log_file),
        maxBytes=10 * 1024 * 1024,  # 10 MB limit
        backupCount=3,
        encoding="utf-8"
    )
    handler.setFormatter(MaskingFormatter("[%(asctime)s] [%(levelname)s] %(message)s"))
    logger.addHandler(handler)

    # Console stream for debugging if run with console
    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(MaskingFormatter("[%(levelname)s] %(message)s"))
    logger.addHandler(console)
    return logger


def is_port_available(port: int, host: str = "127.0.0.1") -> bool:
    """Checks if a loopback port is currently free."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        try:
            s.bind((host, port))
            return True
        except socket.error:
            return False


def find_available_port(start_port: int, max_attempts: int = 50, host: str = "127.0.0.1") -> int:
    """Finds next available loopback port starting from start_port."""
    for p in range(start_port, start_port + max_attempts):
        if is_port_available(p, host):
            return p
    raise RuntimeError(f"Could not find an available port in range {start_port}-{start_port + max_attempts}")


def initialize_database(data_dir: Path, app_dir: Path, logger: logging.Logger) -> Path:
    """
    Initializes database from schema.sql and migrations if missing.
    If database exists, creates a timestamped safety backup and applies migrations.
    """
    db_path = data_dir / "ai_chan.db"
    backup_dir = data_dir.parent / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)

    # Locate schema and migrations
    possible_roots = [
        app_dir / "backend" / "ai-chan-backend" / "_internal" / "database",
        app_dir / "backend" / "ai-chan-backend" / "database",
        app_dir / "backend" / "database",
        app_dir / "ai-backend" / "database",
    ]
    schema_file = None
    migrations_dir = None
    for r in possible_roots:
        if (r / "schema.sql").exists():
            schema_file = r / "schema.sql"
            migrations_dir = r / "migrations"
            break

    if not schema_file or not schema_file.exists():
        logger.warning(f"Could not locate schema.sql in {possible_roots}. Checking if database exists.")
        if db_path.exists():
            return db_path
        raise FileNotFoundError(f"schema.sql not found in candidate paths: {[str(p) for p in possible_roots]}")

    is_new = not db_path.exists()

    if not is_new:
        # Create safety backup before migrations
        ts = time.strftime("%Y%m%d_%H%M%S")
        backup_file = backup_dir / f"ai_chan_backup_{ts}.db"
        try:
            shutil.copy2(str(db_path), str(backup_file))
            logger.info(f"Created safety backup at {backup_file}")
        except Exception as e:
            logger.warning(f"Backup warning: {e}")

    # Connect to SQLite database
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA foreign_keys = ON;")
    cur = conn.cursor()

    if is_new:
        logger.info(f"Initializing new database at {db_path} with {schema_file.name}")
        with open(schema_file, "r", encoding="utf-8") as f:
            cur.executescript(f.read())
        conn.commit()

    # Apply migrations if available
    if migrations_dir and migrations_dir.exists():
        for mfile in sorted(migrations_dir.glob("*.sql")):
            try:
                with open(mfile, "r", encoding="utf-8") as f:
                    cur.executescript(f.read())
                conn.commit()
            except Exception as e:
                # Column exists or idempotency notice
                pass

    conn.close()
    logger.info("Database verified and ready.")
    return db_path


def seed_user_directories(user_data_dir: Path, app_dir: Path, logger: logging.Logger):
    """Ensures uploads, skills, and cache folders exist with seed contents."""
    uploads_dir = user_data_dir / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)

    skills_dir = user_data_dir / "skills"
    skills_dir.mkdir(parents=True, exist_ok=True)

    cache_dir = user_data_dir / "cache"
    cache_dir.mkdir(parents=True, exist_ok=True)

    # Seed catalog if cache is empty
    catalog_dest = cache_dir / "awesome_skills_catalog.json"
    if not catalog_dest.exists():
        possible_catalogs = [
            app_dir / "backend" / "ai-chan-backend" / "_internal" / "data" / "cache" / "awesome_skills_catalog.json",
            app_dir / "ai-backend" / "data" / "cache" / "awesome_skills_catalog.json",
        ]
        for c in possible_catalogs:
            if c.exists():
                shutil.copy2(str(c), str(catalog_dest))
                logger.info(f"Seeded awesome skills catalog to {catalog_dest}")
                break


def get_or_create_secret_key(data_dir: Path, logger: logging.Logger) -> str:
    """
    Ensures a stable, persistent SECRET_KEY is stored in user data directory.
    Reused across app restarts and updates to prevent session and key invalidation.
    """
    key_file = data_dir / ".secret_key"
    if key_file.exists():
        try:
            key = key_file.read_text(encoding="utf-8").strip()
            if key and len(key) >= 32:
                return key
        except Exception as e:
            logger.warning(f"Error reading existing secret key: {e}")

    import secrets
    new_key = secrets.token_hex(32)
    try:
        key_file.write_text(new_key, encoding="utf-8")
        logger.info("Generated and stored stable persistent application SECRET_KEY.")
    except Exception as e:
        logger.warning(f"Could not persist secret key to {key_file}: {e}")
    return new_key


def kill_process_tree(pid: int, logger: logging.Logger):
    """Gracefully terminates process tree by PID."""
    try:
        cmd = ["taskkill", "/PID", str(pid), "/T", "/F"]
        subprocess.run(cmd, capture_output=True, timeout=5)
        logger.info(f"Terminated process tree for PID {pid}")
    except Exception as e:
        logger.warning(f"Error terminating PID {pid}: {e}")


def read_pids(pid_file: Path) -> dict:
    if pid_file.exists():
        try:
            return json.loads(pid_file.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}


def write_pids(pid_file: Path, data: dict):
    try:
        pid_file.write_text(json.dumps(data, indent=2), encoding="utf-8")
    except Exception:
        pass


def stop_running_services(user_data_dir: Path, logger: logging.Logger):
    """Stops all running AI-Chan processes recorded in PID file."""
    pid_file = user_data_dir / "ai_chan_pids.json"
    pids = read_pids(pid_file)
    if not pids:
        logger.info("No active AI-Chan processes found.")
        print("AI-Chan: No active processes found.")
        return

    logger.info("Stopping AI-Chan services...")
    for svc, pid in pids.items():
        if isinstance(pid, int):
            kill_process_tree(pid, logger)

    if pid_file.exists():
        try:
            pid_file.unlink()
        except Exception:
            pass

    port_file = user_data_dir / "running_port.txt"
    if port_file.exists():
        try:
            port_file.unlink()
        except Exception:
            pass

    logger.info("All services stopped.")
    print("AI-Chan: Stopped cleanly.")


def poll_http_ready(url: str, timeout_sec: int = 30) -> bool:
    """Polls URL until it returns HTTP 200/304/307 or timeout."""
    import urllib.request
    end_time = time.time() + timeout_sec
    while time.time() < end_time:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "AI-Chan-Launcher"})
            with urllib.request.urlopen(req, timeout=1.5) as resp:
                if resp.status in (200, 304, 307, 308):
                    return True
        except Exception:
            pass
        time.sleep(0.5)
    return False


def run_launcher():
    parser = argparse.ArgumentParser(description="AI-Chan Windows Launcher")
    parser.add_argument("--stop", action="store_true", help="Stop running AI-Chan background services cleanly")
    parser.add_argument("--status", action="store_true", help="Check status of running services")
    parser.add_argument("--no-browser", action="store_true", help="Do not automatically open the browser")
    parser.add_argument("--port", type=int, default=None, help="Frontend port override")
    parser.add_argument("--backend-port", type=int, default=None, help="Backend port override")
    args = parser.parse_args()

    app_dir = get_app_dir()
    user_data_dir = get_user_data_dir()
    log_dir = user_data_dir / "logs"
    logger = setup_logger(log_dir)

    if args.stop:
        stop_running_services(user_data_dir, logger)
        return

    if args.status:
        pids = read_pids(user_data_dir / "ai_chan_pids.json")
        port_file = user_data_dir / "running_port.txt"
        port = port_file.read_text().strip() if port_file.exists() else "unknown"
        print(f"AI-Chan Status: Active processes: {pids}, Web Port: {port}")
        return

    # Check Single Instance Mutex
    kernel32 = ctypes.windll.kernel32
    mutex = kernel32.CreateMutexW(None, True, MUTEX_NAME)
    last_error = kernel32.GetLastError()
    if last_error == ERROR_ALREADY_EXISTS:
        logger.info("Another instance of AI-Chan is already running. Opening browser to active session.")
        port_file = user_data_dir / "running_port.txt"
        active_port = port_file.read_text().strip() if port_file.exists() else "3000"
        webbrowser.open(f"http://127.0.0.1:{active_port}")
        return

    logger.info(f"Starting {APP_NAME} Launcher...")
    logger.info(f"App directory: {app_dir}")
    logger.info(f"User data directory: {user_data_dir}")

    # Seed data directories
    data_dir = user_data_dir / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    seed_user_directories(user_data_dir, app_dir, logger)

    # Initialize Database
    try:
        db_path = initialize_database(data_dir, app_dir, logger)
    except Exception as e:
        logger.error(f"Database initialization failed: {e}", exc_info=True)
        show_message_box(
            f"{APP_NAME} - Database Error",
            f"Failed to initialize database:\n{e}\n\nPlease check logs at:\n{log_dir / 'launcher.log'}"
        )
        return

    # Determine Ports
    try:
        backend_port = args.backend_port or find_available_port(8000)
        frontend_port = args.port or find_available_port(3000)
    except Exception as e:
        logger.error(f"Port allocation error: {e}")
        show_message_box(f"{APP_NAME} - Port Error", str(e))
        return

    logger.info(f"Selected loopback ports: Backend={backend_port}, Frontend={frontend_port}")

    # Resolve Executables
    backend_exe = None
    for candidate in [
        app_dir / "backend" / "ai-chan-backend" / "ai-chan-backend.exe",
        app_dir / "backend" / "ai-chan-backend.exe",
    ]:
        if candidate.exists():
            backend_exe = candidate
            break

    frontend_dir = None
    node_exe = None
    for candidate_dir in [
        app_dir / "frontend",
        app_dir / "ai-frontend" / ".next" / "standalone",
    ]:
        if (candidate_dir / "server.js").exists():
            frontend_dir = candidate_dir
            break

    for candidate_node in [
        app_dir / "frontend" / "node.exe",
        app_dir / "node" / "node.exe",
        Path(shutil.which("node") or ""),
    ]:
        if candidate_node and candidate_node.exists():
            node_exe = candidate_node
            break

    # Track PIDs
    pid_file = user_data_dir / "ai_chan_pids.json"
    active_pids = {}

    backend_proc = None
    frontend_proc = None

    try:
        # 1. Start Backend Subprocess
        secret_key = get_or_create_secret_key(data_dir, logger)
        backend_log = open(str(log_dir / "backend.log"), "a", encoding="utf-8")
        backend_env = os.environ.copy()
        backend_env.update({
            "HOST": "127.0.0.1",
            "PORT": str(backend_port),
            "SECRET_KEY": secret_key,
            "AI_CHAN_DB_PATH": str(db_path),
            "UPLOAD_DIR": str(user_data_dir / "uploads"),
            "AI_CHAN_SKILLS_DIR": str(user_data_dir / "skills"),
            "AI_CHAN_CACHE_DIR": str(user_data_dir / "cache"),
            "ALLOWED_ORIGINS": f"http://127.0.0.1:{frontend_port},http://localhost:{frontend_port}",
        })

        if backend_exe:
            logger.info(f"Launching frozen backend: {backend_exe}")
            backend_proc = subprocess.Popen(
                [str(backend_exe)],
                env=backend_env,
                stdout=backend_log,
                stderr=backend_log,
                creationflags=CREATE_NO_WINDOW
            )
        else:
            # Development mode fallback
            logger.info("Frozen backend binary not found, falling back to python -m uvicorn")
            py_exe = sys.executable
            backend_proc = subprocess.Popen(
                [py_exe, "-m", "uvicorn", "src.main:app", "--host", "127.0.0.1", "--port", str(backend_port)],
                cwd=str(app_dir / "ai-backend"),
                env=backend_env,
                stdout=backend_log,
                stderr=backend_log,
                creationflags=CREATE_NO_WINDOW
            )

        active_pids["backend"] = backend_proc.pid
        write_pids(pid_file, active_pids)
        logger.info(f"Backend process started with PID {backend_proc.pid}")

        # Wait for Backend Health
        backend_health_url = f"http://127.0.0.1:{backend_port}/health"
        logger.info(f"Awaiting backend health on {backend_health_url}...")
        if not poll_http_ready(backend_health_url, timeout_sec=25):
            err_msg = f"Backend service failed to respond within 25 seconds.\nCheck logs at:\n{log_dir / 'backend.log'}"
            logger.error(err_msg)
            show_message_box(f"{APP_NAME} - Backend Startup Failed", err_msg)
            return

        logger.info("Backend is healthy!")

        # 2. Start Frontend Subprocess
        frontend_log = open(str(log_dir / "frontend.log"), "a", encoding="utf-8")
        frontend_env = os.environ.copy()
        frontend_env.update({
            "PORT": str(frontend_port),
            "HOSTNAME": "127.0.0.1",
            "INTERNAL_BACKEND_URL": f"http://127.0.0.1:{backend_port}/api/",
            "NEXT_PUBLIC_API_BASE_URL": "/api/v1",
        })

        if frontend_dir and node_exe:
            logger.info(f"Launching Next.js standalone frontend: {node_exe} server.js in {frontend_dir}")
            frontend_proc = subprocess.Popen(
                [str(node_exe), "server.js"],
                cwd=str(frontend_dir),
                env=frontend_env,
                stdout=frontend_log,
                stderr=frontend_log,
                creationflags=CREATE_NO_WINDOW
            )
        else:
            # Development mode fallback
            logger.info("Next.js standalone bundle not found, falling back to npm run dev")
            npm_cmd = shutil.which("npm.cmd") or shutil.which("npm") or "npm"
            frontend_proc = subprocess.Popen(
                [npm_cmd, "run", "dev", "--", "--port", str(frontend_port)],
                cwd=str(app_dir / "ai-frontend"),
                env=frontend_env,
                stdout=frontend_log,
                stderr=frontend_log,
                creationflags=CREATE_NO_WINDOW
            )

        active_pids["frontend"] = frontend_proc.pid
        write_pids(pid_file, active_pids)
        logger.info(f"Frontend process started with PID {frontend_proc.pid}")

        # Wait for Frontend HTTP
        frontend_url = f"http://127.0.0.1:{frontend_port}"
        logger.info(f"Awaiting frontend readiness on {frontend_url}...")
        if not poll_http_ready(frontend_url, timeout_sec=30):
            err_msg = f"Frontend web interface failed to respond within 30 seconds.\nCheck logs at:\n{log_dir / 'frontend.log'}"
            logger.error(err_msg)
            show_message_box(f"{APP_NAME} - Frontend Startup Failed", err_msg)
            return

        logger.info(f"{APP_NAME} Website is ready on {frontend_url}")
        (user_data_dir / "running_port.txt").write_text(str(frontend_port), encoding="utf-8")

        # Open browser
        if not args.no_browser:
            logger.info(f"Opening default browser to {frontend_url}")
            webbrowser.open(frontend_url)

        # 3. System Tray Supervision
        def open_web():
            webbrowser.open(f"http://127.0.0.1:{frontend_port}")

        def open_logs():
            os.startfile(str(log_dir))

        def open_data():
            os.startfile(str(user_data_dir))

        def exit_app(icon=None):
            logger.info("Exit requested. Terminating services...")
            if icon:
                icon.stop()
            stop_running_services(user_data_dir, logger)

        try:
            import pystray
            from PIL import Image

            icon_path = app_dir / "assets" / "app.ico"
            if not icon_path.exists():
                icon_path = app_dir / "packaging" / "windows" / "assets" / "app.ico"

            if icon_path.exists():
                icon_img = Image.open(str(icon_path))
            else:
                icon_img = Image.new("RGBA", (64, 64), (79, 140, 255, 255))

            menu = pystray.Menu(
                pystray.MenuItem("Open AI-Chan Web", lambda: open_web(), default=True),
                pystray.MenuItem("Open Logs Folder", lambda: open_logs()),
                pystray.MenuItem("Open User Data Folder", lambda: open_data()),
                pystray.Menu.SEPARATOR,
                pystray.MenuItem("Exit AI-Chan", lambda icon, item: exit_app(icon))
            )
            tray_icon = pystray.Icon(APP_NAME, icon_img, f"{APP_NAME} ({frontend_url})", menu)
            logger.info("System tray supervisor active.")
            tray_icon.run()
        except Exception as e:
            logger.warning(f"System tray could not initialize ({e}), falling back to background wait loop.")
            # Keep process alive while children are running
            while True:
                time.sleep(1)
                if backend_proc.poll() is not None or frontend_proc.poll() is not None:
                    logger.warning("One of the core services exited unexpectedly. Shutting down.")
                    break

    except KeyboardInterrupt:
        logger.info("KeyboardInterrupt received.")
    finally:
        stop_running_services(user_data_dir, logger)


if __name__ == "__main__":
    run_launcher()
