# PHẦN 05: KIẾN TRÚC HỆ THỐNG & HỢP ĐỒNG API (ARCHITECTURE & API CONTRACT)
## Phân Hệ: Quản Lý Quy Tắc (Rules Management — Rules Library & Rule Editor)
### Dự Án: Nền Tảng Trợ Lý Ảo AI-Chan (AI-Chan Assistant Platform)

---

| Thông Tin Quản Trị | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `RUL-DOC-05` |
| **Nhánh Tính Năng** | **Rules Management (Rules Library & Rule Editor)** |
| **Trạng Thái Quản Trị** | **`PROPOSED (Chờ Duyệt Từ Architecture Board & Product Owner)`** |
| **Phiên Bản** | `1.0.0-PROPOSAL` |
| **Ngày Ban Hành** | `2026-10-18` |
| **Tác Giả / Vai Trò** | Senior Solution Architect & Backend Lead |

---

## 1. Ranh Giới Kiến Trúc Hệ Thống (Architectural Boundaries)

Phân hệ Quản Lý Quy Tắc tuân thủ nghiêm ngặt mô hình kiến trúc phân tầng (Clean Layered Architecture) chuẩn của AI-Chan:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TẦNG TRÌNH DIỄN (FRONTEND)                     │
│  React 18 + Vite + TailwindCSS + Zustand + React Query + Lucide Icons  │
│  - Routes: /rules (Thư viện), /rules/new (Tạo mới), /rules/:id (Sửa)   │
│  - Components: RulesTable, RuleCard, RuleEditor, MarkdownPreview       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS (JSON / RESTful API)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        TẦNG ĐIỀU PHỐI (API ROUTERS)                    │
│  FastAPI Router: ai-backend/app/routers/rules.py [PROPOSED]           │
│  - Xác thực JWT Token (Depends(get_current_active_user))              │
│  - Chuyển đổi và kiểm định dữ liệu Pydantic v2 schemas                 │
│  - Xử lý mã lỗi HTTP chuẩn (400, 401, 403, 404, 409, 422, 500)         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        TẦNG NGHIỆP VỤ (SERVICE LAYER)                 │
│  RuleService: ai-backend/app/services/rule_service.py [PROPOSED]       │
│  - Cưỡng chế Business Rules: RUL-BR-001 -> RUL-BR-015                  │
│  - Kiểm soát quyền sở hữu Anti-IDOR (rule.user_id == current_user.id)  │
│  - Xử lý xung đột ghi đè (Optimistic Concurrency Control)              │
│  - Kiểm tra liên kết dự án trước khi xóa mềm (Delete-in-use guard)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        TẦNG LƯU TRỮ (PERSISTENCE LAYER)                │
│  SQLModel / SQLAlchemy ORM: Rule, ProjectRuleBinding models [PROPOSED] │
│  PostgreSQL Database: Bảng rules, project_rules (Migration 017)        │
└────────────────────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **Tuyên bố trạng thái mã nguồn**: Toàn bộ các endpoints, models và services được mô tả trong tài liệu này hiện **CHƯA ĐƯỢC LẬP TRÌNH** trong repository AI-Chan và được đánh dấu rõ ràng là **`PROPOSED`**. Tài liệu này đóng vai trò là bản thiết kế hợp đồng (Design Contract) chính thức để đội ngũ kỹ sư triển khai chuẩn xác khi được phê duyệt.

---

## 2. Danh Mục Các Endpoint Đề Xuất (Proposed REST API Endpoints)

| Mã Endpoint | Phương Thức HTTP | Đường Dẫn URL | Chức Năng Nghiệp Vụ | Quyền Truy Cập | Trạng Thái |
| :---: | :---: | :--- | :--- | :--- | :---: |
| **RUL-API-01** | `GET` | `/api/v1/rules` | Lấy danh sách Rules có phân trang, tìm kiếm và lọc | Authenticated User | `PROPOSED` |
| **RUL-API-02** | `POST` | `/api/v1/rules` | Tạo mới một Rule vào thư viện cá nhân | Authenticated User | `PROPOSED` |
| **RUL-API-03** | `GET` | `/api/v1/rules/{id}` | Lấy thông tin chi tiết một Rule theo ID | Authenticated User (Owner/System) | `PROPOSED` |
| **RUL-API-04** | `PUT` | `/api/v1/rules/{id}` | Cập nhật nội dung và metadata của Rule | Authenticated User (Owner only) | `PROPOSED` |
| **RUL-API-05** | `PATCH`| `/api/v1/rules/{id}/status` | Bật hoặc tắt trạng thái `active`/`inactive` | Authenticated User (Owner only) | `PROPOSED` |
| **RUL-API-06** | `POST` | `/api/v1/rules/{id}/clone` | Nhân bản một Rule thành bản sao cá nhân mới | Authenticated User | `PROPOSED` |
| **RUL-API-07** | `DELETE`| `/api/v1/rules/{id}` | Xóa mềm Rule (kèm tham số `force=true` nếu có dự án dùng) | Authenticated User (Owner only) | `PROPOSED` |
| **RUL-API-08** | `GET` | `/api/v1/rules/{id}/projects`| Lấy danh sách các Project đang liên kết với Rule | Authenticated User | `PROPOSED` |
| **RUL-API-09** | `GET` | `/api/v1/projects/{project_id}/rules` | Lấy danh sách Rules được gán cho một Project cụ thể | Project Owner / Collaborator | `PROPOSED` |
| **RUL-API-10** | `PUT` | `/api/v1/projects/{project_id}/rules` | Đồng bộ danh sách liên kết Rules cho một Project | Project Owner | `PROPOSED` |

---

## 3. Đặc Tả Chi Tiết Từng Hợp Đồng API (Detailed Contracts)

### RUL-API-01: Lấy Danh Sách Rules (`GET /api/v1/rules`)

- **Mục đích**: Tải danh sách Rules thuộc quyền của người dùng hiện tại cộng với System Rules.
- **Query Parameters**:
  - `page` (integer, optional, default: `1`): Số trang hiện tại.
  - `limit` (integer, optional, default: `20`, max: `100`): Số lượng bản ghi mỗi trang.
  - `search` (string, optional): Từ khóa tìm kiếm trong `name`, `description`, `tags`.
  - `scope` (string, optional, enum: `all`, `user`, `system`, default: `all`): Lọc theo phạm vi.
  - `activation_mode` (string, optional, enum: `always_on`, `model_decision`, `glob`, `manual`): Lọc trigger.
  - `status` (string, optional, enum: `active`, `inactive`, `archived`, default: `active`): Lọc trạng thái.
  - `sort_by` (string, optional, enum: `updated_at`, `name`, `priority`, default: `updated_at`): Cột sắp xếp.
  - `sort_order` (string, optional, enum: `asc`, `desc`, default: `desc`): Thứ tự sắp xếp.
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`
- **Response 200 OK**:
```json
{
  "items": [
    {
      "id": "rul-123e4567-e89b-12d3-a456-426614174000",
      "user_id": "usr-88888888-8888-8888-8888-888888888888",
      "name": "Tiêu Chuẩn Mã Nguồn TypeScript",
      "description": "Ràng buộc kiểm tra kiểu chặt chẽ trong mã nguồn frontend",
      "content_preview": "# Tiêu Chuẩn TypeScript\n\n1. Không sử dụng any...",
      "content_length": 1250,
      "scope": "user",
      "activation_mode": "glob",
      "glob_patterns": ["src/**/*.ts", "src/**/*.tsx"],
      "tags": ["frontend", "typescript"],
      "priority": 60,
      "status": "active",
      "version": 2,
      "associated_projects_count": 3,
      "created_at": "2026-10-18T08:00:00Z",
      "updated_at": "2026-10-18T09:15:00Z"
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 20,
  "total_pages": 1
}
```

---

### RUL-API-02: Tạo Mới Rule (`POST /api/v1/rules`)

- **Headers**: `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: application/json`
- **Request Body**:
```json
{
  "name": "Quy Ước Viết API RESTful",
  "description": "Chuẩn hóa định dạng URL, mã trạng thái HTTP và cấu trúc phản hồi lỗi",
  "content": "# Quy Ước API\n\n1. Sử dụng danh từ số nhiều cho endpoints.\n2. Trả về đúng HTTP status code (200, 201, 400, 404, 500).",
  "activation_mode": "always_on",
  "glob_patterns": [],
  "tags": ["backend", "api", "standards"],
  "priority": 70
}
```
- **Response 201 Created**: Trả về toàn bộ thực thể Rule vừa tạo kèm `id`, `user_id`, `version = 1`.
- **Response 409 Conflict**:
```json
{
  "detail": {
    "code": "RULE_NAME_ALREADY_EXISTS",
    "message": "Tên quy tắc 'Quy Ước Viết API RESTful' đã tồn tại trong tài khoản của bạn.",
    "field": "name"
  }
}
```

---

### RUL-API-03: Xem Chi Tiết Rule (`GET /api/v1/rules/{id}`)

- **Headers**: `Authorization: Bearer <JWT_TOKEN>`
- **Response 200 OK**:
```json
{
  "id": "rul-123e4567-e89b-12d3-a456-426614174000",
  "user_id": "usr-88888888-8888-8888-8888-888888888888",
  "name": "Tiêu Chuẩn Mã Nguồn TypeScript",
  "description": "Ràng buộc kiểm tra kiểu chặt chẽ trong mã nguồn frontend",
  "content": "# Tiêu Chuẩn TypeScript\n\n1. Không sử dụng any.\n2. Bắt buộc có interface cho props.\n3. Xử lý null an toàn.",
  "scope": "user",
  "activation_mode": "glob",
  "glob_patterns": ["src/**/*.ts", "src/**/*.tsx"],
  "tags": ["frontend", "typescript"],
  "priority": 60,
  "status": "active",
  "version": 2,
  "is_editable": true,
  "created_at": "2026-10-18T08:00:00Z",
  "updated_at": "2026-10-18T09:15:00Z"
}
```
- **Response 404 Not Found**: Nếu ID không tồn tại hoặc thuộc người dùng khác (Anti-IDOR).

---

### RUL-API-04: Cập Nhật Rule (`PUT /api/v1/rules/{id}`)

- **Headers**: `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: application/json`
- **Request Body**:
```json
{
  "name": "Tiêu Chuẩn Mã Nguồn TypeScript v2",
  "description": "Bổ sung quy định về React Hook Form",
  "content": "# Tiêu Chuẩn TypeScript v2\n\n1. Không sử dụng any...\n2. Bắt buộc validate form bằng Zod.",
  "activation_mode": "glob",
  "glob_patterns": ["src/**/*.ts", "src/**/*.tsx"],
  "tags": ["frontend", "typescript", "zod"],
  "priority": 65,
  "status": "active",
  "version": 2
}
```
- **Response 200 OK**: Trả về dữ liệu bản ghi cập nhật thành công với `version = 3`.
- **Response 403 Forbidden**: Nếu cố tình cập nhật System Rule (`scope = 'system'`).
- **Response 409 Conflict**: Nếu `version` gửi lên khác với `version` hiện tại trong CSDL.
```json
{
  "detail": {
    "code": "CONCURRENT_UPDATE_CONFLICT",
    "message": "Quy tắc này đã bị sửa đổi bởi một phiên khác. Vui lòng tải lại dữ liệu mới nhất.",
    "current_version": 3
  }
}
```

---

### RUL-API-05: Bật/Tắt Nhanh Trạng Thái (`PATCH /api/v1/rules/{id}/status`)

- **Request Body**:
```json
{
  "status": "inactive"
}
```
- **Response 200 OK**:
```json
{
  "id": "rul-123e4567-e89b-12d3-a456-426614174000",
  "status": "inactive",
  "updated_at": "2026-10-18T09:30:00Z"
}
```

---

### RUL-API-06: Nhân Bản Rule (`POST /api/v1/rules/{id}/clone`)

- **Response 201 Created**: Trả về bản ghi mới được nhân bản, tên có hậu tố `(Copy)`.

---

### RUL-API-07: Xóa Mềm Rule (`DELETE /api/v1/rules/{id}`)

- **Query Parameters**:
  - `force` (boolean, optional, default: `false`): Nếu `false` và Rule đang được liên kết trong dự án, hệ thống trả về mã lỗi 400 kèm danh sách dự án. Nếu `true`, hệ thống tự động gỡ liên kết và thực hiện xóa mềm.
- **Response 200 OK**:
```json
{
  "message": "Đã xóa mềm quy tắc thành công.",
  "id": "rul-123e4567-e89b-12d3-a456-426614174000",
  "deleted_at": "2026-10-18T09:45:00Z",
  "detached_projects_count": 2
}
```
- **Response 400 Bad Request (Khi force = false và có dự án dùng)**:
```json
{
  "detail": {
    "code": "RULE_IN_USE_BY_PROJECTS",
    "message": "Quy tắc này đang được sử dụng trong 2 dự án. Vui lòng xác nhận gỡ liên kết để xóa.",
    "projects": [
      { "id": "prj-001", "name": "Dự Án Trợ Lý Ảo Alpha" },
      { "id": "prj-002", "name": "Hệ Thống Phân Tích Dữ Liệu" }
    ]
  }
}
```

---

## 4. Định Nghĩa Schemas Pydantic v2 (Backend Data Schemas)

```python
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

class RuleBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Tên quy tắc")
    description: Optional[str] = Field(None, max_length=500, description="Mô tả tóm tắt")
    content: str = Field(..., min_length=1, max_length=10000, description="Nội dung Markdown")
    activation_mode: str = Field("always_on", description="Chế độ kích hoạt")
    glob_patterns: List[str] = Field(default_factory=list, description="Danh sách glob patterns")
    tags: List[str] = Field(default_factory=list, description="Danh sách tags")
    priority: int = Field(50, ge=0, le=100, description="Mức ưu tiên từ 0-100")

    @field_validator("activation_mode")
    @classmethod
    def validate_mode(cls, v: str) -> str:
        valid_modes = {"always_on", "model_decision", "glob", "manual"}
        if v not in valid_modes:
            raise ValueError(f"Activation mode phải là một trong các giá trị: {valid_modes}")
        return v

class RuleCreate(RuleBase):
    pass

class RuleUpdate(RuleBase):
    status: Optional[str] = Field("active", description="Trạng thái: active, inactive, archived")
    version: int = Field(..., ge=1, description="Số phiên bản phục vụ Optimistic Concurrency")

class RuleStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(active|inactive)$", description="Trạng thái mới")

class RuleResponse(RuleBase):
    id: str
    user_id: Optional[str] = None
    scope: str
    status: str
    version: int
    is_editable: bool = True
    associated_projects_count: int = 0
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None

class PaginatedRuleResponse(BaseModel):
    items: List[RuleResponse]
    total: int
    page: int
    limit: int
    total_pages: int
```

---

## 5. Định Nghĩa Giao Diện TypeScript (Frontend Types)

```typescript
export type RuleScope = 'system' | 'user' | 'project';
export type ActivationMode = 'always_on' | 'model_decision' | 'glob' | 'manual';
export type RuleStatus = 'active' | 'inactive' | 'archived';

export interface Rule {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  content: string;
  scope: RuleScope;
  activation_mode: ActivationMode;
  glob_patterns: string[];
  tags: string[];
  priority: number;
  status: RuleStatus;
  version: number;
  is_editable: boolean;
  associated_projects_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface RuleCreatePayload {
  name: string;
  description?: string;
  content: string;
  activation_mode: ActivationMode;
  glob_patterns?: string[];
  tags?: string[];
  priority?: number;
}

export interface RuleUpdatePayload extends RuleCreatePayload {
  status: RuleStatus;
  version: number;
}

export interface PaginatedRuleResponse {
  items: Rule[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
```
