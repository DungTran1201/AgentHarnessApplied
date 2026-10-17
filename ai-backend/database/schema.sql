-- ==============================================================================
-- DATABASE ARCHITECTURE SCHEMA: AI-CHAN VIRTUAL ASSISTANT
-- Target DBMS: SQLite 3 / ANSI SQL Compatible (PostgreSQL Ready)
-- Derived from: docs/07-domain/, docs/08-api/, docs/06-architecture/
-- ==============================================================================

-- Bật cưỡng chế ràng buộc khóa ngoại cho SQLite
PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------------------------
-- 1. BẢNG NGƯỜI DÙNG (USERS)
-- Đại diện cho tài khoản người dùng đã đăng ký trong hệ thống
-- Bounded Context: Identity & Authentication Context
-- Invariants: Email duy nhất, mật khẩu đã qua băm bcrypt, trạng thái ACTIVE/DISABLED
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE COLLATE NOCASE,
    full_name VARCHAR(255),
    hashed_password VARCHAR(255), -- Cho phép NULL đối với tài khoản đăng ký thuần túy qua Discord OAuth2 (BR-018)
    username VARCHAR(50) UNIQUE COLLATE NOCASE,
    avatar_url VARCHAR(500),
    bio VARCHAR(500),
    phone_number VARCHAR(20),
    discord_id VARCHAR(50) UNIQUE, -- Mã định danh Discord duy nhất (FR-027, FR-028)
    discord_username VARCHAR(100), -- Tên hiển thị người dùng Discord
    theme_preference VARCHAR(10) NOT NULL DEFAULT 'DARK' CHECK (theme_preference IN ('DARK', 'LIGHT', 'SYSTEM')),
    language_preference VARCHAR(10) NOT NULL DEFAULT 'vi' CHECK (language_preference IN ('vi', 'en')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    last_login_at TIMESTAMP,
    password_changed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Chỉ mục tối ưu hóa tìm kiếm người dùng theo Email khi đăng nhập (PROC-002, SEQ-002)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Chỉ mục tối ưu hóa tìm kiếm theo Tên đăng nhập Username (PROC-011, BR-007)
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Chỉ mục tối ưu hóa định danh Discord OAuth2 (FR-027, FR-028, PROC-014)
CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id);

-- Trigger tự động cập nhật updated_at cho users khi có thay đổi bản ghi
CREATE TRIGGER IF NOT EXISTS trg_users_updated_at
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;


-- ------------------------------------------------------------------------------
-- 2. BẢNG CUỘC TRÒ CHUYỆN (CONVERSATIONS)
-- Đại diện cho một phiên hội thoại độc lập giữa một người dùng và AI Assistant
-- Bounded Context: Conversation Context (Aggregate Root)
-- Invariants: Thuộc về duy nhất 1 User (BR-002), xóa User sẽ CASCADE xóa Conversation
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL DEFAULT 'Cuộc trò chuyện mới',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Chỉ mục lọc cuộc trò chuyện theo chủ sở hữu (Anti-IDOR Query & Sidebar list)
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);

-- Chỉ mục kết hợp (Composite Index) phục vụ tải danh sách hội thoại sắp xếp theo thời gian mới nhất (Cursor Pagination)
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC);

-- Trigger tự động cập nhật updated_at cho conversations khi đổi tên hoặc cập nhật
CREATE TRIGGER IF NOT EXISTS trg_conversations_updated_at
AFTER UPDATE ON conversations
FOR EACH ROW
BEGIN
    UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;


-- ------------------------------------------------------------------------------
-- 3. BẢNG TIN NHẮN ĐÀM THOẠI (MESSAGES)
-- Đại diện cho một lượt phát ngôn văn bản trong cuộc trò chuyện (USER hoặc ASSISTANT)
-- Bounded Context: Chat Context (Child Entity thuộc Conversation Aggregate)
-- Invariants: Xóa Conversation sẽ CASCADE xóa Message, nội dung văn bản không rỗng
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(36) PRIMARY KEY,
    conversation_id VARCHAR(36) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    model_used VARCHAR(100),
    tokens_prompt INTEGER DEFAULT 0,
    tokens_completion INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Chỉ mục truy vấn dòng tin nhắn theo thứ tự thời gian tăng dần để render cuộc trò chuyện trên UI (SEQ-003)
CREATE INDEX IF NOT EXISTS idx_messages_conv_created_asc ON messages(conversation_id, created_at ASC);

-- Chỉ mục truy vấn trượt 20 tin nhắn gần nhất làm ngữ cảnh đưa vào LLM (INV-04, Sliding Context Window)
CREATE INDEX IF NOT EXISTS idx_messages_conv_created_desc ON messages(conversation_id, created_at DESC);

-- Chỉ mục lọc tin nhắn theo model_used để thống kê sử dụng theo mô hình
CREATE INDEX IF NOT EXISTS idx_messages_model_used ON messages(model_used);


-- ------------------------------------------------------------------------------
-- 4. BẢNG MÔ HÌNH AGENT (MODELS)
-- Quản lý danh mục mô hình LLM từ nhiều nhà cung cấp (Google, Anthropic, OpenAI, Groq, Ollama)
-- Bounded Context: Model Catalog Context & Agent Orchestration (Aggregate Root)
-- Invariants: Soft toggle trạng thái (BR-012), Tối thiểu 1 model ACTIVE là mặc định (BR-013),
--             Kiểm tra kết nối và độ trễ Round-Trip (FR-023, BR-014, BR-015)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS models (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('google', 'anthropic', 'openai', 'groq', 'ollama')),
    status VARCHAR(20) NOT NULL DEFAULT 'INACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'DEGRADED', 'ARCHIVED')),
    is_default BOOLEAN NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
    context_window INTEGER NOT NULL DEFAULT 128000,
    max_tokens INTEGER NOT NULL DEFAULT 4096,
    supports_streaming BOOLEAN NOT NULL DEFAULT 1 CHECK (supports_streaming IN (0, 1)),
    latency_ms INTEGER,
    last_checked_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Chỉ mục lọc mô hình theo nhà cung cấp
CREATE INDEX IF NOT EXISTS idx_models_provider ON models(provider);

-- Chỉ mục lọc mô hình theo trạng thái hoạt động (ACTIVE, INACTIVE, DEGRADED)
CREATE INDEX IF NOT EXISTS idx_models_status ON models(status);

-- Chỉ mục lọc mô hình mặc định hệ thống
CREATE INDEX IF NOT EXISTS idx_models_is_default ON models(is_default);

-- Trigger tự động cập nhật updated_at cho models khi có cập nhật cấu hình hoặc trạng thái
CREATE TRIGGER IF NOT EXISTS trg_models_updated_at
AFTER UPDATE ON models
FOR EACH ROW
BEGIN
    UPDATE models SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- Dữ liệu khởi tạo (Seed data) cho các mô hình hệ thống mặc định
INSERT OR IGNORE INTO models (id, name, provider, status, is_default, context_window, max_tokens, supports_streaming)
VALUES
    ('gemini-3.8-flash', 'Google Gemini 3.8 Flash', 'google', 'ACTIVE', 1, 1000000, 8192, 1),
    ('gemini-3.5-flash-lite', 'Google Gemini 3.5 Flash Lite', 'google', 'ACTIVE', 0, 1000000, 8192, 1),
    ('gemini-flash-lite-latest', 'Google Gemini Flash Lite Latest', 'google', 'ACTIVE', 0, 1000000, 8192, 1),
    ('gemini-3.5-flash', 'Google Gemini 3.5 Flash', 'google', 'ACTIVE', 0, 1000000, 8192, 1),
    ('gpt-4o-mini', 'OpenAI GPT-4o Mini', 'openai', 'INACTIVE', 0, 128000, 4096, 1),
    ('claude-3-7-sonnet', 'Anthropic Claude 3.7 Sonnet', 'anthropic', 'INACTIVE', 0, 200000, 8192, 1),
    ('llama-3.3-70b-versatile', 'Groq Llama 3.3 70B', 'groq', 'INACTIVE', 0, 128000, 8192, 1),
    ('llama3', 'Ollama Local Llama 3', 'ollama', 'INACTIVE', 0, 8192, 2048, 1);

-- ==============================================================================
-- 5. BẢNG NHẬT KÝ ĐO ĐẠC TELEMETRY & QUẢN LÝ QUOTA TÀI NGUYÊN (RESOURCE TELEMETRY)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS api_metric_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    latency_ms REAL NOT NULL,
    ttft_ms REAL DEFAULT NULL,
    model_name VARCHAR(100) DEFAULT NULL,
    provider VARCHAR(50) DEFAULT NULL,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    error_code VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_metric_user_created ON api_metric_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_metric_created ON api_metric_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_metric_endpoint ON api_metric_logs(endpoint);

CREATE TABLE IF NOT EXISTS user_quotas (
    user_id VARCHAR(36) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    daily_token_limit INTEGER NOT NULL DEFAULT 100000,
    daily_tokens_used INTEGER NOT NULL DEFAULT 0,
    reset_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_quotas_reset ON user_quotas(reset_at);


-- ==============================================================================
-- 6. BẢNG QUẢN LÝ DỰ ÁN (PROJECTS - PROJECT MANAGEMENT MVP)
-- ==============================================================================

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

CREATE INDEX IF NOT EXISTS idx_projects_user_updated ON projects(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_user_status ON projects(user_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_target_model ON projects(target_model_id);

CREATE TRIGGER IF NOT EXISTS trg_projects_updated_at
AFTER UPDATE ON projects
FOR EACH ROW
BEGIN
    UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- ==============================================================================
-- 7. BẢNG QUẢN LÝ SYSTEM PROMPT (SYSTEM PROMPT MANAGEMENT MVP)
-- ==============================================================================

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

CREATE INDEX IF NOT EXISTS idx_system_prompts_user_updated ON system_prompts(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_prompts_user_name ON system_prompts(user_id, name);

CREATE TRIGGER IF NOT EXISTS trg_system_prompts_updated_at
AFTER UPDATE ON system_prompts
FOR EACH ROW
BEGIN
    UPDATE system_prompts SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;


-- ==============================================================================
-- 8. BẢNG QUẢN LÝ TỆP ĐÍNH KÈM & TÀI NGUYÊN (ATTACHMENTS & LIBRARY ASSETS)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS attachments (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    conversation_id VARCHAR(36),
    message_id VARCHAR(36),
    project_id VARCHAR(36),
    skill_id VARCHAR(36),
    prompt_id VARCHAR(36),
    filename VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    category VARCHAR(20) NOT NULL CHECK(category IN ('image', 'document', 'code', 'archive', 'audio', 'video', 'other')),
    storage_path VARCHAR(500) NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'READY' CHECK(status IN ('UPLOADING', 'READY', 'ATTACHED', 'FAILED', 'DELETED')),
    extracted_text TEXT,
    image_width INTEGER,
    image_height INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    FOREIGN KEY (prompt_id) REFERENCES system_prompts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attachments_user_id ON attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_attachments_conv_id ON attachments(conversation_id);
CREATE INDEX IF NOT EXISTS idx_attachments_message_id ON attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_attachments_project_id ON attachments(project_id);
CREATE INDEX IF NOT EXISTS idx_attachments_skill_id ON attachments(skill_id);
CREATE INDEX IF NOT EXISTS idx_attachments_prompt_id ON attachments(prompt_id);
CREATE INDEX IF NOT EXISTS idx_attachments_status ON attachments(status);

CREATE TRIGGER IF NOT EXISTS trg_attachments_updated_at
AFTER UPDATE ON attachments
FOR EACH ROW
BEGIN
    UPDATE attachments SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;


-- ------------------------------------------------------------------------------
-- 11. BẢNG CÔNG CỤ (TOOLS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tools (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL CHECK(category IN ('WEB', 'FILE', 'FAISS', 'DATA')),
    version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    risk_level VARCHAR(20) NOT NULL DEFAULT 'LOW' CHECK(risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
    source_type VARCHAR(20) NOT NULL DEFAULT 'BUILTIN' CHECK(source_type IN ('BUILTIN', 'CUSTOM')),
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE' CHECK(status IN ('AVAILABLE', 'NEEDS_CONFIGURATION', 'DEPENDENCY_MISSING', 'DISABLED', 'ERROR', 'DEPRECATED')),
    input_schema TEXT NOT NULL,
    output_schema TEXT NOT NULL,
    configuration_schema TEXT DEFAULT '{}',
    tags TEXT DEFAULT '[]',
    timeout_seconds INTEGER NOT NULL DEFAULT 30,
    max_payload_bytes INTEGER NOT NULL DEFAULT 10485760,
    requires_network BOOLEAN NOT NULL DEFAULT 0,
    requires_filesystem BOOLEAN NOT NULL DEFAULT 0,
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


-- ------------------------------------------------------------------------------
-- 12. BẢNG CẤU HÌNH CÔNG CỤ (TOOL_CONFIGURATIONS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tool_configurations (
    id VARCHAR(36) PRIMARY KEY,
    tool_id VARCHAR(64) NOT NULL,
    project_id VARCHAR(36),
    user_id VARCHAR(36),
    encrypted_secrets TEXT,
    parameters TEXT NOT NULL DEFAULT '{}',
    is_enabled BOOLEAN NOT NULL DEFAULT 1,
    last_tested_at TIMESTAMP,
    last_test_result VARCHAR(20) CHECK(last_test_result IN ('SUCCESS', 'FAILED')),
    last_test_message TEXT,
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


-- ------------------------------------------------------------------------------
-- 13. BẢNG LIÊN KẾT PROJECT VỚI TOOL (PROJECT_TOOL_BINDINGS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_tool_bindings (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    tool_id VARCHAR(64) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT 1,
    custom_timeout_seconds INTEGER,
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


-- ------------------------------------------------------------------------------
-- 14. BẢNG LỊCH SỬ THỰC THI CÔNG CỤ (TOOL_EXECUTIONS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tool_executions (
    id VARCHAR(36) PRIMARY KEY,
    tool_id VARCHAR(64) NOT NULL,
    project_id VARCHAR(36),
    user_id VARCHAR(36),
    conversation_id VARCHAR(36),
    status VARCHAR(20) NOT NULL CHECK(status IN ('REQUESTED', 'VALIDATING', 'EXECUTING', 'SUCCEEDED', 'FAILED', 'TIMED_OUT', 'BLOCKED')),
    input_payload TEXT NOT NULL,
    output_payload TEXT,
    error_message TEXT,
    execution_time_ms INTEGER NOT NULL DEFAULT 0,
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




