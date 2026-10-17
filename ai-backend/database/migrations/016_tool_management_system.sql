-- ==============================================================================
-- MIGRATION: 016_tool_management_system.sql
-- Mô tả: Khởi tạo hệ thống Quản lý Công cụ (Tool Management & Registry System)
-- Áp dụng cho: Tool Registry, Tool Detail & Configuration, Project Tool Bindings, Tool Executions Audit
-- Invariants: Anti-IDOR, Khóa ngoại an toàn, Audit logging không lộ secrets
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- 1. BẢNG DANH MỤC CÔNG CỤ (TOOLS)
CREATE TABLE IF NOT EXISTS tools (
    id VARCHAR(64) PRIMARY KEY,                         -- tool_id định danh duy nhất (ví dụ: calculator, fetch_webpage)
    name VARCHAR(100) NOT NULL,                         -- Tên hiển thị của công cụ
    description TEXT NOT NULL,                          -- Mô tả mục đích và cách sử dụng
    category VARCHAR(50) NOT NULL CHECK(category IN ('WEB', 'FILE', 'FAISS', 'DATA')), -- Nhóm phân loại
    version VARCHAR(20) NOT NULL DEFAULT '1.0.0',       -- Phiên bản công cụ
    risk_level VARCHAR(20) NOT NULL DEFAULT 'LOW' CHECK(risk_level IN ('LOW', 'MEDIUM', 'HIGH')), -- Mức độ rủi ro
    source_type VARCHAR(20) NOT NULL DEFAULT 'BUILTIN' CHECK(source_type IN ('BUILTIN', 'CUSTOM')), -- Nguồn gốc
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE' CHECK(status IN ('AVAILABLE', 'NEEDS_CONFIGURATION', 'DEPENDENCY_MISSING', 'DISABLED', 'ERROR', 'DEPRECATED')),
    input_schema TEXT NOT NULL,                         -- JSON Schema định nghĩa tham số đầu vào
    output_schema TEXT NOT NULL,                        -- JSON Schema định nghĩa kết quả đầu ra
    configuration_schema TEXT DEFAULT '{}',             -- JSON Schema cho các tham số cấu hình bổ sung
    tags TEXT DEFAULT '[]',                             -- Mảng JSON các nhãn/tags
    timeout_seconds INTEGER NOT NULL DEFAULT 30,        -- Giới hạn thời gian thực thi (giây)
    max_payload_bytes INTEGER NOT NULL DEFAULT 10485760, -- Giới hạn dung lượng payload (10MB)
    requires_network BOOLEAN NOT NULL DEFAULT 0,        -- Cần kết nối mạng Internet
    requires_filesystem BOOLEAN NOT NULL DEFAULT 0,     -- Cần truy xuất hệ thống tệp
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tools_category ON tools(category);
CREATE INDEX IF NOT EXISTS idx_tools_status ON tools(status);
CREATE INDEX IF NOT EXISTS idx_tools_risk_level ON tools(risk_level);

CREATE TRIGGER IF NOT EXISTS trg_tools_updated_at
AFTER UPDATE ON tools
FOR EACH ROW
BEGIN
    UPDATE tools SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;


-- 2. BẢNG CẤU HÌNH CÔNG CỤ (TOOL_CONFIGURATIONS)
CREATE TABLE IF NOT EXISTS tool_configurations (
    id VARCHAR(36) PRIMARY KEY,                         -- UUID cấu hình
    tool_id VARCHAR(64) NOT NULL,                       -- Tool được cấu hình
    project_id VARCHAR(36),                             -- NULL nếu là cấu hình toàn cục hoặc theo Project
    user_id VARCHAR(36),                                -- NULL nếu là cấu hình hệ thống hoặc theo User
    encrypted_secrets TEXT,                             -- Chuỗi bí mật đã mã hóa AES-256 (API key, tokens)
    parameters TEXT NOT NULL DEFAULT '{}',              -- Các tham số cấu hình phi bí mật (JSON)
    is_enabled BOOLEAN NOT NULL DEFAULT 1,              -- Trạng thái bật/tắt của cấu hình
    last_tested_at TIMESTAMP,                           -- Lần kiểm tra kết nối gần nhất
    last_test_result VARCHAR(20) CHECK(last_test_result IN ('SUCCESS', 'FAILED')), -- Kết quả test gần nhất
    last_test_message TEXT,                             -- Thông điệp chi tiết của lần test gần nhất
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(tool_id, project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tool_configurations_tool_id ON tool_configurations(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_configurations_project_id ON tool_configurations(project_id);
CREATE INDEX IF NOT EXISTS idx_tool_configurations_user_id ON tool_configurations(user_id);

CREATE TRIGGER IF NOT EXISTS trg_tool_configurations_updated_at
AFTER UPDATE ON tool_configurations
FOR EACH ROW
BEGIN
    UPDATE tool_configurations SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;


-- 3. BẢNG LIÊN KẾT PROJECT VỚI TOOL (PROJECT_TOOL_BINDINGS)
CREATE TABLE IF NOT EXISTS project_tool_bindings (
    id VARCHAR(36) PRIMARY KEY,                         -- UUID bản ghi liên kết
    project_id VARCHAR(36) NOT NULL,                    -- Project được cấp quyền gọi tool
    tool_id VARCHAR(64) NOT NULL,                       -- Tool được cấp quyền
    is_enabled BOOLEAN NOT NULL DEFAULT 1,              -- Cho phép gọi trong project hay không
    custom_timeout_seconds INTEGER,                     -- Override timeout riêng cho project (tùy chọn)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE CASCADE,
    UNIQUE(project_id, tool_id)
);

CREATE INDEX IF NOT EXISTS idx_project_tool_bindings_project_id ON project_tool_bindings(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tool_bindings_tool_id ON project_tool_bindings(tool_id);

CREATE TRIGGER IF NOT EXISTS trg_project_tool_bindings_updated_at
AFTER UPDATE ON project_tool_bindings
FOR EACH ROW
BEGIN
    UPDATE project_tool_bindings SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;


-- 4. BẢNG LỊCH SỬ THỰC THI CÔNG CỤ (TOOL_EXECUTIONS)
CREATE TABLE IF NOT EXISTS tool_executions (
    id VARCHAR(36) PRIMARY KEY,                         -- UUID lượt thực thi
    tool_id VARCHAR(64) NOT NULL,                       -- Tool được gọi
    project_id VARCHAR(36),                             -- Project kích hoạt (nếu có)
    user_id VARCHAR(36),                                -- Người dùng kích hoạt
    conversation_id VARCHAR(36),                        -- Phiên chat liên quan (nếu có)
    status VARCHAR(20) NOT NULL CHECK(status IN ('REQUESTED', 'VALIDATING', 'EXECUTING', 'SUCCEEDED', 'FAILED', 'TIMED_OUT', 'BLOCKED')),
    input_payload TEXT NOT NULL,                        -- Dữ liệu đầu vào (đã loại bỏ thông tin nhạy cảm)
    output_payload TEXT,                                -- Kết quả trả về (đã loại bỏ thông tin nhạy cảm)
    error_message TEXT,                                 -- Lỗi chi tiết nếu thực thi thất bại
    execution_time_ms INTEGER NOT NULL DEFAULT 0,       -- Thời gian thực thi (milliseconds)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tool_executions_tool_id ON tool_executions(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_executions_project_id ON tool_executions(project_id);
CREATE INDEX IF NOT EXISTS idx_tool_executions_user_id ON tool_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_executions_created_at ON tool_executions(created_at);
