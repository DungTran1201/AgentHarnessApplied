-- Migration 012: Development Task Management & Execution Attempts
-- AI-Chan Development Orchestrator (Prompt 05)

-- 1. Development Tasks
CREATE TABLE IF NOT EXISTS development_tasks (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    project_id VARCHAR(36) NOT NULL,
    workspace_id VARCHAR(36) NOT NULL,
    title VARCHAR(200) NOT NULL,
    prompt TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    current_attempt_id VARCHAR(36),
    idempotency_key VARCHAR(64) UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (workspace_id) REFERENCES development_workspaces(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_dev_tasks_user_id ON development_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_dev_tasks_workspace_id ON development_tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_dev_tasks_project_id ON development_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_dev_tasks_status ON development_tasks(status);
CREATE INDEX IF NOT EXISTS idx_dev_tasks_idempotency ON development_tasks(idempotency_key);

-- 2. Task Execution Attempts (Runs)
CREATE TABLE IF NOT EXISTS task_attempts (
    id VARCHAR(36) PRIMARY KEY,
    task_id VARCHAR(36) NOT NULL,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    runner_id VARCHAR(36) NOT NULL,
    runtime VARCHAR(50) NOT NULL DEFAULT 'antigravity',
    runtime_session_id VARCHAR(100),
    mode VARCHAR(30) NOT NULL DEFAULT 'plan',
    status VARCHAR(30) NOT NULL DEFAULT 'DISPATCHING',
    exit_code INTEGER,
    duration_seconds REAL,
    tokens_in INTEGER,
    tokens_out INTEGER,
    cost_estimate REAL,
    git_branch VARCHAR(100),
    base_commit VARCHAR(40),
    head_commit VARCHAR(40),
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME,
    FOREIGN KEY (task_id) REFERENCES development_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (runner_id) REFERENCES agent_runners(id) ON DELETE RESTRICT,
    UNIQUE(task_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS idx_task_attempts_task_id ON task_attempts(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attempts_runner_id ON task_attempts(runner_id);
CREATE INDEX IF NOT EXISTS idx_task_attempts_status ON task_attempts(status);

-- 3. Normalized Task Events (Replay & Telemetry)
CREATE TABLE IF NOT EXISTS task_events (
    id VARCHAR(36) PRIMARY KEY,
    attempt_id VARCHAR(36) NOT NULL,
    sequence_number INTEGER NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'INFO',
    payload TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (attempt_id) REFERENCES task_attempts(id) ON DELETE CASCADE,
    UNIQUE(attempt_id, sequence_number)
);

CREATE INDEX IF NOT EXISTS idx_task_events_attempt_seq ON task_events(attempt_id, sequence_number);

-- 4. Task Artifacts (Diffs, Plans, Test Reports)
CREATE TABLE IF NOT EXISTS task_artifacts (
    id VARCHAR(36) PRIMARY KEY,
    attempt_id VARCHAR(36) NOT NULL,
    artifact_type VARCHAR(50) NOT NULL,
    file_path VARCHAR(512) NOT NULL,
    content TEXT,
    byte_size INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (attempt_id) REFERENCES task_attempts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_artifacts_attempt_id ON task_artifacts(attempt_id);

-- 5. Task Approvals (Human-in-the-Loop Decisions)
CREATE TABLE IF NOT EXISTS task_approvals (
    id VARCHAR(36) PRIMARY KEY,
    attempt_id VARCHAR(36) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    decision VARCHAR(20) NOT NULL,
    description TEXT,
    decided_by VARCHAR(36) NOT NULL,
    decided_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (attempt_id) REFERENCES task_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (decided_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_task_approvals_attempt_id ON task_approvals(attempt_id);
