-- ==============================================================================
-- BẢN NÂNG CẤP DỮ LIỆU: 008_visual_pipeline_and_model_binding.sql
-- Mô tả: Khởi tạo bảng quản lý Pipeline kéo thả đồ thị, các nút nodes, cạnh edges
--        và lịch sử thực thi phiên đàm thoại qua Pipeline cho Discord Bot
-- Bounded Context: Bot Pipeline Orchestration & Custom Model Binding (CR-010)
-- Ràng buộc nghiệp vụ: BR-035, BR-036, BR-037, BR-038, SEC-014, CTRL-013
-- ==============================================================================

-- 1. BẢNG THỰC THỂ GỐC PIPELINE BOT DISCORD
CREATE TABLE IF NOT EXISTS bot_pipelines (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    guild_id VARCHAR(50),
    name VARCHAR(100) NOT NULL DEFAULT 'Discord AI Pipeline',
    state VARCHAR(20) NOT NULL DEFAULT 'STOPPED' CHECK (state IN ('STOPPED', 'RUNNING', 'PAUSED')),
    viewport_x REAL NOT NULL DEFAULT 0.0,
    viewport_y REAL NOT NULL DEFAULT 0.0,
    viewport_zoom REAL NOT NULL DEFAULT 1.0,
    is_valid BOOLEAN NOT NULL DEFAULT 1 CHECK (is_valid IN (0, 1)),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. BẢNG CÁC NÚT KHỐI CHỨC NĂNG TRONG ĐỒ THỊ (PIPELINE NODES)
CREATE TABLE IF NOT EXISTS pipeline_nodes (
    id VARCHAR(50) PRIMARY KEY,
    pipeline_id VARCHAR(36) NOT NULL REFERENCES bot_pipelines(id) ON DELETE CASCADE,
    node_type VARCHAR(30) NOT NULL CHECK (node_type IN ('discord_ingress', 'model_binding', 'transform_filter', 'discord_egress')),
    label VARCHAR(100) NOT NULL,
    position_x REAL NOT NULL DEFAULT 100.0,
    position_y REAL NOT NULL DEFAULT 100.0,
    config TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. BẢNG CẠNH NỐI CÓ HƯỚNG GIỮA CÁC NÚT (PIPELINE EDGES)
CREATE TABLE IF NOT EXISTS pipeline_edges (
    id VARCHAR(50) PRIMARY KEY,
    pipeline_id VARCHAR(36) NOT NULL REFERENCES bot_pipelines(id) ON DELETE CASCADE,
    source_node_id VARCHAR(50) NOT NULL REFERENCES pipeline_nodes(id) ON DELETE CASCADE,
    target_node_id VARCHAR(50) NOT NULL REFERENCES pipeline_nodes(id) ON DELETE CASCADE,
    source_handle VARCHAR(50) DEFAULT 'output',
    target_handle VARCHAR(50) DEFAULT 'input',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. BẢNG LƯU VẾT PHIÊN THỰC THI QUA PIPELINE (PIPELINE EXECUTIONS)
CREATE TABLE IF NOT EXISTS pipeline_executions (
    id VARCHAR(36) PRIMARY KEY,
    pipeline_id VARCHAR(36) NOT NULL REFERENCES bot_pipelines(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trigger_source VARCHAR(20) NOT NULL DEFAULT 'DISCORD' CHECK (trigger_source IN ('DISCORD', 'SIMULATION', 'API')),
    input_message TEXT NOT NULL,
    output_message TEXT,
    model_used VARCHAR(100),
    tokens_consumed INTEGER NOT NULL DEFAULT 0,
    pipeline_overhead_ms REAL NOT NULL DEFAULT 0.0,
    llm_latency_ms REAL NOT NULL DEFAULT 0.0,
    status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'PAUSED_REJECT', 'STOPPED_REJECT', 'QUOTA_REJECT', 'FAILED')),
    error_detail TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. CHỈ MỤC TỐI ƯU TRUY VẤN
CREATE INDEX IF NOT EXISTS idx_bot_pipelines_user_id ON bot_pipelines(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_pipelines_state ON bot_pipelines(state);
CREATE INDEX IF NOT EXISTS idx_pipeline_nodes_pipeline_id ON pipeline_nodes(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_nodes_type ON pipeline_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_pipeline_edges_pipeline_id ON pipeline_edges(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_edges_source ON pipeline_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_edges_target ON pipeline_edges(target_node_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_pipeline ON pipeline_executions(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_user ON pipeline_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_created ON pipeline_executions(created_at);

-- 6. TRIGGERS CẬP NHẬT THỜI GIAN
CREATE TRIGGER IF NOT EXISTS trg_bot_pipelines_updated_at
AFTER UPDATE ON bot_pipelines
FOR EACH ROW
BEGIN
    UPDATE bot_pipelines SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_pipeline_nodes_updated_at
AFTER UPDATE ON pipeline_nodes
FOR EACH ROW
BEGIN
    UPDATE pipeline_nodes SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;
