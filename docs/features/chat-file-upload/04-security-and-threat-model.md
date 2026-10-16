# 04 - Đánh giá Rủi ro và Mô hình Đe dọa (Security & Threat Review)

## 1. Phân tích Mô hình Đe dọa (STRIDE Matrix)

| Phân loại Đe dọa (STRIDE) | Nguy cơ tiềm ẩn | Biện pháp giảm thiểu đã triển khai trong AI-Chan | Trạng thái |
| :--- | :--- | :--- | :---: |
| **Spoofing (Giả mạo)** | Người dùng đổi đuôi `.exe` thành `.png` hoặc giả mạo header `Content-Type` khi tải lên để vượt qua kiểm tra frontend. | **Chữ ký nhị phân (Magic Bytes):** Backend sử dụng thư viện `filetype` đọc các byte đầu tiên của file để xác định định dạng thực tế. Nếu phát hiện tệp thực thi PE/ELF (`application/x-dosexec`), tệp sẽ bị chặn ngay lập tức. | **ĐÃ GIẢM THIỂU** |
| **Tampering (Can thiệp / Path Traversal)** | Đặt tên tệp chứa ký tự độc hại như `../../../../etc/passwd` hoặc `..\..\Windows\System32` để ghi đè tệp hệ thống. | **Bảo vệ Đường dẫn:** <br>1. Tên tệp gốc được làm sạch bằng Regex `re.sub(r'[^\w\.-]', '_', ...)`.<br>2. Tệp vật lý được lưu trữ dưới tên ngẫu nhiên `att_{uuid}.dat` trong cây thư mục `database/uploads/{YYYY}/{MM}/`.<br>3. Kiểm tra tuyệt đối: `Path(target).resolve().is_relative_to(UPLOAD_DIR)`. | **ĐÃ GIẢM THIỂU** |
| **Information Disclosure (Lộ dữ liệu / IDOR)** | Người dùng A đoán `attachment_id` của người dùng B để tải về tệp tin nhạy cảm. | **Anti-IDOR:** Mọi endpoint `/attachments/{id}`, `/download`, `/view`, `/delete` và các hàm gắn tệp vào chat đều so sánh `attachment.user_id == current_user_id`. Nếu không trùng khớp, hệ thống trả về HTTP 404 (không tiết lộ sự tồn tại của tệp). | **ĐÃ GIẢM THIỂU** |
| **Denial of Service (Từ chối dịch vụ - DoS)** | Người dùng tải lên tệp hàng gigabyte để làm cạn kiệt dung lượng đĩa hoặc RAM của server. | **Giới hạn Kích thước & Bộ đệm:** <br>1. Giới hạn tối đa 20 MB / tệp và tối đa 5 tệp / request.<br>2. Đọc tệp theo từng chunk 64KB, dừng đọc ngay khi vượt quá ngưỡng.<br>3. Giới hạn trích xuất văn bản tối đa 12.000 ký tự để không làm tràn token window của LLM. | **ĐÃ GIẢM THIỂU** |
| **Elevation of Privilege (Leo thang đặc quyền)** | Kẻ tấn công tải lên file script (`.py`, `.js`, `.sh`, `.bat`, `.ps1`) vào Skill rồi kích hoạt thực thi từ xa trên host server. | **Chính sách Không Thực thi (Non-Execution Policy):** <br>1. Chặn toàn bộ đuôi mở rộng có khả năng thực thi trực tiếp trên host OS.<br>2. Toàn bộ file lưu trữ dưới dạng nhị phân `.dat` ngoài thư mục public.<br>3. Runtime AI-Chan coi các tài nguyên trong Skill là dữ liệu tham chiếu thụ động (passive reference data), không cấp quyền gọi `subprocess` hoặc `exec()`. | **ĐÃ GIẢM THIỂU** |
| **XSS & Prompt Injection** | Tệp HTML/SVG chứa script XSS hoặc tệp văn bản chứa prompt injection nhằm đánh lừa mô hình AI. | **Ngăn ngừa XSS & Cô lập Ngữ cảnh:** <br>1. Phục vụ tệp xem trước với `Content-Disposition: inline` và `X-Content-Type-Options: nosniff`.<br>2. Không render raw HTML/SVG từ tệp của người dùng.<br>3. Nội dung văn bản/PDF trích xuất được bao bọc trong khối phân cách định dạng rõ ràng: `--- [Tài liệu đính kèm: ...] ---` để mô hình nhận diện là dữ liệu đầu vào thay vì câu lệnh hệ thống. | **ĐÃ GIẢM THIỂU** |

---

## 2. Nhật ký & Vệ sinh Dữ liệu Nhạy cảm (Log Hygiene)

- **Không ghi nội dung tệp vào Logs:** Backend chỉ ghi lại metadata mức cao: `attachment_id`, `filename`, `size`, `mime_type`, `user_id`. Không bao giờ in binary bytes hoặc văn bản trích xuất ra log file hay stdout.
- **Không tiết lộ khóa API:** API keys của các provider (Google AI, OpenAI) được giữ tuyệt đối trong backend môi trường server (`os.getenv`), không gửi về frontend hay ghi vào error response.
- **Lưu trữ ngoài Git:** Đường dẫn `ai-backend/database/uploads/` được cấu hình cố định trong `.gitignore` để đảm bảo tệp tải lên của người dùng không bao giờ bị commit nhầm vào source control repository.
