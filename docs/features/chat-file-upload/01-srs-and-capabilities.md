# 01 - SRS và Ma trận Khả năng Xử lý Tệp (Capabilities Matrix)

## 1. Yêu cầu chức năng (Functional Requirements)

| Mã Yêu cầu | Tên chức năng | Mô tả chi tiết | Tiêu chí chấp nhận |
| :--- | :--- | :--- | :--- |
| **FR-ATT-001** | Upload tệp đa ngữ cảnh | Cho phép người dùng tải lên tệp nhị phân thông qua multipart API với `context_type` (`chat`, `project_chat`, `skill`, `system_prompt`). | Trả về `attachment_id`, lưu metadata vào DB và file `.dat` vào thư mục bảo vệ. |
| **FR-ATT-002** | Kiểm tra chữ ký Magic Bytes | Sử dụng `filetype` để phát hiện MIME thực tế của tệp, ngăn ngừa MIME spoofing. | Từ chối hoặc sửa đổi MIME nếu header từ client sai lệch với chữ ký nhị phân. |
| **FR-ATT-003** | Chặn tệp thực thi và Script | Tuyệt đối từ chối các định dạng có rủi ro thực thi: `.exe`, `.bat`, `.cmd`, `.ps1`, `.sh`, `.vbs`, `.php`, `.pif`, `.msi`. | Trả về mã lỗi `EXECUTABLE_FILE_BLOCKED` (HTTP 422). Không lưu tệp vào đĩa. |
| **FR-ATT-004** | Trích xuất nội dung Text & PDF | Tự động trích xuất nội dung văn bản (UTF-8) hoặc trang PDF (qua `pypdf`) để hỗ trợ mô hình text-only và tạo preview. | Lưu vào trường `extracted_preview` trong DB và đưa vào context prompt khi thích hợp. |
| **FR-ATT-005** | Native Multimodal Provider | Với các tệp ảnh (`image/png`, `image/jpeg`, `image/webp`, `image/gif`), mã hóa Base64 và truyền dạng part đa phương tiện tới mô hình AI. | Mô hình (Gemini / GPT-4o) nhận diện được hình ảnh và trả lời dựa trên nội dung ảnh. |
| **FR-ATT-006** | Project Graph Chat Attachment | Hỗ trợ đính kèm tệp trong Project Chat mà không làm thay đổi cấu hình Model, System Prompt, Skills và giới hạn số từ (word limit) của Graph. | Project workflow stream trả về phản hồi chính xác, liên kết attachment vào tin nhắn của project. |
| **FR-ATT-007** | Thư viện Skills Library Assets | Cho phép tải lên, xem, tải xuống và gỡ liên kết các tệp tài nguyên tham chiếu gắn với Skill. | Tệp xuất hiện trong tab Resources của Skill, duy trì sau reload, không tự ý execute script. |
| **FR-ATT-008** | Thư viện System Prompt Assets | Cho phép tải lên, xem, tải xuống và gỡ liên kết các tệp tài nguyên gắn với System Prompt. | Tệp gắn đúng với prompt id, thuộc quyền sở hữu của user, không tự động inject vào prompt nếu chưa chọn. |
| **FR-ATT-009** | Quản lý vòng đời và Tải xuống an toàn | Tải xuống qua endpoint có xác thực quyền sở hữu, không trả storage path nội bộ cho client. | Anti-IDOR: Người dùng khác không thể xem hoặc tải tệp của người dùng hiện tại (HTTP 404/403). |
| **FR-ATT-010** | Capabilities Endpoint | API cung cấp thông tin động về các mô hình, định dạng tệp hỗ trợ và giới hạn kích thước. | `GET /api/v1/attachments/capabilities` trả về danh sách model capabilities, allowed MIME types, max sizes. |

---

## 2. Yêu cầu phi chức năng (Non-Functional Requirements)

- **NFR-ATT-001 (Bảo mật Anti-IDOR):** Mọi endpoint `/attachments/*` đều kiểm tra `user_id` hiện tại thông qua token xác thực `get_current_user_id`. Không tiết lộ thông tin của tenant khác.
- **NFR-ATT-002 (Bảo vệ Path Traversal):** Tên tệp gốc được làm sạch bằng `re.sub(r'[^\w\.-]', '_', ...)`. File trên đĩa được lưu bằng UUID ngẫu nhiên `att_...dat` trong cây thư mục phân mảnh theo năm/tháng.
- **NFR-ATT-003 (Bảo vệ DoS / File Size Limits):** Giới hạn mặc định: tối đa 20 MB / tệp, tối đa 5 tệp / lượt gửi, độ dài trích xuất văn bản tối đa 12.000 ký tự (context budget) để tránh tràn token window.
- **NFR-ATT-004 (Lưu trữ ngoài Git & Public Web):** Thư mục lưu trữ `ai-backend/database/uploads/` được cấu hình ngoài thư mục `public/` và được đưa vào `.gitignore`.
- **NFR-ATT-005 (Trải nghiệm người dùng UI):** Drag-and-drop mượt mà, hiển thị tiến độ % tải lên, xem trước thumbnail an toàn, hỗ trợ Retry và Hủy bỏ tệp lỗi.
- **NFR-ATT-006 (Toàn vẹn dữ liệu Migration):** Migration `015_unified_file_upload_system.sql` tương thích tiến về phía trước, giữ nguyên cấu trúc schema hiện hữu và hỗ trợ cập nhật động các trường còn thiếu.

---

## 3. Ma trận Khả năng Xử lý của Mô hình (Model Capabilities Matrix)

| Provider | Model Identifier | Image Input (Native) | PDF Input | Text / Code / Docs | Giới hạn tệp tối đa | Phương thức xử lý trong AI-Chan |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Google** | `gemini-2.5-flash`<br>`gemini-2.5-pro`<br>`gemini-3.8-flash` | **Có** (Native Part) | **Có** (Text/PDF Extract) | **Có** (Text Extract) | 20 MB | Gửi ảnh dạng base64 inline data URI; gửi văn bản/PDF qua delimited context block. |
| **OpenAI** | `gpt-4o`<br>`gpt-4o-mini` | **Có** (Native Part) | **Có** (Text/PDF Extract) | **Có** (Text Extract) | 20 MB | Gửi ảnh qua `image_url` data URI; gửi tài liệu văn bản qua context delimiters. |
| **Local Simulator** | `mock-agent`<br>`local-sim` | **Có** (Simulated Part) | **Có** (Extracted text) | **Có** (Extracted text) | 20 MB | Phân tích file metadata và trích xuất nội dung để mô phỏng câu trả lời trực tiếp trong test. |

---

## 4. Danh mục định dạng và Quy tắc Xử lý

| Nhóm định dạng | Phần mở rộng mẫu | MIME thực tế | Chiến lược xử lý |
| :--- | :--- | :--- | :--- |
| **Ảnh (Images)** | `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif` | `image/png`, `image/jpeg`, `image/webp`, `image/gif` | Kiểm tra magic bytes -> Lưu đĩa an toàn -> Đóng gói Base64 Data URI vào LangChain `HumanMessage` parts. |
| **Văn bản & Code** | `.txt`, `.md`, `.py`, `.js`, `.ts`, `.json`, `.csv`, `.html`, `.css` | `text/plain`, `text/markdown`, `application/json`, v.v. | Kiểm tra UTF-8 -> Lưu đĩa -> Trích xuất preview -> Ghép vào prompt với dấu phân cách: `--- [Tài liệu đính kèm: {tên}] ---`. |
| **Tài liệu PDF** | `.pdf` | `application/pdf` | Kiểm tra header `%PDF` -> Đọc các trang bằng `pypdf` -> Trích xuất văn bản có đánh số trang -> Bơm vào prompt context. |
| **Tệp bị cấm (Blocked)** | `.exe`, `.bat`, `.ps1`, `.cmd`, `.sh`, `.vbs`, `.php`, `.pif` | `application/x-dosexec`, v.v. | **Từ chối ngay lập tức** trước khi ghi đĩa. Trả về mã lỗi `EXECUTABLE_FILE_BLOCKED`. |
