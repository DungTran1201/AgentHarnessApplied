-- ==============================================================================
-- BẢN NÂNG CẤP DỮ LIỆU: 019_user_api_keys_management.sql
-- Mô tả: Bảng lưu trữ và quản lý API Keys cá nhân của người dùng
--        (Encrypted at rest qua AES-256-GCM, Isolation theo user_id, Precedence > .env)
-- Bounded Context: User Settings & Credential Management (SEC-015, FR-SETTINGS-KEYS)
-- ==============================================================================

PRAGMA foreign_keys = OFF;

-- 1. TẠO BẢNG QUẢN LÝ API KEYS CỦA NGƯỜI DÙNG
CREATE TABLE IF NOT EXISTS user_api_keys (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    key_ciphertext TEXT NOT NULL,
    key_last4 VARCHAR(10) NOT NULL,
    key_fingerprint VARCHAR(64),
    validation_status VARCHAR(20) NOT NULL DEFAULT 'NOT_TESTED' CHECK (validation_status IN ('NOT_TESTED', 'VALID', 'INVALID', 'ERROR')),
    last_validated_at TIMESTAMP,
    last_error_summary TEXT,
    is_active BOOLEAN NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, provider)
);

-- 2. TẠO CHỈ MỤC TỐI ƯU TRUY VẤN THEO USER VÀ PROVIDER
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_provider ON user_api_keys(provider);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_provider ON user_api_keys(user_id, provider);

-- 3. TRIGGER TỰ ĐỘNG CẬP NHẬT updated_at
DROP TRIGGER IF EXISTS trg_user_api_keys_updated_at;
CREATE TRIGGER IF NOT EXISTS trg_user_api_keys_updated_at
AFTER UPDATE ON user_api_keys
FOR EACH ROW
BEGIN
    UPDATE user_api_keys SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

PRAGMA foreign_keys = ON;
