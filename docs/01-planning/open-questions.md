# SỔ THEO DÕI VẤN ĐỀ CẦN LÀM RÕ & GIẢ ĐỊNH (OPEN QUESTIONS & ASSUMPTIONS REGISTER)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `OQ-REG-001` |
| **Mục đích** | Tập trung toàn bộ các câu hỏi mở (Open Questions), mục chờ làm rõ (`TBD`), giả định nghiệp vụ (`ASSUMPTION`) và các quyết định kỹ thuật cần chốt |
| **Quy tắc bất biến** | Không bao giờ âm thầm biến một giả định thành sự thật hiển nhiên (Never silently convert assumptions into facts) |

---

## 1. Danh Mục Các Câu Hỏi Mở & Mục Chờ Làm Rõ (Open Questions & TBDs)

| Mã Định Danh | Phân Loại | Nội Dung Vấn Đề Cần Làm Rõ | Tác Động Đến Kế Hoạch | Đề Xuất Của Đội Ngũ Phân Tích (BA/SA Recommendation) | Phase Cần Chốt | Trạng Thái |
| :---: | :--- | :--- | :--- | :--- | :---: | :---: |
| **OQ-01** | Nghiệp Vụ | **Chính sách dành cho Khách vãng lai (Guest)**: Khách chưa đăng nhập có được phép chat thử nghiệm hay bắt buộc 100% phải Login mới được thấy khung chat? | Ảnh hưởng đến luồng điều hướng màn hình chính và API cấp session ẩn danh. | Cho phép Guest chat thử nghiệm tối đa 3 câu (lưu tạm trong Session Storage của trình duyệt, không lưu DB), sau đó hiển thị popup yêu cầu đăng ký để tiếp tục và lưu lịch sử. | **P01** | `OPEN` |
| **OQ-02** | Nghiệp Vụ / Dữ Liệu | **Chính sách lưu trữ lịch sử cuộc trò chuyện**: Lịch sử hội thoại được lưu trữ vô thời hạn cho tới khi người dùng tự xóa hay tự động dọn dẹp sau 90/180 ngày? | Ảnh hưởng đến dung lượng đĩa của cơ sở dữ liệu PostgreSQL và chính sách quyền riêng tư. | Lưu trữ vĩnh viễn trong giai đoạn MVP cho đến khi người dùng tự tay xóa; sang giai đoạn tương lai bổ sung tính năng tự động lưu trữ (Archive) cho các chat cũ hơn 1 năm. | **P01** | `DECIDED` (Theo MVP Baseline) |
| **OQ-03** | Tính Năng | **Hỗ trợ xuất lịch sử cuộc trò chuyện (Export Chat)**: Có cần cung cấp nút tải lịch sử đoạn chat dưới dạng PDF hoặc Markdown trong giai đoạn 1 không? | Ảnh hưởng đến khối lượng công việc Frontend của Phase 04. | Đưa vào danh mục `Future Scope` sau khi phiên bản MVP vận hành ổn định. | **P01** | `DECIDED` (Future Scope) |
| **OQ-04** | Kỹ Thuật | **Mô hình AI mặc định cụ thể (Specific Default Model)**: Sử dụng chính xác phiên bản model nào của Gemini (Gemini 1.5 Flash hay Gemini 1.5 Pro) và OpenAI (GPT-4o hay GPT-4o-mini)? | Ảnh hưởng đến chi phí API và độ trễ phản hồi. | Mặc định sử dụng **Gemini 1.5 Flash** cho luồng chính (tối ưu tốc độ và chi phí) và fallback sang **GPT-4o-mini** để cân bằng ngân sách. | **P01** | `DECIDED` |
| **OQ-05** | An Ninh / Vận Hành | **Chính sách lưu vết log nội dung đàm thoại**: Có được phép ghi toàn bộ nội dung prompt và câu trả lời của AI vào file log hệ thống hay chỉ ghi metadata? | Ảnh hưởng đến rủi ro lộ lọt dữ liệu nhạy cảm của người dùng (Privacy Leak). | Chỉ ghi nhận metadata trong log (User ID, Conversation ID, Token tiêu thụ, Độ trễ, Trạng thái thành công/thất bại). Tuyệt đối không ghi toàn văn nội dung tin nhắn vào file log. | **P01** | `DECIDED` (`SEC-06`) |

---

## 2. Danh Mục Các Giả Định Kỹ Thuật & Nghiệp Vụ (Assumptions)

| Mã Giả Định | Nội Dung Giả Định Nghiệp Vụ & Kỹ Thuật | Cơ Sở Giả Định | Rủi Ro Nếu Giả Định Sai | Biện Pháp Kiểm Chứng |
| :---: | :--- | :--- | :--- | :--- |
| **ASM-01** | Người dùng sử dụng các trình duyệt hiện đại (Chrome, Edge, Firefox, Safari) hỗ trợ Fetch ReadableStream / SSE. | Hầu hết trình duyệt sau năm 2020 đều hỗ trợ chuẩn stream web. | Giao diện không hiển thị được hiệu ứng gõ chữ mượt mà trên trình duyệt quá cũ (như IE11). | Fallback về dạng tải nguyên đoạn văn bản khi trình duyệt không hỗ trợ ReadableStream. |
| **ASM-02** | Nội dung đàm thoại trong giai đoạn 1 hoàn toàn là văn bản thuần túy (Text/Markdown), chưa hỗ trợ hình ảnh hay tệp đính kèm. | Phạm vi MVP được định nghĩa tinh gọn trong SRS. | Người dùng có nhu cầu upload file ngay lập tức. | Thêm chỉ dẫn rõ ràng trên khung nhập liệu: "Hiện chỉ hỗ trợ tin nhắn văn bản". |
| **ASM-03** | Máy chủ triển khai có đường truyền mạng quốc tế ổn định với băng thông tối thiểu 100Mbps. | Yêu cầu kết nối ra các máy chủ API của Google Cloud và OpenAI đặt tại nước ngoài. | Xuất hiện lỗi timeout gọi AI nếu mạng quốc tế bị nghẽn cáp quang biển. | Đặt timeout hợp lý (30 giây) và kích hoạt fallback tự động. |
| **ASM-04** | Cơ sở dữ liệu PostgreSQL 16 và Redis chạy trong cụm Docker Compose đủ đáp ứng mức tải 100 người dùng đồng thời trên 1 máy chủ ảo tiêu chuẩn (4 vCPU, 8GB RAM). | Kiến trúc ứng dụng được thiết kế tối ưu, câu lệnh SQL đơn giản có index. | Máy chủ bị cạn kiệt RAM nếu dung lượng tin nhắn tăng nhanh. | Giám sát tài nguyên container bằng `docker stats` và chạy kiểm thử tải ở Phase 05. |

---

## 3. Quy Trình Cập Nhật & Đóng Câu Hỏi Mở (Decision Closure Protocol)

1. Mọi câu hỏi mở thuộc nhóm `OPEN` bắt buộc phải được thảo luận và chốt trạng thái `DECIDED` trước khi bước vào Phase thực hiện tương ứng.
2. Khi một quyết định được thông qua, phải ghi rõ người phê duyệt, ngày quyết định và cập nhật lại các tài liệu liên quan (SRS, WBS, Architecture).
3. Tuyệt đối không để câu hỏi mở tồn tại ở trạng thái chưa giải quyết khi bước qua Quality Gate G2 (Design Ready).
