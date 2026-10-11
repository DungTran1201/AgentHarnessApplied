# SỔ THEO DÕI VẤN ĐỀ CHỜ LÀM RÕ & MÂU THUẪN (OPEN QUESTIONS & CONFLICTS)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `UC-OQ-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Ghi nhận các vấn đề nghiệp vụ ở tầng tương tác Ca sử dụng chưa có quyết định chính thức, các tính năng mở rộng cần cân nhắc, và theo dõi giải quyết mâu thuẫn tài liệu |

---

## 1. Sổ Theo Dõi Các Câu Hỏi Nghiệp Vụ Chờ Quyết Định (Open Questions)

| Mã Câu Hỏi | Ca Sử Dụng Ảnh Hưởng | Nội Dung Câu Hỏi Nghiệp Vụ Cần Làm Rõ | Đề Xuất Tạm Thời Cho Release 1.0 (MVP) | Trạng Thái |
| :--- | :--- | :--- | :--- | :--- |
| **`OQ-UC-01`** | `UC-CHAT-001` | **Người dùng có thể chỉnh sửa lại nội dung tin nhắn đã gửi trước đó (Edit Message) để rẽ nhánh hội thoại không?** | **Không hỗ trợ tại MVP**: Tin nhắn đã gửi và đã được AI phản hồi sẽ không thể chỉnh sửa; người dùng gửi câu hỏi mới để tiếp tục trao đổi. | `DECIDED_FOR_MVP` |
| **`OQ-UC-02`** | `UC-CONV-002` | **Có cung cấp tính năng Xuất dữ liệu cuộc trò chuyện (Export Chat to Markdown / PDF) cho người dùng không?** | **Tách khỏi phạm vi MVP**: Người dùng có thể sử dụng nút sao chép (Copy) trên từng tin nhắn; tính năng Export toàn bộ cuộc trò chuyện sẽ đưa vào Release 1.1. | `DEFERRED_TO_PHASE_2` |
| **`OQ-UC-03`** | `UC-CHAT-001` | **Người dùng có thể xem số lượng token hoặc chi phí tiêu thụ của từng câu trả lời trên giao diện không?** | **Ẩn tại giao diện người dùng**: Chỉ ghi nhận thông số token vào log hệ thống phục vụ kỹ thuật; không hiển thị trên giao diện người dùng thông thường để giữ giao diện tối giản. | `DECIDED_FOR_MVP` |
| **`OQ-UC-04`** | `UC-CONV-004` | **Khi xóa cuộc trò chuyện, có cần cung cấp tính năng Thùng rác (Trash / Restore) để khôi phục lại không?** | **Không cung cấp tại MVP**: Sử dụng hộp thoại cảnh báo xác nhận rõ ràng trước khi xóa; xóa vĩnh viễn khỏi CSDL (`Hard Delete`). | `DECIDED_FOR_MVP` |

---

## 2. Nhật Ký Theo Dõi & Giải Quyết Mâu Thuẫn (Conflict Resolution Log)

| Mã Mâu Thuẫn | Vấn Đề Ghi Nhận | Tài Liệu Xung Đột | Quyết Định & Nguồn Sự Thật Chính Thức | Trạng Thái |
| :--- | :--- | :--- | :--- | :--- |
| **`CONF-UC-01`** | Tách riêng hay gộp chung Use Case "Chọn Model" với "Gửi Tin Nhắn"? | Ban đầu một số ghi chép coi việc chọn model là 1 tham số của gửi tin nhắn. | **Tách thành quan hệ `<<extend>>`**: `UC-CHAT-002` mở rộng cho `UC-CHAT-001`. Hành vi chọn model là một mục tiêu chủ động độc lập diễn ra trước khi gửi câu hỏi. | `RESOLVED` |
| **`CONF-UC-02`** | Quản lý phiên: Cần thêm Use Case "Làm mới mã phiên" (Refresh Token) không? | Một số tài liệu bảo mật đề xuất token 15 phút + Refresh Token. | **Tuân thủ `NFR-006` & `SEC-004`**: Sử dụng duy nhất mã Access Token có thời hạn 7 ngày lưu trong HttpOnly Secure Cookie; không cần quy trình Refresh Token phức tạp trong phiên bản MVP. | `RESOLVED` |
