# 03. ĐẶC TẢ USE CASES & TIÊU CHÍ NGHIỆM THU (USE CASES & ACCEPTANCE CRITERIA)
## Phân Hệ: Quản Lý System Prompt (System Prompt Management MVP)
### Nền Tảng: AI-Chan Virtual Assistant Platform

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `DOC-SPM-03` |
| **Trạng Thái** | `PROPOSED (Chờ Duyệt Từ Product Owner)` |
| **Vai Trò Phụ Trách** | Senior Business Analyst & QA Lead |
| **Phiên Bản** | `1.0.0-MVP` |
| **Ngày Lập** | `2026-10-11` |

---

## 1. Danh Sách Use Cases Phân Hệ

| Use Case ID | Tên Use Case | Actor Chính | Mức Độ Ưu Tiên | Phân Nhóm Chức Năng |
| :--- | :--- | :--- | :--- | :--- |
| **`UC-SPM-01`** | Xem danh sách System Prompt | End User / Guest User | **Must Have** | Quản lý danh sách |
| **`UC-SPM-02`** | Tìm kiếm System Prompt | End User / Guest User | **Must Have** | Quản lý danh sách |
| **`UC-SPM-03`** | Xem chi tiết System Prompt | End User / Guest User | **Must Have** | Quản lý từng prompt |
| **`UC-SPM-04`** | Tạo mới System Prompt | End User / Guest User | **Must Have** | Quản lý từng prompt |
| **`UC-SPM-05`** | Chỉnh sửa và Lưu System Prompt | End User / Guest User | **Must Have** | Quản lý từng prompt |
| **`UC-SPM-06`** | Xóa System Prompt | End User / Guest User | **Must Have** | Quản lý từng prompt |
| **`UC-SPM-07`** | Nhân bản System Prompt (Clone) | End User / Guest User | **Should Have** | Quản lý từng prompt |

---

## 2. Đặc Tả Chi Tiết Từng Use Case

---

### UC-SPM-01: Xem Danh Sách System Prompt

- **Mã định danh:** `UC-SPM-01`
- **Tên:** Xem danh sách System Prompt
- **Mục tiêu:** Cho phép người dùng xem toàn bộ danh mục các System Prompt thuộc sở hữu của mình để tra cứu, quản lý hoặc bắt đầu các thao tác tạo/sửa/xóa.
- **Actor chính:** End User (đã đăng nhập) hoặc Guest User (dùng thử).
- **Trigger:** Người dùng nhấp vào mục "System Prompts" trên thanh điều hướng hoặc truy cập đường dẫn `/prompts`.
- **Tiền điều kiện (Preconditions):** Trình duyệt đã kết nối thành công tới máy chủ web AI-Chan.
- **Hậu điều kiện (Postconditions):** Danh sách System Prompt được tải và hiển thị trên màn hình với trạng thái trực quan tương ứng.
- **Kiểm tra quyền truy cập (Authorization):** Backend xác định danh tính người dùng (`user_id`) từ JWT token hoặc gán `guest_user`. Truy vấn dữ liệu chỉ lấy các bản ghi có `user_id = :uid`.

#### Luồng sự kiện chính (Main Flow - Happy Path):
1. Người dùng truy cập đường dẫn `/prompts`.
2. Frontend hiển thị giao diện danh sách ở trạng thái Loading (Skeleton Cards).
3. Frontend gửi request HTTP `GET /api/v1/system-prompts`.
4. Backend kiểm tra danh tính người dùng, thực thi câu lệnh SQL:
   ```sql
   SELECT id, name, description, LENGTH(content) AS content_length, created_at, updated_at
   FROM system_prompts
   WHERE user_id = :current_user_id
   ORDER BY updated_at DESC;
   ```
5. Backend trả về HTTP 200 OK với mảng JSON danh sách các System Prompt:
   ```json
   {
     "items": [
       {
         "id": "sp_a1b2c3d4",
         "name": "Senior Python Backend Architect",
         "description": "Chỉ dẫn viết code Python tối ưu O(n), Clean Code và Type Hinting",
         "content_length": 1540,
         "created_at": "2026-10-11T08:00:00Z",
         "updated_at": "2026-10-11T09:30:00Z"
       }
     ],
     "total": 1
   }
   ```
6. Frontend tiếp nhận dữ liệu, tắt skeleton loader và hiển thị danh sách các thẻ prompt với thông tin tóm tắt.
7. Use case kết thúc thành công.

#### Các luồng phụ & Ngoại lệ (Alternate & Exception Flows):

- **A1 — Danh sách chưa có bản ghi nào (Empty State):**
  - Tại bước 5: Backend trả về `{ "items": [], "total": 0 }`.
  - Tại bước 6: Frontend hiển thị giao diện Empty State với biểu tượng thư viện trống, dòng chữ "Bạn chưa có System Prompt nào" và nút kêu gọi hành động lớn "Tạo System Prompt Đầu Tiên".
  - Người dùng có thể nhấp nút này để kích hoạt `UC-SPM-04` (Tạo mới).

- **E1 — Lỗi kết nối mạng hoặc lỗi máy chủ (500 Internal Server Error):**
  - Tại bước 3: Mạng bị ngắt hoặc Backend gặp sự cố không thể truy vấn CSDL.
  - Frontend bắt lỗi, hiển thị Error Banner màu đỏ: "Không thể tải danh sách System Prompt. Vui lòng kiểm tra kết nối mạng và thử lại." kèm nút "Thử lại (Retry)".
  - Người dùng bấm "Thử lại", hệ thống quay về bước 3.

- **E2 — Phiên đăng nhập hết hạn (401 Unauthorized):**
  - Tại bước 4: Token JWT hết hạn hoặc không hợp lệ.
  - Backend trả về HTTP 401 Unauthorized.
  - Frontend hiển thị thông báo "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." và hiển thị nút "Đến trang Đăng nhập".

#### Tiêu chí nghiệm thu (Acceptance Criteria):
- **AC-SPM-01.1:** Người dùng nhìn thấy danh sách các prompt của mình sắp xếp theo thứ tự cập nhật gần nhất giảm dần.
- **AC-SPM-01.2:** Tuyệt đối không nhìn thấy prompt thuộc sở hữu của người dùng khác.
- **AC-SPM-01.3:** Thời gian tải danh sách < 300ms.

---

### UC-SPM-02: Tìm Kiếm System Prompt Tức Thì

- **Mã định danh:** `UC-SPM-02`
- **Tên:** Tìm kiếm System Prompt tức thì
- **Mục tiêu:** Giúp người dùng nhanh chóng xác định một System Prompt cần dùng trong danh sách dựa trên từ khóa tên hoặc mô tả.
- **Actor chính:** End User / Guest User.
- **Trigger:** Người dùng gõ ký tự vào ô tìm kiếm trên trang `/prompts`.
- **Tiền điều kiện:** Danh sách prompt đã được tải ít nhất một lần vào bộ nhớ client.
- **Hậu điều kiện:** Danh sách hiển thị trên màn hình chỉ chứa các mục khớp với từ khóa tìm kiếm.

#### Luồng sự kiện chính (Main Flow):
1. Người dùng nhấp chuột vào ô tìm kiếm có placeholder "Tìm kiếm theo tên hoặc mô tả...".
2. Người dùng gõ chuỗi từ khóa (ví dụ: `python`).
3. Frontend lắng nghe sự kiện `onChange` và thực hiện lọc dữ liệu trên bộ nhớ client:
   ```typescript
   const filtered = items.filter(item => 
     item.name.toLowerCase().includes(query.toLowerCase().trim()) ||
     (item.description && item.description.toLowerCase().includes(query.toLowerCase().trim()))
   );
   ```
4. Giao diện cập nhật danh sách hiển thị ngay lập tức với các thẻ khớp từ khóa.
5. Use case kết thúc.

#### Các luồng phụ & Ngoại lệ:
- **A1 — Không tìm thấy kết quả nào (No-Results State):**
  - Không có bản ghi nào khớp với chuỗi tìm kiếm (`filtered.length === 0`).
  - Giao diện hiển thị icon kính lúp, thông điệp "Không tìm thấy System Prompt nào khớp với từ khóa '[query]'" kèm nút "Xóa tìm kiếm".
  - Người dùng bấm nút "Xóa tìm kiếm", ô nhập bị xóa rỗng và danh sách hiển thị lại đầy đủ bản ghi.
- **A2 — Xóa trắng ô tìm kiếm:**
  - Người dùng xóa toàn bộ ký tự trong ô tìm kiếm hoặc bấm biểu tượng `×`.
  - Danh sách lập tức khôi phục trạng thái hiển thị toàn bộ bản ghi ban đầu.

#### Tiêu chí nghiệm thu:
- **AC-SPM-02.1:** Phản hồi tìm kiếm diễn ra mượt mà tức thì (< 16ms, không giật lag).
- **AC-SPM-02.2:** Tìm kiếm không phân biệt chữ hoa hay chữ thường (Ví dụ: `python` khớp cả `Python` và `PYTHON`).
- **AC-SPM-02.3:** Tìm kiếm không làm mất dữ liệu gốc đã tải từ server.

---

### UC-SPM-03: Xem Chi Tiết System Prompt

- **Mã định danh:** `UC-SPM-03`
- **Tên:** Xem chi tiết System Prompt
- **Mục tiêu:** Cho phép người dùng kiểm tra toàn bộ nội dung chỉ dẫn và metadata của một System Prompt đã lưu.
- **Actor chính:** End User / Guest User.
- **Trigger:** Người dùng nhấp vào một thẻ prompt trên danh sách hoặc truy cập đường dẫn `/prompts/{id}`.
- **Tiền điều kiện:** Bản ghi prompt tồn tại trong hệ thống.
- **Hậu điều kiện:** Nội dung đầy đủ của prompt được hiển thị an toàn trên giao diện.

#### Luồng sự kiện chính (Main Flow):
1. Người dùng nhấp vào thẻ prompt có ID `sp_123` trên danh sách `/prompts`.
2. Hệ thống điều hướng tới `/prompts/sp_123`.
3. Frontend hiển thị trạng thái Loading chi tiết và gửi request `GET /api/v1/system-prompts/sp_123`.
4. Backend kiểm tra quyền sở hữu (`WHERE id = 'sp_123' AND user_id = :uid`).
5. Backend trả về HTTP 200 OK kèm toàn bộ dữ liệu:
   ```json
   {
     "id": "sp_123",
     "user_id": "usr_001",
     "name": "Senior Python Architect",
     "description": "Chỉ dẫn viết code Python chuẩn mực",
     "content": "Bạn là chuyên gia Senior Python. Hãy tuân thủ nghiêm ngặt PEP 8...\n\n```python\ndef example():\n    pass\n```",
     "created_at": "2026-10-11T08:00:00Z",
     "updated_at": "2026-10-11T09:30:00Z"
   }
   ```
6. Frontend render giao diện chi tiết:
   - Header: Tên prompt, Ngày tạo, Ngày cập nhật.
   - Mô tả ngắn: Hiển thị nếu có.
   - Vùng nội dung (Content Viewport): Hiển thị chuỗi `content` bên trong khung văn bản với `white-space: pre-wrap; font-family: monospace;`.
   - Nút hành động: "Chỉnh sửa" (✏️), "Sao chép nội dung" (📋), "Quay lại danh sách" (←).
7. Use case kết thúc.

#### Các luồng phụ & Ngoại lệ:
- **A1 — Người dùng bấm "Sao chép nội dung":**
  - Người dùng bấm nút "Sao chép nội dung" (📋).
  - Frontend gọi `navigator.clipboard.writeText(prompt.content)`.
  - Hiển thị Toast thông báo: "Đã sao chép nội dung prompt vào clipboard".
- **E1 — Bản ghi không tồn tại hoặc không thuộc sở hữu (HTTP 404):**
  - Tại bước 4: Không tìm thấy bản ghi hoặc bản ghi thuộc người dùng khác (Anti-IDOR).
  - Backend trả về HTTP 404 Not Found: `{ "detail": { "error_code": "PROMPT_NOT_FOUND", "message": "System Prompt không tồn tại hoặc bạn không có quyền truy cập." } }`.
  - Frontend hiển thị giao diện báo lỗi 404 thân thiện kèm nút "Quay lại danh sách System Prompts".

#### Tiêu chí nghiệm thu:
- **AC-SPM-03.1:** Nội dung prompt giữ nguyên 100% các ký tự xuống dòng, khoảng trắng thụt lề đầu dòng, ký tự đặc biệt.
- **AC-SPM-03.2:** Tuyệt đối không diễn giải các thẻ HTML/Script có trong nội dung thành mã thực thi (Ngăn chặn XSS).

---

### UC-SPM-04: Tạo Mới System Prompt

- **Mã định danh:** `UC-SPM-04`
- **Tên:** Tạo mới System Prompt
- **Mục tiêu:** Cho phép người dùng soạn thảo và lưu trữ một System Prompt mới vào thư viện cá nhân.
- **Actor chính:** End User / Guest User.
- **Trigger:** Người dùng nhấp nút "Tạo System Prompt Mới" (+) từ trang danh sách hoặc truy cập `/prompts/new`.
- **Tiền điều kiện:** Người dùng có quyền truy cập ứng dụng.
- **Hậu điều kiện:** Bản ghi System Prompt mới được lưu bền vững vào CSDL SQLite và hiển thị trong danh sách.

#### Luồng sự kiện chính (Main Flow):
1. Người dùng bấm nút "Tạo System Prompt Mới" (+).
2. Hệ thống mở form soạn thảo trắng tại `/prompts/new` với các trường:
   - Tên Prompt (Trống, focus tự động).
   - Mô tả ngắn (Trống).
   - Nội dung System Prompt (Trống).
3. Người dùng nhập liệu:
   - Tên: `"Chuyên Gia Phân Tích Nghiệp Vụ BA"`
   - Mô tả: `"Soạn thảo tài liệu đặc tả SRS, User Stories và BPMN flow"`
   - Nội dung: `"Bạn là Lead Business Analyst. Khi nhận yêu cầu, bạn phải phân tích theo 5 pha..."`
4. Bộ đếm ký tự trên giao diện tự động cập nhật theo thời gian thực (VD: `42/100`, `60/500`, `780/10.000`). Trạng thái form đánh dấu `isDirty = true`.
5. Người dùng bấm nút "Lưu System Prompt".
6. Frontend tiến hành Client-side Validation (Kiểm tra tên và nội dung không rỗng, không vượt giới hạn).
7. Frontend gửi request HTTP `POST /api/v1/system-prompts`:
   ```json
   {
     "name": "Chuyên Gia Phân Tích Nghiệp Vụ BA",
     "description": "Soạn thảo tài liệu đặc tả SRS, User Stories và BPMN flow",
     "content": "Bạn là Lead Business Analyst. Khi nhận yêu cầu, bạn phải phân tích theo 5 pha..."
   }
   ```
8. Backend nhận request:
   - Xác thực danh tính `user_id`.
   - Validate Pydantic schema (độ dài, ký tự).
   - Kiểm tra trùng tên trong CSDL:
     ```sql
     SELECT id FROM system_prompts WHERE user_id = :uid AND LOWER(name) = LOWER(:name);
     ```
   - Sinh định danh duy nhất `id = "sp_" + uuid.uuid4().hex`.
   - Thực thi lưu vào CSDL:
     ```sql
     INSERT INTO system_prompts (id, user_id, name, description, content, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
     ```
9. Backend trả về HTTP 201 Created kèm dữ liệu bản ghi mới tạo:
   ```json
   {
     "id": "sp_98765432",
     "user_id": "usr_001",
     "name": "Chuyên Gia Phân Tích Nghiệp Vụ BA",
     "description": "Soạn thảo tài liệu đặc tả SRS, User Stories và BPMN flow",
     "content": "Bạn là Lead Business Analyst. Khi nhận yêu cầu...",
     "created_at": "2026-10-11T13:45:00Z",
     "updated_at": "2026-10-11T13:45:00Z"
   }
   ```
10. Frontend nhận HTTP 201, đánh dấu `isDirty = false`, hiển thị Toast xanh lá "Tạo System Prompt thành công!" và điều hướng về trang danh sách `/prompts`.
11. Use case kết thúc thành công.

#### Các luồng phụ & Ngoại lệ:
- **E1 — Dữ liệu không hợp lệ (Validation Failure - Client hoặc Server):**
  - Tại bước 6 hoặc bước 8: Tên hoặc Nội dung bị rỗng hoặc vượt quá số ký tự quy định.
  - Client chặn gửi request hoặc Backend trả về HTTP 422 Unprocessable Content.
  - Frontend hiển thị thông báo lỗi trực tiếp ngay dưới trường tương ứng (VD: "Nội dung System Prompt không được để trống").
  - Form giữ nguyên mọi dữ liệu người dùng đã gõ, không xóa dữ liệu.
- **E2 — Trùng tên System Prompt trong tài khoản (HTTP 409 Conflict):**
  - Tại bước 8: Đã tồn tại bản ghi cùng `user_id` và cùng `name`.
  - Backend trả về HTTP 409 Conflict:
    ```json
    {
      "detail": {
        "error_code": "PROMPT_NAME_CONFLICT",
        "message": "Bạn đã có một System Prompt mang tên này. Vui lòng chọn tên khác."
      }
    }
    ```
  - Frontend hiển thị lỗi đỏ dưới ô Tên Prompt: "Tên System Prompt đã tồn tại trong tài khoản của bạn".
  - Giữ nguyên toàn bộ nội dung đã soạn thảo trong ô Content để người dùng chỉ cần đổi tên và bấm Lưu lại.
- **E3 — Người dùng hủy bỏ khi form đang dirty:**
  - Tại bước 4: Người dùng bấm nút "Hủy bỏ" hoặc nhấp link chuyển trang.
  - Do `isDirty === true`, hệ thống mở Modal cảnh báo: "Bạn có thay đổi chưa lưu. Bạn có chắc chắn muốn hủy bỏ?".
  - Nếu bấm "Ở lại", đóng modal và tiếp tục soạn thảo.
  - Nếu bấm "Rời đi", hủy bỏ dữ liệu và chuyển về danh sách.

#### Tiêu chí nghiệm thu:
- **AC-SPM-04.1:** Tạo mới thành công bản ghi khi thông tin hợp lệ.
- **AC-SPM-04.2:** Ngăn chặn tuyệt đối việc lưu trùng tên trong cùng một user (HTTP 409).
- **AC-SPM-04.3:** Không mất nội dung đã gõ khi gặp lỗi validation hoặc xung đột tên.

---

### UC-SPM-05: Chỉnh Sửa và Lưu System Prompt

- **Mã định danh:** `UC-SPM-05`
- **Tên:** Chỉnh sửa và Lưu System Prompt
- **Mục tiêu:** Cho phép người dùng cập nhật thông tin tên, mô tả hoặc nội dung của một System Prompt đã tồn tại.
- **Actor chính:** End User / Guest User.
- **Trigger:** Người dùng bấm nút "Chỉnh sửa" (✏️) trên danh sách hoặc trang chi tiết `/prompts/{id}`.
- **Tiền điều kiện:** Bản ghi prompt tồn tại và thuộc sở hữu của người dùng.
- **Hậu điều kiện:** Dữ liệu mới được cập nhật vào CSDL SQLite, `updated_at` được làm mới.

#### Luồng sự kiện chính (Main Flow):
1. Người dùng bấm nút "Chỉnh sửa" trên prompt có ID `sp_123`.
2. Hệ thống mở màn hình `/prompts/sp_123/edit` và nạp dữ liệu hiện tại của prompt vào form.
3. Người dùng sửa đổi nội dung (ví dụ bổ sung thêm quy tắc an toàn vào ô Content).
4. Form ghi nhận thay đổi và đánh dấu `isDirty = true`.
5. Người dùng bấm nút "Lưu thay đổi".
6. Frontend kiểm tra validation và gửi `PUT /api/v1/system-prompts/sp_123`:
   ```json
   {
     "name": "Senior Python Architect (v2)",
     "description": "Cập nhật bổ sung kiến trúc Clean Architecture",
     "content": "Nội dung prompt đã được tối ưu hóa..."
   }
   ```
7. Backend kiểm tra quyền sở hữu (`WHERE id = 'sp_123' AND user_id = :uid`), kiểm tra trùng tên (nếu đổi tên), và thực thi update:
   ```sql
   UPDATE system_prompts
   SET name = :name, description = :description, content = :content, updated_at = CURRENT_TIMESTAMP
   WHERE id = :id AND user_id = :uid;
   ```
8. Backend trả về HTTP 200 OK kèm bản ghi đã cập nhật.
9. Frontend nhận phản hồi, reset `isDirty = false`, hiển thị Toast xanh lá "Cập nhật System Prompt thành công!" và chuyển hướng về trang chi tiết hoặc danh sách.
10. Use case kết thúc thành công.

#### Các luồng phụ & Ngoại lệ:
- **A1 — Người dùng bấm "Lưu" mà không thay đổi bất kỳ trường nào:**
  - Hệ thống ghi nhận form không dirty, có thể hiển thị Toast "Không có thay đổi nào cần lưu" hoặc gửi request bình thường và nhận HTTP 200 OK.
- **E1 — Đổi tên thành một tên đã tồn tại ở bản ghi khác của cùng user (HTTP 409):**
  - Tên mới trùng với tên của một bản ghi khác trong cùng tài khoản.
  - Backend trả về HTTP 409 Conflict. Frontend hiển thị thông báo lỗi dưới ô Tên và giữ nguyên dữ liệu.
- **E2 — Bản ghi bị xóa ở tab/phiên khác trước khi bấm Lưu (HTTP 404):**
  - Bản ghi không còn tồn tại trong CSDL.
  - Backend trả về HTTP 404 Not Found. Frontend hiển thị cảnh báo: "Bản ghi này đã bị xóa hoặc không còn tồn tại." và điều hướng về danh sách.

#### Tiêu chí nghiệm thu:
- **AC-SPM-05.1:** Cập nhật chính xác các trường dữ liệu vào CSDL.
- **AC-SPM-05.2:** `updated_at` được tự động cập nhật thời gian mới.
- **AC-SPM-05.3:** Cảnh báo dirty form hoạt động chính xác khi người dùng chưa bấm Lưu mà cố tình thoát trang.

---

### UC-SPM-06: Xóa System Prompt

- **Mã định danh:** `UC-SPM-06`
- **Tên:** Xóa System Prompt
- **Mục tiêu:** Cho phép người dùng xóa dứt điểm một System Prompt không còn sử dụng.
- **Actor chính:** End User / Guest User.
- **Trigger:** Người dùng bấm biểu tượng thùng rác (🗑️) trên danh sách hoặc nút "Xóa Prompt" trên trang chi tiết.
- **Tiền điều kiện:** Bản ghi prompt tồn tại và thuộc sở hữu của người dùng.
- **Hậu điều kiện:** Bản ghi bị xóa hoàn toàn khỏi CSDL SQLite.

#### Luồng sự kiện chính (Main Flow):
1. Người dùng bấm biểu tượng thùng rác trên prompt có ID `sp_123`.
2. Hệ thống hiển thị Modal xác nhận xóa:
   - "Bạn có chắc chắn muốn xóa vĩnh viễn System Prompt **[Tên]**? Hành động này không thể hoàn tác."
3. Người dùng nhấp nút "Xóa vĩnh viễn".
4. Frontend gửi request HTTP `DELETE /api/v1/system-prompts/sp_123`.
5. Backend kiểm tra quyền sở hữu và thực thi câu lệnh SQL:
   ```sql
   DELETE FROM system_prompts WHERE id = 'sp_123' AND user_id = :current_user_id;
   ```
6. Backend trả về HTTP 200 OK: `{ "success": true, "message": "Đã xóa System Prompt thành công." }`.
7. Frontend đóng Modal, gỡ bỏ bản ghi khỏi danh sách, hiển thị Toast xanh lá "Đã xóa System Prompt thành công."
8. Use case kết thúc thành công.

#### Các luồng phụ & Ngoại lệ:
- **A1 — Người dùng bấm "Hủy bỏ" trên Modal xác nhận:**
  - Tại bước 2, người dùng bấm "Hủy bỏ" hoặc bấm phím `Esc` hoặc bấm ra ngoài vùng modal.
  - Hệ thống đóng modal, không gửi request xóa, giữ nguyên bản ghi trong danh sách.
- **E1 — Lỗi quyền truy cập hoặc ID không tồn tại (HTTP 404):**
  - Backend không tìm thấy bản ghi hoặc bản ghi thuộc user khác.
  - Trả về HTTP 404 Not Found. Frontend thông báo "Không tìm thấy bản ghi cần xóa." và làm mới danh sách.

#### Tiêu chí nghiệm thu:
- **AC-SPM-06.1:** Bản ghi bị xóa hoàn toàn khỏi CSDL, không thể truy xuất lại qua bất kỳ API nào.
- **AC-SPM-06.2:** Bắt buộc phải có bước xác nhận Modal, không được xóa ngầm khi chưa có xác nhận từ người dùng.

---

### UC-SPM-07: Nhân Bản System Prompt (Clone / Duplicate — Should Have)

- **Mã định danh:** `UC-SPM-07`
- **Tên:** Nhân bản System Prompt
- **Mục tiêu:** Giúp người dùng tạo nhanh một bản sao của prompt có sẵn để chỉnh sửa biến thể mà không cần gõ lại từ đầu.
- **Actor chính:** End User / Guest User.
- **Trigger:** Người dùng bấm nút "Nhân bản" (📑) trên menu hành động của thẻ prompt.
- **Tiền điều kiện:** Bản ghi gốc tồn tại và thuộc sở hữu của người dùng.
- **Hậu điều kiện:** Một bản ghi mới được tạo với nội dung sao chép từ bản gốc và tên được thêm hậu tố `(Copy)`.

#### Luồng sự kiện chính (Main Flow):
1. Người dùng bấm nút "Nhân bản" trên prompt `Senior Python Architect`.
2. Frontend gửi request `POST /api/v1/system-prompts/sp_123/clone`.
3. Backend kiểm tra quyền sở hữu bản ghi gốc, đọc dữ liệu `name`, `description`, `content`.
4. Backend sinh tên mới: `Senior Python Architect (Copy)`. (Nếu tên này đã tồn tại, tự động thêm số thứ tự: `Senior Python Architect (Copy 2)`).
5. Backend chèn bản ghi mới với `id` mới và thời điểm tạo mới.
6. Backend trả về HTTP 201 Created với dữ liệu bản ghi bản sao.
7. Frontend thêm bản ghi mới vào đầu danh sách và hiển thị Toast "Đã nhân bản System Prompt thành công!".
8. Use case kết thúc.

#### Tiêu chí nghiệm thu:
- **AC-SPM-07.1:** Bản sao có nội dung và mô tả giống 100% bản gốc.
- **AC-SPM-07.2:** Tên bản sao tự động tránh trùng lặp với bản gốc.
