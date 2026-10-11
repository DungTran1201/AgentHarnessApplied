# 07. TẬP HỢP BIỂU ĐỒ MERMAID CHUẨN HÓA (SYSTEM MERMAID DIAGRAMS)
## Phân Hệ: Quản Lý System Prompt (System Prompt Management MVP)
### Nền Tảng: AI-Chan Virtual Assistant Platform

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `DOC-SPM-07` |
| **Trạng Thái** | `PROPOSED (Chờ Duyệt Từ Solution Architect)` |
| **Vai Trò Phụ Trách** | Solution Architect & System Engineer |
| **Phiên Bản** | `1.0.0-MVP` |
| **Ngày Lập** | `2026-10-11` |

---

Tài liệu này tập hợp **12 biểu đồ Mermaid chuẩn hóa** mô tả trực quan và chính xác toàn bộ kiến trúc, luồng xử lý, tương tác dữ liệu và kiểm soát an toàn của phân hệ Quản lý System Prompt. Tất cả các biểu đồ đều tuân thủ nghiêm ngặt cú pháp Mermaid hợp lệ, đồng bộ mã định danh với SRS, Data Dictionary và API Contract.

---

## 1. Biểu Đồ 01: Use Case Diagram (`DIA-SPM-01`)

- **Mục đích:** Mô tả tổng thể các tác nhân (Actors) và phạm vi các trường hợp sử dụng (Use Cases) trong phân hệ Quản lý System Prompt, thể hiện rõ các tính năng MVP và tính năng mở rộng.

```mermaid
flowchart LR
    subgraph Actors["Tác Nhân Hệ Thống"]
        User["End User (Người Dùng)"]
        Guest["Guest User (Dùng Thử)"]
    end

    subgraph Scope_List["Phân Nhóm: Quản Lý Danh Sách"]
        UC01["UC-SPM-01: Xem Danh Sách System Prompt"]
        UC02["UC-SPM-02: Tìm Kiếm System Prompt Tức Thì"]
    end

    subgraph Scope_Detail["Phân Nhóm: Quản Lý Từng Prompt"]
        UC03["UC-SPM-03: Xem Chi Tiết System Prompt"]
        UC04["UC-SPM-04: Tạo Mới System Prompt"]
        UC05["UC-SPM-05: Chỉnh Sửa & Lưu System Prompt"]
        UC06["UC-SPM-06: Xóa System Prompt Vĩnh Viễn"]
        UC07["UC-SPM-07: Nhân Bản System Prompt (Clone)"]
    end

    subgraph Out_Of_Scope["Ngoài Phạm Vi MVP (Future Scope)"]
        UC_Future1["Gắn Prompt vào Canvas Project Node"]
        UC_Future2["Lịch Sử Phiên Bản & Diff Prompt"]
    end

    User --> UC01
    User --> UC02
    User --> UC03
    User --> UC04
    User --> UC05
    User --> UC06
    User -.-> UC07

    Guest --> UC01
    Guest --> UC02
    Guest --> UC03
    Guest --> UC04
    Guest --> UC05
    Guest --> UC06

    UC04 -.->|include| Validation["Xác Thực Ràng Buộc & Trùng Tên"]
    UC05 -.->|include| Validation
    UC06 -.->|include| Confirm["Hộp Thoại Xác Nhận Xóa"]

    classDef inScope fill:#1e293b,stroke:#6366f1,stroke-width:2px,color:#fff;
    classDef future fill:#0f172a,stroke:#64748b,stroke-dasharray: 5 5,color:#94a3b8;
    class UC01,UC02,UC03,UC04,UC05,UC06,UC07 inScope;
    class UC_Future1,UC_Future2 future;
```

---

## 2. Biểu Đồ 02: Kiến Trúc Thông Tin & Điều Hướng Người Dùng (`DIA-SPM-02`)

- **Mục đích:** Mô tả hành trình di chuyển của người dùng giữa các trang và cơ chế cảnh báo khi rời trang có dữ liệu chưa lưu (Dirty Form).

```mermaid
flowchart TD
    Start([Trang Chủ / hoặc Trang Chat]) -->|Bấm liên kết System Prompts| ListView["/prompts: Màn Hình Danh Sách"]
    
    ListView -->|Bấm nút '+ Tạo Mới'| CreateView["/prompts/new: Form Tạo Mới"]
    ListView -->|Bấm vào Thẻ Prompt| DetailView["/prompts/{id}: Màn Hình Chi Tiết"]
    ListView -->|Bấm icon Thùng Rác| DeleteModal{"Modal Xác Nhận Xóa"}
    
    DetailView -->|Bấm icon Sửa| EditView["/prompts/{id}/edit: Form Chỉnh Sửa"]
    DetailView -->|Bấm nút 'Quay Lại'| ListView
    
    CreateView -->|Nhập liệu & Bấm 'Lưu'| SaveAction["Gửi API POST Lưu Prompt"]
    EditView -->|Sửa đổi & Bấm 'Lưu'| UpdateAction["Gửi API PUT Lưu Prompt"]
    
    SaveAction -->|Thành công (201)| ListView
    UpdateAction -->|Thành công (200)| DetailView
    
    CreateView -->|Bấm 'Hủy' hoặc Chuyển Trang| CheckDirty1{"Form Đã Sửa Đổi? (isDirty)"}
    EditView -->|Bấm 'Hủy' hoặc Chuyển Trang| CheckDirty2{"Form Đã Sửa Đổi? (isDirty)"}
    
    CheckDirty1 -->|Không| ListView
    CheckDirty2 -->|Không| DetailView
    
    CheckDirty1 -->|Có| WarnModal1["Modal Cảnh Báo Chưa Lưu"]
    CheckDirty2 -->|Có| WarnModal2["Modal Cảnh Báo Chưa Lưu"]
    
    WarnModal1 -->|Bấm 'Ở Lại'| CreateView
    WarnModal1 -->|Bấm 'Rời Đi'| ListView
    
    WarnModal2 -->|Bấm 'Ở Lại'| EditView
    WarnModal2 -->|Bấm 'Rời Đi'| DetailView

    DeleteModal -->|Bấm 'Xác Nhận Xóa'| DeleteAction["Gửi API DELETE"] --> ListView
    DeleteModal -->|Bấm 'Hủy Bỏ'| ListView
```

---

## 3. Biểu Đồ 03: Lưu Đồ Tải & Lọc Danh Sách (`DIA-SPM-03`)

- **Mục đích:** Thể hiện luồng xử lý từ khi gửi request lấy danh sách, các nhánh rẽ lỗi và cơ chế lọc tìm kiếm tức thì trên Client.

```mermaid
flowchart TD
    A([Bắt đầu: Mở trang /prompts]) --> B["Hiển thị Skeleton Loading"]
    B --> C["Gọi API GET /api/v1/system-prompts"]
    
    C --> D{Kết quả API?}
    
    D -->|Lỗi 401/403| E["Hiển thị Giao Diện Yêu Cầu Đăng Nhập"]
    D -->|Lỗi 500 / Network Error| F["Hiển thị Banner Lỗi & Nút 'Thử Lại'"]
    F -->|Bấm Thử lại| C
    
    D -->|Thành công 200 OK| G{Tổng số bản ghi total?}
    
    G -->|total === 0| H["Hiển thị Empty State & Nút 'Tạo Prompt Đầu Tiên'"]
    
    G -->|total > 0| I["Lưu vào danh sách gốc: allPrompts"]
    I --> J["Render Danh Sách Thẻ (Cards Grid)"]
    
    J --> K{Người dùng gõ từ khóa tìm kiếm?}
    K -->|Không / Xóa ô tìm kiếm| J
    K -->|Có từ khóa 'q'| L["Lọc Client-side theo Name và Description"]
    
    L --> M{Số lượng kết quả khớp?}
    M -->|>= 1 bản ghi| N["Cập nhật danh sách thẻ hiển thị"]
    M -->|0 bản ghi| O["Hiển thị No-Results State & Nút 'Xóa Bộ Lọc'"]
    O -->|Bấm Xóa Bộ Lọc| J
```

---

## 4. Biểu Đồ 04: Sequence Diagram — Xem Danh Sách System Prompt (`DIA-SPM-04`)

- **Mục đích:** Mô tả trình tự trao đổi thông điệp giữa Trình duyệt (Frontend), Controller (FastAPI), Tầng bảo mật (Security Context) và Cơ sở dữ liệu (SQLite) khi tải danh sách.

```mermaid
sequenceDiagram
    autonumber
    actor User as Người Dùng
    participant UI as Next.js (/prompts)
    participant API as FastAPI (prompts_router)
    participant Sec as Security (Auth / IDOR)
    participant DB as SQLite (app.db)

    User->>UI: Truy cập đường dẫn /prompts
    UI->>UI: Hiển thị Skeleton Loading State
    UI->>API: GET /api/v1/system-prompts (Authorization: Bearer <token>)
    
    API->>Sec: decode_access_token(token)
    alt Token Hợp Lệ
        Sec-->>API: Trả về user_id (VD: usr_123)
    else Không có Token / Guest
        Sec-->>API: Gán user_id = "guest_user"
    end

    API->>DB: SELECT id, name, description, LENGTH(content) AS content_length, created_at, updated_at FROM system_prompts WHERE user_id = :uid ORDER BY updated_at DESC
    DB-->>API: Trả về danh sách rows
    
    API-->>UI: HTTP 200 OK { items: [...], total: N }
    
    alt total == 0
        UI->>User: Hiển thị Empty State ("Chưa có System Prompt nào")
    else total > 0
        UI->>User: Render danh sách Thẻ System Prompt (Populated State)
    end
```

---

## 5. Biểu Đồ 05: Sequence Diagram — Tạo Mới System Prompt (`DIA-SPM-05`)

- **Mục đích:** Mô tả chi tiết quá trình tạo mới bản ghi, bao gồm xác thực dữ liệu 2 lớp và xử lý ngoại lệ xung đột trùng tên (HTTP 409 Conflict).

```mermaid
sequenceDiagram
    autonumber
    actor User as Người Dùng
    participant UI as Form Soạn Thảo (/prompts/new)
    participant API as FastAPI (prompts_router)
    participant Val as Pydantic Validator
    participant DB as SQLite (app.db)

    User->>UI: Nhập Name, Description, Content
    UI->>UI: Cập nhật bộ đếm ký tự (isDirty = true)
    User->>UI: Bấm nút "Lưu System Prompt"
    
    UI->>UI: Client Validation (Kiểm tra trống, độ dài <= 10.000)
    alt Dữ liệu Client Không Hợp Lệ
        UI-->>User: Đánh dấu viền đỏ & Hiển thị thông báo lỗi dưới trường
    else Dữ liệu Client Hợp Lệ
        UI->>API: POST /api/v1/system-prompts { name, description, content }
        
        API->>Val: Validate SystemPromptCreateRequest
        alt Pydantic Validation Thất Bại
            Val-->>API: ValidationError (chuỗi quá dài / rỗng)
            API-->>UI: HTTP 422 Unprocessable Content
            UI-->>User: Hiển thị lỗi chi tiết theo từng trường
        else Pydantic Validation Thành Công
            API->>DB: SELECT id FROM system_prompts WHERE user_id = :uid AND LOWER(name) = LOWER(:name)
            DB-->>API: Kết quả kiểm tra trùng tên
            
            alt Đã Tồn Tại Tên Trùng (Xung đột)
                API-->>UI: HTTP 409 Conflict { error_code: "PROMPT_NAME_CONFLICT", message: "Tên prompt đã tồn tại" }
                UI-->>User: Báo lỗi trùng tên dưới ô nhập Name (GIỮ NGUYÊN nội dung Content)
            else Tên Hợp Lệ (Không trùng)
                API->>API: Sinh id duy nhất: "sp_" + uuid.hex
                API->>DB: INSERT INTO system_prompts (id, user_id, name, description, content) VALUES (...)
                DB-->>API: Thực thi thành công
                API-->>UI: HTTP 201 Created { id, name, description, content, created_at, updated_at }
                UI->>UI: Đặt isDirty = false
                UI-->>User: Hiển thị Toast thành công & Chuyển hướng về /prompts
            end
        end
    end
```

---

## 6. Biểu Đồ 06: Sequence Diagram — Chỉnh Sửa & Lưu System Prompt (`DIA-SPM-06`)

- **Mục đích:** Mô tả quy trình nạp dữ liệu cũ, chỉnh sửa, kiểm tra quyền sở hữu và lưu ghi đè dữ liệu mới.

```mermaid
sequenceDiagram
    autonumber
    actor User as Người Dùng
    participant UI as Form Chỉnh Sửa (/prompts/[id]/edit)
    participant API as FastAPI (prompts_router)
    participant DB as SQLite (app.db)

    User->>UI: Mở màn hình chỉnh sửa prompt [id]
    UI->>API: GET /api/v1/system-prompts/{id}
    API->>DB: SELECT * FROM system_prompts WHERE id = :id AND user_id = :uid
    alt Không tìm thấy / Sai chủ sở hữu (IDOR)
        DB-->>API: None
        API-->>UI: HTTP 404 Not Found
        UI-->>User: Hiển thị lỗi "Bản ghi không tồn tại hoặc không có quyền truy cập"
    else Bản ghi Hợp Lệ
        DB-->>API: Record Data
        API-->>UI: HTTP 200 OK { id, name, description, content, ... }
        UI->>UI: Nạp dữ liệu cũ vào các ô nhập liệu (isDirty = false)
        
        User->>UI: Chỉnh sửa nội dung prompt
        UI->>UI: Đánh dấu isDirty = true
        User->>UI: Bấm nút "Lưu thay đổi"
        
        UI->>API: PUT /api/v1/system-prompts/{id} { name, description, content }
        API->>DB: UPDATE system_prompts SET name=:name, description=:desc, content=:content, updated_at=CURRENT_TIMESTAMP WHERE id=:id AND user_id=:uid
        DB-->>API: Update thành công (1 row affected)
        
        API-->>UI: HTTP 200 OK { id, name, updated_at, ... }
        UI->>UI: Đặt isDirty = false
        UI-->>User: Hiển thị Toast "Cập nhật System Prompt thành công!" & Điều hướng về /prompts
    end
```

---

## 7. Biểu Đồ 07: Sequence Diagram — Xóa System Prompt (`DIA-SPM-07`)

- **Mục đích:** Mô tả quy trình xóa dứt điểm bản ghi kèm bước xác nhận Modal bắt buộc.

```mermaid
sequenceDiagram
    autonumber
    actor User as Người Dùng
    participant UI as Next.js View
    participant Modal as Modal Xác Nhận Xóa
    participant API as FastAPI (prompts_router)
    participant DB as SQLite (app.db)

    User->>UI: Nhấp biểu tượng thùng rác (🗑️) tại thẻ prompt
    UI->>Modal: Mở Modal ("Bạn có chắc chắn muốn xóa vĩnh viễn [Tên Prompt]?")
    
    alt Người dùng Hủy bỏ
        User->>Modal: Bấm "Hủy bỏ" hoặc phím Esc
        Modal-->>UI: Đóng modal, không gửi request
    else Người dùng Xác nhận Xóa
        User->>Modal: Bấm "Xóa vĩnh viễn"
        Modal->>Modal: Bật trạng thái Loading trên nút Xóa
        Modal->>API: DELETE /api/v1/system-prompts/{id}
        
        API->>DB: DELETE FROM system_prompts WHERE id = :id AND user_id = :uid
        alt Bản ghi Không Tồn Tại / Sai user
            DB-->>API: 0 rows affected
            API-->>Modal: HTTP 404 Not Found
            Modal-->>UI: Báo lỗi "Không tìm thấy bản ghi cần xóa"
        else Xóa Thành Công
            DB-->>API: 1 row affected
            API-->>Modal: HTTP 200 OK { success: true, deleted_id: id }
            Modal-->>UI: Đóng Modal
            UI->>UI: Gỡ bỏ thẻ prompt khỏi danh sách hiển thị
            UI-->>User: Hiển thị Toast "Đã xóa System Prompt thành công"
        end
    end
```

---

## 8. Biểu Đồ 08: Entity-Relationship Diagram (`DIA-SPM-08`)

- **Mục đích:** Định nghĩa cấu trúc thực thể CSDL SQLite, kiểu dữ liệu, các ràng buộc toàn vẹn và quan hệ với bảng Users.

```mermaid
erDiagram
    users ||--o{ system_prompts : "owns (1:N)"

    users {
        VARCHAR_36 id PK "Định danh duy nhất người dùng"
        VARCHAR_255 email "Email đăng nhập"
        VARCHAR_50 username "Tên tài khoản duy nhất"
        VARCHAR_20 status "Trạng thái ACTIVE/DISABLED"
        TIMESTAMP created_at "Thời điểm tạo"
    }

    system_prompts {
        VARCHAR_36 id PK "Định danh duy nhất prompt (sp_hex)"
        VARCHAR_36 user_id FK "Khóa ngoại tham chiếu users(id) ON DELETE CASCADE"
        VARCHAR_100 name "Tên prompt (UNIQUE theo user_id, NOCASE)"
        VARCHAR_500 description "Mô tả ngắn mục đích sử dụng (Nullable)"
        TEXT content "Nội dung chỉ dẫn hệ thống (1..10.000 ký tự)"
        TIMESTAMP created_at "Thời điểm tạo (DEFAULT CURRENT_TIMESTAMP)"
        TIMESTAMP updated_at "Thời điểm cập nhật gần nhất (Trigger)"
    }
```

---

## 9. Biểu Đồ 09: Component & Architecture Diagram (`DIA-SPM-09`)

- **Mục đích:** Phác họa kiến trúc các module phần mềm, ranh giới giữa Frontend Next.js, Backend FastAPI và CSDL SQLite.

```mermaid
flowchart TD
    subgraph Frontend["ai-frontend (Next.js 15 App Router)"]
        PageList["app/prompts/page.tsx (List View)"]
        PageCreate["app/prompts/new/page.tsx (Create View)"]
        PageEdit["app/prompts/[id]/edit/page.tsx (Edit View)"]
        Service["services/systemPromptService.ts (API Client)"]
        
        PageList --> Service
        PageCreate --> Service
        PageEdit --> Service
    end

    subgraph Backend["ai-backend (FastAPI RESTful API)"]
        Router["api/v1/router.py (Root Router)"]
        PromptsRouter["api/v1/prompts.py (Prompts Router)"]
        Security["core/security.py (JWT & Auth)"]
        DBUtil["src/db.py (SQLite Connection Pool)"]
        Schemas["Pydantic Schemas (Validation)"]
        
        Router --> PromptsRouter
        PromptsRouter --> Security
        PromptsRouter --> Schemas
        PromptsRouter --> DBUtil
    end

    subgraph Database["Cơ Sở Dữ Liệu SQLite"]
        AppDB[("database/app.db")]
        TablePrompts["Bảng: system_prompts"]
        AppDB --- TablePrompts
    end

    Service -->|HTTP REST JSON| PromptsRouter
    DBUtil -->|Parameterized SQL| AppDB
```

---

## 10. Biểu Đồ 10: Phân Quyền & Luồng Kiểm Soát Anti-IDOR (`DIA-SPM-10`)

- **Mục đích:** Minh họa cơ chế kiểm tra quyền truy cập ở Backend, bảo vệ tài nguyên người dùng khỏi các cuộc tấn công IDOR / BOLA.

```mermaid
flowchart TD
    Req([Client Request tới Endpoint có {id}]) --> TokenCheck{"Kiểm tra JWT Token"}
    
    TokenCheck -->|Token Hợp Lệ| ExtractUser["Trích xuất user_id từ Payload"]
    TokenCheck -->|Không Token / Hết Hạn| GuestUser["Gán user_id = 'guest_user'"]
    
    ExtractUser --> BuildSQL["Xây dựng câu lệnh SQL cưỡng chế điều kiện user_id"]
    GuestUser --> BuildSQL
    
    BuildSQL --> Query["SELECT / UPDATE / DELETE ... WHERE id = :id AND user_id = :user_id"]
    
    Query --> ExecDB[(Thực thi trên SQLite)]
    
    ExecDB --> MatchCheck{"Có bản ghi khớp đồng thời cả id VÀ user_id?"}
    
    MatchCheck -->|Có khớp| Success["Thực hiện thao tác & Trả về HTTP 200/201"]
    
    MatchCheck -->|Không khớp| NotFound["Từ chối với HTTP 404 Not Found (Bảo vệ bí mật tồn tại ID)"]

    classDef allow fill:#065f46,stroke:#10b981,color:#fff;
    classDef deny fill:#7f1d1d,stroke:#ef4444,color:#fff;
    class Success allow;
    class NotFound deny;
```

---

## 11. Biểu Đồ 11: Security Data-Flow & Threat Defense (`DIA-SPM-11`)

- **Mục đích:** Mô tả luồng dữ liệu của chuỗi `content` từ biểu mẫu người dùng, qua các chốt chặn kiểm duyệt bảo mật (XSS, DoS, Log Leakage, Injection) đến CSDL và hiển thị an toàn.

```mermaid
flowchart LR
    subgraph Client_Input["1. Nhập Liệu Client"]
        InputContent["Chuỗi Content (Chứa Unicode, Markdown, <script>)"]
    end

    subgraph Client_Defense["2. Chốt Chặn Phía Client"]
        LengthCheck1{"Độ dài <= 10.000?"}
        InputContent --> LengthCheck1
        LengthCheck1 -->|Vượt quá| Block1["Chặn gõ / Đổi viền đỏ"]
    end

    subgraph Network["3. Truyền Tải Mạng"]
        LengthCheck1 -->|Hợp lệ| HTTPS["HTTPS / HTTP REST Payload"]
    end

    subgraph Server_Defense["4. Chốt Chặn Backend"]
        PydanticCheck{"Pydantic Validation (1..10.000)"}
        HTTPS --> PydanticCheck
        PydanticCheck -->|Sai quy chuẩn| HTTP422["Trả về HTTP 422"]
        
        PydanticCheck -->|Hợp lệ| LogPolicy["Log Policy: CHỈ ghi content_length, KHÔNG log content"]
        LogPolicy --> SQLParam["Parameterized Query: '?' (Chống SQL Injection)"]
    end

    subgraph Storage["5. Lưu Trữ CSDL"]
        SQLParam --> DBStore[("SQLite: system_prompts (Lưu Text thuần túy UTF-8)")]
    end

    subgraph Display_Defense["6. Hiển Thị An Toàn (Safe Render)"]
        DBStore --> ReadAPI["API trả về qua JSON"]
        ReadAPI --> ViewText["Render vào <textarea readOnly> hoặc pre-wrap (Vô hiệu hóa thực thi XSS)"]
    end

    classDef safe fill:#1e293b,stroke:#10b981,stroke-width:2px,color:#fff;
    class LogPolicy,SQLParam,ViewText safe;
```

---

## 12. Biểu Đồ 12: Vòng Đời Trạng Thái Biểu Mẫu Soạn Thảo (`DIA-SPM-12`)

- **Mục đích:** Mô tả máy trạng thái (State Machine) của Form Editor, theo dõi cờ `isDirty`, trạng thái lưu và cơ chế xác nhận thoát.

```mermaid
stateDiagram-v2
    [*] --> FormInitialized: Mở Form (/new hoặc /edit)
    
    FormInitialized --> PristineState: Dữ liệu ban đầu đã nạp (isDirty = false)
    
    PristineState --> DirtyState: Người dùng gõ/xóa ký tự (isDirty = true)
    
    DirtyState --> Validating: Bấm nút "Lưu Prompt"
    
    Validating --> DirtyState: Validation Thất Bại (Lỗi trường / Trùng tên 409)
    
    Validating --> SavingSubmitting: Validation Hợp Lệ -> Gửi API Request
    
    SavingSubmitting --> DirtyState: API Lỗi (500 hoặc mất mạng) -> Giữ nguyên dữ liệu
    
    SavingSubmitting --> SavedSuccess: API Thành Công (200 / 201)
    
    SavedSuccess --> PristineState: Reset isDirty = false -> Điều hướng về /prompts
    
    DirtyState --> ConfirmationPending: Người dùng bấm Hủy / Chuyển Trang / F5
    
    ConfirmationPending --> DirtyState: Bấm "Ở Lại" (Hủy điều hướng)
    
    ConfirmationPending --> [*]: Bấm "Rời Đi" (Hủy bỏ thay đổi)
    
    PristineState --> [*]: Bấm "Hủy" / Chuyển trang (Thoát ngay không hỏi)
```
