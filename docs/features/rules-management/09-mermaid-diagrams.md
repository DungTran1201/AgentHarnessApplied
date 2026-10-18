# PHẦN 09: BỘ BIỂU ĐỒ MERMAID CHUẨN HÓA (SYSTEM MERMAID DIAGRAMS)
## Phân Hệ: Quản Lý Quy Tắc (Rules Management — Rules Library & Rule Editor)
### Dự Án: Nền Tảng Trợ Lý Ảo AI-Chan (AI-Chan Assistant Platform)

---

| Thông Tin Quản Trị | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `RUL-DOC-09` |
| **Nhánh Tính Năng** | **Rules Management (Rules Library & Rule Editor)** |
| **Trạng Thái Quản Trị** | **`PROPOSED (Chờ Duyệt Từ Architecture Board & Product Owner)`** |
| **Phiên Bản** | `1.0.0-PROPOSAL` |
| **Ngày Ban Hành** | `2026-10-18` |
| **Tác Giả / Vai Trò** | Senior Solution Architect & Technical Writer |

---

## Danh Mục 16 Biểu Đồ Kỹ Thuật Bắt Buộc

Tài liệu này tập hợp đầy đủ **16 biểu đồ Mermaid chuẩn hóa** mô tả trực quan và chính xác toàn bộ kiến trúc, luồng người dùng, chu trình gọi API, máy trạng thái, mô hình dữ liệu quan hệ, quy trình an ninh và cơ chế giải quyết quy tắc của phân hệ Rules Management:

1. **`RUL-DIA-01`**: Use Case Diagram — Quản Lý Thư Viện Rules (Rules Library)
2. **`RUL-DIA-02`**: Use Case Diagram — Quản Lý Chi Tiết & Soạn Thảo Rule (Rule Detail & Editor)
3. **`RUL-DIA-03`**: User Flow — Mở Thư Viện Rules, Tìm Kiếm, Lọc & Mở Rule
4. **`RUL-DIA-04`**: User Flow — Tạo Mới, Soạn Thảo, Lưu & Xử Lý Biểu Mẫu Chưa Lưu (Dirty State)
5. **`RUL-DIA-05`**: Swimlane Diagram — Phân Vai Trò End-to-End (User → Frontend → API → Service → Database)
6. **`RUL-DIA-06`**: Sequence Diagram — Tải Danh Sách Rules (Pagination, Search, Scope Filters)
7. **`RUL-DIA-07`**: Sequence Diagram — Tạo Mới Rule (Client Validation, Duplicate Check, Persistence)
8. **`RUL-DIA-08`**: Sequence Diagram — Cập Nhật Rule & Xử Lý Xung Đột Ghi Đè (Optimistic Concurrency)
9. **`RUL-DIA-09`**: Sequence Diagram — Xóa Mềm Rule & Kiểm Tra Dự Án Đang Sử Dụng (Delete In-Use Guard)
10. **`RUL-DIA-10`**: State Diagram — Vòng Đời Dữ Liệu Rule & Trạng Thái Biểu Mẫu UI
11. **`RUL-DIA-11`**: Entity-Relationship Diagram (ERD) — Bảng Rules & Quan Hệ Với Users, Projects
12. **`RUL-DIA-12`**: Component & Architecture Diagram — Kiến Trúc Hệ Thống & Điểm Tích Hợp Runtime
13. **`RUL-DIA-13`**: Security Flow — Kiểm Soát Quyền Truy Cập Anti-IDOR & Bảo Vệ System Rules
14. **`RUL-DIA-14`**: Rule Activation & Resolution Flow — Cơ Chế Phân Giải Quy Tắc Lúc Chạy (Proposed Runtime)
15. **`RUL-DIA-15`**: Error Handling & Recovery Flow — Xử Lý Ngoại Lệ (400, 401, 403, 404, 409, 422, 500)
16. **`RUL-DIA-16`**: Traceability & Feature Dependency Diagram — Ma Trận Phụ Thuộc Tính Năng

---

## 1. Biểu Đồ 01: Use Case Diagram — Thư Viện Rules (`RUL-DIA-01`)

```mermaid
flowchart LR
    subgraph Actors["Tác Nhân Hệ Thống"]
        User["Người Dùng Đăng Nhập<br>(Authenticated User)"]
        Admin["Quản Trị Viên<br>(System Admin)"]
        Guest["Khách Chưa Đăng Nhập<br>(Guest)"]
    end

    subgraph Scope_Library["Phân Hệ Quản Lý Thư Viện Rules (Rules Library)"]
        UC01["RUL-UC-001: Xem Danh Sách Rules"]
        UC02["RUL-UC-001: Tìm Kiếm Tức Thì (Search)"]
        UC03["RUL-UC-002: Lọc Theo Scope (System/User)"]
        UC04["RUL-UC-002: Lọc Theo Activation Mode"]
        UC05["RUL-UC-002: Sắp Xếp & Phân Trang"]
        UC06["RUL-UC-003: Bật/Tắt Nhanh Trạng Thái Active"]
        UC07["RUL-UC-007: Nhân Bản Rule (Clone)"]
        UC08["RUL-UC-008: Xóa Mềm Rule (Soft Delete)"]
        UC_Redirect["Chuyển Hướng Đăng Nhập (Login Redirect)"]
    end

    subgraph Proposed_Scope["Tính Năng Đề Xuất (Giai Đoạn 2)"]
        UC09["Xuất Rule Ra Tệp .md (Export)"]
        UC10["Nhập Rule Từ Tệp .md (Import)"]
    end

    User --> UC01
    User --> UC02
    User --> UC03
    User --> UC04
    User --> UC05
    User --> UC06
    User --> UC07
    User --> UC08
    User -.-> UC09
    User -.-> UC10

    Admin --> UC01
    Admin --> UC08

    Guest --> UC_Redirect
```

---

## 2. Biểu Đồ 02: Use Case Diagram — Quản Lý Từng Rule & Soạn Thảo (`RUL-DIA-02`)

```mermaid
flowchart LR
    subgraph Actors["Tác Nhân"]
        User["Người Dùng (Owner)"]
        Admin["Quản Trị Viên (Admin)"]
    end

    subgraph Scope_Detail["Phân Hệ Quản Lý Từng Rule (Detail & Editor)"]
        UC11["RUL-UC-004: Tạo Mới Rule"]
        UC12["RUL-UC-005: Xem Chi Tiết Rule Cá Nhân"]
        UC13["RUL-UC-005: Soạn Thảo Markdown & Preview"]
        UC14["RUL-UC-005: Cấu Hình Activation Mode & Globs"]
        UC15["RUL-UC-005: Lưu Thay Đổi (Update Rule)"]
        UC16["RUL-UC-006: Xem Chi Tiết System Rule (Read-Only)"]
        UC17["RUL-UC-009: Xem Danh Sách Dự Án Đang Dùng Rule"]
        UC18["RUL-UC-010: Cảnh Báo Rời Trang Chưa Lưu (Dirty Guard)"]
    end

    subgraph Admin_Only["Quyền Quản Trị Viên"]
        UC19["Tạo/Sửa/Xóa System Rule Toàn Cầu"]
    end

    User --> UC11
    User --> UC12
    User --> UC13
    User --> UC14
    User --> UC15
    User --> UC16
    User --> UC17
    User --> UC18

    Admin --> UC19
```

---

## 3. Biểu Đồ 03: User Flow — Mở Thư Viện, Tìm Kiếm, Lọc & Xem Rule (`RUL-DIA-03`)

```mermaid
flowchart TD
    Start([Bắt đầu: Người dùng mở menu "Rules"]) --> CheckAuth{Đã đăng nhập?}
    
    CheckAuth -- Chưa --> RedirectLogin[Chuyển hướng về trang /login] --> EndFail([Kết thúc])
    
    CheckAuth -- Đã đăng nhập --> LoadAPI[Frontend gọi GET /api/v1/rules]
    
    LoadAPI --> CheckStatus{Kết quả API?}
    CheckStatus -- Lỗi 500/Mạng --> ShowError[Hiển thị Error State: Nút Thử Lại] --> EndError([Dừng])
    CheckStatus -- 200 OK & Trống --> ShowEmpty[Hiển thị Empty State: Nút Tạo Mới]
    
    CheckStatus -- 200 OK & Có Data --> ShowList[Hiển thị danh sách Rules Cards / Table]
    
    ShowList --> UserAction{Người dùng thao tác?}
    
    UserAction -- "Nhập từ khóa tìm kiếm" --> DebounceSearch[Debounce 300ms: Lọc tên/mô tả/tags]
    DebounceSearch --> CheckResults{Có kết quả?}
    CheckResults -- Không --> ShowNoResult[Hiển thị No-Results State: Nút Xóa Lọc] --> ShowList
    CheckResults -- Có --> ShowList
    
    UserAction -- "Chọn Filter (Scope / Trigger / Status)" --> ApplyFilter[Áp dụng bộ lọc client/server] --> ShowList
    
    UserAction -- "Click một Rule để xem" --> CheckScope{Loại Rule?}
    CheckScope -- "User Rule (Cá nhân)" --> OpenEditable["Mở /rules/:id (Chế độ Soạn Thảo / Chỉnh Sửa)"] --> EndSuccess([Hoàn tất])
    CheckScope -- "System Rule (Hệ thống)" --> OpenReadOnly["Mở /rules/:id (Chế độ Chỉ Đọc & Banner thông báo)"] --> EndSuccess
```

---

## 4. Biểu Đồ 04: User Flow — Tạo / Sửa / Lưu / Hủy Rule & Dirty State (`RUL-DIA-04`)

```mermaid
flowchart TD
    Start([Bắt đầu: Mở Form Tạo Mới / Sửa Rule]) --> InitForm[Nạp form trống hoặc dữ liệu cũ: isDirty = false]
    
    InitForm --> UserEdit[Người dùng nhập Tên, Mô tả, Trigger, Markdown...]
    UserEdit --> SetDirty[Ghi nhận: isDirty = true, Cập nhật bộ đếm ký tự]
    
    SetDirty --> SwitchTab{Chuyển tab Preview?}
    SwitchTab -- Có --> RenderMD[Khử khuẩn XSS DOMPurify -> Hiển thị Markdown Preview] --> SetDirty
    SwitchTab -- Không --> DecideAction{Hành động tiếp theo?}
    
    DecideAction -- "Nhấn HỦY hoặc Click Menu khác" --> CheckDirty{isDirty == true?}
    CheckDirty -- Đúng --> ShowDirtyModal["Hiện Modal Cảnh Báo: Rời đi sẽ mất thay đổi?"]
    ShowDirtyModal --> ModalChoice{Lựa chọn?}
    ModalChoice -- "Ở lại tiếp tục sửa" --> SetDirty
    ModalChoice -- "Hủy và rời đi" --> DiscardData[Hủy thay đổi -> Điều hướng về /rules] --> EndDiscard([Kết thúc])
    
    CheckDirty -- Sai --> DiscardData
    
    DecideAction -- "Nhấn LƯU QUY TẮC" --> ClientValidate{Kiểm tra Client Validation?}
    ClientValidate -- "Không hợp lệ (Tên rỗng, >10k ký tự)" --> ShowFieldError[Hiện viền đỏ và thông báo lỗi dưới ô nhập] --> SetDirty
    
    ClientValidate -- Hợp lệ --> SendAPI[Gửi POST hoặc PUT /api/v1/rules]
    
    SendAPI --> CheckAPIResult{Mã phản hồi HTTP?}
    CheckAPIResult -- "409 Conflict (Trùng tên)" --> Show409Error[Báo lỗi: Tên quy tắc đã tồn tại] --> SetDirty
    CheckAPIResult -- "409 Conflict (Ghi đè)" --> ShowVersionConflict[Modal: Dữ liệu đã bị sửa bởi phiên khác] --> SetDirty
    CheckAPIResult -- "200 / 201 Thành Công" --> ShowToast[Toast thông báo thành công: isDirty = false] --> NavBack[Chuyển hướng về /rules] --> EndSuccess([Hoàn thành])
```

---

## 5. Biểu Đồ 05: Swimlane Diagram — Phân Vai Trò End-to-End (`RUL-DIA-05`)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người Dùng (Client)
    participant UI as ai-frontend (React)
    participant Router as FastAPI Router (/rules)
    participant Service as RuleService Layer
    participant DB as PostgreSQL Database

    Note over User, DB: QUY TRÌNH TẠO MỚI QUY TẮC (CREATE RULE FLOW)
    User->>UI: Điền form tạo Rule và nhấn "Lưu Quy Tắc"
    UI->>UI: Client Validate (Độ dài, bắt buộc, sanitization)
    UI->>Router: POST /api/v1/rules (Bearer JWT, Payload)
    
    Router->>Router: Verify JWT Token (get_current_active_user)
    Router->>Router: Pydantic v2 Schema Validation
    Router->>Service: create_rule(user_id, rule_in)
    
    Service->>DB: SELECT id FROM rules WHERE user_id = :uid AND lower(name) = :name AND deleted_at IS NULL
    DB-->>Service: Không tìm thấy trùng lặp (None)
    
    Service->>Service: Kiểm tra activation_mode & glob_patterns
    Service->>DB: INSERT INTO rules (id, user_id, name, content, scope, ...) VALUES (...)
    DB-->>Service: Bản ghi vừa tạo (Record Created)
    
    Service->>Service: Ghi Audit Log (Action: CREATE_RULE)
    Service-->>Router: Trả về Rule Entity
    Router-->>UI: HTTP 201 Created (JSON Response)
    UI->>UI: Hiển thị Toast thông báo xanh lá & reset isDirty
    UI-->>User: Điều hướng về màn hình Thư viện Rules (/rules)
```

---

## 6. Biểu Đồ 06: Sequence Diagram — Tải Danh Sách Rules (`RUL-DIA-06`)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người Dùng
    participant UI as RulesPage.tsx
    participant API as GET /api/v1/rules
    participant Service as RuleService
    participant DB as PostgreSQL

    User->>UI: Truy cập đường dẫn /rules
    UI->>UI: Hiển thị giao diện Loading Skeleton
    UI->>API: GET /api/v1/rules?page=1&limit=20&scope=all (Header: JWT)
    
    alt Token không hợp lệ / Hết hạn
        API-->>UI: HTTP 401 Unauthorized
        UI-->>User: Tự động chuyển hướng về trang /login
    else Token hợp lệ
        API->>Service: list_rules(current_user.id, params)
        Service->>DB: SELECT * FROM rules WHERE (user_id = :uid OR scope = 'system') AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 20 OFFSET 0
        DB-->>Service: Danh sách 15 bản ghi + Total count
        Service->>Service: Tính toán associated_projects_count cho từng rule
        Service-->>API: PaginatedRuleResponse
        API-->>UI: HTTP 200 OK (Payload JSON)
        
        alt Danh sách có dữ liệu
            UI-->>User: Hiển thị danh sách thẻ Card View với đầy đủ Badge, Switch Status
        else Danh sách trống hoàn toàn
            UI-->>User: Hiển thị Empty State với nút "Tạo Quy Tắc Đầu Tiên"
        end
    end
```

---

## 7. Biểu Đồ 07: Sequence Diagram — Tạo Mới Rule (`RUL-DIA-07`)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người Dùng
    participant UI as RuleEditor.tsx
    participant API as POST /api/v1/rules
    participant Service as RuleService
    participant DB as PostgreSQL

    User->>UI: Nhập thông tin quy tắc & Bấm "Lưu"
    UI->>API: POST /api/v1/rules (Payload: name, content, activation_mode, ...)
    
    API->>Service: create_rule(user_id, payload)
    Service->>DB: Check trùng tên: WHERE user_id = :uid AND lower(name) = :name AND deleted_at IS NULL
    
    alt Tên đã tồn tại trong tài khoản
        DB-->>Service: Tìm thấy bản ghi trùng (Existing Rule)
        Service-->>API: Raise HTTPException(409, "RULE_NAME_ALREADY_EXISTS")
        API-->>UI: HTTP 409 Conflict
        UI-->>User: Hiển thị cảnh báo đỏ dưới ô Tên: "Tên quy tắc đã tồn tại"
    else Tên hợp lệ
        DB-->>Service: Không trùng lặp
        Service->>Service: Cưỡng chế scope = 'user' (Chống Scope Escalation)
        Service->>DB: INSERT INTO rules (...) VALUES (...)
        DB-->>Service: Commit thành công (New Rule UUID)
        Service-->>API: RuleResponse (version=1, is_editable=true)
        API-->>UI: HTTP 201 Created
        UI-->>User: Toast thành công & Chuyển hướng sang danh sách
    end
```

---

## 8. Biểu Đồ 08: Sequence Diagram — Cập Nhật Rule & Xử Lý Xung Đột (`RUL-DIA-08`)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người Dùng
    participant UI as RuleEditor.tsx
    participant API as PUT /api/v1/rules/{id}
    participant Service as RuleService
    participant DB as PostgreSQL

    User->>UI: Sửa nội dung & Bấm "Lưu Thay Đổi" (Form version = 2)
    UI->>API: PUT /api/v1/rules/{id} (Payload: content, version=2, ...)
    
    API->>Service: update_rule(user_id, rule_id, payload)
    Service->>DB: SELECT * FROM rules WHERE id = :id AND deleted_at IS NULL
    DB-->>Service: Rule record hiện tại trong CSDL
    
    alt Rule thuộc System (scope == 'system')
        Service-->>API: Raise HTTPException(403, "CANNOT_MODIFY_SYSTEM_RULE")
        API-->>UI: HTTP 403 Forbidden
        UI-->>User: Thông báo: "Không có quyền sửa đổi Quy tắc Hệ thống"
    else Rule thuộc người khác (rule.user_id != user_id)
        Service-->>API: Raise HTTPException(404, "RULE_NOT_FOUND") [Anti-IDOR]
        API-->>UI: HTTP 404 Not Found
        UI-->>User: Báo lỗi không tìm thấy quy tắc
    else Phát hiện xung đột phiên (DB version = 3, Client version = 2)
        Service-->>API: Raise HTTPException(409, "CONCURRENT_UPDATE_CONFLICT")
        API-->>UI: HTTP 409 Conflict (current_version: 3)
        UI-->>User: Modal cảnh báo xung đột: "Dữ liệu đã bị sửa bởi phiên khác. Nạp lại?"
    else Hợp lệ (DB version == Client version == 2)
        Service->>DB: UPDATE rules SET content = :new_c, version = 3, updated_at = NOW() WHERE id = :id
        DB-->>Service: Update OK
        Service-->>API: RuleResponse (version=3)
        API-->>UI: HTTP 200 OK
        UI->>UI: Reset isDirty = false
        UI-->>User: Toast thành công: "Đã lưu thay đổi quy tắc"
    end
```

---

## 9. Biểu Đồ 09: Sequence Diagram — Xóa Mềm Rule & Kiểm Tra Dự Án Sử Dụng (`RUL-DIA-09`)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người Dùng
    participant UI as RulesTable.tsx
    participant API as DELETE /api/v1/rules/{id}
    participant Service as RuleService
    participant DB as PostgreSQL

    User->>UI: Bấm biểu tượng Thùng Rác (Xóa Rule)
    UI->>API: GET /api/v1/rules/{id}/projects
    API->>DB: SELECT p.id, p.name FROM projects p JOIN project_rules pr ON p.id = pr.project_id WHERE pr.rule_id = :id
    DB-->>API: Danh sách 2 dự án đang liên kết
    API-->>UI: HTTP 200 OK (Projects: [Alpha, Beta])
    
    alt Có dự án đang sử dụng
        UI-->>User: Modal cảnh báo màu vàng: "Quy tắc đang dùng trong 2 dự án. Gỡ liên kết để xóa?"
        User->>UI: Xác nhận "Gỡ liên kết và Xóa"
        UI->>API: DELETE /api/v1/rules/{id}?force=true
    else Không có dự án nào sử dụng
        UI-->>User: Modal xác nhận xóa thông thường
        User->>UI: Xác nhận "Xóa"
        UI->>API: DELETE /api/v1/rules/{id}?force=false
    end

    API->>Service: delete_rule(user_id, rule_id, force)
    Service->>DB: Check quyền sở hữu (rule.user_id == user_id)
    Service->>DB: UPDATE rules SET deleted_at = NOW(), status = 'archived' WHERE id = :id
    Service->>DB: UPDATE project_rules SET is_enabled = false WHERE rule_id = :id
    DB-->>Service: Commit Soft Delete Transaction
    Service-->>API: Trả về kết quả xóa thành công
    API-->>UI: HTTP 200 OK (detached_count: 2)
    UI->>UI: Gỡ dòng Rule khỏi bảng hiển thị
    UI-->>User: Toast xanh lá: "Đã xóa quy tắc thành công"
```

---

## 10. Biểu Đồ 10: State Diagram — Vòng Đời Dữ Liệu Rule & Trạng Thái Biểu Mẫu UI (`RUL-DIA-10`)

```mermaid
stateDiagram-v2
    [*] --> FormPristine: Mở Form Soạn Thảo (/rules/new hoặc /rules/:id)
    
    state "Biểu Mẫu UI (Client Form States)" as UIStates {
        FormPristine: Chưa Sửa Đổi (isDirty = false)
        FormDirty: Đang Soạn Thảo (isDirty = true)
        FormValidating: Kiểm Tra Ràng Buộc Hợp Lệ
        FormSubmitting: Đang Gửi API (Loading Spinner)
        
        FormPristine --> FormDirty: Người dùng gõ ký tự đầu tiên
        FormDirty --> FormDirty: Tiếp tục nhập / Đổi tab Preview
        FormDirty --> FormValidating: Nhấn nút "Lưu"
        FormValidating --> FormDirty: Lỗi Validation (Tên rỗng / >10k ký tự)
        FormValidating --> FormSubmitting: Dữ liệu hợp lệ
        FormSubmitting --> FormDirty: API trả lỗi (409 Conflict / 500)
    }

    state "Vòng Đời Dữ Liệu CSDL (Database Entity Lifecycle)" as DBStates {
        Active: Đang Hoạt Động (status = 'active')
        Inactive: Tạm Ngưng (status = 'inactive')
        Archived: Đã Lưu Trữ / Xóa Mềm (status = 'archived', deleted_at IS NOT NULL)

        Active --> Inactive: Người dùng gạt Switch sang Tắt (PATCH /status)
        Inactive --> Active: Người dùng gạt Switch sang Bật (PATCH /status)
        Active --> Archived: Người dùng bấm Xóa (DELETE soft-delete)
        Inactive --> Archived: Người dùng bấm Xóa (DELETE soft-delete)
    }

    FormSubmitting --> Active: API 201 Created / 200 OK
    Archived --> [*]: Ẩn khỏi thư viện người dùng
```

---

## 11. Biểu Đồ 11: Entity-Relationship Diagram (ERD) (`RUL-DIA-11`)

```mermaid
erDiagram
    USERS ||--o{ RULES : "sở hữu (owns)"
    USERS ||--o{ PROJECTS : "tạo ra (creates)"
    PROJECTS ||--o{ PROJECT_RULES : "liên kết (binds)"
    RULES ||--o{ PROJECT_RULES : "được áp dụng (applied_to)"

    USERS {
        varchar(36) id PK "UUID người dùng"
        varchar(100) username "Tên đăng nhập"
        varchar(255) email "Email tài khoản"
        varchar(50) role "Vai trò: user / admin"
        timestamp created_at "Thời điểm tạo"
    }

    RULES {
        varchar(36) id PK "UUID quy tắc"
        varchar(36) user_id FK "Chủ sở hữu (NULL nếu System Rule)"
        varchar(100) name "Tên quy tắc (Unique per user)"
        varchar(500) description "Mô tả mục đích"
        text content "Nội dung Markdown (max 10k ký tự)"
        varchar(20) scope "Phạm vi: system / user / project"
        varchar(20) activation_mode "always_on / model_decision / glob / manual"
        jsonb glob_patterns "Danh sách file patterns"
        jsonb tags "Mảng tags phân loại"
        integer priority "Trọng số ưu tiên (0 - 100)"
        varchar(20) status "active / inactive / archived"
        integer version "Số phiên bản (Optimistic lock)"
        timestamp created_at "Ngày tạo"
        timestamp updated_at "Ngày sửa gần nhất"
        timestamp deleted_at "Thời điểm xóa mềm (NULL nếu active)"
    }

    PROJECTS {
        varchar(36) id PK "UUID dự án"
        varchar(36) user_id FK "Chủ sở hữu dự án"
        varchar(100) name "Tên dự án"
        varchar(20) status "active / stop / deactive"
        timestamp created_at "Ngày tạo"
    }

    PROJECT_RULES {
        varchar(36) id PK "UUID liên kết"
        varchar(36) project_id FK "Khóa ngoại tới projects"
        varchar(36) rule_id FK "Khóa ngoại tới rules"
        boolean is_enabled "Bật/tắt trong dự án cụ thể"
        integer custom_priority "Ghi đè ưu tiên nếu cần"
        timestamp bound_at "Thời điểm liên kết"
    }
```

---

## 12. Biểu Đồ 12: Component & Architecture Diagram (`RUL-DIA-12`)

```mermaid
flowchart TB
    subgraph Frontend["Tầng Giao Diện (ai-frontend)"]
        direction TB
        RulesNav["Navigation Sidebar (/rules)"]
        
        subgraph Views["Các Màn Hình (Views)"]
            RulesLibView["Rules Library Page (/rules)<br>- RulesTable / CardGrid<br>- FilterToolbar & SearchBar<br>- 6 UI States Handler"]
            RuleEditView["Rule Editor Page (/rules/:id)<br>- Markdown Editor + Live Preview<br>- Activation Mode Config<br>- Dirty State Guard"]
        end
        
        subgraph FE_Services["Frontend API Client"]
            RuleAPIClient["ruleApi.ts (Axios + React Query)"]
        end
        
        RulesNav --> RulesLibView
        RulesLibView --> RuleEditView
        RulesLibView --> RuleAPIClient
        RuleEditView --> RuleAPIClient
    end

    subgraph Backend["Tầng Máy Chủ (ai-backend)"]
        direction TB
        
        subgraph Routers["API Routers [PROPOSED]"]
            RuleRouter["routers/rules.py<br>- JWT Auth Depends<br>- Pydantic v2 Schemas"]
        end
        
        subgraph Services["Service Layer [PROPOSED]"]
            RuleService["services/rule_service.py<br>- Business Rules Enforcement<br>- Anti-IDOR Object Permission<br>- Optimistic Lock Validator"]
        end
        
        subgraph Repos["Data Access Layer"]
            RuleRepo["SQLModel / SQLAlchemy ORM"]
        end
        
        RuleAPIClient -->|HTTPS RESTful| RuleRouter
        RuleRouter --> RuleService
        RuleService --> RuleRepo
    end

    subgraph Persistence["Tầng Lưu Trữ (PostgreSQL)"]
        DB_Rules[(Bảng: rules)]
        DB_ProjRules[(Bảng: project_rules)]
        RuleRepo --> DB_Rules
        RuleRepo --> DB_ProjRules
    end

    subgraph Runtime_Future["Tầng Thực Thi Chatbot [PROPOSED / FUTURE INTEGRATION]"]
        ChatEngine["services/chat_service.py (Chat Runner)"]
        ResolverEngine["Rule Resolver Engine<br>- Progressive Disclosure<br>- Priority Precedence<br>- Token Budget Guard"]
        
        ChatEngine -.->|Truy vấn Rules hợp lệ| ResolverEngine
        ResolverEngine -.->|Đọc dữ liệu| DB_ProjRules
        ResolverEngine -.->|Đọc dữ liệu| DB_Rules
    end
```

---

## 13. Biểu Đồ 13: Security Flow — Kiểm Soát Quyền Truy Cập & Anti-IDOR (`RUL-DIA-13`)

```mermaid
flowchart TD
    Start([Yêu cầu từ Client gửi tới API Rule]) --> CheckToken{Bearer JWT hợp lệ?}
    
    CheckToken -- Không hợp lệ / Hết hạn --> Return401[Trả về HTTP 401 Unauthorized] --> EndFail([Chặn])
    
    CheckToken -- Hợp lệ --> ExtractUser[Giải mã payload JWT: Lấy current_user.id và role]
    
    ExtractUser --> CheckAction{Thao tác yêu cầu?}
    
    CheckAction -- "Tạo mới (POST)" --> CheckScopeInput{Body scope == 'system'?}
    CheckScopeInput -- Đúng --> CheckAdminRole{role == 'admin'?}
    CheckAdminRole -- Sai --> ForceUserScope["Tự động ép scope = 'user' (Chống Scope Escalation)"] --> ProceedWrite[Tiến hành ghi dữ liệu]
    CheckAdminRole -- Đúng --> ProceedWrite
    CheckScopeInput -- Sai --> ProceedWrite
    
    CheckAction -- "Đọc / Sửa / Xóa (GET, PUT, DELETE)" --> QueryDB[Truy vấn Rule trong CSDL theo ID]
    QueryDB --> CheckExist{Bản ghi tồn tại & deleted_at IS NULL?}
    CheckExist -- Không --> Return404[Trả về HTTP 404 Not Found] --> EndFail
    
    CheckExist -- Có --> CheckRuleScope{Rule scope?}
    
    CheckRuleScope -- "system" --> CheckWriteOp{Yêu cầu ghi (PUT/DELETE)?}
    CheckWriteOp -- Đúng --> CheckAdminWrite{role == 'admin'?}
    CheckAdminWrite -- Sai --> Return403[Trả về HTTP 403 Forbidden: Cấm sửa System Rule] --> EndFail
    CheckAdminWrite -- Đúng --> ProceedWrite
    CheckWriteOp -- Sai (Chỉ đọc GET) --> Return200[Cho phép đọc dữ liệu] --> EndOK([Hoàn thành])
    
    CheckRuleScope -- "user" --> CheckOwner{rule.user_id == current_user.id?}
    CheckOwner -- Sai (IDOR Attack) --> Return404AntiIDOR["Trả về HTTP 404 Not Found (Ẩn thông tin UUID)"] --> EndFail
    CheckOwner -- Đúng --> ProceedWrite --> Return200
```

---

## 14. Biểu Đồ 14: Rule Activation & Resolution Flow (Proposed Runtime) (`RUL-DIA-14`)

```mermaid
flowchart TD
    Start([Bắt đầu lượt Chat mới trong Project]) --> FetchBound["Bước 1: Quét các Rule được kích hoạt cho Project<br>(project_rules WHERE project_id = :id AND is_enabled = true)"]
    
    FetchBound --> FetchSystem["Bước 2: Nạp các System Mandatory Rules toàn cầu<br>(rules WHERE scope = 'system' AND deleted_at IS NULL)"]
    
    FetchSystem --> MergeList[Tổng hợp danh sách các Rule ứng viên]
    
    MergeList --> LoopRules{Lặp qua từng Rule để kiểm tra Activation Mode}
    
    LoopRules -- "Mode = always_on" --> AddFullList[Thêm toàn văn nội dung vào danh sách nạp đầy đủ]
    
    LoopRules -- "Mode = glob" --> CheckGlobMatch{Khớp file context đang thảo luận?}
    CheckGlobMatch -- Khớp --> AddFullList
    CheckGlobMatch -- Không khớp --> SkipRule[Bỏ qua lượt này]
    
    LoopRules -- "Mode = model_decision" --> AddSummaryList["Progressive Disclosure: Chỉ đưa Tên & Mô Tả<br>vào bảng Index để LLM tự quyết định đọc thêm"]
    
    LoopRules -- "Mode = manual" --> SkipRule
    
    AddFullList --> SortPriority["Bước 3: Sắp xếp theo priority ASC<br>(Nguyên lý Recency: Quan trọng nhất nằm cuối)"]
    
    SortPriority --> CheckBudget{Tổng token Rules > 2.000 tokens?}
    CheckBudget -- Vượt ngân sách --> PruneLowPriority["Cắt tỉa các Rule có priority thấp hơn<br>hoặc chuyển sang bản tóm tắt"] --> PackPrompt
    CheckBudget -- Nằm trong hạn ngạch --> PackPrompt["Bước 4: Đóng gói khối <active_rules> vào Context Window"]
    
    AddSummaryList --> PackPrompt
    
    PackPrompt --> SendLLM([Gửi toàn bộ Prompt tới Model Gateway LLM])
```

---

## 15. Biểu Đồ 15: Error Handling & Recovery Flow (`RUL-DIA-15`)

```mermaid
flowchart TD
    Req[Yêu cầu API từ Client] --> Interceptor[HTTP Axios Interceptor]
    
    Interceptor --> ExecuteAPI{Kết quả gọi API?}
    
    ExecuteAPI -- "200 / 201" --> SuccessToast[Toast Thành Công & Cập nhật State] --> Finish([Kết thúc])
    
    ExecuteAPI -- "400 Bad Request" --> Err400{Có dự án đang dùng?}
    Err400 -- Đúng --> ShowRefModal[Modal Cảnh Báo Dự Án Đang Dùng: Yêu cầu xác nhận force=true]
    Err400 -- Sai --> ShowToastErr[Hiển thị Toast lỗi yêu cầu không hợp lệ]
    
    ExecuteAPI -- "401 Unauthorized" --> Err401[Xóa Token trong Storage -> Redirect /login]
    
    ExecuteAPI -- "403 Forbidden" --> Err403[Toast Cảnh Báo: Bạn không có quyền thao tác trên tài nguyên này]
    
    ExecuteAPI -- "404 Not Found" --> Err404[Toast Lỗi: Quy tắc không tồn tại hoặc đã bị xóa]
    
    ExecuteAPI -- "409 Conflict" --> Err409{Loại xung đột?}
    Err409 -- "Trùng tên" --> FieldHighlight[Tô viền đỏ ô Tên & Hiện câu lỗi trùng lặp]
    Err409 -- "Xung đột ghi đè" --> ConcurrencyModal[Modal: Dữ liệu đã thay đổi ở phiên khác. Tải lại?]
    
    ExecuteAPI -- "422 Unprocessable Entity" --> Err422[Hiển thị lỗi Validation chi tiết từ Pydantic]
    
    ExecuteAPI -- "500 / Network Error" --> Err500[Hiển thị Error Boundary / Banner: Lỗi hệ thống, vui lòng thử lại]
```

---

## 16. Biểu Đồ 16: Traceability & Feature Dependency Diagram (`RUL-DIA-16`)

```mermaid
flowchart LR
    subgraph Requirements["Yêu Cầu (Requirements)"]
        FR01["RUL-FR-001: Thư Viện Rules"]
        FR04["RUL-FR-004: Nhân Bản Rule"]
        FR05["RUL-FR-005: Xóa Mềm & Ràng Buộc"]
        FR06["RUL-FR-006: Tạo Mới Rule"]
        FR07["RUL-FR-007: Soạn Thảo & Cập Nhật"]
        FR10["RUL-FR-010: Dirty State Guard"]
    end

    subgraph BusinessRules["Quy Tắc Nghiệp Vụ (Rules)"]
        BR01["RUL-BR-001: Tên Duy Nhất"]
        BR02["RUL-BR-002: Bất Biến System"]
        BR03["RUL-BR-003: Anti-IDOR"]
        BR06["RUL-BR-006: Soft Delete"]
        BR09["RUL-BR-009: Dirty Guard"]
        BR11["RUL-BR-011: Concurrency Lock"]
    end

    subgraph Architecture["Kiến Trúc & API (Design)"]
        API01["GET /api/v1/rules"]
        API02["POST /api/v1/rules"]
        API04["PUT /api/v1/rules/:id"]
        API06["POST /api/v1/rules/:id/clone"]
        API07["DELETE /api/v1/rules/:id"]
        DBTable[(Bảng rules & project_rules)]
    end

    subgraph Diagrams["Biểu Đồ Minh Họa (Mermaid)"]
        DIA05["RUL-DIA-05: Swimlane E2E"]
        DIA07["RUL-DIA-07: Sequence Create"]
        DIA08["RUL-DIA-08: Sequence Update"]
        DIA09["RUL-DIA-09: Sequence Delete"]
        DIA11["RUL-DIA-11: ERD"]
    end

    subgraph TestCases["Kiểm Thử (QA Test Cases)"]
        TC01["RUL-TC-001: List Rules P0"]
        TC04["RUL-TC-004: Duplicate Name P0"]
        TC06["RUL-TC-006: Anti-IDOR P0"]
        TC08["RUL-TC-008: Concurrency 409 P1"]
        TC10["RUL-TC-010: Delete In-Use P0"]
        TC12["RUL-TC-012: Dirty Guard P0"]
    end

    FR01 --> BR03 --> API01 --> DIA05 --> TC01
    FR06 --> BR01 --> API02 --> DIA07 --> TC04
    FR07 --> BR11 --> API04 --> DIA08 --> TC08
    FR04 --> BR02 --> API06 --> DBTable --> TC06
    FR05 --> BR06 --> API07 --> DIA09 --> TC10
    FR10 --> BR09 --> DIA05 --> TC12
```
