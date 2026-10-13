# UC-AUTH-002 [UC-002] — Đăng Nhập Hệ Thống (User Login)

---

## 1. Overview
Ca sử dụng này cho phép người dùng đã có tài khoản xác thực danh tính cá nhân bằng cách cung cấp địa chỉ email và mật khẩu. Sau khi xác thực thành công, hệ thống phát hành mã thông báo phiên làm việc an toàn (JWT Token) được lưu trữ trong Cookie nhằm cấp quyền truy cập vào các tính năng đàm thoại và quản lý cuộc trò chuyện.

---

## 2. Goal
Xác thực danh tính người dùng và thiết lập phiên làm việc bảo mật để người dùng có thể truy cập không gian làm việc chính (`/chat`) của trợ lý ảo.

---

## 3. Scope
Hệ thống Website Chatbot Trợ Lý Ảo AI-Chan (Phân hệ Xác thực & Quản lý Phiên).

---

## 4. Primary Actor
`ACT-01: Guest` (Khách vãng lai sở hữu tài khoản) chuyển đổi thành `ACT-02: User` (Người dùng đã xác thực).

---

## 5. Supporting Actors
- `ai-frontend`: Tiếp nhận thông tin đăng nhập, lưu trữ thông tin hồ sơ và điều hướng màn hình.
- `ai-backend`: Xác thực thông tin, đối chiếu mật khẩu băm, ký mã JWT và thiết lập Cookie phản hồi.
- `PostgreSQL 16`: Tra cứu thông tin người dùng.

---

## 6. Trigger
Người dùng điền thông tin và nhấn nút "Đăng nhập" trên trang `/login`.

---

## 7. Preconditions
- Người dùng đã có tài khoản được tạo lập trước đó trong hệ thống (`UC-AUTH-001`).
- Tài khoản người dùng đang ở trạng thái hoạt động (`ACTIVE`).
- Trình duyệt của người dùng cho phép lưu trữ Cookie (`ASM-UC-01`).

---

## 8. Postconditions

### 8.1 Success Postconditions
- Phiên làm việc được thiết lập thành công.
- Trình duyệt nhận được Cookie an toàn chứa JWT Access Token với thời hạn 7 ngày (`NFR-006`), kèm các cờ bảo vệ: `HttpOnly`, `SameSite=Lax`, `Secure` (`SEC-004`).
- Người dùng chuyển sang vai trò `ACT-02` và được chuyển hướng tới trang đàm thoại chính (`/chat`).

### 8.2 Failure Postconditions
- Không phát hành Cookie phiên; trạng thái người dùng vẫn là `ACT-01: Guest`.
- Người dùng nhận được thông báo lỗi xác thực và được yêu cầu thử lại.

---

## 9. Main Success Scenario (Kịch Bản Thành Công Chính)

1. Người dùng truy cập trang Đăng nhập (`/login`).
2. Hệ thống hiển thị biểu mẫu đăng nhập gồm: Email và Mật khẩu.
3. Người dùng nhập địa chỉ email và mật khẩu của tài khoản cá nhân.
4. Người dùng nhấn nút "Đăng nhập".
5. Hệ thống gửi yêu cầu xác thực đăng nhập lên máy chủ.
6. Hệ thống kiểm tra giới hạn tần suất yêu cầu (`BR-006`).
7. Hệ thống tra cứu bản ghi tài khoản người dùng theo email trong cơ sở dữ liệu.
8. Hệ thống đối chiếu mật khẩu gửi lên với mật khẩu băm đã lưu bằng thuật toán `bcrypt`.
9. Hệ thống xác nhận tài khoản đang ở trạng thái hoạt động (`ACTIVE`).
10. Hệ thống tạo mã phiên làm việc JWT có thời hạn 7 ngày chứa định danh `user_id`.
11. Hệ thống đính kèm JWT vào Cookie phản hồi với các cờ bảo mật `HttpOnly`, `SameSite=Lax`, `Secure`.
12. Hệ thống trả về thông tin hồ sơ người dùng cơ bản (Họ tên, Email).
13. Hệ thống cập nhật trạng thái đăng nhập trên giao diện và điều hướng người dùng vào trang làm việc chính (`/chat`).

---

## 10. Alternative Flows (Các Luồng Rẽ Nhánh Thay Thế)

- **A1 — Sai Địa Chỉ Email Hoặc Mật Khẩu**:
  - Tại bước 7 hoặc bước 8, hệ thống không tìm thấy email HOẶC mật khẩu không khớp với chuỗi băm.
  - Hệ thống từ chối đăng nhập với mã lỗi `HTTP 401 Unauthorized`.
  - Hệ thống hiển thị thông báo lỗi trung tính: *"Email hoặc mật khẩu không chính xác."* (ngăn ngừa kỹ thuật dò quét tài khoản).
  - Người dùng giữ nguyên email và có thể nhập lại mật khẩu.
- **A2 — Tài Khoản Bị Vô Hiệu Hóa (Account Disabled)**:
  - Tại bước 9, thông tin đăng nhập chính xác nhưng trạng thái tài khoản là `DISABLED`.
  - Hệ thống từ chối đăng nhập với mã lỗi `HTTP 403 Forbidden`.
  - Hệ thống hiển thị thông báo: *"Tài khoản hiện đang bị tạm khóa. Vui lòng liên hệ quản trị viên."*.

---

## 11. Exception Flows (Các Luồng Xử Lý Ngoại Lệ)

- **E1 — Vượt Quá Tần Suất Đăng Nhập (Brute-force / Rate Limit Tripped - BR-006)**:
  - Tại bước 6, địa chỉ IP gửi quá nhiều yêu cầu đăng nhập trong khoảng thời gian ngắn.
  - Hệ thống chặn đứng yêu cầu và phản hồi mã `HTTP 429 Too Many Requests`.
  - Giao diện hiển thị cảnh báo: *"Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau 60 giây."*.

---

## 12. Business Rules (Quy Tắc Nghiệp Vụ Áp Dụng)
- `BR-001`: Đăng nhập thành công là điều kiện tiên quyết để được cấp quyền khởi tạo và lưu trữ hội thoại.
- `BR-006`: Chính sách kiểm soát tần suất bảo vệ chống tấn công dò mật khẩu.

---

## 13. Requirements (Yêu Cầu Nghiệp Vụ Đáp Ứng)
- `FR-002`: Hệ thống cho phép người dùng đăng nhập bằng email và mật khẩu để nhận JWT token.
- `SEC-004`: Mã JWT bắt buộc phải được lưu trữ trong HttpOnly Secure Cookie để chống tấn công XSS.
- `NFR-002`, `NFR-006`: Hiệu năng xác thực và thời hạn phiên 7 ngày.

---

## 14. Acceptance Criteria (Tiêu Chí Chấp Nhận)
- Đáp ứng đầy đủ các kịch bản kiểm thử trong `AC-002` (Kịch bản 1.2A, 1.2B, 1.2C tại [acceptance-criteria.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/acceptance-criteria.md)).

---

## 15. Dependencies (Phụ Thuộc Nghiệp Vụ)
- Phụ thuộc vào `UC-AUTH-001 [UC-001]` (Tài khoản phải tồn tại trước).
- Là điều kiện tiên quyết kích hoạt toàn bộ các Ca sử dụng trong phân hệ Hội thoại (`UC-CONV-001..004`) và Đàm thoại (`UC-CHAT-001..002`).

---

## 16. Assumptions (Giả Định)
- `ASM-UC-01`: Trình duyệt hỗ trợ đầy đủ tiêu chuẩn Cookie bảo mật.

---

## 17. Open Questions (Vấn Đề Chờ Quyết Định)
- Không có câu hỏi tồn đọng cho Release 1.0.

---

## 18. Notes
- Không trả Access Token về trong body JSON để tránh việc lưu trữ không an toàn trong `localStorage` phía trình duyệt.
