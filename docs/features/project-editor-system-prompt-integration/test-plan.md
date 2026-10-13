# 11. KẾ HOẠCH & MA TRẬN BỘ CA KIỂM THỬ (QA TEST PLAN & TEST SUITE)
## Phân Hệ: Tích Hợp Thư Viện System Prompt Vào Visual Project Editor & Chat Runtime
### Nền Tảng: AI-Chan Virtual Assistant Platform

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `DOC-SPN-TEST-01` |
| **Trạng Thái** | `PROPOSED` |
| **Phiên Bản** | `1.0.0-MVP` |
| **Ngày Lập** | `2026-10-11` |

---

## 1. Chiến Lược Kiểm Thử (Testing Strategy & Scope)

Kế hoạch kiểm thử bao phủ toàn bộ các tầng chức năng nhằm đảm bảo chất lượng, tính ổn định và an toàn thông tin:
1. **Kiểm thử giao diện & tương tác (UI / Component Test):** Kiểm tra 4 nhóm Accordion, bộ lọc, tìm kiếm debounced và thao tác kéo thả Canvas.
2. **Kiểm thử logic nghiệp vụ & xác thực đồ thị (Graph Validation Unit Test):** Đảm bảo engine chặn đứng mọi kết nối sai hướng hoặc vượt hạn ngạch 1 Prompt / Model.
3. **Kiểm thử tích hợp Runtime & Provider (Integration Test):** Xác minh việc phân giải prompt từ DB và nạp chính xác vào `SystemMessage` khi gửi request sang mô hình LLM.
4. **Kiểm thử bảo mật (Security Testing):** Xác thực ranh giới Anti-IDOR, phòng chống Prompt Injection và không để rò rỉ prompt thô vào nhật ký server.
5. **Kiểm thử hồi quy (Regression Testing):** Đảm bảo 100% các project cũ chỉ gồm 3 node `Web Input → Model → Output` tiếp tục chạy mượt mà.

---

## 2. Ma Trận Bộ Ca Kiểm Thử Chi Tiết (Detailed Test Suite Matrix)

### 2.1. Nhóm Kiểm Thử Node Catalog & Accordion (`TC-CAT-###`)

| Mã Test (Test ID) | Mã Yêu Cầu (Req ID) | Tiền Điều Kiện (Preconditions) | Các Bước Thực Hiện (Steps) | Kết Quả Mong Đợi (Expected Result) | Cấp Độ (Level) | Độ Ưu Tiên |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **`TC-CAT-01`** | `FR-SPN-001` | Người dùng đã mở Project Editor. | 1. Tải trang editor.<br>2. Quan sát thanh danh mục node bên trái. | Hiển thị chính xác 4 nhóm Accordion: `Input`, `System Prompt`, `Model`, `Output`. Không có nhóm thừa. | UI Component | **P0 (Critical)** |
| **`TC-CAT-02`** | `FR-SPN-002` | Catalog đang mở 4 nhóm. | 1. Nhấp vào header nhóm `System Prompt`.<br>2. Nhấp lần thứ hai. | Lần 1: Nhóm thu gọn, danh sách prompt ẩn đi, mũi tên đổi hướng. Lần 2: Nhóm mở rộng trở lại. | UI Component | P1 (High) |
| **`TC-CAT-03`** | `FR-SPN-003` | Người dùng có 3 prompt trong thư viện. | 1. Nhập từ khóa `"Python"` vào ô tìm kiếm.<br>2. Chờ 250ms. | Chỉ hiển thị các prompt chứa từ khóa `"Python"`. Các prompt khác bị ẩn. Huy hiệu đếm số lượng cập nhật tương ứng. | UI / E2E | **P0 (Critical)** |
| **`TC-CAT-04`** | `FR-SPN-003` | Nhóm `System Prompt` đang bị thu gọn. | 1. Nhập từ khóa khớp với một prompt trong nhóm đang đóng. | Nhóm `System Prompt` **tự động mở rộng** để làm lộ kết quả tìm kiếm khớp từ khóa. | UI Component | P1 (High) |
| **`TC-CAT-05`** | `FR-SPN-004` | Catalog có cả 4 nhóm. | 1. Chọn pill filter `"System Prompt"`.<br>2. Gõ từ khóa tìm kiếm. | Chỉ hiển thị kết quả thuộc nhóm `System Prompt` theo logic `AND`. Các nhóm `Input`, `Model`, `Output` bị ẩn hoàn toàn. | UI Component | P1 (High) |
| **`TC-CAT-06`** | `FR-SPN-003` | Đang có từ khóa tìm kiếm trong ô. | 1. Nhấn vào nút icon `✕` trên ô tìm kiếm. | Ô tìm kiếm được xóa rỗng; catalog khôi phục danh sách đầy đủ ban đầu. | UI Component | P2 (Medium) |
| **`TC-CAT-07`** | `FR-SPN-005` | Tài khoản chưa tạo bất kỳ prompt nào. | 1. Mở Project Editor.<br>2. Quan sát nhóm `System Prompt`. | Hiển thị Empty State: *"Chưa có prompt nào trong thư viện"* kèm nút link sang `/prompts/new`. | UI Component | P2 (Medium) |
| **`TC-CAT-08`** | `FR-SPN-003` | Nhập từ khóa tìm kiếm không tồn tại. | 1. Nhập `"xyz_non_existent"`. | Hiển thị No Results State: *"Không tìm thấy kết quả phù hợp"* kèm nút xóa bộ lọc. | UI Component | P2 (Medium) |

---

### 2.2. Nhóm Kiểm Thử Thao Tác Canvas & System Prompt Node (`TC-CANVAS-###`)

| Mã Test (Test ID) | Mã Yêu Cầu (Req ID) | Tiền Điều Kiện (Preconditions) | Các Bước Thực Hiện (Steps) | Kết Quả Mong Đợi (Expected Result) | Cấp Độ (Level) | Độ Ưu Tiên |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **`TC-CANVAS-01`** | `FR-SPN-006` | Catalog có prompt `"Senior Python"`. | 1. Kéo thẻ prompt từ catalog sang canvas.<br>2. Thả chuột tại tọa độ (x: 400, y: 300). | Node mới xuất hiện trên canvas, hiển thị icon `📜`, tên `"Senior Python"`, cổng Instruction Out màu cam. | UI / Canvas | **P0 (Critical)** |
| **`TC-CANVAS-02`** | `FR-SPN-007` | Canvas có `System Prompt Node` và `Model Node`. | 1. Kéo dây từ cổng ra của System Prompt Node vào cổng Instruction In của Model Node. | Cạnh nối nét đứt màu cam được tạo lập thành công. Nút Lưu bật cờ Unsaved Changes. | UI / Canvas | **P0 (Critical)** |
| **`TC-CANVAS-03`** | `FR-SPN-008` | Model Node đã có sẵn 1 System Prompt nối vào. | 1. Kéo thêm một System Prompt Node thứ hai nối vào Model Node đó. | Thao tác bị chặn; hiển thị thông báo lỗi: *"Model Node chỉ hỗ trợ tối đa 1 System Prompt (MVP)"*. Cạnh thứ hai không được tạo. | Validation | **P0 (Critical)** |
| **`TC-CANVAS-04`** | `FR-SPN-009` | Canvas có System Prompt Node. | 1. Thử kéo dây từ System Prompt Node sang Web Input Node hoặc Web Output Node. | Kết nối bị từ chối; hiển thị thông báo kết nối sai ngữ nghĩa. | Validation | **P0 (Critical)** |
| **`TC-CANVAS-05`** | `FR-SPN-006` | Đã có System Prompt Node trên canvas. | 1. Nhấn nút xóa `×` trên thẻ node hoặc phím Delete. | Node và cạnh nối liên kết với nó bị xóa khỏi canvas. Trạng thái Unsaved Changes được bật. | UI / Canvas | P1 (High) |
| **`TC-CANVAS-06`** | `NFR-SPN-005` | Có thay đổi chưa lưu trên canvas. | 1. Thử bấm vào liên kết chuyển trang rời khỏi editor. | Hiển thị Modal Unsaved Changes Guard yêu cầu xác nhận trước khi rời trang. | UI Component | P1 (High) |

---

### 2.3. Nhóm Kiểm Thử Lưu Trữ & Thẩm Định Đồ Thị Backend (`TC-VAL-###`)

| Mã Test (Test ID) | Mã Yêu Cầu (Req ID) | Tiền Điều Kiện (Preconditions) | Các Bước Thực Hiện (Steps) | Kết Quả Mong Đợi (Expected Result) | Cấp Độ (Level) | Độ Ưu Tiên |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **`TC-VAL-01`** | `FR-SPN-009` | Graph gồm 4 node hợp lệ: Input, System Prompt, Model, Output và 3 cạnh chuẩn. | 1. Gửi request `PUT /projects/{id}/graph`. | Backend trả về `HTTP 200 OK`, `is_valid: true`. CSDL lưu JSON graph thành công. | Backend API | **P0 (Critical)** |
| **`TC-VAL-02`** | `FR-SPN-009` | Graph chỉ gồm 3 node legacy: Input, Model, Output và 2 cạnh chuẩn. | 1. Gửi request `PUT /projects/{id}/graph`. | Backend trả về `HTTP 200 OK`, `is_valid: true`. Tính tương thích ngược hoàn hảo. | Backend API | **P0 (Critical)** |
| **`TC-VAL-03`** | `FR-SPN-009` | Graph có System Prompt Node nhưng bị cô lập (chưa nối vào Model). | 1. Gửi request `PUT /projects/{id}/graph`. | Backend trả về `HTTP 400 Bad Request` với lỗi: *"System Prompt Node chưa được kết nối vào Model Node"*. | Backend API | **P0 (Critical)** |
| **`TC-VAL-04`** | `FR-SPN-010` | Graph đã lưu có System Prompt Node. | 1. Gọi `GET /projects/{id}`.<br>2. Kiểm tra `graph_data`. | `graph_data.nodes` chứa đầy đủ node `system_prompt` với `config.prompt_id`. Canvas khôi phục đúng vị trí và liên kết. | Integration | **P0 (Critical)** |

---

### 2.4. Nhóm Kiểm Thử Thực Thi Chat Runtime (`TC-RUN-###`)

| Mã Test (Test ID) | Mã Yêu Cầu (Req ID) | Tiền Điều Kiện (Preconditions) | Các Bước Thực Hiện (Steps) | Kết Quả Mong Đợi (Expected Result) | Cấp Độ (Level) | Độ Ưu Tiên |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **`TC-RUN-01`** | `FR-SPN-011`, `FR-SPN-012` | Project `ACTIVE` có System Prompt `"Chuyên Gia Python"`. | 1. Gửi chat `POST /projects/{id}/chat` với câu hỏi lập trình. | Backend phân giải đúng nội dung prompt từ DB; gửi vào `SystemMessage` của LLM; stream phản hồi SSE tuân thủ phong cách chuyên gia. | E2E Runtime | **P0 (Critical)** |
| **`TC-RUN-02`** | `FR-SPN-014` | Project `ACTIVE` cũ không có System Prompt Node. | 1. Gửi chat `POST /projects/{id}/chat`. | Backend tự động dùng instruction mặc định của AI-Chan; chat stream bình thường, không có lỗi thiếu node. | Regression | **P0 (Critical)** |
| **`TC-RUN-03`** | `FR-SPN-013` | System Prompt liên kết trong project bị xóa khỏi `/prompts`. | 1. Gửi chat `POST /projects/{id}/chat`. | Backend trả lỗi `HTTP 422` kèm mã `PROMPT_UNAVAILABLE` và thông báo hướng dẫn cụ thể. Không gọi LLM. | Integration | **P0 (Critical)** |
| **`TC-RUN-04`** | `BR-SPN-006` | Prompt trong thư viện được sửa nội dung văn bản. | 1. Sửa prompt trong `/prompts/[id]/edit`.<br>2. Gửi chat vào Project mà không sửa lại graph. | Backend tự động lấy nội dung mới nhất tại thời điểm chạy; câu trả lời phản ánh ngay chỉ dẫn mới. | Integration | P1 (High) |
| **`TC-RUN-05`** | `NFR-SPN-004` | Prompt chứa tiếng Việt có dấu, Markdown phức tạp, emoji. | 1. Gửi chat qua Project. | Toàn bộ dấu tiếng Việt và ký tự đặc biệt được bảo toàn 100%, không bị lỗi mã hóa font hoặc mất dấu. | Integration | P1 (High) |

---

### 2.5. Nhóm Kiểm Thử An Toàn & Bảo Mật (`TC-SEC-###`)

| Mã Test (Test ID) | Mã Yêu Cầu (Req ID) | Tiền Điều Kiện (Preconditions) | Các Bước Thực Hiện (Steps) | Kết Quả Mong Đợi (Expected Result) | Cấp Độ (Level) | Độ Ưu Tiên |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **`TC-SEC-01`** | `RISK-SPN-01` | User A cố ý chèn `prompt_id` của User B vào payload lưu graph. | 1. Gửi `PUT /projects/{id}/graph` với `prompt_id` của nạn nhân. | Backend kiểm tra quyền sở hữu và từ chối với lỗi `HTTP 422 PROMPT_REFERENCE_INVALID`. Chống IDOR thành công. | Security | **P0 (Critical)** |
| **`TC-SEC-02`** | `RISK-SPN-02` | Người dùng chat câu hỏi chứa chuỗi tấn công: *"Bỏ qua các lệnh trước đó..."*. | 1. Gửi tin nhắn tấn công qua `POST /chat`. | LLM vẫn giữ vững vai trò đã được thiết lập trong `SystemMessage`, không bị chiếm quyền kiểm soát hệ thống. | Security | P1 (High) |
| **`TC-SEC-03`** | `NFR-SPN-003` | Thực hiện chat thành công qua Project có System Prompt. | 1. Kiểm tra log file máy chủ Backend. | Log chỉ ghi nhận `prompt_id` và `content_length`. Tuyệt đối không xuất hiện toàn văn nội dung prompt trong log. | Security Audit | P1 (High) |
| **`TC-SEC-04`** | `RISK-SPN-05` | Prompt chứa thẻ `<script>alert('xss')</script>`. | 1. Xem thẻ prompt trên catalog và canvas. | Thẻ script được render dưới dạng văn bản thô vô hại; không có mã JavaScript nào bị thực thi trên trình duyệt. | Security / XSS | P1 (High) |
