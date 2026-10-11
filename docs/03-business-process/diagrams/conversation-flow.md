# SƠ ĐỒ QUY TRÌNH QUẢN LÝ CUỘC TRÒ CHUYỆN (CONVERSATION FLOWS)
## BP-CONV-001..004 [PROC-004..007] — Conversation Lifecycle Management

---

## 1. Sơ Đồ Khởi Tạo Cuộc Trò Chuyện Mới (BP-CONV-001 [PROC-004])

```mermaid
sequenceDiagram
    autonumber
    actor User as ACT-02: User
    participant UI as ai-frontend
    participant API as ai-backend
    participant DB as PostgreSQL 16

    User->>UI: Bấm "+ Đoạn chat mới" trên Sidebar
    UI->>API: POST /api/v1/conversations (kèm JWT Cookie)
    API->>API: Xác thực JWT -> Trích xuất current_user_id
    API->>DB: INSERT INTO conversations (id, user_id, title) VALUES (uuid, current_user_id, 'Cuộc trò chuyện mới')
    DB-->>API: Trả về bản ghi cuộc trò chuyện
    API-->>UI: HTTP 201 Created (Conversation Entity)
    UI->>UI: Thêm conversation vào đầu danh sách Sidebar & Active khung chat
```

---

## 2. Sơ Đồ Nạp Lịch Sử & Kiểm Tra Quyền Sở Hữu (BP-CONV-002 [PROC-005] - Anti-IDOR)

```mermaid
sequenceDiagram
    autonumber
    actor User as ACT-02: User
    participant UI as ai-frontend
    participant API as ai-backend
    participant DB as PostgreSQL 16

    User->>UI: Chọn một cuộc trò chuyện trên Sidebar
    UI->>API: GET /api/v1/conversations/{conv_id}/messages (kèm Cookie)
    API->>API: Trích xuất current_user_id từ Cookie
    API->>DB: SELECT * FROM conversations WHERE id = :conv_id AND user_id = :current_user_id
    DB-->>API: Kết quả kiểm tra quyền sở hữu
    
    alt Không tìm thấy HOẶC không phải chủ sở hữu (IDOR Check)
        API-->>UI: HTTP 404 Not Found ("Không tìm thấy cuộc trò chuyện")
        UI-->>User: Cảnh báo: Bạn không có quyền truy cập
    else Xác nhận đúng chủ sở hữu
        API->>DB: SELECT * FROM messages WHERE conversation_id = :conv_id ORDER BY created_at ASC
        DB-->>API: Danh sách tin nhắn
        API-->>UI: HTTP 200 OK (Danh sách messages)
        UI->>UI: Render lịch sử tin nhắn lên màn hình
    end
```

---

## 3. Sơ Đồ Đổi Tên Tự Động & Thủ Công (BP-CONV-003 [PROC-006])

```mermaid
flowchart TD
    StartRename{Loại thao tác đổi tên?}
    
    StartRename -- Tự động (BR-004) --> CheckMsg[Nhận tin nhắn đầu tiên của User]
    CheckMsg --> CheckTitleDefault{Tiêu đề hiện tại là<br/>'Cuộc trò chuyện mới'?}
    CheckTitleDefault -- Đúng --> Extract30[Cắt 30 ký tự đầu của prompt]
    Extract30 --> UpdateDBAuto[(Cập nhật title vào PostgreSQL)]
    UpdateDBAuto --> SyncUIAuto[Đồng bộ tiêu đề mới lên Sidebar]
    CheckTitleDefault -- Sai / Đã đổi tên --> KeepTitle[Giữ nguyên tiêu đề hiện tại]
    
    StartRename -- Thủ công --> UserClick[User bấm Sửa tên trên Sidebar]
    UserClick --> InputTitle[User nhập tên mới 1-255 ký tự]
    InputTitle --> SendPatch[Gửi PATCH /api/v1/conversations/:id]
    SendPatch --> VerifyOwner{Đúng chủ sở hữu user_id?}
    VerifyOwner -- Đúng --> UpdateDBManual[(Cập nhật title vào PostgreSQL)]
    UpdateDBManual --> SyncUIManual[Hiển thị tên mới trên Sidebar]
    VerifyOwner -- Sai --> Return403[HTTP 403 / 404: Từ chối]

    style StartRename fill:#2b6cb0,stroke:#2c5282,color:#fff
    style SyncUIAuto fill:#2f855a,stroke:#276749,color:#fff
    style SyncUIManual fill:#2f855a,stroke:#276749,color:#fff
    style Return403 fill:#c53030,stroke:#9b2c2c,color:#fff
```
