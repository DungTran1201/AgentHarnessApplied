# UC-AUTH-001 [UC-001] — Đăng Ký Tài Khoản Mới (User Registration)

---

## 1. Overview
Ca sử dụng này cho phép một người dùng chưa có tài khoản (Khách vãng lai) tạo một tài khoản người dùng cá nhân mới trong hệ thống AI-Chan bằng cách cung cấp thông tin định danh bao gồm họ tên, địa chỉ email và mật khẩu an toàn.

---

## 2. Goal
Mở một tài khoản cá nhân hợp lệ để người dùng có thể đăng nhập và sử dụng đầy đủ các tiện ích lưu trữ cuộc trò chuyện và tương tác với Trợ lý ảo AI.

---

## 3. Scope
Hệ thống Website Chatbot Trợ Lý Ảo AI-Chan (Phân hệ Xác thực & Quản lý Danh tính).

---

## 4. Primary Actor
`ACT-01: Guest (Khách vãng lai / Người dùng chưa xác thực)`.

---

## 5. Supporting Actors
- `ai-frontend`: Giao diện web tiếp nhận form đăng ký và kiểm tra tính hợp lệ ban đầu.
- `ai-backend`: Dịch vụ máy chủ xử lý thẩm định dữ liệu, kiểm tra tính duy nhất của email và mã hóa băm mật khẩu.
- `PostgreSQL 16`: Cơ sở dữ liệu lưu trữ bền vững thông tin tài khoản.

---

## 6. Trigger
Khách vãng lai điền thông tin và nhấn nút "Đăng ký" (hoặc "Đăng ký tài khoản") trên trang `/register`.

---

## 7. Preconditions
- Người dùng đã truy cập thành công vào website thông qua kết nối bảo mật HTTPS.
- Người dùng hiện tại chưa đăng nhập vào bất kỳ tài khoản nào.

---

## 8. Postconditions

### 8.1 Success Postconditions
- Bản ghi tài khoản người dùng mới được tạo lập trong cơ sở dữ liệu với trạng thái `ACTIVE`.
- Mật khẩu được mã hóa băm một chiều an toàn bằng thuật toán `bcrypt` (`SEC-002`).
- Người dùng nhận được thông báo thành công và được tự động điều hướng sang trang Đăng nhập (`/login`).

### 8.2 Failure Postconditions
- Không có bản ghi nào được tạo hoặc thay đổi trong cơ sở dữ liệu.
- Người dùng nhận được thông báo lỗi cụ thể để điều chỉnh thông tin đầu vào.

---

## 9. Main Success Scenario (Kịch Bản Thành Công Chính)

1. Người dùng truy cập trang Đăng ký (`/register`).
2. Hệ thống hiển thị biểu mẫu đăng ký bao gồm các trường: Họ và tên, Email, Mật khẩu.
3. Người dùng nhập đầy đủ thông tin:
   - Họ và tên: chuỗi ký tự hợp lệ.
   - Email: địa chỉ email chưa từng đăng ký trong hệ thống.
   - Mật khẩu: độ dài tối thiểu từ 6 ký tự trở lên.
4. Người dùng nhấn nút "Đăng ký tài khoản".
5. Hệ thống kiểm tra tính hợp lệ sơ bộ của dữ liệu tại máy khách (Email đúng định dạng RFC, mật khẩu >= 6 ký tự).
6. Hệ thống gửi yêu cầu đăng ký lên máy chủ xử lý.
7. Hệ thống kiểm tra giới hạn tần suất yêu cầu (`BR-006` / `BP-SEC-001`).
8. Hệ thống xác nhận địa chỉ email chưa từng tồn tại trong cơ sở dữ liệu.
9. Hệ thống thực hiện băm mật khẩu an toàn bằng thuật toán `bcrypt`.
10. Hệ thống lưu trữ bản ghi tài khoản mới vào cơ sở dữ liệu với trạng thái hoạt động (`ACTIVE`).
11. Hệ thống hiển thị thông báo "Đăng ký thành công!" và tự động chuyển hướng người dùng sang trang Đăng nhập (`/login`).

---

## 10. Alternative Flows (Các Luồng Rẽ Nhánh Thay Thế)

- **A1 — Email Đã Được Đăng Ký Trước Đó**:
  - Tại bước 8, hệ thống phát hiện địa chỉ email đã tồn tại trong cơ sở dữ liệu.
  - Hệ thống dừng tiến trình tạo tài khoản.
  - Hệ thống hiển thị thông báo lỗi: *"Email đã được đăng ký trong hệ thống."* ngay bên dưới ô nhập email.
  - Người dùng giữ nguyên thông tin để nhập lại email khác hoặc chuyển sang trang Đăng nhập.
- **A2 — Dữ Liệu Đầu Vào Không Thỏa Mãn Ràng Buộc Form**:
  - Tại bước 5, người dùng để trống trường bắt buộc, nhập email sai định dạng, hoặc mật khẩu ngắn hơn 6 ký tự.
  - Hệ thống highlight ô nhập liệu vi phạm kèm thông điệp hướng dẫn cụ thể (ví dụ: *"Mật khẩu phải chứa ít nhất 6 ký tự"*).
  - Hệ thống không gửi yêu cầu lên máy chủ cho đến khi người dùng sửa đúng.

---

## 11. Exception Flows (Các Luồng Xử Lý Ngoại Lệ)

- **E1 — Vượt Quá Tần Suất Cho Phép (Rate Limit Tripped - BR-006)**:
  - Tại bước 7, máy chủ phát hiện địa chỉ IP của người dùng gửi quá 10 req/s hoặc 60 req/phút.
  - Hệ thống chặn đứng yêu cầu và phản hồi mã lỗi `HTTP 429 Too Many Requests`.
  - Giao diện hiển thị thông báo: *"Bạn đang thao tác quá nhanh. Vui lòng đợi trong giây lát trước khi thử lại."*.
- **E2 — Mất Kết Nối Máy Chủ / Cơ Sở Dữ Liệu**:
  - Tại bước 10, hệ thống không thể kết nối tới cơ sở dữ liệu PostgreSQL.
  - Hệ thống rollback transaction và trả về lỗi máy chủ nội bộ.
  - Giao diện hiển thị thông báo: *"Hệ thống tạm thời gặp sự cố kết nối. Vui lòng thử lại sau ít phút."*.

---

## 12. Business Rules (Quy Tắc Nghiệp Vụ Áp Dụng)
- `BR-001`: Bắt buộc phải có tài khoản đăng ký để được phép lưu trữ phiên hội thoại trên máy chủ.
- `BR-006`: Chính sách giới hạn tần suất yêu cầu chống lạm dụng đăng ký tự động.

---

## 13. Requirements (Yêu Cầu Nghiệp Vụ Đáp Ứng)
- `FR-001`: Hệ thống cho phép người dùng đăng ký tài khoản mới với họ tên, email và mật khẩu.
- `SEC-002`: Mật khẩu người dùng bắt buộc phải được băm an toàn bằng bcrypt trước khi lưu trữ.
- `NFR-001`, `NFR-005`, `NFR-012`: Khả năng sử dụng, bảo mật và tính toàn vẹn dữ liệu.

---

## 14. Acceptance Criteria (Tiêu Chí Chấp Nhận)
- Đáp ứng đầy đủ các kịch bản kiểm thử trong `AC-001` (Kịch bản 1.1A, 1.1B, 1.1C tại [acceptance-criteria.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/acceptance-criteria.md)).

---

## 15. Dependencies (Phụ Thuộc Nghiệp Vụ)
- Là điều kiện tiên quyết bắt buộc của `UC-AUTH-002 [UC-002]` (Đăng Nhập Hệ Thống).

---

## 16. Assumptions (Giả Định)
- `ASM-BP-03`: Tại phiên bản MVP 1.0, không bắt buộc quy trình xác minh email qua link kích hoạt/OTP để tinh gọn trải nghiệm tiếp cận.

---

## 17. Open Questions (Vấn Đề Chờ Quyết Định)
- Không có câu hỏi tồn đọng cho ca sử dụng này tại phiên bản Release 1.0.

---

## 18. Notes
- Không cho phép tự động đăng nhập ngay sau khi đăng ký tại MVP để bảo đảm tính rõ ràng của luồng xác thực và phân định ranh giới phiên làm việc.
