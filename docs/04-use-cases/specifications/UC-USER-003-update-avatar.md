# UC-USER-003 [UC-012] — Cập Nhật Ảnh Đại Diện (Update User Avatar)

---

## 1. Overview
Ca sử dụng này cho phép người dùng thay đổi hình ảnh đại diện cá nhân (`avatar_url`) bằng cách cung cấp một URL hình ảnh hợp lệ (hoặc chọn từ danh sách avatar AI có sẵn).

---

## 2. Goal
Cá nhân hóa trải nghiệm thị giác và hình ảnh đại diện của người dùng trên toàn bộ giao diện trò chuyện.

---

## 3. Scope
Hệ thống Website Chatbot Trợ Lý Ảo AI-Chan (Phân hệ Quản Lý Tài Khoản & Hồ Sơ Cá Nhân).

---

## 4. Primary Actor
`ACT-02: Registered User (Người dùng đã đăng nhập)`.

---

## 5. Supporting Actors
- `ai-frontend`: Giao diện xem trước ảnh đại diện (Preview), kiểm tra kích thước và gửi URL.
- `ai-backend`: API endpoint `PATCH /api/v1/users/me/avatar`.
- `Database (SQLite)`: Cập nhật trường `avatar_url` trong bảng `users`.

---

## 6. Trigger
Người dùng dán đường dẫn URL ảnh mới hoặc chọn avatar gợi ý và nhấn "Cập nhật ảnh đại diện".

---

## 7. Preconditions
- Người dùng đã đăng nhập hợp lệ.

---

## 8. Postconditions

### 8.1 Success Postconditions
- Trường `avatar_url` trong bảng `users` được cập nhật đường dẫn mới.
- Ảnh đại diện mới được hiển thị ngay lập tức trên Header, Sidebar và tin nhắn chat của người dùng.

### 8.2 Failure Postconditions
- Avatar cũ được giữ nguyên.
- Hiển thị thông báo định dạng URL không hợp lệ.

---

## 9. Main Success Scenario (Kịch Bản Thành Công Chính)

1. Người dùng vào mục Cập nhật ảnh đại diện.
2. Người dùng nhập URL hình ảnh mới (hoặc chọn avatar mặc định).
3. Client kiểm tra URL hợp lệ (bắt đầu bằng `https://`, độ dài <= 500 ký tự) theo `BR-011`.
4. Client gửi request `PATCH /api/v1/users/me/avatar` kèm body `{"avatar_url": "https://..."}`.
5. Backend xác thực người dùng và kiểm tra schema URL hợp lệ.
6. Backend cập nhật `avatar_url` trong bảng `users` và trường `updated_at`.
7. Backend trả về payload `HTTP 200 OK` chứa `avatar_url` mới.
8. Client cập nhật state đại diện của người dùng và hiển thị thông báo Toast thành công.

---

## 10. Extensions / Alternative Flows (Luồng Rẽ Nhánh & Ngoại Lệ)

- **3a. URL không hợp lệ hoặc không an toàn**:
  1. Backend phát hiện URL không có schema `https://` hoặc độ dài vượt quá 500 ký tự.
  2. Backend trả về `HTTP 422 Unprocessable Entity`: "Đường dẫn ảnh đại diện phải là URL an toàn (HTTPS)."
  3. Client hiển thị thông báo lỗi.
- **2a. Người dùng muốn gỡ ảnh đại diện (xóa avatar)**:
  1. Người dùng chọn nút "Gỡ ảnh đại diện".
  2. Client gửi `{"avatar_url": null}`.
  3. Backend cập nhật trường `avatar_url = NULL`.
  4. Hệ thống tự động chuyển về hiển thị avatar mặc định theo chữ cái đầu của tên người dùng.

---

## 11. Business Rules & Non-Functional Requirements
- `BR-011`: Tiêu chuẩn định dạng và độ an toàn của ảnh đại diện.
- `FR-017`: Yêu cầu cập nhật ảnh đại diện người dùng.
