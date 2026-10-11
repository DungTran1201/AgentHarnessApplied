# Sơ Đồ Swimlane: Quy Trình Truyền Luồng Chat Thời Gian Thực (Streaming Chat Swimlane)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-SWIM-002` |
| **Quy Trình Nghiệp Vụ** | `BP-CHAT-001 [PROC-008]`, `BP-AI-001 [PROC-009]` |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/03-business-process/actor-interactions.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/actor-interactions.md), [docs/06-architecture/ADR/ADR-004-sse-streaming-protocol.md](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-004-sse-streaming-protocol.md) |
| **Mục Đích** | Thể hiện sự phối hợp đa làn giữa Người dùng, Web Client, Backend API, PostgreSQL và Nhà cung cấp LLM trong quá trình streaming SSE |

---

## 1. Biểu Đồ Swimlane Truyền Luồng Thời Gian Thực

```mermaid
flowchart TD
    subgraph LaneUser ["LÀN 1: NGƯỜI DÙNG (ACT-02)"]
        U_Type["1. Gõ tin nhắn và bấm Gửi"]
        U_Watch["4. Xem chữ chạy thời gian thực với con trỏ nhấp nháy"]
        U_ReadDone["7. Đọc phản hồi hoàn chỉnh, sao chép code"]
    end

    subgraph LaneFrontend ["LÀN 2: FRONTEND CLIENT (Next.js)"]
        F_Optimistic["2. Render tức thì tin nhắn User trên màn hình"]
        F_SendStream["Gửi POST /conversations/:id/messages/stream"]
        F_ReceiveSSE["5. Tiếp nhận từng SSE chunk token và tự động cuộn"]
        F_RenderMarkdown["6. Nhận event 'done', render hoàn chỉnh Markdown"]
    end

    subgraph LaneBackend ["LÀN 3: BACKEND API (FastAPI Orchestrator)"]
        B_Validate["3. Xác thực JWT & kiểm tra quyền sở hữu hội thoại"]
        B_SaveUserMsg["Lưu tin nhắn người dùng vào CSDL"]
        B_FetchContext["Truy vấn 20 tin nhắn gần nhất"]
        B_OpenSSE["Mở kết nối SSE text/event-stream"]
        B_RelayChunks["Chuyển tiếp từng token chunk về SSE"]
        B_SaveAssistant["Lưu toàn bộ tin nhắn Assistant vào CSDL"]
    end

    subgraph LaneDB ["LÀN 4: CƠ SỞ DỮ LIỆU (PostgreSQL)"]
        DB_WriteUserMsg["INSERT INTO messages (role='user')"]
        DB_ReadContext["SELECT 20 messages gần nhất"]
        DB_WriteAssistantMsg["INSERT INTO messages (role='assistant')"]
    end

    subgraph LaneLLM ["LÀN 5: CỔNG AI CLOUD (Gemini / OpenAI)"]
        LLM_StreamGen["Sinh văn bản theo luồng token thời gian thực"]
        LLM_EmitChunks["Trả về từng chunk ký tự qua HTTP stream"]
    end

    %% Luồng gửi
    U_Type --> F_Optimistic
    F_Optimistic --> F_SendStream
    F_SendStream --> B_Validate
    B_Validate --> B_SaveUserMsg
    B_SaveUserMsg --> DB_WriteUserMsg
    DB_WriteUserMsg --> B_FetchContext
    B_FetchContext --> DB_ReadContext
    DB_ReadContext --> B_OpenSSE

    %% Luồng AI sinh và truyền
    B_OpenSSE --> LLM_StreamGen
    LLM_StreamGen --> LLM_EmitChunks
    LLM_EmitChunks --> B_RelayChunks
    B_RelayChunks --> F_ReceiveSSE
    F_ReceiveSSE --> U_Watch

    %% Kết thúc luồng
    LLM_EmitChunks -.->|Hoàn tất stream| B_SaveAssistant
    B_SaveAssistant --> DB_WriteAssistantMsg
    DB_WriteAssistantMsg --> F_RenderMarkdown
    F_RenderMarkdown --> U_ReadDone

    style LaneUser fill:#eff6ff,stroke:#2563eb
    style LaneFrontend fill:#f0fdf4,stroke:#16a34a
    style LaneBackend fill:#fefce8,stroke:#ca8a04
    style LaneDB fill:#fdf2f8,stroke:#db2777
    style LaneLLM fill:#fffbeb,stroke:#b45309
```
