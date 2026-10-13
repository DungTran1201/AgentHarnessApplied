# 05. KIẾN TRÚC HỆ THỐNG & HỢP ĐỒNG API (ARCHITECTURE & API CONTRACT)
## Phân Hệ: Quản Lý System Prompt (System Prompt Management MVP)
### Nền Tảng: AI-Chan Virtual Assistant Platform

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `DOC-SPM-05` |
| **Trạng Thái** | `PROPOSED (Chờ Duyệt Từ Solution Architect)` |
| **Vai Trò Phụ Trách** | Solution Architect & Lead Backend Engineer |
| **Phiên Bản** | `1.0.0-MVP` |
| **Ngày Lập** | `2026-10-11` |

---

## 1. Ranh Giới Thành Phần & Kiến Trúc Module (Component Boundaries)

Kiến trúc phân hệ System Prompt tuân thủ nghiêm ngặt mô hình phân tầng chuẩn của nền tảng AI-Chan:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION LAYER (Next.js 15)               │
│                                                                        │
│   ┌─────────────────────┐   ┌─────────────────────┐   ┌────────────┐   │
│   │  /prompts           │   │  /prompts/new       │   │ /prompts/  │   │
│   │  (List View Page)   │   │  (Create Form Page) │   │ [id]/edit  │   │
│   └──────────┬──────────┘   └──────────┬──────────┘   └─────┬──────┘   │
│              │                         │                    │          │
│              └─────────────────────────┼────────────────────┘          │
│                                        ▼                               │
│                         ┌─────────────────────────────┐                │
│                         │    systemPromptService.ts   │                │
│                         │    (Client-side API Client) │                │
│                         └──────────────┬──────────────┘                │
└────────────────────────────────────────┼───────────────────────────────┘
                                         │ HTTP REST (JSON)
                                         │ Bearer Token / Cookie
┌────────────────────────────────────────┼───────────────────────────────┐
│                           API LAYER (FastAPI Backend)                  │
│                                        ▼                               │
│                         ┌─────────────────────────────┐                │
│                         │    prompts_router           │                │
│                         │    (src/api/v1/prompts.py)  │                │
│                         └──────────────┬──────────────┘                │
│                                        │                               │
│             ┌──────────────────────────┴──────────────────────────┐    │
│             ▼                                                     ▼    │
│   ┌─────────────────────────────┐               ┌──────────────────┐   │
│   │ Security Context            │               │ Pydantic v2      │   │
│   │ • decode_access_token       │               │ Validation Layer │   │
│   │ • get_optional_current_user │               │ • PromptCreate   │   │
│   │ • Anti-IDOR Enforcement     │               │ • PromptUpdate   │   │
│   └──────────────┬──────────────┘               └────────┬─────────┘   │
│                  └───────────────────────┬───────────────┘             │
│                                          ▼                             │
│                         ┌─────────────────────────────┐                │
│                         │     Database Access Layer   │                │
│                         │     (src/db.py: SQLite 3)   │                │
│                         └──────────────┬──────────────┘                │
└────────────────────────────────────────┼───────────────────────────────┘
                                         ▼
                               ┌───────────────────┐
                               │ SQLite: app.db    │
                               │ [system_prompts]  │
                               └───────────────────┘
```

### Phân Định Trách Nhiệm Từng Tầng:
1. **Frontend Presentation Layer (`ai-frontend`):**
   - Quản lý trạng thái giao diện: loading skeletons, empty state, search query filtering, dirty form state.
   - Client-side validation nhanh: kiểm tra độ dài tức thời, bộ đếm ký tự thời gian thực.
   - Safe rendering: render nội dung dưới dạng văn bản thuần túy, tuyệt đối không dùng `dangerouslySetInnerHTML`.
   - Giao tiếp với API qua dịch vụ tập trung `systemPromptService.ts`.
2. **Backend API & Controller Layer (`ai-backend`):**
   - Router con `prompts_router` gắn tại tiền tố `/api/v1/system-prompts`.
   - Xác thực danh tính người dùng và cưỡng chế kiểm tra quyền sở hữu (Anti-IDOR) trên 100% các request.
   - Kiểm tra tính hợp lệ dữ liệu nghiêm ngặt qua Pydantic v2 schemas.
   - Bắt lỗi ngoại lệ, chuẩn hóa phản hồi theo Error Envelope của AI-Chan.
3. **Persistence Layer (SQLite Database):**
   - Thực thi các câu lệnh SQL an toàn qua tham số hóa (`?`).
   - Cưỡng chế ràng buộc khóa ngoại `ON DELETE CASCADE` và tính duy nhất `UNIQUE(user_id, name)`.

---

## 2. Đặc Tả Hợp Đồng API Đề Xuất (RESTful API Contract — PROPOSED)

> [!NOTE]
> Toàn bộ các endpoint dưới đây được thiết kế tuân thủ quy ước chuẩn của AI-Chan, hiện tại ở trạng thái **`PROPOSED (Chưa triển khai vào source code)`**.

Tất cả các endpoint đều có tiền tố chung: `/api/v1/system-prompts`.

---

### 2.1. API Lấy Danh Sách System Prompt

- **Phương thức & Đường dẫn:** `GET /api/v1/system-prompts`
- **Tác vụ:** Lấy danh sách toàn bộ System Prompt thuộc quyền sở hữu của người dùng hiện tại.
- **Xác thực:** Tùy chọn (Hỗ trợ JWT Bearer Token hoặc tài khoản khách `guest_user`).
- **Query Parameters:**
  - `q` *(string, tùy chọn)*: Từ khóa tìm kiếm lọc theo tên hoặc mô tả.
  - `sort` *(string, tùy chọn, mặc định: `updated_desc`)*: Thứ tự sắp xếp (`updated_desc`, `name_asc`, `length_desc`).

#### Response Thành Công: `HTTP 200 OK`
```json
{
  "items": [
    {
      "id": "sp_550e8400e29b41d4a716446655440000",
      "name": "Senior Python Architect",
      "description": "Chỉ dẫn viết code Python chuẩn PEP 8, Type Hinting và Clean Architecture",
      "content_length": 1845,
      "created_at": "2026-10-11T08:00:00Z",
      "updated_at": "2026-10-11T09:30:00Z"
    },
    {
      "id": "sp_7c9e6679b341400a89d38c11e29c2111",
      "name": "Lead Business Analyst",
      "description": "Khuôn mẫu phân tích nghiệp vụ, bóc tách SRS và BPMN flow",
      "content_length": 920,
      "created_at": "2026-10-11T07:15:00Z",
      "updated_at": "2026-10-11T07:15:00Z"
    }
  ],
  "total": 2
}
```

> **Lưu ý kiến trúc:** Để tối ưu băng thông và tốc độ, endpoint danh sách **không trả về trường `content` đầy đủ** mà chỉ trả về `content_length`. Nội dung đầy đủ chỉ được nạp khi gọi API chi tiết.

#### Response Thất Bại:
- `HTTP 500 Internal Server Error`: Lỗi máy chủ CSDL.

---

### 2.2. API Lấy Chi Tiết Một System Prompt

- **Phương thức & Đường dẫn:** `GET /api/v1/system-prompts/{id}`
- **Tác vụ:** Lấy toàn bộ thông tin chi tiết (bao gồm cả chuỗi `content` đầy đủ) của một System Prompt theo ID.
- **Xác thực:** Bắt buộc khớp với chủ sở hữu (`user_id`).
- **Path Parameters:**
  - `id` *(string, bắt buộc)*: ID của System Prompt (VD: `sp_550e8400e29b41d4a716446655440000`).

#### Response Thành Công: `HTTP 200 OK`
```json
{
  "id": "sp_550e8400e29b41d4a716446655440000",
  "user_id": "usr_c3d4e5f6",
  "name": "Senior Python Architect",
  "description": "Chỉ dẫn viết code Python chuẩn PEP 8, Type Hinting và Clean Architecture",
  "content": "Bạn là Senior Python Architect với hơn 10 năm kinh nghiệm.\nHãy tuân thủ các nguyên tắc sau:\n1. Luôn sử dụng Type Hinting.\n2. Docstring theo chuẩn Google style.\n3. Thời gian O(n) và bộ nhớ O(n).",
  "created_at": "2026-10-11T08:00:00Z",
  "updated_at": "2026-10-11T09:30:00Z"
}
```

#### Response Thất Bại:
- `HTTP 404 Not Found`: Khi ID không tồn tại hoặc thuộc người dùng khác (Anti-IDOR).
  ```json
  {
    "detail": {
      "error_code": "PROMPT_NOT_FOUND",
      "message": "System Prompt không tồn tại hoặc bạn không có quyền truy cập."
    }
  }
  ```

---

### 2.3. API Tạo Mới System Prompt

- **Phương thức & Đường dẫn:** `POST /api/v1/system-prompts`
- **Tác vụ:** Tạo mới một bản ghi System Prompt vào thư viện của người dùng.
- **Xác thực:** Bắt buộc (Gán vào `current_user["id"]` hoặc `guest_user`).
- **Headers:** `Content-Type: application/json`.

#### Request Body Schema:
```json
{
  "name": "Senior Python Architect",
  "description": "Chỉ dẫn viết code Python chuẩn PEP 8, Type Hinting và Clean Architecture",
  "content": "Bạn là Senior Python Architect với hơn 10 năm kinh nghiệm...\n1. Luôn sử dụng Type Hinting."
}
```

#### Ràng Buộc Body Validation:
- `name`: string, min 1, max 100 ký tự (sau khi trim). Bắt buộc.
- `description`: string, max 500 ký tự. Tùy chọn (nullable).
- `content`: string, min 1, max 10.000 ký tự. Bắt buộc.

#### Response Thành Công: `HTTP 201 Created`
```json
{
  "id": "sp_a8b7c6d5e4f3a2b10987654321fedcba",
  "user_id": "usr_c3d4e5f6",
  "name": "Senior Python Architect",
  "description": "Chỉ dẫn viết code Python chuẩn PEP 8, Type Hinting và Clean Architecture",
  "content": "Bạn là Senior Python Architect với hơn 10 năm kinh nghiệm...\n1. Luôn sử dụng Type Hinting.",
  "created_at": "2026-10-11T14:20:00Z",
  "updated_at": "2026-10-11T14:20:00Z"
}
```

#### Response Thất Bại:
- `HTTP 409 Conflict`: Tên prompt đã tồn tại trong tài khoản của người dùng.
  ```json
  {
    "detail": {
      "error_code": "PROMPT_NAME_CONFLICT",
      "message": "Bạn đã có một System Prompt mang tên này. Vui lòng chọn tên khác."
    }
  }
  ```
- `HTTP 422 Unprocessable Content`: Vi phạm ràng buộc độ dài hoặc dữ liệu rỗng.
  ```json
  {
    "detail": [
      {
        "loc": ["body", "content"],
        "msg": "Nội dung System Prompt không được vượt quá 10.000 ký tự",
        "type": "string_too_long"
      }
    ]
  }
  ```

---

### 2.4. API Cập Nhật System Prompt

- **Phương thức & Đường dẫn:** `PUT /api/v1/system-prompts/{id}`
- **Tác vụ:** Chỉnh sửa thông tin tên, mô tả hoặc nội dung của System Prompt có sẵn.
- **Xác thực:** Bắt buộc (Kiểm tra quyền sở hữu).
- **Path Parameters:** `id` *(string, bắt buộc)*.

#### Request Body Schema:
```json
{
  "name": "Senior Python Architect (v2)",
  "description": "Bổ sung quy tắc Asyncio và Pydantic v2",
  "content": "Bạn là Senior Python Architect...\n1. Ưu tiên Asyncio và FastAPI."
}
```

#### Response Thành Công: `HTTP 200 OK`
```json
{
  "id": "sp_550e8400e29b41d4a716446655440000",
  "user_id": "usr_c3d4e5f6",
  "name": "Senior Python Architect (v2)",
  "description": "Bổ sung quy tắc Asyncio và Pydantic v2",
  "content": "Bạn là Senior Python Architect...\n1. Ưu tiên Asyncio và FastAPI.",
  "created_at": "2026-10-11T08:00:00Z",
  "updated_at": "2026-10-11T14:35:00Z"
}
```

#### Response Thất Bại:
- `HTTP 404 Not Found`: Không tìm thấy bản ghi hoặc không có quyền truy cập.
- `HTTP 409 Conflict`: Đổi tên trùng với tên bản ghi khác cùng user.
- `HTTP 422 Unprocessable Content`: Dữ liệu gửi lên không thỏa mãn validation.

---

### 2.5. API Xóa Vĩnh Viễn System Prompt

- **Phương thức & Đường dẫn:** `DELETE /api/v1/system-prompts/{id}`
- **Tác vụ:** Xóa vĩnh viễn bản ghi khỏi CSDL SQLite.
- **Xác thực:** Bắt buộc (Kiểm tra quyền sở hữu).
- **Path Parameters:** `id` *(string, bắt buộc)*.

#### Response Thành Công: `HTTP 200 OK`
```json
{
  "success": true,
  "message": "Đã xóa System Prompt thành công.",
  "deleted_id": "sp_550e8400e29b41d4a716446655440000"
}
```

#### Response Thất Bại:
- `HTTP 404 Not Found`: Không tìm thấy bản ghi cần xóa.

---

### 2.6. API Nhân Bản System Prompt (Clone — Proposed / Should Have)

- **Phương thức & Đường dẫn:** `POST /api/v1/system-prompts/{id}/clone`
- **Tác vụ:** Tạo bản sao mới từ một bản ghi có sẵn, tự động sinh tên mới tránh trùng lặp.
- **Xác thực:** Bắt buộc (Kiểm tra quyền sở hữu bản gốc).

#### Response Thành Công: `HTTP 201 Created`
```json
{
  "id": "sp_new_clone_hex_id",
  "user_id": "usr_c3d4e5f6",
  "name": "Senior Python Architect (Copy)",
  "description": "Chỉ dẫn viết code Python chuẩn PEP 8...",
  "content": "Bạn là Senior Python Architect...",
  "created_at": "2026-10-11T14:40:00Z",
  "updated_at": "2026-10-11T14:40:00Z"
}
```

---

## 3. Định Nghĩa Data Schemas (Pydantic v2 & TypeScript Contracts)

### 3.1. Pydantic v2 Schemas (Backend — Python)

```python
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime

class SystemPromptCreateRequest(BaseModel):
    name: str = Field(
        ..., 
        min_length=1, 
        max_length=100, 
        description="Tên gợi nhớ của System Prompt (1-100 ký tự)"
    )
    description: Optional[str] = Field(
        default=None, 
        max_length=500, 
        description="Mô tả tóm tắt mục đích sử dụng (tối đa 500 ký tự)"
    )
    content: str = Field(
        ..., 
        min_length=1, 
        max_length=10000, 
        description="Nội dung văn bản chỉ dẫn hệ thống (1-10.000 ký tự)"
    )

    @field_validator("name")
    @classmethod
    def validate_name_not_blank(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Tên System Prompt không được để trống hoặc chỉ chứa khoảng trắng.")
        return trimmed

    @field_validator("content")
    @classmethod
    def validate_content_not_blank(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Nội dung System Prompt không được để trống hoặc chỉ chứa khoảng trắng.")
        return v  # Giữ nguyên khoảng trắng và thụt lề ban đầu của nội dung

class SystemPromptUpdateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    content: str = Field(..., min_length=1, max_length=10000)

    @field_validator("name")
    @classmethod
    def validate_name_not_blank(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Tên System Prompt không được để trống.")
        return trimmed

    @field_validator("content")
    @classmethod
    def validate_content_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Nội dung System Prompt không được để trống.")
        return v

class SystemPromptSummaryResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    content_length: int
    created_at: str
    updated_at: str

class SystemPromptListResponse(BaseModel):
    items: List[SystemPromptSummaryResponse]
    total: int

class SystemPromptDetailResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str]
    content: str
    created_at: str
    updated_at: str
```

### 3.2. TypeScript Interfaces (Frontend)

```typescript
export interface SystemPromptSummary {
  id: string;
  name: string;
  description: string | null;
  content_length: number;
  created_at: string;
  updated_at: string;
}

export interface SystemPromptListResponse {
  items: SystemPromptSummary[];
  total: number;
}

export interface SystemPromptDetail {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface SystemPromptCreatePayload {
  name: string;
  description?: string | null;
  content: string;
}

export interface SystemPromptUpdatePayload {
  name: string;
  description?: string | null;
  content: string;
}
```
