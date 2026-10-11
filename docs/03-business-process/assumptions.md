# DANH MỤC GIẢ ĐỊNH VẬN HÀNH QUY TRÌNH (PROCESS ASSUMPTIONS)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `BP-ASSUMPTIONS-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Ghi nhận rõ ràng toàn bộ các giả định làm nền tảng cho việc thiết kế mô hình quy trình nghiệp vụ; bảo đảm nguyên tắc không chuyển giả định thành sự thật hiển nhiên khi chưa có xác nhận |

---

## 1. Bảng Danh Mục Giả Định Nghiệp Vụ

| Mã Giả Định | Phát Biểu Giả Định Nghiệp Vụ | Cơ Sở & Lý Do Đưa Ra | Quy Trình Bị Ảnh Hưởng | Tác Động Nếu Giả Định Sai | Trạng Thái |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`ASM-BP-01`** | **Trình duyệt máy khách hỗ trợ chuẩn Server-Sent Events (SSE)** | Mọi trình duyệt hiện đại (Chrome, Edge, Firefox, Safari) đều hỗ trợ API `EventSource` hoặc `ReadableStream` qua fetch. | `BP-CHAT-001 [PROC-008]` | Nếu người dùng sử dụng trình duyệt cũ (IE), tính năng streaming sẽ bị lỗi; cần fallback sang HTTP Polling. | `ACCEPTED` |
| **`ASM-BP-02`** | **Phiên làm việc độc lập trên từng thiết bị (No centralized session store in MVP)** | Mỗi lần đăng nhập thành công sinh 1 JWT độc lập lưu tại Cookie của trình duyệt đó. Chưa cần triển khai thu hồi phiên tập trung qua Redis cho MVP. | `BP-AUTH-002`, `BP-AUTH-003` | Người dùng đổi mật khẩu thì phiên cũ trên thiết bị khác vẫn duy trì đến khi token hết hạn 7 ngày. | `ACCEPTED_FOR_MVP` |
| **`ASM-BP-03`** | **Không áp dụng cơ chế xác minh Email qua OTP/Link trong MVP** | Nhằm tinh gọn trải nghiệm tiếp cận và chưa tích hợp dịch vụ gửi mail (SMTP) tại Phase 1, người dùng đăng ký xong có thể đăng nhập ngay mà không cần kích hoạt tài khoản. | `BP-AUTH-001 [PROC-001]` | Có thể phát sinh các tài khoản rác với email không có thực nếu bị spam; được bảo vệ bởi tầng Rate Limiter (`BP-SEC-001`). | `ACCEPTED_FOR_MVP` |
| **`ASM-BP-04`** | **Ngữ cảnh cuộc trò chuyện được cắt tỉa theo số lượng tin nhắn gần nhất** | Giả định ngữ cảnh đàm thoại được nạp tối đa 10 cặp tin nhắn (20 messages) là đủ để AI hiểu chủ đề thảo luận của phiên làm việc. | `BP-CHAT-001`, `BP-AI-001` | Nếu người dùng hỏi lại nội dung từ 50 tin nhắn trước, AI có thể không nhớ ngữ cảnh đó; bù lại giúp tiết kiệm token và tăng tốc độ. | `RECOMMENDED` |
