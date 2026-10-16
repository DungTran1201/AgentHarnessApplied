-- ==============================================================================
-- MIGRATION: 015_unified_file_upload_system.sql
-- Mô tả: Khởi tạo hệ thống quản lý tệp đính kèm và tài nguyên dùng chung (Unified File Uploads)
-- Áp dụng cho: Chat thông thường, Project Chat, Skills Library, System Prompt Library
-- Invariants: Anti-IDOR (user_id), Cascade delete với message/skill/prompt, Safe storage
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- 1. BẢNG TỆP ĐÍNH KÈM & TÀI NGUYÊN DÙNG CHUNG (ATTACHMENTS)
CREATE TABLE IF NOT EXISTS attachments (
    id VARCHAR(36) PRIMARY KEY,                         -- att_... hoặc UUID
    user_id VARCHAR(36) NOT NULL,                       -- Chủ sở hữu tệp (Anti-IDOR)
    conversation_id VARCHAR(36),                        -- Phiên hội thoại liên kết (nếu có)
    message_id VARCHAR(36),                             -- Tin nhắn liên kết (NULL nếu đang staged trước khi gửi)
    project_id VARCHAR(36),                             -- Project liên kết (nếu tải lên trong Project Chat)
    skill_id VARCHAR(36),                               -- Skill liên kết (nếu là tài nguyên của Skill)
    prompt_id VARCHAR(36),                              -- System Prompt liên kết (nếu là tài nguyên của Prompt)
    filename VARCHAR(255) NOT NULL,                     -- Tên gốc của tệp đã được làm sạch
    file_size INTEGER NOT NULL,                         -- Dung lượng tệp (bytes)
    mime_type VARCHAR(100) NOT NULL,                    -- MIME type đã được xác minh qua magic bytes
    category VARCHAR(20) NOT NULL CHECK(category IN ('image', 'document', 'code', 'archive', 'audio', 'video', 'other')),
    storage_path VARCHAR(500) NOT NULL,                 -- Đường dẫn tương đối trong kho lưu trữ an toàn
    checksum_sha256 VARCHAR(64) NOT NULL,               -- Băm toàn vẹn SHA-256
    status VARCHAR(20) NOT NULL DEFAULT 'READY' CHECK(status IN ('UPLOADING', 'READY', 'ATTACHED', 'FAILED', 'DELETED')),
    extracted_text TEXT,                                -- Nội dung văn bản trích xuất cho mô hình AI
    image_width INTEGER,                                -- Chiều rộng ảnh (pixels) nếu là ảnh
    image_height INTEGER,                               -- Chiều cao ảnh (pixels) nếu là ảnh
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    FOREIGN KEY (prompt_id) REFERENCES system_prompts(id) ON DELETE CASCADE
);

-- Chỉ mục lọc theo người dùng (Anti-IDOR)
CREATE INDEX IF NOT EXISTS idx_attachments_user_id ON attachments(user_id);

-- Chỉ mục lọc theo cuộc trò chuyện
CREATE INDEX IF NOT EXISTS idx_attachments_conv_id ON attachments(conversation_id);

-- Chỉ mục lọc theo tin nhắn (Truy vấn attachments của message)
CREATE INDEX IF NOT EXISTS idx_attachments_message_id ON attachments(message_id);

-- Chỉ mục lọc theo project
CREATE INDEX IF NOT EXISTS idx_attachments_project_id ON attachments(project_id);

-- Chỉ mục lọc theo skill
CREATE INDEX IF NOT EXISTS idx_attachments_skill_id ON attachments(skill_id);

-- Chỉ mục lọc theo system prompt
CREATE INDEX IF NOT EXISTS idx_attachments_prompt_id ON attachments(prompt_id);

-- Chỉ mục lọc theo trạng thái
CREATE INDEX IF NOT EXISTS idx_attachments_status ON attachments(status);

-- Trigger cập nhật updated_at
CREATE TRIGGER IF NOT EXISTS trg_attachments_updated_at
AFTER UPDATE ON attachments
FOR EACH ROW
BEGIN
    UPDATE attachments SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;
