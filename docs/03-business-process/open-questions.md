# SỔ THEO DÕI VẤN ĐỀ CHỜ LÀM RÕ & MÂU THUẪN (OPEN QUESTIONS & CONFLICTS)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `BP-OQ-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Ghi nhận tập trung các câu hỏi nghiệp vụ chưa có quyết định cuối cùng, các điểm chờ làm rõ (TBD) và theo dõi giải quyết mâu thuẫn tài liệu (Conflict Tracking) |

---

## 1. Sổ Theo Dõi Các Câu Hỏi Nghiệp Vụ Chờ Quyết Định (Open Questions)

| Mã Câu Hỏi | Lĩnh Vực | Nội Dung Câu Hỏi Nghiệp Vụ Cần Làm Rõ | Tác Động Quy Trình | Phương Án Tạm Thời Cho MVP | Trạng Thái |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`OQ-BP-01`** | Chatbot Trial | **Có nên cho phép Khách vãng lai (`Guest`) chat thử 1 - 2 câu trước khi bắt buộc đăng ký tài khoản không?** | `BP-AUTH-001`, `BP-CHAT-001` | Giữ nguyên quy định `BR-001`: **Bắt buộc đăng ký tài khoản** để lưu trữ hội thoại nhằm bảo vệ ngân sách API và ngăn ngừa bot spam. | `DECIDED_FOR_MVP` |
| **`OQ-BP-02`** | Quản Trị Hệ Thống | **Quy trình quản trị viên (`Admin`) duyệt tài khoản, xem thống kê token tiêu thụ và cấu hình API Key có thuộc phạm vi Release 1.0 không?** | `BP-AUTH-002`, `Domain_Sec` | **Tách khỏi Release 1.0**. Việc cấu hình API Key được quản lý qua biến môi trường container (`.env`), tài khoản quản trị sẽ thiết kế ở Phase 2. | `DEFERRED_TO_PHASE_2` |
| **`OQ-BP-03`** | Hạn Mức Tiêu Thụ | **Có áp đặt hạn ngạch (Quota trần) số lượng câu hỏi hoặc số lượng token tối đa mà một tài khoản người dùng được phép dùng mỗi ngày không?** | `BP-CHAT-001`, `BP-SEC-001` | Tại MVP Release 1.0, áp dụng Rate Limiter theo IP (60 req/phút) để ngăn spam. Chưa áp trần token hàng ngày cho từng user. | `DECIDED_FOR_MVP` |
| **`OQ-BP-04`** | Xóa Dữ Liệu | **Khi người dùng xóa cuộc trò chuyện (`BP-CONV-004`), hệ thống xóa vĩnh viễn (Hard Delete) hay chỉ ẩn đi (Soft Delete)?** | `BP-CONV-004 [PROC-007]` | Thực hiện xóa cứng (`Hard Delete`) trực tiếp khỏi PostgreSQL trong Release 1.0; sẽ bổ sung trường `deleted_at` nếu cần tính năng Khôi phục ở phiên bản sau. | `DECIDED_FOR_MVP` |

---

## 2. Nhật Ký Theo Dõi & Giải Quyết Mâu Thuẫn (Conflict Resolution Log)

| Mã Mâu Thuẫn | Vấn Đề Ghi Nhận | Tài Liệu Xung Đột | Quyết Định & Nguồn Sự Thật Chính Thức | Trạng Thái |
| :--- | :--- | :--- | :--- | :--- |
| **`CONF-01`** | Mô hình điều phối AI: Chỉ dùng Gemini hay phối hợp chuyển vùng OpenAI? | Một số ghi chép cũ chỉ đề cập Gemini; SRS và Architecture đề cập cả Gemini và OpenAI. | **Tuân thủ `BR-005` & `FR-011`**: Mô hình chuyển vùng dự phòng tự động (Google Gemini làm Primary, OpenAI làm Fallback). | `RESOLVED` |
| **`CONF-02`** | Cơ chế lưu trữ phiên: Header `Authorization: Bearer` hay `HttpOnly Cookie`? | Một số tài liệu API draft ghi nhận Bearer Token; Requirements Baseline quy định HttpOnly Cookie. | **Tuân thủ `SEC-004` & `FR-002`**: Sử dụng `HttpOnly Secure Cookie` để ngăn chặn triệt để nguy cơ đánh cắp token qua lỗ hổng XSS trên trình duyệt web. | `RESOLVED` |
