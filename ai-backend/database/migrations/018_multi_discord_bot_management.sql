-- ==============================================================================
-- BẢN NÂNG CẤP DỮ LIỆU: 018_multi_discord_bot_management.sql
-- Mô tả: Mở rộng `discord_bot_configs` hỗ trợ quản lý nhiều Discord Bot độc lập
--        (Multi-Bot Registry, Encrypted Tokens, Project 1:1 Binding, Runtime Status)
-- Bounded Context: Bot Management & Multi-Project Routing
-- ==============================================================================

PRAGMA foreign_keys = OFF;

-- 1. TẠO BẢNG TẠM VỚI SCHEMA ĐA BOT
CREATE TABLE IF NOT EXISTS discord_bot_configs_v2 (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL DEFAULT 'Discord Bot',
    alias VARCHAR(100),
    token_ciphertext TEXT,
    token_last4 VARCHAR(10),
    status VARCHAR(30) NOT NULL DEFAULT 'DISCONNECTED' CHECK (status IN ('NOT_CONFIGURED', 'DISCONNECTED', 'CONNECTING', 'CONNECTED', 'DEGRADED', 'INVALID_CREDENTIALS', 'ERROR')),
    scope VARCHAR(20) NOT NULL DEFAULT 'GUILD' CHECK (scope IN ('USER_DM', 'GUILD')),
    guild_id VARCHAR(50),
    guild_name VARCHAR(100),
    channel_id VARCHAR(50),
    active_model_id VARCHAR(100) REFERENCES models(id) ON DELETE SET NULL,
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE SET NULL,
    trigger_mode VARCHAR(20) NOT NULL DEFAULT 'MENTION' CHECK (trigger_mode IN ('MENTION', 'PREFIX', 'SLASH_COMMAND')),
    custom_prefix VARCHAR(10) NOT NULL DEFAULT '!ai',
    system_prompt TEXT DEFAULT 'You are AI-Chan, a helpful and witty Discord AI assistant.',
    max_tokens_per_response INTEGER NOT NULL DEFAULT 1000 CHECK (max_tokens_per_response BETWEEN 50 AND 4000),
    is_enabled BOOLEAN NOT NULL DEFAULT 1 CHECK (is_enabled IN (0, 1)),
    sync_to_web BOOLEAN NOT NULL DEFAULT 1 CHECK (sync_to_web IN (0, 1)),
    discord_application_id VARCHAR(50),
    client_id VARCHAR(50),
    last_connected_at TIMESTAMP,
    last_error_code VARCHAR(50),
    last_error_summary TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. SAO CHÉP DỮ LIỆU CŨ SANG BẢNG MỚI NẾU BẢNG CŨ ĐÃ TỒN TẠI
INSERT OR IGNORE INTO discord_bot_configs_v2 (
    id, user_id, name, alias, scope, guild_id, guild_name, channel_id,
    active_model_id, trigger_mode, custom_prefix, system_prompt,
    max_tokens_per_response, is_enabled, sync_to_web, created_at, updated_at
)
SELECT 
    id, user_id, COALESCE(guild_name, 'Discord Bot') || ' Agent', 'bot_' || substr(id, 1, 8),
    scope, guild_id, guild_name, channel_id,
    active_model_id, trigger_mode, custom_prefix, system_prompt,
    max_tokens_per_response, is_enabled, sync_to_web, created_at, updated_at
FROM discord_bot_configs;

-- 3. THAY THẾ BẢNG CŨ
DROP TABLE IF EXISTS discord_bot_configs;
ALTER TABLE discord_bot_configs_v2 RENAME TO discord_bot_configs;

-- 4. TẠO CÁC CHỈ MỤC TỐI ƯU
CREATE INDEX IF NOT EXISTS idx_discord_bot_configs_user_id ON discord_bot_configs(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_discord_bot_configs_user_alias ON discord_bot_configs(user_id, alias);
CREATE INDEX IF NOT EXISTS idx_discord_bot_configs_project_id ON discord_bot_configs(project_id);
CREATE INDEX IF NOT EXISTS idx_discord_bot_configs_status ON discord_bot_configs(status);

-- 5. TRIGGER TỰ ĐỘNG CẬP NHẬT THỜI GIAN
DROP TRIGGER IF EXISTS trg_discord_bot_configs_updated_at;
CREATE TRIGGER IF NOT EXISTS trg_discord_bot_configs_updated_at
AFTER UPDATE ON discord_bot_configs
FOR EACH ROW
BEGIN
    UPDATE discord_bot_configs SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

PRAGMA foreign_keys = ON;
