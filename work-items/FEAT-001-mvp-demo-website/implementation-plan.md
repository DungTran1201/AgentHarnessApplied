# Kế Hoạch Triển Khai Kỹ Thuật (Implementation Plan)
## Mã Công Việc: FEAT-001-mvp-demo-website

---

## 1. Thiết Kế Kiến Trúc Backend (`ai-backend`)
1. **Lớp Truy Xuất Dữ Liệu (`ai-backend/src/db.py`)**:
   - Kết nối SQLite `ai-backend/database/app.db` với `PRAGMA foreign_keys = ON;`.
   - Cung cấp helper context manager và query functions cho users, conversations, messages.
2. **Module Xác Thực & Quản Lý Phiên (`ai-backend/src/api/v1/auth.py`)**:
   - `POST /api/v1/auth/register`: Băm bcrypt mật khẩu, ghi bản ghi User, trả về 201.
   - `POST /api/v1/auth/login`: Xác thực mật khẩu bcrypt, phát hành JWT token, đóng gói vào HttpOnly Cookie `access_token` (`ADR-002`, `SEC-004`).
   - `POST /api/v1/auth/logout`: Thu hồi Cookie bằng cách gửi `Set-Cookie: access_token=; Max-Age=0`.
   - `GET /api/v1/auth/me`: Đọc JWT Cookie và trả về profile người dùng hiện hành.
3. **Module Quản Lý Cuộc Trò Chuyện (`ai-backend/src/api/v1/conversations.py`)**:
   - `GET /api/v1/conversations`: Lấy danh sách cuộc trò chuyện của user hiện tại, sắp xếp theo `updated_at DESC`.
   - `POST /api/v1/conversations`: Tạo cuộc trò chuyện mới.
   - `PATCH /api/v1/conversations/{id}`: Đổi tên cuộc trò chuyện (Anti-IDOR).
   - `DELETE /api/v1/conversations/{id}`: Xóa cuộc trò chuyện và cascade xóa tin nhắn.
   - `GET /api/v1/conversations/{id}/messages`: Lấy danh sách tin nhắn của cuộc trò chuyện.
4. **Module Trò Chuyện Dòng Chảy (`ai-backend/src/api/v1/chat.py`)**:
   - `POST /api/v1/conversations/{id}/messages/stream`:
     - Nhận prompt, kiểm tra độ dài <= 4000 ký tự.
     - Lưu tin nhắn User vào CSDL.
     - Lấy 20 tin nhắn gần nhất làm ngữ cảnh trượt.
     - Mở luồng SSE (`text/event-stream`), gọi LLM Manager (hoặc trợ lý AI thông minh tích hợp khi chưa cấu hình API key bên ngoài).
     - Truyền token chunks theo thời gian thực (`event: chunk`).
     - Tự động cập nhật tiêu đề hội thoại nếu là tin nhắn đầu tiên (`BR-004`).
     - Lưu câu trả lời của Assistant vào CSDL và gửi `event: done`.

---

## 2. Thiết Kế Kiến Trúc Frontend (`ai-frontend`)
1. **Thiết Kế Giao Diện Đẳng Cấp & Tinh Tế (Aesthetic & Polish)**:
   - Áp dụng nguyên tắc `web-design-guideline` và `frontend-design`: Dark/Light modern theme, font chữ sắc nét (Inter / Outfit / system-ui), bố cục không gian thoáng đãng, micro-animations mượt mà.
2. **Trang Xác Thực (`/login` & `/register`)**:
   - Thiết kế trực quan với logo mascot AI-Chan, form đăng nhập / đăng ký mượt mà, kiểm tra tính hợp lệ dữ liệu inline, thông báo Toast trực quan.
3. **Trang Không Gian Trò Chuyện (`/chat`)**:
   - **Left Sidebar**:
     - Nút `[+ Cuộc trò chuyện mới]`.
     - Danh sách lịch sử hội thoại với nút đổi tên inline và nút xóa kèm Modal xác nhận.
     - Khả năng thu gọn trên màn hình di động (Responsive Drawer - `UX-001`).
   - **Main Chat Canvas**:
     - Empty State với Avatar AI-Chan chào mừng và 4 thẻ gợi ý câu hỏi bắt đầu (`UX-005`).
     - Feed tin nhắn với bong bóng User và Assistant riêng biệt.
     - Hiển thị phản hồi dòng chảy với con trỏ nhấp nháy (`UX-003`).
     - Nút `[Dừng phản hồi]` (Stop Generation) khi đang nhận stream.
     - Tự động cuộn thông minh bám đáy (`UX-002`) và nút cuộn nhanh xuống đáy khi người dùng cuộn lên.
     - Render định dạng Markdown, bảng biểu, và khối mã nguồn kèm nút `[Copy Code]` tiện dụng (`UX-004`).
     - Ô nhập liệu tự co giãn, phím `Enter` gửi / `Shift+Enter` xuống dòng, và bộ đếm `0 / 4000` ký tự (`UX-005`).
