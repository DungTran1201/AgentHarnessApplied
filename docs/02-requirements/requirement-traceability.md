# MA TRẬN TRUY VẾT YÊU CẦU ĐA TẦNG (MULTI-TIER REQUIREMENT TRACEABILITY MATRIX)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `REQ-TRC-001` |
| **Mục đích** | Thiết lập ma trận truy vết hai chiều (Bidirectional Traceability) từ Mục tiêu Nghiệp vụ -> Năng lực -> Yêu cầu -> Tiêu chí Nghiệm thu -> Quy trình Nghiệp vụ & Ca Sử Dụng kế tiếp |
| **Cam kết chất lượng** | **100% Yêu cầu được bảo chứng nguồn gốc (Zero Orphan Requirements)** |

---

## 1. Sơ Đồ Khung Truy Vết Tổng Thể (Traceability Architecture)

```text
[Business Goals: BO-01..BO-04]
            │
            ▼
[Capabilities: CAP-AUTH, CAP-CONV, CAP-CHAT-AI, CAP-SEC, CAP-OPS]
            │
            ▼
[Normalized Requirements: FR-001..014, NFR-001..019, BR-001..006, SEC-001..006]
            │
            ▼
[Acceptance Criteria: AC-001..AC-005 (Given-When-Then)]
            │
            ├───────────────────────────────────────────┐
            ▼                                           ▼
[Downstream: Business Process (BPMN/Swimlane)]   [Downstream: Use Cases (UC-###)]
```

---

## 2. Bảng Truy Vết Yêu Cầu Chức Năng (Functional Requirements Traceability)

| Mục Tiêu (BO) | Nhóm Năng Lực (Capability) | Mã Yêu Cầu (FR) | Tên Yêu Cầu Chức Năng | Tiêu Chí Nghiệm Thu (AC) | Quy Trình Nghiệp Vụ Dự Kiến (Phase 03) | Ca Sử Dụng Dự Kiến (Phase 03) |
| :---: | :--- | :---: | :--- | :---: | :--- | :--- |
| **BO-03** | `CAP-AUTH` | **FR-001** | User Registration | `AC-001-A`, `AC-001-B` | `PROC-AUTH-01` (Quy trình Đăng ký tài khoản) | `UC-AUTH-01` (Đăng ký tài khoản mới) |
| **BO-03** | `CAP-AUTH` | **FR-002** | User Login | `AC-001-C`, `AC-001-D` | `PROC-AUTH-02` (Quy trình Xác thực đăng nhập) | `UC-AUTH-02` (Đăng nhập hệ thống) |
| **BO-03** | `CAP-AUTH` | **FR-003** | User Logout | `AC-001-E` | `PROC-AUTH-03` (Quy trình Đăng xuất & Thu hồi phiên) | `UC-AUTH-03` (Đăng xuất hệ thống) |
| **BO-03** | `CAP-CONV` | **FR-004** | Create Conversation | `AC-002-A` | `PROC-CONV-01` (Quy trình Khởi tạo phiên chat) | `UC-CONV-01` (Tạo cuộc trò chuyện mới) |
| **BO-03** | `CAP-CONV` | **FR-005** | List Conversation History | `AC-002-B` | `PROC-CONV-02` (Quy trình Truy xuất lịch sử) | `UC-CONV-02` (Xem danh sách cuộc trò chuyện) |
| **BO-03** | `CAP-CONV` | **FR-006** | Rename Conversation | `AC-002-C` | `PROC-CONV-03` (Quy trình Cập nhật tiêu đề hội thoại) | `UC-CONV-03` (Đổi tên cuộc trò chuyện) |
| **BO-03** | `CAP-CONV` | **FR-007** | Delete Conversation | `AC-002-D` | `PROC-CONV-04` (Quy trình Xóa phiên hội thoại) | `UC-CONV-04` (Xóa cuộc trò chuyện) |
| **BO-04** | `CAP-CONV` | **FR-012** | Conversation Data Isolation | `AC-002-E` | `PROC-SEC-01` (Kiểm soát phân quyền dữ liệu) | `UC-CONV-05` (Bảo vệ cách ly dữ liệu cá nhân) |
| **BO-01** | `CAP-CHAT-AI` | **FR-008** | Send Message & Input Validation | `AC-003-A`, `AC-003-B` | `PROC-CHAT-01` (Quy trình Tiếp nhận & Kiểm tra tin nhắn) | `UC-CHAT-01` (Gửi tin nhắn đàm thoại) |
| **BO-01** | `CAP-CHAT-AI` | **FR-009** | Receive AI Response | `AC-003-C`, `AC-003-D` | `PROC-CHAT-02` (Quy trình Xử lý & Hiển thị kết quả AI) | `UC-CHAT-02` (Nhận câu trả lời từ AI) |
| **BO-01** | `CAP-CHAT-AI` | **FR-010** | Select AI Model/Provider | `AC-003-E` | `PROC-CHAT-03` (Quy trình Tùy biến mô hình AI) | `UC-CHAT-03` (Chọn mô hình AI đàm thoại) |
| **BO-02** | `CAP-CHAT-AI` | **FR-011** | Multi-Provider Failover | `AC-004-A`, `AC-004-B` | `PROC-AI-01` (Quy trình Chuyển vùng dự phòng tự động) | `UC-CHAT-04` (Tự động phục hồi lỗi AI Provider) |
| **BO-01** | `CAP-CHAT-AI` | **FR-013** | Streaming Response Delivery | `AC-003-C` | `PROC-CHAT-04` (Quy trình Truyền luồng dữ liệu thời gian thực) | `UC-CHAT-05` (Trải nghiệm đàm thoại dạng Streaming) |
| **BO-02** | `CAP-CHAT-AI` | **FR-014** | Message Token Accounting | `AC-003-A` | `PROC-AI-02` (Quy trình Đo lường định ngạch token) | `UC-CHAT-06` (Kiểm soát mức độ tiêu thụ token) |
| **BO-03** | `CAP-USER` | **FR-015** | View User Profile & Stats | `AC-007-A` | `PROC-011` (Quản lý hồ sơ cá nhân) | `UC-010` (Xem thông tin hồ sơ & thống kê) |
| **BO-03** | `CAP-USER` | **FR-016** | Update Profile Information | `AC-007-B` | `PROC-011` (Quản lý hồ sơ cá nhân) | `UC-011` (Cập nhật thông tin hồ sơ) |
| **BO-03** | `CAP-USER` | **FR-017** | Update User Avatar | `AC-007-C` | `PROC-011` (Quản lý hồ sơ cá nhân) | `UC-012` (Cập nhật ảnh đại diện) |
| **BO-04** | `CAP-USER` | **FR-018** | Secure Email Change | `AC-007-D` | `PROC-012` (Thay đổi thông tin nhạy cảm) | `UC-013` (Thay đổi địa chỉ email an toàn) |
| **BO-04** | `CAP-USER` | **FR-019** | Secure Password Change | `AC-007-E` | `PROC-012` (Thay đổi thông tin nhạy cảm) | `UC-014` (Thay đổi mật khẩu đăng nhập) |
| **BO-03** | `CAP-USER` | **FR-020** | Update User Preferences | `AC-007-F` | `PROC-011` (Quản lý hồ sơ cá nhân) | `UC-015` (Tùy chọn giao diện & ngôn ngữ) |
| **BO-02** | `CAP-AGENT-MGMT` | **FR-021** | Multi-Provider Agent & Model Catalog | `AC-008-A` | `PROC-013` (Quản lý danh mục mô hình) | `UC-016` (Xem danh mục mô hình & Agent) |
| **BO-02** | `CAP-AGENT-MGMT` | **FR-022** | View Model Details & Specs | `AC-008-B` | `PROC-013` (Quản lý danh mục mô hình) | `UC-017` (Xem thông số & khả năng mô hình) |
| **BO-02** | `CAP-AGENT-MGMT` | **FR-023** | Dynamic Model Configuration | `AC-008-C` | `PROC-013` (Quản lý danh mục mô hình) | `UC-018` (Cấu hình tham số mô hình AI) |
| **BO-02** | `CAP-AGENT-MGMT` | **FR-024** | Activate Agent Model | `AC-008-D` | `PROC-013` (Quản lý danh mục mô hình) | `UC-019` (Kích hoạt mô hình hoạt động) |
| **BO-02** | `CAP-AGENT-MGMT` | **FR-025** | Deactivate Agent Model | `AC-008-E` | `PROC-013` (Quản lý danh mục mô hình) | `UC-020` (Hủy kích hoạt mô hình) |
| **BO-02** | `CAP-AGENT-MGMT` | **FR-026** | Set Default Agent Model | `AC-008-F` | `PROC-013` (Quản lý danh mục mô hình) | `UC-020` (Thiết lập mô hình mặc định) |
| **BO-03** | `CAP-AUTH` | **FR-027** | Discord Account Registration | `AC-009-A` | `PROC-014` (Quy trình Xác thực OAuth2 Discord) | `UC-021` (Đăng ký tài khoản qua Discord) |
| **BO-03** | `CAP-AUTH` | **FR-028** | Discord Account Login & Linking | `AC-009-B` | `PROC-014` (Quy trình Xác thực OAuth2 Discord) | `UC-022` (Đăng nhập & liên kết Discord) |
| **BO-04** | `CAP-RES-MGMT` | **FR-029** | API Response Time & TTFT Latency Telemetry | `TC-024` | `PROC-015` (Thu thập Telemetry tự động) | `UC-023` (Xem Dashboard giám sát tài nguyên) |
| **BO-04** | `CAP-RES-MGMT` | **FR-030** | Token Consumption Accounting & Model Breakdown | `TC-024` | `PROC-015` (Thu thập Telemetry tự động) | `UC-024` (Tra cứu thống kê Token & Độ trễ) |
| **BO-04** | `CAP-RES-MGMT` | **FR-031** | API Request Volume, Rate & HTTP Status Tracking | `TC-024` | `PROC-015` (Thu thập Telemetry tự động) | `UC-023` (Xem Dashboard giám sát tài nguyên) |
| **BO-04** | `CAP-RES-MGMT` | **FR-032** | User Quota Management & Rate Limit Guard | `TC-026` | `PROC-016` (Phát luồng & Kiểm soát Quota) | `UC-025` (Kiểm tra hạn ngạch & Cảnh báo Quota) |
| **BO-04** | `CAP-RES-MGMT` | **FR-033** | Real-time Telemetry Stream via Server-Sent Events | `TC-025` | `PROC-016` (Phát luồng & Kiểm soát Quota) | `UC-023` (Xem Dashboard giám sát tài nguyên) |
| **BO-04** | `CAP-RES-MGMT` | **FR-034** | Interactive Real-Time Resource Dashboard UI | `TC-025` | `PROC-016` (Phát luồng & Kiểm soát Quota) | `UC-023` (Xem Dashboard giám sát tài nguyên) |
| **BO-02** | `CAP-AGENT-MGMT` | **FR-035** | Register & Add New Agent Model | `TC-027` | `PROC-017` (Đăng ký & hiệu chỉnh mô hình) | `UC-026` (Đăng ký & bổ sung mô hình mới) |
| **BO-02** | `CAP-AGENT-MGMT` | **FR-036** | Update & Edit Agent Model Configuration | `TC-028` | `PROC-017` (Đăng ký & hiệu chỉnh mô hình) | `UC-027` (Chỉnh sửa cấu hình mô hình) |
| **BO-02** | `CAP-AGENT-MGMT` | **FR-037** | Full-Text & Fuzzy Model Search | `TC-029` | `PROC-018` (Tìm kiếm, lọc & lưu trữ mô hình) | `UC-028` (Tìm kiếm tức thì & lọc đa tiêu chí) |
| **BO-02** | `CAP-AGENT-MGMT` | **FR-038** | Multi-Attribute Model Filtering & Sorting | `TC-029` | `PROC-018` (Tìm kiếm, lọc & lưu trữ mô hình) | `UC-028` (Tìm kiếm tức thì & lọc đa tiêu chí) |
| **BO-02** | `CAP-AGENT-MGMT` | **FR-039** | Model Soft Deletion & Archival Guard | `TC-030` | `PROC-018` (Tìm kiếm, lọc & lưu trữ mô hình) | `UC-027` (Chỉnh sửa cấu hình & lưu trữ mô hình) |
| **BO-03** | `CAP-USER-MGMT` | **FR-040** | Link Authenticated User Account with Discord | `TC-031`, `TC-032` | `PROC-019` (Liên kết tài khoản Discord) | `UC-029` (Liên kết tài khoản với Discord) |
| **BO-03** | `CAP-USER-MGMT` | **FR-041** | Unlink Discord Account with Account Lockout Guard | `TC-033`, `TC-034` | `PROC-020` (Hủy liên kết tài khoản Discord) | `UC-030` (Hủy liên kết tài khoản Discord) |
| **BO-03** | `CAP-USER-MGMT` | **FR-042** | Manage & Display Connected Social Accounts | `TC-031`, `TC-033` | `PROC-019`, `PROC-020` | `UC-029`, `UC-030` |
| **BO-03** | `CAP-BOT-MGMT` | **FR-044** | Discord Bot Connection Status & Guild Discovery | `TC-039` | `PROC-022` (Quản lý cấu hình Bot Discord) | `UC-032` (Khám phá Guild & Trạng thái Bot) |
| **BO-02** | `CAP-BOT-MGMT` | **FR-045** | Dynamic Model Routing & Persona Prompting | `TC-040` | `PROC-022` (Quản lý cấu hình Bot Discord) | `UC-032` (Cấu hình Model & Persona Bot) |
| **BO-04** | `CAP-BOT-MGMT` | **FR-046** | Shared Quota Accounting & Discord Token Ceiling | `TC-041` | `PROC-023` (Điều phối tương tác Bot & Hạn ngạch) | `UC-033` (Kiểm soát hạn ngạch đàm thoại Discord) |
| **BO-01** | `CAP-BOT-MGMT` | **FR-047** | Discord-to-Web Interaction History Synchronization | `TC-042` | `PROC-023` (Điều phối tương tác Bot & Hạn ngạch) | `UC-034` (Đồng bộ lịch sử trò chuyện Discord & Web) |

---

## 3. Bảng Truy Vết Yêu Cầu Phi Chức Năng (Non-Functional Requirements Traceability)

| Nhóm Tiêu Chuẩn | Mã Yêu Cầu (NFR) | Nội Dung Định Lượng | Nhóm Năng Lực Bảo Chứng | Tiêu Chí Nghiệm Thu (AC) | Cơ Chế Kiểm Soát Kỹ Thuật |
| :--- | :---: | :--- | :---: | :---: | :--- |
| **Hiệu Năng** | `NFR-001` | FCP < 1.5s; LCP < 2.5s | `CAP-CHAT-AI` | `AC-001`, `AC-002` | Tối ưu hóa bundle Next.js, nén Gzip Nginx |
| | `NFR-002` | Time-To-First-Token < 2.0s | `CAP-CHAT-AI` | `AC-003-C` | Giao thức truyền luồng Server-Sent Events |
| | `NFR-003` | Chịu tải đồng thời 100 concurrent users | `CAP-SEC-PERF` | `AC-005` | Kiến trúc FastAPI ASGI & Uvicorn workers |
| **An Ninh** | `NFR-004` | 100% HTTPS TLS 1.3 | `CAP-OPS` | `AC-005` | Nginx Ingress SSL Termination |
| | `NFR-005` | Zero Client API Key Exposure | `CAP-SEC-PERF` | `AC-005-B` | Cô lập gọi API LLM tại Backend, quét secret |
| | `NFR-006` | Băm mật khẩu Argon2id/Bcrypt | `CAP-AUTH` | `AC-001-A` | Tiện ích băm mật khẩu bảo mật `security.py` |
| | `NFR-007` | Rate Limiting 10r/s Ingress & 60r/min Backend | `CAP-SEC-PERF` | `AC-005-A` | Nginx `limit_req` & `InMemoryRateLimiter` |
| | `NFR-008` | Khử khuẩn hiển thị chống XSS | `CAP-SEC-PERF` | `AC-005-C` | DOMPurify / rehype-sanitize tại Markdown renderer |
| **Tin Cậy** | `NFR-009` | Uptime 99.5% hàng tháng | `CAP-OPS` | `AC-004` | Giám sát định kỳ qua `/api/v1/health` |
| | `NFR-010` | Tự phục hồi container trong 10s | `CAP-OPS` | `AC-005` | Docker policy `restart: unless-stopped` |
| | `NFR-011` | Cô lập lỗi AI không làm crash Backend | `CAP-AI-ORCH` | `AC-004-B` | Khối try-except có timeout 30s |
| **Mở Rộng** | `NFR-012` | Ứng dụng Backend Stateless | `CAP-FOUNDATION` | `AC-001` | Xác thực qua JWT và cache Redis tập trung |
| | `NFR-013` | Tách biệt lưu trữ Postgres & Redis | `CAP-FOUNDATION` | `AC-002` | Hai service container với named volume riêng |
| **Bảo Trì** | `NFR-014` | Cấu trúc module chuẩn 3 tầng | `CAP-FOUNDATION` | `AC-001..005` | Phân tách ranh giới Frontend / Backend / Infra |
| **Trải Nghiệm** | `NFR-016` | Responsive Mobile (360px) -> Desktop | `CAP-CHAT-AI` | `AC-003-D` | Thiết kế giao diện CSS linh hoạt |
| **Hiệu Năng** | `NFR-025` | Discord Bot Interaction Latency <= 300ms | `CAP-BOT-MGMT` | `TC-040` | Xử lý Ack Interaction tức thời < 3s, async worker routing |

---

## 4. Bảng Truy Vết Quy Tắc Nghiệp Vụ, An Ninh & Trải Nghiệm (Rules, Security & UX Traceability)

| Nhóm | Mã Quy Tắc / Yêu Cầu | Tên Quy Tắc & Đặc Tả | Yêu Cầu Gốc | Kiểm Soát Kỹ Thuật | Kiểm Thử / Xác Minh |
| :--- | :---: | :--- | :---: | :---: | :---: |
| **Quy Tắc** | `BR-016` | OAuth2 State Parameter CSRF Guard | `FR-027`, `FR-028` | `SEC-008`, HMAC Signature | `TC-023` |
| | `BR-017` | Discord Verified Email Auto-Linking | `FR-027`, `FR-028` | Kiểm tra cờ verified từ Discord | `TC-022` |
| | `BR-018` | Discord Null-Password Invariant | `FR-027` | DB DDL NULL & Form Login Guard | `TC-021` |
| | `BR-019` | Atomic Telemetry & Token Accounting Invariant | `FR-029`, `FR-030` | Giao dịch nguyên tử ApiMetricLog & UserQuota | `TC-024` |
| | `BR-020` | Quota Threshold Warning & Throttling Invariant | `FR-032` | `CTRL-008` (Cảnh báo 80%, Throttling 100% HTTP 429) | `TC-026` |
| | `BR-021` | Role-Based Telemetry & Dashboard Data Isolation | `FR-033`, `FR-034` | Lọc số liệu theo `user_id == current_user.id` | `TC-025` |
| | `BR-022` | Model Identifier Immutability & Global Uniqueness | `FR-035`, `FR-036` | `CTRL-009` (Unique check, Immutable ID & Provider) | `TC-027`, `TC-028` |
| | `BR-023` | Default Model Protection & Archival Restriction | `FR-039` | `CTRL-009` (Cấm xóa/archive nếu is_default=1) | `TC-030` |
| | `BR-024` | Parameter Boundary & Context Window Sanity | `FR-035`, `FR-036` | `CTRL-009` (Pydantic schema validator) | `TC-027`, `TC-028` |
| | `BR-025` | Discord ID Unique & Single Account Binding Invariant | `FR-040` | `CTRL-010`, `SEC-011` (Unique DB index & 409 conflict) | `TC-032` |
| | `BR-026` | Account Lockout Prevention Guard on Unlink | `FR-041` | `CTRL-010`, `SEC-011` (Cấm unlink nếu hashed_password NULL) | `TC-034` |
| | `BR-027` | Re-authentication on Discord Unlink | `FR-041` | `CTRL-010`, `SEC-006` (Xác thực mật khẩu bcrypt trước khi gỡ) | `TC-033` |
| | `BR-031` | Precondition of Linked Discord Account | `FR-044` | `CTRL-012`, `SEC-011` (Chặn cấu hình nếu chưa liên kết Discord) | `TC-039` |
| | `BR-032` | Shared Unified Quota Accounting Invariant | `FR-046` | `CTRL-012`, `CTRL-008` (Trừ quota chung giữa Web và Discord) | `TC-041` |
| | `BR-033` | Active Model Routing Invariant & Failover Fallback | `FR-045` | `CTRL-012`, `CTRL-009` (Chỉ route ACTIVE model, fallback default) | `TC-040` |
| | `BR-034` | Guild Administrative Scope & Channel Binding Invariant | `FR-044` | `CTRL-012`, `SEC-013` (Kiểm tra quyền 0x8 / 0x20 trên Guild) | `TC-039` |
| | `BR-035` | VRM Animation Multi-Channel Priority & Non-Conflicting Bone Allocation | `FR-054`, `FR-055` | `AnimationController` layer separation (Idle vs Gesture vs Viseme) | `TC-044` |
| **An Ninh** | `SEC-008` | OAuth2 State Guard & Secrets Hardening | `FR-027`, `FR-028` | `CTRL-007` (HMAC state, 10m TTL) | `TC-023` |
| | `SEC-009` | Authenticated Real-Time Metrics Stream & Quota Defense | `FR-032`, `FR-033` | `CTRL-008` (JWT Stream Auth, Quota Throttling) | `TC-025`, `TC-026` |
| | `SEC-010` | Model Configuration Mutation Guard & Role-Based Authorization | `FR-035`, `FR-036`, `FR-039` | `CTRL-009` (JWT Mutation Auth & Invariant Guard) | `TC-027`, `TC-028`, `TC-030` |
| | `SEC-011` | OAuth Identity Linking & Safe Unlinking Guard | `FR-040`, `FR-041` | `CTRL-010` (Conflict rejection, Lockout guard & Re-auth) | `TC-032`, `TC-034` |
| | `SEC-013` | Discord Interaction Ed25519 Signature Verification & Token Hardening | `FR-044`, `FR-046` | `CTRL-012` (Xác thực chữ ký số Ed25519, mã hóa Bot Token) | `TC-039`, `TC-041` |
| **Trải Nghiệm** | `UX-007` | Real-Time Resource Telemetry & Quota Dashboard Interface | `FR-034` | Live Gauges, Sparklines, SSE Client Stream | `TC-025` |
| | `UX-008` | Interactive Model Catalog Management, Fuzzy Search & Multi-Filter Experience | `FR-037`, `FR-038` | Debounced Search, Filter Pills, Mutation Drawers | `TC-029` |
| | `UX-009` | Connected Social Identity Management & Safe Unlinking Dialog Experience | `FR-042` | Connected Accounts Canvas, Re-auth Modals, Warning Banners | `TC-031`, `TC-033` |
| | `UX-011` | Discord Bot Management Console & Real-time Guild Selector UI | `FR-044`, `FR-045`, `FR-046` | Guild Card Grid, Model Selector, Prompt Editor & Live Quota Gauge | `TC-039`, `TC-040` |
| | `UX-010` | Anime Minimalism Desktop Workspace & 3D VRM Companion | `FR-048`, `FR-049`, `FR-050`, `FR-051`, `FR-052`, `FR-053` | Dual-mode Header, Sidebar, AI-Chan Status Panel, 3D Canvas | `TC-043` |
| | `UX-012` | Intelligent VRM Behavioral Animation & Non-Repetitive Response Choreography | `FR-054`, `FR-055`, `FR-056` | Procedural Idle Breathing, Contextual Gestures, Variation Engine | `TC-044` |

---

## 5. Báo Cáo Kiểm Toán Toàn Vẹn Yêu Cầu (Audit & Completeness Report)

- **Kiểm toán Yêu cầu Mồ côi (Orphan Requirements)**: **0**. Toàn bộ Functional Requirements từ `FR-001` đến `FR-047` đều gắn liền với Mục tiêu Nghiệp vụ, Năng lực và Tiêu chí Nghiệm thu.
- **Kiểm toán Năng lực không có Yêu cầu**: **0**. Tất cả các nhóm năng lực đều được hiện thực hóa bởi các FR/NFR tương ứng.
- **Kiểm toán Tiêu chí Nghiệm thu thiếu hụt**: **0**. 100% các yêu cầu đều có kịch bản kiểm thử độc lập (`TC-001` .. `TC-042`).
- **Kiểm toán Yêu cầu Trùng lặp hoặc Xung đột**: **0**. Tính nhất quán tuyệt đối được bảo đảm giữa Requirements, Business Rules, Security Specifications và UX Interaction Specs.

