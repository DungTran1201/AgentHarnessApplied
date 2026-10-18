"""
AI-Chan Frozen Backend Entrypoint
Initializes environment configurations, ensures database path resolution,
and starts the Uvicorn ASGI server with loopback binding.
"""
import os
import sys
from pathlib import Path

# Determine bundle directory
if getattr(sys, "frozen", False):
    BUNDLE_DIR = Path(sys.executable).resolve().parent
    SRC_DIR = BUNDLE_DIR
else:
    SRC_DIR = Path(__file__).resolve().parent.parent.parent / "ai-backend"

sys.path.insert(0, str(SRC_DIR))

# Safe loopback defaults
os.environ.setdefault("HOST", "127.0.0.1")
os.environ.setdefault("PORT", "8000")

def main():
    import uvicorn
    from src.core.config import settings
    from src.main import app

    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", str(settings.PORT or 8000)))

    print(f"[Backend] Starting AI-Chan Backend on http://{host}:{port} ...")
    uvicorn.run(
        app,
        host=host,
        port=port,
        reload=False,
        log_level="info",
        access_log=True,
    )

if __name__ == "__main__":
    main()
