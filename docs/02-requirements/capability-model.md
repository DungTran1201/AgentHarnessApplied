# MÔ HÌNH CÂY NĂNG LỰC HỆ THỐNG (SYSTEM CAPABILITY MODEL)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `CAP-MODEL-001` |
| **Mục đích** | Phân rã toàn diện cây năng lực chức năng và năng lực phụ trợ (Supporting Capabilities) để tránh bỏ sót các thành phần thiết yếu |
| **Nguyên tắc** | Không chỉ tập trung vào tính năng bề nổi; phải bao quát đầy đủ xác thực, phân quyền, xử lý ngoại lệ, bảo vệ an ninh và độ bền vững dữ liệu |

---

## 1. Sơ Đồ Cây Năng Lực Toàn Diện (System Capability Hierarchy)

```text
AI-CHAN CAPABILITY MODEL
├── 1. CAP-AUTH: Định Danh & Xác Thực (Identity & Access Management)
│   ├── 1.1 Registration Capability (Đăng ký tài khoản)
│   ├── 1.2 Login Capability (Đăng nhập & xác thực)
│   ├── 1.3 Logout Capability (Thu hồi phiên & đăng xuất)
│   ├── 1.4 Session & Token Management (Quản lý JWT & HttpOnly Cookie)
│   ├── 1.5 Password Security & Hashing (Băm mật khẩu an toàn với muối)
│   ├── 1.6 Route Authorization (Bảo vệ tuyến đường & kiểm tra phiên)
│   └── 1.7 Account Status Enforcement (Kiểm tra trạng thái tài khoản ACTIVE/LOCKED)
│
├── 2. CAP-CONV: Quản Lý Vòng Đời Cuộc Trò Chuyện (Conversation Lifecycle)
│   ├── 2.1 Conversation Creation (Khởi tạo phiên chat mới)
│   ├── 2.2 Conversation Retrieval & Listing (Liệt kê danh sách theo thời gian)
│   ├── 2.3 Conversation Renaming (Đổi tên thủ công & tự động sinh tiêu đề)
│   ├── 2.4 Conversation Deletion (Xóa mềm cuộc trò chuyện & tin nhắn con)
│   └── 2.5 Data Isolation & Ownership Defense (Cách ly dữ liệu người dùng, chống IDOR)
│
├── 3. CAP-CHAT-MSG: Quản Lý Tin Nhắn & Đàm Thoại (Message Management)
│   ├── 3.1 Message Input & Validation (Kiểm tra định dạng, giới hạn 4000 ký tự)
│   ├── 3.2 Message Persistence (Lưu trữ tin nhắn người dùng và phản hồi AI)
│   ├── 3.3 Context Window Management (Cắt tỉa ngữ cảnh hội thoại chống tràn bộ nhớ)
│   └── 3.4 Token Accounting (Đo lường & lưu vết số lượng token tiêu thụ)
│
├── 4. CAP-AI-ORCH: Điều Phối Trí Tuệ Nhân Tạo (AI Orchestration Engine)
│   ├── 4.1 Model Selection (Tùy chọn mô hình AI theo mong muốn người dùng)
│   ├── 4.2 Primary AI Calling (Giao tiếp bảo mật với Google Gemini API)
│   ├── 4.3 Automatic Failover & Fallback (Tự động chuyển tiếp sang OpenAI khi lỗi)
│   ├── 4.4 Streaming Response Pipeline (Truyền luồng dữ liệu chunk-by-chunk SSE)
│   └── 4.5 Markdown & Code Syntax Rendering (Kết xuất văn bản định dạng phong phú)
│
├── 5. CAP-SEC-PERF: Phòng Thủ An Ninh & Hiệu Năng (Protection & Performance)
│   ├── 5.1 Dual-Tier Rate Limiting (Giới hạn tần suất tại Ingress Nginx và FastAPI)
│   ├── 5.2 XSS Defense & Output Sanitization (Làm sạch mã độc trong câu trả lời AI)
│   ├── 5.3 Prompt Injection Mitigation (Phân tách chỉ thị hệ thống và dữ liệu người dùng)
│   └── 5.4 API Key Hardening (Cô lập tuyệt đối bí mật tại máy chủ Backend)
│
└── 6. CAP-OPS: Vận Hành, Sẵn Sàng & Quan Sát (Operations & Telemetry)
    ├── 6.1 Ingress SSL TLS 1.3 Termination (Mã hóa toàn bộ đường truyền mạng)
    ├── 6.2 Health Check & Service Probes (Endpoint giám sát sức khỏe dịch vụ)
    ├── 6.3 Structured Logging & Redaction (Ghi nhật ký có cấu trúc, che giấu dữ liệu nhạy cảm)
    ├── 6.4 Automatic Service Recovery (Tự phục hồi container khi gặp sự cố crash)
    └── 6.5 Database Backup & Disaster Recovery (Kế hoạch sao lưu & khôi phục dữ liệu)
```

---

## 2. Ma Trận Đánh Giá & Phân Loại Mức Độ Ưu Tiên Của Năng Lực

| Mã Năng Lực | Tên Năng Lực Chi Tiết | Phân Loại Cốt Lõi / Phụ Trợ | Độ Ưu Tiên (MoSCoW) | Yêu Cầu FR/NFR Tương Ứng | Giai Đoạn Dự Kiến |
| :--- | :--- | :---: | :---: | :--- | :---: |
| `CAP-AUTH-01` | Đăng ký tài khoản người dùng | Cốt lõi | **MUST** | `FR-001`, `AC-001` | Phase 02 |
| `CAP-AUTH-02` | Đăng nhập & Cấp phát JWT | Cốt lõi | **MUST** | `FR-002`, `AC-001` | Phase 02 |
| `CAP-AUTH-03` | Đăng xuất & Hủy phiên | Cốt lõi | **MUST** | `FR-003`, `AC-001` | Phase 02 |
| `CAP-AUTH-04` | Quản lý phiên an toàn (HttpOnly Cookie) | Phụ trợ an ninh | **MUST** | `NFR-004`, `SEC-004` | Phase 02 |
| `CAP-AUTH-05` | Băm mật khẩu Argon2id/Bcrypt | Phụ trợ an ninh | **MUST** | `NFR-006` | Phase 02 |
| `CAP-AUTH-06` | Middleware phân quyền theo tuyến đường | Phụ trợ an ninh | **MUST** | `BR-001` | Phase 02 |
| `CAP-CONV-01` | Khởi tạo cuộc trò chuyện mới | Cốt lõi | **MUST** | `FR-004`, `AC-002` | Phase 03 |
| `CAP-CONV-02` | Liệt kê danh sách lịch sử trò chuyện | Cốt lõi | **MUST** | `FR-005`, `AC-002` | Phase 03 |
| `CAP-CONV-03` | Đổi tên cuộc trò chuyện thủ công/tự động | Cốt lõi | **SHOULD** | `FR-006`, `BR-004` | Phase 03 |
| `CAP-CONV-04` | Xóa cuộc trò chuyện (Soft Delete) | Cốt lõi | **MUST** | `FR-007`, `NFR-018` | Phase 03 |
| `CAP-CONV-05` | Cách ly dữ liệu & Chống truy cập IDOR | Phụ trợ an ninh | **MUST** | `FR-012`, `BR-002` | Phase 03 |
| `CAP-CHAT-01` | Tiếp nhận tin nhắn & Kiểm tra độ dài | Cốt lõi | **MUST** | `FR-008`, `BR-003` | Phase 04 |
| `CAP-CHAT-02` | Lưu vết tin nhắn vào cơ sở dữ liệu | Phụ trợ dữ liệu | **MUST** | `FR-008`, `FR-009` | Phase 04 |
| `CAP-CHAT-03` | Quản lý kích thước trượt ngữ cảnh hội thoại | Phụ trợ hiệu năng | **SHOULD** | `NFR-012` | Phase 04 |
| `CAP-CHAT-04` | Tính toán & Ghi nhận token tiêu thụ | Phụ trợ chi phí | **MUST** | `FR-014` | Phase 04 |
| `CAP-AI-01` | Tùy chọn mô hình AI (Model Selector) | Cốt lõi | **SHOULD** | `FR-010` | Phase 04 |
| `CAP-AI-02` | Giao tiếp AI chính (Google Gemini) | Cốt lõi | **MUST** | `FR-009`, `AC-003` | Phase 04 |
| `CAP-AI-03` | Tự động chuyển vùng dự phòng (OpenAI) | Cốt lõi | **MUST** | `FR-011`, `BR-005`, `AC-004` | Phase 04 |
| `CAP-AI-04` | Truyền luồng phản hồi Streaming SSE | Cốt lõi | **MUST** | `FR-013`, `NFR-002` | Phase 04 |
| `CAP-AI-05` | Kết xuất Markdown & Highlight code syntax | Cốt lõi | **MUST** | `FR-009`, `NFR-016` | Phase 04 |
| `CAP-SEC-01` | Giới hạn lưu lượng 2 tầng (Rate Limiting) | Phụ trợ an ninh | **MUST** | `NFR-007`, `BR-006`, `SEC-005` | Phase 05 |
| `CAP-SEC-02` | Khử khuẩn hiển thị chống XSS | Phụ trợ an ninh | **MUST** | `NFR-008`, `SEC-003` | Phase 05 |
| `CAP-SEC-03` | Phòng thủ tiêm nhiễm Prompt Injection | Phụ trợ an ninh | **MUST** | `SEC-002` | Phase 05 |
| `CAP-SEC-04` | Bảo vệ khóa bí mật API Backend | Phụ trợ an ninh | **MUST** | `NFR-005`, `SEC-001`, `CST-01` | Phase 05 |
| `CAP-OPS-01` | Mã hóa HTTPS Ingress TLS 1.3 | Phụ trợ hạ tầng | **MUST** | `NFR-004`, `CST-02` | Phase 06 |
| `CAP-OPS-02` | Endpoint kiểm tra sức khỏe (/health) | Phụ trợ vận hành | **MUST** | `NFR-009` | Phase 06 |
| `CAP-OPS-03` | Ghi log JSON có cấu trúc & Ẩn danh bí mật | Phụ trợ quan sát | **MUST** | `NFR-019`, `SEC-006` | Phase 06 |
| `CAP-OPS-04` | Tự động phục hồi container khi crash | Phụ trợ tin cậy | **MUST** | `NFR-010` | Phase 06 |
| `CAP-OPS-05` | Kế hoạch sao lưu & Khôi phục sự cố | Phụ trợ vận hành | **SHOULD** | `NFR-009` | Phase 06 |
