# UC-CONV-004 [UC-007] — Xóa Cuộc Trò Chuyện (Delete Conversation)

---

## 1. Overview
Ca sử dụng này cho phép người dùng đã xác thực xóa vĩnh viễn một cuộc trò chuyện không còn nhu cầu sử dụng cùng toàn bộ các tin nhắn bên trong nhằm giải phóng không gian Sidebar và bảo đảm tính riêng tư.

---

## 2. Goal
Xóa bỏ hoàn toàn một cuộc trò chuyện thuộc sở hữu của người dùng khỏi hệ thống một cách an toàn và có kiểm soát.

---

## 3. Scope
Hệ thống Website Chatbot Trợ Lý Ảo AI-Chan (Phân hệ Quản lý Cuộc trò chuyện).

---

## 4. Primary Actor
`ACT-02: User (Người dùng đã xác thực)`.

---

## 5. Supporting Actors
- `ai-frontend`: Hiển thị hộp thoại xác nhận cảnh báo và dọn dẹp giao diện sau khi xóa.
- `ai-backend`: Xác thực quyền sở hữu (`BR-002`) và thực thi xóa bản ghi trong cơ sở dữ liệu.
- `PostgreSQL 16`: Xóa cuộc trò chuyện và cascade xóa toàn bộ các tin nhắn liên quan.

---

## 6. Trigger
Người dùng nhấn vào biểu tượng "Xóa" (thùng rác) bên cạnh một mục cuộc trò chuyện trên Sidebar.

---

## 7. Preconditions
- Người dùng đang duy trì phiên đăng nhập hợp lệ (`UC-AUTH-002`).
- Cuộc trò chuyện cần xóa phải tồn tại và thuộc sở hữu của chính người dùng (`BR-002`).

---

## 8. Postconditions

### 8.1 Success Postconditions
- Bản ghi cuộc trò chuyện và toàn bộ các tin nhắn liên quan bị xóa hoàn toàn khỏi cơ sở dữ liệu (`Hard Delete` theo quyết định MVP).
- Mục cuộc trò chuyện bị xóa lập tức biến mất khỏi danh sách Sidebar.
- Nếu cuộc trò chuyện bị xóa đang mở trên màn hình chính: Khung chat được chuyển sang cuộc trò chuyện gần nhất hoặc trở về màn hình chào mừng trống.

### 8.2 Failure Postconditions
- Dữ liệu cuộc trò chuyện và tin nhắn vẫn được bảo toàn nguyên vẹn.

---

## 9. Main Success Scenario (Kịch Bản Thành Công Chính)

1. Người dùng di chuột tới mục cuộc trò chuyện trên Sidebar và nhấn biểu tượng "Xóa".
2. Hệ thống hiển thị hộp thoại xác nhận nguy hiểm: *"Bạn có chắc chắn muốn xóa cuộc trò chuyện này không? Thao tác này không thể hoàn tác."*.
3. Người dùng nhấn nút "Xác nhận xóa".
4. Hệ thống máy khách gửi yêu cầu xóa cuộc trò chuyện lên máy chủ.
5. Máy chủ xác thực quyền sở hữu cuộc trò chuyện của người dùng hiện tại (`BR-002`).
6. Máy chủ thực thi lệnh xóa cuộc trò chuyện và các tin nhắn liên quan trong cơ sở dữ liệu.
7. Máy chủ phản hồi trạng thái thành công `HTTP 200 OK` (hoặc `HTTP 204 No Content`).
8. Giao diện máy khách loại bỏ cuộc trò chuyện khỏi Sidebar.
9. Giao diện điều hướng màn hình chính sang cuộc trò chuyện kế tiếp hoặc làm sạch khung chat.

---

## 10. Alternative Flows (Các Luồng Rẽ Nhánh Thay Thế)

- **A1 — Người Dùng Hủy Thao Tác Xóa**:
  - Tại bước 3, người dùng nhấn nút "Hủy bỏ" hoặc click ra ngoài hộp thoại.
  - Hộp thoại đóng lại. Hệ thống không gửi yêu cầu nào lên máy chủ.
  - Toàn bộ dữ liệu cuộc trò chuyện và giao diện được giữ nguyên trạng.

---

## 11. Exception Flows (Các Luồng Xử Lý Ngoại Lệ)

- **E1 — Cố Tình Xóa Cuộc Trò Chuyện Của Người Khác (Anti-IDOR - BR-002)**:
  - Máy chủ phát hiện người gửi yêu cầu không phải chủ sở hữu của `conversation_id`.
  - Máy chủ từ chối yêu cầu với mã lỗi `HTTP 404 Not Found` (hoặc `HTTP 403 Forbidden`) và ghi nhật ký cảnh báo an ninh.
  - Giao diện báo lỗi: *"Không tìm thấy cuộc trò chuyện hoặc bạn không có quyền xóa."*.

---

## 12. Business Rules (Quy Tắc Nghiệp Vụ Áp Dụng)
- `BR-001`: Yêu cầu phiên đăng nhập hợp lệ.
- `BR-002`: Cách ly tuyệt đối quyền sở hữu dữ liệu; nghiêm cấm xóa chéo giữa các tài khoản.

---

## 13. Requirements (Yêu Cầu Nghiệp Vụ Đáp Ứng)
- `FR-007`: Hệ thống cho phép người dùng xóa cuộc trò chuyện và toàn bộ các tin nhắn liên quan.
- `NFR-018`: Bảo vệ dữ liệu cá nhân và chống lỗ hổng IDOR.

---

## 14. Acceptance Criteria (Tiêu Chí Chấp Nhận)
- Đáp ứng kịch bản kiểm thử trong `AC-003` (Kịch bản 2.4A, 2.4B tại [acceptance-criteria.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/acceptance-criteria.md)).

---

## 15. Dependencies (Phụ Thuộc Nghiệp Vụ)
- Phụ thuộc vào `UC-CONV-001 [UC-004]`.

---

## 16. Assumptions (Giả Định)
- Việc xóa cuộc trò chuyện là vĩnh viễn trong phiên bản MVP Release 1.0 (chưa hỗ trợ Thùng rác phục hồi).

---

## 17. Open Questions (Vấn Đề Chờ Quyết Định)
- `OQ-UC-04`: Tính năng Soft Delete và Khôi phục cuộc trò chuyện sẽ được xem xét cho các bản cập nhật lớn tiếp theo.

---

## 18. Notes
- Bắt buộc phải có hộp thoại xác nhận người dùng để tránh việc xóa nhầm dữ liệu quan trọng do vô tình click chuột.
