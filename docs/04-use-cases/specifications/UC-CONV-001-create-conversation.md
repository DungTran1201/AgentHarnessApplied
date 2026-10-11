# UC-CONV-001 [UC-004] — Khởi Tạo Cuộc Trò Chuyện (Create Conversation)

---

## 1. Overview
Ca sử dụng này cho phép người dùng đã xác thực tạo một không gian cuộc trò chuyện độc lập mới để bắt đầu một chủ đề tương tác mới với Trợ lý ảo AI.

---

## 2. Goal
Tạo một phiên hội thoại mới gắn liền với tài khoản cá nhân của người dùng với tiêu đề khởi tạo mặc định.

---

## 3. Scope
Hệ thống Website Chatbot Trợ Lý Ảo AI-Chan (Phân hệ Quản lý Cuộc trò chuyện).

---

## 4. Primary Actor
`ACT-02: User (Người dùng đã xác thực)`.

---

## 5. Supporting Actors
- `ai-frontend`: Gửi yêu cầu khởi tạo, cập nhật danh sách Sidebar và làm sạch khung chat.
- `ai-backend`: Xác thực quyền người dùng, sinh mã định danh hội thoại duy nhất và lưu trữ bản ghi.
- `PostgreSQL 16`: Lưu trữ bản ghi cuộc trò chuyện mới.

---

## 6. Trigger
Người dùng nhấn nút "+ Đoạn chat mới" (New Chat) trên thanh Sidebar.

---

## 7. Preconditions
- Người dùng đang duy trì phiên đăng nhập hợp lệ (`UC-AUTH-002`).

---

## 8. Postconditions

### 8.1 Success Postconditions
- Bản ghi cuộc trò chuyện mới được tạo lập trong cơ sở dữ liệu với `user_id` của người dùng hiện tại và tiêu đề mặc định là `"Cuộc trò chuyện mới"` (`BR-004`).
- Cuộc trò chuyện mới được đưa lên vị trí đầu tiên của danh sách Sidebar và được chọn làm cuộc trò chuyện đang kích hoạt (Active Conversation).
- Khung chat chính được làm mới, sẵn sàng tiếp nhận câu hỏi đầu tiên.

### 8.2 Failure Postconditions
- Không có cuộc trò chuyện nào được tạo; trạng thái hiển thị của người dùng không đổi.

---

## 9. Main Success Scenario (Kịch Bản Thành Công Chính)

1. Người dùng nhấn nút "+ Đoạn chat mới" trên thanh Sidebar.
2. Hệ thống kiểm tra phiên đăng nhập của người dùng qua Cookie (`BR-001`).
3. Hệ thống gửi yêu cầu tạo cuộc trò chuyện mới lên máy chủ.
4. Máy chủ xác thực danh tính người dùng và khởi tạo bản ghi cuộc trò chuyện mới:
   - `id`: Mã định danh duy nhất (UUID).
   - `user_id`: Định danh của người dùng hiện tại (`BR-002`).
   - `title`: `"Cuộc trò chuyện mới"` (`BR-004`).
5. Máy chủ lưu bản ghi vào cơ sở dữ liệu PostgreSQL.
6. Máy chủ phản hồi trạng thái thành công `HTTP 201 Created` kèm thông tin cuộc trò chuyện vừa tạo.
7. Giao diện máy khách chèn cuộc trò chuyện mới lên đầu Sidebar và đánh dấu trạng thái đang mở.
8. Giao diện làm sạch khung chat, hiển thị lời chào mở đầu và sẵn sàng nhận tin nhắn đầu tiên.

---

## 10. Alternative Flows (Các Luồng Rẽ Nhánh Thay Thế)
- Không có luồng thay thế đặc thù cho ca sử dụng này khi người dùng thao tác bình thường.

---

## 11. Exception Flows (Các Luồng Xử Lý Ngoại Lệ)

- **E1 — Phiên Làm Việc Đã Hết Hạn (Session Expired - BR-001)**:
  - Tại bước 2, máy chủ phát hiện Cookie phiên đã hết hạn hoặc không hợp lệ.
  - Máy chủ từ chối yêu cầu với mã `HTTP 401 Unauthorized`.
  - Hệ thống máy khách chuyển hướng người dùng về trang Đăng nhập (`/login`) kèm thông báo: *"Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại."*.

---

## 12. Business Rules (Quy Tắc Nghiệp Vụ Áp Dụng)
- `BR-001`: Chỉ người dùng đã xác thực mới được phép tạo cuộc trò chuyện.
- `BR-002`: Cuộc trò chuyện thuộc sở hữu độc quyền của người dùng hiện tại.
- `BR-004`: Tiêu đề khởi tạo ban đầu bắt buộc là `"Cuộc trò chuyện mới"`.

---

## 13. Requirements (Yêu Cầu Nghiệp Vụ Đáp Ứng)
- `FR-004`: Hệ thống cho phép người dùng tạo một cuộc trò chuyện mới.
- `NFR-004`: Thời gian phản hồi tạo mới cuộc trò chuyện đạt dưới 500ms.

---

## 14. Acceptance Criteria (Tiêu Chí Chấp Nhận)
- Đáp ứng kịch bản kiểm thử trong `AC-003` (Kịch bản 2.1A tại [acceptance-criteria.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/acceptance-criteria.md)).

---

## 15. Dependencies (Phụ Thuộc Nghiệp Vụ)
- Phụ thuộc vào `UC-AUTH-002 [UC-002]`.
- Là điều kiện tiên quyết cung cấp ngữ cảnh cho `UC-CHAT-001 [UC-008]`.

---

## 16. Assumptions (Giả Định)
- `ASM-UC-02`: Mỗi thời điểm chỉ có 1 cuộc trò chuyện được kích hoạt trên màn hình chính.

---

## 17. Open Questions (Vấn Đề Chờ Quyết Định)
- Không có câu hỏi tồn đọng cho Release 1.0.

---

## 18. Notes
- Thao tác tạo cuộc trò chuyện không gọi bất kỳ mô hình AI nào; đây là thao tác quản lý dữ liệu nội bộ thuần túy.
