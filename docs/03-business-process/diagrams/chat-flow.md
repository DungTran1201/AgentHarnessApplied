# SƠ ĐỒ QUY TRÌNH GỬI TIN NHẮN & STREAMING CHAT (CHAT FLOW)
## BP-CHAT-001 [PROC-008] — Send Message & SSE Streaming Interaction

---

## 1. Sơ Đồ Phân Làn Trách Nhiệm Toàn Diện (End-to-End Swimlane Sequence)

```mermaid
sequenceDiagram
    autonumber
    actor User as ACT-02: User
    participant UI as ai-frontend (Next.js)
    participant Gateway as Ingress (Nginx)
    participant API as ai-backend (FastAPI)
    participant DB as PostgreSQL 16
    participant LLM as LLM Orchestrator (BP-AI-001)

    User->>UI: Nhập câu hỏi (1 - 4,000 ký tự) & Nhấn Gửi
    UI->>UI: Kiểm tra độ dài <= 4000 ký tự (BR-003)
    UI->>UI: Hiển thị ngay tin nhắn User trong khung chat (Optimistic UI)
    
    UI->>Gateway: POST /api/v1/chat/conversations/{conv_id}/stream (kèm Cookie)
    Gateway->>Gateway: Kiểm tra Rate Limit Ingress (10 req/s)
    Gateway->>API: Proxy streaming request
    
    API->>API: Backend Rate Limit check (60 req/min/IP)
    API->>API: Xác thực JWT Cookie & Quyền sở hữu conv_id (BR-001, BR-002)
    API->>API: Kiểm tra độ dài nội dung qua Pydantic (BR-003)
    
    API->>DB: INSERT INTO messages (conv_id, role='user', content)
    DB-->>API: Bản ghi tin nhắn người dùng được lưu
    
    opt Nếu là tin nhắn đầu tiên (BR-004)
        API->>DB: UPDATE conversations SET title = SUBSTRING(prompt, 1, 30)
    end

    API->>DB: SELECT * FROM messages WHERE conv_id = :id ORDER BY created_at DESC LIMIT 20
    DB-->>API: 20 tin nhắn gần nhất làm ngữ cảnh (Sliding Context)
    
    API->>LLM: Gọi stream_chat(prompt, context)
    API-->>Gateway: HTTP 200 OK + Content-Type: text/event-stream
    Gateway-->>UI: Thiết lập luồng Server-Sent Events (SSE)
    
    loop Truyền nhận từng Token (Streaming Loop)
        LLM-->>API: Yield Token ("Xin", " chào", " bạn", ...)
        API-->>Gateway: data: {"token": "...", "status": "streaming"}\n\n
        Gateway-->>UI: Event SSE data
        UI->>UI: Cập nhật ký tự lên khung chat theo thời gian thực
    end
    
    LLM-->>API: Hoàn tất sinh văn bản (Done event)
    API->>DB: INSERT INTO messages (conv_id, role='assistant', full_content)
    DB-->>API: Tin nhắn Trợ lý ảo được lưu bền vững
    
    API-->>Gateway: data: {"status": "done"}\n\n
    Gateway-->>UI: Event kết thúc SSE
    UI->>UI: Đóng luồng stream & Render Markdown + Highlight code (FR-013)
```

---

## 2. Sơ Đồ Xử Lý Dừng Sinh Phản Hồi (Client Abort Flow)

```mermaid
sequenceDiagram
    autonumber
    actor User as ACT-02: User
    participant UI as ai-frontend
    participant API as ai-backend
    participant DB as PostgreSQL 16
    participant LLM as LLM Orchestrator

    User->>UI: Bấm nút "Dừng tạo phản hồi" (Stop Generation)
    UI->>UI: Đóng kết nối ReadableStream / EventSource
    API->>API: Bắt sự kiện ClientDisconnect / ngắt socket
    API->>LLM: Hủy bỏ generator / đóng kết nối tới nhà cung cấp AI
    API->>DB: INSERT INTO messages (role='assistant', content=partial_content + ' [Bị ngắt]')
    DB-->>API: Lưu phần nội dung đã thu thập được
    UI-->>User: Khung chat dừng stream và hiển thị trạng thái đã dừng
```
