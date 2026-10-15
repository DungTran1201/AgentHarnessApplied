-- Migration 013: Git Isolation, Verification Pipeline & Review Gates
-- AI-Chan Development Orchestrator (Prompt 06)

-- 1. Verification Reports (Test, Lint, Typecheck, Build Results)
CREATE TABLE IF NOT EXISTS task_verification_reports (
    id VARCHAR(36) PRIMARY KEY,
    attempt_id VARCHAR(36) NOT NULL,
    task_id VARCHAR(36) NOT NULL,
    step_name VARCHAR(50) NOT NULL,
    command VARCHAR(512) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'NOT_RUN', -- NOT_RUN, PASSED, FAILED, ERROR, SKIPPED_BY_POLICY
    exit_code INTEGER,
    duration_seconds REAL,
    stdout_preview TEXT,
    stderr_preview TEXT,
    artifact_ref VARCHAR(36),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (attempt_id) REFERENCES task_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES development_tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_verif_attempt_id ON task_verification_reports(attempt_id);
CREATE INDEX IF NOT EXISTS idx_task_verif_task_id ON task_verification_reports(task_id);
CREATE INDEX IF NOT EXISTS idx_task_verif_status ON task_verification_reports(status);
