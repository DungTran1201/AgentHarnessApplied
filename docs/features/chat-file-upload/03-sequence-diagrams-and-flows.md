# 03 - Sơ đồ Tuần tự và Luồng Thực thi (Sequence Diagrams & Flows)

## 1. Luồng Upload Tệp và Gửi Tin nhắn Chat (Chat Attachment Flow)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng (Browser)
    participant Composer as MessageComposer / Uploader
    participant API as Attachments API (/upload)
    participant Storage as AttachmentStorage Service
    participant Disk as Local Protected Storage (.dat)
    participant DB as SQLite Database
    participant ChatAPI as Chat Stream API
    participant Agent as LangChain / Agent Pipeline
    participant LLM as Provider Model (Gemini/OpenAI)

    User->>Composer: Kéo-thả hoặc chọn tệp cục bộ (Local Storage)
    Composer->>Composer: Kiểm tra kích thước (<20MB) & loại tệp
    Composer->>API: POST /api/v1/attachments/upload (multipart)
    
    API->>Storage: Validate File (Magic bytes sniffing & Anti-Script)
    alt Tệp thực thi (.exe, .bat, .ps1, ...)
        Storage-->>API: Reject EXECUTABLE_FILE_BLOCKED
        API-->>Composer: 422 Unprocessable Entity
        Composer-->>User: Hiển thị lỗi từ chối tệp nguy hiểm
    else Tệp hợp lệ
        Storage->>Disk: Lưu file dưới dạng att_{uuid}.dat (ngoài public)
        Storage->>Storage: Trích xuất nội dung văn bản / PDF nếu có
        Storage->>DB: INSERT INTO attachments (status=READY)
        DB-->>Storage: Đã lưu bản ghi
        Storage-->>API: Trả về AttachmentItem (id, mime, size, urls)
        API-->>Composer: 200 OK kèm attachment_id
        Composer-->>User: Hiển thị chip tệp "Ready"
    end

    User->>Composer: Nhập prompt và bấm Gửi (Enter)
    Composer->>ChatAPI: POST /conversations/{id}/messages/stream<br/>{content, model, attachments: [att_id]}
    
    ChatAPI->>DB: Verify User Ownership (Anti-IDOR) & Status = READY
    ChatAPI->>DB: UPDATE attachments SET message_id, conversation_id
    ChatAPI->>Agent: astream_agent(prompt, attachments=[...])
    
    alt Tệp là Ảnh (image/*)
        Agent->>Storage: Đọc file bytes & Encode Base64
        Agent->>LLM: HumanMessage với text và image_url parts
    else Tệp là Văn bản / PDF
        Agent->>Storage: Đọc extracted_preview / trích xuất an toàn
        Agent->>LLM: Prompt kèm khối văn bản: "--- [Tài liệu đính kèm: ...] ---"
    end

    LLM-->>Agent: SSE Stream Token Chunks
    Agent-->>ChatAPI: Yield Token Chunks
    ChatAPI-->>Composer: Server-Sent Events (event: chunk)
    Composer-->>User: Render câu trả lời theo thời gian thực (Markdown & Code)
```

---

## 2. Luồng Quản lý Tài nguyên Thư viện (Library Asset Flow)

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Người dùng / Tác giả
    participant UI as LibraryAssetManager Component
    participant API as Attachments API
    participant DB as SQLite Database
    participant Storage as AttachmentStorage Engine

    Note over Admin,UI: Áp dụng cho cả Skills Library và System Prompt Library
    Admin->>UI: Mở tab Resources (Skill) hoặc Edit (Prompt)
    UI->>API: GET /api/v1/attachments/?context_type=skill&context_id={id}
    API->>DB: SELECT * FROM attachments WHERE context_type=? AND context_id=? AND user_id=?
    DB-->>API: Danh sách attachments
    API-->>UI: 200 OK (items: [...])
    UI-->>Admin: Hiển thị bảng tệp đính kèm (Tên, Kích thước, Loại, Thao tác)

    Admin->>UI: Chọn tệp mới để đính kèm
    UI->>API: POST /api/v1/attachments/upload (context_type, context_id)
    API->>Storage: Lưu đĩa và trích xuất preview
    API->>DB: INSERT INTO attachments (context_type, context_id)
    API-->>UI: 200 OK (tệp mới READY)
    UI-->>Admin: Cập nhật danh sách tệp đính kèm ngay lập tức

    Admin->>UI: Bấm Tải xuống (Download)
    UI->>API: GET /api/v1/attachments/{id}/download
    API->>DB: Kiểm tra quyền sở hữu (Anti-IDOR)
    API->>Storage: Đọc file .dat và trả về Content-Disposition: attachment
    Storage-->>Admin: Trình duyệt tải về tệp gốc an toàn

    Admin->>UI: Bấm Gỡ bỏ (Detach / Delete)
    UI->>API: DELETE /api/v1/attachments/{id}
    API->>DB: Kiểm tra quyền sở hữu & DELETE/SOFT_DELETE
    API->>Storage: Xóa file .dat trên đĩa
    API-->>UI: 200 OK {"status": "deleted"}
    UI-->>Admin: Tệp biến mất khỏi danh sách tài nguyên
```

---

## 3. Luồng Đính kèm Tệp trong Project Workflow (Project Chat Flow)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng Workflow
    participant FloatUI as FloatingProjectChat Widget
    participant ProjAPI as Project Chat API (/projects/{id}/chat)
    participant Graph as Project Graph Engine
    participant Agent as LangChain Agent
    participant LLM as Target Model Node

    User->>FloatUI: Chọn tệp đính kèm trong Project Chat
    FloatUI->>FloatUI: Upload tệp với context_type = "project_chat"
    FloatUI-->>User: Tệp sẵn sàng (Chip READY)
    
    User->>FloatUI: Bấm Gửi tin nhắn
    FloatUI->>FloatUI: Kiểm tra giới hạn số từ (Web Input Max Words Limit)
    alt Vượt quá giới hạn số từ
        FloatUI-->>User: Hiển thị ErrorBanner: Word count exceeds limit
    else Nằm trong giới hạn cho phép
        FloatUI->>ProjAPI: POST /api/v1/projects/{id}/chat<br/>{message, conversation_id, attachments}
        ProjAPI->>Graph: Nạp cấu hình Project Graph (System Prompt Node, Model Node, Skills)
        Graph->>Graph: Xác minh tính hợp lệ của đồ thị pipeline
        ProjAPI->>Agent: Gọi LLM với Model Node được cấu hình trong Graph
        Agent->>LLM: Gửi Prompt + Multimodal Image Parts / Extracted Docs
        LLM-->>ProjAPI: Stream token chunks
        ProjAPI-->>FloatUI: SSE Stream response
        FloatUI-->>User: Hiển thị phản hồi từ Project Pipeline
    end
```
