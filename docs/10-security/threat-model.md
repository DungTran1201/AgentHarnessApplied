# MÔ HÌNH ĐE DỌA AN NINH STRIDE (STRIDE THREAT MODEL)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `SEC-THR-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Phân tích bề mặt tấn công và mô hình hóa 6 mối đe dọa an ninh chính dựa trên phương pháp luận STRIDE |

---

## 1. Ranh Giới Tin Cậy & Điểm Xâm Nhập (Trust Boundaries & Entry Points)

- **Ranh Giới Tin Cậy 1 (TB-001)**: Giữa Internet công cộng (Untrusted) và Ingress Nginx Proxy.
- **Ranh Giới Tin Cậy 2 (TB-002)**: Giữa Nginx Proxy và các Container nội bộ (`frontend`, `backend`, `postgres`, `redis`).
- **Điểm Xâm Nhập (Entry Points)**:
  - `ENTRY-001`: Cổng Nginx Ingress (Port 80 HTTP, Port 443 HTTPS).
  - `ENTRY-002`: Các router API của Backend (`/api/v1/*`).

---

## 2. Bảng Phân Tích Mối Đe Dọa Theo Danh Mục STRIDE

| Mã Đe Dọa | Tên Mối Đe Dọa | Phân Loại STRIDE | Mức Độ Rủi Ro | Mô Tả Kịch Bản Tấn Công | Tài Sản Bị Đe Dọa |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`THR-001`** | Nghe lén đường truyền (Packet Sniffing / MitM) | Information Disclosure | **Nghiêm trọng (Critical)** | Kẻ tấn công đánh cắp dữ liệu prompt và session token trên đường truyền mạng công cộng chưa mã hóa. | Thông tin cá nhân, Cookie phiên |
| **`THR-002`** | Tấn công từ chối dịch vụ HTTP Flood & API DDoS | Denial of Service | **Cao (High)** | Kẻ tấn công gửi hàng nghìn request liên tục làm nghẽn tiến trình Backend và vắt kiệt hạn ngạch LLM. | Tính sẵn sàng của hệ thống, Ngân sách API |
| **`THR-003`** | Tấn công cạn kiệt kết nối (Slowloris Attack) | Denial of Service | **Cao (High)** | Kẻ tấn công mở hàng trăm kết nối socket và truyền dữ liệu cực chậm làm cạn kiệt connection pool. | Băng thông và socket máy chủ |
| **`THR-004`** | Tràn bộ đệm & Bơm tải trọng lớn (Payload Flooding) | Denial of Service | **Trung bình (Medium)**| Gửi body JSON quá lớn (hàng chục MB) làm tràn RAM tiến trình xử lý văn bản. | Bộ nhớ máy chủ Backend |
| **`THR-005`** | Nhúng khung lừa đảo (Clickjacking) & MIME Confusion | Tampering / Spoofing | **Trung bình (Medium)**| Nhúng giao diện website vào iframe độc hại hoặc khai thác MIME type sniffing. | Trải nghiệm người dùng |
| **`THR-006`** | Truy cập trái phép đối tượng trực tiếp (IDOR) | Elevation of Privilege | **Nghiêm trọng (Critical)** | Người dùng A sửa đổi ID thành `conv_id` của Người dùng B để đọc trộm hoặc xóa lịch sử chat của nạn nhân. | Quyền riêng tư dữ liệu cá nhân (`BR-002`) |


