# Sơ Đồ Tuần Tự: Tự Động Chuyển Đổi Dự Phòng LLM (Failover Sequence Diagram)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-SEQ-003` |
| **Mã Kịch Bản** | `SEQ-004` |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/09-behavior/sequence-diagrams.md](file:///c:/Users/PC/Project/ai-chan/docs/09-behavior/sequence-diagrams.md), [docs/06-architecture/ADR/ADR-003-multi-provider-llm-failover.md](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-003-multi-provider-llm-failover.md) |
| **Mục Đích** | Mô tả hành vi chuyển đổi dự phòng trong suốt từ Google Gemini sang OpenAI khi gặp lỗi 429 Quota Exceeded hoặc Timeout 30 giây |

---

## 1. SEQ-004: Trình Tự Bắt Ngoại Lệ & Kích Hoạt Dự Phòng (Failover)

```mermaid
sequenceDiagram
    autonumber
    participant UI as Next.js Client
    participant Backend as FastAPI Backend
    participant Graph as LangGraph StateGraph (ai-backend/llm)
    participant Gemini as Google Gemini (Primary via .env)
    participant OpenAI as OpenAI (Fallback via .env)

    UI->>Backend: Khởi tạo yêu cầu sinh stream câu trả lời
    Backend->>Graph: Khởi tạo StateGraph (Prompt, 20 msgs context, Keys từ .env)
    Graph->>Graph: Node: PrimaryModelNode (ChatGoogleGenerativeAI)
    Graph->>Gemini: Gửi prompt stream
    
    alt Trường hợp Gemini trả về lỗi 429 / 5xx HOẶC Timeout 30s
        Gemini-->>Graph: HTTP 429 Quota Exceeded / Timeout Exception
        Note over Graph: Kích hoạt Conditional Edge: Chuyển sang FallbackModelNode (ADR-005)
        Graph->>OpenAI: Gọi ChatOpenAI adapter với cùng State
        OpenAI-->>Graph: HTTP 200 OK + SSE Token Chunks stream
        loop Tiếp tục stream từ OpenAI qua Fallback Node
            Graph-->>Backend: Token chunk
            Backend-->>UI: data: {"token": "...", "status": "streaming"}\n\n
        end
        Graph-->>Backend: StateGraph hoàn tất (END)
        Backend-->>UI: event: done\ndata: {"status": "done"}\n\n
        Note over UI: Người dùng nhận câu trả lời liên tục mà không nhận thấy lỗi gián đoạn
    end
```
