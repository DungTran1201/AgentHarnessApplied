# UC-AUTH-004 [UC-021] — Đăng Ký Tài Khoản Bằng Discord (Discord Account Registration)

---

## 1. Overview
Ca sử dụng này cho phép một khách truy cập chưa có tài khoản trên hệ thống thực hiện đăng ký tài khoản người dùng mới thông qua giao thức ủy quyền an toàn Discord OAuth2, tận dụng danh tính đã được xác thực từ Discord mà không cần nhập mật khẩu truyền thống.

---

## 2. Goal
Đăng ký và khởi tạo tài khoản cá nhân một cách nhanh chóng, an toàn, giảm bớt ma sát nhập liệu, tự động liên kết định danh Discord và cấp phiên đăng nhập hợp lệ.

---

## 3. Scope
Hệ thống AI-Chan (Phân hệ Xác thực & Quản lý Danh tính — `CAP-AUTH`).

---

## 4. Primary Actor
`ACT-01: Guest (Khách vãng lai / Người dùng chưa xác thực)`.

---

## 5. Supporting Actors
- `ai-frontend`: Giao diện web hiển thị nút "Tiếp tục với Discord", điều hướng đến OAuth2 URL và tiếp nhận kết quả chuyển hướng.
- `ai-backend`: Dịch vụ máy chủ sinh và thẩm định CSRF `state` token, trao đổi mã authorization code lấy Discord Access Token, trích xuất hồ sơ người dùng và cấp JWT Cookie.
- `Discord OAuth2 Provider`: Máy chủ xác thực ủy quyền của Discord (`https://discord.com/api/oauth2/authorize`, `https://discord.com/api/oauth2/token`).
- `Database SQLite`: Lưu trữ bản ghi tài khoản người dùng với `discord_id`, `discord_username`, và `hashed_password = NULL`.

---

## 6. Trigger
Khách vãng lai bấm nút "Tiếp tục với Discord" trên trang Đăng ký (`/register`).

---

## 7. Preconditions
- Người dùng đã truy cập hệ thống qua kết nối an toàn HTTPS.
- Người dùng sở hữu tài khoản Discord hoạt động có địa chỉ email đã được xác minh (`verified == true`).
- Ứng dụng đã cấu hình các biến môi trường Discord API: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`.

---

## 8. Postconditions

### 8.1 Success Postconditions
- Bản ghi người dùng mới được tạo lập trong cơ sở dữ liệu với `discord_id`, `discord_username`, `email`, và `hashed_password = NULL` (`BR-018`).
- Hệ thống phát hành HttpOnly JWT session cookie (`access_token`) có thời hạn 7 ngày (`SEC-004`).
- Người dùng được chuyển hướng vào giao diện trò chuyện chính (`/chat`) với trạng thái đã đăng nhập.

### 8.2 Failure Postconditions
- Không có bản ghi người dùng mới nào được tạo trong cơ sở dữ liệu.
- Người dùng được chuyển hướng quay lại màn hình đăng ký kèm thông báo lỗi thân thiện.

---

## 9. Main Success Scenario (Kịch Bản Thành Công Chính)

1. Người dùng truy cập trang Đăng ký (`/register`).
2. Người dùng nhấn nút "Tiếp tục với Discord" (`UX-001`).
3. Trình duyệt gửi yêu cầu `GET /api/v1/auth/discord/login` (`OP-016`).
4. Backend sinh mã ngẫu nhiên `state` được ký bảo mật bằng HMAC-SHA256 kèm thời hạn 10 phút, lưu trữ tạm vào cookie bảo vệ (`BR-016`, `SEC-008`).
5. Backend phản hồi `HTTP 307 Temporary Redirect` đưa người dùng sang URL ủy quyền Discord OAuth2 kèm `client_id`, `redirect_uri`, `scope=identify email`, và `state`.
6. Người dùng đăng nhập tài khoản Discord (nếu chưa đăng nhập) và nhấn "Authorize" chấp thuận cấp quyền truy cập danh tính và email.
7. Discord chuyển hướng trình duyệt về Callback URL hệ thống: `GET /api/v1/auth/discord/callback?code={code}&state={state}` (`OP-017`).
8. Backend tiếp nhận yêu cầu callback và kiểm tra tính toàn vẹn của tham số `state`:
   - Xác minh chữ ký số HMAC và thời hạn không vượt quá 10 phút (`BR-016`, `SEC-008`).
9. Backend thực hiện gửi yêu cầu POST HTTPS nội bộ sang `https://discord.com/api/oauth2/token` để đổi `code` lấy `access_token` Discord.
10. Backend sử dụng token nhận được để gọi API `GET https://discord.com/api/users/@me`, trích xuất thông tin hồ sơ: `id`, `username`, `email`, `verified`, `avatar`.
11. Backend kiểm tra điều kiện email Discord: `verified == true` (`BR-017`).
12. Backend truy vấn cơ sở dữ liệu và xác định `discord_id` chưa tồn tại và `email` chưa tồn tại trong bảng `users`.
13. Backend thực hiện chèn bản ghi mới vào bảng `users`:
    - `email = discord_email`
    - `full_name = discord_username`
    - `discord_id = discord_id`
    - `discord_username = discord_username`
    - `hashed_password = NULL` (`BR-018`)
    - `is_active = 1`
14. Backend tạo mã JWT Token chứa định danh tài khoản và ghi vào HttpOnly Cookie với cờ `Secure`, `SameSite=Lax` (`ADR-002`, `SEC-004`).
15. Backend chuyển hướng người dùng về trang `/chat` và giao diện thông báo đăng ký thành công.

---

## 10. Extensions / Alternate Flows (Luồng Thay Thế & Ngoại Lệ)

### 10.1 Email Đã Tồn Tại Trong Hệ Thống (Auto-Linking — Luồng Thay Thế)
- **Điều kiện**: Tại bước 12, `email` từ Discord trùng với email của một tài khoản đã có sẵn trong bảng `users`.
- **Xử lý**:
  1. Backend kiểm tra cờ `verified` từ Discord. Nếu `verified == true`:
  2. Backend tự động cập nhật bản ghi hiện tại với `discord_id = discord_id` và `discord_username = discord_username` (`BR-017`).
  3. Backend phát hành JWT session cookie cho tài khoản hiện có này và chuyển hướng về `/chat`.

### 10.2 Người Dùng Hủy Ủy Quyền Trên Discord (Ngoại Lệ 1)
- **Điều kiện**: Tại bước 6, người dùng nhấn "Cancel" từ chối cấp quyền.
- **Xử lý**:
  1. Discord chuyển hướng về `callback` với tham số `error=access_denied`.
  2. Backend bắt ngoại lệ và chuyển hướng trình duyệt về `/register?error=oauth_cancelled`.
  3. Frontend hiển thị banner cảnh báo: "Bạn đã hủy cấp quyền đăng nhập Discord."

### 10.3 Tham Số State Bị Làm Giả Hoặc Hết Hạn (Ngoại Lệ 2 — Tấn Công CSRF)
- **Điều kiện**: Tại bước 8, chuỗi `state` không hợp lệ, sai lệch chữ ký hoặc quá 10 phút.
- **Xử lý**:
  1. Backend từ chối xử lý, ném ngoại lệ `HTTP 400 Bad Request` hoặc chuyển hướng về `/register?error=invalid_state`.
  2. Ghi nhật ký an ninh `SEC_OAUTH_STATE_MISMATCH` phục vụ kiểm toán (`SEC-008`).

### 10.4 Email Discord Chưa Được Xác Thực (Ngoại Lệ 3)
- **Điều kiện**: Tại bước 11, `verified == false`.
- **Xử lý**:
  1. Backend từ chối đăng ký và chuyển hướng về `/register?error=unverified_discord_email`.
  2. Frontend hiển thị thông báo: "Vui lòng xác thực địa chỉ email trên tài khoản Discord của bạn trước khi đăng ký."

---

## 11. Traceability & Requirements Mapping
- **Mã Yêu Cầu Chức Năng**: `FR-027` (Discord Account Registration).
- **Quy Tắc Nghiệp Vụ Áp Dụng**: `BR-016` (State CSRF Guard), `BR-017` (Verified Email Auto-Linking), `BR-018` (Null-Password Invariant).
- **Yêu Cầu An Ninh Liên Quan**: `SEC-004` (JWT Cookie Protection), `SEC-008` (OAuth2 State Guard & Secrets Hardening).
- **Quy Trình Nghiệp Vụ**: `BP-AUTH-004 [PROC-014]`.
- **Tiêu Chí Nghiệm Thu**: `AC-009-A`.
- **Quyết Định Kiến Trúc**: `ADR-007` (Kiến trúc xác thực Discord OAuth2).
