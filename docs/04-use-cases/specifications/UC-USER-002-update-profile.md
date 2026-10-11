# UC-USER-002 [UC-011] — Cập Nhật Thông Tin Hồ Sơ Cá Nhân (Update Profile Information)

---

## 1. Overview
Ca sử dụng này cho phép người dùng đã xác thực cập nhật các thông tin định danh cá nhân thông thường bao gồm: Họ và tên (`full_name`), Tên người dùng định danh (`username`), Tiểu sử (`bio`), và Số điện thoại liên hệ (`phone_number`).

---

## 2. Goal
Tùy biến và chuẩn hóa thông tin cá nhân của người dùng trên hệ thống, cho phép thiết lập username duy nhất.

---

## 3. Scope
Hệ thống Website Chatbot Trợ Lý Ảo AI-Chan (Phân hệ Quản Lý Tài Khoản & Hồ Sơ Cá Nhân).

---

## 4. Primary Actor
`ACT-02: Registered User (Người dùng đã đăng nhập)`.

---

## 5. Supporting Actors
- `ai-frontend`: Giao diện form chỉnh sửa thông tin hồ sơ và validate định dạng client.
- `ai-backend`: API endpoint `PATCH /api/v1/users/me/profile`.
- `Database (SQLite)`: Lưu trữ và ràng buộc tính duy nhất của trường `username`.

---

## 6. Trigger
Người dùng điền thông tin mới vào biểu mẫu "Thông tin cá nhân" và nhấn nút "Lưu thay đổi".

---

## 7. Preconditions
- Người dùng đã đăng nhập hợp lệ (`ACTIVE`).
- Đang mở tab "Thông tin cá nhân" trên giao diện Cài đặt.

---

## 8. Postconditions

### 8.1 Success Postconditions
- Bản ghi `users` được cập nhật với các giá trị mới (`full_name`, `username`, `bio`, `phone_number`, `updated_at`).
- Dữ liệu hiển thị trên thanh điều hướng và avatar/tên người dùng được đồng bộ ngay lập tức.
- Người dùng nhận thông báo Toast: "Cập nhật hồ sơ thành công."

### 8.2 Failure Postconditions
- Dữ liệu cũ trong CSDL được giữ nguyên không thay đổi.
- Hiển thị thông báo lỗi cụ thể bên dưới trường nhập liệu tương ứng.

---

## 9. Main Success Scenario (Kịch Bản Thành Công Chính)

1. Người dùng cập nhật các trường: `full_name`, `username`, `bio`, `phone_number`.
2. Người dùng nhấn nút "Lưu thay đổi".
3. Client thực hiện kiểm tra sơ bộ định dạng (Client-side validation):
   - `full_name`: 1 - 255 ký tự.
   - `username`: 3 - 30 ký tự, định dạng `^[a-zA-Z0-9][a-zA-Z0-9_-]{1,28}[a-zA-Z0-9]$` (`BR-007`).
   - `bio`: tối đa 500 ký tự.
4. Client gửi request `PATCH /api/v1/users/me/profile` kèm payload JSON.
5. Backend xác thực người dùng qua Cookie JWT.
6. Backend kiểm tra tính hợp lệ của dữ liệu đầu vào (Pydantic schema).
7. Nếu có thay đổi `username`: Backend kiểm tra tính duy nhất trong bảng `users` (`WHERE username = :new_username COLLATE NOCASE AND id != :user_id`).
8. Backend cập nhật bản ghi trong bảng `users`.
9. Backend trả về payload `HTTP 200 OK` chứa thông tin profile mới cập nhật.
10. Client cập nhật state cục bộ và hiển thị thông báo thành công.

---

## 10. Extensions / Alternative Flows (Luồng Rẽ Nhánh & Ngoại Lệ)

- **7a. Username đã tồn tại trong hệ thống**:
  1. Backend phát hiện trùng lặp username với một tài khoản khác.
  2. Backend trả về mã lỗi `HTTP 409 Conflict`: "Tên đăng nhập này đã có người sử dụng. Vui lòng chọn tên khác."
  3. Client làm nổi bật ô nhập Username và hiển thị thông báo lỗi.
- **6a. Dữ liệu vi phạm ràng buộc định dạng**:
  1. Backend phát hiện trường dữ liệu không hợp lệ (ví dụ username chứa ký tự đặc biệt bị cấm).
  2. Backend trả về mã lỗi `HTTP 422 Unprocessable Entity`.
  3. Client hiển thị thông báo lỗi cụ thể cho người dùng điều chỉnh.

---

## 11. Business Rules & Non-Functional Requirements
- `BR-007`: Ràng buộc định dạng và tính duy nhất của Username.
- `FR-016`: Yêu cầu chức năng cập nhật thông tin hồ sơ.
