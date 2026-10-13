# 02. ĐẶC TẢ YÊU CẦU PHẦN MỀM (SOFTWARE REQUIREMENTS SPECIFICATION - SRS)
## Phân Hệ: Quản Lý System Prompt (System Prompt Management MVP)
### Nền Tảng: AI-Chan Virtual Assistant Platform

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `DOC-SPM-02` |
| **Trạng Thái** | `PROPOSED (Chờ Duyệt Từ Product Owner)` |
| **Vai Trò Phụ Trách** | Senior Business Analyst |
| **Phiên Bản** | `1.0.0-MVP` |
| **Ngày Lập** | `2026-10-11` |

---

## 1. Giới Thiệu & Mục Tiêu Nghiệp Vụ

### 1.1. Mục Đích Tài Liệu
Tài liệu này đặc tả chi tiết các yêu cầu chức năng (Functional Requirements), yêu cầu phi chức năng (Non-Functional Requirements) và các quy tắc nghiệp vụ (Business Rules) cho phân hệ **Quản lý System Prompt (System Prompt Management MVP)** của nền tảng AI-Chan. Tài liệu đóng vai trò làm căn cứ nghiệm thu chính thức giữa Product Owner, Business Analyst, Solution Architect, Software Engineer và QA Tester.

### 1.2. Mục Tiêu Nghiệp Vụ (Business Goals)
- **BG-01 (Tập trung hóa tài nguyên Prompt):** Cung cấp một thư viện có cấu trúc cho phép người dùng lưu trữ, phân loại và tái sử dụng các chỉ dẫn hệ thống (System Prompts) đã được tối ưu hóa cho nhiều tác vụ (Lập trình, Viết lách, Phân tích nghiệp vụ, Kiểm thử hệ thống, Trợ lý hội thoại).
- **BG-02 (Tối ưu hóa năng suất người dùng):** Giảm thiểu thời gian gõ lại hoặc sao chép thủ công các chỉ thị dài phức tạp mỗi khi bắt đầu một phiên làm việc mới.
- **BG-03 (Bảo vệ tính toàn vẹn và an toàn dữ liệu):** Đảm bảo mọi nội dung prompt (bao gồm cả các quy tắc kỹ thuật phức tạp, code mẫu, định dạng JSON/Markdown) được lưu trữ nguyên vẹn 100% không suy hao, đồng thời ngăn chặn các cuộc tấn công Stored XSS thông qua nội dung prompt độc hại.
- **BG-04 (Cách ly và bảo mật dữ liệu):** Đảm bảo quyền riêng tư và sở hữu trí tuệ của từng người dùng, ngăn chặn việc đọc trộm hoặc sửa đổi chéo prompt qua lỗ hổng phân quyền (Anti-IDOR).

### 1.3. Các Bên Liên Quan & Tác Nhân (Stakeholders & Actors)
- **End User (Người dùng đã đăng nhập):** Người dùng có tài khoản hợp lệ, có quyền tạo, xem, tìm kiếm, chỉnh sửa và xóa các System Prompt thuộc sở hữu của mình.
- **Guest User (Người dùng dùng thử / Khách):** Người dùng chưa đăng nhập, sử dụng phiên làm việc khách với định danh `guest_user` để trải nghiệm tạo và quản lý prompt cục bộ trên môi trường thử nghiệm.
- **System Administrator (Quản trị viên):** Quản trị hệ thống, giám sát vận hành qua telemetry (không can thiệp hoặc đọc trộm nội dung prompt riêng tư của người dùng).
- **Backend API Service:** Dịch vụ xử lý nghiệp vụ, kiểm tra tính hợp lệ dữ liệu, thực thi kiểm soát truy cập và lưu trữ dữ liệu vào SQLite.

---

## 2. Quy Tắc Nghiệp Vụ (Business Rules — SPM-BR)

| Quy Tắc ID | Tên Quy Tắc | Nội Dung Chi Tiết Cưỡng Chế Nghiệp Vụ |
| :--- | :--- | :--- |
| **SPM-BR-001** | **Quyền Sở Hữu Dữ Liệu (Ownership & Tenancy)** | Mỗi bản ghi System Prompt bắt buộc gắn liền với một định danh chủ sở hữu `user_id`. Nếu người dùng chưa đăng nhập, `user_id` mặc định là `guest_user`. Người dùng chỉ có quyền đọc, tìm kiếm, chỉnh sửa hoặc xóa các bản ghi do chính mình tạo ra. Mọi truy vấn không khớp `user_id` đều bị từ chối với HTTP 404 Not Found (để tránh rò rỉ sự tồn tại của ID). |
| **SPM-BR-002** | **Tính Duy Nhất Của Tên Prompt (Name Uniqueness Scope)** | Trong cùng một tài khoản người dùng (`user_id`), không được phép có hai System Prompt trùng tên nhau (so sánh không phân biệt hoa/thường: `LOWER(TRIM(name))`). Nếu người dùng cố tình lưu trùng tên, hệ thống chặn lại và trả về HTTP 409 Conflict. Hai người dùng khác nhau được phép đặt tên prompt giống nhau. |
| **SPM-BR-003** | **Ràng Buộc Độ Dài Tên & Mô Tả (Header Limits)** | - **Tên Prompt (`name`):** Bắt buộc (Mandatory), độ dài từ 1 đến 100 ký tự sau khi cắt tỉa khoảng trắng đầu/cuối (`TRIM`). Không được chỉ chứa toàn khoảng trắng.<br>- **Mô tả Prompt (`description`):** Tùy chọn (Optional, nullable), độ dài tối đa 500 ký tự. |
| **SPM-BR-004** | **Ràng Buộc Dung Lượng Nội Dung (Content Constraints)** | - **Nội dung (`content`):** Bắt buộc (Mandatory), độ dài từ 1 đến 10.000 ký tự. Không được rỗng hoặc chỉ chứa khoảng trắng.<br>- 10.000 ký tự tương đương khoảng 2.000 - 2.500 tokens, đáp ứng 99% các System Instruction phức tạp của Gemini 1.5/2.5/3.8, GPT-4o, Claude 3.7.<br>- Hệ thống từ chối mọi payload vượt quá 10.000 ký tự với HTTP 422 Unprocessable Content. |
| **SPM-BR-005** | **Bảo Toàn Chuẩn Ký Tự Văn Bản (Text Preservation Invariant)** | Quá trình nhận, lưu vào CSDL và truy xuất ra UI bắt buộc phải bảo toàn nguyên vẹn 100% định dạng: ký tự xuống dòng (`\n`, `\r\n`), khoảng trắng thụt lề, bảng ký tự Unicode Tiếng Việt (NFC/NFD), emoji, các ký tự dấu ngoặc lập trình (`{`, `}`, `[`, `]`, `<`, `>`), dấu nháy đơn/kép. Tuyệt đối không được tự ý strip khoảng trắng giữa các dòng hoặc unescape sai ký tự. |
| **SPM-BR-006** | **Chính Sách Xóa Bản Ghi Vĩnh Viễn (Hard Delete Policy)** | Thao tác Xóa bản ghi trong phạm vi MVP là xóa vĩnh viễn (Hard Delete) khỏi bảng `system_prompts`. Thao tác này là không thể hoàn tác (Irreversible). Giao diện bắt buộc hiển thị Modal cảnh báo xác nhận rõ ràng trước khi gửi lệnh xóa. |
| **SPM-BR-007** | **Quy Tắc Tìm Kiếm (Search Rules)** | Ô tìm kiếm lọc danh sách dựa trên so sánh chuỗi con (Substring matching) trên hai trường `name` và `description`. Tìm kiếm không phân biệt hoa/thường và hỗ trợ tiếng Việt có dấu. Không thực hiện quét nội dung trường `content` để đảm bảo tốc độ phản hồi < 50ms và bảo vệ quyền riêng tư người dùng. |
| **SPM-BR-008** | **Cơ Chế Lưu Ghi Đè (Last-Write-Wins Update)** | Khi cập nhật bản ghi, hệ thống áp dụng cơ chế ghi đè dữ liệu mới nhất (Last-write-wins). Thời điểm cập nhật `updated_at` tự động được nâng cấp lên thời gian hiện tại (`CURRENT_TIMESTAMP`). |
| **SPM-BR-009** | **Bảo Vệ Dữ Liệu Đang Soạn Thảo (Dirty State Protection)** | Nếu người dùng đã thực hiện bất kỳ thao tác gõ/xóa nào trên form soạn thảo (`isDirty === true`) mà bấm nút thoát, nút quay lại hoặc đóng tab trình duyệt, hệ thống bắt buộc kích hoạt cảnh báo ngăn chặn rời trang để tránh mất mát công sức người dùng. |
| **SPM-BR-010** | **Xử Lý Lỗi Tập Trung & Thân Thiện (Error Transparency)** | Khi xảy ra lỗi validation hoặc lỗi hệ thống, giao diện không được phép hiển thị màn hình trắng (Crash) hoặc mã lỗi kỹ thuật khó hiểu. Mọi lỗi phải được hiển thị bằng thông điệp tiếng Việt rõ ràng: lỗi theo trường (Field error) đặt dưới ô nhập, lỗi hệ thống hiển thị qua Toast màu đỏ. |

---

## 3. Yêu Cầu Chức Năng Chi Tiết (Functional Requirements — SPM-FR)

### 3.1. Nhóm A: Quản Lý Danh Sách System Prompt

#### SPM-FR-001: Mở và Tải Trang Danh Sách System Prompt
- **Mô tả:** Hệ thống cung cấp route `/prompts` trên frontend kết nối với API `GET /api/v1/system-prompts`.
- **Luồng chính:**
  1. Người dùng truy cập `/prompts` qua liên kết điều hướng hoặc gõ trực tiếp URL.
  2. Frontend hiển thị trạng thái Loading Skeleton.
  3. Frontend gửi request `GET /api/v1/system-prompts` kèm token xác thực (hoặc không có token nếu là khách).
  4. Backend kiểm tra danh tính và truy vấn `SELECT id, name, description, LENGTH(content) AS content_length, created_at, updated_at FROM system_prompts WHERE user_id = :uid ORDER BY updated_at DESC`.
  5. Frontend nhận danh sách và render dạng danh sách lưới các thẻ (Cards Grid).
- **Tiêu chí nghiệm thu:**
  - Thời gian phản hồi API < 150ms.
  - Danh sách hiển thị đúng các bản ghi thuộc tài khoản hiện tại.

#### SPM-FR-002: Xử Lý Đầy Đủ 6 Trạng Thái Giao Diện
- **Mô tả:** Giao diện `/prompts` phải xử lý trực quan và tự động chuyển đổi giữa 6 trạng thái nghiệp vụ:
  1. **Loading State:** Hiển thị 3-6 khung xương (Skeleton loader) nhấp nháy êm dịu, không gây giật layout (Cumulative Layout Shift = 0).
  2. **Populated State:** Hiển thị danh sách thẻ prompt đầy đủ thông tin: Tên in đậm, Mô tả ngắn (tối đa 2 dòng, cắt đuôi `...`), Số ký tự nội dung (ví dụ: `1,250 ký tự`), Ngày cập nhật định dạng thân thiện (`10 phút trước` hoặc `11/10/2026`).
  3. **Empty State:** Khi người dùng chưa có bất kỳ prompt nào (`items.length === 0`), hiển thị hình minh họa tinh tế, thông điệp "Bạn chưa có System Prompt nào" và nút kêu gọi hành động lớn "Tạo System Prompt Đầu Tiên".
  4. **No-Results State:** Khi có dữ liệu nhưng từ khóa tìm kiếm không khớp bản ghi nào, hiển thị icon kính lúp, thông điệp "Không tìm thấy System Prompt nào khớp với từ khóa '[keyword]'", kèm nút "Xóa bộ lọc".
  5. **Error State:** Khi API trả về 5xx hoặc mất kết nối mạng, hiển thị banner cảnh báo màu đỏ kèm nút "Thử lại (Retry)".
  6. **Forbidden / Unauthorized State:** Khi token hết hạn hoặc không hợp lệ, hiển thị thông báo yêu cầu đăng nhập lại kèm nút chuyển hướng đến `/login`.

#### SPM-FR-003: Tìm Kiếm Tức Thì Trong Danh Sách
- **Mô tả:** Ô tìm kiếm (Search Box) cho phép người dùng lọc nhanh danh sách mà không cần bấm Enter hay tải lại trang.
- **Quy tắc kỹ thuật:**
  - Sử dụng cơ chế lọc Client-side trên tập dữ liệu đã tải: `prompt.name.toLowerCase().includes(query) || prompt.description.toLowerCase().includes(query)`.
  - Hỗ trợ loại bỏ dấu tiếng Việt khi tìm kiếm (tùy chọn) hoặc tìm chính xác chuỗi Unicode.
  - Nếu query rỗng (`""`), tự động hiển thị lại toàn bộ danh sách ban đầu.

#### SPM-FR-004: Xóa Bản Ghi Kèm Hộp Thoại Xác Nhận
- **Mô tả:** Cho phép xóa bỏ một System Prompt không còn nhu cầu sử dụng.
- **Luồng xử lý:**
  1. Người dùng bấm nút biểu tượng Thùng rác (🗑️) tại thẻ prompt tương ứng.
  2. Hệ thống mở Modal xác nhận xóa với nội dung:
     - Tiêu đề: "Xác nhận xóa System Prompt"
     - Nội dung: "Hành động này sẽ xóa vĩnh viễn System Prompt **[Tên Prompt]**. Bạn không thể khôi phục lại dữ liệu này sau khi xóa."
     - Nút hành động: "Hủy bỏ" (Màu xám) và "Xóa vĩnh viễn" (Màu đỏ nguy hiểm).
  3. Người dùng bấm "Xóa vĩnh viễn": Frontend gửi `DELETE /api/v1/system-prompts/{id}`.
  4. Backend xóa bản ghi trong CSDL: `DELETE FROM system_prompts WHERE id = :id AND user_id = :uid`.
  5. Backend trả về HTTP 200 `{ "success": true, "message": "Đã xóa System Prompt thành công" }`.
  6. Frontend đóng Modal, loại bỏ thẻ đó khỏi danh sách, hiển thị Toast xanh lá thông báo thành công.

---

### 3.2. Nhóm B: Quản Lý Từng System Prompt (Chi Tiết & Soạn Thảo)

#### SPM-FR-005: Xem Chi Tiết System Prompt
- **Mô tả:** Cung cấp màn hình `/prompts/{id}` cho phép xem nội dung chi tiết của bản ghi.
- **Nội dung hiển thị:**
  - Tiêu đề trang: Tên prompt.
  - Mô tả: Hiển thị đầy đủ nội dung mô tả (nếu có).
  - Khung nội dung (Content Viewport): Hiển thị toàn bộ nội dung prompt trong khung văn bản có thanh cuộn dọc (Scrollbar), giữ nguyên định dạng dòng, có nút tiện ích "Sao chép nội dung" (Copy to Clipboard).
  - Nút hành động: "Chỉnh sửa" (Chuyển sang form edit) và "Quay lại danh sách".

#### SPM-FR-006: Tạo Mới System Prompt
- **Mô tả:** Màn hình `/prompts/new` cung cấp biểu mẫu nhập liệu để tạo mới một System Prompt.
- **Các trường biểu mẫu:**
  1. **Tên Prompt (`name`):** Input text, placeholder: "VD: Trợ lý Lập trình Python Senior", autofocus, max 100 ký tự, có bộ đếm ký tự `x/100`.
  2. **Mô tả ngắn (`description`):** Textarea 2 dòng, placeholder: "Mô tả mục đích sử dụng của prompt này (tùy chọn)", max 500 ký tự, có bộ đếm ký tự `x/500`.
  3. **Nội dung System Prompt (`content`):** Textarea soạn thảo đa dòng lớn (tối thiểu 12 dòng, hỗ trợ giãn dòng linh hoạt), placeholder: "Nhập toàn bộ chỉ dẫn hệ thống, phong cách phản hồi, nguyên tắc an toàn tại đây...", font chữ Monospace dễ đọc, max 10.000 ký tự, có bộ đếm ký tự `x/10.000`.
- **Hành động:**
  - Nút "Hủy bỏ": Quay lại danh sách (kích hoạt kiểm tra dirty form nếu đã nhập liệu).
  - Nút "Lưu System Prompt": Kích hoạt validate và gửi `POST /api/v1/system-prompts`.

#### SPM-FR-007: Chỉnh Sửa System Prompt
- **Mô tả:** Màn hình `/prompts/{id}/edit` nạp dữ liệu cũ của prompt có ID tương ứng và cho phép chỉnh sửa.
- **Hành vi:**
  - Nạp chính xác dữ liệu cũ vào các ô nhập liệu.
  - Theo dõi trạng thái thay đổi (`isDirty`). Nếu người dùng chưa thay đổi gì, nút "Lưu thay đổi" có thể ở trạng thái disabled hoặc cho phép bấm mà không báo lỗi.
  - Khi người dùng sửa và bấm "Lưu thay đổi", gửi request `PUT /api/v1/system-prompts/{id}`.
  - Sau khi lưu thành công: Reset trạng thái `isDirty = false`, hiển thị Toast thành công và chuyển hướng về trang danh sách hoặc trang chi tiết.

#### SPM-FR-008: Kiểm Tra Hợp Lệ Dữ Liệu (Validation Rules)
- **Client-side Validation:**
  - Khi trường `name` rỗng hoặc chỉ có khoảng trắng: Báo lỗi "Tên System Prompt không được để trống".
  - Khi trường `content` rỗng hoặc chỉ có khoảng trắng: Báo lỗi "Nội dung System Prompt không được để trống".
  - Khi độ dài vượt quá giới hạn: Ngăn chặn gõ tiếp và đổi màu bộ đếm sang đỏ `var(--danger)`.
- **Server-side Validation (Pydantic v2):**
  - Bắt buộc kiểm tra lại toàn bộ điều kiện trên ở Backend. Nếu vi phạm, trả về HTTP 422 Unprocessable Content kèm danh sách chi tiết các trường bị lỗi.

#### SPM-FR-009: Xử Lý Xung Đột Trùng Tên (Conflict Handling)
- **Kịch bản:** Người dùng lưu prompt với tên đã tồn tại trong tài khoản của họ.
- **Phản hồi:**
  - Backend bắt ngoại lệ `sqlite3.IntegrityError` từ ràng buộc `UNIQUE(user_id, name)`.
  - Trả về HTTP 409 Conflict: `{ "detail": { "error_code": "PROMPT_NAME_CONFLICT", "message": "Bạn đã có một System Prompt mang tên này. Vui lòng chọn tên khác." } }`.
  - Frontend hiển thị thông báo lỗi trực tiếp ngay dưới ô nhập Tên Prompt, focus con trỏ vào ô Tên để người dùng chỉnh sửa, **giữ nguyên toàn bộ nội dung đã soạn thảo trong ô Content**.

#### SPM-FR-010: Bảo Toàn Tuyệt Đối Ký Tự Unicode & Xuống Dòng
- **Yêu cầu:**
  - Mọi chuỗi xuống dòng `\n` và `\r\n` phải được lưu trữ chuẩn hóa dạng `\n` trong SQLite.
  - Khi trả về qua API, JSON serialization phải giữ nguyên encoding UTF-8 (`ensure_ascii=False`).
  - Giao diện Textarea hiển thị chính xác mọi khoảng cách thụt lề, định dạng code block, danh sách gạch đầu dòng và ký tự tiếng Việt có dấu.

#### SPM-FR-011: Hiển Thị An Toàn Tuyệt Đối Chống XSS (Safe Rendering)
- **Yêu cầu an toàn:**
  - Trong màn hình xem chi tiết hoặc danh sách, nội dung prompt không bao giờ được render qua `dangerouslySetInnerHTML` hoặc các trình thông dịch HTML.
  - Sử dụng thẻ `<textarea readOnly>` hoặc `<div>` với thuộc tính CSS `white-space: pre-wrap; word-break: break-word;` và gán nội dung qua `children` thuần túy của React (`{prompt.content}`).
  - Bất kỳ mã độc dạng `<script>alert(document.cookie)</script>` hay `<img src=x onerror=...>` đều hiển thị dưới dạng chuỗi văn bản vô hại.

#### SPM-FR-012: Cảnh Báo Thay Đổi Chưa Lưu (Dirty Form Protection)
- **Yêu cầu:**
  - Khi `isDirty === true`, nếu người dùng bấm vào các liên kết điều hướng nội bộ của Next.js (như Logo, Menu Sidebar, Nút Hủy), hiển thị Modal xác nhận:
    - "Cảnh báo: Bạn có thay đổi chưa được lưu lại. Nếu tiếp tục rời đi, mọi dữ liệu vừa nhập sẽ bị mất."
    - Nút: "Ở lại soạn thảo" và "Rời đi (Hủy thay đổi)".
  - Lắng nghe sự kiện trình duyệt `window.addEventListener('beforeunload', ...)` để cảnh báo khi người dùng bấm F5 (Reload) hoặc đóng tab.

---

## 4. Yêu Cầu Phi Chức Năng (Non-Functional Requirements — SPM-NFR)

### 4.1. Hiệu Năng & Khả Năng Đáp Ứng (Performance — SPM-NFR-001 đến 003)
- **SPM-NFR-001 (API Latency):** Thời gian phản hồi trung bình của API `GET /api/v1/system-prompts` và `GET /api/v1/system-prompts/{id}` phải dưới 100ms trên môi trường máy chủ tiêu chuẩn đối với người dùng có tối đa 100 prompts.
- **SPM-NFR-002 (Search Responsiveness):** Tính năng tìm kiếm tức thời trên client phải phản hồi ngay lập tức sau mỗi lần gõ phím (< 16ms, đạt 60fps, không gây lag giao diện).
- **SPM-NFR-003 (Payload Size & Memory):** Kích thước payload JSON tối đa của một prompt (10.000 ký tự) chỉ khoảng ~10-15KB, hoàn toàn nhẹ nhàng cho băng thông mạng và bộ nhớ trình duyệt di động.

### 4.2. Bảo Mật & Quyền Riêng Tư (Security & Privacy — SPM-NFR-004 đến 007)
- **SPM-NFR-004 (Anti-IDOR):** 100% các endpoint xử lý dữ liệu theo `id` (`GET`, `PUT`, `DELETE`) đều phải áp dụng bộ lọc xác thực chủ sở hữu `user_id` ở tầng Backend.
- **SPM-NFR-005 (Safe Logging):** Hệ thống nhật ký (Logging) tuyệt đối không in nội dung trường `content` ra stdout/file logs. Chỉ được phép ghi nhận độ dài ký tự (`content_length`).
- **SPM-NFR-006 (Zero-Trust Input):** Backend không tin tưởng dữ liệu từ client; mọi ràng buộc độ dài và ký tự đều được validate lại nghiêm ngặt qua Pydantic v2.
- **SPM-NFR-007 (Input Sanitization):** Chống SQL Injection bằng cách sử dụng Parameterized Queries (`?`) của SQLite trong 100% các câu lệnh truy vấn CSDL.

### 4.3. Độ Tin Cậy & Tính Toàn Vẹn (Reliability — SPM-NFR-008 đến 010)
- **SPM-NFR-008 (Atomicity):** Mọi thao tác ghi dữ liệu vào CSDL phải tuân thủ tính nguyên tố (Atomic Operation); không để xảy ra trạng thái dữ liệu lưu một nửa.
- **SPM-NFR-009 (Zero Data Corruption):** Bảo toàn độ chính xác ký tự đạt 100% qua các chu trình Create -> Store -> Read -> Update -> Read đối với mọi bảng mã Unicode tiếng Việt và ký tự đặc biệt.
- **SPM-NFR-010 (Graceful Degradation):** Khi mất kết nối mạng đột ngột lúc đang bấm Lưu, form phải giữ nguyên toàn bộ dữ liệu đã nhập và hiển thị nút "Thử lại", tuyệt đối không xóa sạch form khiến người dùng mất dữ liệu.

### 4.4. Trải Nghiệm Người Dùng & Thiết Kế (Usability & Design — SPM-NFR-011 đến 013)
- **SPM-NFR-011 (Design System Consistency):** Giao diện phải tuân thủ 100% ngôn ngữ thiết kế hiện có của AI-Chan: Dark theme sâu thẳm (`#0a0f1d`), hiệu ứng làm mờ viền kính (Glassmorphism), dải màu nhấn tím-lam (Indigo/Purple Gradient), font chữ hiện đại, icon đồng bộ.
- **SPM-NFR-012 (Responsive Design):** Tương thích hoàn hảo trên màn hình Desktop (>= 1280px), Tablet (768px - 1024px) và Mobile (< 768px). Trên Mobile, danh sách chuyển sang dạng thẻ đơn 1 cột, thanh công cụ tự động co giãn.
- **SPM-NFR-013 (Accessibility):** Các nút bấm biểu tượng đều có `aria-label` và `title`. Hỗ trợ phím `Tab` để di chuyển giữa các trường, phím `Esc` để đóng modal xác nhận xóa.
