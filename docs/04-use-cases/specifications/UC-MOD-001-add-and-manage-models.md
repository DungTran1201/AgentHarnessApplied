# UC-MOD-001 [UC-026] — Đăng Ký, Chỉnh Sửa, Tìm Kiếm & Quản Lý Mô Hình Agent (Model Management Extensions Specification)

---

## 1. Overview
Đặc tả chi tiết bộ ca sử dụng mở rộng quản lý mô hình Agent bao gồm:
- **`UC-MOD-001 [UC-026]`**: Đăng ký và bổ sung mô hình Agent mới vào danh mục hệ thống.
- **`UC-MOD-002 [UC-027]`**: Hiệu chỉnh cấu hình tham số kỹ thuật và xóa mềm / lưu trữ mô hình có bảo vệ mô hình mặc định.
- **`UC-MOD-003 [UC-028]`**: Tìm kiếm tức thì và sàng lọc danh mục mô hình đa tiêu chí.

---

## 2. Goal
Cung cấp khả năng quản lý động toàn diện cho danh mục mô hình AI đa nhà cung cấp, cho phép người dùng mở rộng các mô hình LLM mới, tùy biến tham số an toàn, tìm kiếm và lọc mô hình tức thì với độ trễ thấp, và bảo toàn toàn vẹn dữ liệu thông qua cơ chế lưu trữ mềm có chốt chặn bảo vệ mô hình mặc định.

---

## 3. Scope
Hệ thống AI-Chan (Phân hệ Quản lý Mô hình & Agent — `CAP-AGENT-MGMT`).

---

## 4. Primary Actor
`ACT-02: Registered User / System Administrator`.

---

## 5. Supporting Actors
- `ai-frontend`: Giao diện web `/models` hiển thị thanh tìm kiếm debounced, bộ lọc đa thuộc tính, modal thêm mô hình, drawer sửa cấu hình và modal xác nhận lưu trữ.
- `ai-backend`: Dịch vụ máy chủ FastAPI (`models.py`) tiếp nhận và thẩm định tham số, kiểm tra tính duy nhất của ID, kiểm tra cờ mặc định, cập nhật trạng thái và đồng bộ bộ định tuyến chat.
- `Database SQLite`: Bảng dữ liệu `agent_models` lưu trữ cấu hình, trạng thái hoạt động (`ACTIVE`, `INACTIVE`, `DEGRADED`, `ARCHIVED`) và các chỉ số đo lường.

---

## 6. Trigger
Người dùng thao tác trên giao diện `/models`: nhấn nút "Thêm mô hình mới", chỉnh sửa thông số trên thẻ mô hình, gõ từ khóa tìm kiếm, thay đổi tiêu chí lọc hoặc nhấn nút xóa/lưu trữ mô hình.

---

## 7. Preconditions
- Người dùng đã đăng nhập vào hệ thống với JWT session cookie hợp lệ.
- Danh mục mô hình hiện có đã được khởi tạo trong cơ sở dữ liệu.

---

## 8. Postconditions

### 8.1 Success Postconditions
- Khi thêm mới: Bản ghi mô hình mới được lưu trữ trong bảng `agent_models` với trạng thái ban đầu và tham số hợp lệ (`FR-035`, `BR-022`, `BR-024`).
- Khi chỉnh sửa: Tên hiển thị, các giới hạn tokens và cờ streaming được cập nhật; `id` và `provider` được giữ nguyên bất biến (`FR-036`, `BR-022`).
- Khi tìm kiếm/lọc: Danh sách mô hình phù hợp được trả về cho giao diện với độ trễ $\le 200\text{ms}$ (`FR-037`, `FR-038`, `NFR-022`).
- Khi lưu trữ mềm: Trạng thái mô hình chuyển sang `ARCHIVED`, loại khỏi danh mục đàm thoại nhưng không phá vỡ liên kết khóa ngoại với lịch sử (`FR-039`, `BR-023`).

### 8.2 Failure Postconditions
- Giao dịch bị rollback, dữ liệu cũ được giữ nguyên 100%.
- Trả về mã lỗi HTTP tương ứng (400, 404, 409, 422) kèm thông điệp giải thích rõ ràng cho người dùng.

---

## 9. Main Success Scenario (Kịch Bản Thành Công Chính)

### Kịch Bản A: Thêm Mô Hình Mới (`UC-MOD-001 [UC-026]`)
1. Người dùng bấm nút "+ Thêm mô hình mới" trên thanh công cụ trang `/models`.
2. Giao diện mở Modal Form đăng ký mô hình mới.
3. Người dùng nhập thông tin:
   - Mã định danh (`id`): Ví dụ `gemini-3.8-flash` hoặc `custom-llama-3`.
   - Tên hiển thị (`name`): Ví dụ "Gemini 3.8 Flash (High Speed)".
   - Nhà cung cấp (`provider`): Chọn từ danh sách (`GOOGLE`, `ANTHROPIC`, `OPENAI`, `GROQ`, `OLLAMA`).
   - Cửa sổ ngữ cảnh (`context_window`): Ví dụ `1000000`.
   - Giới hạn token tối đa (`max_tokens`): Ví dụ `8192`.
   - Hỗ trợ streaming: Bật `true`.
4. Người dùng bấm "Lưu mô hình".
5. Client gửi yêu cầu `POST /api/v1/models` (`OP-022`) kèm payload JSON.
6. Backend kiểm tra mã `id` chưa từng tồn tại trong bảng `agent_models` (`BR-022`).
7. Backend kiểm tra tham số: `context_window >= 1000` và `max_tokens >= 256` (`BR-024`).
8. Backend thêm bản ghi mới vào cơ sở dữ liệu và trả về mã `HTTP 201 Created`.
9. Modal đóng lại, thẻ mô hình mới xuất hiện ngay trên giao diện `/models`.

### Kịch Bản B: Chỉnh Sửa Thông Tin Mô Hình (`UC-MOD-002 [UC-027]`)
1. Người dùng bấm nút "Chỉnh sửa" trên thẻ mô hình cần cập nhật.
2. Giao diện mở Drawer/Modal chỉnh sửa hiển thị thông tin hiện tại. Lưu ý trường `id` và `provider` ở trạng thái khóa không cho sửa (`disabled / read-only`).
3. Người dùng cập nhật tên hiển thị, context window hoặc max tokens.
4. Người dùng nhấn nút "Lưu thay đổi".
5. Client gửi yêu cầu `PUT /api/v1/models/{id}` (`OP-023`).
6. Backend xác thực người dùng và phân quyền (`SEC-010`, `CTRL-009`).
7. Backend kiểm tra tính bất biến của `id` và `provider` (`BR-022`).
8. Backend kiểm tra tính hợp lệ của tham số (`BR-024`).
9. Backend cập nhật bản ghi trong cơ sở dữ liệu và trả về mã `HTTP 200 OK`.
10. Giao diện cập nhật hiển thị ngay lập tức với các thông số mới.

### Kịch Bản C: Tìm Kiếm & Bộ Lọc Đa Tiêu Chí (`UC-MOD-003 [UC-028]`)
1. Người dùng nhập từ khóa tìm kiếm (ví dụ "flash") vào Search Bar.
2. Client kích hoạt bộ đệm debounce 300ms (`UX-008`).
3. Người dùng chọn thêm bộ lọc: Provider = "GOOGLE", Status = "ACTIVE".
4. Client gửi yêu cầu `GET /api/v1/models/search?q=flash&provider=GOOGLE&status=ACTIVE` (`OP-024`).
5. Backend thực hiện lọc tập dữ liệu mô hình kết hợp vị từ tìm kiếm và bộ lọc.
6. Backend trả về danh sách mô hình khớp trong thời gian $\le 200\text{ms}$ (`NFR-022`).
7. Giao diện hiển thị danh sách các mô hình thỏa mãn điều kiện và làm nổi bật từ khóa tìm kiếm.

### Kịch Bản D: Xóa Mềm & Lưu Trữ Mô Hình (`UC-MOD-002 [UC-027]`)
1. Người dùng nhấn nút biểu tượng "Lưu trữ / Xóa" trên thẻ mô hình không còn nhu cầu sử dụng.
2. Giao diện hiển thị hộp thoại cảnh báo: "Bạn có chắc chắn muốn chuyển mô hình này vào kho lưu trữ?".
3. Người dùng xác nhận; Client gửi yêu cầu `DELETE /api/v1/models/{id}` (`OP-025`).
4. Backend kiểm tra cờ `is_default` của mô hình (`BR-023`).
5. Mô hình hiện tại không phải là mô hình mặc định (`is_default == false`).
6. Backend cập nhật `status = ARCHIVED` và lưu vào cơ sở dữ liệu (`FR-039`).
7. Backend đồng bộ loại mô hình khỏi danh sách chọn của Agent chat.
8. Backend trả về mã `HTTP 200 OK`.
9. Thẻ mô hình được ẩn khỏi danh sách đang hoạt động trên giao diện.

---

## 10. Alternate & Exception Scenarios (Kịch Bản Thay Thế & Ngoại Lệ)

### Ngoại Lệ 1: Trùng Lặp Mã Định Danh Khi Thêm Mới (`BR-022`)
- **Điều kiện**: Người dùng nhập mã `id` của mô hình đã tồn tại trong cơ sở dữ liệu.
- **Xử lý**: Backend từ chối với mã lỗi `HTTP 409 Conflict`: "Mã định danh mô hình đã tồn tại trong hệ thống. Vui lòng chọn mã khác."
- **Giao diện**: Hiển thị thông báo lỗi màu đỏ tại ô nhập ID trong Modal và không đóng Modal.

### Ngoại Lệ 2: Cố Tình Thay Đổi Mã Định Danh Hoặc Nhà Cung Cấp Khi Cập Nhật (`BR-022`)
- **Điều kiện**: Client gửi yêu cầu PUT với payload chứa `id` hoặc `provider` khác với dữ liệu hiện tại trong cơ sở dữ liệu.
- **Xử lý**: Backend từ chối ngay lập tức với mã lỗi `HTTP 400 Bad Request`: "Mã định danh và nhà cung cấp mô hình là bất biến và không thể thay đổi." (`BR-022`).

### Ngoại Lệ 3: Cố Tình Xóa Hoặc Lưu Trữ Mô Hình Mặc Định (`BR-023`)
- **Điều kiện**: Người dùng yêu cầu xóa hoặc lưu trữ mô hình đang mang cờ `is_default == true`.
- **Xử lý**: Backend chặn thao tác và trả về mã lỗi `HTTP 400 Bad Request`: "Không thể xóa hoặc lưu trữ mô hình đang được đặt làm mặc định. Vui lòng chọn một mô hình hoạt động khác làm mặc định trước." (`BR-023`).
- **Giao diện**: Hiển thị Toast cảnh báo nhắc nhở người dùng thực hiện đổi mô hình mặc định trước.

### Ngoại Lệ 4: Tham Số Ngoài Biên Giới Hạn An Toàn (`BR-024`)
- **Điều kiện**: Người dùng nhập `context_window < 1000` hoặc `max_tokens < 256` hoặc `max_tokens > context_window`.
- **Xử lý**: Backend từ chối với mã lỗi `HTTP 422 Unprocessable Entity` kèm thông điệp mô tả chi tiết quy định giới hạn an toàn.

---

## 11. Traceability Matrix

| Mã Yêu Cầu / Quy Tắc | Mô Tả | Giai Đoạn Áp Dụng |
| :--- | :--- | :--- |
| `FR-035` | Đăng ký & Bổ sung mô hình mới | API `OP-022`, Quy trình `PROC-017`, Ca kiểm thử `TC-027` |
| `FR-036` | Hiệu chỉnh cấu hình mô hình | API `OP-023`, Quy trình `PROC-017`, Ca kiểm thử `TC-028` |
| `FR-037` | Tìm kiếm toàn văn và tìm kiếm mờ | API `OP-024`, Quy trình `PROC-018`, Ca kiểm thử `TC-029` |
| `FR-038` | Bộ lọc đa thuộc tính và sắp xếp | API `OP-024`, Quy trình `PROC-018`, Ca kiểm thử `TC-029` |
| `FR-039` | Xóa mềm & lưu trữ mô hình an toàn | API `OP-025`, Quy trình `PROC-018`, Ca kiểm thử `TC-030` |
| `BR-022` | Bất biến & duy nhất toàn cục ID/Provider | Validator Backend, Kiểm soát đột biến |
| `BR-023` | Bảo vệ bất biến mô hình mặc định | Chốt chặn xóa mềm `OP-025`, Ca kiểm thử `TC-030` |
| `BR-024` | Biên an toàn tham số context & tokens | Pydantic Request Validation, Ca kiểm thử `TC-027` |
| `SEC-010` | Phân quyền & bảo vệ đột biến mô hình | Tầng xác thực & phân quyền JWT Backend (`CTRL-009`) |
| `NFR-022` | Hiệu năng tìm kiếm/lọc $\le 200\text{ms}$ | Tối ưu hóa truy vấn bộ nhớ và CSDL |
| `UX-008` | Trải nghiệm giao diện tương tác mượt mà | Màn hình `SCR-004`, Luồng `FLOW-MODEL-MANAGE` |
