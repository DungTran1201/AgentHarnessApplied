# UC-USER-006 [UC-015] — Tùy Chọn Cài Đặt Giao Diện & Ngôn Ngữ (Update User Preferences)

---

## 1. Overview
Ca sử dụng này cho phép người dùng cấu hình các tùy chọn trải nghiệm cá nhân hóa gồm: Chủ đề giao diện (`theme_preference`: DARK, LIGHT, SYSTEM) và Ngôn ngữ giao diện (`language_preference`: vi, en). Các cài đặt này được lưu trên máy chủ để đảm bảo tính nhất quán giữa các thiết bị đăng nhập của người dùng.

---

## 2. Goal
Cá nhân hóa giao diện và nâng cao sự thoải mái của người dùng khi sử dụng website trên nhiều thiết bị khác nhau.

---

## 3. Scope
Hệ thống Website Chatbot Trợ Lý Ảo AI-Chan (Phân hệ Quản Lý Tài Khoản & Trải Nghiệm Người Dùng).

---

## 4. Primary Actor
`ACT-02: Registered User (Người dùng đã đăng nhập)`.

---

## 5. Supporting Actors
- `ai-frontend`: Giao diện tab Tùy chọn cài đặt (Preferences), chuyển đổi theme động và i18n locale.
- `ai-backend`: API endpoint `PATCH /api/v1/users/me/preferences`.
- `Database (SQLite)`: Lưu trữ các trường `theme_preference` và `language_preference` trong bảng `users`.

---

## 6. Trigger
Người dùng chọn chế độ Theme hoặc Ngôn ngữ mong muốn trong tab Cài đặt tùy chọn.

---

## 7. Preconditions
- Người dùng đã đăng nhập hợp lệ.

---

## 8. Postconditions

### 8.1 Success Postconditions
- Cấu hình mới được lưu vào bản ghi `users` trong cơ sở dữ liệu.
- Giao diện web áp dụng ngay lập tức Theme (Dark / Light) hoặc Ngôn ngữ mới mà không cần tải lại toàn bộ trang.

### 8.2 Failure Postconditions
- Giữ nguyên cấu hình cũ.

---

## 9. Main Success Scenario (Kịch Bản Thành Công Chính)

1. Người dùng mở tab "Tùy chọn hiển thị" trong Cài đặt.
2. Người dùng chọn:
   - Chế độ hiển thị: Dark Mode, Light Mode, hoặc Tự động theo Hệ điều hành (System).
   - Ngôn ngữ giao diện: Tiếng Việt (`vi`) hoặc Tiếng Anh (`en`).
3. Client gửi request `PATCH /api/v1/users/me/preferences` kèm JSON:
   ```json
   {
     "theme_preference": "DARK",
     "language_preference": "vi"
   }
   ```
4. Backend xác thực người dùng qua JWT.
5. Backend kiểm tra giá trị hợp lệ theo danh sách Whitelist cho phép.
6. Backend cập nhật `theme_preference` và `language_preference` trong bảng `users`.
7. Backend trả về `HTTP 200 OK` chứa các thông số tùy chọn mới.
8. Client lưu cấu hình vào state và áp dụng class tương ứng (ví dụ: `document.documentElement.classList.toggle('dark')`).
9. Client hiển thị thông báo Toast nhẹ xác nhận đã lưu cấu hình.

---

## 10. Extensions / Alternative Flows (Luồng Rẽ Nhánh & Ngoại Lệ)

- **5a. Giá trị tùy chọn không hợp lệ**:
  1. Backend phát hiện giá trị gửi lên không thuộc danh sách (`DARK`, `LIGHT`, `SYSTEM` hoặc `vi`, `en`).
  2. Backend trả về `HTTP 422 Unprocessable Entity`: "Giá trị tùy chọn không hợp lệ."
  3. Client giữ nguyên giao diện hiện hành.

---

## 11. Business Rules & Non-Functional Requirements
- `FR-020`: Yêu cầu cập nhật tùy chọn người dùng.
- `UX-001`: Thiết kế giao diện thân thiện, hỗ trợ tối ưu chế độ nền tối (Dark mode).
