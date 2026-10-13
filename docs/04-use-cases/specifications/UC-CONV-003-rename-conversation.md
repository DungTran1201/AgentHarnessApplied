# UC-CONV-003 [UC-006] — Đổi Tên Cuộc Trò Chuyện (Rename Conversation)

---

## 1. Overview
Ca sử dụng này cho phép cập nhật tiêu đề hiển thị của một cuộc trò chuyện trên Sidebar. Việc cập nhật tiêu đề có thể được kích hoạt thủ công bởi người dùng khi muốn đặt tên gợi nhớ, hoặc được hệ thống tự động thực hiện sau khi gửi tin nhắn đầu tiên (`BR-004`).

---

## 2. Goal
Đặt một tiêu đề gợi nhớ, phản ánh đúng chủ đề thảo luận cho cuộc trò chuyện để người dùng dễ dàng tìm kiếm và quản lý.

---

## 3. Scope
Hệ thống Website Chatbot Trợ Lý Ảo AI-Chan (Phân hệ Quản lý Cuộc trò chuyện).

---

## 4. Primary Actor
`ACT-02: User (Người dùng đã xác thực)`.

---

## 5. Supporting Actors
- `ai-frontend`: Cung cấp ô nhập liệu sửa tên trên Sidebar và cập nhật tiêu đề hiển thị.
- `ai-backend`: Xác thực quyền sở hữu (`BR-002`) và cập nhật trường `title` trong CSDL.
- `PostgreSQL 16`: Lưu trữ tiêu đề mới.

---

## 6. Trigger
- **Nhánh Thủ Công (Manual)**: Người dùng nhấn vào biểu tượng "Sửa tên" bên cạnh mục cuộc trò chuyện trên Sidebar.
- **Nhánh Tự Động (Automatic)**: Hệ thống tự động kích hoạt (thông qua quan hệ `<<include>>` từ `UC-CHAT-001`) khi tin nhắn đầu tiên được gửi thành công.

---

## 7. Preconditions
- Người dùng đang duy trì phiên đăng nhập hợp lệ (`UC-AUTH-002`).
- Cuộc trò chuyện cần đổi tên phải tồn tại và thuộc sở hữu của người dùng hiện tại (`BR-002`).

---

## 8. Postconditions

### 8.1 Success Postconditions
- Tiêu đề cuộc trò chuyện được cập nhật thành công trong cơ sở dữ liệu.
- Sidebar hiển thị ngay lập tức tiêu đề mới mà không cần tải lại trang.

### 8.2 Failure Postconditions
- Tiêu đề cũ được giữ nguyên; hiển thị thông báo lỗi nếu có vi phạm.

---

## 9. Main Success Scenario (Kịch Bản Thành Công Chính - Đổi Tên Thủ Công)

1. Người dùng di chuột tới mục cuộc trò chuyện trên Sidebar và nhấn biểu tượng "Sửa tên".
2. Hệ thống chuyển tiêu đề cuộc trò chuyện thành một ô nhập liệu (Input field) có sẵn tiêu đề hiện tại.
3. Người dùng nhập tiêu đề mới (độ dài từ 1 đến 255 ký tự).
4. Người dùng nhấn phím Enter hoặc bấm biểu tượng "Lưu".
5. Hệ thống máy khách gửi yêu cầu cập nhật tiêu đề lên máy chủ kèm `conversation_id` và tiêu đề mới.
6. Máy chủ xác thực quyền sở hữu cuộc trò chuyện của người dùng (`BR-002`).
7. Máy chủ cập nhật trường `title` và `updated_at` vào cơ sở dữ liệu PostgreSQL.
8. Máy chủ phản hồi trạng thái thành công `HTTP 200 OK`.
9. Giao diện máy khách cập nhật hiển thị tiêu đề mới trên Sidebar.

---

## 10. Alternative Flows (Các Luồng Rẽ Nhánh Thay Thế)

- **A1 — Đổi Tên Tự Động Sau Tin Nhắn Đầu Tiên (BR-004)**:
  - Khi người dùng gửi tin nhắn đầu tiên trong `UC-CHAT-001`.
  - Máy chủ kiểm tra nếu tiêu đề hiện tại của cuộc trò chuyện vẫn là `"Cuộc trò chuyện mới"`.
  - Máy chủ tự động trích xuất tối đa **30 ký tự đầu tiên** của câu hỏi người dùng làm tiêu đề mới.
  - Máy chủ lưu tiêu đề mới vào CSDL và trả về cho máy khách cập nhật ngay trên Sidebar.
  - *Lưu ý*: Nếu người dùng đã từng đổi tên thủ công trước đó, nhánh tự động này sẽ bị bỏ qua (`BR-004`).
- **A2 — Người Dùng Hủy Bỏ Thao Tác Đổi Tên**:
  - Tại bước 3, người dùng nhấn phím Escape hoặc click ra ngoài ô nhập liệu.
  - Ô nhập liệu đóng lại, giữ nguyên tiêu đề ban đầu, không gửi yêu cầu lên máy chủ.

---

## 11. Exception Flows (Các Luồng Xử Lý Ngoại Lệ)

- **E1 — Cố Tình Đổi Tên Cuộc Trò Chuyện Của Người Khác (Anti-IDOR - BR-002)**:
  - Máy chủ phát hiện người gửi yêu cầu không phải là chủ sở hữu của cuộc trò chuyện.
  - Máy chủ từ chối với mã lỗi `HTTP 404 Not Found` (hoặc `HTTP 403 Forbidden`).
  - Giao diện báo lỗi và hủy thao tác chỉnh sửa.

---

## 12. Business Rules (Quy Tắc Nghiệp Vụ Áp Dụng)
- `BR-002`: Người dùng chỉ có quyền đổi tên các cuộc trò chuyện của chính mình.
- `BR-004`: Quy ước tự động trích xuất 30 ký tự đầu của prompt đầu tiên làm tiêu đề hội thoại.

---

## 13. Requirements (Yêu Cầu Nghiệp Vụ Đáp Ứng)
- `FR-006`: Hệ thống cho phép người dùng đổi tên cuộc trò chuyện.

---

## 14. Acceptance Criteria (Tiêu Chí Chấp Nhận)
- Đáp ứng kịch bản kiểm thử trong `AC-003` (Kịch bản 2.3A, 2.3B tại [acceptance-criteria.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/acceptance-criteria.md)).

---

## 15. Dependencies (Phụ Thuộc Nghiệp Vụ)
- Phụ thuộc vào `UC-CONV-001 [UC-004]`.
- Được gọi tự động (`<<include>>`) từ `UC-CHAT-001 [UC-008]`.

---

## 16. Assumptions (Giả Định)
- Tiêu đề tối đa 255 ký tự; khi hiển thị trên Sidebar có thể được cắt ngắn bằng dấu ba chấm (`...`) nếu quá dài.

---

## 17. Open Questions (Vấn Đề Chờ Quyết Định)
- Không có câu hỏi tồn đọng cho Release 1.0.

---

## 18. Notes
- Không tốn chi phí gọi mô hình AI để đặt tên tự động trong MVP (dùng quy tắc trích xuất 30 ký tự đầu để tối ưu tốc độ và tiết kiệm chi phí token theo `BR-004`).
