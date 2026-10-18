-- ==============================================================================
-- MIGRATION: 020_external_skills_catalog_provenance.sql
-- Mô tả: Bổ sung trường lưu trữ nguồn gốc (Provenance) cho các kỹ năng nhập từ External Catalog
-- Bounded Context: Skills Management & External Catalog Integration
-- ==============================================================================

-- 1. Bổ sung các cột định danh nguồn gốc vào bảng skills
ALTER TABLE skills ADD COLUMN source_provider VARCHAR(50);
ALTER TABLE skills ADD COLUMN source_repository_url VARCHAR(500);
ALTER TABLE skills ADD COLUMN source_skill_id VARCHAR(100);
ALTER TABLE skills ADD COLUMN source_path VARCHAR(500);
ALTER TABLE skills ADD COLUMN source_version VARCHAR(100);
ALTER TABLE skills ADD COLUMN source_content_hash VARCHAR(64);
ALTER TABLE skills ADD COLUMN source_license VARCHAR(100);
ALTER TABLE skills ADD COLUMN attribution VARCHAR(500);
ALTER TABLE skills ADD COLUMN imported_at TIMESTAMP;
ALTER TABLE skills ADD COLUMN source_updated_at TIMESTAMP;
ALTER TABLE skills ADD COLUMN source_status VARCHAR(50) DEFAULT 'current';

-- 2. Chỉ mục hỗ trợ tìm kiếm và kiểm tra trùng lặp theo nguồn
CREATE INDEX IF NOT EXISTS idx_skills_source_skill_id 
ON skills(user_id, source_provider, source_skill_id);
