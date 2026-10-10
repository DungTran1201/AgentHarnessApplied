-- ==============================================================================
-- BẢN NÂNG CẤP DỮ LIỆU: 007_discord_bot_management.sql
-- Mô tả: Khởi tạo bảng `discord_bot_configs` và mở rộng cột `source` cho `messages`
-- Bounded Context: Bot Management & Omnichannel Synchronization (CR-009)
-- Ràng buộc nghiệp vụ: BR-031, BR-032, BR-033, BR-034, SEC-013
-- ==============================================================================

-- 1. BẢNG CẤU HÌNH DISCORD BOT
CREATE TABLE IF NOT EXISTS discord_bot_configs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    scope VARCHAR(20) NOT NULL DEFAULT 'GUILD' CHECK (scope IN ('USER_DM', 'GUILD')),
    guild_id VARCHAR(50),
    guild_name VARCHAR(100),
    channel_id VARCHAR(50),
    active_model_id VARCHAR(100) REFERENCES models(id) ON DELETE SET NULL,
    trigger_mode VARCHAR(20) NOT NULL DEFAULT 'MENTION' CHECK (trigger_mode IN ('MENTION', 'PREFIX', 'SLASH_COMMAND')),
    custom_prefix VARCHAR(10) NOT NULL DEFAULT '!ai',
    system_prompt TEXT DEFAULT 'You are AI-Chan, a helpful and witty Discord AI assistant.',
    max_tokens_per_response INTEGER NOT NULL DEFAULT 1000 CHECK (max_tokens_per_response BETWEEN 50 AND 4000),
    is_enabled BOOLEAN NOT NULL DEFAULT 1 CHECK (is_enabled IN (0, 1)),
    sync_to_web BOOLEAN NOT NULL DEFAULT 1 CHECK (sync_to_web IN (0, 1)),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. CHỈ MỤC TỐI ƯU TRUY VẤN
CREATE INDEX IF NOT EXISTS idx_discord_bot_configs_user_id ON discord_bot_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_discord_bot_configs_guild_id ON discord_bot_configs(guild_id);
CREATE INDEX IF NOT EXISTS idx_discord_bot_configs_active_model ON discord_bot_configs(active_model_id);

-- 3. TRIGGER TỰ ĐỘNG CẬP NHẬT THỜI GIAN
CREATE TRIGGER IF NOT EXISTS trg_discord_bot_configs_updated_at
AFTER UPDATE ON discord_bot_configs
FOR EACH ROW
BEGIN
    UPDATE discord_bot_configs SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;
