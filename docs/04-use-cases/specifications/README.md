# THƯ MỤC ĐẶC TẢ CHI TIẾT CA SỬ DỤNG (USE CASE SPECIFICATIONS)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

## 1. Giới Thiệu Thư Mục Đặc Tả

Thư mục `docs/04-use-cases/specifications/` chứa các tài liệu đặc tả chi tiết (Use Case Specifications) cho từng Ca sử dụng của hệ thống **AI-Chan Assistant**.

Mỗi tài liệu đặc tả được cấu trúc chặt chẽ theo biểu mẫu chuẩn:
1. **Tổng Quan (Overview)**: Mô tả tóm lược phạm vi và bối cảnh.
2. **Mục Tiêu (Goal)**: Giá trị nghiệp vụ trực tiếp mà Actor muốn đạt được.
3. **Phạm Vi (Scope)**: Ranh giới hệ thống liên quan.
4. **Tác Nhân (Actors)**: Tác nhân chính (Primary) và tác nhân hỗ trợ (Supporting).
5. **Sự Kiện Kích Hoạt (Trigger)**: Hành động của Actor mở đầu ca sử dụng.
6. **Điều Kiện Tiên Quyết (Preconditions)**: Trạng thái bắt buộc phải thỏa mãn trước khi bắt đầu.
7. **Điều Kiện Sau Thực Hiện (Postconditions)**: Trạng thái thành công và thất bại.
8. **Kịch Bản Thành Công Chính (Main Success Scenario)**: Chuỗi tương tác Actor -> System từng bước, không phụ thuộc chi tiết triển khai kỹ thuật.
9. **Kịch Bản Thay Thế (Alternative Flows)**: Các nhánh rẽ nghiệp vụ hợp lệ.
10. **Kịch Bản Ngoại Lệ (Exception Flows)**: Xử lý sự cố và lỗi hệ thống.
11. **Quy Tắc Nghiệp Vụ (Business Rules)**: Các quy tắc `BR-###` bắt buộc tuân thủ.
12. **Yêu Cầu Liên Quan (Requirements)**: Truy vết tới các mã `FR-###`, `NFR-###`, `SEC-###`.
13. **Tiêu Chí Chấp Nhận (Acceptance Criteria)**: Kịch bản Given-When-Then kiểm chứng.
14. **Phụ Thuộc (Dependencies)**: Quan hệ tiền đề với các Ca sử dụng khác.
15. **Giả Định & Câu Hỏi Chờ Làm Rõ (Assumptions & Open Questions)**.

---

## 2. Danh Mục Các Hồ Sơ Đặc Tả Ca Sử Dụng

| Tệp Đặc Tả | Mã Ca Sử Dụng | Tên Ca Sử Dụng | Phân Hệ |
| :--- | :--- | :--- | :--- |
| **[UC-AUTH-001-register.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/specifications/UC-AUTH-001-register.md)** | `UC-AUTH-001 [UC-001]` | Đăng Ký Tài Khoản Mới | Định danh (Identity) |
| **[UC-AUTH-002-login.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/specifications/UC-AUTH-002-login.md)** | `UC-AUTH-002 [UC-002]` | Đăng Nhập Hệ Thống | Định danh (Identity) |
| **[UC-AUTH-003-logout.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/specifications/UC-AUTH-003-logout.md)** | `UC-AUTH-003 [UC-003]` | Đăng Xuất Khỏi Hệ Thống | Định danh (Identity) |
| **[UC-CONV-001-create-conversation.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/specifications/UC-CONV-001-create-conversation.md)** | `UC-CONV-001 [UC-004]` | Khởi Tạo Cuộc Trò Chuyện | Hội thoại (Conversation) |
| **[UC-CONV-002-view-history.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/specifications/UC-CONV-002-view-history.md)** | `UC-CONV-002 [UC-005]` | Xem Lịch Sử Hội Thoại | Hội thoại (Conversation) |
| **[UC-CONV-003-rename-conversation.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/specifications/UC-CONV-003-rename-conversation.md)** | `UC-CONV-003 [UC-006]` | Đổi Tên Cuộc Trò Chuyện | Hội thoại (Conversation) |
| **[UC-CONV-004-delete-conversation.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/specifications/UC-CONV-004-delete-conversation.md)** | `UC-CONV-004 [UC-007]` | Xóa Cuộc Trò Chuyện | Hội thoại (Conversation) |
| **[UC-CHAT-001-send-message.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/specifications/UC-CHAT-001-send-message.md)** | `UC-CHAT-001 [UC-008]` | Gửi Tin Nhắn & Tương Tác AI | Đàm thoại (Chat & AI) |
| **[UC-CHAT-002-select-model.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/specifications/UC-CHAT-002-select-model.md)** | `UC-CHAT-002 [UC-009]` | Lựa Chọn Mô Hình AI | Đàm thoại (Chat & AI) |
