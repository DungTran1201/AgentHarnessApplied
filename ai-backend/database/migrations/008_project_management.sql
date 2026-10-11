-- ==============================================================================
-- MIGRATION: 008_project_management.sql
-- Mô tả: Khởi tạo bảng projects và liên kết với conversations cho phân hệ Quản lý Project (MVP)
-- Bounded Context: Project Management Context & Execution Harness
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- 0. ĐẢM BẢO TỒN TẠI TÀI KHOẢN KHÁCH MẶC ĐỊNH (HỖ TRỢ TẠO PROJECT KHÔNG CẦN LOGIN)
INSERT OR IGNORE INTO users (id, email, full_name, username, status)
VALUES ('guest_user', 'guest@ai-chan.vn', 'Khách Vãng Lai', 'guest', 'ACTIVE');

-- 1. TẠO BẢNG QUẢN LÝ DỰ ÁN (PROJECTS)
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'STOP' CHECK (status IN ('ACTIVE', 'STOP', 'DEACTIVE', 'DELETED')),
    graph_data TEXT,
    target_model_id VARCHAR(100),
    max_words_limit INTEGER DEFAULT 500,
    is_valid BOOLEAN NOT NULL DEFAULT 0 CHECK (is_valid IN (0, 1)),
    last_validated_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (target_model_id) REFERENCES models(id) ON DELETE SET NULL
);

-- Chỉ mục lọc theo người dùng và thời gian cập nhật
CREATE INDEX IF NOT EXISTS idx_projects_user_updated ON projects(user_id, updated_at DESC);

-- Chỉ mục lọc theo người dùng và trạng thái (Phục vụ truy vấn Quota & Trang Chủ)
CREATE INDEX IF NOT EXISTS idx_projects_user_status ON projects(user_id, status);

-- Chỉ mục theo mô hình được liên kết
CREATE INDEX IF NOT EXISTS idx_projects_target_model ON projects(target_model_id);

-- Trigger tự động cập nhật updated_at khi có sửa đổi
CREATE TRIGGER IF NOT EXISTS trg_projects_updated_at
AFTER UPDATE ON projects
FOR EACH ROW
BEGIN
    UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- 2. BỔ SUNG CỘT project_id VÀO BẢNG CONVERSATIONS (NẾU CHƯA CÓ)
-- (Sử dụng script Python trong apply_migrations.py để kiểm tra cột trước khi ALTER TABLE an toàn)
