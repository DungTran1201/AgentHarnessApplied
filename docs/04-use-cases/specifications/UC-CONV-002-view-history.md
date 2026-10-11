# UC-CONV-002 [UC-005] — Xem Lịch Sử Hội Thoại (View Conversation History)

---

## 1. Overview
Ca sử dụng này cho phép người dùng đã xác thực tải và xem lại danh sách toàn bộ các cuộc trò chuyện đã tạo, cũng như chọn một cuộc trò chuyện cụ thể để đọc lại toàn bộ lịch sử các câu hỏi và câu trả lời trong quá khứ.

---

## 2. Goal
Truy xuất và hiển thị danh mục các cuộc trò chuyện và nội dung tin nhắn thuộc quyền sở hữu của chính người dùng theo thứ tự thời gian chuẩn xác.

---

## 3. Scope
Hệ thống Website Chatbot Trợ Lý Ảo AI-Chan (Phân hệ Quản lý Cuộc trò chuyện & Lịch sử tin nhắn).

---

## 4. Primary Actor
`ACT-02: User (Người dùng đã xác thực)`.

---

## 5. Supporting Actors
- `ai-frontend`: Hiển thị danh sách trên Sidebar và render các bong bóng tin nhắn trong khung chat.
- `ai-backend`: Xác thực quyền sở hữu (`BR-002`), truy vấn và lọc dữ liệu từ CSDL.
- `PostgreSQL 16`: Thực thi các câu truy vấn lọc theo `user_id` và `conversation_id`.

---

## 6. Trigger
Người dùng truy cập vào trang `/chat` hoặc nhấn chọn một cuộc trò chuyện cụ thể trên Sidebar.

---

## 7. Preconditions
- Người dùng đang duy trì phiên đăng nhập hợp lệ (`UC-AUTH-002`).

---

## 8. Postconditions

### 8.1 Success Postconditions
- Sidebar hiển thị danh sách các cuộc trò chuyện của người dùng sắp xếp giảm dần theo thời gian (`updated_at DESC`).
- Khi chọn 1 cuộc trò chuyện: Toàn bộ tin nhắn (`role = user` và `role = assistant`) được hiển thị đầy đủ, chính xác theo trình tự thời gian tăng dần (`created_at ASC`).
- Không có bất kỳ dữ liệu hội thoại nào của người dùng khác bị hiển thị (`BR-002`).

### 8.2 Failure Postconditions
- Người dùng nhận thông báo lỗi nếu truy cập vào cuộc trò chuyện không tồn tại hoặc không thuộc sở hữu của mình.

---

## 9. Main Success Scenario (Kịch Bản Thành Công Chính)

1. Người dùng truy cập vào ứng dụng tại đường dẫn `/chat`.
2. Hệ thống máy khách gửi yêu cầu lấy danh sách cuộc trò chuyện của người dùng hiện tại lên máy chủ.
3. Máy chủ xác thực JWT Cookie và truy vấn cơ sở dữ liệu:
   - Lọc tất cả các cuộc trò chuyện có `user_id = current_user_id` (`BR-002`).
   - Sắp xếp giảm dần theo thời điểm cập nhật mới nhất.
4. Máy chủ trả về danh sách tóm tắt các cuộc trò chuyện (id, title, updated_at).
5. Hệ thống hiển thị danh sách các mục trò chuyện trên thanh Sidebar.
6. Người dùng nhấn chọn một cuộc trò chuyện trên Sidebar để mở xem chi tiết.
7. Hệ thống máy khách gửi yêu cầu tải tin nhắn của cuộc trò chuyện được chọn lên máy chủ.
8. Máy chủ kiểm tra quyền sở hữu cuộc trò chuyện (`BR-002`).
9. Máy chủ truy vấn toàn bộ các tin nhắn thuộc cuộc trò chuyện đó, sắp xếp theo thời gian tăng dần.
10. Máy chủ trả về danh sách tin nhắn.
11. Giao diện máy khách render toàn bộ các tin nhắn trong khung chat chính kèm định dạng Markdown chuẩn đẹp.

---

## 10. Alternative Flows (Các Luồng Rẽ Nhánh Thay Thế)

- **A1 — Người Dùng Mới Chưa Có Cuộc Trò Chuyện Nào**:
  - Tại bước 4, máy chủ trả về danh sách rỗng.
  - Sidebar hiển thị trạng thái trống: *"Chưa có cuộc trò chuyện nào"*.
  - Khung chat chính hiển thị màn hình chào mừng gợi ý bấm nút "+ Đoạn chat mới" để bắt đầu.

---

## 11. Exception Flows (Các Luồng Xử Lý Ngoại Lệ)

- **E1 — Truy Cập Trái Phép Vào Cuộc Trò Chuyện Của Người Khác (Anti-IDOR - BR-002)**:
  - Tại bước 8, người dùng cố tình gửi mã `conversation_id` thuộc tài khoản của người khác.
  - Máy chủ phát hiện `conversation.user_id != current_user_id`.
  - Máy chủ từ chối yêu cầu với mã `HTTP 404 Not Found` (hoặc `HTTP 403 Forbidden`) và ghi nhận cảnh báo an ninh (`NFR-018`).
  - Giao diện hiển thị thông báo: *"Không tìm thấy cuộc trò chuyện hoặc bạn không có quyền truy cập."*.

---

## 12. Business Rules (Quy Tắc Nghiệp Vụ Áp Dụng)
- `BR-001`: Chỉ người dùng đã đăng nhập mới được xem lịch sử hội thoại.
- `BR-002`: Cách ly tuyệt đối quyền sở hữu cuộc trò chuyện giữa các tài khoản khác nhau.

---

## 13. Requirements (Yêu Cầu Nghiệp Vụ Đáp Ứng)
- `FR-005`: Hệ thống hiển thị danh sách các cuộc trò chuyện trước đây của người dùng.
- `FR-012`: Hệ thống lưu và nạp lại toàn bộ lịch sử tin nhắn của từng cuộc trò chuyện.
- `NFR-004`, `NFR-018`: Hiệu năng phản hồi dưới 500ms và bảo mật cô lập dữ liệu.

---

## 14. Acceptance Criteria (Tiêu Chí Chấp Nhận)
- Đáp ứng kịch bản kiểm thử trong `AC-003` (Kịch bản 2.2A, 2.2B tại [acceptance-criteria.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/acceptance-criteria.md)).

---

## 15. Dependencies (Phụ Thuộc Nghiệp Vụ)
- Phụ thuộc vào `UC-AUTH-002 [UC-002]`.

---

## 16. Assumptions (Giả Định)
- `ASM-UC-02`: Chỉ nạp và hiển thị nội dung của 1 cuộc trò chuyện được chọn tại một thời điểm.

---

## 17. Open Questions (Vấn Đề Chờ Quyết Định)
- `OQ-UC-02`: Xuất lịch sử trò chuyện sang định dạng file ngoài được hoãn lại cho phiên bản sau.

---

## 18. Notes
- Phân trang tin nhắn (Pagination): Tại MVP 1.0 với cuộc trò chuyện tiêu chuẩn, nạp danh sách tin nhắn trực tiếp; nếu quá dài áp dụng cửa sổ ngữ cảnh trượt.
