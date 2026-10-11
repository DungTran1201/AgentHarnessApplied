# UC-AUTH-003 [UC-003] — Đăng Xuất Khỏi Hệ Thống (User Logout)

---

## 1. Overview
Ca sử dụng này cho phép người dùng đang đăng nhập chủ động chấm dứt phiên làm việc hiện tại, xóa bỏ Cookie xác thực trên trình duyệt và chuyển hướng về giao diện Đăng nhập, nhằm bảo vệ dữ liệu cá nhân khi rời khỏi thiết bị.

---

## 2. Goal
Thu hồi phiên làm việc của người dùng hiện tại một cách an toàn và ngăn chặn các hành vi truy cập trái phép tiếp theo từ trình duyệt này.

---

## 3. Scope
Hệ thống Website Chatbot Trợ Lý Ảo AI-Chan (Phân hệ Xác thực & Quản lý Phiên).

---

## 4. Primary Actor
`ACT-02: User (Người dùng đã xác thực)`.

---

## 5. Supporting Actors
- `ai-frontend`: Gửi yêu cầu đăng xuất, giải phóng bộ nhớ trạng thái người dùng tại máy khách và chuyển hướng trang.
- `ai-backend`: Phát hành tiêu đề ghi đè để xóa Cookie phiên.

---

## 6. Trigger
Người dùng nhấn nút "Đăng xuất" tại menu hồ sơ hoặc trên thanh điều hướng.

---

## 7. Preconditions
- Người dùng đang duy trì phiên làm việc hợp lệ trong hệ thống.

---

## 8. Postconditions

### 8.1 Success Postconditions
- Cookie `access_token` được xóa bỏ hoàn toàn khỏi trình duyệt (`Max-Age=0`).
- Toàn bộ dữ liệu phiên và bộ nhớ đệm trạng thái người dùng tại máy khách bị giải phóng.
- Người dùng chuyển sang vai trò `ACT-01: Guest` và được chuyển hướng về trang `/login`.

### 8.2 Failure Postconditions
- Dù có lỗi mạng xảy ra hay không, máy khách vẫn chủ động dọn dẹp trạng thái cục bộ để bảo đảm an toàn tối đa cho người dùng.

---

## 9. Main Success Scenario (Kịch Bản Thành Công Chính)

1. Người dùng nhấn nút "Đăng xuất" tại menu điều hướng.
2. Hệ thống gửi yêu cầu đăng xuất lên máy chủ.
3. Máy chủ thiết lập tiêu đề phản hồi xóa Cookie (`Set-Cookie: access_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`).
4. Máy chủ phản hồi trạng thái thành công `HTTP 200 OK`.
5. Hệ thống máy khách giải phóng toàn bộ dữ liệu trạng thái người dùng và bộ nhớ đệm tin nhắn.
6. Hệ thống chuyển hướng trình duyệt của người dùng về trang Đăng nhập (`/login`).

---

## 10. Alternative Flows (Các Luồng Rẽ Nhánh Thay Thế)
- **A1 — Đăng Xuất Khi Phiên Đã Hết Hạn Tự Nhiên**:
  - Tại bước 2, nếu mã phiên trong Cookie đã quá hạn 7 ngày, máy chủ vẫn thực hiện lệnh xóa Cookie (`Tính chất Idempotent - Bất biến`) và trả về `HTTP 200 OK`. Tiến trình hoàn tất bình thường.

---

## 11. Exception Flows (Các Luồng Xử Lý Ngoại Lệ)
- **E1 — Mất Kết Nối Mạng Khi Đăng Xuất**:
  - Giao diện Client phát hiện không thể kết nối tới máy chủ.
  - Client vẫn tự động xóa toàn bộ trạng thái trong bộ nhớ ứng dụng và chuyển hướng người dùng về `/login`.

---

## 12. Business Rules (Quy Tắc Nghiệp Vụ Áp Dụng)
- `BR-001`: Sau khi đăng xuất, người dùng trở về trạng thái Guest và không thể tiếp tục thực hiện các thao tác hội thoại hay đàm thoại.

---

## 13. Requirements (Yêu Cầu Nghiệp Vụ Đáp Ứng)
- `FR-003`: Hệ thống cho phép người dùng đăng xuất để thu hồi token và kết thúc phiên làm việc.
- `SEC-004`: Thu hồi an toàn Cookie phiên làm việc.

---

## 14. Acceptance Criteria (Tiêu Chí Chấp Nhận)
- Đáp ứng kịch bản kiểm thử trong `AC-002` (Kịch bản 1.3A tại [acceptance-criteria.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/acceptance-criteria.md)).

---

## 15. Dependencies (Phụ Thuộc Nghiệp Vụ)
- Phụ thuộc vào `UC-AUTH-002 [UC-002]` (Phải đăng nhập trước thì mới có thể đăng xuất).

---

## 16. Assumptions (Giả Định)
- `ASM-BP-02`: Tại MVP, việc đăng xuất chỉ xóa Cookie trên trình duyệt hiện tại; các phiên trên thiết bị khác (nếu có) không bị hủy tập trung.

---

## 17. Open Questions (Vấn Đề Chờ Quyết Định)
- Không có câu hỏi tồn đọng cho Release 1.0.

---

## 18. Notes
- Thao tác đăng xuất không xóa bất kỳ dữ liệu cuộc trò chuyện nào của người dùng trong cơ sở dữ liệu.
