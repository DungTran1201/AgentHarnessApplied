# Danh Mục Ca Kiểm Thử Chi Tiết (Test Cases Specification)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã tài liệu** | `TST-CASES-001` |
| **Giai đoạn** | **Phase 12 — Testing & Quality Engineering** |
| **Canonical Model** | `models/testing/testing.yaml` |
| **Quy ước mã định danh** | `TC-001` đến `TC-026` |
| **Trạng thái** | **BASELINED** |

---

## 1. Phân Hệ Xác Thực & Tài Khoản (Authentication & Identity)

### TC-001: Đăng Ký Tài Khoản Mới Thành Công
- **Mã Ca Kiểm Thử**: `TC-001`
- **Mức Độ Ưu Tiên**: `P0` (Critical)
- **Truy Vết**: `FR-001`, `UC-001`, `AC-001`, `API-001`
- **Tiền Điều Kiện**: Email `user_test_01@example.com` chưa tồn tại trong cơ sở dữ liệu.
- **Các Bước Thực Hiện**:
  1. Gửi request `POST /api/v1/auth/register` với payload:
     `{"email": "user_test_01@example.com", "password": "Password123!"}`
- **Kết Quả Mong Đợi**:
  - Trả về mã phản hồi `HTTP 201 Created`.
  - Body JSON chứa thông tin người dùng: `id`, `email`, `created_at`.
  - Không bao giờ trả về trường `hashed_password`.
  - Cơ sở dữ liệu lưu bản ghi user mới với mật khẩu được băm an toàn bằng bcrypt.

---

### TC-002: Đăng Ký Thất Bại Khi Trùng Lặp Email
- **Mã Ca Kiểm Thử**: `TC-002`
- **Mức Độ Ưu Tiên**: `P0` (Critical)
- **Truy Vết**: `FR-001`, `UC-001`, `AC-001`, `API-001`
- **Tiền Điều Kiện**: Email `user_test_01@example.com` đã tồn tại trong cơ sở dữ liệu.
- **Các Bước Thực Hiện**:
  1. Gửi request `POST /api/v1/auth/register` với email trùng `user_test_01@example.com`.
- **Kết Quả Mong Đợi**:
  - Trả về mã phản hồi `HTTP 409 Conflict`.
  - Body chứa mã lỗi nghiệp vụ: `EMAIL_ALREADY_EXISTS`.

---

### TC-003: Đăng Nhập Thành Công & Thiết Lập HttpOnly Cookie
- **Mã Ca Kiểm Thử**: `TC-003`
- **Mức Độ Ưu Tiên**: `P0` (Critical)
- **Truy Vết**: `FR-002`, `UC-002`, `AC-002`, `API-002`, `SEC-001`, `CTRL-001`
- **Tiền Điều Kiện**: Tài khoản `user_test_01@example.com` đã đăng ký với mật khẩu `Password123!`.
- **Các Bước Thực Hiện**:
  1. Gửi request `POST /api/v1/auth/login` với email và password đúng.
- **Kết Quả Mong Đợi**:
  - Trả về mã phản hồi `HTTP 200 OK`.
  - Header phản hồi có `Set-Cookie` chứa `access_token=...; HttpOnly; SameSite=Lax; Path=/`.
  - Phản hồi JSON trả về thông tin profile người dùng.

---

### TC-004: Đăng Nhập Thất Bại Với Sai Thông Tin Xác Thực
- **Mã Ca Kiểm Thử**: `TC-004`
- **Mức Độ Ưu Tiên**: `P0` (Critical)
- **Truy Vết**: `FR-002`, `UC-002`, `AC-002`, `API-002`
- **Tiền Điều Kiện**: Người dùng nhập sai mật khẩu hoặc email chưa đăng ký.
- **Các Bước Thực Hiện**:
  1. Gửi request `POST /api/v1/auth/login` với email đúng nhưng mật khẩu `WrongPass999!`.
- **Kết Quả Mong Đợi**:
  - Trả về mã phản hồi `HTTP 401 Unauthorized`.
  - Không thiết lập cookie `access_token`.

---

### TC-005: Đăng Xuất Và Thu Hồi Phiên Làm Việc
- **Mã Ca Kiểm Thử**: `TC-005`
- **Mức Độ Ưu Tiên**: `P1` (High)
- **Truy Vết**: `FR-003`, `UC-003`, `AC-002`, `API-003`, `CTRL-001`
- **Tiền Điều Kiện**: Người dùng đang đăng nhập với cookie hợp lệ.
- **Các Bước Thực Hiện**:
  1. Gửi request `POST /api/v1/auth/logout`.
- **Kết Quả Mong Đợi**:
  - Trả về mã phản hồi `HTTP 200 OK`.
  - Header `Set-Cookie` xóa bỏ cookie: `access_token=; Max-Age=0; Path=/`.

---

### TC-006: Truy Vấn Thông Tin Người Dùng Hiện Hành
- **Mã Ca Kiểm Thử**: `TC-006`
- **Mức Độ Ưu Tiên**: `P1` (High)
- **Truy Vết**: `FR-004`, `UC-003`, `API-004`
- **Tiền Điều Kiện**: Gửi kèm HttpOnly cookie hợp lệ.
- **Các Bước Thực Hiện**:
  1. Gửi request `GET /api/v1/auth/me`.
- **Kết Quả Mong Đợi**:
  - Trả về mã phản hồi `HTTP 200 OK` chứa `id`, `email`, `created_at`.
  - Nếu không gửi cookie, trả về `HTTP 401 Unauthorized`.

---

## 2. Phân Hệ Quản Lý Cuộc Trò Chuyện (Conversation Management)

### TC-007: Tạo Mới Cuộc Trò Chuyện
- **Mã Ca Kiểm Thử**: `TC-007`
- **Mức Độ Ưu Tiên**: `P0` (Critical)
- **Truy Vết**: `FR-005`, `UC-004`, `AC-003`, `API-005`
- **Các Bước Thực Hiện**:
  1. Gửi `POST /api/v1/conversations` với body `{"title": "Học lập trình Python"}` kèm auth cookie.
- **Kết Quả Mong Đợi**:
  - Trả về mã phản hồi `HTTP 201 Created`.
  - Body chứa conversation mới với `title`, `id`, `created_at`.

---

### TC-008: Lấy Danh Sách Cuộc Trò Chuyện Kèm Phân Trang Cursor
- **Mã Ca Kiểm Thử**: `TC-008`
- **Mức Độ Ưu Tiên**: `P0` (Critical)
- **Truy Vết**: `FR-006`, `UC-004`, `AC-003`, `API-006`
- **Các Bước Thực Hiện**:
  1. Gửi `GET /api/v1/conversations?limit=20` kèm auth cookie.
- **Kết Quả Mong Đợi**:
  - Trả về `HTTP 200 OK` danh sách các cuộc trò chuyện của đúng user đó, sắp xếp theo thời gian mới nhất.

---

### TC-009: Cập Nhật Đổi Tên Tiêu Đề Cuộc Trò Chuyện
- **Mã Ca Kiểm Thử**: `TC-009`
- **Mức Độ Ưu Tiên**: `P1` (High)
- **Truy Vết**: `FR-005`, `UC-005`, `AC-003`, `API-007`
- **Các Bước Thực Hiện**:
  1. Gửi `PATCH /api/v1/conversations/{id}` với `{"title": "Tiêu đề mới cập nhật"}`.
- **Kết Quả Mong Đợi**:
  - Trả về `HTTP 200 OK`, tiêu đề được cập nhật thành công.

---

### TC-010: Xóa Cuộc Trò Chuyện & Tự Động Xóa Cascade Tin Nhắn
- **Mã Ca Kiểm Thử**: `TC-010`
- **Mức Độ Ưu Tiên**: `P0` (Critical)
- **Truy Vết**: `FR-006`, `UC-006`, `AC-003`, `API-008`
- **Các Bước Thực Hiện**:
  1. Gửi `DELETE /api/v1/conversations/{id}`.
- **Kết Quả Mong Đợi**:
  - Trả về `HTTP 204 No Content`.
  - Bản ghi conversation và toàn bộ messages con trong database bị xóa sạch.

---

### TC-011: Ngăn Chặn Truy Cập Trái Phép Cuộc Trò Chuyện Của Người Khác (IDOR)
- **Mã Ca Kiểm Thử**: `TC-011`
- **Mức Độ Ưu Tiên**: `P0` (Critical)
- **Truy Vết**: `SEC-002`, `CTRL-002`, `UC-004`, `UC-006`
- **Tiền Điều Kiện**: User B cố tình truy cập hoặc xóa conversation thuộc sở hữu của User A.
- **Các Bước Thực Hiện**:
  1. User B gửi `GET /api/v1/conversations/{id_cua_user_a}` hoặc `DELETE /api/v1/conversations/{id_cua_user_a}`.
- **Kết Quả Mong Đợi**:
  - Hệ thống trả về `HTTP 404 Not Found` (ngăn chặn dò quét ID). Không cho phép truy cập hoặc thay đổi.

---

## 3. Phân Hệ Trò Chuyện Dòng Chảy & Khả Năng Chịu Lỗi (Chat Stream & Failover)

### TC-012: Gửi Tin Nhắn Prompt & Tiếp Nhận Luồng Token SSE Thành Công
- **Mã Ca Kiểm Thử**: `TC-012`
- **Mức Độ Ưu Tiên**: `P0` (Critical)
- **Truy Vết**: `FR-007`, `FR-008`, `FR-009`, `FR-013`, `UC-007`, `AC-004`, `API-009`
- **Các Bước Thực Hiện**:
  1. Gửi `POST /api/v1/conversations/{id}/messages/stream` với body `{"content": "Xin chào AI-Chan"}`.
- **Kết Quả Mong Đợi**:
  - Header trả về `Content-Type: text/event-stream`.
  - Nhận chuỗi các sự kiện SSE `event: chunk` chứa từng token văn bản.
  - Sự kiện cuối cùng là `event: done` với payload chứa `message_id` đã được lưu vào database.

---

### TC-013: Tự Động Kích Hoạt Dự Phòng (Failover) Khi Provider Chính Gặp Sự Cố
- **Mã Ca Kiểm Thử**: `TC-013`
- **Mức Độ Ưu Tiên**: `P0` (Critical)
- **Truy Vết**: `FR-011`, `UC-007`, `AC-004`, `ADR-003`
- **Tiền Điều Kiện**: Mock Google Gemini trả về lỗi HTTP 503 Service Unavailable hoặc 429 Quota Exceeded.
- **Các Bước Thực Hiện**:
  1. Gửi tin nhắn yêu cầu câu trả lời từ hệ thống.
- **Kết Quả Mong Đợi**:
  - LLM Gateway tự động bắt lỗi từ Gemini, ghi log cảnh báo và lập tức gọi sang OpenAI GPT-4o-mini.
  - Luồng SSE người dùng nhận được vẫn hoàn chỉnh mà không bị gián đoạn hay nhận thông báo lỗi hệ thống.

---

### TC-014: Kiểm Soát Tần Suất Gọi API (Rate Limiting 30 req/phút)
- **Mã Ca Kiểm Thử**: `TC-014`
- **Mức Độ Ưu Tiên**: `P1` (High)
- **Truy Vết**: `NFR-005`, `SEC-004`, `CTRL-004`, `UC-007`
- **Các Bước Thực Hiện**:
  1. Gửi liên tiếp 31 requests gửi tin nhắn trong vòng dưới 60 giây từ cùng một tài khoản / IP.
- **Kết Quả Mong Đợi**:
  - Request thứ 31 bị chặn với mã phản hồi `HTTP 429 Too Many Requests`.
  - Header chứa `Retry-After`.

---

### TC-015: Phòng Chống Tấn Công XSS Khi Render Định Dạng Markdown
- **Mã Ca Kiểm Thử**: `TC-015`
- **Mức Độ Ưu Tiên**: `P0` (Critical)
- **Truy Vết**: `SEC-003`, `CTRL-003`, `UX-004`
- **Các Bước Thực Hiện**:
  1. Mô phỏng phản hồi từ AI hoặc nội dung người dùng chứa payload độc hại:
     `<script>alert('XSS')</script><img src=x onerror=alert(1)> [Click me](javascript:stealCookie())`
- **Kết Quả Mong Đợi**:
  - Bộ sanitizer tại Frontend loại bỏ hoàn toàn các thẻ script, sự kiện `onerror` và link `javascript:`.
  - Không có script nào được thực thi trong trình duyệt.

---

### TC-021: Đăng Ký Tài Khoản Mới Thành Công Qua Discord OAuth2
- **Mã Ca Kiểm Thử**: `TC-021`
- **Mức Độ Ưu Tiên**: `P0` (Critical)
- **Truy Vết**: `FR-027`, `UC-021`, `AC-009-A`, `BR-018`, `ADR-007`
- **Các Bước Thực Hiện**:
  1. Khách truy cập bấm "Tiếp tục với Discord" trên trang `/register`.
  2. Gửi callback giả lập với `code="valid_discord_code"`, `state="valid_signed_state"`.
  3. Mock phản hồi Discord API trả về hồ sơ với `verified=True`, email mới chưa có trong CSDL.
- **Kết Quả Mong Đợi**:
  - Bản ghi `User` mới được tạo thành công với `discord_id`, `discord_username`, `hashed_password=NULL`.
  - Cấp phát HttpOnly cookie `access_token` hợp lệ.
  - Chuyển hướng người dùng về `/chat`.

---

### TC-022: Tự Động Liên Kết Tài Khoản Đã Có Sẵn Qua Email Discord Đã Xác Minh
- **Mã Ca Kiểm Thử**: `TC-022`
- **Mức Độ Ưu Tiên**: `P0` (Critical)
- **Truy Vết**: `FR-028`, `UC-022`, `AC-009-B`, `BR-017`, `ADR-007`
- **Các Bước Thực Hiện**:
  1. Tạo tài khoản người dùng sẵn có với email `user@example.com` bằng mật khẩu truyền thống.
  2. Người dùng chọn đăng nhập qua Discord với tài khoản Discord có cùng email `user@example.com` và `verified=True`.
- **Kết Quả Mong Đợi**:
  - Không tạo tài khoản trùng lặp; bản ghi hiện tại được cập nhật thêm `discord_id` và `discord_username`.
  - Phiên làm việc JWT được cấp phát trơn tru.

---

### TC-023: Từ Chối Callback Khi State Bị Làm Giả Hoặc Hết Hạn (Chống CSRF)
- **Mã Ca Kiểm Thử**: `TC-023`
- **Mức Độ Ưu Tiên**: `P0` (Critical)
- **Truy Vết**: `SEC-008`, `BR-016`, `UC-022`, `CTRL-007`
- **Các Bước Thực Hiện**:
  1. Gửi request trực tiếp đến `GET /api/v1/auth/discord/callback?code=mock_code&state=forged_untrusted_state`.
  2. Thử nghiệm với chuỗi `state` có timestamp cũ hơn 10 phút.
- **Kết Quả Mong Đợi**:
  - Hệ thống từ chối xử lý, không gọi sang Discord token endpoint.
  - Trả về mã phản hồi `HTTP 400 Bad Request` hoặc redirect về `/login?error=invalid_state`.
  - Ghi log an ninh `SEC_OAUTH_STATE_MISMATCH`.

---

## 6. Phân Hệ Quản Lý Tài Nguyên & Giám Sát Dashboard (Resource Management & Telemetry Dashboard)

### TC-024: Đo Đạc & Ghi Nhật Ký Telemetry Yêu Cầu API Đầy Đủ
- **Mã Ca Kiểm Thử**: `TC-024`
- **Mức Độ Ưu Tiên**: `P0` (Critical)
- **Truy Vết**: `FR-029`, `FR-030`, `FR-031`, `BR-019`, `TC-024`
- **Tiền Điều Kiện**: Người dùng đã đăng nhập, cơ sở dữ liệu sẵn sàng bảng `api_metric_logs`.
- **Các Bước Thực Hiện**:
  1. Người dùng gửi câu hỏi chat streaming qua endpoint `POST /api/v1/chat/completions`.
  2. Middleware telemetry bắt đầu bấm giờ, tính toán `ttft_ms` khi nhận token đầu tiên và `latency_ms` khi hoàn tất.
  3. Lấy thông tin số lượng token thực tế (`prompt_tokens`, `completion_tokens`, `total_tokens`) từ nhà cung cấp LLM.
- **Kết Quả Mong Đợi**:
  - Bản ghi mới được tạo trong `api_metric_logs` với đầy đủ trường dữ liệu kỹ thuật: `user_id`, `endpoint`, `method`, `status_code=200`, `latency_ms`, `ttft_ms`, `model_name`, `provider`, `prompt_tokens`, `completion_tokens`, `total_tokens`.
  - Không lưu trữ văn bản thô của Prompt/Response vào cơ sở dữ liệu (`SEC-009`).
  - Overhead của middleware đo đạc nhỏ hơn 5ms (`NFR-020`).

---

### TC-025: Giới Hạn Quota Sử Dụng Token & Chặn Vượt Ngưỡng (HTTP 429)
- **Mã Ca Kiểm Thử**: `TC-025`
- **Mức Độ Ưu Tiên**: `P0` (Critical)
- **Truy Vết**: `FR-032`, `BR-020`, `TC-025`, `CTRL-008`
- **Tiền Điều Kiện**: Người dùng được thiết lập `daily_token_limit = 100000`, hiện tại đã dùng `daily_tokens_used = 99500`.
- **Các Bước Thực Hiện**:
  1. Người dùng gửi yêu cầu chat ước tính tiêu thụ 1,000 tokens.
  2. Hệ thống kiểm tra điều kiện quota trước khi chuyển tiếp yêu cầu sang LLM: `99500 + 1000 > 100000`.
- **Kết Quả Mong Đợi**:
  - Yêu cầu bị chặn ngay lập tức, không phát sinh chi phí gọi sang API nhà cung cấp LLM bên ngoài.
  - Phản hồi mã lỗi `HTTP 429 Too Many Requests` kèm body: `{"error_code": "DAILY_QUOTA_EXCEEDED", "message": "Hạn ngạch token trong ngày đã hết."}`.
  - Header phản hồi có `Retry-After` chỉ rõ thời điểm làm mới hạn ngạch (00:00 UTC kế tiếp).

---

### TC-026: Phát Luồng SSE Đo Đạc Thời Gian Thực & Phân Quyền Dữ Liệu
- **Mã Ca Kiểm Thử**: `TC-026`
- **Mức Độ Ưu Tiên**: `P1` (High)
- **Truy Vết**: `FR-033`, `FR-034`, `BR-021`, `SEC-009`, `TC-026`, `UX-007`
- **Tiền Điều Kiện**: Người dùng đã đăng nhập và truy cập trang Dashboard `/dashboard`.
- **Các Bước Thực Hiện**:
  1. Client khởi tạo kết nối EventSource tới `GET /api/v1/resources/stream`.
  2. Gửi đồng thời 1 API request chat từ tài khoản này.
  3. Kiểm tra payload sự kiện `metric_update` được Server đẩy về Client qua SSE.
  4. Xác minh với người dùng khác đăng nhập đồng thời: người dùng A không nhìn thấy sự kiện hoặc số liệu của người dùng B.
- **Kết Quả Mong Đợi**:
  - Kết nối SSE thiết lập thành công với header `Content-Type: text/event-stream; charset=utf-8`.
  - Sự kiện `metric_update` được đẩy về Client trong vòng dưới 1 giây (`NFR-021`) ngay sau khi request chat kết thúc.
  - Dữ liệu hoàn toàn được phân lập theo `user_id` (`BR-021`).
  - Giao diện Dashboard cập nhật biểu đồ và đồng hồ Quota mượt mà theo đúng đặc tả `UX-007`.

---

## 7. Phân Hệ Mở Rộng Quản Lý Mô Hình Agent (Agent Model Management Extensions)

### TC-027: Đăng Ký Mô Hình Mới Với Kiểm Tra Duy Nhất ID & Thẩm Định Biên Tham Số
- **Mã Ca Kiểm Thử**: `TC-027`
- **Mức Độ Ưu Tiên**: `P0` (Critical)
- **Truy Vết**: `FR-035`, `BR-022`, `BR-024`, `SEC-010`, `OP-022`, `UC-026`
- **Tiền Điều Kiện**: Người dùng đã đăng nhập với quyền quản lý mô hình hợp lệ.
- **Các Bước Thực Hiện**:
  1. Gửi `POST /api/v1/models` với payload hợp lệ: `{"id": "gemini-3.8-flash", "name": "Google Gemini 3.8 Flash", "provider": "GOOGLE", "context_window": 1000000, "max_tokens": 8192, "supports_streaming": true}`.
  2. Gửi lại chính xác request trên lần thứ 2 để kiểm tra trùng mã ID.
  3. Gửi request thứ 3 với tham số vi phạm biên: `{"id": "test-invalid", "name": "Test", "provider": "OPENAI", "context_window": 500, "max_tokens": 100}` (`context_window < 1000`, `max_tokens < 256`).
- **Kết Quả Mong Đợi**:
  - Bước 1: Trả về mã `HTTP 201 Created`, mô hình được thêm vào cơ sở dữ liệu với trạng thái ban đầu.
  - Bước 2: Bị chặn với mã `HTTP 409 Conflict`: "Mã định danh mô hình đã tồn tại." (`BR-022`).
  - Bước 3: Bị chặn với mã `HTTP 422 Unprocessable Entity` do vi phạm ngưỡng an toàn (`BR-024`).

---

### TC-028: Hiệu Chỉnh Cấu Hình Mô Hình & Bảo Vệ Tính Bất Biến Của ID/Provider
- **Mã Ca Kiểm Thử**: `TC-028`
- **Mức Độ Ưu Tiên**: `P0` (Critical)
- **Truy Vết**: `FR-036`, `BR-022`, `BR-024`, `SEC-010`, `OP-023`, `UC-027`
- **Tiền Điều Kiện**: Mô hình `gemini-3.8-flash` đã tồn tại trong hệ thống.
- **Các Bước Thực Hiện**:
  1. Gửi `PUT /api/v1/models/gemini-3.8-flash` với payload cập nhật hợp lệ: `{"name": "Gemini 3.8 Flash Super", "context_window": 1050000, "max_tokens": 8192, "supports_streaming": true}`.
  2. Gửi request sửa đổi với payload cố ý thay đổi ID hoặc Provider: `{"id": "gemini-hacked", "provider": "OPENAI", "name": "Hacked"}`.
- **Kết Quả Mong Đợi**:
  - Bước 1: Trả về mã `HTTP 200 OK`, tên và tham số được cập nhật chính xác, không thay đổi ID và Provider.
  - Bước 2: Bị từ chối ngay lập tức với mã `HTTP 400 Bad Request`: "Mã định danh và nhà cung cấp mô hình là bất biến." (`BR-022`).

---

### TC-029: Tìm Kiếm Toàn Văn / Mờ & Lọc Đa Tiêu Chí Với Độ Trễ Dưới 200ms
- **Mã Ca Kiểm Thử**: `TC-029`
- **Mức Độ Ưu Tiên**: `P1` (High)
- **Truy Vết**: `FR-037`, `FR-038`, `NFR-022`, `OP-024`, `UX-008`, `UC-028`
- **Tiền Điều Kiện**: Danh mục chứa ít nhất 10 mô hình từ nhiều nhà cung cấp khác nhau.
- **Các Bước Thực Hiện**:
  1. Gửi `GET /api/v1/models/search?q=flash`.
  2. Gửi `GET /api/v1/models/search?provider=GOOGLE&status=ACTIVE&has_api_key=true&sort=latency_asc`.
  3. Đo lường thời gian thực thi của cả hai truy vấn.
- **Kết Quả Mong Đợi**:
  - Bước 1 trả về chính xác danh sách các mô hình có tên hoặc ID chứa chuỗi "flash".
  - Bước 2 trả về chính xác các mô hình thuộc Google đang ACTIVE, có API key trong `.env`, sắp xếp tăng dần theo độ trễ.
  - Cả hai truy vấn đều hoàn tất trong thời gian phản hồi máy chủ $\le 200\text{ms}$ (`NFR-022`).

---

### TC-030: Xóa Mềm / Lưu Trữ Mô Hình & Chốt Chặn Bảo Vệ Mô Hình Mặc Định
- **Mã Ca Kiểm Thử**: `TC-030`
- **Mức Độ Ưu Tiên**: `P0` (Critical)
- **Truy Vết**: `FR-039`, `BR-023`, `SEC-010`, `OP-025`, `UC-027`
- **Tiền Điều Kiện**: Mô hình A đang được thiết lập là mô hình mặc định (`is_default = true`); Mô hình B là mô hình thông thường (`is_default = false`).
- **Các Bước Thực Hiện**:
  1. Gửi `DELETE /api/v1/models/{model_a_id}` để yêu cầu xóa/lưu trữ mô hình A (Default Model).
  2. Gửi `DELETE /api/v1/models/{model_b_id}` để yêu cầu xóa/lưu trữ mô hình B.
- **Kết Quả Mong Đợi**:
  - Bước 1: Bị chặn ngay lập tức với mã phản hồi `HTTP 400 Bad Request`: "Không thể xóa hoặc lưu trữ mô hình đang được đặt làm mặc định. Vui lòng chọn một mô hình hoạt động khác làm mặc định trước." (`BR-023`). Trạng thái của mô hình A vẫn là `ACTIVE`.
  - Bước 2: Thành công với mã `HTTP 200 OK`, trạng thái của mô hình B chuyển thành `ARCHIVED` (xóa mềm). Bản ghi không bị xóa khỏi cơ sở dữ liệu (`BR-012`, `FR-039`).

---

### TC-031: Liên Kết Tài Khoản Discord Thành Công Cho Người Dùng Đang Đăng Nhập
- **Mã Ca Kiểm Thử**: `TC-031`
- **Mức Độ Ưu Tiên**: `P0` (Critical)
- **Truy Vết**: `FR-040`, `FR-042`, `NFR-023`, `OP-026`, `OP-027`, `UC-029`
- **Tiền Điều Kiện**: Người dùng User A đang đăng nhập; tài khoản User A chưa liên kết Discord (`discord_id IS NULL`).
- **Các Bước Thực Hiện**:
  1. Gửi `GET /api/v1/auth/discord/link` với cookie phiên của User A.
  2. Trích xuất URL authorization và tham số `state` có chữ ký HMAC chứa `action=link`.
  3. Giả lập callback `GET /api/v1/auth/discord/callback?code=valid_code&state={state}`.
  4. Mock API Discord trả về profile: `id="discord_123"`, `username="DiscordUserA"`.
- **Kết Quả Mong Đợi**:
  - Chuyển hướng người dùng về `/settings?tab=connections&status=linked_success`.
  - Cơ sở dữ liệu: Bản ghi User A được cập nhật `discord_id = "discord_123"` và `discord_username = "DiscordUserA"`.
  - Thao tác hoàn tất trong thời gian $\le 500\text{ms}$ (`NFR-023`).

---

### TC-032: Từ Chối Liên Kết Khi Discord ID Đã Thuộc Tài Khoản Khác (Xung Đột 1-1 BR-025)
- **Mã Ca Kiểm Thử**: `TC-032`
- **Mức Độ Ưu Tiên**: `P0` (Critical)
- **Truy Vết**: `FR-040`, `BR-025`, `SEC-011`, `CTRL-010`, `OP-027`, `UC-029`
- **Tiền Điều Kiện**: Người dùng User B đã liên kết với tài khoản Discord `discord_999`. Người dùng User C đang đăng nhập và cố gắng liên kết với cùng tài khoản Discord `discord_999`.
- **Các Bước Thực Hiện**:
  1. User C khởi tạo liên kết và nhận chuỗi state hợp lệ.
  2. Gửi callback `GET /api/v1/auth/discord/callback?code=mock_code&state={state_user_c}`.
  3. Mock API Discord trả về hồ sơ có `id="discord_999"`.
- **Kết Quả Mong Đợi**:
  - Hệ thống phát hiện xung đột: `discord_999` đã thuộc về User B (`BR-025`).
  - Hủy bỏ liên kết, chuyển hướng về `/settings?tab=connections&error=discord_already_linked`.
  - Hồ sơ của User C giữ nguyên `discord_id = NULL`; hồ sơ User B không bị xáo trộn.

---

### TC-033: Hủy Liên Kết Discord An Toàn Sau Khi Xác Thực Mật Khẩu
- **Mã Ca Kiểm Thử**: `TC-033`
- **Mức Độ Ưu Tiên**: `P0` (Critical)
- **Truy Vết**: `FR-041`, `FR-042`, `BR-026`, `BR-027`, `SEC-011`, `CTRL-010`, `OP-028`, `UC-030`, `NFR-023`
- **Tiền Điều Kiện**: Người dùng User A đang có liên kết Discord (`discord_id = "discord_123"`) và đã có mật khẩu đăng nhập (`hashed_password IS NOT NULL`).
- **Các Bước Thực Hiện**:
  1. Gửi `DELETE /api/v1/users/me/discord` với mật khẩu sai: `{"password": "WrongPassword!"}`.
  2. Gửi `DELETE /api/v1/users/me/discord` với mật khẩu đúng: `{"password": "CorrectPassword123!"}`.
- **Kết Quả Mong Đợi**:
  - Bước 1: Trả về mã lỗi `HTTP 401 Unauthorized`: "Mật khẩu xác nhận không chính xác." (`BR-027`).
  - Bước 2: Vượt qua Re-auth, trả về mã `HTTP 200 OK`. Trường `discord_id` và `discord_username` được gán về `NULL`. Thời gian xử lý $\le 500\text{ms}$ (`NFR-023`).

---

### TC-034: Chốt Chặn Khóa Tài Khoản Khi Hủy Liên Kết Không Có Mật Khẩu (BR-026)
- **Mã Ca Kiểm Thử**: `TC-034`
- **Mức Độ Ưu Tiên**: `P0` (Critical)
- **Truy Vết**: `FR-041`, `BR-026`, `SEC-011`, `CTRL-010`, `OP-028`, `UC-030`
- **Tiền Điều Kiện**: Người dùng User D đăng ký tài khoản thuần túy qua Discord OAuth2, chưa từng thiết lập mật khẩu (`hashed_password IS NULL` theo `BR-018`).
- **Các Bước Thực Hiện**:
  1. User D gửi yêu cầu `DELETE /api/v1/users/me/discord` kèm bất kỳ payload nào.
- **Kết Quả Mong Đợi**:
  - Hệ thống kích hoạt Chốt chặn chống khóa tài khoản (`BR-026`).
  - Lập tức từ chối với mã phản hồi `HTTP 400 Bad Request`: "Không thể hủy liên kết Discord vì tài khoản chưa thiết lập mật khẩu đăng nhập. Vui lòng tạo mật khẩu tại tab Bảo mật trước khi hủy liên kết."
  - Tài khoản User D vẫn duy trì liên kết Discord bình thường.

---

## 9. Phân Hệ Quản Lý & Tương Tác Bot Discord (Discord Bot Management & Interaction Dispatch)

### TC-039: Kiểm Tra Truy Vấn Cấu Hình & Khám Phá Guild Có Quyền Quản Trị
- **Mã Ca Kiểm Thử**: `TC-039`
- **Mức Độ Ưu Tiên**: `P0` (Critical)
- **Truy Vết**: `FR-044`, `BR-031`, `BR-034`, `SEC-013`, `OP-031`, `OP-033`, `UC-032`, `UX-011`, `ADR-012`
- **Tiền Điều Kiện**:
  - Người dùng User A đã liên kết tài khoản Discord (`discord_id IS NOT NULL`). Tham gia 2 máy chủ: Server Alpha (có quyền `ADMINISTRATOR` 0x8), Server Beta (chỉ có quyền member thông thường).
  - Người dùng User B chưa liên kết Discord (`discord_id IS NULL`).
- **Các Bước Thực Hiện**:
  1. User A đăng nhập, gửi `GET /api/v1/bot/discord/guilds` (`OP-033`) và `GET /api/v1/bot/discord/config` (`OP-031`).
  2. Kiểm tra danh sách máy chủ trả về và cờ `is_admin`.
  3. User B đăng nhập, gửi `GET /api/v1/bot/discord/guilds`.
- **Kết Quả Mong Đợi**:
  - Tại bước 1 & 2: User A nhận `HTTP 200 OK`. Server Alpha có `is_admin = true`, Server Beta bị loại bỏ hoặc đánh dấu `is_admin = false` theo kiểm tra bitwise permissions (`BR-034`).
  - Tại bước 3: User B bị chặn ngay lập tức với `HTTP 403 Forbidden` (`DISCORD_NOT_LINKED` theo `BR-031`).

---

### TC-040: Cập Nhật Cấu Hình Bot Discord & Định Tuyến Mô Hình Hoạt Động (ACTIVE Model Invariant)
- **Mã Ca Kiểm Thử**: `TC-040`
- **Mức Độ Ưu Tiên**: `P0` (Critical)
- **Truy Vết**: `FR-045`, `BR-033`, `BR-034`, `OP-032`, `UC-032`, `NFR-025`, `ADR-012`
- **Tiền Điều Kiện**: User A đã liên kết Discord và là Admin của Server Alpha. Hệ thống có mô hình `gpt-4o-mini` (trạng thái `ACTIVE`) và mô hình `legacy-model` (trạng thái `INACTIVE`).
- **Các Bước Thực Hiện**:
  1. User A gửi `PUT /api/v1/bot/discord/config` với payload hợp lệ: `active_model_id = 'gpt-4o-mini'`, `guild_id = 'alpha_id'`, `system_prompt = 'Prompt tùy chỉnh'`, `max_tokens_per_response = 1000`, `is_enabled = true`.
  2. User A gửi `PUT /api/v1/bot/discord/config` với `active_model_id = 'legacy-model'`.
  3. User A gửi `PUT /api/v1/bot/discord/config` với `guild_id = 'beta_id'` (máy chủ không có quyền quản trị).
- **Kết Quả Mong Đợi**:
  - Bước 1 thành công: Trả về `HTTP 200 OK`, cấu hình được lưu vào `discord_bot_configs`.
  - Bước 2 bị từ chối: Trả về `HTTP 400 Bad Request` do vi phạm bất biến mô hình phải ở trạng thái hoạt động (`BR-033`).
  - Bước 3 bị từ chối: Trả về `HTTP 403 Forbidden` do vi phạm thẩm quyền quản trị máy chủ (`BR-034`).

---

### TC-041: Kiểm Tra Chốt Chặn Hạn Ngạch Dùng Chung & Xác Thực Chữ Ký Ed25519
- **Mã Ca Kiểm Thử**: `TC-041`
- **Mức Độ Ưu Tiên**: `P0` (Critical)
- **Truy Vết**: `FR-046`, `BR-032`, `SEC-013`, `CTRL-012`, `OP-034`, `UC-033`, `ADR-012`
- **Tiền Điều Kiện**: Cấu hình bot đã kích hoạt (`is_enabled = true`), tài khoản có hạn ngạch `daily_token_limit = 10000`.
- **Các Bước Thực Hiện**:
  1. Gửi request tương tác với header `X-Signature-Ed25519` mang chuỗi giả mạo không khớp.
  2. Tài khoản đang dùng `used_tokens = 2000`: Gửi yêu cầu test dispatch hợp lệ `POST /api/v1/bot/discord/test-dispatch` tiêu thụ 150 tokens.
  3. Giả lập `used_tokens = 10000` (đạt 100% hạn ngạch trong ngày) và gửi tiếp một yêu cầu test dispatch.
- **Kết Quả Mong Đợi**:
  - Bước 1: Bị từ chối ngay lập tức với `HTTP 401 Unauthorized` (`SEC-013`).
  - Bước 2: Trả về `HTTP 200 OK` trong thời gian $\le 300\text{ms}$ (`NFR-025`), `used_tokens` tăng lên 2150 tokens nguyên tử trong `user_quotas` (`BR-032`).
  - Bước 3: Kích hoạt chốt chặn hạn ngạch, từ chối với `HTTP 429 Too Many Requests` và không gọi LLM Provider bên ngoài (`BR-032`, `BR-020`).

---

### TC-042: Đồng Bộ Lịch Sử Trò Chuyện Từ Discord Sang Web
- **Mã Ca Kiểm Thử**: `TC-042`
- **Mức Độ Ưu Tiên**: `P1` (High)
- **Truy Vết**: `FR-047`, `OP-034`, `UC-034`, `ADR-012`
- **Tiền Điều Kiện**: User A đã cấu hình bot và gửi câu hỏi thành công trong `TC-041`.
- **Các Bước Thực Hiện**:
  1. User A truy cập trang Web Chat (`/chat`).
  2. Gửi yêu cầu `GET /api/v1/chat/conversations` để lấy danh sách hội thoại.
  3. Lấy chi tiết tin nhắn của phiên chat Discord tương ứng.
- **Kết Quả Mong Đợi**:
  - Danh sách hội thoại hiển thị phiên chat có tiêu đề liên quan đến Discord Bot.
  - Tin nhắn câu hỏi và câu trả lời hiển thị chính xác nội dung, mang cờ thuộc tính `source = 'DISCORD'` (`FR-047`).








