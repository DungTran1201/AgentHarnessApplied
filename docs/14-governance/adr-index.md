# Mục Lục Các Quyết Định Kiến Trúc (Architecture Decision Records Index)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã tài liệu** | `GOV-ADR-001` |
| **Giai đoạn** | **Phase 14 — Governance & Lifecycle Management** |
| **Thư mục lưu trữ ADR** | `docs/06-architecture/ADR/` |
| **Trạng thái** | **BASELINED** |

---

## 1. Danh Mục Các Bản Ghi Quyết Định Kiến Trúc (ADR Register)

| Mã Quyết Định | Tiêu Đề Quyết Định | Ngày Phê Duyệt | Trạng Thái | Tóm Tắt Quyết Định & Hệ Quả | Tệp Tài Liệu Chi Tiết |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `ADR-001` | Lựa chọn Công nghệ Cốt lõi: FastAPI + Next.js + PostgreSQL | 2026-10-07 | **ACCEPTED** | Chọn FastAPI (Python) cho Backend để hỗ trợ native streaming và hệ sinh thái AI; Next.js (React) cho Frontend; PostgreSQL cho lưu trữ ACID tin nhắn và người dùng. | [ADR-001](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-001-tech-stack-fastapi-nextjs.md) |
| `ADR-002` | Cơ chế Xác thực Phiên qua HttpOnly Cookie & JWT | 2026-10-07 | **ACCEPTED** | Lưu trữ JWT bên trong HttpOnly, Secure, SameSite=Lax Cookie nhằm triệt tiêu hoàn toàn nguy cơ đánh cắp token qua XSS so với việc lưu trong Web Storage (localStorage). | [ADR-002](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-002-httponly-cookie-jwt.md) |
| `ADR-003` | Kiến trúc Cổng AI Đa Nhà Cung Cấp & Tự Động Chuyển Đổi Dự Phòng | 2026-10-07 | **ACCEPTED** | Sử dụng Google Gemini 2.5 Flash làm nhà cung cấp chính (`PRIMARY`) và OpenAI GPT-4o-mini làm nhà cung cấp dự phòng (`FALLBACK`) với cơ chế Failover tự động khi lỗi 429/5xx. | [ADR-003](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-003-multi-provider-llm-failover.md) |
| `ADR-004` | Giao thức Truyền Luồng Phản Hồi Thời Gian Thực (SSE) | 2026-10-07 | **ACCEPTED** | Sử dụng Server-Sent Events (SSE) qua HTTP POST thay vì WebSockets để truyền văn bản sinh từ LLM: đơn giản, nhẹ, tương thích HTTP/2, hỗ trợ reconnection và hủy luồng tự nhiên. | [ADR-004](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-004-sse-streaming-protocol.md) |
| `ADR-005` | Kiến trúc Chat Agent Đa Nhà Cung Cấp Với LangChain & LangGraph Tải Từ Cấu Hình .env | 2026-10-08 | **ACCEPTED** | Chuẩn hóa điều phối Agent qua LangChain và LangGraph StateGraph, tải nhà cung cấp động dựa trên key trong `.env` (`GEMINI_API_KEY`, `OPENAI_API_KEY`,...) và điều phối chuyển vùng dự phòng trong suốt. | [ADR-005](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-005-langchain-langgraph-agent.md) |
| `ADR-006` | Kiến Trúc Quản Lý Vòng Đời & Danh Mục Mô Hình Agent Đa Nhà Cung Cấp | 2026-10-08 | **ACCEPTED** | Quản trị danh mục Agent/Model bằng cơ chế Soft-State (Activate/Deactivate), kiểm tra kết nối (Ping/Health Check) và bảo toàn bất biến mô hình mặc định không xóa cứng. | [ADR-006](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-006-multi-provider-agent-management.md) |
| `ADR-007` | Kiến Trúc Xác Thực & Tích Hợp Discord OAuth2 | 2026-10-09 | **ACCEPTED** | Áp dụng Authorization Code Grant Flow với chữ ký State HMAC-SHA256, tự động liên kết tài khoản qua Verified Email, cho phép null password và phát hành HttpOnly JWT Cookie an toàn. | [ADR-007](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-007-discord-oauth2-authentication.md) |


---

## 2. Quy Tắc Quản Trị & Đề Xuất ADR Mới

1. Mọi quyết định kiến trúc mang tính ràng buộc lâu dài, ảnh hưởng đến bảo mật, công nghệ cốt lõi hoặc giao thức kết nối đều phải lập bản ghi ADR độc lập.
2. Cấu trúc ADR chuẩn hóa: Context (Bối cảnh) -> Decision (Quyết định) -> Status (Trạng thái) -> Consequences (Hệ quả tích cực/tiêu cực).
3. ADR đã ở trạng thái `ACCEPTED` không được tùy tiện sửa đổi nội dung quyết định; nếu có thay đổi công nghệ mới, phải tạo ADR mới và đánh dấu ADR cũ là `SUPERSEDED`.
