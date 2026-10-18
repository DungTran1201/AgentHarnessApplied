-- ==============================================================================
-- MIGRATION: 017_rules_management_system.sql
-- Description: Schema for Rules Management System (Rules Library, Activation Metadata & Project Association)
-- Bounded Context: Rules Management Context
-- Database: SQLite (compatible with app.db)
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- 1. TẠO BẢNG QUẢN LÝ QUY TẮC (RULES)
CREATE TABLE IF NOT EXISTS rules (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    name VARCHAR(100) NOT NULL COLLATE NOCASE,
    description VARCHAR(500),
    content TEXT NOT NULL,
    scope VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (scope IN ('system', 'user', 'project')),
    activation_mode VARCHAR(20) NOT NULL DEFAULT 'always_on' CHECK (activation_mode IN ('always_on', 'model_decision', 'glob', 'manual')),
    glob_patterns TEXT DEFAULT '[]',
    tags TEXT DEFAULT '[]',
    priority INTEGER NOT NULL DEFAULT 50 CHECK (priority >= 0 AND priority <= 100),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. TẠO BẢNG LIÊN KẾT DỰ ÁN - QUY TẮC (PROJECT_RULES)
CREATE TABLE IF NOT EXISTS project_rules (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    rule_id VARCHAR(36) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT 1,
    custom_priority INTEGER DEFAULT NULL CHECK (custom_priority IS NULL OR (custom_priority >= 0 AND custom_priority <= 100)),
    bound_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (rule_id) REFERENCES rules(id) ON DELETE CASCADE,
    CONSTRAINT uq_project_rule UNIQUE (project_id, rule_id)
);

-- 3. CHỈ MỤC TỐI ƯU HÓA TRUY VẤN
-- Phục vụ truy vấn danh sách theo người dùng và thời gian cập nhật
CREATE INDEX IF NOT EXISTS idx_rules_user_updated 
ON rules(user_id, updated_at DESC);

-- Phục vụ kiểm tra trùng tên theo người dùng
CREATE INDEX IF NOT EXISTS idx_rules_user_name 
ON rules(user_id, name);

-- Phục vụ lọc theo scope và status (loại trừ đã xóa mềm)
CREATE INDEX IF NOT EXISTS idx_rules_scope_status 
ON rules(scope, status);

-- Phục vụ truy vấn các rule được gán cho project
CREATE INDEX IF NOT EXISTS idx_project_rules_project 
ON project_rules(project_id, is_enabled);

-- Phục vụ kiểm tra ngược các project đang sử dụng một rule
CREATE INDEX IF NOT EXISTS idx_project_rules_rule 
ON project_rules(rule_id);

-- 4. TRIGGER TỰ ĐỘNG CẬP NHẬT UPDATED_AT KHI SỬA ĐỔI
CREATE TRIGGER IF NOT EXISTS trg_rules_updated_at
AFTER UPDATE ON rules
FOR EACH ROW
BEGIN
    UPDATE rules SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- 5. SEED CÁC SYSTEM RULES MẪU (CHUẨN HỆ THỐNG - CHỈ ĐỌC)
INSERT OR IGNORE INTO rules (id, user_id, name, description, content, scope, activation_mode, glob_patterns, tags, priority, status, version)
VALUES 
(
    'sys-rule-clean-code',
    NULL,
    'Tiêu Chuẩn Mã Nguồn Sạch (Clean Code Standards)',
    'Ràng buộc viết mã nguồn tường minh, ngắn gọn, không viết code thừa (Ponytail Mode) và có xử lý lỗi tại biên giới tin cậy.',
    '# Nguyên Tắc Viết Code Tiêu Chuẩn

1. **YAGNI (You Aren''t Gonna Need It)**: Không thêm abstraction hoặc lớp trung gian nếu không được yêu cầu rõ ràng.
2. **Tái sử dụng trước khi viết mới**: Tìm kiếm các helper và thư viện sẵn có trong repository trước khi triển khai lại.
3. **Xử lý lỗi tại biên giới**: Mọi dữ liệu đầu vào từ người dùng hoặc API bên ngoài phải được kiểm tra (Validation) chặt chẽ.
4. **Ngắn gọn và chính xác**: Ưu tiên code rõ nghĩa, ít dòng hơn nhưng phải xử lý triệt để nguyên nhân gốc của lỗi (Root Cause).',
    'system',
    'always_on',
    '[]',
    '["coding", "clean-code", "standards"]',
    80,
    'active',
    1
),
(
    'sys-rule-security-first',
    NULL,
    'Quy Ước An Ninh Ứng Dụng (Application Security Directives)',
    'Ràng buộc phòng chống rò rỉ secret, chống SQL Injection, Stored XSS, và cưỡng chế kiểm tra quyền truy cập (Anti-IDOR).',
    '# Quy Chuẩn An Ninh Bắt Buộc

1. **Tuyệt đối không lưu trữ bí mật (Secrets)**: Không ghi cứng API key, Token, mật khẩu vào mã nguồn, log hoặc tài liệu mẫu.
2. **Kiểm soát quyền truy cập 100%**: Mọi thao tác đọc/ghi dữ liệu của người dùng phải được kiểm tra `user_id` khớp với Token đã xác thực (Anti-IDOR).
3. **Khử khuẩn nội dung (Sanitization)**: Dữ liệu văn bản người dùng nhập vào phải được làm sạch trước khi render ra HTML để ngăn chặn XSS.
4. **Không log dữ liệu nhạy cảm**: Không ghi nội dung prompt hoặc quy tắc chứa thông tin cá nhân vào hệ thống ghi log.',
    'system',
    'always_on',
    '[]',
    '["security", "owasp", "anti-idor"]',
    90,
    'active',
    1
),
(
    'sys-rule-typescript-guidelines',
    NULL,
    'Hướng Dẫn Cú Pháp TypeScript (Frontend Strict Mode)',
    'Tiêu chuẩn viết mã giao diện TypeScript với kiểm tra kiểu dữ liệu nghiêm ngặt, cấm sử dụng kiểu any.',
    '# Quy Chuẩn TypeScript Frontend

1. **Không sử dụng kiểu `any`**: Luôn định nghĩa Interface hoặc Type rõ ràng cho props, state và API payload.
2. **Sử dụng Type Guards**: Kiểm tra kiểu dữ liệu an toàn trước khi truy cập thuộc tính của các đối tượng không xác định.
3. **Bất biến trong State Management**: Không mutate trực tiếp state React; luôn sử dụng hàm cập nhật trạng thái an toàn.',
    'system',
    'glob',
    '["src/**/*.ts", "src/**/*.tsx"]',
    '["frontend", "typescript", "react"]',
    60,
    'active',
    1
);
