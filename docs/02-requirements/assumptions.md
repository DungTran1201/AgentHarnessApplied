# DANH MỤC CÁC GIẢ ĐỊNH YÊU CẦU DỰ ÁN (ASSUMPTIONS REGISTER)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `ASM-REG-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Minh bạch hóa toàn bộ các tiền đề giả định kỹ thuật và nghiệp vụ làm cơ sở cho bản thiết kế yêu cầu |
| **Quy tắc cốt lõi** | **Phân loại rõ ràng `[ASSUMPTION]`, không bao giờ âm thầm coi giả định là sự thật hiển nhiên** |

---

## 1. Bảng Chi Tiết Các Giả Định Nghiệp Vụ & Kỹ Thuật (Assumptions Catalog)

---

### ASM-001: Khả Năng Hỗ Trợ Giao Thức Stream Của Trình Duyệt
- **Mã Giả Định**: `ASM-001`
- **Phân Loại**: Kỹ thuật (Technical Client).
- **Phát Biểu Giả Định**: Người dùng cuối sử dụng các phiên bản trình duyệt web hiện đại (Google Chrome 90+, Mozilla Firefox 88+, Apple Safari 14+, Microsoft Edge 90+) có hỗ trợ đầy đủ chuẩn Fetch API Streams và Server-Sent Events (SSE).
- **Cơ Sở Xác Lập**: Hơn 98% thị phần trình duyệt toàn cầu hiện nay hỗ trợ đầy đủ các tính năng web stream này.
- **Rủi Ro Nếu Giả Định Sai**: Người dùng sử dụng các trình duyệt quá cũ (như Internet Explorer 11) sẽ không hiển thị được hiệu ứng gõ chữ streaming trực tiếp.
- **Biện Pháp Giảm Thiểu & Kiểm Chứng**: Giao diện Client cài đặt cơ chế tự động phát hiện: Nếu trình duyệt không hỗ trợ Fetch Stream, tự động chuyển về cơ chế gọi REST đồng bộ thông thường và hiển thị toàn văn câu trả lời khi hoàn tất.

---

### ASM-002: Phạm Vi Dữ Liệu Đàm Thoại Thuần Văn Bản Trong Phiên Bản MVP
- **Mã Giả Định**: `ASM-002`
- **Phân Loại**: Nghiệp vụ (Business Scope).
- **Phát Biểu Giả Định**: Toàn bộ dữ liệu trao đổi giữa người dùng và trợ lý ảo trong giai đoạn 1 (MVP) hoàn toàn là định dạng văn bản (Plain Text / Markdown), không bao gồm âm thanh thời gian thực hoặc tệp đính kèm đa phương tiện.
- **Cơ Sở Xác Lập**: Phạm vi được giới hạn tinh gọn trong SRS để tập trung tối ưu hóa trải nghiệm đàm thoại cốt lõi và kiểm soát chi phí ban đầu.
- **Rủi Ro Nếu Giả Định Sai**: Người dùng có kỳ vọng muốn tải file PDF/Word lên ngay để nhờ AI tóm tắt tài liệu.
- **Biện Pháp Giảm Thiểu & Kiểm Chứng**: Bổ sung dòng thông báo chỉ dẫn rõ ràng trên khung chat: *"Phiên bản hiện tại hỗ trợ đàm thoại văn bản. Tính năng tải tệp tài liệu sẽ sớm được ra mắt."*

---

### ASM-003: Tính Ổn Định Của Đường Truyền Mạng Kết Nối AI Quốc Tế
- **Mã Giả Định**: `ASM-003`
- **Phân Loại**: Hạ tầng & Môi trường (Infrastructure).
- **Phát Biểu Giả Định**: Máy chủ triển khai Backend (`ai-backend`) có kết nối mạng Internet ra ngoài thông suốt với băng thông tối thiểu 100 Mbps và độ trễ tới các máy chủ Google Cloud AI (khu vực Singapore/Mỹ) và OpenAI dưới 200ms.
- **Cơ Sở Xác Lập**: Các trung tâm dữ liệu và nhà cung cấp dịch vụ đám mây tiêu chuẩn đều đáp ứng ngưỡng băng thông này.
- **Rủi Ro Nếu Giả Định Sai**: Tỷ lệ timeout khi gọi AI tăng cao trong các sự cố đứt cáp quang biển quốc tế.
- **Biện Pháp Giảm Thiểu & Kiểm Chứng**: Thiết lập thời gian timeout hợp lý (30 giây) và kích hoạt cơ chế tự động Failover giữa hai nhà cung cấp đa vùng (`FR-011`).

---

### ASM-004: Ngôn Ngữ Giao Tiếp Trọng Tâm Là Tiếng Việt & Tiếng Anh
- **Mã Giả Định**: `ASM-004`
- **Phân Loại**: Nghiệp vụ & Bản địa hóa (Localization).
- **Phát Biểu Giả Định**: Người dùng mục tiêu của hệ thống tương tác chủ yếu bằng tiếng Việt và tiếng Anh. Giao diện người dùng được hiển thị song ngữ hoặc tiếng Việt mặc định.
- **Cơ Sở Xác Lập**: Cả hai mô hình Google Gemini và OpenAI GPT-4o đều có khả năng hiểu và xử lý ngôn ngữ tự nhiên tiếng Việt ở mức độ rất cao.
- **Rủi Ro Nếu Giả Định Sai**: Người dùng sử dụng các ngôn ngữ hiếm có thể gặp hiện tượng dịch thuật không tự nhiên.
- **Biện Pháp Giảm Thiểu & Kiểm Chứng**: Thiết lập System Instruction định hướng AI nhận diện ngôn ngữ của câu hỏi và phản hồi bằng đúng ngôn ngữ đó.

---

### ASM-005: Khả Năng Chịu Tải Của Hạ Tầng Docker Cục Bộ
- **Mã Giả Định**: `ASM-005`
- **Phân Loại**: Tài nguyên & Dung lượng (Capacity).
- **Phát Biểu Giả Định**: Hạ tầng máy chủ ảo hoặc máy chủ vật lý chạy cụm Docker Compose có cấu hình tối thiểu 4 vCPU và 8GB RAM, đủ để duy trì hiệu năng chịu tải 100 người dùng đồng thời theo `NFR-003`.
- **Cơ Sở Xác Lập**: FastAPI là một trong những web framework Python có hiệu năng cao nhất (ASGI nền tảng Starlette), PostgreSQL được tối ưu hóa chỉ mục và Nginx làm proxy đảo tiêu tốn rất ít tài nguyên.
- **Rủi Ro Nếu Giả Định Sai**: Máy chủ bị cạn kiệt RAM nếu dung lượng kết nối đồng thời tăng đột biến.
- **Biện Pháp Giảm Thiểu & Kiểm Chứng**: Chạy kiểm thử tải thực tế bằng Locust/k6 ở Phase 05 trước khi phát hành chính thức.
