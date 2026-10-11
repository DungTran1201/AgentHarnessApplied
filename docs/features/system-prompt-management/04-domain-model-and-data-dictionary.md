# 04. MÔ HÌNH MIỀN & TỪ ĐIỂN DỮ LIỆU (DOMAIN MODEL & DATA DICTIONARY)
## Phân Hệ: Quản Lý System Prompt (System Prompt Management MVP)
### Nền Tảng: AI-Chan Virtual Assistant Platform

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `DOC-SPM-04` |
| **Trạng Thái** | `PROPOSED (Chờ Duyệt Từ Solution Architect)` |
| **Vai Trò Phụ Trách** | Solution Architect & Database Architect |
| **Phiên Bản** | `1.0.0-MVP` |
| **Ngày Lập** | `2026-10-11` |

---

## 1. Mô Hình Miền (Domain Model Overview)

Trong kiến trúc Domain-Driven Design (DDD) của AI-Chan, phân hệ System Prompt được định vị trong **Prompt Management Context**.

### 1.1. Thực Thể Cốt Lõi (Core Entity): `SystemPrompt`
- **Loại thực thể:** Aggregate Root.
- **Vai trò:** Đại diện cho một mẫu chỉ dẫn hệ thống độc lập, có cấu trúc do người dùng tạo lập và sở hữu.
- **Ranh giới:** Không gắn cứng với bất kỳ mô hình AI (Model) hay đồ thị (Project Graph) nào trong phạm vi MVP; tồn tại như một tài nguyên cấu hình trung lập.

```
┌────────────────────────────────────────────────────────┐
│                      User Aggregate                    │
│  - id: UUID (PK)                                       │
│  - email: String                                       │
│  - username: String                                    │
└───────────────────────────┬────────────────────────────┘
                            │ 1
                            │
                            │ sở hữu (owns)
                            │
                            │ 0..*
┌───────────────────────────▼────────────────────────────┐
│                  SystemPrompt Aggregate                │
│  - id: String (PK, sp_...)                             │
│  - user_id: UUID / String (FK -> User.id)              │
│  - name: String (1..100)                               │
│  - description: String (0..500, Nullable)              │
│  - content: Text (1..10.000)                           │
│  - created_at: Timestamp                               │
│  - updated_at: Timestamp                               │
└────────────────────────────────────────────────────────┘
```

### 1.2. Mối Quan Hệ (Relationships)
1. **User (1) — SystemPrompt (0..*):**
   - Một người dùng có thể sở hữu 0 hoặc nhiều System Prompt.
   - Mỗi System Prompt bắt buộc thuộc về duy nhất 1 Người dùng (`user_id`).
   - Ràng buộc toàn vẹn: Khi User bị xóa khỏi hệ thống, toàn bộ System Prompt thuộc sở hữu của User đó sẽ bị xóa theo dạng xếp tầng (`ON DELETE CASCADE`).
2. **SystemPrompt — Project / Graph (Hiện tại: KHÔNG CÓ LIÊN KẾT):**
   - Trong MVP, không tồn tại khóa ngoại giữa bảng `projects` và `system_prompts`.
   - Ranh giới hoàn toàn độc lập nhằm giữ cho thiết kế tối giản, loại bỏ rủi ro vỡ cấu trúc đồ thị hiện hữu.

---

## 2. Từ Điển Dữ Liệu Chi Tiết (Data Dictionary)

Bảng dưới đây định nghĩa cấu trúc bảng CSDL `system_prompts` trong SQLite:

| Tên Cột (Column Name) | Kiểu Dữ Liệu (Data Type) | Bắt Buộc (Nullability) | Ràng Buộc & Mặc Định (Constraints & Default) | Quy Tắc Kiểm Tra (Validation Rules) | Mức Độ Nhạy Cảm (Sensitivity) | Nguồn Sự Thật (Source of Truth) | Ý Nghĩa Nghiệp Vụ (Description) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | **NOT NULL** | Khóa chính (`PRIMARY KEY`) | Tiền tố `sp_` kết hợp chuỗi hex 32 ký tự ngẫu nhiên: `^sp_[a-f0-9]{32}$`. | Thấp (Public Identifier) | Backend Generated | Định danh duy nhất toàn cục của bản ghi System Prompt. |
| `user_id` | `VARCHAR(36)` | **NOT NULL** | Khóa ngoại (`FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE`) | Phải là ID người dùng hợp lệ trong bảng `users` hoặc giá trị `guest_user`. | Trung bình (User ID) | Identity Context (JWT / Auth) | Xác định chủ sở hữu bản ghi phục vụ phân quyền và Anti-IDOR. |
| `name` | `VARCHAR(100)` | **NOT NULL** | Ràng buộc duy nhất theo user: `UNIQUE(user_id, name)` | Cắt tỉa khoảng trắng (`TRIM`), độ dài: 1 đến 100 ký tự. Không được chứa chỉ toàn khoảng trắng. | Thấp (Metadata) | User Input | Tên gợi nhớ của System Prompt do người dùng tự đặt. |
| `description` | `VARCHAR(500)` | *NULLABLE* | `DEFAULT NULL` | Tối đa 500 ký tự nếu có. Được phép bỏ trống hoặc `NULL`. | Thấp (Metadata) | User Input | Mô tả ngắn gọn về ngữ cảnh hoặc mục đích sử dụng prompt. |
| `content` | `TEXT` | **NOT NULL** | Không rỗng | Độ dài: 1 đến 10.000 ký tự sau khi trim. Hỗ trợ đầy đủ Unicode, UTF-8 đa dòng. | **Cao (Confidential)** | User Input | Toàn bộ nội dung văn bản chỉ dẫn hệ thống nạp vào mô hình AI. |
| `created_at` | `TIMESTAMP` | **NOT NULL** | `DEFAULT CURRENT_TIMESTAMP` | Thời điểm UTC theo chuẩn ISO-8601. Không được sửa đổi sau khi tạo. | Thấp (Audit) | Database Engine | Dấu vết thời gian tạo bản ghi lần đầu tiên. |
| `updated_at` | `TIMESTAMP` | **NOT NULL** | `DEFAULT CURRENT_TIMESTAMP` | Tự động cập nhật qua Database Trigger khi có bất kỳ thay đổi nào trên bản ghi. | Thấp (Audit) | Database Engine / Trigger | Dấu vết thời gian cập nhật bản ghi gần nhất. |

---

## 3. Các Chính Sách Dữ Liệu & Ràng Buộc Bất Biến (Invariants & Policies)

### 3.1. Chính Sách Tính Duy Nhất Của Tên (Uniqueness Policy)
- **Đặc tả ràng buộc:** `UNIQUE(user_id, name)` tại tầng CSDL.
- **Hành vi xử lý:**
  - So sánh không phân biệt chữ hoa hay chữ thường bằng việc áp dụng collation `NOCASE` hoặc xử lý chuẩn hóa chuỗi `LOWER(TRIM(name))` trước khi lưu.
  - Ngăn chặn triệt để tình huống người dùng vô tình tạo 2 prompt có tên giống hệt nhau gây nhầm lẫn khi lựa chọn.
  - Cho phép hai người dùng khác nhau (`user_A` và `user_B`) đều có thể sở hữu prompt cùng mang tên `"Python Expert"`.

### 3.2. Chính Sách Độ Dài & Ngăn Chặn DoS Bộ Nhớ (Size Constraints)
- **Giới hạn 10.000 ký tự:**
  - Một ký tự UTF-8 thông thường chiếm từ 1 đến 3 bytes. Dung lượng một bản ghi prompt tối đa chỉ khoảng 10KB - 30KB.
  - Ngăn chặn các cuộc tấn công DoS payload lớn làm tràn bộ nhớ SQLite hoặc chiếm dụng băng thông khi client fetch danh sách.
  - Tại API danh sách `GET /api/v1/system-prompts`, backend **chỉ trả về độ dài ký tự** (`LENGTH(content) AS content_length`) thay vì trả về toàn bộ chuỗi `content`, giúp payload danh sách cực kỳ gọn nhẹ (~1KB cho 20 items). Toàn bộ nội dung `content` chỉ được tải khi người dùng vào màn hình chi tiết hoặc chỉnh sửa.

### 3.3. Chính Sách Bảo Toàn Định Dạng Văn Bản (Unicode & Whitespace Preservation)
- CSDL SQLite sử dụng chuẩn mã hóa **UTF-8**.
- Không áp dụng bất kỳ hàm làm sạch nào làm mất khoảng trắng xuống dòng (`\n`, `\r\n`), khoảng thụt đầu dòng (Indentation/Tabs), code block (```), thẻ XML (`<instruction>`) hoặc emoji (✨, 🤖).
- API serialize/deserialize JSON sử dụng `ensure_ascii=False` để bảo toàn nguyên vẹn tiếng Việt có dấu.

### 3.4. Chính Sách Xóa & Toàn Vẹn Khóa Ngoại (Foreign Key & Lifecycle)
- **Hard Delete:** Khi xóa một bản ghi, hệ thống thực thi `DELETE FROM system_prompts WHERE id = ?`.
- **User Cascade:** Khi một người dùng xóa tài khoản, ràng buộc `ON DELETE CASCADE` tự động dọn dẹp toàn bộ System Prompt liên quan, không để lại dữ liệu mồ côi (Orphan records) trong hệ thống.

---

## 4. Đặc Tả Schema CSDL Đề Xuất (DDL Migration Proposal)

Dưới đây là nội dung migration script đề xuất cho tương lai (`ai-backend/database/migrations/009_system_prompt_management.sql`):

```sql
-- ==============================================================================
-- MIGRATION 009: SYSTEM PROMPT MANAGEMENT (MVP)
-- Target DBMS: SQLite 3 / ANSI SQL Compatible
-- Bounded Context: Prompt Management Context
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- 1. TẠO BẢNG QUẢN LÝ SYSTEM PROMPT
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

-- 2. CHỈ MỤC TỐI ƯU HÓA TRUY VẤN
-- Chỉ mục phục vụ tải danh sách prompt theo chủ sở hữu và sắp xếp thời gian cập nhật mới nhất (Anti-IDOR + Sort)
CREATE INDEX IF NOT EXISTS idx_system_prompts_user_updated 
ON system_prompts(user_id, updated_at DESC);

-- Chỉ mục phục vụ kiểm tra trùng tên nhanh theo người dùng
CREATE INDEX IF NOT EXISTS idx_system_prompts_user_name 
ON system_prompts(user_id, name);

-- 3. TRIGGER TỰ ĐỘNG CẬP NHẬT UPDATED_AT KHI SỬA ĐỔI
CREATE TRIGGER IF NOT EXISTS trg_system_prompts_updated_at
AFTER UPDATE ON system_prompts
FOR EACH ROW
BEGIN
    UPDATE system_prompts SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;
```

---

## 5. Dữ Liệu Khởi Tạo Mẫu Đề Xuất (Seed Data Proposal)

Khi khởi tạo hệ thống hoặc tạo tài khoản mới, hệ thống có thể tùy chọn gieo sẵn một số mẫu System Prompt kinh điển vào tài khoản khách hoặc tài khoản mẫu:

```sql
-- Dữ liệu mẫu khởi tạo cho tài khoản khách 'guest_user'
INSERT OR IGNORE INTO system_prompts (id, user_id, name, description, content)
VALUES
(
    'sp_seed_python_expert',
    'guest_user',
    'Chuyên Gia Python & Kiến Trúc Phần Mềm',
    'Hỗ trợ viết mã nguồn Python tối ưu, tuân thủ PEP 8, Type Hinting và Clean Architecture',
    'Bạn là chuyên gia Senior Python Architect với hơn 10 năm kinh nghiệm. Khi viết code, hãy luôn tuân thủ các nguyên tắc sau:
1. Luôn sử dụng Type Hinting đầy đủ cho tham số và kiểu trả về.
2. Viết docstring theo chuẩn Google hoặc Sphinx.
3. Ưu tiên giải pháp tối ưu thời gian O(n) và không gian O(n).
4. Đưa ra giải thích súc tích, tập trung vào bản chất kỹ thuật.'
),
(
    'sp_seed_business_analyst',
    'guest_user',
    'Senior Business Analyst (IT)',
    'Hỗ trợ khảo sát, bóc tách yêu cầu, viết User Stories và phân tích nghiệp vụ',
    'Bạn là Senior Business Analyst chuyên nghiệp. Khi tiếp nhận yêu cầu từ người dùng:
1. Phân loại rõ: FACT, ASSUMPTION, DECISION, OPEN QUESTION.
2. Xác định Actor, Preconditions, Postconditions và Acceptance Criteria kiểm thử được.
3. Không tự tiện suy diễn yêu cầu nếu chưa có bằng chứng xác thực.'
);
```
