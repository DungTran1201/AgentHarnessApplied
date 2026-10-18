# PHẦN 01: BẢNG KIỂM KÊ TÍNH NĂNG & MA TRẬN PHẠM VI (FEATURE INVENTORY & SCOPE)
## Phân Hệ: Quản Lý Quy Tắc (Rules Management — Rules Library & Rule Editor)
### Dự Án: Nền Tảng Trợ Lý Ảo AI-Chan (AI-Chan Assistant Platform)

---

| Thông Tin Quản Trị | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `RUL-DOC-01` |
| **Nhánh Tính Năng** | **Rules Management (Rules Library & Rule Detail / Editor)** |
| **Trạng Thái Quản Trị** | **`IMPLEMENTED (Triển khai hoàn tất Frontend + Backend + Migration + Tests)`** |
| **Phiên Bản** | `1.1.0-IMPLEMENTED` |
| **Ngày Ban Hành** | `2026-10-18` |
| **Tác Giả / Vai Trò** | Senior Business Analyst & Solution Architect |

---

## 1. Giới Thiệu & Mục Tiêu Phân Hệ (Module Purpose)

Phân hệ **Quản Lý Quy Tắc (Rules Management)** cung cấp nền tảng quản trị vòng đời tập trung cho các chỉ dẫn, quy ước, tiêu chuẩn kiến trúc, ràng buộc an ninh và chuẩn mực hành vi định hướng hoạt động của Agent trong AI-Chan. 

Quy tắc (Rule) là các mệnh đề mang tính **ràng buộc thụ động (Passive Constraints)** hoặc **tiêu chuẩn hành vi (Behavioral Directives)**, khác biệt hoàn toàn với:
- **System Prompt**: Định hình phong cách hội thoại và vai trò (Persona).
- **Skill**: Quy trình hành động chủ động nhiều bước kèm tài nguyên và scripts.
- **Tool**: Khả năng tương tác với thế giới bên ngoài (API/Sandbox execution).

Hồ sơ này xác định danh mục tính năng chi tiết, phân rã ranh giới MVP và ngoài phạm vi, cùng ma trận phân quyền cho các nhóm tác nhân (Actors).

---

## 2. Bảng Kiểm Kê Tính Năng Toàn Diện (Comprehensive Feature Inventory)

Các tính năng được đánh mã ổn định theo định dạng `RUL-F-###`.

### 2.1. Phân Nhóm 1: Quản Lý Thư Viện Rules (Rules Library — `RUL-F-001` .. `RUL-F-015`)

| Mã Tính Năng | Tên Tính Năng | Mô Tả Nghiệp Vụ Chi Tiết | Phân Loại Phạm Vi | Mức Độ Ưu Tiên |
| :---: | :--- | :--- | :---: | :---: |
| **RUL-F-001** | **Xem Danh Sách Rules** | Hiển thị danh sách các Rule khả dụng của người dùng hiện tại và các Rule chuẩn của hệ thống (System Rules) dưới dạng bảng (Table View) hoặc lưới thẻ (Card View). | **Trong MVP** | `P0 (Must Have)` |
| **RUL-F-002** | **Tìm Kiếm Tức Thì (Instant Search)** | Tìm kiếm nhanh không cần reload trang theo Tên Rule (`name`), Mô tả (`description`) và Tag phân loại (`tags`). Hỗ trợ tiếng Việt có dấu và không phân biệt chữ hoa/thường. | **Trong MVP** | `P0 (Must Have)` |
| **RUL-F-003** | **Lọc Theo Phạm Vi Lưu Trữ (Filter by Storage Scope)** | Cho phép lọc danh sách theo: `Tất cả`, `Của tôi (User Scope)`, `Hệ thống (System Scope)`. | **Trong MVP** | `P0 (Must Have)` |
| **RUL-F-004** | **Lọc Theo Chế Độ Kích Hoạt (Filter by Activation Mode)** | Lọc danh sách theo cơ chế kích hoạt: `always_on` (Luôn kích hoạt), `model_decision` (Model tự chọn), `glob` (Theo mẫu file/ngữ cảnh), `manual` (Gán thủ công). | **Trong MVP** | `P1 (Should Have)` |
| **RUL-F-005** | **Lọc Theo Trạng Thái (Filter by Status)** | Lọc danh sách theo trạng thái hoạt động: `Active` (Đang hoạt động), `Inactive` (Tạm ngưng), `Archived` (Đã lưu trữ). | **Trong MVP** | `P1 (Should Have)` |
| **RUL-F-006** | **Sắp Xếp Danh Sách (Sorting)** | Hỗ trợ sắp xếp linh hoạt theo: Thời gian cập nhật mới nhất (Mặc định), Tên A-Z, Tên Z-A, và Mức độ ưu tiên (`priority`). | **Trong MVP** | `P0 (Must Have)` |
| **RUL-F-007** | **Phân Trang / Phân Đoạn Dữ Liệu (Pagination)** | Hỗ trợ phân trang linh hoạt (10, 20, 50 bản ghi/trang) với tổng số trang và bộ đếm tổng số bản ghi từ backend. | **Trong MVP** | `P1 (Should Have)` |
| **RUL-F-008** | **Hiển Thị Huy Hiệu Metadata (Metadata Badges)** | Hiển thị rõ ràng huy hiệu trực quan cho từng Rule: Huy hiệu Scope (`System` / `User`), Huy hiệu Trigger (`Always On`, `Model Decision`, `Glob`), Đếm số từ/ký tự. | **Trong MVP** | `P0 (Must Have)` |
| **RUL-F-009** | **Xem Số Lượng Dự Án Liên Kết (Usage Count)** | Hiển thị số lượng Project hiện đang sử dụng/liên kết với Rule đó để người dùng nhận biết tầm ảnh hưởng trước khi sửa/xóa. | **Trong MVP** | `P1 (Should Have)` |
| **RUL-F-010** | **Bật/Tắt Trạng Thái Nhanh (Quick Toggle Status)** | Cho phép bật hoặc tắt nhanh trạng thái `Active` / `Inactive` của Rule từ ngay trên giao diện thư viện mà không cần vào trang chi tiết. | **Trong MVP** | `P1 (Should Have)` |
| **RUL-F-011** | **Xử Lý 6 Trạng Thái Giao Diện Thư Viện** | Đáp ứng hoàn hảo các trạng thái: `Loading` (Skeleton), `Populated` (Có dữ liệu), `Empty` (Chưa có rule nào), `No-Results` (Không tìm thấy kết quả tìm kiếm), `Error` (Lỗi tải API), `Unauthorized` (Chưa đăng nhập). | **Trong MVP** | `P0 (Must Have)` |
| **RUL-F-012** | **Nhân Bản Rule (Clone / Duplicate Rule)** | Tạo bản sao của một Rule có sẵn (kể cả System Rule) vào không gian của người dùng hiện tại để tiện chỉnh sửa cá nhân hóa. Tự động thêm hậu tố `(Copy)`. | **Trong MVP** | `P1 (Should Have)` |
| **RUL-F-013** | **Xóa An Toàn / Lưu Trữ (Soft Delete / Archive)** | Cho phép xóa mềm hoặc lưu trữ Rule với hộp thoại cảnh báo xác nhận. Ngăn chặn xóa cứng gây mất toàn vẹn liên kết dữ liệu với các dự án cũ. | **Trong MVP** | `P0 (Must Have)` |
| **RUL-F-014** | **Xuất Dữ Liệu Rule (Export to Markdown / JSON)** | Tải Rule về máy dưới dạng tệp `.md` chuẩn Antigravity (kèm YAML frontmatter) hoặc JSON để chia sẻ hoặc backup. | **Giai Đoạn 2** | `P2 (Nice to Have)` |
| **RUL-F-015** | **Nhập Dữ Liệu Rule (Import from Markdown / JSON)** | Tải tệp `.md` hoặc `.json` từ máy tính lên để tự động bóc tách frontmatter và nội dung thành Rule mới trong thư viện. | **Giai Đoạn 2** | `P2 (Nice to Have)` |

---

### 2.2. Phân Nhóm 2: Quản Lý Chi Tiết & Soạn Thảo Rule (Rule Detail & Editor — `RUL-F-016` .. `RUL-F-030`)

| Mã Tính Năng | Tên Tính Năng | Mô Tả Nghiệp Vụ Chi Tiết | Phân Loại Phạm Vi | Mức Độ Ưu Tiên |
| :---: | :--- | :--- | :---: | :---: |
| **RUL-F-016** | **Tạo Mới Rule (Create Rule)** | Giao diện biểu mẫu trực quan cho phép nhập: Tên Rule, Mô tả ngắn, Thẻ (Tags), Chế độ kích hoạt (Activation Mode), Glob patterns (nếu có), Mức ưu tiên và Nội dung. | **Trong MVP** | `P0 (Must Have)` |
| **RUL-F-017** | **Soạn Thảo Markdown Hai Chế Độ (Markdown Editor with Live Preview)** | Trình soạn thảo văn bản hỗ trợ cú pháp Markdown chuẩn với tab chuyển đổi linh hoạt: `Edit` (Soạn thảo) và `Preview` (Xem trước định dạng hiển thị với syntax highlighting). | **Trong MVP** | `P0 (Must Have)` |
| **RUL-F-018** | **Bộ Đếm Ký Tự & Cảnh Báo Giới Hạn** | Hiển thị số lượng ký tự/từ ngữ theo thời gian thực (ví dụ: `1,250 / 10,000 ký tự`). Cảnh báo trực quan khi vượt quá ngưỡng 10.000 ký tự. | **Trong MVP** | `P0 (Must Have)` |
| **RUL-F-019** | **Cấu Hình Chế Độ Kích Hoạt (Activation Configuration)** | Chọn 1 trong 4 mode: `always_on`, `model_decision`, `glob`, `manual`. Nếu chọn `glob`, giao diện mở thêm ô nhập danh sách mẫu đường dẫn file (ví dụ: `*.ts, src/components/**`). | **Trong MVP** | `P0 (Must Have)` |
| **RUL-F-020** | **Kiểm Tra Trùng Lặp Tên (Duplicate Name Validation)** | Tự động kiểm tra và báo lỗi tức thì nếu người dùng tạo hoặc sửa tên Rule trùng với một Rule khác đã tồn tại trong cùng tài khoản của họ. | **Trong MVP** | `P0 (Must Have)` |
| **RUL-F-021** | **Bảo Vệ Biểu Mẫu Chưa Lưu (Dirty State Guard)** | Theo dõi sự thay đổi trên form; nếu người dùng nhấn Hủy hoặc bấm chuyển trang khi đang có dữ liệu chưa lưu, hiển thị hộp thoại cảnh báo mất dữ liệu. | **Trong MVP** | `P0 (Must Have)` |
| **RUL-F-022** | **Xác Thực Dữ Liệu Phía Trình Duyệt (Client-Side Validation)** | Kiểm tra các trường bắt buộc (Tên: 1-100 ký tự; Nội dung: 1-10.000 ký tự; Glob hợp lệ nếu mode = glob) trước khi gửi yêu cầu lên backend. | **Trong MVP** | `P0 (Must Have)` |
| **RUL-F-023** | **Lưu Thay Đổi (Update Rule)** | Gửi yêu cầu cập nhật Rule lên backend, kiểm tra quyền sở hữu (Anti-IDOR), ghi nhận thời gian `updated_at`. | **Trong MVP** | `P0 (Must Have)` |
| **RUL-F-024** | **Xem Chi Tiết Dạng Chỉ Đọc (Read-Only Detail View)** | Hiển thị Rule chuẩn của hệ thống (System Rule) dưới dạng chỉ đọc; người dùng không có quyền sửa nhưng có nút `Clone to My Rules` để sao chép. | **Trong MVP** | `P0 (Must Have)` |
| **RUL-F-025** | **Xem Danh Sách Dự Án Đang Sử Dụng (Associated Projects List)** | Hiển thị danh sách các Project hiện đang liên kết với Rule này trong tab hoặc modal thông tin chi tiết. | **Trong MVP** | `P1 (Should Have)` |
| **RUL-F-026** | **Chặn Xóa Rule Đang Được Sử Dụng (Delete In-Use Guard)** | Nếu Rule đang được gán vào ít nhất một Project hoạt động, hiển thị cảnh báo nêu rõ các Project bị ảnh hưởng và yêu cầu người dùng xác nhận gỡ liên kết trước khi xóa. | **Trong MVP** | `P0 (Must Have)` |
| **RUL-F-027** | **Lịch Sử Phiên Bản Rule (Rule Versioning / Revision History)** | Lưu trữ lịch sử các lần sửa đổi nội dung của Rule, cho phép so sánh diff và khôi phục về phiên bản cũ. | **Giai Đoạn 2** | `P2 (Nice to Have)` |
| **RUL-F-028** | **Kiểm Tra Xung Đột Cập Nhật Đồng Thời (Optimistic Concurrency Check)** | Sử dụng trường `version` hoặc `updated_at` để phát hiện và ngăn chặn ghi đè khi có hai phiên làm việc cùng sửa một Rule (HTTP 409 Conflict). | **Trong MVP** | `P1 (Should Have)` |
| **RUL-F-029** | **Trợ Lý AI Tối Ưu Hóa Rule (AI Rule Lint & Enhance)** | Sử dụng LLM để phân tích quy tắc xem có quá mơ hồ, mâu thuẫn hay tốn kém token không, gợi ý câu chữ rõ ràng hơn. | **Giai Đoạn 3** | `P3 (Future Idea)` |
| **RUL-F-030** | **Quản Lý Biến Môi Trường Trong Rule (Template Variables in Rules)** | Cho phép chèn các biến định dạng `{{project_name}}`, `{{author}}` vào nội dung Rule và tự động phân giải khi chạy. | **Giai Đoạn 3** | `P3 (Future Idea)` |

---

### 2.3. Phân Nhóm 3: Tích Hợp Dự Án & Cơ Chế Thực Thi Runtime (`RUL-F-031` .. `RUL-F-040`)

| Mã Tính Năng | Tên Tính Năng | Mô Tả Nghiệp Vụ Chi Tiết | Phân Loại Phạm Vi | Mức Độ Ưu Tiên |
| :---: | :--- | :--- | :---: | :---: |
| **RUL-F-031** | **Liên Kết Rule Vào Project (Project-Rule Binding API)** | Cung cấp bảng quan hệ `project_rules` và API để gắn một hoặc nhiều Rule từ thư viện vào một Project cụ thể. | **Trong MVP (Backend API)** | `P1 (Should Have)` |
| **RUL-F-032** | **Quản Lý Danh Sách Rule Trong Cài Đặt Project** | Tab "Rules" trong màn hình cài đặt Project cho phép người dùng tick chọn các Rule áp dụng cho Project đó. | **Trong MVP** | `P1 (Should Have)` |
| **RUL-F-033** | **Node "Rule" Trên Project Canvas Graph** | Bổ sung loại Node `RuleNode` trên đồ thị Canvas của AI-Chan để trực quan hóa luồng dữ liệu của quy tắc vào Model Node. | **Giai Đoạn 2 (Đề Xuất)** | `P2 (Nice to Have)` |
| **RUL-F-034** | **Trình Phân Giải Quy Tắc Lúc Chạy (Runtime Rule Resolver Engine)** | Thuật toán quét và tổng hợp các Rule khả dụng khi bắt đầu phiên sinh chat, lọc theo activation mode và sắp xếp theo priority. | **Giai Đoạn 2 (Đề Xuất)** | `P2 (Nice to Have)` |
| **RUL-F-035** | **Khai Phá Lũy Tiến Lúc Chạy (Progressive Disclosure Engine)** | Tự động chỉ nạp metadata tóm tắt của các Rule `model_decision` vào system prompt; khi model cần mới nạp toàn văn để tiết kiệm context. | **Giai Đoạn 2 (Đề Xuất)** | `P2 (Nice to Have)` |
| **RUL-F-036** | **Chính Sách Giải Quyết Xung Đột (Conflict Resolution Policy)** | Cơ chế xác định thứ tự ưu tiên khi hai Rule đưa ra chỉ dẫn trái ngược nhau: Workspace Rule ghi đè Global Rule; Rule ưu tiên cao hơn ghi đè Rule thấp hơn. | **Giai Đoạn 2 (Đề Xuất)** | `P2 (Nice to Have)` |
| **RUL-F-037** | **Kiểm Soát Hạn Ngạch Token Của Rules (Token Budget Guard)** | Giới hạn tổng số lượng token mà toàn bộ Rules được chiếm dụng trong Context Window của mỗi lượt chat (ví dụ tối đa 2.000 tokens). | **Giai Đoạn 2 (Đề Xuất)** | `P2 (Nice to Have)` |
| **RUL-F-038** | **Kiểm Định An Ninh Nội Dung Rule (Rule Poisoning & Injection Guard)** | Bộ lọc kiểm tra nội dung Rule trước khi lưu để ngăn chặn kỹ thuật "Jailbreak / System Prompt Override" độc hại. | **Trong MVP** | `P0 (Must Have)` |
| **RUL-F-039** | **Nhật Ký Kiểm Toán Thao Tác (Audit Logging)** | Ghi log toàn bộ thao tác tạo, sửa, xóa, gắn kết Rule vào bảng log hệ thống để phục vụ truy vết an ninh. | **Trong MVP** | `P1 (Should Have)` |
| **RUL-F-040** | **Đồng Bộ Hai Chiều Với Tệp Tin `.agents/rules/`** | Cơ chế export hoặc sync tự động giữa cơ sở dữ liệu AI-Chan và thư mục `.agents/rules/` trên máy chủ cục bộ. | **Giai Đoạn 3 (Đề Xuất)** | `P3 (Future Idea)` |

---

## 3. Ranh Giới Phạm Vi MVP & Ngoài Phạm Vi (MVP Boundaries & Exclusions)

### 3.1. Phạm Vi Bắt Buộc Hoàn Thành Trong MVP (In Scope MVP)
1. **Toàn bộ tính năng CRUD & Thư viện quản lý Rules (Rules Library)**:
   - Giao diện danh sách tại `/rules` với các bộ lọc Scope, Status, Activation Mode và tìm kiếm tức thì.
   - 6 trạng thái UI tiêu chuẩn (Loading, Populated, Empty, No-Results, Error, Unauthorized).
   - Biểu mẫu tạo mới và chỉnh sửa tại `/rules/new` và `/rules/:id` với trình soạn thảo Markdown live preview.
   - Kiểm tra ràng buộc hợp lệ: Tên duy nhất trong tài khoản, độ dài 1-100 ký tự; Nội dung tối đa 10.000 ký tự.
   - Thao tác Nhân bản (Clone) và Xóa mềm (Soft delete) kèm hộp thoại bảo vệ.
2. **Bảo mật & Phân quyền**:
   - Cưỡng chế Anti-IDOR 100% trên mọi endpoint.
   - Phân biệt quyền giữa `System Rule` (Chỉ đọc với người dùng, chỉ Admin mới sửa) và `User Rule` (Toàn quyền với chủ sở hữu).
   - Khử khuẩn dữ liệu phòng chống Stored XSS và Markdown injection.
3. **Mô hình dữ liệu & API Backend**:
   - Bảng cơ sở dữ liệu `rules` và bảng liên kết `project_rules` (Migration `017_rules_management_system.sql`).
   - Bộ API RESTful hoàn chỉnh theo chuẩn OpenAPI 3.1.0 (`/api/v1/rules/*`).

### 3.2. Phạm Vi Ngoài MVP (Out of Scope for MVP / Proposed Future Phases)
1. **Thực thi Runtime trong luồng Chatbot**:
   - Không can thiệp vào mã nguồn của `chat_service.py` trong giai đoạn này.
   - Không tự động chèn nội dung Rules vào tin nhắn LLM khi chưa hoàn thiện công cụ phân giải ngữ cảnh.
2. **Giao diện Node Rule trên Canvas Graph**:
   - Canvas Project Editor tạm thời chưa vẽ node `RuleNode`; việc liên kết được thực hiện qua tab cài đặt Project hoặc API.
3. **Nhập / Xuất tệp tin hàng loạt (Batch Import/Export)**:
   - Chuyển sang Giai đoạn 2 sau khi thư viện cơ bản hoạt động ổn định.
4. **Lịch sử phiên bản đa cấp (Full Git-like Versioning)**:
   - MVP chỉ lưu `created_at`, `updated_at`, `version` tăng dần; chưa lưu toàn bộ snapshot của từng phiên bản cũ.

---

## 4. Ma Trận Phân Quyền Tác Nhân (Actor & Permissions Matrix)

Hệ thống định nghĩa 4 tác nhân chính tương tác với phân hệ Rules Management:

| Tác Nhân (Actor) | Định Nghĩa & Phạm Vi | Quyền Hạn Đối Với Phân Hệ Rules |
| :--- | :--- | :--- |
| **Khách (Guest / Unauthenticated)** | Người dùng chưa đăng nhập vào hệ thống. | - Bị từ chối truy cập (HTTP 401 Unauthorized).<br>- Tự động chuyển hướng về trang `/login`. |
| **Người Dùng Đăng Nhập (Authenticated User)** | Người dùng cá nhân có tài khoản hợp lệ. | - Xem, tìm kiếm, lọc toàn bộ System Rules và Rules do chính mình tạo ra.<br>- Tạo mới, chỉnh sửa, nhân bản, xóa các Rule thuộc sở hữu của mình.<br>- Sao chép (Clone) System Rule thành Rule của mình.<br>- Không thể sửa hoặc xóa System Rule (HTTP 403 Forbidden).<br>- Không thể xem hoặc sửa Rule của người dùng khác (Anti-IDOR). |
| **Chủ Dự Án (Project Owner)** | Người dùng sở hữu một Project cụ thể. | - Có toàn bộ quyền của Authenticated User.<br>- Gán (Bind) hoặc Gỡ (Unbind) bất kỳ Rule hợp lệ nào vào Project của mình.<br>- Cấu hình thứ tự ưu tiên của các Rule trong phạm vi Project. |
| **Quản Trị Viên (System Administrator)** | Tài khoản đặc quyền quản trị toàn hệ thống. | - Quản trị toàn bộ thư viện System Rules (Tạo mới, Sửa, Xóa, Bật/Tắt).<br>- Giám sát nhật ký kiểm toán và báo cáo vi phạm an ninh Rule Content. |
