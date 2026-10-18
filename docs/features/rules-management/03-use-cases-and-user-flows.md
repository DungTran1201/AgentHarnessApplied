# PHẦN 03: ĐẶC TẢ TRƯỜNG HỢP SỬ DỤNG & LUỒNG NGƯỜI DÙNG (USE CASES & USER FLOWS)
## Phân Hệ: Quản Lý Quy Tắc (Rules Management — Rules Library & Rule Editor)
### Dự Án: Nền Tảng Trợ Lý Ảo AI-Chan (AI-Chan Assistant Platform)

---

| Thông Tin Quản Trị | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `RUL-DOC-03` |
| **Nhánh Tính Năng** | **Rules Management (Rules Library & Rule Detail / Editor)** |
| **Trạng Thái Quản Trị** | **`PROPOSED (Chờ Duyệt Từ Architecture Board & Product Owner)`** |
| **Phiên Bản** | `1.0.0-PROPOSAL` |
| **Ngày Ban Hành** | `2026-10-18` |
| **Tác Giả / Vai Trò** | Senior Business Analyst & UX Architect |

---

## 1. Giới Thiệu & Danh Mục Use Cases (Use Case Directory)

Phân hệ bao gồm 10 ca sử dụng chính thức được mã hóa từ `RUL-UC-001` đến `RUL-UC-010`, phản ánh toàn bộ các tương tác của người dùng trên giao diện Thư viện Rules (Rules Library) và Trình soạn thảo Rule (Rule Editor).

| Mã Use Case | Tên Trường Hợp Sử Dụng | Tác Nhân Chính | Mục Tiêu Của Tác Nhân | Mức Độ Ưu Tiên |
| :---: | :--- | :--- | :--- | :---: |
| **RUL-UC-001** | **Duyệt & Tìm Kiếm Danh Sách Rules** | Authenticated User | Xem danh sách các quy tắc của bản thân và hệ thống, tìm nhanh theo từ khóa. | `P0 (Must Have)` |
| **RUL-UC-002** | **Lọc & Sắp Xếp Danh Sách Rules** | Authenticated User | Thu hẹp phạm vi hiển thị theo Scope, Activation Mode, Status và sắp xếp theo ngày/ưu tiên. | `P0 (Must Have)` |
| **RUL-UC-003** | **Bật / Tắt Nhanh Trạng Thái Rule** | Authenticated User | Kích hoạt hoặc tạm ngưng một quy tắc ngay từ danh sách mà không cần mở form soạn thảo. | `P1 (Should Have)` |
| **RUL-UC-004** | **Tạo Mới Quy Tắc** | Authenticated User | Khởi tạo một quy tắc mới với đầy đủ tên, mô tả, trigger và nội dung Markdown. | `P0 (Must Have)` |
| **RUL-UC-005** | **Xem Chi Tiết & Chỉnh Sửa Rule** | Authenticated User | Cập nhật nội dung, điều chỉnh trigger hoặc tags của Rule thuộc quyền sở hữu của mình. | `P0 (Must Have)` |
| **RUL-UC-006** | **Xem Chi Tiết Rule Hệ Thống (Chỉ Đọc)** | Authenticated User | Khám phá quy chuẩn hệ thống đã cấu hình sẵn mà không có quyền sửa đổi trực tiếp. | `P0 (Must Have)` |
| **RUL-UC-007** | **Nhân Bản Quy Tắc (Clone Rule)** | Authenticated User | Sao chép một System Rule hoặc User Rule thành bản ghi mới của mình để tùy biến. | `P1 (Should Have)` |
| **RUL-UC-008** | **Xóa Mềm Rule & Cảnh Báo Tham Chiếu** | Authenticated User | Loại bỏ quy tắc khỏi danh sách hoạt động với cảnh báo nếu có dự án đang dùng. | `P0 (Must Have)` |
| **RUL-UC-009** | **Xem Danh Sách Dự Án Đang Sử Dụng Rule** | Authenticated User | Đánh giá mức độ ảnh hưởng của quy tắc bằng cách xem danh sách dự án liên kết. | `P1 (Should Have)` |
| **RUL-UC-010** | **Bảo Vệ Biểu Mẫu Soạn Thảo Chưa Lưu** | Authenticated User | Nhận cảnh báo xác nhận khi chuẩn bị rời trang nếu có dữ liệu đang sửa đổi dở dang. | `P0 (Must Have)` |

---

## 2. Đặc Tả Chi Tiết Từng Use Case (Detailed Specifications)

### RUL-UC-001: Duyệt & Tìm Kiếm Danh Sách Rules
- **Tác nhân chính**: Authenticated User.
- **Tiền điều kiện**: Người dùng đã đăng nhập và truy cập vào route `/rules`.
- **Hậu điều kiện**: Danh sách các Rule khả dụng được hiển thị trực quan; kết quả tìm kiếm được cập nhật tương ứng.
- **Luồng sự kiện chính (Happy Path)**:
  1. Người dùng truy cập trang Thư Viện Rules.
  2. Hệ thống hiển thị thanh công cụ (Ô tìm kiếm, các nút lọc Scope/Trigger, nút "Tạo Quy Tắc Mới") và vùng danh sách thẻ (Cards) hoặc bảng (Table).
  3. Người dùng nhập chuỗi tìm kiếm (ví dụ: "bảo mật" hoặc "typescript") vào ô tìm kiếm.
  4. Hệ thống debounce 300ms và thực hiện tìm kiếm chuỗi con không phân biệt hoa thường trên các trường `name`, `description` và `tags`.
  5. Hệ thống hiển thị danh sách các Rule thỏa mãn điều kiện tìm kiếm kèm số lượng kết quả tìm thấy.
- **Luồng phụ / Ngoại lệ**:
  - *4a. Danh sách hoàn toàn trống*: Hệ thống hiển thị Empty State với lời chào và nút "Tạo Quy Tắc Đầu Tiên".
  - *5a. Không có bản ghi nào khớp từ khóa*: Hệ thống hiển thị No-Results State kèm nút "Xóa từ khóa tìm kiếm".
  - *1a. Phiên đăng nhập hết hạn (HTTP 401)*: Hệ thống chuyển hướng người dùng về trang `/login` kèm lưu lại URL hiện tại.

---

### RUL-UC-004: Tạo Mới Quy Tắc (Create New Rule)
- **Tác nhân chính**: Authenticated User.
- **Tiền điều kiện**: Người dùng đang ở màn hình `/rules` hoặc click vào nút "Tạo Quy Tắc Mới".
- **Hậu điều kiện**: Bản ghi Rule mới được lưu vào CSDL; người dùng được chuyển hướng về trang danh sách hoặc xem chi tiết.
- **Luồng sự kiện chính (Happy Path)**:
  1. Người dùng click vào nút "+ Tạo Quy Tắc Mới" trên thanh công cụ.
  2. Hệ thống chuyển hướng tới route `/rules/new` và hiển thị form soạn thảo với giá trị mặc định (`scope = 'user'`, `activation_mode = 'always_on'`, `status = 'active'`, `priority = 50`).
  3. Người dùng điền:
     - Tên quy tắc: "Tiêu chuẩn Clean Code TypeScript"
     - Mô tả: "Quy chuẩn đặt tên và cấu trúc file trong dự án Frontend"
     - Tags: `typescript`, `frontend`, `clean-code`
     - Chế độ kích hoạt: Chọn `glob` và nhập `glob_patterns = ["src/**/*.ts", "src/**/*.tsx"]`
     - Nội dung: Nhập các gạch đầu dòng định dạng Markdown tại tab "Soạn Thảo".
  4. Người dùng click tab "Xem Trước" để kiểm tra giao diện hiển thị của Markdown.
  5. Người dùng nhấn nút "Lưu Quy Tắc".
  6. Hệ thống validate dữ liệu phía client: Các trường hợp lệ, không vượt quá 10.000 ký tự.
  7. Frontend gửi yêu cầu `POST /api/v1/rules`.
  8. Backend kiểm tra trùng tên trong tài khoản của người dùng, chèn bản ghi vào bảng `rules` và trả về HTTP 201 Created.
  9. Hệ thống hiển thị thông báo Toast thành công màu xanh lá: "Đã tạo quy tắc thành công!" và chuyển hướng về `/rules`.
- **Luồng phụ / Ngoại lệ**:
  - *6a. Dữ liệu không hợp lệ*: Bỏ trống tên hoặc nội dung -> Báo lỗi đỏ dưới trường tương ứng, không gửi request.
  - *8a. Tên quy tắc bị trùng trong tài khoản (HTTP 409)*: Hệ thống giữ nguyên dữ liệu trên form, hiển thị thông báo lỗi "Tên quy tắc đã tồn tại trong tài khoản của bạn, vui lòng chọn tên khác".

---

### RUL-UC-005: Xem Chi Tiết & Chỉnh Sửa Rule (Edit Rule)
- **Tác nhân chính**: Authenticated User.
- **Tiền điều kiện**: Người dùng click vào một Rule do chính mình tạo ra trên danh sách.
- **Hậu điều kiện**: Dữ liệu sửa đổi của Rule được lưu trữ an toàn trong CSDL; số phiên bản `version` được tăng thêm 1.
- **Luồng sự kiện chính (Happy Path)**:
  1. Người dùng mở trang chi tiết `/rules/:id`.
  2. Hệ thống gửi yêu cầu `GET /api/v1/rules/:id`, nạp toàn bộ thông tin hiện tại vào form và lưu lại snapshot ban đầu để kiểm soát dirty state.
  3. Người dùng chỉnh sửa một số nội dung trong phần Markdown hoặc đổi mức ưu tiên `priority`.
  4. Bộ đếm ký tự cập nhật theo thời gian thực (ví dụ: `2,450 / 10,000 ký tự`).
  5. Người dùng nhấn nút "Lưu Thay Đổi".
  6. Frontend gửi yêu cầu `PUT /api/v1/rules/:id` kèm dữ liệu mới và trường `version` hiện tại.
  7. Backend xác thực quyền sở hữu (`rule.user_id === current_user.id`), kiểm tra `rule.version == request.version`, cập nhật dữ liệu, tăng `version = version + 1`, cập nhật `updated_at = NOW()`.
  8. Backend trả về HTTP 200 OK kèm bản ghi mới.
  9. Frontend cập nhật snapshot mới, reset `isDirty = false` và hiển thị Toast "Cập nhật quy tắc thành công!".
- **Luồng phụ / Ngoại lệ**:
  - *7a. Phát hiện xung đột phiên làm việc (HTTP 409 Conflict)*: Một phiên duyệt web khác đã cập nhật bản ghi trước đó. Hệ thống hiển thị Modal cảnh báo xung đột: "Dữ liệu quy tắc này đã bị sửa đổi bởi phiên khác. Bạn có muốn tải lại dữ liệu mới nhất không?".

---

### RUL-UC-006: Xem Chi Tiết Rule Hệ Thống Chỉ Đọc (Read-Only System Rule)
- **Tác nhân chính**: Authenticated User.
- **Tiền điều kiện**: Người dùng mở chi tiết một Rule có `scope = 'system'`.
- **Hậu điều kiện**: Người dùng xem được nội dung chi tiết nhưng không thể thay đổi dữ liệu gốc.
- **Luồng sự kiện chính (Happy Path)**:
  1. Người dùng click mở xem một System Rule từ thư viện.
  2. Hệ thống gọi `GET /api/v1/rules/:id`, nhận thấy `scope = 'system'`.
  3. Giao diện tự động khóa toàn bộ các trường nhập liệu (Disabled mode).
  4. Hiển thị Banner màu xanh lam trên cùng: *"Quy tắc chuẩn của Hệ thống (Chỉ đọc). Nhấn 'Nhân bản' để tạo bản sao và tùy biến cho riêng bạn."*
  5. Ẩn nút "Lưu Thay Đổi" và nút "Xóa"; thay thế bằng nút nổi bật: "Nhân Bản Sang Quy Tắc Của Tôi".
  6. Nếu người dùng click "Nhân Bản", hệ thống kích hoạt kịch bản `RUL-UC-007`.

---

### RUL-UC-007: Nhân Bản Quy Tắc (Clone Rule)
- **Tác nhân chính**: Authenticated User.
- **Tiền điều kiện**: Người dùng click nút "Nhân bản" (Clone) từ danh sách hoặc từ trang chi tiết của bất kỳ Rule nào.
- **Hậu điều kiện**: Một bản sao mới độc lập được tạo ra thuộc quyền sở hữu của người dùng hiện tại.
- **Luồng sự kiện chính (Happy Path)**:
  1. Người dùng nhấn nút "Nhân bản" trên dòng Rule (ví dụ: Rule gốc tên là "Quy ước Git Commit").
  2. Frontend gửi yêu cầu `POST /api/v1/rules/:id/clone`.
  3. Backend truy vấn dữ liệu Rule gốc, tạo đối tượng mới với:
     - `name`: Tự động gán `"Quy ước Git Commit (Copy)"` (hoặc kiểm tra nếu đã có bản copy thì gán `"Quy ước Git Commit (Copy 2)"`).
     - `user_id`: Gán cho `current_user.id`.
     - `scope`: Gán `user`.
     - `content`, `description`, `tags`, `activation_mode`, `glob_patterns`, `priority`: Kế thừa nguyên vẹn từ Rule gốc.
     - `status`: Mặc định là `active`.
  4. Backend commit CSDL và trả về HTTP 201 Created kèm dữ liệu bản ghi mới.
  5. Frontend chuyển hướng người dùng tới trang chỉnh sửa `/rules/:new_id` kèm thông báo Toast "Đã nhân bản quy tắc thành công. Bạn có thể chỉnh sửa bản sao này ngay bây giờ!".

---

### RUL-UC-008: Xóa Mềm Rule & Cảnh Báo Tham Chiếu (Soft Delete Rule)
- **Tác nhân chính**: Authenticated User.
- **Tiền điều kiện**: Người dùng click nút "Xóa" trên một Rule do mình sở hữu.
- **Hậu điều kiện**: Rule bị ẩn khỏi danh sách thư viện; liên kết trong các dự án bị hủy hoặc cập nhật an toàn.
- **Luồng sự kiện chính (Happy Path)**:
  1. Người dùng click biểu tượng Thùng rác "Xóa" trên dòng Rule.
  2. Frontend gửi yêu cầu `GET /api/v1/rules/:id/projects` để kiểm tra các dự án đang sử dụng Rule này.
  3. *Trường hợp không có dự án sử dụng*: Hiển thị Modal xác nhận: "Bạn có chắc chắn muốn xóa quy tắc '[Tên Rule]' không?". Người dùng bấm "Xác nhận xóa".
  4. *Trường hợp có 2 dự án đang sử dụng*: Hiển thị Modal cảnh báo màu vàng: "Quy tắc này đang được áp dụng trong 2 dự án: [Dự Án Alpha], [Dự Án Beta]. Việc xóa quy tắc sẽ tự động gỡ bỏ quy tắc khỏi 2 dự án này. Bạn có chắc chắn muốn tiếp tục?". Người dùng bấm "Gỡ liên kết và Xóa".
  5. Frontend gửi yêu cầu `DELETE /api/v1/rules/:id?force=true`.
  6. Backend kiểm tra quyền sở hữu (`RUL-BR-003`), cập nhật `deleted_at = NOW()`, `status = 'archived'` trong bảng `rules`, và chuyển trạng thái các bản ghi liên kết trong `project_rules` sang `inactive`.
  7. Backend trả về HTTP 200 OK.
  8. Frontend loại bỏ dòng Rule khỏi danh sách trên giao diện và hiển thị Toast "Đã xóa quy tắc thành công".
- **Luồng phụ / Ngoại lệ**:
  - *Xóa System Rule*: Nút Xóa bị ẩn trên UI. Nếu cố tình gửi request, Backend trả về HTTP 403 Forbidden.

---

### RUL-UC-010: Bảo Vệ Biểu Mẫu Chưa Lưu (Dirty Form Guard)
- **Tác nhân chính**: Authenticated User.
- **Tiền điều kiện**: Người dùng đang ở màn hình tạo mới hoặc sửa Rule và đã nhập/sửa ít nhất một ký tự (`isDirty === true`).
- **Luồng sự kiện chính (Happy Path)**:
  1. Người dùng click vào nút "Hủy" hoặc click vào menu khác trên thanh Sidebar (ví dụ: chuyển sang `/chat` hoặc `/projects`).
  2. Hệ thống bắt chặn hành vi điều hướng (Navigation Blocking) và hiển thị Modal cảnh báo:
     - **Tiêu đề**: *"Thay đổi chưa được lưu"*
     - **Nội dung**: *"Bạn có các thay đổi chưa được lưu trên quy tắc này. Nếu rời đi bây giờ, mọi dữ liệu vừa nhập sẽ bị mất."*
     - **Hành động**: Nút "Ở lại tiếp tục sửa" (Mặc định) và nút "Hủy bỏ và rời đi" (Màu xám/đỏ).
  3. Nếu người dùng chọn "Ở lại tiếp tục sửa": Đóng Modal, giữ nguyên trạng thái form và con trỏ chuột.
  4. Nếu người dùng chọn "Hủy bỏ và rời đi": Cho phép chuyển hướng bình thường, dữ liệu nháp được dọn dẹp.

---

## 3. Bản Đồ Luồng Người Dùng Chi Tiết (User Navigation Flows)

```
[ Đăng Nhập Hệ Thống ]
        │
        ▼
[ Menu Sidebar -> Chọn "Rules" ] ───(HTTP 401: Chuyển về Login)
        │
        ▼
[ Màn Hình Thư Viện Rules: /rules ]
   ├──> [ Ô Tìm Kiếm / Bộ Lọc: Scope, Trigger, Status ] ──> [ Cập nhật danh sách Cards / Table ]
   ├──> [ Toggle Switch Status ] ─────────────────────────> [ PATCH /status -> Cập nhật trực tiếp ]
   ├──> [ Nút "Nhân Bản" (Clone) ] ───────────────────────> [ POST /clone -> Chuyển sang /rules/:new_id ]
   ├──> [ Nút "Xóa" ] ──> [ Kiểm tra Project liên kết ] ───> [ Modal Cảnh Báo -> DELETE /rules/:id ]
   │
   ├──> [ Nút "+ Tạo Quy Tắc Mới" ]
   │          │
   │          ▼
   │    [ Màn Hình Tạo Mới: /rules/new ]
   │          │ (Nhập Tên, Mô tả, Trigger, Markdown)
   │          │ (Tab Soạn Thảo <-> Tab Xem Trước Live Preview)
   │          ├──> [ Bấm Hủy khi isDirty ] ──> [ Modal Cảnh Báo Dirty State ]
   │          └──> [ Bấm Lưu ] ──────────────> [ Validate -> POST /api/v1/rules -> Về /rules ]
   │
   └──> [ Click mở chi tiết Rule ]
              │
              ├── [ Nếu là Rule Cá Nhân: scope = 'user' ]
              │          │
              │          ▼
              │    [ Màn Hình Chỉnh Sửa: /rules/:id ]
              │          │ (Chỉnh sửa dữ liệu, Tab Projects liên kết)
              │          ├──> [ Bấm Hủy khi isDirty ] ──> [ Modal Cảnh Báo Dirty State ]
              │          └──> [ Bấm Lưu ] ──────────────> [ PUT /api/v1/rules/:id (Check 409) ]
              │
              └── [ Nếu là Rule Hệ Thống: scope = 'system' ]
                         │
                         ▼
                   [ Màn Hình Chỉ Đọc: /rules/:id ]
                         │ (Tất cả input bị disabled, có thông báo Banner)
                         └──> [ Nút "Nhân Bản Sang Quy Tắc Của Tôi" ] ──> [ Chuyển sang /rules/:new_id ]
```
