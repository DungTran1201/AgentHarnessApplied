import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
MIGRATIONS_DIR = BASE_DIR / "migrations"

def run_migration():
    for db_path in [BASE_DIR / "app.db", BASE_DIR.parent / "app.db"]:
        if not db_path.exists():
            continue
        print(f"Applying migration to {db_path}...")
        conn = sqlite3.connect(str(db_path))
        conn.execute("PRAGMA foreign_keys = ON;")
        cur = conn.cursor()
        
        # 1. Check & apply users table extensions (002)
        cols = [c[1] for c in cur.execute("PRAGMA table_info(users)").fetchall()]
        print(f"Current columns in users ({db_path.name}): {cols}")
        
        columns_to_add = [
            ("username", "VARCHAR(50)"),
            ("avatar_url", "VARCHAR(500)"),
            ("bio", "VARCHAR(500)"),
            ("phone_number", "VARCHAR(20)"),
            ("theme_preference", "VARCHAR(10) DEFAULT 'DARK'"),
            ("language_preference", "VARCHAR(10) DEFAULT 'vi'"),
            ("last_login_at", "TIMESTAMP"),
            ("password_changed_at", "TIMESTAMP"),
        ]
        
        for col_name, col_def in columns_to_add:
            if col_name not in cols:
                print(f"Adding column {col_name} to users...")
                cur.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_def}")
                
        cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)")
        conn.commit()

        # 2. Apply 003_agent_model_management.sql
        migration_003_file = MIGRATIONS_DIR / "003_agent_model_management.sql"
        if migration_003_file.exists():
            print(f"Executing {migration_003_file.name} on {db_path.name}...")
            with open(migration_003_file, "r", encoding="utf-8") as f:
                cur.executescript(f.read())
            conn.commit()

        # 3. Apply 004_discord_oauth_support.sql if columns missing
        user_cols = [c[1] for c in cur.execute("PRAGMA table_info(users)").fetchall()]
        if "discord_id" not in user_cols:
            print(f"Adding discord_id and discord_username to users in {db_path.name}...")
            cur.execute("ALTER TABLE users ADD COLUMN discord_id VARCHAR(50)")
            cur.execute("ALTER TABLE users ADD COLUMN discord_username VARCHAR(100)")
            cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id)")
            conn.commit()

        # 4. Apply 005_resource_telemetry_and_quotas.sql
        migration_005_file = MIGRATIONS_DIR / "005_resource_telemetry_and_quotas.sql"
        if migration_005_file.exists():
            print(f"Executing {migration_005_file.name} on {db_path.name}...")
            with open(migration_005_file, "r", encoding="utf-8") as f:
                cur.executescript(f.read())
            conn.commit()

        # 5. Seed default quotas for existing users without quota records
        cur.execute("""
            INSERT OR IGNORE INTO user_quotas (user_id, daily_token_limit, daily_tokens_used, reset_at)
            SELECT id, 100000, 0, datetime('now', '+1 day', 'start of day')
            FROM users
            WHERE id NOT IN (SELECT user_id FROM user_quotas)
        """)
        conn.commit()

        # 6. Apply 006_model_archival_and_catalog_extensions.sql (if status constraint does not yet include ARCHIVED)
        models_sql_row = cur.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='models'").fetchone()
        if models_sql_row and "ARCHIVED" not in models_sql_row[0]:
            migration_006_file = MIGRATIONS_DIR / "006_model_archival_and_catalog_extensions.sql"
            if migration_006_file.exists():
                print(f"Executing {migration_006_file.name} on {db_path.name}...")
                with open(migration_006_file, "r", encoding="utf-8") as f:
                    cur.executescript(f.read())
                conn.commit()
                print(f"Applied 006 migration successfully to {db_path.name}.")

        # 7. Apply 007_discord_bot_management.sql
        migration_007_file = MIGRATIONS_DIR / "007_discord_bot_management.sql"
        if migration_007_file.exists():
            print(f"Executing {migration_007_file.name} on {db_path.name}...")
            with open(migration_007_file, "r", encoding="utf-8") as f:
                cur.executescript(f.read())
            conn.commit()
            print(f"Applied 007 migration successfully to {db_path.name}.")

        # 8. Check and add source column to messages table (FR-047)
        msg_cols = [c[1] for c in cur.execute("PRAGMA table_info(messages)").fetchall()]
        if "source" not in msg_cols:
            print(f"Adding source column to messages in {db_path.name}...")
            cur.execute("ALTER TABLE messages ADD COLUMN source VARCHAR(20) DEFAULT 'WEB'")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_messages_source ON messages(source)")
            conn.commit()

        # 9. Apply 008_project_management.sql (Projects table & conversations.project_id)
        migration_008_file = MIGRATIONS_DIR / "008_project_management.sql"
        if migration_008_file.exists():
            print(f"Executing {migration_008_file.name} on {db_path.name}...")
            with open(migration_008_file, "r", encoding="utf-8") as f:
                cur.executescript(f.read())
            conn.commit()
            print(f"Applied 008 migration successfully to {db_path.name}.")

        conv_cols = [c[1] for c in cur.execute("PRAGMA table_info(conversations)").fetchall()]
        if "project_id" not in conv_cols:
            print(f"Adding project_id column to conversations in {db_path.name}...")
            cur.execute("ALTER TABLE conversations ADD COLUMN project_id VARCHAR(36) REFERENCES projects(id) ON DELETE SET NULL")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_conversations_project_id ON conversations(project_id)")
            conn.commit()

        # 10. Apply 009_system_prompt_management.sql (system_prompts table)
        migration_009_file = MIGRATIONS_DIR / "009_system_prompt_management.sql"
        if migration_009_file.exists():
            print(f"Executing {migration_009_file.name} on {db_path.name}...")
            with open(migration_009_file, "r", encoding="utf-8") as f:
                cur.executescript(f.read())
            conn.commit()
            print(f"Applied 009 migration successfully to {db_path.name}.")

        # Seed default sample system prompts for guest_user if table is empty for guest
        prompt_count = cur.execute("SELECT COUNT(*) FROM system_prompts WHERE user_id = 'guest_user'").fetchone()[0]
        if prompt_count == 0:
            print(f"Seeding default system prompts for guest_user in {db_path.name}...")
            cur.execute("""
                INSERT OR IGNORE INTO system_prompts (id, user_id, name, description, content)
                VALUES
                (
                    'sp_seed_python_expert',
                    'guest_user',
                    'Chuyên Gia Python & Kiến Trúc Phần Mềm',
                    'Hỗ trợ viết mã nguồn Python tối ưu, tuân thủ PEP 8, Type Hinting và Clean Architecture',
                    'Bạn là chuyên gia Senior Python Architect với hơn 10 năm kinh nghiệm. Khi viết code, hãy luôn tuân thủ các nguyên tắc sau:\n1. Luôn sử dụng Type Hinting đầy đủ cho tham số và kiểu trả về.\n2. Viết docstring theo chuẩn Google hoặc Sphinx.\n3. Ưu tiên giải pháp tối ưu thời gian O(n) và không gian O(n).\n4. Đưa ra giải thích súc tích, tập trung vào bản chất kỹ thuật.'
                ),
                (
                    'sp_seed_business_analyst',
                    'guest_user',
                    'Senior Business Analyst (IT)',
                    'Hỗ trợ khảo sát, bóc tách yêu cầu, viết User Stories và phân tích nghiệp vụ',
                    'Bạn là Senior Business Analyst chuyên nghiệp. Khi tiếp nhận yêu cầu từ người dùng:\n1. Phân loại rõ: FACT, ASSUMPTION, DECISION, OPEN QUESTION.\n2. Xác định Actor, Preconditions, Postconditions và Acceptance Criteria kiểm thử được.\n3. Không tự tiện suy diễn yêu cầu nếu chưa có bằng chứng xác thực.'
                )
            """)
            conn.commit()

        # 11. Apply 010_agent_skills_management.sql (skills & skill_files tables)
        migration_010_file = MIGRATIONS_DIR / "010_agent_skills_management.sql"
        if migration_010_file.exists():
            print(f"Executing {migration_010_file.name} on {db_path.name}...")
            with open(migration_010_file, "r", encoding="utf-8") as f:
                cur.executescript(f.read())
            conn.commit()
            print(f"Applied 010 migration successfully to {db_path.name}.")

        # 12. Apply 011_orchestrator_foundation.sql (Development Workspace & Agent Runner)
        migration_011_file = MIGRATIONS_DIR / "011_orchestrator_foundation.sql"
        if migration_011_file.exists():
            print(f"Executing {migration_011_file.name} on {db_path.name}...")
            with open(migration_011_file, "r", encoding="utf-8") as f:
                cur.executescript(f.read())
            conn.commit()
            print(f"Applied 011 migration successfully to {db_path.name}.")

        # Add workspace_id column to projects if table exists and column missing
        prj_cols = [c[1] for c in cur.execute("PRAGMA table_info(projects)").fetchall()]
        if "workspace_id" not in prj_cols and "projects" in [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]:
            print(f"Adding workspace_id column to projects in {db_path.name}...")
            cur.execute("ALTER TABLE projects ADD COLUMN workspace_id VARCHAR(36) REFERENCES development_workspaces(id) ON DELETE SET NULL")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON projects(workspace_id)")
            conn.commit()

        # 13. Apply 012_development_task_management.sql (Tasks, Attempts, Events, Artifacts, Approvals)
        migration_012_file = MIGRATIONS_DIR / "012_development_task_management.sql"
        if migration_012_file.exists():
            print(f"Executing {migration_012_file.name} on {db_path.name}...")
            with open(migration_012_file, "r", encoding="utf-8") as f:
                cur.executescript(f.read())
            conn.commit()
            print(f"Applied 012 migration successfully to {db_path.name}.")

        # 14. Apply 013_verification_and_review_gates.sql (Verification Reports & Isolation Gates)
        migration_013_file = MIGRATIONS_DIR / "013_verification_and_review_gates.sql"
        if migration_013_file.exists():
            print(f"Executing {migration_013_file.name} on {db_path.name}...")
            with open(migration_013_file, "r", encoding="utf-8") as f:
                cur.executescript(f.read())
            conn.commit()
            print(f"Applied 013 migration successfully to {db_path.name}.")

        # Add columns to development_workspaces if missing
        if "development_workspaces" in [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]:
            ws_cols = [c[1] for c in cur.execute("PRAGMA table_info(development_workspaces)").fetchall()]
            if "verification_policy" not in ws_cols:
                cur.execute("ALTER TABLE development_workspaces ADD COLUMN verification_policy TEXT")
            if "isolation_strategy" not in ws_cols:
                cur.execute("ALTER TABLE development_workspaces ADD COLUMN isolation_strategy VARCHAR(50) DEFAULT 'worktree'")
            conn.commit()

        # Add columns to task_attempts if missing
        if "task_attempts" in [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]:
            att_cols = [c[1] for c in cur.execute("PRAGMA table_info(task_attempts)").fetchall()]
            if "worktree_path" not in att_cols:
                cur.execute("ALTER TABLE task_attempts ADD COLUMN worktree_path VARCHAR(1024)")
            if "is_isolated" not in att_cols:
                cur.execute("ALTER TABLE task_attempts ADD COLUMN is_isolated INTEGER DEFAULT 1")
            if "diff_stat" not in att_cols:
                cur.execute("ALTER TABLE task_attempts ADD COLUMN diff_stat TEXT")
            if "review_feedback" not in att_cols:
                cur.execute("ALTER TABLE task_attempts ADD COLUMN review_feedback TEXT")
            if "parent_attempt_id" not in att_cols:
                cur.execute("ALTER TABLE task_attempts ADD COLUMN parent_attempt_id VARCHAR(36)")
            if "claimed_at" not in att_cols:
                cur.execute("ALTER TABLE task_attempts ADD COLUMN claimed_at DATETIME")
            if "first_event_at" not in att_cols:
                cur.execute("ALTER TABLE task_attempts ADD COLUMN first_event_at DATETIME")
            conn.commit()

        # Add columns to development_tasks if missing
        if "development_tasks" in [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]:
            tsk_cols = [c[1] for c in cur.execute("PRAGMA table_info(development_tasks)").fetchall()]
            if "review_status" not in tsk_cols:
                cur.execute("ALTER TABLE development_tasks ADD COLUMN review_status VARCHAR(30) DEFAULT 'PENDING'")
            if "dispatch_state" not in tsk_cols:
                cur.execute("ALTER TABLE development_tasks ADD COLUMN dispatch_state VARCHAR(50) DEFAULT 'IDLE'")
            if "failure_code" not in tsk_cols:
                cur.execute("ALTER TABLE development_tasks ADD COLUMN failure_code VARCHAR(50)")
            conn.commit()

        # Add columns to task_artifacts if missing
        if "task_artifacts" in [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]:
            art_cols = [c[1] for c in cur.execute("PRAGMA table_info(task_artifacts)").fetchall()]
            if "task_id" not in art_cols:
                cur.execute("ALTER TABLE task_artifacts ADD COLUMN task_id VARCHAR(36)")
            if "display_name" not in art_cols:
                cur.execute("ALTER TABLE task_artifacts ADD COLUMN display_name VARCHAR(255)")
            if "mime_type" not in art_cols:
                cur.execute("ALTER TABLE task_artifacts ADD COLUMN mime_type VARCHAR(100) DEFAULT 'text/plain'")
            if "checksum_sha256" not in art_cols:
                cur.execute("ALTER TABLE task_artifacts ADD COLUMN checksum_sha256 VARCHAR(64)")
            if "storage_path" not in art_cols:
                cur.execute("ALTER TABLE task_artifacts ADD COLUMN storage_path VARCHAR(512)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_task_artifacts_task_id ON task_artifacts(task_id)")
            cur.execute("""
                UPDATE task_artifacts 
                SET task_id = (SELECT task_id FROM task_attempts WHERE task_attempts.id = task_artifacts.attempt_id)
                WHERE task_id IS NULL
            """)
            conn.commit()

        # Verify tables
        tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
        print(f"Tables in {db_path.name}: {tables}")
        if "api_metric_logs" in tables and "user_quotas" in tables:
            quota_count = cur.execute("SELECT COUNT(*) FROM user_quotas").fetchone()[0]
            print(f"Total user quotas in {db_path.name}: {quota_count}")
        if "discord_bot_configs" in tables:
            bot_cfg_count = cur.execute("SELECT COUNT(*) FROM discord_bot_configs").fetchone()[0]
            print(f"Total discord bot configs in {db_path.name}: {bot_cfg_count}")
        if "projects" in tables:
            project_count = cur.execute("SELECT COUNT(*) FROM projects").fetchone()[0]
            print(f"Total projects in {db_path.name}: {project_count}")
        if "system_prompts" in tables:
            sp_count = cur.execute("SELECT COUNT(*) FROM system_prompts").fetchone()[0]
            print(f"Total system prompts in {db_path.name}: {sp_count}")
        if "skills" in tables:
            skill_count = cur.execute("SELECT COUNT(*) FROM skills").fetchone()[0]
            print(f"Total skills in {db_path.name}: {skill_count}")
        if "development_workspaces" in tables:
            ws_count = cur.execute("SELECT COUNT(*) FROM development_workspaces").fetchone()[0]
            print(f"Total development workspaces in {db_path.name}: {ws_count}")
        if "agent_runners" in tables:
            runner_count = cur.execute("SELECT COUNT(*) FROM agent_runners").fetchone()[0]
            print(f"Total agent runners in {db_path.name}: {runner_count}")
        if "development_tasks" in tables:
            task_count = cur.execute("SELECT COUNT(*) FROM development_tasks").fetchone()[0]
            print(f"Total development tasks in {db_path.name}: {task_count}")
        if "task_attempts" in tables:
            attempt_count = cur.execute("SELECT COUNT(*) FROM task_attempts").fetchone()[0]
            print(f"Total task attempts in {db_path.name}: {attempt_count}")
            
        conn.close()

if __name__ == "__main__":
    run_migration()



