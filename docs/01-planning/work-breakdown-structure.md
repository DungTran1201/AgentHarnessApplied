# CƠ CẤU PHÂN RÃ CÔNG VIỆC TOÀN DỰ ÁN (WORK BREAKDOWN STRUCTURE - WBS)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `WBS-001` |
| **Tài liệu nguồn** | [docs/SRS.md](file:///c:/Users/PC/Project/ai-chan/docs/SRS.md), [development-phases.md](file:///c:/Users/PC/Project/ai-chan/docs/01-planning/development-phases.md) |
| **Mô hình trạng thái** | `NOT_STARTED` \| `BLOCKED` \| `READY` \| `IN_PROGRESS` \| `IN_REVIEW` \| `DONE` |
| **Quy định ràng buộc** | Giai đoạn Planning chỉ thiết lập trạng thái `READY` hoặc `NOT_STARTED`; không chuyển sang `IN_PROGRESS`/`DONE` khi chưa bắt đầu code. |

---

## 1. Sơ Đồ Cây Phân Rã Cấp Cao (WBS Tree View)

```text
AI-CHAN PROJECT (WBS-001)
├── P01: System Architecture & Foundation Design
│   ├── WP-ARCH-01: System Architecture Document & C4 Component Design
│   ├── WP-ARCH-02: PostgreSQL Relational Database Schema Design
│   ├── WP-ARCH-03: OpenAPI 3.1 RESTful Contract Specification
│   └── WP-ARCH-04: Development Environment & Secret Template Configuration
├── P02: Authentication & User Management
│   ├── WP-AUTH-01: User Database Model & Password Hashing Core
│   ├── WP-AUTH-02: Authentication REST Endpoints (Register, Login, Logout)
│   ├── WP-AUTH-03: JWT Authentication Middleware & Route Protection
│   └── WP-AUTH-04: Frontend Auth Pages & Global Session State Management
├── P03: Conversation Lifecycle & History
│   ├── WP-CONV-01: Conversation Model & CRUD Backend Endpoints
│   ├── WP-CONV-02: Automatic Title Generator from Initial Message
│   ├── WP-CONV-03: Frontend Navigation Sidebar & Chat Switcher
│   └── WP-CONV-04: Multi-User Data Isolation & IDOR Security Controls
├── P04: AI Interaction & Orchestration Engine
│   ├── WP-CHAT-01: Message Model & Chat Persistence Pipeline
│   ├── WP-CHAT-02: LLM Manager Streaming Integration (Server-Sent Events)
│   ├── WP-CHAT-03: Multi-Provider Failover Engine (Gemini -> OpenAI)
│   └── WP-CHAT-04: Frontend Chat Interface, Markdown & Code Syntax Renderer
├── P05: Security Hardening, Testing & Quality Assurance
│   ├── WP-SEC-01: Comprehensive Secret Scanning & Credential Exposure Audit
│   ├── WP-SEC-02: Prompt Injection Mitigation & Markdown XSS Sanitization
│   ├── WP-SEC-03: 100-Concurrent-Users Load Testing & Latency Benchmarks
│   └── WP-SEC-04: Dual-Tier Rate Limiting Validation (Nginx & FastAPI)
└── P06: Production Deployment & Observability
    ├── WP-OPS-01: Production Docker Compose Hardening (Closed DB Ports)
    ├── WP-OPS-02: Nginx SSL TLS 1.3 Ingress Termination & Security Headers
    ├── WP-OPS-03: Structured Telemetry & Sensitive Log Redaction
    └── WP-OPS-04: Operations Runbook & Rollback Procedure Documentation
```

---

## 2. Chi Tiết Từng Gói Công Việc (Work Packages Specification)

---

### Phase 01: System Architecture & Foundation Design

#### WP-ARCH-01: System Architecture Document & C4 Component Design
- **Mã Gói**: `WP-ARCH-01`
- **Tên Gói**: Soạn thảo tài liệu Kiến trúc Hệ thống & Sơ đồ Thành phần C4.
- **Mô Tả**: Định hình chi tiết cấu trúc 3 tầng, phân tách trách nhiệm giữa Frontend, Backend, Ingress Gateway và Database.
- **Mục Đích**: Làm kim chỉ nam kiến trúc thống nhất cho toàn bộ đội ngũ kỹ thuật.
- **Năng Lực Liên Quan**: `CAP-FOUNDATION`.
- **Yêu Cầu Liên Quan**: Toàn bộ `FR-001..011`, `NFR-MNT-01`, `CST-01`, `CST-02`.
- **Phụ Thuộc (Dependencies)**: [docs/SRS.md](file:///c:/Users/PC/Project/ai-chan/docs/SRS.md).
- **Kết Quả Kỳ Vọng**: Tài liệu SAD hoàn chỉnh và sơ đồ C4 Component trực quan.
- **Artifacts Bắt Buộc**: `docs/07-architecture/system-architecture-document.md`, `diagrams/component/component-diagram.puml`.
- **Phương Pháp Kiểm Chứng**: Thẩm định kiến trúc bởi subagent `architecture-modeler`; kiểm tra tính nhất quán với SRS.
- **Trạng Thái Hiện Tại**: `READY`.

#### WP-ARCH-02: PostgreSQL Relational Database Schema Design
- **Mã Gói**: `WP-ARCH-02`
- **Tên Gói**: Thiết kế lược đồ cơ sở dữ liệu quan hệ cho PostgreSQL.
- **Mô Tả**: Thiết kế mô hình dữ liệu vật lý gồm 3 bảng trọng tâm: `users`, `conversations`, `messages` với khóa chính UUID, khóa ngoại, ràng buộc toàn vẹn và chỉ mục (indexing).
- **Mục Đích**: Chuẩn bị cấu trúc lưu trữ dữ liệu bền vững, hỗ trợ truy vấn hiệu năng cao và phân quyền người dùng.
- **Năng Lực Liên Quan**: `CAP-FOUNDATION`.
- **Yêu Cầu Liên Quan**: `FR-001`, `FR-004`, `FR-008`, `BR-001`, `BR-002`, `Mục 10 SRS`.
- **Phụ Thuộc (Dependencies)**: `WP-ARCH-01`.
- **Kết Quả Kỳ Vọng**: Bản đặc tả Schema DDL SQL và file mô hình `models/domain/domain-model.yaml`.
- **Artifacts Bắt Buộc**: `docs/05-domain/database-design.md`, `models/domain/domain-model.yaml`.
- **Phương Pháp Kiểm Chứng**: Đánh giá tính chuẩn hóa dữ liệu 3NF; kiểm tra không có chỉ mục rác hay thiếu khóa ngoại.
- **Trạng Thái Hiện Tại**: `NOT_STARTED` (Phụ thuộc `WP-ARCH-01`).

#### WP-ARCH-03: OpenAPI 3.1 RESTful Contract Specification
- **Mã Gói**: `WP-ARCH-03`
- **Tên Gói**: Biên soạn tài liệu Hợp đồng Giao diện Lập trình Ứng dụng (OpenAPI Spec).
- **Mô Tả**: Định nghĩa toàn bộ schema request/response, mã lỗi HTTP (400, 401, 403, 404, 429, 500), kiểu dữ liệu và mô tả cho tất cả endpoints.
- **Mục Đích**: Đảm bảo Frontend và Backend phát triển độc lập không bị lệch pha giao tiếp.
- **Năng Lực Liên Quan**: `CAP-FOUNDATION`.
- **Yêu Cầu Liên Quan**: Toàn bộ `FR-001..011`, `NFR-MNT-02`.
- **Phụ Thuộc (Dependencies)**: `WP-ARCH-01`, `WP-ARCH-02`.
- **Kết Quả Kỳ Vọng**: File chuẩn OpenAPI 3.1 máy đọc và giao diện Swagger hiển thị hợp đồng.
- **Artifacts Bắt Buộc**: `docs/08-api/openapi.yaml`.
- **Phương Pháp Kiểm Chứng**: Kiểm tra cú pháp OpenAPI bằng linter; kiểm tra bao phủ đủ các mã lỗi tại Mục 12 SRS.
- **Trạng Thái Hiện Tại**: `NOT_STARTED`.

#### WP-ARCH-04: Development Environment & Secret Template Configuration
- **Mã Gói**: `WP-ARCH-04`
- **Tên Gói**: Chuẩn hóa cấu hình môi trường phát triển & mẫu biến bí mật.
- **Mô Tả**: Đồng bộ hóa file `.env.example` trên cả 3 tầng (`ai-backend`, `ai-frontend`, `ai-infra`), bảo đảm quy ước đặt tên biến nhất quán và an toàn.
- **Mục Đích**: Giúp các lập trình viên khởi tạo môi trường sạch nhanh chóng mà không làm rò rỉ khóa bí mật thực.
- **Năng Lực Liên Quan**: `CAP-FOUNDATION`.
- **Yêu Cầu Liên Quan**: `NFR-SEC-02`, `SEC-01`.
- **Phụ Thuộc (Dependencies)**: `WP-ARCH-01`.
- **Kết Quả Kỳ Vọng**: Tập file `.env.example` chuẩn hóa và tài liệu hướng dẫn setup tại `SETUP.md`.
- **Artifacts Bắt Buộc**: `.env.example` tại thư mục gốc và các thư mục con.
- **Phương Pháp Kiểm Chứng**: Chạy công cụ kiểm tra `sensitive_file_guard.py` bảo đảm không có secret thật bị ghi đè.
- **Trạng Thái Hiện Tại**: `NOT_STARTED`.

---

### Phase 02: Authentication & User Management

#### WP-AUTH-01: User Database Model & Password Hashing Core
- **Mã Gói**: `WP-AUTH-01`
- **Tên Gói**: Xây dựng mô hình dữ liệu người dùng & cơ chế băm mật khẩu.
- **Mô Tả**: Hiện thực hóa model SQLAlchemy/Pydantic cho bảng `users` và tiện ích băm mật khẩu Argon2id/Bcrypt.
- **Mục Đích**: Lưu trữ tài khoản an toàn, ngăn chặn việc đọc trộm mật khẩu nếu cơ sở dữ liệu bị lộ.
- **Năng Lực Liên Quan**: `CAP-AUTH`.
- **Yêu Cầu Liên Quan**: `FR-001`, `NFR-SEC-03`.
- **Phụ Thuộc (Dependencies)**: `WP-ARCH-02`.
- **Kết Quả Kỳ Vọng**: Code module `ai-backend/src/models/user.py` và `ai-backend/src/core/security.py`.
- **Artifacts Bắt Buộc**: Source code model và kiểm thử đơn vị băm mật khẩu.
- **Phương Pháp Kiểm Chứng**: Unit test xác thực mật khẩu khớp và hàm băm sinh chuỗi ngẫu nhiên có muối (salt).
- **Trạng Thái Hiện Tại**: `NOT_STARTED`.

#### WP-AUTH-02: Authentication REST Endpoints (Register, Login, Logout)
- **Mã Gói**: `WP-AUTH-02`
- **Tên Gói**: Xây dựng các API Endpoint xác thực người dùng.
- **Mô Tả**: Viết API `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/logout` theo đúng hợp đồng OpenAPI.
- **Mục Đích**: Cung cấp giao diện dịch vụ để người dùng đăng ký tài khoản và nhận mã thông báo JWT.
- **Năng Lực Liên Quan**: `CAP-AUTH`.
- **Yêu Cầu Liên Quan**: `FR-001`, `FR-002`, `FR-003`, `AC-001`.
- **Phụ Thuộc (Dependencies)**: `WP-AUTH-01`, `WP-ARCH-03`.
- **Kết Quả Kỳ Vọng**: Router xác thực tại `ai-backend/src/api/v1/auth.py`.
- **Artifacts Bắt Buộc**: Source code router, integration tests.
- **Phương Pháp Kiểm Chứng**: Kiểm thử API với Postman/Pytest đạt HTTP 200 cho thông tin đúng và HTTP 400/401 khi sai.
- **Trạng Thái Hiện Tại**: `NOT_STARTED`.

#### WP-AUTH-03: JWT Authentication Middleware & Route Protection
- **Mã Gói**: `WP-AUTH-03`
- **Tên Gói**: Xây dựng Middleware xác thực JWT & bảo vệ các tuyến đường nội bộ.
- **Mô Tả**: Middleware kiểm tra tiêu đề `Authorization: Bearer <token>`, giải mã JWT và gán đối tượng `current_user` vào ngữ cảnh request.
- **Mục Đích**: Ngăn chặn người dùng chưa xác thực gọi vào các API yêu cầu đăng nhập.
- **Năng Lực Liên Quan**: `CAP-AUTH`, `CAP-SEC-PERF`.
- **Yêu Cầu Liên Quan**: `BR-001`, `NFR-SEC-04`.
- **Phụ Thuộc (Dependencies)**: `WP-AUTH-02`.
- **Kết Quả Kỳ Vọng**: Dependency injection `get_current_user` trong FastAPI.
- **Artifacts Bắt Buộc**: Middleware code tại `ai-backend/src/core/security.py`.
- **Phương Pháp Kiểm Chứng**: Gọi API không có token hoặc token hết hạn -> Nhận kết quả HTTP 401 Unauthorized.
- **Trạng Thái Hiện Tại**: `NOT_STARTED`.

#### WP-AUTH-04: Frontend Auth Pages & Global Session State Management
- **Mã Gói**: `WP-AUTH-04`
- **Tên Gói**: Xây dựng giao diện Đăng ký / Đăng nhập & quản lý trạng thái phiên.
- **Mô Tả**: Tạo trang giao diện React/Next.js cho Login và Register, quản lý lưu trữ token và tự động chuyển hướng người dùng.
- **Mục Đích**: Cung cấp trải nghiệm người dùng hoàn chỉnh cho thao tác đăng nhập và bảo vệ trang chat.
- **Năng Lực Liên Quan**: `CAP-AUTH`.
- **Yêu Cầu Liên Quan**: `FR-001`, `FR-002`, `FR-003`, `NFR-USB-01`.
- **Phụ Thuộc (Dependencies)**: `WP-AUTH-02`.
- **Kết Quả Kỳ Vọng**: Các trang web tại `ai-frontend/src/app/login/page.tsx` và `register/page.tsx`.
- **Artifacts Bắt Buộc**: Frontend component pages, API client auth methods.
- **Phương Pháp Kiểm Chứng**: Thao tác giao diện trên trình duyệt kiểm tra luồng đăng ký -> tự động chuyển sang trang đăng nhập -> vào màn hình chat.
- **Trạng Thái Hiện Tại**: `NOT_STARTED`.

---

### Phase 03: Conversation Lifecycle & History

#### WP-CONV-01: Conversation Model & CRUD Backend Endpoints
- **Mã Gói**: `WP-CONV-01`
- **Tên Gói**: Xây dựng Model và các API CRUD cho cuộc trò chuyện.
- **Mô Tả**: Tạo bảng `conversations`, viết API tạo mới (`POST /conversations`), liệt kê (`GET /conversations`), cập nhật (`PATCH /conversations/{id}`), xóa (`DELETE /conversations/{id}`).
- **Mục Đích**: Cung cấp khả năng lưu trữ và quản lý phiên hội thoại bền vững trên máy chủ.
- **Năng Lực Liên Quan**: `CAP-CONV`.
- **Yêu Cầu Liên Quan**: `FR-004`, `FR-005`, `FR-006`, `FR-007`, `AC-002`.
- **Phụ Thuộc (Dependencies)**: `WP-AUTH-03`.
- **Kết Quả Kỳ Vọng**: Router tại `ai-backend/src/api/v1/conversations.py`.
- **Artifacts Bắt Buộc**: Source code model, router và schema Pydantic.
- **Phương Pháp Kiểm Chứng**: Kiểm thử tạo và xóa cuộc trò chuyện qua Pytest.
- **Trạng Thái Hiện Tại**: `NOT_STARTED`.

#### WP-CONV-02: Automatic Title Generator from Initial Message
- **Mã Gói**: `WP-CONV-02`
- **Tên Gói**: Xây dựng cơ chế tự động sinh tiêu đề cuộc trò chuyện.
- **Mô Tả**: Logic trích xuất 30 ký tự đầu tiên của tin nhắn đầu tiên để cập nhật tiêu đề cuộc trò chuyện từ "Cuộc trò chuyện mới" sang tiêu đề có ý nghĩa.
- **Mục Đích**: Giúp người dùng dễ dàng nhận diện chủ đề thảo luận trên sidebar mà không cần tự nhập tay.
- **Năng Lực Liên Quan**: `CAP-CONV`.
- **Yêu Cầu Liên Quan**: `FR-006`, `BR-004`.
- **Phụ Thuộc (Dependencies)**: `WP-CONV-01`.
- **Kết Quả Kỳ Vọng**: Logic cập nhật tiêu đề tự động tại Backend service.
- **Artifacts Bắt Buộc**: Hàm tiện ích cập nhật title tự động.
- **Phương Pháp Kiểm Chứng**: Gửi tin nhắn mở đầu -> Kiểm tra trường `title` của conversation được cập nhật chính xác.
- **Trạng Thái Hiện Tại**: `NOT_STARTED`.

#### WP-CONV-03: Frontend Navigation Sidebar & Chat Switcher
- **Mã Gói**: `WP-CONV-03`
- **Tên Gói**: Xây dựng thanh điều hướng Sidebar và bộ chuyển đổi cuộc trò chuyện.
- **Mô Tả**: Component Sidebar trên Next.js hiển thị danh sách hội thoại từ API, nút "New Chat", nút sửa tên, nút xóa có hộp thoại xác nhận.
- **Mục Đích**: Cung cấp giao diện trực quan cho người dùng quản lý toàn bộ các phiên trò chuyện của mình.
- **Năng Lực Liên Quan**: `CAP-CONV`.
- **Yêu Cầu Liên Quan**: `FR-004`, `FR-005`, `FR-006`, `FR-007`, `NFR-USB-01`.
- **Phụ Thuộc (Dependencies)**: `WP-CONV-01`.
- **Kết Quả Kỳ Vọng**: Component `Sidebar.tsx` tại `ai-frontend/src/components/`.
- **Artifacts Bắt Buộc**: Source code React component và CSS tương ứng.
- **Phương Pháp Kiểm Chứng**: Thao tác bấm New Chat, chuyển đổi qua lại giữa các phiên chat, xóa phiên chat trên UI.
- **Trạng Thái Hiện Tại**: `NOT_STARTED`.

#### WP-CONV-04: Multi-User Data Isolation & IDOR Security Controls
- **Mã Gói**: `WP-CONV-04`
- **Tên Gói**: Kiểm soát an ninh cô lập dữ liệu người dùng & chống tấn công IDOR.
- **Mô Tả**: Rà soát và thêm ràng buộc SQL WHERE `user_id = current_user.id` cho mọi thao tác đọc/sửa/xóa conversation.
- **Mục Đích**: Ngăn chặn triệt để hành vi xem trộm hoặc sửa đổi cuộc trò chuyện của người dùng khác.
- **Năng Lực Liên Quan**: `CAP-CONV`, `CAP-SEC-PERF`.
- **Yêu Cầu Liên Quan**: `BR-002`, `NFR-PRV-01`.
- **Phụ Thuộc (Dependencies)**: `WP-CONV-01`.
- **Kết Quả Kỳ Vọng**: Bộ kiểm tra phân quyền bảo đảm trả về HTTP 403 Forbidden.
- **Artifacts Bắt Buộc**: Unit test `tests/test_idor_security.py`.
- **Phương Pháp Kiểm Chứng**: Giả lập User A gọi API lấy conversation của User B -> Hệ thống bắt buộc từ chối với HTTP 403.
- **Trạng Thái Hiện Tại**: `NOT_STARTED`.

---

### Phase 04: AI Interaction & Orchestration Engine

#### WP-CHAT-01: Message Model & Chat Persistence Pipeline
- **Mã Gói**: `WP-CHAT-01`
- **Tên Gói**: Xây dựng Model tin nhắn & luồng lưu trữ lịch sử đàm thoại.
- **Mô Tả**: Tạo bảng `messages` gắn với `conversation_id`, lưu trữ các lượt phát biểu của cả người dùng (`user`) và trợ lý ảo (`assistant`).
- **Mục Đích**: Đảm bảo không bị mất nội dung trò chuyện khi tải lại trang web.
- **Năng Lực Liên Quan**: `CAP-CHAT-AI`.
- **Yêu Cầu Liên Quan**: `FR-008`, `FR-009`, `BR-003`.
- **Phụ Thuộc (Dependencies)**: `WP-CONV-01`.
- **Kết Quả Kỳ Vọng**: Pipeline lưu vết tin nhắn tại Backend trước và sau khi gọi AI.
- **Artifacts Bắt Buộc**: Model `Message` và service layer ghi nhận tin nhắn.
- **Phương Pháp Kiểm Chứng**: Kiểm tra cơ sở dữ liệu sau mỗi lượt chat có đủ 1 cặp bản ghi (user prompt & assistant reply).
- **Trạng Thái Hiện Tại**: `NOT_STARTED`.

#### WP-CHAT-02: LLM Manager Streaming Integration (Server-Sent Events)
- **Mã Gói**: `WP-CHAT-02`
- **Tên Gói**: Nâng cấp bộ điều phối LLM hỗ trợ luồng truyền dữ liệu Streaming.
- **Mô Tả**: Cải tiến `LLMManager` để truyền dữ liệu sinh chữ theo thời gian thực (SSE / StreamingResponse) thay vì đợi sinh xong toàn bộ văn bản.
- **Mục Đích**: Giảm độ trễ hiển thị ký tự đầu tiên (TTFT) xuống dưới 2 giây theo tiêu chuẩn `NFR-PERF-02`.
- **Năng Lực Liên Quan**: `CAP-CHAT-AI`.
- **Yêu Cầu Liên Quan**: `FR-009`, `NFR-PERF-02`.
- **Phụ Thuộc (Dependencies)**: `WP-CHAT-01`.
- **Kết Quả Kỳ Vọng**: Endpoint stream tại `POST /api/v1/chat/stream`.
- **Artifacts Bắt Buộc**: Source code streaming backend và client stream reader tại `apiClient.ts`.
- **Phương Pháp Kiểm Chứng**: Đo thời gian hiển thị ký tự đầu tiên trên trình duyệt bằng DevTools Performance tab.
- **Trạng Thái Hiện Tại**: `NOT_STARTED`.

#### WP-CHAT-03: Multi-Provider Failover Engine (Gemini -> OpenAI)
- **Mã Gói**: `WP-CHAT-03`
- **Tên Gói**: Hoàn thiện động cơ tự động chuyển đổi dự phòng nhà cung cấp AI.
- **Mô Tả**: Xử lý triệt để các mã lỗi từ Gemini (429 Quota Exceeded, 503 Overloaded, Timeout > 30s) để tự động gọi sang OpenAI mà không ngắt luồng của người dùng.
- **Mục Đích**: Tối đa hóa tính sẵn sàng của dịch vụ theo tiêu chuẩn `NFR-REL-03` và `BO-02`.
- **Năng Lực Liên Quan**: `CAP-CHAT-AI`.
- **Yêu Cầu Liên Quan**: `FR-011`, `BR-005`, `AC-004`.
- **Phụ Thuộc (Dependencies)**: `WP-CHAT-02`.
- **Kết Quả Kỳ Vọng**: Module failover ổn định tại `ai-backend/llm/client.py`.
- **Artifacts Bắt Buộc**: Unit test giả lập lỗi `tests/test_fallback.py`.
- **Phương Pháp Kiểm Chứng**: Mock lỗi Gemini -> Kiểm chứng hệ thống gọi thành công OpenAI và ghi nhận cảnh báo trong log.
- **Trạng Thái Hiện Tại**: `NOT_STARTED`.

#### WP-CHAT-04: Frontend Chat Interface, Markdown & Code Syntax Renderer
- **Mã Gói**: `WP-CHAT-04`
- **Tên Gói**: Xây dựng giao diện Chat, kết xuất Markdown và làm nổi bật mã nguồn.
- **Mô Tả**: Hoàn thiện khung chat người dùng: Ô nhập liệu có nút gửi, danh sách bong bóng chat, hiệu ứng gõ chữ trực tiếp, định dạng công thức/bảng/danh sách và khối code có nút copy.
- **Mục Đích**: Mang lại trải nghiệm tương tác trực quan, cao cấp và tiện ích cho người dùng.
- **Năng Lực Liên Quan**: `CAP-CHAT-AI`.
- **Yêu Cầu Liên Quan**: `FR-008`, `FR-009`, `NFR-USB-01`, `NFR-USB-02`.
- **Phụ Thuộc (Dependencies)**: `WP-CHAT-02`, `WP-CONV-03`.
- **Kết Quả Kỳ Vọng**: Giao diện chat hoàn chỉnh tại `ai-frontend/src/app/page.tsx`.
- **Artifacts Bắt Buộc**: React component ChatWindow, MessageBubble, CodeBlock.
- **Phương Pháp Kiểm Chứng**: Gửi prompt yêu cầu viết code Python -> Trình duyệt render đúng khối màu sắc và nút copy hoạt động.
- **Trạng Thái Hiện Tại**: `NOT_STARTED`.

---

### Phase 05: Security Hardening, Testing & Quality Assurance

#### WP-SEC-01: Comprehensive Secret Scanning & Credential Exposure Audit
- **Mã Gói**: `WP-SEC-01`
- **Tên Gói**: Rà soát rò rỉ thông tin nhạy cảm và kiểm toán bảo vệ khóa API.
- **Mô Tả**: Quét toàn bộ repository, kiểm tra các gói tin mạng của client bảo đảm không có API Key của Gemini/OpenAI bị gửi về trình duyệt hoặc lưu vào git.
- **Mục Đích**: Loại bỏ rủi ro nghiêm trọng về rò rỉ ngân sách và tài khoản quản trị.
- **Năng Lực Liên Quan**: `CAP-SEC-PERF`.
- **Yêu Cầu Liên Quan**: `CST-01`, `NFR-SEC-02`, `SEC-01`.
- **Phụ Thuộc (Dependencies)**: Hoàn thành Phase 02, 03, 04.
- **Kết Quả Kỳ Vọng**: Báo cáo kiểm toán bảo mật sạch 100%.
- **Artifacts Bắt Buộc**: `docs/10-security/security-audit-report.md`.
- **Phương Pháp Kiểm Chứng**: Sử dụng TruffleHog / GitLeaks và phân tích network tab trên trình duyệt.
- **Trạng Thái Hiện Tại**: `NOT_STARTED`.

#### WP-SEC-02: Prompt Injection Mitigation & Markdown XSS Sanitization
- **Mã Gói**: `WP-SEC-02`
- **Tên Gói**: Gia cố phòng thủ tiêm nhiễm câu lệnh & làm sạch mã độc XSS.
- **Mô Tả**: Kiểm tra khả năng chống bypass system prompt và cấu hình DOMPurify/rehype-sanitize cho bộ render Markdown trên Frontend.
- **Mục Đích**: Bảo vệ người dùng khỏi các cuộc tấn công khai thác trình duyệt thông qua nội dung do AI tạo ra.
- **Năng Lực Liên Quan**: `CAP-SEC-PERF`.
- **Yêu Cầu Liên Quan**: `SEC-02`, `SEC-03`, `NFR-SEC-05`.
- **Phụ Thuộc (Dependencies)**: `WP-CHAT-04`.
- **Kết Quả Kỳ Vọng**: Bộ lọc đầu vào và bộ lọc hiển thị an toàn.
- **Artifacts Bắt Buộc**: Cấu hình sanitizer và bộ test case kiểm thử XSS.
- **Phương Pháp Kiểm Chứng**: Gửi prompt chứa thẻ `<script>alert(1)</script>` -> Kiểm tra giao diện không bị thực thi JavaScript.
- **Trạng Thái Hiện Tại**: `NOT_STARTED`.

#### WP-SEC-03: 100-Concurrent-Users Load Testing & Latency Benchmarks
- **Mã Gói**: `WP-SEC-03`
- **Tên Gói**: Kiểm thử tải đồng thời 100 người dùng & đo đạc hiệu năng độ trễ.
- **Mô Tả**: Chạy kịch bản kiểm thử tải mô phỏng 100 người dùng đồng thời gửi câu hỏi và duyệt lịch sử chat.
- **Mục Đích**: Đảm bảo hệ thống đạt độ ổn định và đáp ứng tiêu chí `NFR-PERF-03`.
- **Năng Lực Liên Quan**: `CAP-SEC-PERF`.
- **Yêu Cầu Liên Quan**: `NFR-PERF-01`, `NFR-PERF-03`.
- **Phụ Thuộc (Dependencies)**: Hoàn thành Phase 04.
- **Kết Quả Kỳ Vọng**: Báo cáo kiểm thử tải với tỷ lệ lỗi < 1% và thời gian phản hồi trung bình ổn định.
- **Artifacts Bắt Buộc**: `docs/11-testing/load-test-results.md`.
- **Phương Pháp Kiểm Chứng**: Chạy kịch bản Locust/k6 kiểm thử trực tiếp lên hệ thống.
- **Trạng Thái Hiện Tại**: `NOT_STARTED`.

#### WP-SEC-04: Dual-Tier Rate Limiting Validation (Nginx & FastAPI)
- **Mã Gói**: `WP-SEC-04`
- **Tên Gói**: Kiểm chứng cơ chế giới hạn tần suất 2 tầng.
- **Mô Tả**: Bắn request liên tục để kiểm tra tầng Nginx chặn tại 10 r/s và tầng Backend chặn tại 60 r/phút/IP.
- **Mục Đích**: Bảo đảm hệ thống không bị sập khi bị tấn công từ chối dịch vụ hoặc spam tự động.
- **Năng Lực Liên Quan**: `CAP-SEC-PERF`.
- **Yêu Cầu Liên Quan**: `BR-006`, `NFR-SEC-04`, `AC-005`.
- **Phụ Thuộc (Dependencies)**: Hoàn thành Phase 02 và 04.
- **Kết Quả Kỳ Vọng**: Mã HTTP 429 được trả về chính xác kèm thời gian hồi phục.
- **Artifacts Bắt Buộc**: Báo cáo kiểm thử giới hạn tần suất.
- **Phương Pháp Kiểm Chứng**: Kịch bản script tự động gửi 70 request/phút -> 10 request cuối phải nhận mã 429.
- **Trạng Thái Hiện Tại**: `NOT_STARTED`.

---

### Phase 06: Production Deployment & Observability

#### WP-OPS-01: Production Docker Compose Hardening (Closed DB Ports)
- **Mã Gói**: `WP-OPS-01`
- **Tên Gói**: Tối ưu hóa & gia cố hạ tầng Docker Compose cho môi trường Production.
- **Mô Tả**: Đóng hoàn toàn cổng 5432 (Postgres) và 6379 (Redis) ra mạng Internet, chỉ cho phép giao tiếp nội bộ trong docker network.
- **Mục Đích**: Bảo vệ cơ sở dữ liệu trước các cuộc dò quét cổng trái phép trên mạng công cộng.
- **Năng Lực Liên Quan**: `CAP-OPS`.
- **Yêu Cầu Liên Quan**: `CST-02`, `NFR-SCA-02`.
- **Phụ Thuộc (Dependencies)**: Hoàn thành Phase 05.
- **Kết Quả Kỳ Vọng**: File cấu hình `ai-infra/compose/docker-compose.prod.yml`.
- **Artifacts Bắt Buộc**: Production compose configuration.
- **Phương Pháp Kiểm Chứng**: Dùng Nmap quét từ bên ngoài máy chủ chỉ thấy mở cổng 80 và 443.
- **Trạng Thái Hiện Tại**: `NOT_STARTED`.

#### WP-OPS-02: Nginx SSL TLS 1.3 Ingress Termination & Security Headers
- **Mã Gói**: `WP-OPS-02`
- **Tên Gói**: Thiết lập chứng chỉ SSL TLS 1.3 và các tiêu chuẩn bảo mật Ingress.
- **Mô Tả**: Cấu hình chứng chỉ SSL chính thức (Let's Encrypt hoặc chứng chỉ tổ chức), bật HSTS, X-Frame-Options, Content-Security-Policy.
- **Mục Đích**: Đạt chuẩn bảo mật đường truyền theo `NFR-SEC-01`.
- **Năng Lực Liên Quan**: `CAP-OPS`.
- **Yêu Cầu Liên Quan**: `NFR-SEC-01`.
- **Phụ Thuộc (Dependencies)**: `WP-OPS-01`.
- **Kết Quả Kỳ Vọng**: Đạt điểm đánh giá SSL Labs hạng A+.
- **Artifacts Bắt Buộc**: File cấu hình `ai-infra/docker/nginx/nginx.conf` cập nhật.
- **Phương Pháp Kiểm Chứng**: Kiểm tra truy cập HTTPS hợp lệ trên trình duyệt không có cảnh báo bảo mật.
- **Trạng Thái Hiện Tại**: `NOT_STARTED`.

#### WP-OPS-03: Structured Telemetry & Sensitive Log Redaction
- **Mã Gói**: `WP-OPS-03`
- **Tên Gói**: Thiết lập hệ thống nhật ký có cấu trúc & ẩn danh dữ liệu nhạy cảm.
- **Mô Tả**: Cấu hình bộ ghi nhật ký JSON có chứa request ID, thời gian xử lý, mã lỗi, tự động lọc bỏ password và auth token.
- **Mục Đích**: Cung cấp khả năng quan sát vận hành và điều tra sự cố theo `NFR-OBS-01`.
- **Năng Lực Liên Quan**: `CAP-OPS`.
- **Yêu Cầu Liên Quan**: `NFR-OBS-01`, `SEC-06`.
- **Phụ Thuộc (Dependencies)**: `WP-OPS-01`.
- **Kết Quả Kỳ Vọng**: Luồng nhật ký chuẩn hóa tại stdout của container.
- **Artifacts Bắt Buộc**: Cấu hình logging tại `ai-backend/src/core/config.py`.
- **Phương Pháp Kiểm Chứng**: Kiểm tra log không chứa chuỗi ký tự mật khẩu hay token xác thực đầy đủ.
- **Trạng Thái Hiện Tại**: `NOT_STARTED`.

#### WP-OPS-04: Operations Runbook & Rollback Procedure Documentation
- **Mã Gói**: `WP-OPS-04`
- **Tên Gói**: Biên soạn Sổ tay Vận hành & Quy trình Phục hồi Sự cố (Runbook).
- **Mô Tả**: Hướng dẫn chi tiết cách khởi động, sao lưu dữ liệu, khôi phục sự cố, và rollback phiên bản khi phát hành lỗi.
- **Mục Đích**: Đảm bảo đội ngũ vận hành có thể duy trì hệ thống liên tục và ứng cứu kịp thời.
- **Năng Lực Liên Quan**: `CAP-OPS`.
- **Yêu Cầu Liên Quan**: `NFR-REL-01`, `NFR-REL-02`.
- **Phụ Thuộc (Dependencies)**: `WP-OPS-01`, `WP-OPS-02`.
- **Kết Quả Kỳ Vọng**: Tài liệu hướng dẫn vận hành chi tiết và quy trình rollback từng bước.
- **Artifacts Bắt Buộc**: `docs/12-operations/runbook.md`, `docs/12-operations/rollback-plan.md`.
- **Phương Pháp Kiểm Chứng**: Diễn tập khôi phục thử nghiệm trên môi trường Staging.
- **Trạng Thái Hiện Tại**: `NOT_STARTED`.
