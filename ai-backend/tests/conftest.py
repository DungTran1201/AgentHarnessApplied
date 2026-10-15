import os
import shutil
import pytest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
REAL_DB = BACKEND_DIR / "database" / "app.db"
TEST_DB = BACKEND_DIR / "database" / "test_app.db"

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Isolate tests to test_app.db so developer's live app.db is never wiped."""
    if REAL_DB.exists():
        shutil.copy2(REAL_DB, TEST_DB)
    os.environ["AI_CHAN_DB_PATH"] = str(TEST_DB)

    # Re-import src.db to make sure DB_PATH is pointing to TEST_DB
    import src.db as db_module
    db_module.DB_PATH = TEST_DB

    yield

    if TEST_DB.exists():
        try:
            TEST_DB.unlink()
        except Exception:
            pass
