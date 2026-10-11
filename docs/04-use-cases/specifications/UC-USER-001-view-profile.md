# UC-USER-001 [UC-010] — Xem Thông Tin Hồ Sơ & Thống Kê (View User Profile & Stats)

---

## 1. Overview
Ca sử dụng này cho phép người dùng đã đăng nhập xem toàn bộ thông tin tài khoản cá nhân của mình (họ tên, username, email, ảnh đại diện, tiểu sử, số điện thoại, ngày tham gia, ngày đăng nhập gần nhất) cùng với các chỉ số thống kê hoạt động (tổng số cuộc hội thoại đã tạo, tổng số tin nhắn đã gửi).

---

## 2. Goal
Cung cấp bức tranh toàn cảnh về tài khoản cá nhân và mức độ tương tác của người dùng trong hệ thống AI-Chan.

---

## 3. Scope
Hệ thống Website Chatbot Trợ Lý Ảo AI-Chan (Phân hệ Quản Lý Tài Khoản & Hồ Sơ Cá Nhân).

---

## 4. Primary Actor
`ACT-02: Registered User (Người dùng đã đăng nhập)`.

---

## 5. Supporting Actors
- `ai-frontend`: Giao diện web hiển thị trang Profile / Settings.
- `ai-backend`: API endpoint `GET /api/v1/users/me` xử lý xác thực phiên làm việc và trích xuất dữ liệu.
- `Database (SQLite)`: Lưu trữ bản ghi `users`, `conversations`, `messages`.

---

## 6. Trigger
Người dùng nhấp vào avatar/tên người dùng trên thanh điều hướng hoặc truy cập trang `/settings` / `/profile`.

---

## 7. Preconditions
- Người dùng đã đăng nhập với JWT token hợp lệ trong HttpOnly Cookie (`SEC-004`).
- Trạng thái tài khoản người dùng là `ACTIVE`.

---

## 8. Postconditions

### 8.1 Success Postconditions
- Giao diện hiển thị đầy đủ thông tin hồ sơ và số liệu thống kê sử dụng của người dùng.
- Không để lộ các thông tin nhạy cảm (như `hashed_password`).

### 8.2 Failure Postconditions
- Người dùng bị từ chối truy cập nếu phiên hết hạn và được điều hướng về trang Đăng nhập (`/login`).

---

## 9. Main Success Scenario (Kịch Bản Thành Công Chính)

1. Người dùng điều hướng tới trang Hồ sơ / Cài đặt cá nhân (`/settings` hoặc `/profile`).
2. Client gửi yêu cầu `GET /api/v1/users/me` kèm thông tin xác thực phiên (Cookie).
3. Backend giải mã JWT token, trích xuất `user_id`.
4. Backend truy vấn bản ghi người dùng từ bảng `users`.
5. Backend tính toán các chỉ số thống kê:
   - `total_conversations`: Đếm số cuộc trò chuyện thuộc sở hữu của `user_id`.
   - `total_messages`: Đếm số tin nhắn của người dùng trong các cuộc trò chuyện.
6. Backend trả về payload `HTTP 200 OK` chứa đối tượng `user` và `stats`.
7. Client hiển thị thông tin hồ sơ và thẻ thống kê trực quan.

---

## 10. Extensions / Alternative Flows (Luồng Rẽ Nhánh & Ngoại Lệ)

- **3a. Phiên đăng nhập hết hạn hoặc không hợp lệ**:
  1. Backend phát hiện JWT token không hợp lệ hoặc đã quá hạn.
  2. Backend trả về mã lỗi `HTTP 401 Unauthorized`.
  3. Client xóa trạng thái người dùng trong state và chuyển hướng về `/login`.
- **4a. Tài khoản bị vô hiệu hóa hoặc bị khóa (`DISABLED` / `DELETED`)**:
  1. Backend kiểm tra `status != 'ACTIVE'`.
  2. Backend trả về `HTTP 403 Forbidden`: "Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động."
  3. Client hiển thị thông báo lỗi và đăng xuất người dùng.

---

## 11. Business Rules & Non-Functional Requirements
- `BR-001`: Bắt buộc xác thực hợp lệ để truy xuất thông tin tài khoản.
- `NFR-001`: Thời gian phản hồi API thông tin hồ sơ dưới 200ms.
- `SEC-004`: Bảo vệ phiên làm việc bằng HttpOnly Cookie.
