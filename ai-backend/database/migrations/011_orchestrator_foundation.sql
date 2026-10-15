-- Migration 011: Development Workspace & Agent Runner Foundation
-- Author: AI-Chan Architecture & Platform Team
-- Date: 2026-10-15

-- 1. Create agent_runners table
CREATE TABLE IF NOT EXISTS agent_runners (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    machine_name VARCHAR(100) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    architecture VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ONLINE',
    secret_hash VARCHAR(128) NOT NULL,
    capabilities TEXT DEFAULT '{}',
    system_info TEXT DEFAULT '{}',
    last_heartbeat_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_runners_user_id ON agent_runners(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_runners_status ON agent_runners(status);
CREATE INDEX IF NOT EXISTS idx_agent_runners_last_heartbeat ON agent_runners(last_heartbeat_at);

-- 2. Create runner_pairing_tokens table
CREATE TABLE IF NOT EXISTS runner_pairing_tokens (
    token VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    label VARCHAR(100),
    is_used INTEGER NOT NULL DEFAULT 0,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_runner_pairing_tokens_expires ON runner_pairing_tokens(expires_at, is_used);

-- 3. Create development_workspaces table
CREATE TABLE IF NOT EXISTS development_workspaces (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    runner_id VARCHAR(36),
    name VARCHAR(100) NOT NULL,
    local_path VARCHAR(1024) NOT NULL,
    git_remote_url VARCHAR(512),
    default_branch VARCHAR(100) DEFAULT 'main',
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_VALIDATION',
    is_git_repo INTEGER NOT NULL DEFAULT 0,
    last_commit_hash VARCHAR(40),
    last_validated_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (runner_id) REFERENCES agent_runners(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_dev_workspaces_user_id ON development_workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_dev_workspaces_runner_id ON development_workspaces(runner_id);
CREATE INDEX IF NOT EXISTS idx_dev_workspaces_status ON development_workspaces(status);

-- 4. Create workspace_validations audit table
CREATE TABLE IF NOT EXISTS workspace_validations (
    id VARCHAR(36) PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    runner_id VARCHAR(36) NOT NULL,
    status VARCHAR(20) NOT NULL,
    branch_detected VARCHAR(100),
    has_uncommitted_changes INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    validated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES development_workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (runner_id) REFERENCES agent_runners(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workspace_validations_ws ON workspace_validations(workspace_id);
