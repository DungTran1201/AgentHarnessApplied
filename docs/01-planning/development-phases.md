# CHI TIẾT CÁC GIAI ĐOẠN PHÁT TRIỂN (DEVELOPMENT PHASES SPECIFICATION)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `DEV-PHASES-001` |
| **Tài liệu nguồn** | [docs/SRS.md](file:///c:/Users/PC/Project/ai-chan/docs/SRS.md), [project-development-plan.md](file:///c:/Users/PC/Project/ai-chan/docs/01-planning/project-development-plan.md) |
| **Quy định ràng buộc** | Không nhảy cóc phase; hoàn thành Exit Criteria trước khi mở Phase tiếp theo. |

---

## 1. Tổng Quan Lộ Trình Phân Kỳ (Phases Roadmap)

Dự án được phân rã thành **6 Phase có cấu trúc** từ thiết kế nền tảng cho tới phát hành sản phẩm:
- **Phase 01**: Kiến Trúc & Thiết Kế Nền Tảng Kỹ Thuật (System Architecture & Foundation Design)
- **Phase 02**: Phân Hệ Xác Thực & Quản Lý Người Dùng (Authentication & User Management)
- **Phase 03**: Phân Hệ Quản Lý Phiên Hội Thoại (Conversation Lifecycle & History)
- **Phase 04**: Phân Hệ Đàm Thoại AI & Điều Phối Dự Phòng (AI Interaction & Orchestration Engine)
- **Phase 05**: Tối Ưu An Ninh & Kiểm Thử Chất Lượng (Security Hardening, Testing & Quality Assurance)
- **Phase 06**: Triển Khai Sản Phẩm & Vận Hành Giám Sát (Production Deployment & Observability)

---

## 2. Đặc Tả Chi Tiết Từng Phase

---

### PHASE 01: Kiến Trúc & Thiết Kế Nền Tảng (System Architecture & Foundation Design)

- **Mã Phase**: `PHASE-01`
- **Mục Tiêu (Objective)**: Thiết lập nền móng kỹ thuật vững chắc trước khi viết bất kỳ dòng mã nghiệp vụ nào, bao gồm System Architecture Document (SAD), chuẩn hóa hợp đồng API (OpenAPI), thiết kế lược đồ cơ sở dữ liệu (PostgreSQL/SQLAlchemy) và kiểm chứng môi trường Docker Compose.
- **Giá Trị Nghiệp Vụ (Business Value)**: Ngăn chặn rủi ro đập đi xây lại do sai sót kiến trúc; tạo tiếng nói chung và quy chuẩn rõ ràng cho các lập trình viên Backend và Frontend.
- **Đầu Vào (Input)**: [docs/SRS.md](file:///c:/Users/PC/Project/ai-chan/docs/SRS.md), [current-db-observations.md](file:///c:/Users/PC/Project/ai-chan/docs/00-discovery/current-db-observations.md).
- **Nhóm Năng Lực Bao Phủ (Capabilities)**: `CAP-FOUNDATION`.
- **Yêu Cầu Bao Phủ (Requirements Covered)**: Nền tảng cho toàn bộ `FR-001` -> `FR-011`, `NFR-MNT-01`, `NFR-MNT-02`, `CST-01`, `CST-02`.
- **Phụ Thuộc (Dependencies)**: Không có (đây là phase khởi đầu sau planning).
- **Các Gói Công Việc (Work Packages)**:
  - `WP-ARCH-01`: Soạn thảo System Architecture Document (SAD) và C4 Component Diagram.
  - `WP-ARCH-02`: Thiết kế Logical & Physical Database Schema cho PostgreSQL (Users, Conversations, Messages).
  - `WP-ARCH-03`: Biên soạn OpenAPI 3.1 Specification chuẩn hóa toàn bộ endpoints.
  - `WP-ARCH-04`: Chuẩn hóa cấu hình môi trường phát triển cục bộ và biến `.env.example`.
- **Sản Phẩm Đầu Ra (Artifacts)**:
  - `docs/07-architecture/system-architecture-document.md`
  - `docs/08-api/openapi.yaml`
  - `models/domain/domain-model.yaml` & `docs/05-domain/database-design.md`
  - `diagrams/component/component-diagram.puml`
- **Phương Pháp Kiểm Chứng (Validation)**: Rà soát kiến trúc (Architecture Review) độc lập bằng subagent `architecture-modeler`; chạy `tools/validators/run_all.py` không có lỗi.
- **Tiêu Chí Hoàn Thành (Exit Criteria)**:
  - Toàn bộ tài liệu kiến trúc, database schema và OpenAPI được phê duyệt.
  - Vượt qua Quality Gate G2 (Design Ready).
- **Rủi Ro Trọng Yếu (Risks)**: Thiết kế lược đồ dữ liệu chưa tối ưu cho việc truy vấn danh sách tin nhắn phân trang.

---

### PHASE 02: Xác Thực & Quản Lý Người Dùng (Authentication & User Management)

- **Mã Phase**: `PHASE-02`
- **Mục Tiêu (Objective)**: Xây dựng hoàn chỉnh chu trình xác thực tài khoản: Đăng ký, Đăng nhập, Quản lý phiên làm việc JWT/Session Cookie an toàn và Đăng xuất cho cả Backend và Frontend.
- **Giá Trị Nghiệp Vụ (Business Value)**: Đảm bảo chỉ người dùng hợp lệ mới có thể tương tác với hệ thống; tạo nền tảng định danh để phân quyền và bảo vệ lịch sử hội thoại cá nhân.
- **Đầu Vào (Input)**: Artifacts của `PHASE-01` (SAD, OpenAPI, DB Schema).
- **Nhóm Năng Lực Bao Phủ (Capabilities)**: `CAP-AUTH`, `CAP-SEC-PERF`.
- **Yêu Cầu Bao Phủ (Requirements Covered)**: `FR-001`, `FR-002`, `FR-003`, `BR-001`, `NFR-SEC-03`, `NFR-SEC-04`.
- **Phụ Thuộc (Dependencies)**: `PHASE-01` (Cơ sở dữ liệu và cấu trúc API đã sẵn sàng).
- **Các Gói Công Việc (Work Packages)**:
  - `WP-AUTH-01`: Triển khai bảng `users` và cơ chế băm mật khẩu Argon2id/Bcrypt tại Backend.
  - `WP-AUTH-02`: Xây dựng API endpoints `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/logout`.
  - `WP-AUTH-03`: Xây dựng Auth Middleware bảo vệ các router yêu cầu đăng nhập và trích xuất `current_user`.
  - `WP-AUTH-04`: Xây dựng giao diện Đăng ký / Đăng nhập responsive và xử lý Auth State tại Frontend.
- **Sản Phẩm Đầu Ra (Artifacts)**:
  - Source code xác thực Backend (`ai-backend/src/api/v1/auth.py`, `ai-backend/src/core/security.py`).
  - Giao diện người dùng Frontend (`ai-frontend/src/app/login/`, `ai-frontend/src/app/register/`).
  - Bộ kiểm thử ca sử dụng `tests/test_auth.py`.
- **Phương Pháp Kiểm Chứng (Validation)**: Thực thi kiểm thử tự động `tests/test_auth.py` bao phủ luồng hợp lệ, mật khẩu sai, trùng email; kiểm tra token JWT có cờ an toàn.
- **Tiêu Chí Hoàn Thành (Exit Criteria)**:
  - Thỏa mãn toàn diện tiêu chí nghiệm thu `AC-001`.
  - Không có cảnh báo lỗ hổng lưu mật khẩu trần hay lộ token.
- **Rủi Ro Trọng Yếu (Risks)**: Xử lý lưu trữ token ở Client không an toàn có nguy cơ bị tấn công XSS.

---

### PHASE 03: Quản Lý Phiên Hội Thoại (Conversation Lifecycle & History)

- **Mã Phase**: `PHASE-03`
- **Mục Tiêu (Objective)**: Hiện thực hóa cơ chế quản lý cuộc trò chuyện: Tạo mới (New Chat), Liệt kê danh sách (List), Đổi tên tự động/thủ công (Rename) và Xóa (Delete) kèm thanh điều hướng Sidebar.
- **Giá Trị Nghiệp Vụ (Business Value)**: Giúp người dùng tổ chức công việc theo từng phiên đàm thoại riêng biệt, dễ dàng tra cứu lại nội dung trước đây.
- **Đầu Vào (Input)**: `PHASE-02` (Hệ thống xác thực người dùng đã vận hành).
- **Nhóm Năng Lực Bao Phủ (Capabilities)**: `CAP-CONV`.
- **Yêu Cầu Bao Phủ (Requirements Covered)**: `FR-004`, `FR-005`, `FR-006`, `FR-007`, `BR-002`, `BR-004`, `NFR-PRV-01`, `NFR-PRV-02`.
- **Phụ Thuộc (Dependencies)**: `PHASE-02` (Mọi cuộc trò chuyện bắt buộc phải gắn với một `user_id` đã xác thực).
- **Các Gói Công Việc (Work Packages)**:
  - `WP-CONV-01`: Hiện thực hóa CRUD Conversation tại Backend kèm ràng buộc quyền sở hữu nghiêm ngặt.
  - `WP-CONV-02`: Hiện thực hóa logic tự động trích xuất tiêu đề từ 30 ký tự đầu của tin nhắn mở đầu (`BR-004`).
  - `WP-CONV-03`: Xây dựng Sidebar quản lý cuộc trò chuyện trên Next.js (New Chat, chuyển đổi chat, nút Rename, Delete).
  - `WP-CONV-04`: Xây dựng kiểm thử tự động phòng chống lỗi phân quyền IDOR (User A không được đọc chat của User B).
- **Sản Phẩm Đầu Ra (Artifacts)**:
  - API endpoints `/api/v1/conversations`.
  - Component Sidebar hoàn chỉnh tại `ai-frontend/src/components/Sidebar/`.
  - Bộ kiểm thử bảo mật phân quyền `tests/test_conversation_ownership.py`.
- **Phương Pháp Kiểm Chứng (Validation)**: Chạy test case IDOR; thử nghiệm tạo 10 conversation và xác thực thứ tự sắp xếp theo `updated_at DESC`.
- **Tiêu Chí Hoàn Thành (Exit Criteria)**:
  - Thỏa mãn toàn diện tiêu chí nghiệm thu `AC-002`.
  - 100% cuộc gọi truy cập chéo tài khoản trả về `HTTP 403 Forbidden`.
- **Rủi Ro Trọng Yếu (Risks)**: Hiệu năng tải danh sách conversation bị chậm khi số lượng cuộc trò chuyện tăng cao.

---

### PHASE 04: Tương Tác Chat & Điều Phối AI (AI Interaction & Orchestration Engine)

- **Mã Phase**: `PHASE-04`
- **Mục Tiêu (Objective)**: Tích hợp trọn vẹn luồng gửi nhận tin nhắn đàm thoại, lưu trữ tin nhắn vào PostgreSQL, điều phối gọi Gemini với cơ chế tự động Fallback OpenAI, và truyền luồng dữ liệu Streaming về giao diện người dùng.
- **Giá Trị Nghiệp Vụ (Business Value)**: Đây là giá trị cốt lõi (Core Value) của toàn bộ hệ thống chatbot trợ lý ảo, cung cấp câu trả lời thông minh và liên tục không gián đoạn.
- **Đầu Vào (Input)**: `PHASE-03` (Đã có `conversation_id` hợp lệ để gắn tin nhắn).
- **Nhóm Năng Lực Bao Phủ (Capabilities)**: `CAP-CHAT-AI`, `CAP-SEC-PERF`.
- **Yêu Cầu Bao Phủ (Requirements Covered)**: `FR-008`, `FR-009`, `FR-010`, `FR-011`, `BR-003`, `BR-005`, `NFR-PERF-02`, `NFR-REL-03`.
- **Phụ Thuộc (Dependencies)**: `PHASE-03` (Yêu cầu phiên chat và lịch sử đã sẵn sàng).
- **Các Gói Công Việc (Work Packages)**:
  - `WP-CHAT-01`: Cải tiến API `POST /api/v1/chat` tiếp nhận `conversation_id`, lưu trữ tin nhắn người dùng và phản hồi của AI.
  - `WP-CHAT-02`: Nâng cấp `LLMManager` hỗ trợ cơ chế Streaming Server-Sent Events (SSE) hoặc chunk transfer.
  - `WP-CHAT-03`: Tối ưu hóa bộ chuyển vùng dự phòng (Fallback Router) tự động chuyển sang OpenAI khi Gemini gặp lỗi mã 429/5xx.
  - `WP-CHAT-04`: Xây dựng khung chat hoàn thiện tại Next.js: Gõ phím, hiển thị stream, làm nổi bật cú pháp code, hỗ trợ Markdown.
- **Sản Phẩm Đầu Ra (Artifacts)**:
  - Module hội thoại hoàn chỉnh tại Backend và Frontend.
  - Bộ kiểm thử giả lập lỗi để kiểm chứng Fallback (`tests/test_llm_fallback.py`).
- **Phương Pháp Kiểm Chứng (Validation)**:
  - Giả lập ngắt kết nối Gemini API -> Hệ thống phải tự động trả về phản hồi từ OpenAI.
  - Đo đạc thời gian hiển thị ký tự đầu tiên (TTFT) < 2.0 giây.
- **Tiêu Chí Hoàn Thành (Exit Criteria)**:
  - Thỏa mãn toàn diện tiêu chí nghiệm thu `AC-003` và `AC-004`.
  - Không có trường hợp mất ngữ cảnh khi chuyển đổi giữa các câu hỏi trong cùng một conversation.
- **Rủi Ro Trọng Yếu (Risks)**: Cạn kiệt quota cả 2 nhà cung cấp đồng thời trong các đợt cao điểm; lỗi hiển thị mã HTML độc hại từ câu trả lời của AI.

---

### PHASE 05: Kiểm Thử Toàn Diện & Tối Ưu An Ninh (Security Hardening, Testing & QA)

- **Mã Phase**: `PHASE-05`
- **Mục Tiêu (Objective)**: Rà soát và gia cố toàn bộ các lỗ hổng bảo mật tiềm ẩn, chạy kiểm thử tải đồng thời (Load Testing), phòng chống Prompt Injection, kiểm toán secret và hoàn thiện bộ kiểm thử tự động E2E.
- **Giá Trị Nghiệp Vụ (Business Value)**: Đảm bảo hệ thống đạt độ tin cậy và an toàn cao nhất trước khi đưa ra người dùng thực tế; phòng ngừa sự cố tràn chi phí và tấn công mạng.
- **Đầu Vào (Input)**: Mã nguồn và tính năng hoàn thiện của `PHASE-02`, `PHASE-03`, `PHASE-04`.
- **Nhóm Năng Lực Bao Phủ (Capabilities)**: `CAP-SEC-PERF`.
- **Yêu Cầu Bao Phủ (Requirements Covered)**: `NFR-SEC-01..05`, `NFR-PERF-01..03`, `SEC-01..06`.
- **Phụ Thuộc (Dependencies)**: Các phân hệ cốt lõi đã hoàn thành implementation.
- **Các Gói Công Việc (Work Packages)**:
  - `WP-SEC-01`: Kiểm toán rò rỉ thông tin nhạy cảm và secret scanning toàn diện.
  - `WP-SEC-02`: Gia cố phòng thủ Prompt Injection và kiểm tra khử khuẩn XSS ở tầng Markdown renderer.
  - `WP-SEC-03`: Kiểm thử tải đồng thời 100 concurrent users qua kịch bản kiểm thử Locust/k6.
  - `WP-SEC-04`: Thẩm định cơ chế Rate Limiting tại cả Nginx Ingress (10 r/s) và FastAPI (60 r/min/IP).
- **Sản Phẩm Đầu Ra (Artifacts)**:
  - Báo cáo kiểm toán an ninh `docs/10-security/security-audit-report.md`.
  - Kết quả kiểm thử tải `docs/11-testing/load-test-results.md`.
  - Bộ kiểm thử tự động toàn diện hồi quy `tests/`.
- **Phương Pháp Kiểm Chứng (Validation)**: Đánh giá độc lập bằng subagent `security-reviewer` và `qa-reviewer`.
- **Tiêu Chí Hoàn Thành (Exit Criteria)**:
  - Đạt tiêu chí nghiệm thu `AC-005`.
  - 0 lỗ hổng nghiêm trọng (Critical/High security vulnerabilities).
- **Rủi Ro Trọng Yếu (Risks)**: Quá tải tài nguyên máy chủ khi đồng thời chạy kiểm thử tải và gọi mô hình AI thật.

---

### PHASE 06: Triển Khai Sản Phẩm & Vận Hành (Production Deployment & Observability)

- **Mã Phase**: `PHASE-06`
- **Mục Tiêu (Objective)**: Đóng gói và phát hành hệ thống hoàn chỉnh thông qua Docker Compose; thiết lập Nginx Ingress với chứng chỉ SSL HTTPS TLS 1.3 thực tế; cấu hình ghi nhật ký tập trung và ban hành quy trình vận hành (Runbook).
- **Giá Trị Nghiệp Vụ (Business Value)**: Cung cấp dịch vụ ổn định, an toàn và có khả năng giám sát trực quan cho tổ chức và người dùng.
- **Đầu Vào (Input)**: Sản phẩm đã vượt qua kiểm thử chất lượng ở `PHASE-05`.
- **Nhóm Năng Lực Bao Phủ (Capabilities)**: `CAP-OPS`.
- **Yêu Cầu Bao Phủ (Requirements Covered)**: `NFR-OBS-01`, `NFR-REL-01..03`, `NFR-SCA-01..02`.
- **Phụ Thuộc (Dependencies)**: `PHASE-05` hoàn tất nghiệm thu.
- **Các Gói Công Việc (Work Packages)**:
  - `WP-OPS-01`: Hoàn thiện cấu hình Docker Compose sẵn sàng cho môi trường Production (đóng kín cổng DB/Redis).
  - `WP-OPS-02`: Cấu hình Nginx HTTPS với chứng chỉ SSL hợp chuẩn và HSTS headers.
  - `WP-OPS-03`: Thiết lập cơ chế ghi log nhật ký có cấu trúc và ẩn danh thông tin nhạy cảm.
  - `WP-OPS-04`: Biên soạn Sổ tay Vận hành & Kế hoạch Khôi phục (Operations Runbook & Rollback Plan).
- **Sản Phẩm Đầu Ra (Artifacts)**:
  - Cấu hình Production `ai-infra/compose/docker-compose.prod.yml`.
  - Sổ tay vận hành `docs/12-operations/runbook.md`.
  - Kế hoạch khôi phục `docs/12-operations/rollback-plan.md`.
- **Phương Pháp Kiểm Chứng (Validation)**: Kiểm tra khởi động cụm container sạch (Clean spin-up); gọi endpoint kiểm tra sức khỏe `GET /api/v1/health` đạt HTTP 200.
- **Tiêu Chí Hoàn Thành (Exit Criteria)**:
  - Đạt Quality Gate G6 (Release Ready).
  - Toàn bộ dịch vụ tự khởi động lại khi có lỗi (`restart: unless-stopped`).
- **Rủi Ro Trọng Yếu (Risks)**: Lỗi cấu hình mạng nội bộ giữa các container làm gián đoạn kết nối Backend sang Database.
