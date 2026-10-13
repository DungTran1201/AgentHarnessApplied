# UC-AUTH-005 [UC-022] — Đăng Nhập & Liên Kết Bằng Discord (Discord Account Login & Linking)

---

## 1. Overview
Ca sử dụng này cho phép người dùng đã sở hữu tài khoản liên kết Discord thực hiện đăng nhập nhanh vào hệ thống AI-Chan mà không cần nhập mật khẩu, hoặc tự động liên kết tài khoản email sẵn có với định danh Discord khi người dùng thực hiện đăng nhập bằng Discord lần đầu.

---

## 2. Goal
Đăng nhập nhanh chóng, an toàn vào hệ thống AI-Chan chỉ với một lần nhấp chuột thông qua ủy quyền OAuth2 của tài khoản Discord cá nhân.

---

## 3. Scope
Hệ thống AI-Chan (Phân hệ Xác thực & Quản lý Danh tính — `CAP-AUTH`).

---

## 4. Primary Actor
`ACT-01: Guest (Khách truy cập đã có tài khoản liên kết)` hoặc `ACT-02: Registered User (Người dùng sở hữu tài khoản email muốn liên kết)`.

---

## 5. Supporting Actors
- `ai-frontend`: Giao diện web hiển thị nút "Tiếp tục với Discord" trên trang đăng nhập và tiếp nhận điều hướng sau đăng nhập.
- `ai-backend`: Dịch vụ máy chủ xử lý ủy quyền OAuth2, kiểm tra khớp `state`, truy vấn cơ sở dữ liệu và thiết lập cookie HttpOnly.
- `Discord OAuth2 Provider`: Máy chủ ủy quyền của Discord.
- `Database SQLite`: Lưu trữ và đối chiếu thông tin định danh `discord_id`, `email`.

---

## 6. Trigger
Người dùng nhấn nút "Tiếp tục với Discord" trên trang Đăng nhập (`/login`).

---

## 7. Preconditions
- Người dùng đã truy cập website AI-Chan.
- Người dùng đã có tài khoản Discord hoạt động.
- Cấu hình Discord API trên Backend đã được thiết lập đầy đủ.

---

## 8. Postconditions

### 8.1 Success Postconditions
- Phiên đăng nhập người dùng được thiết lập thông qua Cookie HttpOnly chứa JWT có thời hạn 7 ngày (`SEC-004`).
- Định danh Discord (`discord_id`, `discord_username`) được liên kết chính xác với tài khoản trong cơ sở dữ liệu (`BR-017`).
- Người dùng được chuyển hướng vào không gian làm việc chính (`/chat`).

### 8.2 Failure Postconditions
- Không có phiên làm việc nào được cấp phát.
- Người dùng được chuyển hướng về trang `/login` kèm thông báo lỗi chi tiết.

---

## 9. Main Success Scenario (Kịch Bản Thành Công Chính)

1. Người dùng truy cập trang Đăng nhập (`/login`).
2. Người dùng nhấn nút "Tiếp tục với Discord" (`UX-002`).
3. Trình duyệt gửi yêu cầu `GET /api/v1/auth/discord/login` (`OP-016`).
4. Backend sinh mã bảo vệ CSRF `state` có chữ ký mật mã HMAC-SHA256 và chuyển hướng trình duyệt tới URL xác thực Discord OAuth2 (`BR-016`, `SEC-008`).
5. Người dùng xác nhận cấp quyền truy cập trên trang ủy quyền Discord.
6. Discord chuyển hướng trình duyệt về Callback URL `GET /api/v1/auth/discord/callback?code={code}&state={state}` (`OP-017`).
7. Backend kiểm tra tính hợp lệ và thời hạn của tham số `state` (`BR-016`).
8. Backend gửi yêu cầu POST đổi `code` lấy `access_token` từ Discord qua kênh HTTPS.
9. Backend gọi API Discord `/users/@me` để lấy hồ sơ người dùng (`id`, `username`, `email`, `verified`).
10. Backend tìm kiếm người dùng trong cơ sở dữ liệu theo `discord_id`:
    - Tìm thấy tài khoản tương ứng với `discord_id`.
11. Backend cập nhật thời gian đăng nhập mới nhất `updated_at`.
12. Backend tạo mã JWT Token phiên làm việc và thiết lập cookie HttpOnly (`ADR-002`, `SEC-004`).
13. Backend chuyển hướng trình duyệt về giao diện hội thoại `/chat`.

---

## 10. Extensions / Alternate Flows (Luồng Thay Thế & Ngoại Lệ)

### 10.1 Tự Động Liên Kết Tài Khoản Email Sẵn Có (Auto-Linking)
- **Điều kiện**: Tại bước 10, chưa tồn tại bản ghi với `discord_id`, nhưng tìm thấy tài khoản trong bảng `users` có `email == discord_profile.email`.
- **Xử lý**:
  1. Backend kiểm tra trường `verified` của Discord. Nếu `verified == true`:
  2. Backend cập nhật `discord_id` và `discord_username` vào bản ghi tài khoản hiện tại (`BR-017`).
  3. Backend phát hành JWT cookie và chuyển hướng người dùng về `/chat`.
  4. Nếu `verified == false`: Backend từ chối liên kết và chuyển hướng về `/login?error=unverified_discord_email`.

### 10.2 Chưa Từng Đăng Ký Tài Khoản Nào (Tự Động Chuyển Sang Quy Trình Đăng Ký)
- **Điều kiện**: Tại bước 10, không tìm thấy cả `discord_id` lẫn `email` trong bảng `users`.
- **Xử lý**:
  1. Backend tự động khởi tạo tài khoản mới theo quy trình đăng ký `FR-027` (`BR-018`).
  2. Cấp phát phiên làm việc và chuyển hướng về `/chat`.

### 10.3 Sai Lệch State CSRF (Ngoại Lệ 1)
- **Điều kiện**: Tại bước 7, tham số `state` không hợp lệ hoặc đã quá 10 phút.
- **Xử lý**:
  1. Backend từ chối xử lý, chuyển hướng về `/login?error=invalid_state`.
  2. Ghi nhật ký cảnh báo an ninh `SEC_OAUTH_STATE_MISMATCH` (`SEC-008`).

### 10.4 Người Dùng Từ Chối Cấp Quyền (Ngoại Lệ 2)
- **Điều kiện**: Người dùng bấm "Cancel" trên màn hình Discord.
- **Xử lý**:
  1. Backend nhận callback với `error=access_denied`.
  2. Chuyển hướng người dùng về `/login?error=oauth_cancelled`.
  3. Frontend hiển thị thông báo: "Bạn đã hủy quá trình đăng nhập bằng Discord."

---

## 11. Traceability & Requirements Mapping
- **Mã Yêu Cầu Chức Năng**: `FR-028` (Discord Account Login & Linking).
- **Quy Tắc Nghiệp Vụ Áp Dụng**: `BR-016` (State CSRF Guard), `BR-017` (Verified Email Auto-Linking), `BR-018` (Null-Password Invariant).
- **Yêu Cầu An Ninh Liên Quan**: `SEC-004` (JWT Session Protection), `SEC-008` (OAuth2 State Guard & Secrets Hardening).
- **Quy Trình Nghiệp Vụ**: `BP-AUTH-004 [PROC-014]`.
- **Tiêu Chí Nghiệm Thu**: `AC-009-B`.
- **Quyết Định Kiến Trúc**: `ADR-007` (Kiến trúc xác thực Discord OAuth2).
