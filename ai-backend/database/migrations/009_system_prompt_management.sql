-- ==============================================================================
-- MIGRATION: 009_system_prompt_management.sql
-- Mô tả: Khởi tạo bảng system_prompts và index cho phân hệ Quản lý System Prompt (MVP)
-- Bounded Context: Prompt Management Context
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- 1. ĐẢM BẢO TỒN TẠI TÀI KHOẢN KHÁCH MẶC ĐỊNH
INSERT OR IGNORE INTO users (id, email, full_name, username, status)
VALUES ('guest_user', 'guest@ai-chan.vn', 'Khách Vãng Lai', 'guest', 'ACTIVE');

-- 2. TẠO BẢNG QUẢN LÝ SYSTEM PROMPT
CREATE TABLE IF NOT EXISTS system_prompts (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL COLLATE NOCASE,
    description VARCHAR(500),
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_user_prompt_name UNIQUE (user_id, name)
);

-- 3. CHỈ MỤC TỐI ƯU HÓA TRUY VẤN
-- Chỉ mục phục vụ tải danh sách prompt theo chủ sở hữu và sắp xếp thời gian cập nhật mới nhất (Anti-IDOR + Sort)
CREATE INDEX IF NOT EXISTS idx_system_prompts_user_updated 
ON system_prompts(user_id, updated_at DESC);

-- Chỉ mục phục vụ kiểm tra trùng tên nhanh theo người dùng
CREATE INDEX IF NOT EXISTS idx_system_prompts_user_name 
ON system_prompts(user_id, name);

-- 4. TRIGGER TỰ ĐỘNG CẬP NHẬT UPDATED_AT KHI SỬA ĐỔI
CREATE TRIGGER IF NOT EXISTS trg_system_prompts_updated_at
AFTER UPDATE ON system_prompts
FOR EACH ROW
BEGIN
    UPDATE system_prompts SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;
