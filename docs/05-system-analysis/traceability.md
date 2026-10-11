# MA TRẬN TRUY VẾT PHÂN TÍCH HỆ THỐNG (SYSTEM ANALYSIS TRACEABILITY)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `SYS-TRACE-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Thiết lập ma trận truy vết từ Yêu cầu chức năng -> Quy trình nghiệp vụ -> Ca sử dụng -> Năng lực hệ thống logic |

---

## 1. Ma Trận Truy Vết Năng Lực Hệ Thống (Capabilities Traceability Matrix)

| Mã Yêu Cầu | Quy Trình Nghiệp Vụ | Ca Sử Dụng (Use Case) | Cụm Năng Lực Logic | Thành Phần Phụ Trách Kỹ Thuật |
| :--- | :--- | :--- | :--- | :--- |
| **`FR-001`** | `BP-AUTH-001 [PROC-001]` | `UC-AUTH-001 [UC-001]` | `CAP-AUTH-01` (Registration & Bcrypt) | `ai-backend` (AuthService / Users table) |
| **`FR-002`** | `BP-AUTH-002 [PROC-002]` | `UC-AUTH-002 [UC-002]` | `CAP-AUTH-02` (Login & JWT Session) | `ai-backend` (AuthService / JWT Manager) |
| **`FR-003`** | `BP-AUTH-003 [PROC-003]` | `UC-AUTH-003 [UC-003]` | `CAP-AUTH-03` (Logout & Cookie Reset) | `ai-backend` (AuthService) |
| **`FR-004`** | `BP-CONV-001 [PROC-004]` | `UC-CONV-001 [UC-004]` | `CAP-CONV-01` (Create Conversation) | `ai-backend` (ConversationService) |
| **`FR-005`** | `BP-CONV-002 [PROC-005]` | `UC-CONV-002 [UC-005]` | `CAP-CONV-02` (List Conversations) | `ai-backend` (ConversationService) |
| **`FR-006`** | `BP-CONV-003 [PROC-006]` | `UC-CONV-003 [UC-006]` | `CAP-CONV-03` (Rename Conversation) | `ai-backend` (ConversationService) |
| **`FR-007`** | `BP-CONV-004 [PROC-007]` | `UC-CONV-004 [UC-007]` | `CAP-CONV-04` (Delete Conversation) | `ai-backend` (ConversationService) |
| **`FR-008`** | `BP-CHAT-001 [PROC-008]` | `UC-CHAT-001 [UC-008]` | `CAP-CHAT-01` (Message Ingestion & Validation) | `ai-backend` (ChatController / Pydantic) |
| **`FR-009`** | `BP-CHAT-001 [PROC-008]` | `UC-CHAT-001 [UC-008]` | `CAP-CHAT-02` (SSE Real-time Streaming) | `ai-backend` (StreamingResponse / Event loop) |
| **`FR-010`** | `BP-AI-001 [PROC-009]` | `UC-CHAT-001 [UC-008]` | `CAP-AI-01` (Gemini API Integration) | `ai-backend` (LLMManager / GeminiProvider) |
| **`FR-011`** | `BP-AI-001 [PROC-009]` | `UC-CHAT-001 [UC-008]` | `CAP-AI-02` (Automated LLM Failover) | `ai-backend` (LLMManager / OpenAIProvider) |
| **`FR-012`** | `BP-CHAT-001 [PROC-008]` | `UC-CHAT-001 [UC-008]` | `CAP-CHAT-04` (History Persistence) | `ai-backend` (Messages table / SQLAlchemy) |
| **`FR-013`** | `BP-CHAT-001 [PROC-008]` | `UC-CHAT-001 [UC-008]` | `CAP-CHAT-03` (Markdown & Code Render) | `ai-frontend` (ReactMarkdown / SyntaxHighlighter) |
| **`FR-014`** | `BP-AI-001 [PROC-009]` | `UC-CHAT-002 [UC-009]` | `CAP-AI-03` (Model Selection & Routing) | `ai-frontend` (ModelSelector) & `ai-backend` |
| **`NFR-007`** | `BP-SEC-001 [PROC-010]` | Toàn bộ Use Cases | `CAP-SEC-01` (Dual-Tier Rate Limiting) | `ai-infra` (Nginx) & `ai-backend` (Middleware) |
| **`NFR-018`** | `BP-CONV-002..004` | `UC-CONV-002..004` | `CAP-SEC-02` (Anti-IDOR Data Isolation) | `ai-backend` (Service layer user_id checks) |

---

## 2. Kết Quả Thẩm Định Chất Lượng Phase 05
- **Quality Gate**: **`READY_FOR_NEXT_PHASE`**
- Toàn bộ năng lực hệ thống logic được liên kết chặt chẽ với các thực thể kiến trúc mà không vi phạm nguyên tắc No-Coding.
