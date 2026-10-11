# 01. DANH MỤC TÍNH NĂNG & MA TRẬN TRUY VẾT (FEATURE INVENTORY & TRACEABILITY)
## Phân Hệ: Quản Lý System Prompt (System Prompt Management MVP)
### Nền Tảng: AI-Chan Virtual Assistant Platform

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `DOC-SPM-01` |
| **Trạng Thái** | `PROPOSED (Chờ Duyệt Từ Product Owner)` |
| **Vai Trò Phụ Trách** | Senior Business Analyst & QA Lead |
| **Phiên Bản** | `1.0.0-MVP` |
| **Ngày Lập** | `2026-10-11` |

---

## 1. Danh Mục Tính Năng Chi Tiết (Feature Inventory)

Toàn bộ các tính năng trong phân hệ được định danh bằng mã ổn định `SPM-F-xxx`, phân loại mức độ ưu tiên theo chuẩn MoSCoW (`Must Have`, `Should Have`, `Later / Out of Scope`):

### 1.1. Nhóm A: Quản Lý Danh Sách — System Prompt List Management

| Feature ID | Tên Tính Năng | Mô Tả Tóm Tắt | Actor | Ưu Tiên | Tiền Điều Kiện (Preconditions) | Hậu Điều Kiện (Postconditions) | Phụ Thuộc (Dependencies) | Tiêu Chí Nghiệm Thu (AC Reference) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SPM-F-001** | Điều hướng vào Trang Danh Sách | Người dùng nhấp vào mục "System Prompts" từ thanh điều hướng (Header/Sidebar) để mở trang quản lý danh sách `/prompts`. | End User, Guest User | **Must Have** | Trình duyệt đã kết nối ứng dụng AI-Chan. | Giao diện trang `/prompts` được khởi tạo và kích hoạt tải dữ liệu. | Next.js Router, Header/Sidebar Link | SPM-AC-001 |
| **SPM-F-002** | Tải và Hiển thị Danh Sách | Hệ thống tự động gọi API `GET /api/v1/system-prompts` để lấy danh sách các prompt thuộc sở hữu của user (Anti-IDOR) và render ra danh sách dạng thẻ/bảng. | End User, Guest User | **Must Have** | Màn hình `/prompts` đã nạp thành công. | Danh sách prompt hiển thị đầy đủ tên, mô tả ngắn, số ký tự, ngày cập nhật. | `GET /api/v1/system-prompts`, SQLite DB | SPM-AC-002 |
| **SPM-F-003** | Xử lý Trạng thái Giao diện Danh sách | Xử lý hiển thị tương ứng 6 trạng thái UI: Đang tải (Skeleton/Spinner), Có dữ liệu, Rỗng (Chưa có prompt), Không có kết quả tìm kiếm, Lỗi tải (Network/Server Error 5xx), Lỗi quyền truy cập (401/403). | End User, Guest User | **Must Have** | Người dùng đang ở trang `/prompts`. | Người dùng luôn nhận được phản hồi trực quan phù hợp trạng thái dữ liệu, có nút "Thử lại" hoặc "Tạo mới". | Component List State, CSS Tokens | SPM-AC-003 |
| **SPM-F-004** | Tìm kiếm System Prompt tức thì | Cho phép người dùng gõ từ khóa vào ô tìm kiếm để lọc danh sách tức thời theo Tên (`name`) và Mô tả (`description`), không phân biệt hoa/thường, hỗ trợ tiếng Việt có dấu. | End User, Guest User | **Must Have** | Danh sách đã tải ít nhất 1 lần vào client state. | Danh sách tự động lọc hiển thị các mục khớp từ khóa; hiển thị trạng thái "Không tìm thấy kết quả" nếu không khớp mục nào. | Client Search Filter, Input Handler | SPM-AC-004 |
| **SPM-F-005** | Sắp xếp Danh sách System Prompt | Hỗ trợ sắp xếp nhanh theo: Thời gian cập nhật mới nhất (Mặc định), Tên A-Z, Số lượng ký tự (Dài -> Ngắn). | End User | **Should Have** | Danh sách có từ 2 bản ghi trở lên. | Danh sách được tái sắp xếp tức thì theo tiêu chí người dùng chọn. | Client Sort Handler | SPM-AC-005 |
| **SPM-F-006** | Mở Xem Chi tiết / Chỉnh sửa từ Danh sách | Nhấp vào một thẻ prompt hoặc nút "Chỉnh sửa" để mở màn hình chi tiết/soạn thảo tương ứng với ID của prompt đó. | End User, Guest User | **Must Have** | Prompt tồn tại trong danh sách. | Chuyển sang màn hình/drawer soạn thảo kèm nạp dữ liệu đầy đủ của bản ghi. | SPM-F-010, Next.js Router | SPM-AC-006 |
| **SPM-F-007** | Bắt đầu Tạo mới từ Danh sách | Nhấp vào nút "Tạo System Prompt Mới" (+) để mở form soạn thảo trắng. | End User, Guest User | **Must Have** | Người dùng đang ở màn hình danh sách. | Mở form soạn thảo ở chế độ Tạo mới, các trường trống rỗng, focus vào ô Tên. | SPM-F-011 | SPM-AC-007 |
| **SPM-F-008** | Xóa System Prompt từ Danh sách | Người dùng bấm nút biểu tượng thùng rác trên một mục danh sách, hệ thống hiển thị Modal xác nhận xóa vĩnh viễn; khi xác nhận, gọi API xóa và cập nhật lại danh sách. | End User, Guest User | **Must Have** | Bản ghi prompt thuộc sở hữu của người dùng. | Bản ghi bị xóa khỏi CSDL; danh sách loại bỏ mục đó; hiển thị Toast thành công. | `DELETE /api/v1/system-prompts/{id}`, Confirm Modal | SPM-AC-008 |
| **SPM-F-009** | Làm mới Danh sách (Refresh) | Cho phép người dùng bấm nút làm mới để tải lại danh sách mới nhất từ server, hoặc tự động làm mới sau khi tạo/sửa/xóa thành công. | End User | **Must Have** | Trang `/prompts` đang hiển thị. | Dữ liệu danh sách được đồng bộ mới nhất từ server. | SPM-F-002 | SPM-AC-009 |

---

### 1.2. Nhóm B: Quản Lý Từng System Prompt — System Prompt Detail & Editor

| Feature ID | Tên Tính Năng | Mô Tả Tóm Tắt | Actor | Ưu Tiên | Tiền Điều Kiện (Preconditions) | Hậu Điều Kiện (Postconditions) | Phụ Thuộc (Dependencies) | Tiêu Chí Nghiệm Thu (AC Reference) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SPM-F-010** | Tải và Xem Chi tiết System Prompt | Gọi API `GET /api/v1/system-prompts/{id}` để lấy toàn bộ thông tin bản ghi và hiển thị vào form/trang chi tiết. | End User, Guest User | **Must Have** | Bản ghi `id` tồn tại và thuộc sở hữu của người dùng. | Dữ liệu `name`, `description`, `content` được hiển thị chính xác, bảo toàn nguyên vẹn định dạng. | `GET /api/v1/system-prompts/{id}` | SPM-AC-010 |
| **SPM-F-011** | Tạo mới Bản ghi System Prompt | Người dùng điền Tên (bắt buộc), Mô tả (tùy chọn), Nội dung (bắt buộc) và bấm nút "Lưu Prompt". Client validate, gửi `POST /api/v1/system-prompts`. | End User, Guest User | **Must Have** | Đang ở form Tạo mới. | Bản ghi mới được lưu vào CSDL; hiển thị Toast thành công; điều hướng về danh sách hoặc mở chi tiết. | `POST /api/v1/system-prompts`, Pydantic Validator | SPM-AC-011 |
| **SPM-F-012** | Chỉnh sửa và Cập nhật System Prompt | Người dùng sửa đổi Tên, Mô tả hoặc Nội dung của một prompt đã có và bấm nút "Lưu thay đổi". Client validate, gửi `PUT /api/v1/system-prompts/{id}`. | End User, Guest User | **Must Have** | Đang ở form Chỉnh sửa bản ghi hợp lệ. | Dữ liệu cập nhật được ghi đè an toàn vào CSDL; `updated_at` được cập nhật mới; hiển thị Toast thành công. | `PUT /api/v1/system-prompts/{id}` | SPM-AC-012 |
| **SPM-F-013** | Kiểm tra Tính Hợp lệ 2 Lớp (Validation) | Xác thực tính hợp lệ cả Client-side (phản hồi tức thì khi người dùng rời ô nhập hoặc bấm submit) và Server-side (Pydantic v2): Tên 1-100 ký tự, Mô tả tối đa 500 ký tự, Nội dung 1-10.000 ký tự, không chứa chuỗi rỗng/chỉ chứa khoảng trắng. | End User, Backend Service | **Must Have** | Người dùng gửi yêu cầu Lưu/Cập nhật. | Nếu không hợp lệ, chặn lưu, đánh dấu lỗi đỏ trực tiếp dưới trường tương ứng kèm thông điệp rõ ràng. | Pydantic Schema, Form State | SPM-AC-013 |
| **SPM-F-014** | Xử lý Trùng Tên Prompt (Unique Check) | Kiểm tra tính duy nhất của Tên trong phạm vi người dùng (`UNIQUE(user_id, name)`). Trả về mã lỗi HTTP 409 Conflict với thông điệp: "Bạn đã có một System Prompt mang tên này. Vui lòng chọn tên khác." | Backend Service, UI | **Must Have** | Tên nhập vào trùng với tên bản ghi khác cùng `user_id`. | Thao tác lưu bị từ chối; giữ nguyên dữ liệu trên form để người dùng đổi tên và bấm lưu lại mà không mất nội dung đã viết. | SQLite Unique Constraint, HTTP 409 | SPM-AC-014 |
| **SPM-F-015** | Bảo toàn Văn bản & Đa ngôn ngữ (Unicode Fidelity) | Đảm bảo giữ nguyên vẹn 100% mọi ký tự tiếng Việt có dấu, ký tự xuống dòng (`\n`, `\r\n`), khoảng trắng thụt lề đầu dòng, ký tự đặc biệt (`<`, `>`, `&`, `{`, `}`, `"`, `'`, Markdown, regex) khi lưu và tải lại. | Hệ thống Backend, Frontend | **Must Have** | Người dùng nhập nội dung chứa Unicode hoặc mã định dạng. | Nội dung tải lại từ CSDL giống từng ký tự so với lúc nhập liệu, không bị biến dạng, không bị unescape sai. | SQLite UTF-8, JSON Decoder, Textarea | SPM-AC-015 |
| **SPM-F-016** | Hiển thị An toàn Chống XSS (Safe Rendering) | Nội dung prompt được render ra màn hình dưới dạng Plain Text thuần túy (dùng `<textarea>` hoặc thẻ `<pre>`/`<div>` với `white-space: pre-wrap;` và text content). Tuyệt đối không dùng `dangerouslySetInnerHTML`. | Frontend UI | **Must Have** | Nội dung prompt chứa các đoạn mã HTML/Script độc hại (`<script>`, `<img onerror=...>`). | Mã độc hiển thị dưới dạng văn bản thuần túy, hoàn toàn vô hiệu hóa thực thi script, triệt tiêu Stored XSS. | React Native Escaping, OWASP XSS Guideline | SPM-AC-016 |
| **SPM-F-017** | Cảnh báo Dữ liệu Chưa Lưu (Dirty Form Protection) | Khi form ở trạng thái "Dirty" (người dùng đã sửa ít nhất 1 ký tự so với ban đầu) và người dùng bấm nút Quay lại, đóng trang hoặc chuyển hướng, hệ thống hiển thị cảnh báo: "Bạn có thay đổi chưa lưu. Bạn có chắc chắn muốn rời đi?". | End User, Frontend Router | **Must Have** | Form đang dirty và có sự kiện điều hướng/đóng tab. | Nếu người dùng bấm "Ở lại", giữ nguyên màn hình và dữ liệu nhập dở. Nếu bấm "Rời đi", hủy thay đổi và chuyển trang. | `window.onbeforeunload`, Next.js navigation hook | SPM-AC-017 |
| **SPM-F-018** | Bộ Đếm Ký Tự Trực Quan (Character Counter) | Hiển thị bộ đếm số lượng ký tự trực tiếp theo thời gian thực tại các trường: Tên (`x/100`), Mô tả (`x/500`), Nội dung (`x/10.000 ký tự`). Đổi màu cảnh báo khi đạt 90% giới hạn và chặn gõ vượt quá giới hạn. | End User | **Must Have** | Người dùng gõ vào các ô nhập liệu. | Người dùng nhận biết chính xác dung lượng còn lại của từng trường. | Form UI Component | SPM-AC-018 |
| **SPM-F-019** | Xử lý Bản Ghi Không Tồn Tại hoặc Bị Xóa | Khi truy cập `/prompts/{id}` với `id` không tồn tại trong CSDL hoặc không thuộc sở hữu của user (Anti-IDOR), backend trả về HTTP 404 Not Found. Frontend hiển thị thông báo lỗi thân thiện và nút "Quay về danh sách". | End User, Backend Service | **Must Have** | `id` không hợp lệ hoặc đã bị xóa. | Người dùng không bị kẹt ở màn hình lỗi trắng (White screen), có lối thoát điều hướng an toàn. | HTTP 404 Handler | SPM-AC-019 |

---

### 1.3. Nhóm C: Năng Lực Dùng Chung — Shared Capabilities & Governance

| Feature ID | Tên Tính Năng | Mô Tả Tóm Tắt | Actor | Ưu Tiên | Tiêu Chí Nghiệm Thu (AC Reference) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SPM-F-020** | Phân Quyền & Anti-IDOR Enforcement | Mọi thao tác truy vấn, cập nhật, xóa bản ghi theo `id` ở Backend đều bắt buộc kiểm tra điều kiện `user_id = :current_user_id` (hoặc `guest_user`). Tuyệt đối không cho phép truy cập tài nguyên của người dùng khác. | Backend Security Layer | **Must Have** | SPM-AC-020 |
| **SPM-F-021** | Chuẩn Hóa Lỗi & Phản Hồi API (Error Envelope) | Tất cả các API phản hồi lỗi theo định dạng JSON thống nhất của hệ thống AI-Chan: `{ "detail": { "error_code": "PROMPT_NAME_CONFLICT", "message": "..." } }`. | Backend API Layer | **Must Have** | SPM-AC-021 |
| **SPM-F-022** | Bảo Vệ Nhật Ký & Không Lộ Nội Dung Nhạy Cảm (Privacy Logging) | Tuyệt đối không ghi toàn bộ chuỗi `content` dài 10.000 ký tự vào nhật ký ứng dụng (App Logs) hoặc Telemetry logs nhằm bảo vệ bí mật nghiệp vụ và dữ liệu cá nhân của người dùng. Chỉ ghi log metadata (`id`, `user_id`, độ dài `content_length`). | Backend Logger | **Must Have** | SPM-AC-022 |
| **SPM-F-023** | Hỗ Trợ Khả Năng Truy Cập & Phím Tắt (Accessibility & Keyboard) | Hỗ trợ điều hướng bằng phím Tab qua các ô nhập liệu, phím `Esc` để đóng modal xác nhận xóa, nhãn `aria-label` đầy đủ cho các nút thao tác biểu tượng. | Frontend UI | **Should Have** | SPM-AC-023 |
| **SPM-F-024** | Nhân Bản System Prompt (Clone / Duplicate) | Cho phép bấm nút "Nhân bản" trên một prompt có sẵn để tạo ra bản sao mới với tên mặc định là `[Tên cũ] (Copy)` giúp người dùng dễ dàng tùy biến từ bản gốc. | End User | **Should Have** | SPM-AC-024 |
| **SPM-F-025** | Thùng Rác & Khôi Phục Bản Ghi (Soft Delete & Restore) | Lưu trạng thái bản ghi đã xóa vào bảng lưu trữ hoặc cột `is_deleted = 1` và cho phép khôi phục lại trong vòng 30 ngày. | End User | **Later / Out of Scope** | SPM-AC-025 |
| **SPM-F-026** | Lịch Sử Phiên Bản Prompt (Prompt Versioning & Diff) | Lưu lịch sử từng lần chỉnh sửa (v1, v2, v3), cho phép so sánh khác biệt (Diff viewer) và khôi phục về phiên bản cũ. | End User | **Later / Out of Scope** | SPM-AC-026 |
| **SPM-F-027** | Gắn System Prompt vào Project Builder Graph | Xuất hiện "System Prompt Node" trên Canvas kéo-thả của Project Builder, cho phép chọn một prompt từ thư viện để kết nối vào Model Node. | End User, Project Builder | **Later / Out of Scope** | SPM-AC-027 |

---

## 2. Ma Trận Truy Vết Toàn Diện (Traceability Matrix)

Ma trận dưới đây liên kết xuyên suốt từ **Requirement (Yêu cầu) → Feature ID → Use Case → Giao Diện UI → API Endpoint → Thực Thể CSDL → Biểu Đồ Minh Họa → Test Case Kiểm Thử**:

| Requirement ID | Feature ID | Use Case ID | Màn Hình / Giao Diện (UI) | API Endpoint / Method | Thực Thể / Trường (Data Entity) | Diagram ID Liên Quan | Test Case ID | Trạng Thái / Ghi Chú |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SPM-FR-001** | SPM-F-001, SPM-F-002 | `UC-SPM-01` | Trang `/prompts` (List View) | `GET /api/v1/system-prompts` | `system_prompts.*` | `DIA-SPM-01`, `DIA-SPM-02`, `DIA-SPM-04` | `SPM-TC-001`, `SPM-TC-002` | **Confirmed (Must)** |
| **SPM-FR-002** | SPM-F-003 | `UC-SPM-01` | Trang `/prompts` (Empty & Loading State) | `GET /api/v1/system-prompts` | `system_prompts.*` | `DIA-SPM-03`, `DIA-SPM-12` | `SPM-TC-003`, `SPM-TC-004` | **Confirmed (Must)** |
| **SPM-FR-003** | SPM-F-004 | `UC-SPM-02` | Trang `/prompts` (Search Box) | Client Filter / Query param | `system_prompts.name, description` | `DIA-SPM-03` | `SPM-TC-005`, `SPM-TC-006` | **Confirmed (Must)** |
| **SPM-FR-004** | SPM-F-006, SPM-F-010 | `UC-SPM-03` | Trang `/prompts/[id]` (Detail View) | `GET /api/v1/system-prompts/{id}` | `system_prompts.*` | `DIA-SPM-04`, `DIA-SPM-06` | `SPM-TC-007`, `SPM-TC-008` | **Confirmed (Must)** |
| **SPM-FR-005** | SPM-F-007, SPM-F-011 | `UC-SPM-04` | Trang `/prompts/new` (Create Form) | `POST /api/v1/system-prompts` | `system_prompts (INSERT)` | `DIA-SPM-05`, `DIA-SPM-11` | `SPM-TC-009`, `SPM-TC-010` | **Confirmed (Must)** |
| **SPM-FR-006** | SPM-F-012 | `UC-SPM-05` | Trang `/prompts/[id]/edit` (Edit Form) | `PUT /api/v1/system-prompts/{id}` | `system_prompts (UPDATE)` | `DIA-SPM-06`, `DIA-SPM-11` | `SPM-TC-011`, `SPM-TC-012` | **Confirmed (Must)** |
| **SPM-FR-007** | SPM-F-008 | `UC-SPM-06` | Modal Xác Nhận Xóa trên `/prompts` | `DELETE /api/v1/system-prompts/{id}` | `system_prompts (DELETE)` | `DIA-SPM-07`, `DIA-SPM-10` | `SPM-TC-013`, `SPM-TC-014` | **Confirmed (Must)** |
| **SPM-FR-008** | SPM-F-013 | `UC-SPM-04`, `UC-SPM-05` | Form Error Messages (Inline & Toast) | Schema Validation (Pydantic) | `name, description, content` | `DIA-SPM-05`, `DIA-SPM-06` | `SPM-TC-015`, `SPM-TC-016` | **Confirmed (Must)** |
| **SPM-FR-009** | SPM-F-014 | `UC-SPM-04`, `UC-SPM-05` | Form Error: "Tên prompt đã tồn tại" | `POST / PUT` -> 409 Conflict | `UNIQUE(user_id, name)` | `DIA-SPM-05`, `DIA-SPM-06` | `SPM-TC-017` | **Confirmed (Must)** |
| **SPM-FR-010** | SPM-F-015 | `UC-SPM-03`, `UC-SPM-04`, `UC-SPM-05` | Textarea Soạn thảo & Khung xem trước | API Request/Response JSON | `system_prompts.content` | `DIA-SPM-08`, `DIA-SPM-11` | `SPM-TC-018`, `SPM-TC-019` | **Confirmed (Must)** |
| **SPM-FR-011** | SPM-F-016 | `UC-SPM-03` | Read-only Text Box | Pure Text Rendering (No eval/HTML) | `system_prompts.content` | `DIA-SPM-11` | `SPM-TC-020` | **Confirmed (Must)** |
| **SPM-FR-012** | SPM-F-017 | `UC-SPM-04`, `UC-SPM-05` | Modal Cảnh báo Dữ liệu Chưa Lưu | Client Router Interceptor | Form dirty state | `DIA-SPM-02`, `DIA-SPM-12` | `SPM-TC-021` | **Confirmed (Must)** |
| **SPM-FR-013** | SPM-F-018 | `UC-SPM-04`, `UC-SPM-05` | Badge Bộ đếm ký tự (0/10000) | Client Input Event Listener | String length indicator | `DIA-SPM-12` | `SPM-TC-022` | **Confirmed (Must)** |
| **SPM-FR-014** | SPM-F-020 | `UC-SPM-01` đến `UC-SPM-06` | Giao diện chung | Anti-IDOR Check (`WHERE user_id = ?`) | `system_prompts.user_id` | `DIA-SPM-10` | `SPM-TC-023`, `SPM-TC-024` | **Confirmed (Must)** |
| **SPM-FR-015** | SPM-F-021 | Tất cả Use Cases | Toast Notification / Alert Banner | Standard Error Envelope | Error detail object | `DIA-SPM-09` | `SPM-TC-025` | **Confirmed (Must)** |
| **SPM-FR-016** | SPM-F-022 | Tất cả Use Cases | Không hiển thị trên UI | Log Sanitization Handler | Không ghi log `content` | `DIA-SPM-11` | `SPM-TC-026` | **Confirmed (Must)** |
| **SPM-FR-017** | SPM-F-024 | `UC-SPM-07` | Menu hành động (...) -> "Nhân bản" | `POST /api/v1/system-prompts/{id}/clone` | `system_prompts (INSERT copy)` | `DIA-SPM-01` | `SPM-TC-027` | **Proposed (Should)** |
| **SPM-FR-018** | SPM-F-025 | N/A | Thùng rác / Trash | Soft Delete / Restore Endpoint | `system_prompts.deleted_at` | N/A | N/A | **Out of Scope (Later)** |
| **SPM-FR-019** | SPM-F-026 | N/A | Version History Drawer | Prompt Versions Endpoint | `system_prompt_versions` | N/A | N/A | **Out of Scope (Later)** |
| **SPM-FR-020** | SPM-F-027 | N/A | Canvas Node `system_prompt` | Graph Execution Pipeline | `projects.graph_data` | N/A | N/A | **Out of Scope (Later)** |
