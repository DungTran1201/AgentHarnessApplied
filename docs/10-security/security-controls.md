# DANH MỤC BIỆN PHÁP KIỂM SOÁT AN NINH (SECURITY CONTROLS SPECIFICATION)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `SEC-CTRL-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Đặc tả 8 biện pháp kiểm soát kỹ thuật (Controls) ứng phó trực tiếp với từng mối đe dọa STRIDE và rủi ro tài nguyên/OAuth2 |

---

## 1. Danh Mục Các Biện Pháp Kiểm Soát Kỹ Thuật (Security Controls Catalog)

---

### CTRL-001: Mã Hóa Đường Truyền TLS 1.2/1.3 & HSTS (Giảm thiểu THR-001)
- **Tên Kiểm Soát**: TLS Encryption & Strict Transport Security.
- **Mối Đe Dọa Khắc Phục**: `THR-001` (Packet Sniffing / MitM).
- **Cơ Chế Kỹ Thuật**: Nginx chấm dứt SSL tại Ingress; tự động chuyển hướng mã 301 toàn bộ lưu lượng HTTP Port 80 sang HTTPS Port 443; kích hoạt tiêu đề `Strict-Transport-Security: max-age=31536000; includeSubDomains`.

---

### CTRL-002: Kiểm Soát Tần Suất Yêu Cầu 2 Tầng (Giảm thiểu THR-002)
- **Tên Kiểm Soát**: Dual-Tier Per-IP Rate Limiting Zones (`SEC-005`, `BR-006`).
- **Mối Đe Dọa Khắc Phục**: `THR-002` (HTTP Flood & DDoS).
- **Cơ Chế Kỹ Thuật**:
  - Tầng 1 (Nginx): `limit_req_zone` định mức 10 req/s (burst=20) cho các endpoint `/api/*`.
  - Tầng 2 (FastAPI Middleware): Giới hạn 60 req/phút/IP dựa trên cửa sổ trượt (Sliding Window).
  - Trả về mã phản hồi `HTTP 429 Too Many Requests` kèm tiêu đề `Retry-After`.

---

### CTRL-003: Giới Hạn Kết Nối & Timeout Chặt Chẽ (Giảm thiểu THR-003)
- **Tên Kiểm Soát**: Connection Limiting & Aggressive Socket Timeouts.
- **Mối Đe Dọa Khắc Phục**: `THR-003` (Slowloris Attack).
- **Cơ Chế Kỹ Thuật**: Nginx directive `limit_conn_zone $binary_remote_addr zone=addr:10m` giới hạn tối đa 20 kết nối đồng thời trên một địa chỉ IP; thiết lập `client_body_timeout 10s; client_header_timeout 10s; keepalive_timeout 30s;`.

---

### CTRL-004: Giới Hạn Tải Trọng Đầu Vào (Giảm thiểu THR-004)
- **Tên Kiểm Soát**: Payload Caps & Message Length Enforcement (`BR-003`).
- **Mối Đe Dọa Khắc Phục**: `THR-004` (Payload Flooding).
- **Cơ Chế Kỹ Thuật**:
  - Tại Ingress: Cấu hình `client_max_body_size 10M;`.
  - Tại Backend: Pydantic schema kiểm soát độ dài tin nhắn chat: `1 <= len(content) <= 4000`.

---

### CTRL-005: Tiêu Đề An Ninh Trình Duyệt Gia Cố (Giảm thiểu THR-005)
- **Tên Kiểm Soát**: Hardened HTTP Security Headers.
- **Mối Đe Dọa Khắc Phục**: `THR-005` (Clickjacking & MIME Confusion).
- **Cơ Chế Kỹ Thuật**: Nginx phát hành tự động các tiêu đề an ninh:
  - `X-Frame-Options: SAMEORIGIN` (Chống Clickjacking).
  - `X-Content-Type-Options: nosniff` (Chống MIME Confusion).
  - `Referrer-Policy: strict-origin-when-cross-origin`.
  - `Content-Security-Policy: default-src 'self' ...`.

---

### CTRL-006: Cách Ly Định Danh Người Dùng & Chống IDOR (Giảm thiểu THR-006)
- **Tên Kiểm Soát**: Mandatory User Scoping & Anti-IDOR Enforcement (`BR-002`, `NFR-018`).
- **Mối Đe Dọa Khắc Phục**: `THR-006` (Insecure Direct Object Reference).
- **Cơ Chế Kỹ Thuật**: Mọi câu lệnh SQL truy vấn hoặc thao tác trên bảng `conversations` và `messages` đều bắt buộc lọc theo `user_id = current_user_id`. Nếu không trùng khớp, trả về ngay `HTTP 404/403` và ghi log cảnh báo an ninh.

---

### CTRL-007: Kiểm Soát CSRF State & Bảo Vệ Khóa OAuth2 (Giảm thiểu Tấn Công OAuth2 — SEC-008)
- **Tên Kiểm Soát**: OAuth2 State Guard & Secrets Hardening (`SEC-008`, `BR-016`, `BR-017`).
- **Mối Đe Dọa Khắc Phục**: Login CSRF, Account Takeover, OAuth Token Injection.
- **Cơ Chế Kỹ Thuật**:
  - Backend sinh chuỗi `state` ngẫu nhiên ký HMAC-SHA256 lưu trong cookie HttpOnly `oauth_state` với thời hạn 10 phút.
  - Callback bắt buộc so khớp tham số `state` nhận được với cookie và kiểm tra tính toàn vẹn chữ ký HMAC.
  - Chỉ cho phép tự động liên kết tài khoản khi Discord trả về `verified == true`.
  - Toàn bộ secret của Discord (`DISCORD_CLIENT_SECRET`) chỉ lưu ở biến môi trường backend và dùng riêng trong trao đổi HTTPS Server-to-Server.

---

### CTRL-008: Kiểm Soát Quota & Che Giấu Dữ Liệu Đo Đạc (Giảm thiểu Cạn Kiệt Tài Nguyên & Rò Rỉ PII — SEC-009)
- **Tên Kiểm Soát**: Quota Throttling & Telemetry Redaction Control (`SEC-009`, `BR-019`, `BR-020`, `BR-021`).
- **Mối Đe Dọa Khắc Phục**: LLM Budget Exhaustion / DoS, SSE Connection Starvation, Telemetry PII Leaks, Cross-tenant Telemetry Snooping.
- **Cơ Chế Kỹ Thuật**:
  - **Kiểm tra Hạn ngạch Chặt chẽ (`BR-020`)**: Kiểm tra hạn ngạch hàng ngày trước khi gọi API LLM; từ chối `HTTP 429 Too Many Requests` ngay khi `daily_tokens_used >= daily_token_limit`.
  - **Giới hạn Luồng SSE (`SEC-009`)**: Tối đa 3 kết nối SSE đồng thời trên mỗi phiên người dùng được xác thực.
  - **Khử Dữ liệu Nhạy cảm (Redaction)**: Chỉ lưu metadata kỹ thuật (latency, tokens, status, endpoint); không lưu raw prompt hay response text vào bảng `api_metric_logs`.
  - **Phân Quyền Số Liệu (`BR-021`)**: Áp dụng RBAC cứng - User chỉ xem metric của chính họ (`WHERE user_id = current_user_id`), Admin được xem số liệu tổng hợp toàn hệ thống.

---

### CTRL-009: Kiểm Soát Đột Biến Cấu Hình Mô Hình & Bảo Vệ Mô Hình Mặc Định (Giảm thiểu Đột Biến Phá Hoại — SEC-010)
- **Tên Kiểm Soát**: Model Catalog Mutation Guard & Default Integrity Invariant (`SEC-010`, `BR-022`, `BR-023`, `BR-024`).
- **Mối Đe Dọa Khắc Phục**: Parameter Tampering, Unauthorized Catalog Mutation, Broken Foreign Keys, Denial of Service via Default Model Archival.
- **Cơ Chế Kỹ Thuật**:
  - **Xác Thực & Phân Quyền Đột Biến**: Mọi API mutation (`POST /models`, `PUT /models/{id}`, `DELETE /models/{id}`) đều bắt buộc xác thực JWT phiên hợp lệ và kiểm tra thẩm quyền.
  - **Bảo Vệ Tính Bất Biến (`BR-022`)**: Tầng controller kiểm tra đối chiếu mã `id` và nhà cung cấp `provider`, từ chối ngay với HTTP 400 nếu payload cố ý sửa đổi định danh gốc.
  - **Thẩm Định Biên Schema Pydantic (`BR-024`)**: Cưỡng chế quy tắc `context_window >= 1000` và `max_tokens >= 256`, chặn đứng các payload độc hại hoặc dị thường.
  - **Chốt Chặn Mô Hình Mặc Định (`BR-023`)**: Truy vấn `is_default` trước khi cho phép chuyển trạng thái `ARCHIVED`; nếu là mô hình mặc định, từ chối với HTTP 400 và bắt buộc người dùng chọn mô hình thay thế trước.

---

### CTRL-010: Kiểm Soát An Toàn Liên Kết & Hủy Liên Kết Danh Tính Mạng Xã Hội (Account Linking & Safe Unlinking Guard — SEC-011)
- **Tên Kiểm Soát**: OAuth Account Linking & Safe Unlinking Guard (`SEC-011`, `BR-025`, `BR-026`, `BR-027`, `ADR-010`).
- **Mối Đe Dọa Khắc Phục**: Account Takeover via Duplicate Binding, Permanent Account Lockout, Unattended Session Identity Removal, CSRF State Forgery.
- **Cơ Chế Kỹ Thuật**:
  - **Kiểm Soát Ánh Xạ Duy Nhất 1-1 (`BR-025`)**: Truy vấn đối chiếu `SELECT id FROM users WHERE discord_id = :discord_id AND id != :current_user_id`; từ chối với `HTTP 409 Conflict` nếu tài khoản Discord đã được liên kết với người dùng khác.
  - **Chốt Chặn Chống Khóa Tài Khoản (`BR-026`)**: Thẩm định `user.hashed_password IS NOT NULL` trước khi cho phép gỡ liên kết Discord; từ chối với `HTTP 400 Bad Request` nếu tài khoản chưa có mật khẩu cục bộ.
  - **Tái Xác Thực Mật Khẩu Bắt Buộc (`BR-027`, `SEC-006`)**: Yêu cầu người dùng nhập mật khẩu hiện tại trong body `DELETE /api/v1/users/me/discord` và so khớp mã băm bcrypt; từ chối với `HTTP 401 Unauthorized` nếu mật khẩu sai.
  - **Chữ Ký Số State Chống CSRF Theo Phạm Vi (`BR-016`, `SEC-008`)**: State chứa cờ `action=link` và `user_id`, được ký số HMAC-SHA256 với thời hạn 10 phút, ngăn chặn việc sử dụng lại state trái phép.

---

### CTRL-012: Kiểm Soát An Ninh Tương Tác Bot Discord & Xác Thực Chữ Ký Số Ed25519 (Discord Cryptographic Signature & Rate/Quota Abuse Guard — SEC-013)
- **Tên Kiểm Soát**: Discord Cryptographic Signature & Bot Quota Guard (`SEC-013`, `BR-031`, `BR-032`, `BR-033`, `BR-034`, `ADR-012`).
- **Mối Đe Dọa Khắc Phục**: Webhook Forgery & Request Spoofing, Replay Attack, Token Quota Exhaustion / Drain via Discord Gateway, Unauthorized Guild Configuration Tampering, AI Model Misrouting.
- **Cơ Chế Kỹ Thuật**:
  - **Xác Thực Chữ Ký Số Mật Mã Học Ed25519 (`SEC-013`)**: Tầng Ingress Middleware thẩm định tính hợp lệ của chữ ký Ed25519 trên payload nguyên bản và timestamp sử dụng Discord Application Public Key qua thư viện `PyNaCl`; từ chối `HTTP 401 Unauthorized` nếu chữ ký sai lệch.
  - **Chống Tấn Công Phát Lại (Anti-Replay Guard)**: Từ chối mọi yêu cầu có `|current_time - timestamp| > 300` giây.
  - **Kiểm Soát Quyền Hạn Máy Chủ Bitwise (`BR-034`)**: Chỉ cho phép lưu cấu hình nếu người dùng nắm giữ cờ quyền `ADMINISTRATOR` (0x8) hoặc `MANAGE_GUILD` (0x20) tại Discord Guild mục tiêu.
  - **Chốt Chặn Hạn Ngạch Token Hợp Nhất (`BR-032`, `CTRL-008`)**: Kiểm tra số token khả dụng trong bản ghi `user_quotas` trước khi điều phối tới LLM; từ chối ngay với `HTTP 429 Too Many Requests` khi chạm trần 100%.
  - **Bảo Vệ Định Tuyến Mô Hình Sẵn Sàng (`BR-033`)**: Chỉ cho phép định tuyến tới mô hình có trạng thái `ACTIVE`; tự động failover về mô hình mặc định `is_default = 1` nếu xảy ra lỗi nhà cung cấp.








