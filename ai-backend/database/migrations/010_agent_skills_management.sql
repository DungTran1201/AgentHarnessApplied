-- ==============================================================================
-- MIGRATION: 010_agent_skills_management.sql
-- Mô tả: Khởi tạo bảng skills và skill_files cho phân hệ Quản lý Kỹ năng Agent (MVP)
-- Bounded Context: Skills Management Context
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- 1. BẢNG QUẢN LÝ KỸ NĂNG (SKILLS)
CREATE TABLE IF NOT EXISTS skills (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(64) NOT NULL COLLATE NOCASE,
    description VARCHAR(1024) NOT NULL,
    license VARCHAR(255),
    compatibility VARCHAR(500),
    allowed_tools TEXT,
    metadata_json TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'VALID', 'INVALID', 'ARCHIVED')),
    source_type VARCHAR(20) NOT NULL DEFAULT 'USER_CREATED' CHECK (source_type IN ('USER_CREATED', 'IMPORTED')),
    storage_path VARCHAR(500) NOT NULL,
    is_valid BOOLEAN NOT NULL DEFAULT 0 CHECK (is_valid IN (0, 1)),
    last_validated_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_user_skill_name UNIQUE (user_id, name)
);

-- Chỉ mục lọc theo người dùng và thời gian cập nhật (Phục vụ danh sách thư viện & Anti-IDOR)
CREATE INDEX IF NOT EXISTS idx_skills_user_updated 
ON skills(user_id, updated_at DESC);

-- Chỉ mục lọc theo trạng thái hợp lệ
CREATE INDEX IF NOT EXISTS idx_skills_user_status 
ON skills(user_id, status);

-- Chỉ mục tìm kiếm nhanh theo tên
CREATE INDEX IF NOT EXISTS idx_skills_user_name 
ON skills(user_id, name);

-- Trigger tự động cập nhật updated_at khi có sửa đổi
CREATE TRIGGER IF NOT EXISTS trg_skills_updated_at
AFTER UPDATE ON skills
FOR EACH ROW
BEGIN
    UPDATE skills SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;


-- 2. BẢNG CHỈ MỤC TỆP TÀI NGUYÊN BỔ TRỢ (SKILL_FILES)
CREATE TABLE IF NOT EXISTS skill_files (
    id VARCHAR(36) PRIMARY KEY,
    skill_id VARCHAR(36) NOT NULL,
    relative_path VARCHAR(255) NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('ROOT_DOC', 'SCRIPT', 'REFERENCE', 'ASSET')),
    size_bytes INTEGER NOT NULL DEFAULT 0,
    sha256_hash VARCHAR(64),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    CONSTRAINT uq_skill_file_path UNIQUE (skill_id, relative_path)
);

-- Chỉ mục tìm kiếm tệp theo skill
CREATE INDEX IF NOT EXISTS idx_skill_files_skill_id 
ON skill_files(skill_id);
