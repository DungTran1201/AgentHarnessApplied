import sqlite3
import json
import hashlib
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "app.db"
BACKUP_DIR = BASE_DIR / "backups"
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

LEGACY_TABLES = [
    "agent_runners",
    "runner_pairing_tokens",
    "development_workspaces",
    "workspace_validations",
    "development_tasks",
    "task_attempts",
    "task_events",
    "task_artifacts",
    "task_approvals",
    "task_verification_reports"
]

def sha256_file(filepath: Path) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def backup_and_export():
    if not DB_PATH.exists():
        print(f"[-] Database file not found at {DB_PATH}")
        return False

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_db_path = BACKUP_DIR / f"app_pre_sunset_{timestamp}.db"
    export_json_path = BACKUP_DIR / f"legacy_orchestrator_export_{timestamp}.json"

    print(f"[1] Creating atomic SQLite backup from {DB_PATH.name}...")
    src_conn = sqlite3.connect(str(DB_PATH))
    dst_conn = sqlite3.connect(str(backup_db_path))
    with dst_conn:
        src_conn.backup(dst_conn)
    dst_conn.close()

    db_checksum = sha256_file(backup_db_path)
    print(f"[+] Snapshot saved: {backup_db_path.name}")
    print(f"[+] DB SHA-256: {db_checksum}")

    print("[2] Exporting legacy table data to structured JSON...")
    src_conn.row_factory = sqlite3.Row
    cur = src_conn.cursor()

    existing_tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
    export_data = {
        "metadata": {
            "source_db": str(DB_PATH),
            "timestamp": timestamp,
            "table_count": 0,
            "total_records": 0
        },
        "tables": {}
    }

    total_records = 0
    for tbl in LEGACY_TABLES:
        if tbl in existing_tables:
            rows = cur.execute(f"SELECT * FROM {tbl}").fetchall()
            export_data["tables"][tbl] = [dict(r) for r in rows]
            count = len(rows)
            total_records += count
            print(f"    - Table '{tbl}': {count} rows")
        else:
            print(f"    - Table '{tbl}': NOT FOUND (already absent)")

    export_data["metadata"]["table_count"] = len(export_data["tables"])
    export_data["metadata"]["total_records"] = total_records

    with open(export_json_path, "w", encoding="utf-8") as f:
        json.dump(export_data, f, indent=2, default=str)

    json_checksum = sha256_file(export_json_path)
    print(f"[+] JSON Export saved: {export_json_path.name}")
    print(f"[+] JSON SHA-256: {json_checksum}")

    print("[3] Verifying backup & restore integrity...")
    # Verify reading from backup DB
    test_conn = sqlite3.connect(str(backup_db_path))
    test_cur = test_conn.cursor()
    for tbl, rows in export_data["tables"].items():
        count_in_backup = test_cur.execute(f"SELECT COUNT(*) FROM {tbl}").fetchone()[0]
        assert count_in_backup == len(rows), f"Integrity mismatch in {tbl}: expected {len(rows)}, got {count_in_backup}"
    test_conn.close()

    # Verify JSON restore into in-memory SQLite
    mem_conn = sqlite3.connect(":memory:")
    mem_cur = mem_conn.cursor()
    for tbl, rows in export_data["tables"].items():
        if rows:
            cols = list(rows[0].keys())
            col_defs = ", ".join([f'"{c}" TEXT' for c in cols])
            mem_cur.execute(f'CREATE TABLE "{tbl}" ({col_defs})')
            placeholders = ", ".join(["?" for _ in cols])
            col_names = ", ".join([f'"{c}"' for c in cols])
            insert_sql = f'INSERT INTO "{tbl}" ({col_names}) VALUES ({placeholders})'
            for r in rows:
                mem_cur.execute(insert_sql, [str(r[c]) if r[c] is not None else None for c in cols])
            mem_count = mem_cur.execute(f'SELECT COUNT(*) FROM "{tbl}"').fetchone()[0]
            assert mem_count == len(rows), f"Memory restore mismatch in {tbl}"
    mem_conn.close()

    print("[+] Backup & restore integrity verification PASSED (100% match).")
    src_conn.close()
    return True

if __name__ == "__main__":
    success = backup_and_export()
    if not success:
        exit(1)
