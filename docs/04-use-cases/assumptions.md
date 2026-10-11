# DANH MỤC GIẢ ĐỊNH CA SỬ DỤNG (USE CASE ASSUMPTIONS)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `UC-ASSUMPTIONS-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Ghi nhận toàn bộ các giả định tương tác và giả định hành vi người dùng làm tiền đề cho việc xây dựng các kịch bản Ca sử dụng |

---

## 1. Bảng Danh Mục Giả Định Tương Tác Nghiệp Vụ

| Mã Giả Định | Phát Biểu Giả Định Tương Tác | Lý Do / Cơ Sở Đưa Ra | Ca Sử Dụng Bị Ảnh Hưởng | Tác Động Nếu Giả Định Sai | Trạng Thái |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`ASM-UC-01`** | **Trình duyệt của người dùng cho phép lưu trữ Cookie** | Hệ thống sử dụng HttpOnly Secure Cookie để lưu giữ phiên đăng nhập an toàn (`SEC-004`). | `UC-AUTH-002`, `UC-AUTH-003`, toàn bộ các Use Case yêu cầu đăng nhập | Nếu người dùng cấu hình trình duyệt chặn toàn bộ Cookie bên thứ ba/nội bộ, hệ thống không thể duy trì phiên làm việc; cần có thông báo nhắc bật Cookie. | `ACCEPTED` |
| **`ASM-UC-02`** | **Tập trung một phiên hội thoại tại một thời điểm (Single Active Conversation)** | Giao diện web được thiết kế để hiển thị nội dung của duy nhất một cuộc trò chuyện đang được chọn trên màn hình chính. | `UC-CONV-001..004`, `UC-CHAT-001` | Người dùng không mở song song nhiều tab chat cùng lúc trên một màn hình; giúp đơn giản hóa logic đồng bộ giao diện. | `ACCEPTED` |
| **`ASM-UC-03`** | **Đồng bộ hóa giao diện tức thời không cần tải lại trang (Single Page App Experience)** | Các thao tác tạo mới, đổi tên hoặc xóa cuộc trò chuyện sẽ tự động cập nhật Sidebar thông qua state quản lý tại Client mà không cần F5 trình duyệt. | `UC-CONV-001`, `UC-CONV-003`, `UC-CONV-004` | Mang lại trải nghiệm người dùng hiện đại, mượt mà và trực quan (`BO-03`). | `ACCEPTED` |
| **`ASM-UC-04`** | **Ngôn ngữ đàm thoại theo ngữ cảnh người dùng đưa vào** | Mô hình AI có khả năng tự động nhận diện ngôn ngữ của câu hỏi (Tiếng Việt, Tiếng Anh, v.v.) và phản hồi bằng chính ngôn ngữ đó mà không đòi hỏi người dùng phải chọn ngôn ngữ thủ công trước. | `UC-CHAT-001 [UC-008]` | Giảm bớt số lượng bước thao tác cho người dùng, tối ưu hóa sự tự nhiên trong giao tiếp. | `ACCEPTED` |
