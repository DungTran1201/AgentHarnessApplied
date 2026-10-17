# 04. KIẾN TRÚC HỆ THỐNG VÀ HỢP ĐỒNG GIAO TIẾP API (ARCHITECTURE & API CONTRACTS)
## Nhánh Tính Năng: Quản Lý Project (Project Management MVP)
### Hệ Thống: AI-Chan Virtual Assistant Platform

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `DOC-PRJ-04` |
| **Trạng Thái** | `PROPOSED (Chờ Duyệt Từ Product Owner & Architecture Gate)` |
| **Vai Trò Phụ Trách** | Solution Architect & Senior Fullstack Engineer |
| **Phiên Bản** | `1.0.0-MVP` |
| **Ngày Lập** | `2026-10-11` |

---

> [!IMPORTANT]
> **Tuyên Bố Hợp Đồng API Đề Xuất (Proposed API Contract Notice)**:
> Toàn bộ các endpoints có tiền tố `/api/v1/projects/*` dưới đây là **hợp đồng giao tiếp kỹ thuật đề xuất (PROPOSED CONTRACT)**. Chúng chưa được lập trình vào mã nguồn backend `ai-backend/src/api/v1/`. Tài liệu này đóng vai trò là căn cứ thiết kế để đội ngũ lập trình viên hiện thực hóa mã nguồn sau khi được phê duyệt.

---

## 1. Sơ Đồ Ngữ Cảnh Hệ Thống (System Context Diagram - `PRJ-DIAG-CTX-001`)

```mermaid
flowchart TD
    User["Người Dùng (Registered User) \n [Trình duyệt Web / Client]"]

    subgraph AIChanPlatform["Nền Tảng AI-Chan (System Boundary)"]
        Frontend["Next.js Web Frontend (SPA) \n - Trang Chủ (/)\n - Danh Sách Project (/projects)\n - Visual Canvas Editor (/projects/:id/editor)"]
        Backend["FastAPI Backend Service \n - Auth & Security Middleware\n - Project Domain Service\n - Graph Validation Engine\n - Quota & Concurrency Controller\n - LLM Gateway Orchestrator"]
        Database[("SQLite Database (app.db) \n - users\n - projects (MỚI)\n - models\n - conversations\n - messages")]
    end

    subgraph ExternalProviders["Nhà Cung Cấp Mô Hình Ngoài (AI Providers)"]
        GeminiAPI["Google Gemini API (Cloud)"]
        OpenAIAPI["OpenAI API (Cloud)"]
        AnthropicAPI["Anthropic Claude API (Cloud)"]
        GroqAPI["Groq Cloud API (Fast Inference)"]
        OllamaServer["Ollama Local Server (On-Premise)"]
    end

    User -->|1. Tương tác Canvas, Đổi trạng thái, Chat| Frontend
    Frontend -->|2. REST API & SSE Streaming (JWT Auth)| Backend
    Backend -->|3. Đọc/Ghi dữ liệu (SQL Transactions)| Database
    Backend -->|4. Gọi suy luận LLM (API Key bí mật)| ExternalProviders
```

---

## 2. Phân Tách Trách Nhiệm Thành Phần (Component Boundaries & Responsibilities)

| Tầng Hệ Thống | Thành Phần Cụ Thể | Trách Nhiệm Kỹ Thuật (Responsibilities) |
| :--- | :--- | :--- |
| **Frontend (Next.js)** | `ProjectListPage` | Hiển thị danh sách project của người dùng, thanh trạng thái Quota (`X/MAX_ACTIVE`), nút tạo mới, nút bật/tắt trạng thái. |
| **Frontend (Next.js)** | `VisualCanvasEditor` (`@xyflow/react`) | Render đồ thị node-based, quản lý viewport (pan/zoom), tương tác kéo-thả, bắt lỗi kết nối sai chiều trực quan, mở Drawer cấu hình node. |
| **Frontend (Next.js)** | `HomeProjectSelector` | Tải danh sách project đang `active` trên Trang Chủ, hiển thị dropdown chọn project và kiểm tra số từ của tin nhắn trước khi gửi. |
| **Backend (FastAPI)** | `ProjectRouter` (`/api/v1/projects`) | Tiếp nhận các request HTTP REST, xác thực JWT, ủy quyền kiểm tra quyền sở hữu project (`Anti-IDOR Guard`). |
| **Backend (FastAPI)** | `GraphValidationEngine` | Kiểm tra tính hợp lệ của graph: đủ 3 node (`web_input`, `model`, `output`), đúng 2 edge có hướng, model được chọn đang `ACTIVE` và có API key. |
| **Backend (FastAPI)** | `ProjectQuotaManager` | Kiểm tra và quản lý hạn ngạch `MAX_ACTIVE_PROJECTS`, thực thi Atomic Transaction khi chuyển trạng thái sang `ACTIVE` để chống Race Condition. |
| **Backend (FastAPI)** | `ProjectChatExecutor` | Đọc cấu hình graph đã lưu, trích xuất tham số `max_words`, `model_id`, `temperature`, gọi `LLM Gateway` và phản hồi SSE chunks về client. |
| **Persistence (SQLite)** | Bảng `projects` | Lưu trữ metadata, trạng thái (`active`, `stop`, `deactive`), và snapshot cấu trúc `graph_data` dạng JSON. |

---

## 3. Sơ Đồ Tuần Tự (Sequence Diagrams)

### 3.1. Sơ Đồ Tuần Tự: Tạo Mới, Chỉnh Sửa & Lưu Graph (`PRJ-DIAG-SEQ-001`)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người Dùng
    participant FE as Frontend (Next.js Canvas)
    participant Auth as Auth & Security Guard
    participant API as Project API Service
    participant Val as Graph Validation Engine
    participant Cat as Model Catalog Service
    participant DB as SQLite (app.db)

    User->>FE: 1. Click "Tạo Project Mới" -> Nhập Tên & Mô Tả
    FE->>API: POST /api/v1/projects { name, description } (Không bắt buộc Token)
    API->>API: Xác định user_id (Guest hoặc User nếu có token)
    API->>DB: INSERT INTO projects (id, user_id, name, status='STOP')
    DB-->>API: Ghi bản ghi thành công
    API-->>FE: 201 Created { id: 'proj_123', status: 'stop' }
    FE->>FE: Điều hướng vào /projects/proj_123/editor

    FE->>Cat: GET /api/v1/models (Lấy danh sách model khả dụng)
    Cat-->>FE: 200 OK [gemini-3.8-flash, gpt-4o-mini, ...]

    User->>FE: 2. Kéo thả 3 Node (Web Input, Model, Output)
    User->>FE: 3. Nối 2 dây (Input -> Model -> Output)
    User->>FE: 4. Cấu hình Model Node: chọn gemini-3.8-flash, temp=0.7
    User->>FE: 5. Nhấn "Lưu Graph"

    FE->>API: PUT /api/v1/projects/proj_123/graph { nodes, edges, viewport }
    API->>Auth: Kiểm tra quyền sở hữu (user_id == current_user.id)
    API->>Val: Yêu cầu validate graph
    Val->>Val: Kiểm tra Topology: Đủ 3 node, 2 cạnh đúng chiều
    Val->>Cat: Kiểm tra model_id: 'gemini-3.8-flash' có status == 'ACTIVE'?
    Cat-->>Val: Model tồn tại, active=True, has_api_key=True
    Val-->>API: Graph hoàn toàn hợp lệ (is_valid = True)

    API->>DB: UPDATE projects SET graph_data = :json, target_model_id = 'gemini-3.8-flash', is_valid = 1, updated_at = CURRENT_TIMESTAMP WHERE id = 'proj_123'
    DB-->>API: Cập nhật thành công
    API-->>FE: 200 OK { is_valid: true, message: 'Đã lưu cấu hình graph thành công' }
    FE->>User: Hiển thị Toast thông báo lưu thành công & Bật badge "Đã lưu"
```

---

### 3.2. Sơ Đồ Tuần Tự: Thực Thi Chat Qua Project Đang Active (`PRJ-DIAG-SEQ-003`)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người Dùng (Trang Chủ)
    participant FE as Chat UI (Home Page)
    participant API as Chat Stream Controller
    participant DB as SQLite (app.db)
    participant LLM as External AI Gateway (Gemini)

    User->>FE: 1. Mở Trang Chủ -> Dropdown hiển thị các project ACTIVE
    User->>FE: 2. Chọn "Trợ Lý Viết Lách (Active)"
    User->>FE: 3. Nhập tin nhắn: "Tóm tắt tài liệu kiến trúc..."
    FE->>FE: Kiểm tra số từ: 5 từ <= max_words (500) -> Hợp lệ

    FE->>API: POST /api/v1/projects/proj_123/chat { message: "..." }
    API->>DB: SELECT * FROM projects WHERE id='proj_123' AND user_id=:uid
    alt Project không tồn tại hoặc không thuộc user
        DB-->>API: None
        API-->>FE: 404 Not Found { error_code: 'PROJECT_NOT_FOUND' }
    else Project có status != 'ACTIVE'
        DB-->>API: status = 'STOP'
        API-->>FE: 409 Conflict { error_code: 'PROJECT_NOT_ACTIVE', message: 'Project đang tạm dừng' }
    else Project hợp lệ & status == 'ACTIVE'
        DB-->>API: Trả về record kèm graph_data
        API->>API: Đọc Web Input Node -> Đếm số từ thực tế: 5 <= 500 (PASS)
        API->>API: Đọc Model Node -> model='gemini-3.8-flash', temp=0.7, max_tokens=2048
        API->>LLM: Gửi request streaming tới Gemini API (API Key từ Env)
        API-->>FE: 200 OK (Content-Type: text/event-stream)
        
        loop Nhận Chunk dữ liệu từ Provider
            LLM-->>API: Data chunk "Tài liệu..."
            API-->>FE: event: message \n data: {"content": "Tài liệu..."}
            FE->>User: Render text Markdown dòng chảy thời gian thực
        end

        LLM-->>API: Stream completed
        API-->>FE: event: done \n data: {"finish_reason": "stop"}
        API->>DB: INSERT INTO messages (conversation_id, role, content, model_used)
    end
```

---

## 4. Đặc Tả Hợp Đồng API REST Chi Tiết (Proposed REST API Contracts)

### Danh Sách Endpoints Thuộc Nhánh Project:
1. `GET /api/v1/projects` - Lấy danh sách project của người dùng.
2. `POST /api/v1/projects` - Tạo mới project cơ bản.
3. `GET /api/v1/projects/{id}` - Lấy chi tiết thông tin và graph của project.
4. `PATCH /api/v1/projects/{id}` - Cập nhật Tên và Mô tả project.
5. `PUT /api/v1/projects/{id}/graph` - Lưu cấu trúc graph và cấu hình node.
6. `POST /api/v1/projects/{id}/validate` - Kiểm tra tính hợp lệ của graph mà không lưu.
7. `POST /api/v1/projects/{id}/activate` - Kích hoạt project sang trạng thái `active`.
8. `POST /api/v1/projects/{id}/stop` - Tạm dừng project (về `stop`).
9. `POST /api/v1/projects/{id}/deactivate` - Vô hiệu hóa project (về `deactive`).
10. `DELETE /api/v1/projects/{id}` - Xóa project (Soft delete).
11. `GET /api/v1/projects/active` - Lấy danh sách project `active` phục vụ Trang Chủ.
12. `GET /api/v1/projects/quota` - Lấy thông tin hạn ngạch `MAX_ACTIVE_PROJECTS`.
13. `POST /api/v1/projects/{id}/chat` - Thực thi phiên chat qua project bằng luồng SSE.

---

### 4.1. `POST /api/v1/projects` - Tạo Mới Project
- **Phương thức**: `POST`
- **Đường dẫn**: `/api/v1/projects`
- **Xác thực**: **Không bắt buộc** (Hỗ trợ cả Khách Vãng Lai và Người Dùng Đã Đăng Ký; nếu không có token, hệ thống tự động gán tài khoản khách `guest_user`)
- **Request Body**:
```json
{
  "name": "Trợ Lý Kỹ Thuật",
  "description": "Project hỗ trợ phân tích tài liệu và viết mã nguồn Python"
}
```
- **Validation**:
  - `name`: String, 1 - 100 ký tự (bắt buộc, không toàn khoảng trắng).
  - `description`: String, tối đa 500 ký tự (tùy chọn, nullable).
- **Phản hồi Thành Công (201 Created)**:
```json
{
  "id": "proj_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "user_id": "usr_98765432-10ab-cdef-0123-456789abcdef",
  "name": "Trợ Lý Kỹ Thuật",
  "description": "Project hỗ trợ phân tích tài liệu và viết mã nguồn Python",
  "status": "STOP",
  "is_valid": false,
  "node_count": 0,
  "created_at": "2026-10-11T15:30:00Z",
  "updated_at": "2026-10-11T15:30:00Z"
}
```

---

### 4.2. `PUT /api/v1/projects/{id}/graph` - Lưu Cấu Trúc Graph
- **Phương thức**: `PUT`
- **Đường dẫn**: `/api/v1/projects/{id}/graph`
- **Xác thực**: Bắt buộc (`Authorization: Bearer <jwt_token>`)
- **Request Body**: Cấu trúc JSON chuẩn chứa `viewport`, `nodes`, `edges` (Xem đặc tả tại tài liệu `03-domain-data-model.md`).
- **Phản hồi Thành Công (200 OK)**:
```json
{
  "project_id": "proj_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "is_valid": true,
  "validation_details": {
    "has_web_input": true,
    "has_model": true,
    "has_output": true,
    "edges_connected_properly": true,
    "selected_model": "gemini-3.8-flash",
    "model_status": "ACTIVE"
  },
  "updated_at": "2026-10-11T15:35:00Z",
  "message": "Lưu cấu trúc graph thành công"
}
```
- **Phản hồi Thất Bại (422 Unprocessable Entity - Graph Không Hợp Lệ)**:
```json
{
  "error_code": "INVALID_GRAPH_STRUCTURE",
  "message": "Cấu trúc đồ thị không hợp lệ",
  "errors": [
    "Thiếu kết nối từ Model Node sang Output Node",
    "Mô hình AI 'claude-unknown' không tồn tại trong danh mục hệ thống"
  ]
}
```

---

### 4.3. `POST /api/v1/projects/{id}/activate` - Kích Hoạt Project Sang `ACTIVE`
- **Phương thức**: `POST`
- **Đường dẫn**: `/api/v1/projects/{id}/activate`
- **Xác thực**: Bắt buộc (`Authorization: Bearer <jwt_token>`)
- **Phản hồi Thành Công (200 OK)**:
```json
{
  "id": "proj_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "ACTIVE",
  "active_quota": {
    "active_count": 2,
    "max_limit": 3,
    "remaining_slots": 1
  },
  "message": "Project đã được kích hoạt thành công"
}
```
- **Phản hồi Thất Bại Khi Hết Hạn Ngạch (409 Conflict)**:
```json
{
  "error_code": "QUOTA_EXCEEDED",
  "message": "Không thể kích hoạt project: Bạn đã đạt giới hạn tối đa 3 project hoạt động đồng thời",
  "active_quota": {
    "active_count": 3,
    "max_limit": 3,
    "remaining_slots": 0
  }
}
```
- **Phản hồi Thất Bại Khi Graph Chưa Hợp Lệ (400 Bad Request)**:
```json
{
  "error_code": "GRAPH_NOT_VALID",
  "message": "Không thể kích hoạt project vì cấu hình graph chưa hoàn thiện hoặc chưa hợp lệ. Vui lòng kiểm tra lại trên Canvas."
}
```

---

### 4.4. `POST /api/v1/projects/{id}/chat` - Thực Thi Chat Qua Project (SSE)
- **Phương thức**: `POST`
- **Đường dẫn**: `/api/v1/projects/{id}/chat`
- **Header**:
  - `Authorization: Bearer <jwt_token>`
  - `Accept: text/event-stream`
- **Request Body**:
```json
{
  "message": "Viết giúp tôi hàm tính số Fibonacci bằng Python với đệ quy có nhớ (Memoization)",
  "conversation_id": "conv_99887766-5544-3322-1100-aabbccddeeff"
}
```
- **Phản hồi Dòng Chảy SSE (200 OK - `Content-Type: text/event-stream`)**:
```
event: start
data: {"project_id": "proj_a1b2c3d4", "model": "gemini-3.8-flash"}

event: message
data: {"content": "Chào bạn! "}

event: message
data: {"content": "Dưới đây là hàm tính Fibonacci bằng Python:\n\n```python\n"}

event: message
data: {"content": "def fib(n, memo={}):\n    if n in memo: return memo[n]\n    if n <= 1: return n\n    memo[n] = fib(n-1, memo) + fib(n-2, memo)\n    return memo[n]\n```"}

event: done
data: {"finish_reason": "stop", "prompt_words": 15, "tokens_used": 128}
```
- **Phản hồi Thất Bại Do Vượt Quá Số Từ (400 Bad Request)**:
```json
{
  "error_code": "WORD_LIMIT_EXCEEDED",
  "message": "Tin nhắn của bạn có 650 từ, vượt quá giới hạn tối đa 500 từ của Project này",
  "actual_words": 650,
  "max_words": 500
}
```

---

### 4.5. `GET /api/v1/projects/{id}/conversation` - Lấy hoặc Khởi Tạo Idempotent Conversation Chính của Project
- **Phương thức**: `GET`
- **Đường dẫn**: `/api/v1/projects/{id}/conversation`
- **Header**:
  - `Authorization: Bearer <jwt_token>`
- **Mô tả**: Trả về cuộc hội thoại đang tiếp diễn của người dùng cho Project này. Nếu chưa có, tạo mới và gắn `project_id`. Đảm bảo tính Idempotent khi mở lại trang hoặc từ 2 tab cùng lúc.
- **Phản hồi Thành Công (200 OK)**:
```json
{
  "conversation": {
    "id": "conv_99887766-5544-3322-1100-aabbccddeeff",
    "user_id": "user_123",
    "project_id": "proj_a1b2c3d4",
    "title": "Project Chat - Trợ Lý Kỹ Thuật",
    "created_at": "2026-10-17T03:30:00Z",
    "updated_at": "2026-10-17T03:45:00Z"
  }
}
```
- **Phản hồi Thất Bại (404 Not Found)**:
```json
{
  "detail": "Project không tồn tại hoặc bạn không có quyền truy cập."
}
```

---

### 4.6. `GET /api/v1/projects/{id}/chat/stream` - Nối Lại Luồng SSE và Replay Event Cho Lượt Đang Sinh
- **Phương thức**: `GET`
- **Đường dẫn**: `/api/v1/projects/{id}/chat/stream?conversation_id={conv_id}&after_seq={seq}`
- **Header**:
  - `Authorization: Bearer <jwt_token>`
  - `Accept: text/event-stream`
- **Tham số Query**:
  - `conversation_id`: Bắt buộc. Định danh cuộc trò chuyện.
  - `after_seq`: Tùy chọn (mặc định -1). Sequence number của event cuối cùng mà client đã nhận trước khi ngắt kết nối.
- **Mô tả**: Cho phép client khi rời màn hình hoặc tải lại trang kết nối lại với tác vụ sinh chạy ngầm ở backend (`ProjectChatTurnManager`). Backend sẽ phát lại các chunk/event có sequence > `after_seq` và tiếp tục streaming trực tiếp.
- **Phản hồi SSE (200 OK - `Content-Type: text/event-stream`)**:
```
event: chunk
data: {"token": " và tiếp tục xử lý", "seq": 12}

event: done
data: {"status": "done", "finish_reason": "stop", "turn_id": "turn_123", "message_id": "msg_456", "model": "gemini-3.8-flash", "tokens_prompt": 25, "conversation_id": "conv_99887766"}
```
- **Phản hồi Không Có Turn Hoạt Động (404 Not Found)**: Nếu lượt đã hoàn tất hoặc không tồn tại.

---

### 4.7. `POST /api/v1/projects/{id}/chat/cancel` - Hủy Lượt Sinh Theo Yêu Cầu Người Dùng (Stop Button)
- **Phương thức**: `POST`
- **Đường dẫn**: `/api/v1/projects/{id}/chat/cancel`
- **Header**:
  - `Authorization: Bearer <jwt_token>`
  - `Content-Type: application/json`
- **Request Body**:
```json
{
  "conversation_id": "conv_99887766-5544-3322-1100-aabbccddeeff"
}
```
- **Phản hồi Thành Công (200 OK)**:
```json
{
  "success": true,
  "message": "Đã hủy lượt sinh thành công."
}
```

---

## 5. Sơ Đồ Tuần Tự: Luồng Chạy Ngầm Bền Vững & Nối Lại Luồng (Turn Lifecycle & Stream Reconnect)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người Dùng
    participant FE as Frontend (Floating Chat / Chat Page)
    participant API as Projects API Router
    participant TM as ProjectChatTurnManager (Detached Async Task)
    participant LLM as LLM Provider
    participant DB as SQLite DB

    User->>FE: Gửi tin nhắn mới
    FE->>API: POST /projects/{id}/chat { message, conversation_id }
    API->>API: Anti-IDOR check (Xác minh user & project_id)
    API->>DB: INSERT INTO messages (role='user', status='COMPLETED')
    API->>DB: INSERT INTO messages (role='assistant', status='RUNNING')
    API->>TM: start_turn(task) -> Chạy async task độc lập với HTTP Request
    TM->>API: Trả về instance ActiveChatTurn
    API-->>FE: Bắt đầu StreamingResponse (SSE)

    User->>FE: Đổi màn hình / Rời trang / Đổi Project
    Note over FE,API: HTTP Socket Client ngắt kết nối (Client Disconnect)
    Note over TM,LLM: Task backend VẪN TIẾP TỤC CHẠY độc lập trong TurnManager!
    LLM-->>TM: Tiếp tục sinh các chunks
    TM->>TM: Lưu vào buffer turn.events (kèm seq tăng dần)

    User->>FE: Quay lại màn hình Project / Chat Page
    FE->>API: GET /projects/{id}/chat/stream?conversation_id=...&after_seq=last_seq
    API->>TM: Lấy turn đang active từ ProjectChatTurnManager
    TM-->>FE: SSE Replay các event có seq > last_seq, sau đó stream live các chunks còn lại
    LLM-->>TM: Hoàn tất lượt sinh (Done)
    TM->>DB: UPDATE messages SET content=full_content, status='COMPLETED'
    TM-->>FE: event: done
```

---

## 6. Sơ Đồ Trạng Thái: Vòng Đời Lượt Sinh Chat (Turn Lifecycle State Diagram)

```mermaid
stateDiagram-v2
    [*] --> QUEUED: Khởi tạo lượt sinh & lưu placeholder DB
    QUEUED --> RUNNING: Backend Turn Manager bắt đầu gọi Model
    RUNNING --> COMPLETED: Model hoàn tất thành công (Lưu DB & phát done event)
    RUNNING --> FAILED: Provider lỗi / Timeout (Đánh dấu FAILED & lưu error message)
    RUNNING --> CANCELLED: Người dùng bấm "Stop" -> Gọi POST /projects/{id}/chat/cancel
    RUNNING --> INTERRUPTED: Backend restart trong lúc sinh -> Reconciled lúc startup
    QUEUED --> INTERRUPTED: Backend restart khi chưa kịp sinh
    COMPLETED --> [*]
    FAILED --> [*]
    CANCELLED --> [*]
    INTERRUPTED --> [*]
```

