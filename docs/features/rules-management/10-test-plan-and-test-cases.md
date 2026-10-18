# PHẦN 10: KẾ HOẠCH KIỂM THỬ & BỘ CA KIỂM THỬ CHI TIẾT (TEST PLAN & TEST CASES)
## Phân Hệ: Quản Lý Quy Tắc (Rules Management — Rules Library & Rule Editor)
### Dự Án: Nền Tảng Trợ Lý Ảo AI-Chan (AI-Chan Assistant Platform)

---

| Thông Tin Quản Trị | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `RUL-DOC-10` |
| **Nhánh Tính Năng** | **Rules Management (Rules Library & Rule Editor)** |
| **Trạng Thái Quản Trị** | **`PROPOSED (Chờ Duyệt Từ Architecture Board & Product Owner)`** |
| **Phiên Bản** | `1.0.0-PROPOSAL` |
| **Ngày Ban Hành** | `2026-10-18` |
| **Tác Giả / Vai Trò** | Senior QA Lead & Automation Test Engineer |

---

## 1. Chiến Lược Kiểm Thử (Testing Strategy & Pyramid)

Phân hệ Quản Lý Quy Tắc áp dụng mô hình Kim Tự Tháp Kiểm Thử 3 cấp độ (Testing Pyramid) nhằm đảm bảo chất lượng phần mềm toàn diện trước khi phát hành:

1. **Tầng 1: Kiểm Thử Đơn Vị (Unit Testing — 70%)**:
   - Kiểm thử độc lập từng hàm trong `rule_service.py`, các validator Pydantic v2 schemas và các hàm tiện ích UI (hàm khử khuẩn XSS `DOMPurify`, hàm định dạng ngày tháng).
   - Công cụ: `pytest`, `pytest-mock`, `vitest`.
   - Ngưỡng nghiệm thu: Độ bao phủ mã nguồn (Code Coverage) đạt tối thiểu **85%**.
2. **Tầng 2: Kiểm Thử Tích Hợp (Integration Testing — 20%)**:
   - Kiểm thử tương tác giữa Router, Service và Cơ sở dữ liệu PostgreSQL thực tế (sử dụng Test Database / Testcontainers).
   - Kiểm tra các ràng buộc: Unique partial index, Foreign keys cascade, Soft-delete filtering, Anti-IDOR object permissions.
   - Công cụ: `pytest-asyncio`, `httpx.AsyncClient`.
3. **Tầng 3: Kiểm Thử Đầu Cuối (End-to-End Testing — 10%)**:
   - Kiểm thử luồng người dùng hoàn chỉnh trên trình duyệt thật: Từ đăng nhập -> mở Thư viện Rules -> Tạo mới -> Preview Markdown -> Lưu -> Kiểm tra cảnh báo Dirty state khi thoát.
   - Công cụ: `Playwright`.

---

## 2. Bảng Danh Mục Ca Kiểm Thử Toàn Diện (`RUL-TC-001` .. `RUL-TC-020`)

| Mã Test Case | Tên Ca Kiểm Thử | Phân Loại & Mức Ưu Tiên | Tiền Điều Kiện | Các Bước Thực Hiện (Test Steps) | Kết Quả Mong Đợi (Expected Results) | Ánh Xạ Yêu Cầu |
| :---: | :--- | :---: | :--- | :--- | :--- | :---: |
| **RUL-TC-001** | **Xem Danh Sách Rules Khả Dụng** | Happy Path<br>`P0 (Must Have)` | User A đã đăng nhập, CSDL có 3 System Rules và 2 Rules của User A. | 1. Gửi request `GET /api/v1/rules`. | - HTTP 200 OK.<br>- Trả về đúng 5 Rules (3 System + 2 User A).<br>- Mỗi item có đầy đủ metadata và badge tương ứng. | `RUL-FR-001`<br>`RUL-BR-003` |
| **RUL-TC-002** | **Tìm Kiếm Tức Thì Theo Từ Khóa** | Happy Path<br>`P0 (Must Have)` | Danh sách có Rules: "Clean Code", "Bảo mật", "TypeScript". | 1. Nhập "bao mat" vào ô tìm kiếm.<br>2. Chờ 300ms debounce. | - Client hiển thị đúng Rule "Bảo mật" (hỗ trợ không dấu).<br>- Số lượng kết quả: "Tìm thấy 1 quy tắc". | `RUL-FR-002`<br>`RUL-BR-008` |
| **RUL-TC-003** | **Lọc Theo Scope và Activation Mode** | Happy Path<br>`P1 (Should Have)`| Danh sách gồm nhiều Rule với các scope và mode khác nhau. | 1. Chọn dropdown Scope = "System".<br>2. Chọn Activation Mode = "glob". | - Danh sách chỉ hiển thị các System Rule có mode glob.<br>- URL query params được cập nhật tương ứng. | `RUL-FR-002` |
| **RUL-TC-004** | **Tạo Mới Rule Thành Công** | Happy Path<br>`P0 (Must Have)` | User A đã đăng nhập, form tạo mới hợp lệ. | 1. Điền Tên: "Quy Chuẩn Git", Nội dung: "# Git Rules".<br>2. Chọn Mode: "always_on".<br>3. Bấm "Lưu Quy Tắc". | - HTTP 201 Created.<br>- Bản ghi được chèn vào CSDL với `user_id = User A`, `version = 1`.<br>- Toast xanh lá thông báo thành công. | `RUL-FR-006`<br>`RUL-BR-004` |
| **RUL-TC-005** | **Bắt Lỗi Trùng Tên Rule Trong Tài Khoản** | Negative / Error<br>`P0 (Must Have)` | User A đã có Rule tên "Quy Chuẩn Git". | 1. User A tạo Rule mới cùng tên "quy chuẩn git" (chữ thường).<br>2. Bấm "Lưu". | - HTTP 409 Conflict.<br>- Mã lỗi: `RULE_NAME_ALREADY_EXISTS`.<br>- Form hiển thị viền đỏ dưới ô Tên. | `RUL-FR-006`<br>`RUL-BR-001` |
| **RUL-TC-006** | **Chống IDOR: Không Thể Đọc Rule Của Người Khác** | Security / Auth<br>`P0 (Must Have)` | User B có Rule `ID_B`. User A đã đăng nhập. | 1. User A gửi request `GET /api/v1/rules/{ID_B}`. | - HTTP 404 Not Found (Bảo vệ thông tin UUID).<br>- Không trả về dữ liệu nội dung của User B. | `RUL-FR-001`<br>`RUL-BR-003`<br>`RUL-CTRL-002` |
| **RUL-TC-007** | **Chống IDOR: Không Thể Sửa Rule Của Người Khác** | Security / Auth<br>`P0 (Must Have)` | User B có Rule `ID_B`. User A đã đăng nhập. | 1. User A gửi `PUT /api/v1/rules/{ID_B}` kèm body mới. | - HTTP 404 Not Found.<br>- Bản ghi của User B trong CSDL không bị thay đổi. | `RUL-FR-007`<br>`RUL-BR-003`<br>`RUL-CTRL-002` |
| **RUL-TC-008** | **Ngăn Chặn Sửa System Rule (Bất Biến)** | Security / Role<br>`P0 (Must Have)` | System Rule `SYS_01`. User A là người dùng bình thường. | 1. User A gửi `PUT /api/v1/rules/{SYS_01}`. | - HTTP 403 Forbidden.<br>- Mã lỗi: `CANNOT_MODIFY_SYSTEM_RULE`.<br>- System Rule giữ nguyên dữ liệu gốc. | `RUL-FR-008`<br>`RUL-BR-002`<br>`RUL-CTRL-001` |
| **RUL-TC-009** | **Nhân Bản System Rule Thành User Rule** | Happy Path<br>`P1 (Should Have)`| System Rule `SYS_01` ("Clean Code"). User A đã đăng nhập. | 1. User A gửi `POST /api/v1/rules/{SYS_01}/clone`. | - HTTP 201 Created.<br>- Rule mới có tên "Clean Code (Copy)", `user_id = User A`, `scope = 'user'`. | `RUL-FR-004`<br>`RUL-BR-012` |
| **RUL-TC-010** | **Xóa Mềm Rule Đang Dùng Khi force=false** | Boundary / Guard<br>`P0 (Must Have)` | Rule `R_01` đang được liên kết trong 2 Project. | 1. Gửi `DELETE /api/v1/rules/{R_01}?force=false`. | - HTTP 400 Bad Request.<br>- Mã lỗi: `RULE_IN_USE_BY_PROJECTS`.<br>- Trả về danh sách 2 Project bị ảnh hưởng. | `RUL-FR-005`<br>`RUL-BR-007` |
| **RUL-TC-011** | **Xóa Mềm Rule Thành Công Khi force=true** | Happy Path<br>`P0 (Must Have)` | Rule `R_01` đang liên kết 2 Project. | 1. Gửi `DELETE /api/v1/rules/{R_01}?force=true`. | - HTTP 200 OK.<br>- `deleted_at` được gán mốc giờ hiện tại UTC.<br>- Bảng `project_rules` cập nhật `is_enabled = false`. | `RUL-FR-005`<br>`RUL-BR-006` |
| **RUL-TC-012** | **Xử Lý Xung Đột Ghi Đè (Optimistic Lock)** | Concurrency<br>`P1 (Should Have)`| Rule `R_01` có `version = 2`. Phiên khác vừa update lên `version = 3`. | 1. Client gửi `PUT /api/v1/rules/{R_01}` với `version = 2`. | - HTTP 409 Conflict.<br>- Mã lỗi: `CONCURRENT_UPDATE_CONFLICT`.<br>- Client hiển thị Modal cảnh báo xung đột phiên. | `RUL-FR-007`<br>`RUL-BR-011` |
| **RUL-TC-013** | **Bảo Vệ Biểu Mẫu Chưa Lưu (Dirty Form Guard)** | UX / Client<br>`P0 (Must Have)` | User đang sửa nội dung trên form (`isDirty = true`). | 1. Click menu chuyển sang `/projects`.<br>2. Quan sát giao diện. | - Hiển thị Modal: "Thay đổi chưa được lưu".<br>- Nếu bấm "Ở lại", màn hình giữ nguyên.<br>- Nếu bấm "Rời đi", điều hướng thành công. | `RUL-FR-010`<br>`RUL-BR-009` |
| **RUL-TC-014** | **Khử Khuẩn Stored XSS Trong Markdown Preview**| Security / XSS<br>`P0 (Must Have)` | Form tạo Rule mới. | 1. Nhập nội dung: `# Test <img src=x onerror=alert(1)>`.<br>2. Chuyển sang tab "Xem Trước" (Preview). | - Thẻ `<img>` bị loại bỏ hoặc vô hiệu hóa thuộc tính `onerror`.<br>- Không có hộp thoại `alert(1)` nào được kích hoạt. | `RUL-FR-009`<br>`RUL-BR-010`<br>`RUL-CTRL-004` |
| **RUL-TC-015** | **Kiểm Tra Giới Hạn Ký Tự Nội Dung (> 10k)** | Validation<br>`P0 (Must Have)` | Form tạo Rule mới. | 1. Paste đoạn văn bản dài 10.001 ký tự vào ô Markdown.<br>2. Bấm "Lưu". | - Client báo đỏ: "Nội dung vượt quá 10.000 ký tự".<br>- Chặn không gửi request lên backend. | `RUL-FR-006`<br>`RUL-BR-004` |
| **RUL-TC-016** | **Chặn Tấn Công Path Traversal Trong Glob Pattern**| Security / Path<br>`P1 (Should Have)`| Form tạo Rule với mode = 'glob'. | 1. Nhập glob: `../../../../etc/passwd`.<br>2. Bấm "Lưu". | - HTTP 422 Unprocessable Entity.<br>- Báo lỗi: "Glob pattern không được chứa ký tự điều hướng thư mục cha ..". | `RUL-FR-006`<br>`RUL-CTRL-005` |
| **RUL-TC-017** | **Bật/Tắt Nhanh Trạng Thái (PATCH Status)** | Happy Path<br>`P1 (Should Have)`| Rule `R_01` đang có `status = 'active'`. | 1. Gạt switch sang Tắt trên giao diện thư viện. | - HTTP 200 OK.<br>- CSDL cập nhật `status = 'inactive'`.<br>- UI đổi màu công tắc ngay lập tức. | `RUL-FR-003` |
| **RUL-TC-018** | **Hiển Thị 6 Trạng Thái Giao Diện Thư Viện** | UX Quality<br>`P0 (Must Have)` | Các kịch bản mạng và dữ liệu khác nhau. | 1. Thử nghiệm: Loading, Empty, Populated, No-Results, Error 500, 401. | - 100% các trạng thái hiển thị đúng wireframe chuẩn, không bị vỡ giao diện hay treo màn hình trắng. | `RUL-FR-001`<br>`RUL-NFR-007` |
| **RUL-TC-019** | **Liên Kết Rule Vào Project (Project Binding)** | Integration<br>`P1 (Should Have)`| Project `P_01` và Rule `R_01`. | 1. Gửi `PUT /api/v1/projects/{P_01}/rules` với `[R_01]`. | - HTTP 200 OK.<br>- Bảng `project_rules` có bản ghi liên kết hợp lệ với `is_enabled = true`. | `RUL-FR-012` |
| **RUL-TC-020** | **Kiểm Thử Hồi Quy Toàn Hệ Thống (Regression)** | Regression<br>`P0 (Must Have)` | Các phân hệ Chat, System Prompts, Tools, Skills đang chạy. | 1. Chạy toàn bộ test suites hiện hữu của `ai-backend`. | - 100% các bài test cũ vượt qua (PASS).<br>- Không làm ảnh hưởng đến luồng chat hay các endpoint sẵn có. | `RUL-NFR-009` |
