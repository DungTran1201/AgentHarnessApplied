# UC-USER-004 [UC-013] — Thay Đổi Địa Chỉ Email An Toàn (Secure Email Change)

---

## 1. Overview
Ca sử dụng này cho phép người dùng thay đổi địa chỉ email đăng nhập của tài khoản. Đây là tác vụ nhạy cảm, vì vậy hệ thống bắt buộc người dùng phải xác thực lại mật khẩu hiện tại (`current_password`) và kiểm tra email mới chưa từng được đăng ký trong hệ thống.

---

## 2. Goal
Cập nhật địa chỉ email nhận thông báo và làm định danh đăng nhập mới của tài khoản một cách an toàn, chống chiếm quyền tài khoản trái phép.

---

## 3. Scope
Hệ thống Website Chatbot Trợ Lý Ảo AI-Chan (Phân hệ Quản Lý Tài Khoản & Bảo Mật).

---

## 4. Primary Actor
`ACT-02: Registered User (Người dùng đã đăng nhập)`.

---

## 5. Supporting Actors
- `ai-frontend`: Giao diện tab Bảo mật, form thay đổi email.
- `ai-backend`: API endpoint `POST /api/v1/users/me/change-email`.
- `Database (SQLite)`: Cập nhật trường `email` với ràng buộc duy nhất `UNIQUE COLLATE NOCASE`.

---

## 6. Trigger
Người dùng điền Email mới và Mật khẩu hiện tại, sau đó nhấn nút "Xác nhận đổi Email".

---

## 7. Preconditions
- Người dùng đang đăng nhập với phiên làm việc hợp lệ.
- Người dùng nhớ chính xác mật khẩu hiện tại của tài khoản.

---

## 8. Postconditions

### 8.1 Success Postconditions
- Địa chỉ email trong bảng `users` được cập nhật thành địa chỉ mới.
- Người dùng nhận thông báo thành công và được khuyến cáo sử dụng email mới cho các lần đăng nhập tiếp theo.
- Hệ thống ghi vết kiểm toán thay đổi thông tin an ninh (`AUDIT_EMAIL_CHANGED`).

### 8.2 Failure Postconditions
- Địa chỉ email cũ được giữ nguyên không thay đổi.
- Bản ghi trong CSDL không bị biến động.
- Trả về thông báo lỗi cụ thể cho người dùng.

---

## 9. Main Success Scenario (Kịch Bản Thành Công Chính)

1. Người dùng truy cập tab "Bảo mật & Đăng nhập" trong Cài đặt.
2. Người dùng nhập:
   - Địa chỉ Email mới (`new_email`).
   - Mật khẩu hiện tại (`current_password`).
3. Người dùng nhấn nút "Xác nhận đổi Email".
4. Client kiểm tra sơ bộ định dạng email chuẩn RFC 5322.
5. Client gửi request `POST /api/v1/users/me/change-email` kèm body `{"new_email": "...", "current_password": "..."}`.
6. Backend xác thực người dùng qua JWT cookie.
7. Backend lấy bản ghi người dùng từ bảng `users` và kiểm tra mật khẩu hiện tại (`verify_password`) theo `BR-008` & `SEC-006`.
8. Backend kiểm tra email mới:
   - Khác với email hiện tại của người dùng.
   - Chưa từng tồn tại trong bảng `users` (`WHERE email = :new_email COLLATE NOCASE AND id != :user_id`) theo `BR-010`.
9. Backend thực hiện câu lệnh UPDATE cập nhật `email = :new_email` và `updated_at = CURRENT_TIMESTAMP`.
10. Backend trả về payload `HTTP 200 OK`: "Địa chỉ email đã được cập nhật thành công."
11. Client hiển thị thông báo Toast thành công và cập nhật email mới trên giao diện.

---

## 10. Extensions / Alternative Flows (Luồng Rẽ Nhánh & Ngoại Lệ)

- **7a. Mật khẩu hiện tại không chính xác**:
  1. Backend so khớp `verify_password` thất bại.
  2. Backend trả về mã lỗi `HTTP 401 Unauthorized`: "Mật khẩu hiện tại không chính xác."
  3. Client làm nổi bật trường Mật khẩu hiện tại và thông báo lỗi.
- **8a. Email mới đã được sử dụng bởi tài khoản khác**:
  1. Backend phát hiện email mới đã có trong bảng `users`.
  2. Backend trả về mã lỗi `HTTP 409 Conflict`: "Địa chỉ email này đã được sử dụng bởi một tài khoản khác."
  3. Client hiển thị cảnh báo trùng lặp email.
- **8b. Email mới trùng với chính email hiện tại**:
  1. Backend phát hiện `new_email == current_user.email`.
  2. Backend trả về mã lỗi `HTTP 422 Unprocessable Entity`: "Email mới không được trùng với email hiện tại."

---

## 11. Business Rules & Non-Functional Requirements
- `BR-008`: Bắt buộc xác thực lại mật khẩu hiện tại cho tác vụ đổi email.
- `BR-010`: Ràng buộc tính duy nhất của email mới.
- `SEC-006`: Cơ chế tái xác thực an toàn (Re-authentication).
- `FR-018`: Yêu cầu chức năng đổi email an toàn.
