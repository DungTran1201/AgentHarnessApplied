# THỨ TỰ XÂY DỰNG & CÁC LUỒNG THI CÔNG SONG SONG (BUILD ORDER SPECIFICATION)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `BLD-ORDER-001` |
| **Mục đích** | Xác định chính xác thứ tự thực hiện từng gói công việc (Work Package), chỉ rõ các luồng chạy song song và lý giải nguyên nhân kỹ thuật |
| **Nguyên tắc** | Tôn trọng phụ thuộc thực tế; không triển khai tầng phụ thuộc trước khi tầng nền tảng hoàn thành |

---

## 1. Sơ Đồ Thứ Tự Xây Dựng & Các Nhánh Song Song (Parallel Execution Graph)

```text
GIAI ĐOẠN 1: THIẾT KẾ KIẾN TRÚC & HỢP ĐỒNG (TUẦN TỰ)
  [WP-ARCH-01: SAD & C4 Component]
           │
           ├───────────────────────────────┐
           ▼                               ▼
  [WP-ARCH-02: DB Schema Design]   [WP-ARCH-04: Secret Template]
           │
           ▼
  [WP-ARCH-03: OpenAPI 3.1 Contract]
           │
═══════════╪═══════════════════════════════════════════════════════════════
           │  (Hợp đồng API đã chốt -> Bắt đầu rẽ nhánh song song)
           ▼
GIAI ĐOẠN 2 & 3: PHÁT TRIỂN SONG SONG BACKEND & FRONTEND
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│     NHÁNH BACKEND (FastAPI)     │       │     NHÁNH FRONTEND (Next.js)    │
├─────────────────────────────────┤       ├─────────────────────────────────┤
│ [WP-AUTH-01: User Model & Hash] │       │                                 │
│                │                │       │                                 │
│                ▼                │       │                                 │
│ [WP-AUTH-02: Auth API Endpoints]│──────►│ [WP-AUTH-04: Login/Reg UI Page] │
│                │                │       │                │                │
│                ▼                │       │                ▼                │
│ [WP-AUTH-03: JWT Middleware]    │       │ [WP-CONV-03: Sidebar Component] │
│                │                │       │                │                │
│                ▼                │       │                │                │
│ [WP-CONV-01: Conv CRUD API]     │──────►│                │                │
│                │                │       │                │                │
│                ▼                │       │                │                │
│ [WP-CONV-02: Auto-Title Logic]  │       │                │                │
│                │                │       │                │                │
│                ▼                │       │                ▼                │
│ [WP-CHAT-01: Message Pipeline]  │       │ [WP-CHAT-04: Chat Interface UI] │
│                │                │       │ (Markdown + Code highlight)     │
│                ▼                │       │                ▲                │
│ [WP-CHAT-02: LLM SSE Streaming] │───────┼────────────────┘                │
│                │                │       │                                 │
│                ▼                │       │                                 │
│ [WP-CHAT-03: Multi-AI Failover] │       │                                 │
└─────────────────────────────────┘       └─────────────────────────────────┘
           │                                       │
═══════════╧═══════════════════════════════════════╧═══════════════════════
           ▼
GIAI ĐOẠN 4: HỢP NHẤT, KIỂM THỬ AN NINH & TẢI (INTEGRATION & HARDENING)
  [WP-SEC-01: Secret Scanning]  ──┐
  [WP-SEC-02: XSS Sanitization] ──┼─► [WP-SEC-03: Load Testing (100 Users)]
  [WP-SEC-04: Rate Limit Check] ──┘
           │
           ▼
GIAI ĐOẠN 5: ĐÓNG GÓI HẠ TẦNG & SẴN SÀNG PHÁT HÀNH
  [WP-OPS-01: Production Compose] ──► [WP-OPS-02: Nginx SSL TLS 1.3] ──► [WP-OPS-04: Runbook]
```

---

## 2. Chi Tiết Thứ Tự Thực Thi & Ràng Buộc Kỹ Thuật (Step-by-Step Rationale)

### Bước 1: Khởi Tạo Kiến Trúc & Hợp Đồng Giao Tiếp (Phải làm đầu tiên)
- **Thực hiện**: `WP-ARCH-01` -> `WP-ARCH-02` -> `WP-ARCH-03` -> `WP-ARCH-04`.
- **Lý do bắt buộc**:
  - `WP-ARCH-01` (SAD) phải đi trước vì toàn bộ ranh giới trách nhiệm giữa Frontend, Backend và Ingress Gateway được quyết định tại đây.
  - `WP-ARCH-02` (DB Schema) và `WP-ARCH-03` (OpenAPI) phải hoàn thành trước khi viết code để chốt hợp đồng dữ liệu. Nếu không có hợp đồng API chuẩn, đội Frontend và Backend sẽ phát triển sai lệch kiểu dữ liệu (Data Type Mismatch) và gây lãng phí công sức làm lại.

### Bước 2: Xây Dựng Lõi Định Danh & Xác Thực (Authentication Core)
- **Thực hiện**: `WP-AUTH-01` -> `WP-AUTH-02` -> `WP-AUTH-03` (Backend) song song với `WP-AUTH-04` (Frontend UI).
- **Lý do bắt buộc**:
  - Tại sao `WP-AUTH` phải làm trước `WP-CONV` và `WP-CHAT`? Bởi vì theo quy tắc nghiệp vụ `BR-001` và `BR-002`, mọi cuộc trò chuyện và tin nhắn đều bắt buộc phải thuộc sở hữu của một `user_id` đã xác thực. Nếu chưa có User và JWT Token, ta không thể liên kết hay bảo vệ dữ liệu hội thoại.

### Bước 3: Xây Dựng Quản Lý Phiên Hội Thoại (Conversation Lifecycle)
- **Thực hiện**: `WP-CONV-01` -> `WP-CONV-02` -> `WP-CONV-04` (Backend) song song với `WP-CONV-03` (Sidebar UI).
- **Lý do bắt buộc**:
  - Phải có thực thể `Conversation` thì mới có nơi để chứa `Messages`.
  - Logic tự động sinh tiêu đề (`WP-CONV-02`) và kiểm tra phân quyền chống IDOR (`WP-CONV-04`) phải gắn liền ngay khi tạo API conversation để đảm bảo an ninh từ gốc (Security by Design).

### Bước 4: Xây Dựng Tương Tác Chat & Động Cơ AI (Chat & AI Engine)
- **Thực hiện**: `WP-CHAT-01` -> `WP-CHAT-02` -> `WP-CHAT-03` (Backend) tích hợp vào `WP-CHAT-04` (Frontend).
- **Lý do bắt buộc**:
  - Luồng lưu tin nhắn (`WP-CHAT-01`) phải hoạt động để lưu prompt người dùng trước khi gọi LLM.
  - Nâng cấp Streaming SSE (`WP-CHAT-02`) và Failover (`WP-CHAT-03`) là trái tim của hệ thống AI, sau đó mới gắn vào bộ render Markdown/Code syntax của giao diện.

### Bước 5: Kiểm Thử Toàn Diện, Kiểm Toán An Ninh & Tải Đồng Thời
- **Thực hiện**: `WP-SEC-01`, `WP-SEC-02`, `WP-SEC-04` -> `WP-SEC-03`.
- **Lý do bắt buộc**:
  - Chỉ kiểm thử tải đồng thời (100 users) khi toàn bộ các luồng chức năng và rate limiting đã hoàn thiện, phản ánh đúng tải thực tế của hệ thống.

### Bước 6: Đóng Gói Hạ Tầng & Ban Hành Vận Hành (Release Candidate)
- **Thực hiện**: `WP-OPS-01` -> `WP-OPS-02` -> `WP-OPS-03` -> `WP-OPS-04`.
- **Lý do bắt buộc**:
  - Cấu hình Production Compose và SSL TLS 1.3 là bước chốt chặn cuối cùng trước khi đưa hệ thống ra môi trường mạng công cộng.

---

## 3. Các Hạng Mục Bị Chặn & Điều Kiện Mở Khóa (Blocker Analysis)

| Hạng Mục Đang Bị Chặn (Blocked Item) | Bị Chặn Bởi (Blocked By) | Điều Kiện Mở Khóa (Unblocking Condition) |
| :--- | :--- | :--- |
| Toàn bộ việc viết mã nguồn (Coding) | Giai đoạn Planning chưa chốt | Hoàn tất phê duyệt tài liệu tại `docs/01-planning/` |
| `WP-AUTH-01` (User Model) | `WP-ARCH-02` (DB Schema) | Lược đồ bảng `users` được phê duyệt trong Database Design |
| `WP-AUTH-04` (Login UI) | `WP-ARCH-03` (OpenAPI) | Schema API `/auth/login` được đặc tả rõ ràng |
| `WP-CONV-01` (Conversation API) | `WP-AUTH-03` (JWT Middleware)| Middleware xác thực `get_current_user` đã hoạt động |
| `WP-CHAT-01` (Message API) | `WP-CONV-01` (Conversation API)| Bảng và API cuộc trò chuyện đã sẵn sàng tiếp nhận tin nhắn |
| `WP-SEC-03` (Load Testing) | Phase 02, 03, 04 | Toàn bộ các API chính đã hoàn thiện và kết nối thông suốt |
| `WP-OPS-01` (Production Infra) | `WP-SEC-01` (Security Audit)| Đảm bảo không còn bất kỳ secret hay lỗ hổng nào trong mã nguồn |
