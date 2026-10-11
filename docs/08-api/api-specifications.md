# ĐẶC TẢ CHI TIẾT CÁC ĐIỂM CUỐI API (API SPECIFICATIONS)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `API-SPEC-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Đặc tả chi tiết các điểm cuối REST API và SSE Streaming, cấu trúc Request Body, Response Payload và mã trạng thái HTTP |

---

## 1. Phân Hệ Xác Thực & Danh Tính (Authentication Endpoints)

### 1.1 POST /api/v1/auth/register
- **Mục đích**: Đăng ký tài khoản người dùng mới (`FR-001`, `UC-AUTH-001 [UC-001]`).
- **Headers**: `Content-Type: application/json`.
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "full_name": "Nguyễn Văn A"
  }
  ```
- **Responses**:
  - `201 Created`: Trả về thông tin người dùng (không chứa mật khẩu).
    ```json
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "email": "user@example.com",
      "full_name": "Nguyễn Văn A",
      "created_at": "2026-10-07T10:00:00Z"
    }
    ```
  - `400 Bad Request`: Email đã tồn tại.
  - `422 Unprocessable Entity`: Dữ liệu không thỏa schema (mật khẩu < 6 ký tự).
  - `429 Too Many Requests`: Vi phạm rate limit (`BR-006`).

---

### 1.2 POST /api/v1/auth/login
- **Mục đích**: Xác thực thông tin đăng nhập và cấp phát phiên JWT Cookie (`FR-002`, `UC-AUTH-002 [UC-002]`).
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Responses**:
  - `200 OK`:
    - **Set-Cookie Header**: `access_token=eyJhbGciOi...; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax; Secure` (`SEC-004`).
    - **Body**: Profile thông tin người dùng.
  - `401 Unauthorized`: Sai email hoặc mật khẩu.
  - `403 Forbidden`: Tài khoản bị khóa (`status = DISABLED`).
  - `429 Too Many Requests`: Vi phạm rate limit.

---

### 1.3 POST /api/v1/auth/logout
- **Mục đích**: Hủy bỏ phiên làm việc và xóa Cookie (`FR-003`, `UC-AUTH-003 [UC-003]`).
- **Responses**:
  - `200 OK`:
    - **Set-Cookie Header**: `access_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`.
    - **Body**: `{"message": "Đăng xuất thành công"}`.

---

### 1.4 GET /api/v1/auth/me
- **Mục đích**: Lấy thông tin hồ sơ của người dùng đang đăng nhập dựa trên Cookie hiện tại.
- **Responses**:
  - `200 OK`: Thông tin profile (`id`, `email`, `full_name`).
  - `401 Unauthorized`: Chưa đăng nhập hoặc token hết hạn.

---

### 1.5 GET /api/v1/auth/discord/login [OP-016]
- **Mục đích**: Khởi tạo quy trình xác thực OAuth2 với Discord, sinh chuỗi state bảo mật CSRF và chuyển hướng người dùng sang trang ủy quyền của Discord (`FR-027`, `FR-028`, `UC-AUTH-004 [UC-021]`, `UC-AUTH-005 [UC-022]`).
- **Bảo mật**: Public endpoint, hỗ trợ bảo vệ CSRF qua HMAC-SHA256 Signed State (`BR-016`, `SEC-008`).
- **Request Parameters**: Không có.
- **Responses**:
  - `307 Temporary Redirect`:
    - **Header Location**: `https://discord.com/oauth2/authorize?client_id={DISCORD_CLIENT_ID}&response_type=code&redirect_uri={DISCORD_REDIRECT_URI}&scope=identify%20email&state={signed_state}`.
    - **Set-Cookie Header**: `oauth_state={signed_state}; Max-Age=600; Path=/; HttpOnly; SameSite=Lax`.
  - `500 Internal Server Error`: Thiếu cấu hình `DISCORD_CLIENT_ID` hoặc `DISCORD_REDIRECT_URI` trong file môi trường `.env`.

---

### 1.6 GET /api/v1/auth/discord/callback [OP-017]
- **Mục đích**: Tiếp nhận mã ủy quyền (`code`) và chuỗi `state` từ Discord sau khi người dùng cấp quyền, xác thực CSRF state, trao đổi mã lấy token nội bộ, trích xuất hồ sơ người dùng từ Discord API (`@me`), tạo mới hoặc tự động liên kết tài khoản (`BR-017`, `BR-018`), và cấp phát HttpOnly JWT session cookie (`ADR-002`, `ADR-007`).
- **Bảo mật**: Kiểm tra khớp tuyệt đối `state` parameter và cookie `oauth_state` (`BR-016`, `SEC-008`).
- **Query Parameters**:
  - `code` (string, required): Mã ủy quyền do Discord cấp phát.
  - `state` (string, required): Chuỗi mã hóa CSRF state.
- **Responses**:
  - `307 Temporary Redirect` (Thành công):
    - **Header Location**: `/chat` (hoặc URL đích an toàn).
    - **Set-Cookie Header**: `access_token={jwt_token}; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax`.
  - `307 Temporary Redirect` (Hủy ủy quyền / Lỗi phía Discord):
    - **Header Location**: `/login?error=oauth_cancelled` hoặc `/register?error=oauth_cancelled`.
  - `400 Bad Request` / `307 Redirect to /login?error=invalid_state`: Chuỗi `state` không hợp lệ, sai chữ ký HMAC hoặc đã hết hạn (> 10 phút) (`BR-016`, `SEC-008`).
  - `400 Bad Request` / `307 Redirect to /login?error=unverified_email`: Tài khoản Discord chưa xác minh email (`BR-017`).
  - `502 Bad Gateway`: Lỗi giao tiếp trao đổi token hoặc gọi profile với máy chủ Discord.

---

## 2. Phân Hệ Quản Lý Cuộc Trò Chuyện (Conversation Endpoints)

### 2.1 POST /api/v1/conversations
- **Mục đích**: Khởi tạo cuộc trò chuyện mới (`FR-004`, `UC-CONV-001 [UC-004]`).
- **Bảo mật**: Yêu cầu Cookie `access_token` (`BR-001`).
- **Request Body**: `{ "title": "Cuộc trò chuyện mới" }` (tùy chọn).
- **Responses**:
  - `201 Created`: Trả về thực thể Conversation mới tạo (`id`, `title`, `created_at`, `updated_at`).
  - `401 Unauthorized`: Chưa đăng nhập.

---

### 2.2 GET /api/v1/conversations
- **Mục đích**: Lấy danh sách các cuộc trò chuyện của người dùng hiện tại (`FR-005`, `UC-CONV-002 [UC-005]`).
- **Responses**:
  - `200 OK`: Mảng các cuộc trò chuyện, sắp xếp `updated_at DESC`.

---

### 2.3 GET /api/v1/conversations/{conv_id}/messages
- **Mục đích**: Tải toàn bộ tin nhắn thuộc một cuộc trò chuyện (`FR-012`, `UC-CONV-002 [UC-005]`).
- **Responses**:
  - `200 OK`: Danh sách tin nhắn (`id`, `role`, `content`, `model_used`, `created_at`) sắp xếp `created_at ASC`.
  - `404 Not Found / 403 Forbidden`: IDOR protection — không phải chủ sở hữu (`BR-002`).

---

### 2.4 PATCH /api/v1/conversations/{conv_id}
- **Mục đích**: Đổi tên cuộc trò chuyện (`FR-006`, `UC-CONV-003 [UC-006]`).
- **Request Body**: `{ "title": "Tiêu đề mới" }`.
- **Responses**:
  - `200 OK`: Cuộc trò chuyện sau cập nhật.
  - `404 / 403`: Không tìm thấy hoặc không có quyền sở hữu (`BR-002`).

---

### 2.5 DELETE /api/v1/conversations/{conv_id}
- **Mục đích**: Xóa vĩnh viễn cuộc trò chuyện (`FR-007`, `UC-CONV-004 [UC-007]`).
- **Responses**:
  - `200 OK`: `{"message": "Đã xóa cuộc trò chuyện"}`.
  - `404 / 403`: Không tìm thấy hoặc không có quyền sở hữu (`BR-002`).

---

## 3. Phân Hệ Đàm Thoại Trực Tuyến & Streaming (Chat Endpoints)

### 3.1 POST /api/v1/chat/conversations/{conv_id}/stream
- **Mục đích**: Gửi câu hỏi và mở luồng SSE stream câu trả lời (`FR-008..014`, `UC-CHAT-001..002`).
- **Bảo mật**: Yêu cầu Cookie `access_token` (`BR-001`).
- **Request Body**:
  ```json
  {
    "content": "Viết cho tôi một hàm sắp xếp nhanh trong Python",
    "model_override": "gemini-1.5-flash"
  }
  ```
- **Responses**:
  - `200 OK`:
    - **Headers**: `Content-Type: text/event-stream; Cache-Control: no-cache; Connection: keep-alive`.
    - **Wire Stream Format**:
      ```text
      data: {"token": "Dưới", "status": "streaming"}

      data: {"token": " đây là", "status": "streaming"}

      data: {"status": "done"}
      ```
  - `422 Unprocessable Entity`: Tin nhắn rỗng hoặc độ dài > 4,000 ký tự (`BR-003`).
  - `429 Too Many Requests`: Vượt quá tần suất gửi tin nhắn (`BR-006`).

---

## 4. Phân Hệ Giám Sát Hạ Tầng (Health Check)

### 4.1 GET /api/v1/health
- **Mục đích**: Kiểm tra tình trạng hoạt động của container API và kết nối CSDL PostgreSQL.
- **Responses**:
  - `200 OK`: `{"status": "healthy", "database": "connected", "version": "1.0.0"}`.

---

## 5. Phân Hệ Quản Lý Tài Khoản & Hồ Sơ Cá Nhân (User Management Endpoints)

---

### 5.1 GET /api/v1/users/me
- **Mục đích**: Lấy thông tin hồ sơ chi tiết và số liệu thống kê hoạt động của người dùng hiện hành (`FR-015`, `UC-010`).
- **Bảo mật**: Yêu cầu Cookie `access_token` hợp lệ.
- **Responses**:
  - `200 OK`:
    ```json
    {
      "user": {
        "id": "uuid-v4",
        "email": "user@example.com",
        "full_name": "Nguyen Van A",
        "username": "vana_nguyen",
        "avatar_url": "https://example.com/avatar.png",
        "bio": "AI Enthusiast & Software Engineer",
        "phone_number": "0912345678",
        "theme_preference": "DARK",
        "language_preference": "vi",
        "status": "ACTIVE",
        "created_at": "2026-10-07T12:00:00Z",
        "last_login_at": "2026-10-08T00:30:00Z"
      },
      "stats": {
        "total_conversations": 12,
        "total_messages": 85
      }
    }
    ```
  - `401 Unauthorized`: Chưa đăng nhập hoặc token hết hạn.
  - `403 Forbidden`: Tài khoản bị khóa.

---

### 5.2 PATCH /api/v1/users/me/profile
- **Mục đích**: Cập nhật thông tin định danh cá nhân (`FR-016`, `UC-011`, `BR-007`).
- **Bảo mật**: Yêu cầu Cookie `access_token`.
- **Request Body**:
  ```json
  {
    "full_name": "Nguyen Van B",
    "username": "vanb_nguyen",
    "bio": "Senior Developer",
    "phone_number": "0987654321"
  }
  ```
- **Responses**:
  - `200 OK`: Trả về thông tin hồ sơ đã cập nhật.
  - `409 Conflict`: Tên đăng nhập (`username`) đã được sử dụng.
  - `422 Unprocessable Entity`: Dữ liệu không đúng định dạng.

---

### 5.3 PATCH /api/v1/users/me/avatar
- **Mục đích**: Cập nhật hình ảnh đại diện cá nhân (`FR-017`, `UC-012`, `BR-011`).
- **Bảo mật**: Yêu cầu Cookie `access_token`.
- **Request Body**:
  ```json
  {
    "avatar_url": "https://res.cloudinary.com/avatar/user123.webp"
  }
  ```
- **Responses**:
  - `200 OK`: `{"avatar_url": "https://...", "message": "Cập nhật ảnh đại diện thành công"}`.
  - `422 Unprocessable Entity`: URL không hợp lệ hoặc thiếu HTTPS.

---

### 5.4 POST /api/v1/users/me/change-email
- **Mục đích**: Đổi địa chỉ email đăng nhập kèm xác thực mật khẩu hiện tại (`FR-018`, `UC-013`, `BR-008`, `BR-010`, `SEC-006`).
- **Bảo mật**: Yêu cầu Cookie `access_token` và mật khẩu hiện tại.
- **Request Body**:
  ```json
  {
    "new_email": "new.email@aichan.vn",
    "current_password": "CurrentPassword123!"
  }
  ```
- **Responses**:
  - `200 OK`: `{"message": "Địa chỉ email đã được cập nhật thành công", "email": "new.email@aichan.vn"}`.
  - `401 Unauthorized`: Mật khẩu hiện tại không chính xác.
  - `409 Conflict`: Email mới đã được tài khoản khác sử dụng.
  - `422 Unprocessable Entity`: Định dạng email không hợp lệ hoặc trùng email cũ.

---

### 5.5 POST /api/v1/users/me/change-password
- **Mục đích**: Đổi mật khẩu tài khoản và thu hồi các phiên truy cập cũ (`FR-019`, `UC-014`, `BR-008`, `BR-009`, `SEC-002`, `SEC-007`).
- **Bảo mật**: Yêu cầu Cookie `access_token`.
- **Request Body**:
  ```json
  {
    "current_password": "CurrentPassword123!",
    "new_password": "NewSecretPassword2026!"
  }
  ```
- **Responses**:
  - `200 OK`:
    - **Set-Cookie Header**: `access_token=new_token; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax`.
    - **Body**: `{"message": "Đổi mật khẩu thành công. Các phiên làm việc cũ đã được thu hồi."}`.
  - `401 Unauthorized`: Mật khẩu hiện tại không chính xác.
  - `422 Unprocessable Entity`: Mật khẩu mới trùng mật khẩu cũ hoặc không đáp ứng độ phức tạp.

---

### 5.6 PATCH /api/v1/users/me/preferences
- **Mục đích**: Cập nhật cài đặt giao diện hiển thị và ngôn ngữ (`FR-020`, `UC-015`).
- **Bảo mật**: Yêu cầu Cookie `access_token`.
- **Request Body**:
  ```json
  {
    "theme_preference": "DARK",
    "language_preference": "vi"
  }
  ```
- **Responses**:
  - `200 OK`: `{"theme_preference": "DARK", "language_preference": "vi"}`.
  - `422 Unprocessable Entity`: Giá trị không nằm trong whitelist cho phép.

---

## 6. Phân Hệ Quản Lý Agent & Mô Hình Đa Nhà Cung Cấp (Model Management Endpoints)

### 6.1 GET /api/v1/models
- **Mục đích**: Lấy danh mục toàn bộ các mô hình Agent được cấu hình từ các nhà cung cấp bên ngoài (`FR-021`, `UC-016`, `OP-010`).
- **Bảo mật**: Yêu cầu Cookie `access_token`.
- **Query Params**: `status` (tùy chọn: `ALL`, `ACTIVE`, `INACTIVE`). Mặc định: `ALL`.
- **Responses**:
  - `200 OK`:
    ```json
    [
      {
        "id": "gemini-3.8-flash",
        "name": "Google Gemini 3.8 Flash",
        "provider": "google",
        "status": "ACTIVE",
        "is_default": true,
        "context_window": 1048576,
        "max_tokens": 4096,
        "supports_streaming": true,
        "has_api_key": true,
        "latency_ms": 315,
        "last_checked_at": "2026-10-08T04:18:00Z"
      },
      {
        "id": "claude-3-7-sonnet",
        "name": "Anthropic Claude 3.7 Sonnet",
        "provider": "anthropic",
        "status": "INACTIVE",
        "is_default": false,
        "context_window": 200000,
        "max_tokens": 8192,
        "supports_streaming": true,
        "has_api_key": false,
        "latency_ms": null,
        "last_checked_at": null
      }
    ]
    ```

---

### 6.2 GET /api/v1/models/{model_id}
- **Mục đích**: Xem chi tiết thông số kỹ thuật và độ trễ của một mô hình (`FR-022`, `UC-017`, `OP-011`).
- **Bảo mật**: Yêu cầu Cookie `access_token`.
- **Path Params**: `model_id` (string, e.g. `gemini-3.8-flash`).
- **Responses**:
  - `200 OK`: Trả về chi tiết thực thể `AgentModel`.
  - `404 Not Found`: Không tìm thấy mô hình.

---

### 6.3 POST /api/v1/models/{model_id}/test
- **Mục đích**: Kiểm tra trực tiếp kết nối (Ping/Health Check) tới API nhà cung cấp bằng khóa trong `.env` (`FR-023`, `UC-018`, `BR-014`, `OP-012`).
- **Bảo mật**: Yêu cầu Cookie `access_token`.
- **Path Params**: `model_id` (string).
- **Responses**:
  - `200 OK`:
    ```json
    {
      "model_id": "gemini-3.8-flash",
      "healthy": true,
      "latency_ms": 284,
      "message": "Kết nối thành công với nhà cung cấp Google Gemini.",
      "tested_at": "2026-10-08T04:20:00Z"
    }
    ```
  - `400 Bad Request`: Chưa cấu hình API Key trong file `.env`.
  - `502 Bad Gateway`: Lỗi kết nối hoặc API Key không hợp lệ từ phía nhà cung cấp.

---

### 6.4 PATCH /api/v1/models/{model_id}/activate
- **Mục đích**: Kích hoạt trạng thái của mô hình sang `ACTIVE` để đưa vào giao diện chat và bộ điều phối (`FR-024`, `UC-019`, `BR-012`, `BR-014`, `OP-013`).
- **Bảo mật**: Yêu cầu Cookie `access_token`.
- **Path Params**: `model_id` (string).
- **Responses**:
  - `200 OK`:
    ```json
    {
      "model_id": "gemini-3.8-flash",
      "status": "ACTIVE",
      "message": "Mô hình đã được kích hoạt thành công."
    }
    ```
  - `400 Bad Request`: Thiếu API Key trong `.env` (`BR-014`).
  - `404 Not Found`: Không tìm thấy mô hình.

---

### 6.5 PATCH /api/v1/models/{model_id}/deactivate
- **Mục đích**: Tạm dừng mô hình (chuyển sang `INACTIVE`) mà **không xóa vật lý khỏi CSDL** (`FR-025`, `UC-019`, `BR-012`, `BR-013`, `OP-014`).
- **Bảo mật**: Yêu cầu Cookie `access_token`.
- **Path Params**: `model_id` (string).
- **Responses**:
  - `200 OK`:
    ```json
    {
      "model_id": "claude-3-7-sonnet",
      "status": "INACTIVE",
      "message": "Mô hình đã được hủy kích hoạt thành công."
    }
    ```
  - `400 Bad Request`: Mô hình đang được đặt làm mặc định (`BR-013`).
  - `404 Not Found`: Không tìm thấy mô hình.

---

### 6.6 PATCH /api/v1/models/default
- **Mục đích**: Thiết lập mô hình mặc định cho các cuộc trò chuyện mới (`FR-026`, `UC-020`, `BR-013`, `OP-015`).
- **Bảo mật**: Yêu cầu Cookie `access_token`.
- **Request Body**:
  ```json
  {
    "model_id": "gemini-3.8-flash"
  }
  ```
- **Responses**:
  - `200 OK`:
    ```json
    {
      "default_model": "gemini-3.8-flash",
      "message": "Đã thiết lập mô hình mặc định thành công."
    }
    ```
  - `400 Bad Request`: Mô hình chỉ định đang ở trạng thái `INACTIVE`.
  - `404 Not Found`: Không tìm thấy mô hình.

---

### 6.7 POST /api/v1/models [OP-022]
- **Mục đích**: Đăng ký và bổ sung mô hình Agent mới vào danh mục hệ thống (`FR-035`, `UC-MOD-001 [UC-026]`, `BR-022`, `BR-024`, `SEC-010`).
- **Bảo mật**: Yêu cầu Cookie `access_token` hợp lệ (`SEC-010`, `CTRL-009`).
- **Request Body**:
  ```json
  {
    "id": "gemini-3.8-flash",
    "name": "Google Gemini 3.8 Flash (High Speed)",
    "provider": "GOOGLE",
    "context_window": 1000000,
    "max_tokens": 8192,
    "supports_streaming": true
  }
  ```
- **Responses**:
  - `201 Created`:
    ```json
    {
      "id": "gemini-3.8-flash",
      "name": "Google Gemini 3.8 Flash (High Speed)",
      "provider": "GOOGLE",
      "status": "INACTIVE",
      "is_default": false,
      "context_window": 1000000,
      "max_tokens": 8192,
      "supports_streaming": true,
      "message": "Đăng ký mô hình mới thành công."
    }
    ```
  - `400 Bad Request` / `422 Unprocessable Entity`: Tham số vi phạm ngưỡng biên (`context_window < 1000` hoặc `max_tokens < 256` theo `BR-024`).
  - `409 Conflict`: Mã định danh `id` đã tồn tại (`BR-022`).
  - `401 Unauthorized`: Chưa đăng nhập.

---

### 6.8 PUT /api/v1/models/{model_id} [OP-023]
- **Mục đích**: Hiệu chỉnh cấu hình chi tiết (tên hiển thị, context window, max tokens, streaming) của mô hình hiện hành (`FR-036`, `UC-MOD-002 [UC-027]`, `BR-022`, `BR-024`, `SEC-010`).
- **Bảo mật**: Yêu cầu Cookie `access_token` hợp lệ (`SEC-010`, `CTRL-009`).
- **Path Params**: `model_id` (string).
- **Request Body**:
  ```json
  {
    "name": "Google Gemini 3.8 Flash Updated",
    "context_window": 1050000,
    "max_tokens": 8192,
    "supports_streaming": true
  }
  ```
- **Responses**:
  - `200 OK`:
    ```json
    {
      "id": "gemini-3.8-flash",
      "name": "Google Gemini 3.8 Flash Updated",
      "provider": "GOOGLE",
      "status": "ACTIVE",
      "context_window": 1050000,
      "max_tokens": 8192,
      "supports_streaming": true,
      "message": "Cập nhật cấu hình mô hình thành công."
    }
    ```
  - `400 Bad Request`: Payload cố tình thay đổi `id` hoặc `provider` bất biến (`BR-022`).
  - `404 Not Found`: Không tìm thấy mô hình.
  - `422 Unprocessable Entity`: Tham số không hợp lệ (`BR-024`).

---

### 6.9 GET /api/v1/models/search [OP-024]
- **Mục đích**: Tìm kiếm tức thì theo từ khóa toàn văn/mờ (`q`) kết hợp bộ lọc đa tiêu chí (provider, status, has_api_key, is_default, sort) với độ trễ $\le 200\text{ms}$ (`FR-037`, `FR-038`, `NFR-022`, `UC-MOD-003 [UC-028]`).
- **Bảo mật**: Yêu cầu Cookie `access_token`.
- **Query Parameters**:
  - `q` (string, optional): Từ khóa tìm kiếm theo tên hoặc ID.
  - `provider` (string, optional): Lọc theo nhà cung cấp (`GOOGLE`, `ANTHROPIC`, `OPENAI`, `GROQ`, `OLLAMA`).
  - `status` (string, optional): Lọc theo trạng thái (`ACTIVE`, `INACTIVE`, `DEGRADED`, `ARCHIVED`).
  - `has_api_key` (boolean, optional): Lọc theo tình trạng có sẵn khóa API trong `.env`.
  - `is_default` (boolean, optional): Lọc mô hình mặc định.
  - `sort` (string, optional, default: `"name_asc"`): Tiêu chí sắp xếp (`"latency_asc"`, `"context_desc"`, `"name_asc"`).
- **Responses**:
  - `200 OK`:
    ```json
    {
      "total": 3,
      "execution_time_ms": 12.4,
      "items": [
        {
          "id": "gemini-3.8-flash",
          "name": "Google Gemini 3.8 Flash (High Speed)",
          "provider": "GOOGLE",
          "status": "ACTIVE",
          "is_default": true,
          "has_api_key": true,
          "context_window": 1000000,
          "max_tokens": 8192,
          "latency_ms": 280
        }
      ]
    }
    ```

---

### 6.10 DELETE /api/v1/models/{model_id} [OP-025]
- **Mục đích**: Xóa mềm và lưu trữ mô hình (chuyển sang `ARCHIVED`), có chốt chặn bảo vệ mô hình mặc định (`FR-039`, `UC-MOD-002 [UC-027]`, `BR-023`, `SEC-010`).
- **Bảo mật**: Yêu cầu Cookie `access_token` hợp lệ (`SEC-010`, `CTRL-009`).
- **Path Params**: `model_id` (string).
- **Responses**:
  - `200 OK`:
    ```json
    {
      "model_id": "custom-old-model",
      "status": "ARCHIVED",
      "message": "Đã chuyển mô hình vào trạng thái lưu trữ an toàn."
    }
    ```
  - `400 Bad Request`: Mô hình đang được đặt làm mặc định (`is_default = true`) (`BR-023`).
  - `404 Not Found`: Không tìm thấy mô hình.

---

## 7. Phân Hệ Quản Lý Tài Nguyên & Dashboard (Resource Management & Telemetry Endpoints)


---

### 7.1 GET /api/v1/resources/summary [OP-018]
- **Mục đích**: Truy xuất số liệu tổng quan về hiệu năng và tiêu thụ tài nguyên (độ trễ trung bình/P95, TTFT, tổng token, số lượng request, trạng thái quota) trong 24 giờ gần nhất (`FR-029`, `FR-030`, `FR-031`, `FR-032`, `UC-RES-001 [UC-023]`).
- **Bảo mật**: Yêu cầu Cookie `access_token`. Lọc dữ liệu theo `current_user.id` cho người dùng thông thường; tổng hợp toàn hệ thống cho Admin (`BR-021`).
- **Responses**:
  - `200 OK`:
    ```json
    {
      "period": "24h",
      "latency": {
        "avg_ms": 320.5,
        "p95_ms": 780.2,
        "avg_ttft_ms": 410.0
      },
      "tokens": {
        "prompt_tokens": 12500,
        "completion_tokens": 8300,
        "total_tokens": 20800,
        "by_model": {
          "gemini-3.8-flash": 15400,
          "gpt-4o-mini": 5400
        }
      },
      "requests": {
        "total_count": 84,
        "success_count": 82,
        "client_error_count": 2,
        "server_error_count": 0,
        "status_distribution": {
          "200": 82,
          "422": 2
        }
      },
      "quota": {
        "daily_limit": 100000,
        "daily_used": 20800,
        "remaining": 79200,
        "status": "NORMAL",
        "reset_at": "2026-10-11T00:00:00Z"
      }
    }
    ```
  - `401 Unauthorized`: Chưa xác thực phiên làm việc.

---

### 7.2 GET /api/v1/resources/stream [OP-019]
- **Mục đích**: Thiết lập kết nối thời gian thực Server-Sent Events (SSE) để truyền phát liên tục các nhịp đập đo lường (metric ticks) mỗi 1 giây về cho giao diện Dashboard (`FR-033`, `FR-034`, `UC-RES-001 [UC-023]`, `SEC-009`).
- **Bảo mật**: Yêu cầu Cookie `access_token` hợp lệ (`SEC-009`).
- **Headers Trả Về**:
  - `Content-Type: text/event-stream`
  - `Cache-Control: no-cache`
  - `Connection: keep-alive`
  - `X-Accel-Buffering: no`
- **Sự Kiện Phát Luồng (SSE Event Payload)**:
  - `event: initial_snapshot`: Gửi bản ghi tóm tắt ban đầu ngay khi kết nối.
  - `event: metric_tick`: Phát định kỳ mỗi 1 giây hoặc khi có request kết thúc:
    ```json
    {
      "timestamp": "2026-10-10T01:00:00.123Z",
      "live_rpm": 12,
      "recent_latency_ms": 285.4,
      "recent_ttft_ms": 395.1,
      "tokens_today": 20850,
      "quota_percentage": 20.85,
      "quota_status": "NORMAL",
      "latest_request": {
        "endpoint": "/api/v1/chat/conversations/conv-123/stream",
        "status_code": 200,
        "model_used": "gemini-3.8-flash",
        "latency_ms": 420.0,
        "total_tokens": 150
      }
    }
    ```
- **Responses**:
  - `200 OK`: Stream SSE duy trì liên tục cho đến khi client đóng tab.
  - `401 Unauthorized`: Chưa đăng nhập hoặc token không hợp lệ.

---

### 7.3 GET /api/v1/resources/quota [OP-020]
- **Mục đích**: Lấy thông tin chi tiết về hạn ngạch token trong ngày, số lượng token đã dùng, tốc độ RPM cho phép và trạng thái điều tiết (`FR-032`, `UC-RES-003 [UC-025]`, `BR-020`).
- **Bảo mật**: Yêu cầu Cookie `access_token`.
- **Responses**:
  - `200 OK`:
    ```json
    {
      "user_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "daily_token_limit": 100000,
      "daily_tokens_used": 85400,
      "remaining_tokens": 14600,
      "rpm_limit": 30,
      "status": "WARNING_80",
      "warning_message": "Bạn đã sử dụng trên 80% hạn ngạch token hôm nay.",
      "reset_at": "2026-10-11T00:00:00Z"
    }
    ```
  - `401 Unauthorized`: Chưa đăng nhập.

---

### 7.4 GET /api/v1/resources/history [OP-021]
- **Mục đích**: Truy xuất chuỗi dữ liệu lịch sử theo thời gian (time-series points) để hiển thị trên biểu đồ theo các khoảng chọn trước: `1h`, `24h`, `7d`, `30d` (`FR-029`, `FR-030`, `FR-031`, `UC-RES-002 [UC-024]`).
- **Bảo mật**: Yêu cầu Cookie `access_token` (`BR-021`).
- **Query Parameters**:
  - `range` (string, optional, default: `"24h"`): Khoảng thời gian lọc (`"1h"`, `"24h"`, `"7d"`, `"30d"`).
  - `model_id` (string, optional): Lọc theo mô hình cụ thể.
- **Responses**:
  - `200 OK`:
    ```json
    {
      "range": "24h",
      "interval": "1h",
      "series": [
        {
          "time_bucket": "2026-10-09T10:00:00Z",
          "request_count": 15,
          "avg_latency_ms": 310.2,
          "total_tokens": 4200
        },
        {
          "time_bucket": "2026-10-09T11:00:00Z",
          "request_count": 22,
          "avg_latency_ms": 345.8,
          "total_tokens": 6800
        }
      ]
    }
    ```
  - `401 Unauthorized`: Chưa đăng nhập.
  - `400 Bad Request`: Tham số `range` không hợp lệ.

---

## 8. Phân Hệ Quản Lý Liên Kết Định Danh Mạng Xã Hội (Social Account Connections API)

### 8.1 GET /api/v1/auth/discord/link [OP-026]
- **Mục đích**: Khởi tạo luồng ủy quyền Discord OAuth2 dành riêng cho người dùng đã đăng nhập để liên kết tài khoản (`FR-040`, `UC-USER-007 [UC-029]`, `BR-016`, `SEC-008`, `SEC-011`).
- **Bảo mật**: Yêu cầu Cookie `access_token` hợp lệ của người dùng đang đăng nhập (`ACT-02`).
- **Query Parameters**: Không.
- **Responses**:
  - `200 OK`:
    ```json
    {
      "authorization_url": "https://discord.com/api/oauth2/authorize?client_id=123456789&redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Fapi%2Fv1%2Fauth%2Fdiscord%2Fcallback&response_type=code&scope=identify%20email&state=eyJhbGciOi...",
      "state": "eyJhbGciOi..."
    }
    ```
  - `400 Bad Request`: Tài khoản người dùng hiện tại đã có liên kết Discord từ trước.
  - `401 Unauthorized`: Người dùng chưa đăng nhập.

---

### 8.2 GET /api/v1/auth/discord/callback [OP-027]
- **Mục đích**: Tiếp nhận mã ủy quyền `code` và tham số `state` từ Discord OAuth2, phân luồng xử lý: liên kết cho người dùng đang đăng nhập (`action=link`) hoặc đăng ký/đăng nhập cho khách truy cập (`action=login`), đồng thời thực thi chốt chặn từ chối xung đột định danh (`FR-028`, `FR-040`, `BR-016`, `BR-025`, `SEC-011`).
- **Bảo mật**: Kiểm tra chữ ký HMAC và thời hạn 10 phút của tham số `state` (`BR-016`, `SEC-008`).
- **Query Parameters**:
  - `code` (string, required): Mã Authorization Code trả về từ Discord.
  - `state` (string, required): Chuỗi state có chữ ký số HMAC.
- **Responses**:
  - Khi `action = "link"` (Liên kết tài khoản cho người dùng đang đăng nhập):
    - `307 Temporary Redirect` -> `/settings?tab=connections&status=linked_success`: Bản ghi `users` được cập nhật `discord_id` và `discord_username`.
    - `307 Temporary Redirect` -> `/settings?tab=connections&error=discord_already_linked`: Khi tài khoản Discord đã được liên kết với một người dùng khác (`BR-025`, `HTTP 409 Conflict`).
    - `307 Temporary Redirect` -> `/settings?tab=connections&error=invalid_state`: Khi chữ ký HMAC không hợp lệ hoặc state quá hạn (`BR-016`).
  - Khi `action = "login"`: Cấp Cookie phiên `access_token` và chuyển hướng về `/chat` hoặc `/login`.

---

### 8.3 DELETE /api/v1/users/me/discord [OP-028]
- **Mục đích**: Hủy liên kết tài khoản Discord khỏi tài khoản website hiện tại, tích hợp chốt chặn an toàn chống mất quyền truy cập tài khoản (`BR-026`) và yêu cầu tái xác thực mật khẩu hiện tại (`FR-041`, `UC-USER-008 [UC-030]`, `BR-027`, `SEC-006`, `SEC-011`, `CTRL-010`).
- **Bảo mật**: Yêu cầu Cookie `access_token` hợp lệ.
- **Request Body**:
  ```json
  {
    "password": "UserCurrentPassword123!"
  }
  ```
- **Responses**:
  - `200 OK`:
    ```json
    {
      "message": "Hủy liên kết tài khoản Discord thành công.",
      "discord_id": null,
      "discord_username": null
    }
    ```
  - `400 Bad Request`:
    - Tài khoản chưa từng thiết lập mật khẩu đăng nhập (`hashed_password IS NULL` theo `BR-026` - Chốt chặn chống khóa tài khoản).
    - Hoặc tài khoản hiện tại không có liên kết Discord nào.
  - `401 Unauthorized`: Mật khẩu xác thực `password` không chính xác (`BR-027`).

---

### 8.4 GET /api/v1/users/me/connections [OP-029]
- **Mục đích**: Lấy thông tin trạng thái các liên kết tài khoản bên thứ ba (Discord) của người dùng hiện tại để hiển thị trên màn hình Cài đặt (`FR-042`, `UX-009`, `SCR-005`).
- **Bảo mật**: Yêu cầu Cookie `access_token` hợp lệ.
- **Responses**:
  - `200 OK`:
    ```json
    {
      "has_password": true,
      "connections": {
        "discord": {
          "connected": true,
          "discord_id": "987654321012345678",
          "discord_username": "aichan_fan#1234",
          "avatar_url": "https://cdn.discordapp.com/avatars/987654321012345678/abcdef.png"
        }
      }
    }
    ```
  - `401 Unauthorized`: Chưa đăng nhập.

---

## 9. Phân Hệ Quản Lý Bot Discord (Discord Bot Management API)

### 9.1 GET /api/v1/bot/discord/config [OP-031]
- **Mục đích**: Truy xuất cấu hình quản trị bot Discord hiện hành của người dùng đã liên kết Discord (`FR-044`, `FR-045`, `FR-046`, `BR-031`, `UC-BOT-001 [UC-032]`, `ADR-012`).
- **Bảo mật**: Yêu cầu Cookie `access_token` hợp lệ. Bắt buộc tài khoản người dùng đã liên kết Discord (`BR-031`).
- **Responses**:
  - `200 OK`:
    ```json
    {
      "guild_id": "123456789012345678",
      "channel_id": "234567890123456789",
      "active_model_id": "gemini-3.8-flash",
      "system_prompt": "Bạn là AI-Chan, trợ lý ảo thông minh và thân thiện trên Discord server.",
      "max_tokens_per_response": 1000,
      "is_enabled": true,
      "updated_at": "2026-10-10T14:30:00Z"
    }
    ```
  - `401 Unauthorized`: Chưa đăng nhập hoặc phiên làm việc hết hạn.
  - `403 Forbidden`: Tài khoản chưa liên kết Discord (`BR-031` - `DISCORD_NOT_LINKED`).

---

### 9.2 PUT /api/v1/bot/discord/config [OP-032]
- **Mục đích**: Cập nhật thông số cấu hình bot Discord của người dùng, thực thi kiểm tra mô hình định tuyến hoạt động (`BR-033`), quyền hạn quản trị Guild (`BR-034`) và trần token an toàn (`FR-045`, `FR-046`, `UC-BOT-001 [UC-032]`, `ADR-012`).
- **Bảo mật**: Yêu cầu Cookie `access_token` hợp lệ (`BR-031`).
- **Request Body**:
  ```json
  {
    "guild_id": "123456789012345678",
    "channel_id": "234567890123456789",
    "active_model_id": "gpt-4o-mini",
    "system_prompt": "Bạn là AI-Chan, phong cách trả lời ngắn gọn và hỗ trợ code mẫu.",
    "max_tokens_per_response": 1500,
    "is_enabled": true
  }
  ```
- **Responses**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "config": {
        "guild_id": "123456789012345678",
        "channel_id": "234567890123456789",
        "active_model_id": "gpt-4o-mini",
        "system_prompt": "Bạn là AI-Chan, phong cách trả lời ngắn gọn và hỗ trợ code mẫu.",
        "max_tokens_per_response": 1500,
        "is_enabled": true,
        "updated_at": "2026-10-10T14:35:00Z"
      },
      "message": "Cập nhật cấu hình Discord Bot thành công."
    }
    ```
  - `400 Bad Request`:
    - Mô hình chỉ định không tồn tại hoặc không ở trạng thái hoạt động (`status != 'ACTIVE'` theo `BR-033`).
    - Giới hạn `max_tokens_per_response` vượt ngoài dải an toàn [50, 4000].
  - `401 Unauthorized`: Chưa đăng nhập.
  - `403 Forbidden`: Người dùng không có quyền quản trị trên Guild mục tiêu (`BR-034`) hoặc chưa liên kết Discord (`BR-031`).
  - `422 Unprocessable Entity`: Body request sai định dạng schema Pydantic.

---

### 9.3 GET /api/v1/bot/discord/guilds [OP-033]
- **Mục đích**: Khám phá danh sách các máy chủ Discord mà người dùng nắm giữ quyền quản trị (`ADMINISTRATOR` 0x8 hoặc `MANAGE_GUILD` 0x20 theo `BR-034`), kèm theo trạng thái bot đã tham gia máy chủ hay chưa (`FR-044`, `UC-BOT-001 [UC-032]`, `UX-011`, `ADR-012`).
- **Bảo mật**: Yêu cầu Cookie `access_token` hợp lệ (`BR-031`).
- **Responses**:
  - `200 OK`:
    ```json
    {
      "guilds": [
        {
          "id": "123456789012345678",
          "name": "AI-Chan Community Server",
          "icon": "a_123456789abcdef",
          "permissions": "2147483647",
          "is_admin": true,
          "has_bot": true
        },
        {
          "id": "987654321098765432",
          "name": "Dev Team Guild",
          "icon": null,
          "permissions": "32",
          "is_admin": true,
          "has_bot": false
        }
      ]
    }
    ```
  - `401 Unauthorized`: Chưa đăng nhập.
  - `403 Forbidden`: Tài khoản chưa liên kết Discord (`BR-031`).

---

### 9.4 POST /api/v1/bot/discord/test-dispatch [OP-034]
- **Mục đích**: Gửi yêu cầu kiểm thử tương tác đàm thoại với Discord Bot từ bảng điều khiển, thực thi định tuyến mô hình (`BR-033`), trừ hạn ngạch dùng chung với Web (`BR-032`), đo lường độ trễ $\le 300\text{ms}$ (`NFR-025`) và đồng bộ hội thoại sang lịch sử Web (`FR-046`, `FR-047`, `UC-BOT-002 [UC-033]`, `UC-BOT-003 [UC-034]`, `SEC-013`, `CTRL-012`, `ADR-012`).
- **Bảo mật**: Yêu cầu Cookie `access_token` hợp lệ.
- **Request Body**:
  ```json
  {
    "query_text": "Xin chào AI-Chan, kiểm tra kết nối bot từ Discord!",
    "channel_id": "234567890123456789"
  }
  ```
- **Responses**:
  - `200 OK`:
    ```json
    {
      "response_text": "Chào bạn! Tôi là AI-Chan, kết nối Discord Bot đang hoạt động hoàn hảo.",
      "model_used": "gpt-4o-mini",
      "tokens_consumed": 45,
      "latency_ms": 285.4,
      "synced_conversation_id": "c1a2b3c4-d5e6-7890-abcd-ef1234567890"
    }
    ```
  - `400 Bad Request`: Bot đang ở trạng thái tắt (`is_enabled = false`).
  - `403 Forbidden`: Chưa thiết lập cấu hình bot hoặc chưa liên kết Discord (`BR-031`).
  - `429 Too Many Requests`: Hết hạn ngạch token trong ngày (`BR-032`, `BR-020` - Quota Limit Reached).









