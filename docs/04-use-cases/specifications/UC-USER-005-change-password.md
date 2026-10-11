# UC-USER-005 [UC-014] — Thay Đổi Mật Khẩu Đăng Nhập (Secure Password Change)

---

## 1. Overview
Ca sử dụng này cho phép người dùng thay đổi mật khẩu đăng nhập của tài khoản. Hệ thống thực hiện quy trình bảo mật nghiêm ngặt: yêu cầu xác thực mật khẩu hiện tại, kiểm tra độ phức tạp của mật khẩu mới, băm mật khẩu bằng thuật toán Bcrypt, cập nhật thời điểm đổi mật khẩu (`password_changed_at`), và cấp phát lại token mới để thu hồi các phiên truy cập cũ.

---

## 2. Goal
Củng cố tính an toàn cho tài khoản, cho phép người dùng định kỳ đổi mật khẩu hoặc bảo vệ tài khoản khi nghi ngờ bị lộ thông tin đăng nhập.

---

## 3. Scope
Hệ thống Website Chatbot Trợ Lý Ảo AI-Chan (Phân hệ Quản Lý Tài Khoản & Bảo Mật).

---

## 4. Primary Actor
`ACT-02: Registered User (Người dùng đã đăng nhập)`.

---

## 5. Supporting Actors
- `ai-frontend`: Form đổi mật khẩu với thước đo độ mạnh mật khẩu (Password Strength Indicator) và kiểm tra trùng khớp.
- `ai-backend`: API endpoint `POST /api/v1/users/me/change-password`.
- `Database (SQLite)`: Cập nhật `hashed_password` và `password_changed_at`.

---

## 6. Trigger
Người dùng điền Mật khẩu hiện tại, Mật khẩu mới, Xác nhận mật khẩu mới và nhấn nút "Cập nhật mật khẩu".

---

## 7. Preconditions
- Người dùng đã đăng nhập hợp lệ.

---

## 8. Postconditions

### 8.1 Success Postconditions
- Giá trị `hashed_password` mới được lưu trữ trong CSDL bằng Bcrypt với muối ngẫu nhiên (`SEC-002`).
- Trường `password_changed_at` được gán bằng thời gian hiện tại (`CURRENT_TIMESTAMP`).
- Cookie `access_token` mới được cấp phát và ghi đè trên trình duyệt.
- Người dùng nhận thông báo thành công: "Đổi mật khẩu thành công."

### 8.2 Failure Postconditions
- Mật khẩu cũ vẫn giữ nguyên hiệu lực.
- Trả về mã lỗi và thông báo chi tiết (sai mật khẩu cũ, mật khẩu mới không đạt chuẩn).

---

## 9. Main Success Scenario (Kịch Bản Thành Công Chính)

1. Người dùng mở Form "Đổi mật khẩu" tại tab Bảo mật.
2. Người dùng nhập:
   - Mật khẩu hiện tại (`current_password`).
   - Mật khẩu mới (`new_password`).
   - Xác nhận mật khẩu mới (`confirm_password`).
3. Client kiểm tra trước:
   - `new_password` và `confirm_password` phải trùng khớp hoàn toàn.
   - `new_password` đáp ứng độ phức tạp: tối thiểu 8 ký tự, có chữ hoa, số và ký tự đặc biệt (`BR-009`).
4. Client gửi request `POST /api/v1/users/me/change-password`.
5. Backend xác thực người dùng qua JWT cookie.
6. Backend truy vấn `hashed_password` hiện tại từ CSDL và so khớp với `current_password` qua `verify_password`.
7. Backend kiểm tra `new_password` không được trùng với mật khẩu hiện tại (`verify_password(new_password, hashed_password) == False`).
8. Backend thực hiện băm mật khẩu mới bằng Bcrypt (`get_password_hash`).
9. Backend cập nhật `hashed_password = :new_hash` và `password_changed_at = CURRENT_TIMESTAMP`.
10. Backend sinh Access Token (JWT) mới với payload cập nhật và thiết lập lại HttpOnly Cookie.
11. Backend trả về `HTTP 200 OK`: "Đổi mật khẩu thành công."
12. Client hiển thị thông báo thành công và xóa trắng các ô nhập mật khẩu.

---

## 10. Extensions / Alternative Flows (Luồng Rẽ Nhánh & Ngoại Lệ)

- **6a. Mật khẩu hiện tại không chính xác**:
  1. Backend so khớp `verify_password(current_password, hashed_password)` trả về False.
  2. Backend trả về mã lỗi `HTTP 401 Unauthorized`: "Mật khẩu hiện tại không chính xác."
  3. Client hiển thị lỗi tại ô Mật khẩu hiện tại.
- **7a. Mật khẩu mới trùng với mật khẩu cũ**:
  1. Backend phát hiện `new_password` giống hệt mật khẩu hiện tại.
  2. Backend trả về `HTTP 422 Unprocessable Entity`: "Mật khẩu mới không được trùng với mật khẩu hiện tại."
- **3a. Mật khẩu mới không đủ độ phức tạp**:
  1. Client hoặc Backend bắt lỗi độ dài < 8 ký tự hoặc thiếu chữ hoa/số/ký tự đặc biệt.
  2. Trả về `HTTP 422 Unprocessable Entity`: "Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ số và ký tự đặc biệt."

---

## 11. Business Rules & Non-Functional Requirements
- `BR-008`: Bắt buộc xác thực mật khẩu hiện tại trước khi đổi mật khẩu.
- `BR-009`: Tiêu chuẩn phức tạp mật khẩu và luân chuyển khóa phiên.
- `SEC-002`: Mã hóa một chiều bằng Bcrypt.
- `SEC-007`: Chính sách thu hồi phiên cũ khi thay đổi mật khẩu.
- `FR-019`: Yêu cầu chức năng thay đổi mật khẩu.
