# PHẦN 04: MÔ HÌNH MIỀN & TỪ ĐIỂN DỮ LIỆU (DOMAIN MODEL & DATA DICTIONARY)
## Phân Hệ: Quản Lý Quy Tắc (Rules Management — Rules Library & Rule Editor)
### Dự Án: Nền Tảng Trợ Lý Ảo AI-Chan (AI-Chan Assistant Platform)

---

| Thông Tin Quản Trị | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `RUL-DOC-04` |
| **Nhánh Tính Năng** | **Rules Management (Rules Library & Rule Detail / Editor)** |
| **Trạng Thái Quản Trị** | **`PROPOSED (Chờ Duyệt Từ Architecture Board & Product Owner)`** |
| **Phiên Bản** | `1.0.0-PROPOSAL` |
| **Ngày Ban Hành** | `2026-10-18` |
| **Tác Giả / Vai Trò** | Senior Solution Architect & Database Administrator |

---

## 1. Thiết Kế Hướng Miền (Domain-Driven Design — DDD)

Phân hệ Quản Lý Quy Tắc thuộc **Core Cognitive Assets Bounded Context** của hệ thống AI-Chan, đảm nhiệm việc lưu trữ và cung cấp các tiêu chuẩn hành vi cho Agent.

### 1.1. Thực Thể & Cụm Thực Thể (Aggregates & Entities)
1. **Aggregate Root: `Rule`**:
   - Đại diện cho một quy tắc hoặc chỉ dẫn hành vi hoàn chỉnh.
   - Quản lý định danh duy nhất (`id`), quyền sở hữu (`user_id`), phạm vi lưu trữ (`scope`), chế độ kích hoạt (`activation_mode`), mức độ ưu tiên (`priority`), số phiên bản (`version`), và trạng thái vòng đời (`status`).
2. **Associative Entity: `ProjectRuleBinding` (`project_rules`)**:
   - Thể hiện mối quan hệ nhiều - nhiều (Many-to-Many) giữa một `Project` và một `Rule`.
   - Lưu trữ các thuộc tính riêng của ngữ cảnh liên kết: `is_enabled`, `custom_priority_override`, thời điểm gán `bound_at`.
3. **Value Objects**:
   - `RuleScope`: `system` (Toàn hệ thống, chỉ đọc), `user` (Cá nhân người dùng), `project` (Gán riêng cho dự án).
   - `ActivationMode`: `always_on` (Luôn nạp), `model_decision` (LLM tự quyết định), `glob` (So khớp đường dẫn file), `manual` (Bật tắt thủ công).
   - `RuleStatus`: `active` (Hoạt động), `inactive` (Tạm ngưng), `archived` (Đã lưu trữ / Xóa mềm).

### 1.2. Các Bất Biến Miền (Domain Invariants)
- **`INV-RUL-01`**: Trong cùng một `user_id`, không bao giờ tồn tại hai thực thể `Rule` có cùng giá trị `lower(name)` trong trạng thái chưa xóa (`deleted_at IS NULL`).
- **`INV-RUL-02`**: Thực thể `Rule` có `scope = 'system'` bắt buộc phải có `user_id IS NULL` hoặc gán vào tài khoản Quản trị hệ thống (`admin_user_id`). Người dùng thông thường không bao giờ có thể trở thành chủ sở hữu của một System Rule.
- **`INV-RUL-03`**: Nếu `activation_mode = 'glob'`, mảng giá trị `glob_patterns` không được rỗng và mọi mẫu pattern phải là chuỗi glob hợp lệ (không chứa ký tự điều khiển nguy hiểm).
- **`INV-RUL-04`**: Khi một `Rule` chuyển sang trạng thái xóa mềm (`deleted_at IS NOT NULL`), tất cả các `ProjectRuleBinding` liên quan phải chuyển trạng thái `is_enabled = false` ngay lập tức để không ảnh hưởng đến các phiên chat mới.

---

## 2. Từ Điển Dữ Liệu Chi Tiết (Data Dictionary)

### 2.1. Bảng Dữ Liệu Chính: `rules` (Quản Lý Thư Viện Quy Tắc)

| Tên Cột | Kiểu Dữ Liệu PostgreSQL | Bắt Buộc | Ràng Buộc & Mặc Định | Quy Tắc Kiểm Tra (Validation) | Mức Độ Nhạy Cảm | Nguồn Sự Thật | Ý Nghĩa Nghiệp Vụ |
| :--- | :--- | :---: | :--- | :--- | :---: | :---: | :--- |
| `id` | `VARCHAR(36)` | Có | Khóa chính (`PRIMARY KEY`) | Chuỗi UUID v4 chuẩn | Không | CSDL | Mã định danh duy nhất toàn cầu của Rule |
| `user_id` | `VARCHAR(36)` | Không | Khóa ngoại `users(id)` `ON DELETE CASCADE` | Cho phép `NULL` nếu là System Rule | Nội bộ | CSDL | Mã người dùng sở hữu Rule |
| `name` | `VARCHAR(100)` | Có | Not Null | Độ dài 1-100 ký tự, không rỗng | Không | Người dùng | Tên hiển thị ngắn gọn của Rule |
| `description` | `VARCHAR(500)` | Không | Default `NULL` | Tối đa 500 ký tự | Không | Người dùng | Mô tả tóm tắt mục đích/tiêu chí áp dụng |
| `content` | `TEXT` | Có | Not Null | Độ dài 1 - 10.000 ký tự (Unicode) | Trung bình | Người dùng | Toàn văn nội dung quy tắc định dạng Markdown |
| `scope` | `VARCHAR(20)` | Có | Default `'user'` | Chỉ nhận: `'system'`, `'user'`, `'project'` | Không | Hệ thống | Phạm vi lưu trữ và quyền quản trị |
| `activation_mode` | `VARCHAR(20)` | Có | Default `'always_on'` | Chỉ nhận: `'always_on'`, `'model_decision'`, `'glob'`, `'manual'` | Không | Người dùng | Chế độ và điều kiện kích hoạt lúc chạy |
| `glob_patterns` | `JSONB` | Không | Default `'[]'::jsonb` | Mảng các chuỗi mẫu đường dẫn file (Glob) | Không | Người dùng | Danh sách các glob pattern khi mode = 'glob' |
| `tags` | `JSONB` | Không | Default `'[]'::jsonb` | Mảng chuỗi tag (tối đa 10 tags, mỗi tag <= 30 ký tự) | Không | Người dùng | Các nhãn phân loại phục vụ tìm kiếm/lọc |
| `priority` | `INTEGER` | Có | Default `50` | Giá trị nguyên từ `0` đến `100` | Không | Người dùng | Trọng số ưu tiên (số càng lớn ưu tiên càng cao) |
| `status` | `VARCHAR(20)` | Có | Default `'active'` | Chỉ nhận: `'active'`, `'inactive'`, `'archived'` | Không | Người dùng | Trạng thái hoạt động của Rule |
| `version` | `INTEGER` | Có | Default `1` | Số nguyên dương tăng dần | Không | Hệ thống | Số phiên bản phục vụ Optimistic Concurrency |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | Có | Default `NOW()` | Chuẩn thời gian UTC | Không | Hệ thống | Thời điểm tạo bản ghi ban đầu |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | Có | Default `NOW()` | Chuẩn thời gian UTC | Không | Hệ thống | Thời điểm cập nhật dữ liệu gần nhất |
| `deleted_at` | `TIMESTAMP WITH TIME ZONE` | Không | Default `NULL` | Chuẩn thời gian UTC khi xóa mềm | Không | Hệ thống | Thời điểm xóa mềm; `NULL` nếu đang hoạt động |

---

### 2.2. Bảng Liên Kết Dự Án: `project_rules` (Quan Hệ Project - Rule)

| Tên Cột | Kiểu Dữ Liệu PostgreSQL | Bắt Buộc | Ràng Buộc & Mặc Định | Quy Tắc Kiểm Tra (Validation) | Mức Độ Nhạy Cảm | Nguồn Sự Thật | Ý Nghĩa Nghiệp Vụ |
| :--- | :--- | :---: | :--- | :--- | :---: | :---: | :--- |
| `id` | `VARCHAR(36)` | Có | Khóa chính (`PRIMARY KEY`) | Chuỗi UUID v4 chuẩn | Không | CSDL | Mã định danh bản ghi liên kết |
| `project_id` | `VARCHAR(36)` | Có | Khóa ngoại `projects(id)` `ON DELETE CASCADE` | UUID hợp lệ của Project | Nội bộ | CSDL | Dự án nhận quy tắc |
| `rule_id` | `VARCHAR(36)` | Có | Khóa ngoại `rules(id)` `ON DELETE CASCADE` | UUID hợp lệ của Rule | Nội bộ | CSDL | Quy tắc được liên kết vào dự án |
| `is_enabled` | `BOOLEAN` | Có | Default `true` | Chỉ nhận `true` hoặc `false` | Không | Người dùng | Bật hoặc tắt rule riêng trong dự án này |
| `custom_priority`| `INTEGER` | Không | Default `NULL` | Số nguyên từ 0 đến 100 | Không | Người dùng | Ghi đè mức ưu tiên riêng cho dự án nếu cần |
| `bound_at` | `TIMESTAMP WITH TIME ZONE` | Có | Default `NOW()` | Chuẩn thời gian UTC | Không | Hệ thống | Thời điểm gắn Rule vào Project |

---

## 3. Chiến Lược Đánh Chỉ Mục (Indexing Strategy)

Để đảm bảo hiệu năng truy vấn của hệ thống đạt tiêu chuẩn `RUL-NFR-001` (< 150ms P95 với 100.000 bản ghi), các chỉ mục chuyên sâu được thiết lập như sau:

1. **Chỉ mục Duy Nhất Tên Theo Người Dùng (Unique Partial Index)**:
   ```sql
   CREATE UNIQUE INDEX idx_rules_user_lower_name 
   ON rules (user_id, LOWER(name)) 
   WHERE deleted_at IS NULL AND user_id IS NOT NULL;
   ```
   *Ý nghĩa*: Đảm bảo không trùng tên Rule trong tài khoản một người dùng, nhưng cho phép trùng nếu bản ghi cũ đã bị xóa mềm.

2. **Chỉ mục Duy Nhất Cho Rule Hệ Thống (System Unique Partial Index)**:
   ```sql
   CREATE UNIQUE INDEX idx_rules_system_lower_name 
   ON rules (LOWER(name)) 
   WHERE deleted_at IS NULL AND scope = 'system';
   ```
   *Ý nghĩa*: Đảm bảo các System Rule toàn cục có tên phân biệt tuyệt đối.

3. **Chỉ mục Truy Vấn Danh Sách Người Dùng (Composite Index for User List)**:
   ```sql
   CREATE INDEX idx_rules_user_scope_status 
   ON rules (user_id, scope, status) 
   WHERE deleted_at IS NULL;
   ```
   *Ý nghĩa*: Tăng tốc tối đa truy vấn nạp thư viện `WHERE (user_id = :uid OR scope = 'system') AND deleted_at IS NULL`.

4. **Chỉ mục Hỗ Trợ Tìm Kiếm Theo Tags (GIN Index on JSONB)**:
   ```sql
   CREATE INDEX idx_rules_tags_gin 
   ON rules USING GIN (tags);
   ```
   *Ý nghĩa*: Cho phép tìm kiếm cực nhanh các Rule chứa một tập hợp tag bất kỳ qua toán tử `@>`.

5. **Chỉ mục Khóa Duy Nhất Liên Kết Dự Án (Unique Project-Rule Pair)**:
   ```sql
   CREATE UNIQUE INDEX idx_project_rules_pair 
   ON project_rules (project_id, rule_id);
   ```
   *Ý nghĩa*: Chống việc gắn trùng một Rule hai lần vào cùng một Project.

---

## 4. Bản Đặc Tả DDL Migration Đề Xuất (`017_rules_management_system.sql`)

Dưới đây là nội dung chi tiết của bản script DDL hoàn chỉnh, sẵn sàng thực thi cho giai đoạn cài đặt database:

```sql
-- Migration: 017_rules_management_system.sql
-- Description: Schema for Rules Management System (Rules Library, Activation Metadata & Project Association)
-- Author: AI-Chan Engineering Team
-- Date: 2026-10-18

BEGIN;

-- 1. Create table: rules
CREATE TABLE IF NOT EXISTS rules (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    content TEXT NOT NULL,
    scope VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (scope IN ('system', 'user', 'project')),
    activation_mode VARCHAR(20) NOT NULL DEFAULT 'always_on' CHECK (activation_mode IN ('always_on', 'model_decision', 'glob', 'manual')),
    glob_patterns JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    priority INTEGER NOT NULL DEFAULT 50 CHECK (priority >= 0 AND priority <= 100),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- 2. Create table: project_rules (Many-to-Many Association)
CREATE TABLE IF NOT EXISTS project_rules (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    rule_id VARCHAR(36) NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    custom_priority INTEGER DEFAULT NULL CHECK (custom_priority IS NULL OR (custom_priority >= 0 AND custom_priority <= 100)),
    bound_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Indexes
-- Unique name for user-scoped rules (active only)
CREATE UNIQUE INDEX IF NOT EXISTS idx_rules_user_lower_name 
ON rules (user_id, LOWER(name)) 
WHERE deleted_at IS NULL AND user_id IS NOT NULL;

-- Unique name for system-scoped rules (active only)
CREATE UNIQUE INDEX IF NOT EXISTS idx_rules_system_lower_name 
ON rules (LOWER(name)) 
WHERE deleted_at IS NULL AND scope = 'system';

-- Fast user query filter index
CREATE INDEX IF NOT EXISTS idx_rules_user_scope_status 
ON rules (user_id, scope, status) 
WHERE deleted_at IS NULL;

-- Fast tags search index
CREATE INDEX IF NOT EXISTS idx_rules_tags_gin 
ON rules USING GIN (tags);

-- Unique pair index for project-rule binding
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_rules_pair 
ON project_rules (project_id, rule_id);

-- Project rules lookup index
CREATE INDEX IF NOT EXISTS idx_project_rules_lookup 
ON project_rules (project_id, is_enabled);

-- 4. Seed initial Standard System Rules (Global Read-Only Directives)
INSERT INTO rules (id, user_id, name, description, content, scope, activation_mode, glob_patterns, tags, priority, status, version)
VALUES 
(
    'sys-rule-001-clean-code',
    NULL,
    'Tiêu Chuẩn Mã Nguồn Sạch (Clean Code Standards)',
    'Ràng buộc viết mã nguồn tường minh, ngắn gọn, không viết code thừa (Ponytail Mode) và có xử lý lỗi tại biên giới tin cậy.',
    E'# Nguyên Tắc Viết Code Tiêu Chuẩn\n\n1. **YAGNI (You Aren\'t Gonna Need It)**: Không thêm abstraction hoặc lớp trung gian nếu không được yêu cầu rõ ràng.\n2. **Tái sử dụng trước khi viết mới**: Tìm kiếm các helper và thư viện sẵn có trong repository trước khi triển khai lại.\n3. **Xử lý lỗi tại biên giới**: Mọi dữ liệu đầu vào từ người dùng hoặc API bên ngoài phải được kiểm tra (Validation) chặt chẽ.\n4. **Ngắn gọn và chính xác**: Ưu tiên code rõ nghĩa, ít dòng hơn nhưng phải xử lý triệt để nguyên nhân gốc của lỗi (Root Cause).',
    'system',
    'always_on',
    '[]'::jsonb,
    '["coding", "clean-code", "standards"]'::jsonb,
    80,
    'active',
    1
),
(
    'sys-rule-002-security-first',
    NULL,
    'Quy Ước An Ninh Ứng Dụng (Application Security Directives)',
    'Ràng buộc phòng chống rò rỉ secret, chống SQL Injection, Stored XSS, và cưỡng chế kiểm tra quyền truy cập (Anti-IDOR).',
    E'# Quy Chuẩn An Ninh Bắt Buộc\n\n1. **Tuyệt đối không lưu trữ bí mật (Secrets)**: Không ghi cứng API key, Token, mật khẩu vào mã nguồn, log hoặc tài liệu mẫu.\n2. **Kiểm soát quyền truy cập 100%**: Mọi thao tác đọc/ghi dữ liệu của người dùng phải được kiểm tra `user_id` khớp với Token đã xác thực (Anti-IDOR).\n3. **Khử khuẩn nội dung (Sanitization)**: Dữ liệu văn bản người dùng nhập vào phải được làm sạch trước khi render ra HTML để ngăn chặn XSS.\n4. **Không log dữ liệu nhạy cảm**: Không ghi nội dung prompt hoặc quy tắc chứa thông tin cá nhân vào hệ thống ghi log.',
    'system',
    'always_on',
    '[]'::jsonb,
    '["security", "owasp", "anti-idor"]'::jsonb,
    90,
    'active',
    1
),
(
    'sys-rule-003-typescript-guidelines',
    NULL,
    'Hướng Dẫn Cú Pháp TypeScript (Frontend Strict Mode)',
    'Tiêu chuẩn viết mã giao diện TypeScript với kiểm tra kiểu dữ liệu nghiêm ngặt, cấm sử dụng kiểu any.',
    E'# Quy Chuẩn TypeScript Frontend\n\n1. **Không sử dụng kiểu `any`**: Luôn định nghĩa Interface hoặc Type rõ ràng cho props, state và API payload.\n2. **Sử dụng Type Guards**: Kiểm tra kiểu dữ liệu an toàn trước khi truy cập thuộc tính của các đối tượng không xác định.\n3. **Bất biến trong State Management**: Không mutate trực tiếp state React; luôn sử dụng hàm cập nhật trạng thái an toàn.',
    'system',
    'glob',
    '["src/**/*.ts", "src/**/*.tsx"]'::jsonb,
    '["frontend", "typescript", "react"]'::jsonb,
    60,
    'active',
    1
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
```
