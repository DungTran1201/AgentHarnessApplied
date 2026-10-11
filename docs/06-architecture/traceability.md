# MA TRẬN TRUY VẾT KIẾN TRÚC HỆ THỐNG (ARCHITECTURE TRACEABILITY MATRIX)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `ARCH-TRACE-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Thiết lập ma trận truy vết từ Yêu cầu chức năng / Phi chức năng -> Ca sử dụng -> Thành phần kiến trúc -> Quyết định kiến trúc (ADR) |

---

## 1. Ma Trận Truy Vết Thành Phần Kiến Trúc & Quyết Định (ADR)

| Mã Yêu Cầu | Ca Sử Dụng (Use Case) | Thành Phần Kiến Trúc Thực Thi | Quyết Định Kiến Trúc (ADR) | Trạng Thái Phủ Sóng |
| :--- | :--- | :--- | :--- | :--- |
| **`FR-001`** | `UC-AUTH-001 [UC-001]` | `FastAPI: AuthService` + `PostgreSQL: users` | [ADR-001](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-001-tech-stack-fastapi-nextjs.md) | **100% COVERED** |
| **`FR-002`** | `UC-AUTH-002 [UC-002]` | `FastAPI: AuthController` + JWT Cookie | [ADR-002](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-002-httponly-cookie-jwt.md) | **100% COVERED** |
| **`FR-003`** | `UC-AUTH-003 [UC-003]` | `FastAPI: AuthController` (Clear Cookie) | [ADR-002](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-002-httponly-cookie-jwt.md) | **100% COVERED** |
| **`FR-004`** | `UC-CONV-001 [UC-004]` | `FastAPI: ConversationService` | [ADR-001](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-001-tech-stack-fastapi-nextjs.md) | **100% COVERED** |
| **`FR-005`** | `UC-CONV-002 [UC-005]` | `FastAPI: ConversationService` + `Next.js Sidebar` | [ADR-001](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-001-tech-stack-fastapi-nextjs.md) | **100% COVERED** |
| **`FR-006`** | `UC-CONV-003 [UC-006]` | `FastAPI: ConversationService` (Auto/Manual) | [ADR-001](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-001-tech-stack-fastapi-nextjs.md) | **100% COVERED** |
| **`FR-007`** | `UC-CONV-004 [UC-007]` | `FastAPI: ConversationService` (Cascade DB) | [ADR-001](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-001-tech-stack-fastapi-nextjs.md) | **100% COVERED** |
| **`FR-008`** | `UC-CHAT-001 [UC-008]` | `FastAPI: ChatController` + Pydantic | [ADR-001](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-001-tech-stack-fastapi-nextjs.md) | **100% COVERED** |
| **`FR-009`** | `UC-CHAT-001 [UC-008]` | `FastAPI: StreamingResponse` + `Next.js SSE Reader` | [ADR-004](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-004-sse-streaming-protocol.md) | **100% COVERED** |
| **`FR-010`** | `UC-CHAT-001 [UC-008]` | `LLMManager` + `GeminiProvider` | [ADR-003](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-003-multi-provider-llm-failover.md) | **100% COVERED** |
| **`FR-011`** | `UC-CHAT-001 [UC-008]` | `LLMManager` + `OpenAIProvider` (Failover) | [ADR-003](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-003-multi-provider-llm-failover.md) | **100% COVERED** |
| **`FR-012`** | `UC-CHAT-001 [UC-008]` | `PostgreSQL: messages table` (Async session) | [ADR-001](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-001-tech-stack-fastapi-nextjs.md) | **100% COVERED** |
| **`FR-013`** | `UC-CHAT-001 [UC-008]` | `Next.js: ReactMarkdown` + `Prism/Highlight` | [ADR-001](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-001-tech-stack-fastapi-nextjs.md) | **100% COVERED** |
| **`FR-014`** | `UC-CHAT-002 [UC-009]` | `Next.js ModelSelector` + `LLMManager` | [ADR-003](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-003-multi-provider-llm-failover.md) | **100% COVERED** |
| **`NFR-007`** | Toàn bộ Use Cases | `Nginx Gateway` (Layer 1) + `FastAPI Limiter` (Layer 2) | [ADR-001](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-001-tech-stack-fastapi-nextjs.md) | **100% COVERED** |
| **`SEC-004`** | `UC-AUTH-002` | `FastAPI: Cookie Manager` | [ADR-002](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-002-httponly-cookie-jwt.md) | **100% COVERED** |

---

## 2. Kết Quả Thẩm Định Chất Lượng Phase 06
- **Quality Gate**: **`READY_FOR_NEXT_PHASE`**
- Toàn bộ các quyết định kiến trúc chiến lược và thành phần triển khai container đã được đồng bộ hóa hoàn chỉnh.
