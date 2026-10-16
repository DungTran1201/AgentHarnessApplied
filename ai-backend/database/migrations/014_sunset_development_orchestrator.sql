-- Migration 014: Sunset and Decommission Legacy Development Orchestrator & Workspaces
-- Author: AI-Chan Architecture & Platform Team
-- Date: 2026-10-16

PRAGMA foreign_keys = OFF;

-- 1. Drop verification reports
DROP TABLE IF EXISTS task_verification_reports;

-- 2. Drop approvals & artifacts
DROP TABLE IF EXISTS task_approvals;
DROP TABLE IF EXISTS task_artifacts;

-- 3. Drop events & attempts
DROP TABLE IF EXISTS task_events;
DROP TABLE IF EXISTS task_attempts;

-- 4. Drop development tasks
DROP TABLE IF EXISTS development_tasks;

-- 5. Drop workspace validations & workspaces
DROP TABLE IF EXISTS workspace_validations;
DROP TABLE IF EXISTS development_workspaces;

-- 6. Drop runner pairing tokens & agent runners
DROP TABLE IF EXISTS runner_pairing_tokens;
DROP TABLE IF EXISTS agent_runners;

-- 7. Clean up unreferenced workspace_id column & index from projects table if present
DROP INDEX IF EXISTS idx_projects_workspace_id;

PRAGMA foreign_keys = ON;
