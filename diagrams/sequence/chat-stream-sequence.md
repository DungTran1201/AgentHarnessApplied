# Sơ Đồ Tuần Tự: Truyền Luồng Chat Thời Gian Thực (Streaming Chat Sequence Diagram)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-SEQ-002` |
| **Mã Kịch Bản** | `SEQ-003` |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/09-behavior/sequence-diagrams.md](file:///c:/Users/PC/Project/ai-chan/docs/09-behavior/sequence-diagrams.md), [docs/06-architecture/ADR/ADR-004-sse-streaming-protocol.md](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-004-sse-streaming-protocol.md) |
| **Mục Đích** | Mô tả chi tiết trình tự mở kết nối Server-Sent Events, truyền nhận từng chunk token, và hoàn tất lưu trữ phản hồi |

---

## 1. SEQ-003: Trình Tự Gửi Tin Nhắn & Stream SSE

```mermaid
sequenceDiagram
    autonumber
    actor User as ACT-02: User
    participant UI as Next.js Client
    participant Nginx as Nginx Gateway
    participant Backend as FastAPI Backend
    participant DB as PostgreSQL 16
    participant Agent as LangGraph Agent (ai-backend/llm)
    participant LLM as External LLM (via .env)

    User->>UI: Nhập prompt (<= 4000 chars) -> Nhấn Gửi
    UI->>UI: Render tin nhắn User ngay trên UI (Optimistic UI)
    UI->>Nginx: POST /api/v1/conversations/{id}/messages/stream (kèm Cookie)
    Nginx->>Backend: Proxy stream request qua mạng nội bộ
    Backend->>Backend: Verify JWT Cookie & conv_id ownership (BR-001, BR-002)
    Backend->>DB: INSERT INTO messages (role='user', content=prompt)
    Backend->>DB: SELECT * FROM messages WHERE conv_id = :id ORDER BY created_at DESC LIMIT 20
    DB-->>Backend: 20 tin nhắn gần nhất (Sliding context window)
    Backend->>Agent: Kích hoạt LangGraph StateGraph (Tải key .env, ContextNode)
    Agent->>LLM: Gọi LangChain Model Adapter (ChatGoogleGenerativeAI)
    Backend-->>Nginx: HTTP 200 OK + Content-Type: text/event-stream
    Nginx-->>UI: Thiết lập kết nối SSE thành công
    
    loop Truyền nhận từng chunk token thời gian thực
        LLM-->>Agent: Chunk ("Xin", " chào", " bạn", ...)
        Agent-->>Backend: Chuyển tiếp stream token
        Backend-->>Nginx: data: {"token": "...", "status": "streaming"}\n\n
        Nginx-->>UI: SSE event: chunk
        UI->>UI: Hiển thị ký tự mới lên màn hình và cuộn bám đáy
    end

    LLM-->>Agent: Hoàn tất stream từ AI
    Agent-->>Backend: StateGraph hoàn tất (END)
    Backend->>DB: INSERT INTO messages (role='assistant', content=full_response)
    Backend-->>Nginx: event: done\ndata: {"status": "done", "message_id": "msg-123"}\n\n
    Nginx-->>UI: SSE done event
    UI->>UI: Đóng stream, render Markdown hoàn chỉnh & tô màu mã nguồn
```
