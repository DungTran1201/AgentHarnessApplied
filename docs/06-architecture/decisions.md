# TỔNG HỢP QUYẾT ĐỊNH KIẾN TRÚC (ARCHITECTURAL DECISIONS LOG)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `ARCH-DEC-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Tổng hợp bảng tóm tắt danh mục các quyết định kiến trúc then chốt đã được phê duyệt trong hệ thống |

---

## 1. Bảng Tổng Hợp Quyết Định Kiến Trúc (ADR Summary Table)

| Mã Quyết Định | Tên Quyết Định Kiến Trúc | Trạng Thái | Vấn Đề Giải Quyết | Lựa Chọn Trọng Tâm | Ràng Buộc Kỹ Thuật |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **[ADR-001](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-001-tech-stack-fastapi-nextjs.md)** | Ngăn Xếp FastAPI & Next.js App Router | **APPROVED** | Nền tảng phát triển ứng dụng AI | Python 3.11 + FastAPI (Async) kết hợp Next.js 14 App Router và PostgreSQL 16 | Chuẩn hóa môi trường Python/TypeScript |
| **[ADR-002](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-002-httponly-cookie-jwt.md)** | Quản Lý Phiên Qua HttpOnly Secure Cookie | **APPROVED** | Chống tấn công đánh cắp token XSS | Sử dụng JWT trong Cookie `HttpOnly; Secure; SameSite=Lax` thời hạn 7 ngày | Cấu hình CORS `allow_credentials=True` |
| **[ADR-003](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-003-multi-provider-llm-failover.md)** | Điều Phối AI Đa Nhà Cung Cấp & Failover | **APPROVED** | Chống gián đoạn dịch vụ và tối ưu chi phí | Ưu tiên Google Gemini (Primary), tự động chuyển sang OpenAI (Fallback) khi lỗi hoặc timeout 30s | Quản lý đồng thời 2 API Key phía server |
| **[ADR-004](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-004-sse-streaming-protocol.md)** | Giao Thức Server-Sent Events Cho Chat | **APPROVED** | Phản hồi thời gian thực độ trễ thấp | Giao thức HTTP đơn hướng Server-Sent Events (SSE) `text/event-stream` | Nginx `proxy_buffering off` |
| **[ADR-005](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-005-langchain-langgraph-agent.md)** | Agent Đa Nhà Cung Cấp Với LangChain & LangGraph | **APPROVED** | Chuẩn hóa điều phối Agent & Quản lý trạng thái Failover | Framework LangChain + LangGraph StateGraph tải động từ key trong `.env` | Cài đặt langchain, langgraph; map tin nhắn chuẩn |
| **[ADR-006](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-006-multi-provider-agent-management.md)** | Quản Lý Vòng Đời & Danh Mục Mô Hình Agent Đa Nhà Cung Cấp | **APPROVED** | Quản trị danh mục Agent/Model không xóa cứng | Cơ chế Soft-State (Activate/Deactivate), kiểm tra kết nối (Ping/Health Check) và duy trì bất biến mô hình mặc định | Không cho phép Hard Delete; kiểm tra khóa .env trước khi activate |
| **[ADR-007](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-007-discord-oauth2-authentication.md)** | Kiến Trúc Xác Thực & Tích Hợp Discord OAuth2 | **APPROVED** | Đăng ký & đăng nhập 1 chạm, chống CSRF State Mismatch | Authorization Code Grant Flow kết hợp State HMAC-SHA256, Auto-linking Verified Email và phát hành HttpOnly JWT Cookie | Cấu hình Discord API Client Credentials; bổ sung discord_id và cho phép hashed_password NULL |
| **[ADR-008](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-008-resource-telemetry-and-realtime-dashboard.md)** | Quản Lý Tài Nguyên, Phát Luồng Telemetry & Dashboard Thời Gian Thực | **APPROVED** | Giám sát độ trễ, kiểm soát token, cảnh báo hạn ngạch & trực quan hóa live | Middleware đo lường < 5ms, In-Memory Ring Buffer, Server-Sent Events (SSE) stream 1s tick & Next.js Dashboard UI | CSDL bảng api_metric_logs & user_quotas; phân quyền dữ liệu đo lường theo vai trò (BR-021) |
| **[ADR-009](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-009-extensible-model-management-search-filter.md)** | Mở Rộng Quản Lý Mô Hình, Thẩm Định Đột Biến, Tìm Kiếm & Bộ Lọc Đa Tiêu Chí | **APPROVED** | Mở rộng danh mục động, tìm kiếm mờ tức thì, lọc kết hợp & xóa mềm an toàn | Đăng ký & hiệu chỉnh tham số biên, tìm kiếm sub-string/fuzzy, lọc đa thuộc tính < 200ms & chốt chặn bảo vệ mô hình mặc định | Bổ sung trạng thái ARCHIVED; bất biến ID/Provider (BR-022); cấm xóa mô hình is_default (BR-023) |
| **[ADR-010](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-010-discord-account-linking-and-unlinking.md)** | Liên Kết & Hủy Liên Kết Danh Tính Discord Có Chốt Chặn An Toàn | **APPROVED** | Tránh xung đột tài khoản, ngăn chặn nguy cơ khóa tài khoản vĩnh viễn | Luồng OAuth action=link có ký số HMAC, ánh xạ 1-1 không ghi đè (BR-025), chốt chặn có mật khẩu (BR-026) & tái xác thực mật khẩu (BR-027) | Bắt buộc hashed_password IS NOT NULL khi hủy liên kết; kiểm tra bcrypt password |
| **[ADR-012](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-012-discord-bot-management-and-quota-sharing.md)** | Quản Lý Discord Bot Đa Phạm Vi, Định Tuyến Mô Hình Động & Dùng Chung Hạn Ngạch Hợp Nhất | **APPROVED** | Tích hợp bot Discord cho người dùng đã liên kết, phân quyền Guild, chia sẻ quota & chống lạm dụng | Khám phá Guild quyền Admin/Manage Guild (BR-034), định tuyến mô hình Active (BR-033), dùng chung hạn ngạch token Web-Discord (BR-032), xác thực chữ ký Ed25519 (SEC-013), đồng bộ lịch sử Web (FR-047) | Tiền điều kiện discord_id IS NOT NULL (BR-031); nạp Discord Bot Config; trừ quota nguyên tử; độ trễ Ack < 300ms (NFR-025) |
| **[ADR-013](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-013-vrm-behavioral-animation-system.md)** | Hệ Thống Hoạt Họa Hành Vi 3D VRM & Động Cơ Chống Lặp | **APPROVED** | Chuyển động tự nhiên, nhịp thở sinh học và phản ứng cử chỉ ngữ cảnh theo câu trả lời AI | Multi-channel bone blending, anti-repetition cooldown, intent parser tất định | Giới hạn 3 kênh xương; duy trì 60 FPS; không chặn luồng streaming |
| **[ADR-014](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-014-discord-bot-project-graph-execution.md)** | Xử Lý Thông Điệp Discord Đầu-Cuối Qua Đồ Thị Dự Án & Điều Phối Mô Hình/Kỹ Năng | **APPROVED** | Định tuyến xác định, bảo toàn cấu hình Model-Bot-Skill từ đồ thị canvas, cô lập lịch sử đa lượt & chia chunk an toàn | Ánh xạ Bot-to-Project tất định (BR-038), kiểm tra Active (BR-039), ràng buộc 0..1 Bot & 0..N Skills (BR-036, BR-037), lịch sử đàm thoại đa lượt (SEC-014), markdown code fence chunking | Không cho phép chạy project STOP; phân mảnh tin nhắn <= 3900 ký tự; defer tương tác < 3s |



