# 05. ĐẶC TẢ USE CASES CHI TIẾT (USE CASE SPECIFICATIONS)
## Phân Hệ: Tích Hợp Thư Viện System Prompt Vào Visual Project Editor & Chat Runtime
### Nền Tảng: AI-Chan Virtual Assistant Platform

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `DOC-SPN-UC-01` |
| **Trạng Thái** | `PROPOSED` |
| **Phiên Bản** | `1.0.0-MVP` |
| **Ngày Lập** | `2026-10-11` |

---

## 1. Sơ Đồ Tổng Quan Use Case (Use Case Diagram Trace)

Các Use Case trong phân hệ được mô tả chi tiết dưới đây, tương ứng với biểu đồ `DIAG-SPN-UC-001` trong tài liệu [diagrams.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-editor-system-prompt-integration/diagrams.md):
- `UC-SPN-01`: Duyệt & Tìm Kiếm Node Trong Catalog
- `UC-SPN-02`: Kéo Thả & Thêm System Prompt Node Vào Canvas
- `UC-SPN-03`: Kết Nối Cạnh Chỉ Dẫn `System Prompt → Model`
- `UC-SPN-04`: Lưu Cấu Trúc Đồ Thị Project Kèm Tham Chiếu Prompt
- `UC-SPN-05`: Thực Thi Trò Chuyện Kèm Phân Giải System Prompt
- `UC-SPN-06`: Xử Lý Tình Huống Prompt Tham Chiếu Bị Xóa/Sửa Đổi

---

## 2. Đặc Tả Chi Tiết Từng Use Case

### 2.1. UC-SPN-01: Duyệt & Tìm Kiếm Node Trong Catalog

- **Tác nhân chính (Primary Actor):** Người dùng (Authenticated User hoặc Guest User).
- **Tiền điều kiện (Preconditions):** Người dùng đã truy cập vào trang Project Editor `/projects/[id]/editor` của một project thuộc quyền sở hữu của mình.
- **Sự kiện kích hoạt (Trigger):** Trang editor hoàn tất nạp thông tin project, danh sách model và danh sách system prompt.
- **Luồng chính (Main Flow):**
  1. Hệ thống hiển thị thanh công cụ tìm kiếm, bộ lọc danh mục và 4 nhóm Accordion (`Input`, `System Prompt`, `Model`, `Output`) trên sidebar bên trái.
  2. Người dùng nhấp vào header của nhóm `System Prompt` để mở rộng hoặc thu gọn danh sách prompt.
  3. Người dùng nhập từ khóa tìm kiếm (ví dụ: `"Python"`) vào ô tìm kiếm.
  4. Hệ thống lọc tự động sau 200ms debounce, chỉ giữ lại các mục có tên hoặc mô tả chứa từ khóa `"Python"`.
  5. Nếu nhóm `System Prompt` đang ở trạng thái thu gọn nhưng chứa kết quả tìm kiếm khớp, hệ thống tự động mở rộng nhóm đó.
  6. Người dùng nhìn thấy danh sách các prompt khớp từ khóa kèm thông tin tóm tắt (tên, mô tả ngắn, số ký tự).
- **Luồng phụ (Alternate Flows):**
  - *AF-01 (Lọc theo danh mục):* Người dùng bấm chọn pill filter `"System Prompt"`. Hệ thống ẩn các nhóm `Input`, `Model`, `Output` và chỉ hiển thị duy nhất nhóm `System Prompt`.
  - *AF-02 (Xóa từ khóa tìm kiếm):* Người dùng bấm nút `✕` trên ô tìm kiếm. Hệ thống xóa nội dung tìm kiếm và khôi phục toàn bộ danh mục theo bộ lọc hiện hành.
- **Luồng ngoại lệ (Exception Flows):**
  - *EF-01 (Không tìm thấy kết quả):* Từ khóa không khớp với bất kỳ node hay prompt nào. Hệ thống hiển thị trạng thái `No Results`: *"Không tìm thấy node hoặc prompt phù hợp với từ khóa"* kèm nút bấm *"Xóa bộ lọc"*.
  - *EF-02 (Lỗi nạp thư viện Prompt):* API `GET /system-prompts` bị lỗi mạng. Nhóm `System Prompt` hiển thị thông báo lỗi cục bộ kèm nút *"Thử lại"* trong khi 3 nhóm còn lại (`Input`, `Model`, `Output`) vẫn hoạt động bình thường.
- **Hậu điều kiện (Postconditions):** Người dùng xác định được mục node hoặc prompt mong muốn để sẵn sàng kéo vào canvas.

---

### 2.2. UC-SPN-02: Kéo Thả & Thêm System Prompt Node Vào Canvas

- **Tác nhân chính (Primary Actor):** Người dùng.
- **Tiền điều kiện (Preconditions):** Danh sách System Prompt trong catalog đã được nạp và hiển thị ít nhất 1 prompt.
- **Sự kiện kích hoạt (Trigger):** Người dùng nhấn chuột và bắt đầu kéo một mục System Prompt từ catalog hoặc nhấn nút thêm node.
- **Luồng chính (Main Flow):**
  1. Người dùng kéo thẻ System Prompt `"Chuyên Gia Python"` từ catalog sang khu vực canvas.
  2. Canvas hiển thị hiệu ứng drag highlight và đường lưới canvas.
  3. Người dùng thả chuột tại tọa độ mong muốn trên canvas.
  4. Hệ thống khởi tạo một `GraphNode` mới mang `type: 'system_prompt'`, gán ID định danh duy nhất (ví dụ: `node_sp_172864...`) và cấu hình `data.config.prompt_id = "sp_seed_python_expert"`.
  5. Node hiển thị trên canvas với biểu tượng `📜`, tiêu đề `"Chuyên Gia Python"`, huy hiệu độ dài và một cổng ra (Instruction Out Port) màu cam ở cạnh phải.
  6. Hệ thống đánh dấu trạng thái có thay đổi chưa lưu (`hasUnsavedChanges = true`).
- **Luồng phụ (Alternate Flows):**
  - *AF-01 (Kéo trùng cùng một System Prompt):* Người dùng kéo cùng một prompt lần thứ hai lên canvas. Hệ thống thông báo cảnh báo hoặc khuyến nghị: mỗi Model Node chỉ cần 1 prompt; nếu muốn đổi prompt, người dùng có thể cấu hình lại node hiện tại.
- **Luồng ngoại lệ (Exception Flows):**
  - *EF-01 (Thả ra ngoài vùng canvas):* Người dùng kéo và thả trúng thanh công cụ hoặc sidebar. Hệ thống hủy thao tác kéo và không tạo node mới.
- **Hậu điều kiện (Postconditions):** Node `system_prompt` tồn tại trên canvas, sẵn sàng để nối dây vào Model Node.

---

### 2.3. UC-SPN-03: Kết Nối Cạnh Chỉ Dẫn `System Prompt → Model`

- **Tác nhân chính (Primary Actor):** Người dùng.
- **Tiền điều kiện (Preconditions):** Trên canvas đang có ít nhất một `System Prompt Node` và một `Model Node`.
- **Sự kiện kích hoạt (Trigger):** Người dùng nhấp giữ cổng ra của System Prompt Node và kéo đường nối hướng sang Model Node.
- **Luồng chính (Main Flow):**
  1. Người dùng kéo đường nối từ cổng ra của System Prompt Node. Hệ thống hiển thị đường cong nét đứt tạm thời theo vị trí con trỏ chuột.
  2. Người dùng di chuột tới cổng chỉ dẫn (Instruction Inbound Port) của Model Node. Cổng này phát sáng báo hiệu kết nối tương thích.
  3. Người dùng thả chuột vào cổng của Model Node.
  4. Hệ thống kiểm tra quy tắc: Model Node hiện tại chưa có System Prompt nào nối vào (`BR-SPN-004`).
  5. Hệ thống tạo một `GraphEdge` mới với `source: node_sp_id`, `target: node_model_id`, hiển thị dưới dạng đường nét đứt màu cam phát sáng.
  6. Hệ thống thực hiện kiểm tra sơ bộ tính toàn vẹn của đồ thị (Real-time Validation) và cập nhật trạng thái `is_valid`.
- **Luồng ngoại lệ (Exception Flows):**
  - *EF-01 (Nối vượt quá hạn ngạch 1 Prompt / Model - BR-SPN-004):* Model Node đã có sẵn một System Prompt nối vào. Người dùng kéo thêm prompt thứ hai vào Model Node. Hệ thống chặn thao tác, hiển thị toast lỗi: *"Model Node hiện chỉ hỗ trợ liên kết tối đa 1 System Prompt (MVP)."*
  - *EF-02 (Nối sai hướng hoặc sai cổng - BR-SPN-003):* Người dùng kéo từ System Prompt sang Web Input hoặc Web Output. Hệ thống từ chối kết nối và thông báo: *"System Prompt chỉ có thể kết nối trực tiếp vào Model Node."*
- **Hậu điều kiện (Postconditions):** Cạnh nối hướng dẫn được thiết lập trên đồ thị; canvas ghi nhận thay đổi chưa lưu.

---

### 2.4. UC-SPN-04: Lưu Cấu Trúc Đồ Thị Project Kèm Tham Chiếu Prompt

- **Tác nhân chính (Primary Actor):** Người dùng.
- **Tiền điều kiện (Preconditions):** Người dùng đang ở màn hình Project Editor và có thay đổi đồ thị (`hasUnsavedChanges = true`).
- **Sự kiện kích hoạt (Trigger):** Người dùng nhấn nút `"Lưu Cấu Trúc Graph"`.
- **Luồng chính (Main Flow):**
  1. Frontend đóng gói đối tượng `GraphData` gồm danh sách `nodes`, `edges` và `viewport`.
  2. Frontend gửi request `PUT /api/v1/projects/{id}/graph` kèm payload JSON lên Backend.
  3. Backend giải mã token xác thực người dùng (hoặc nhận diện `guest_user`).
  4. Backend thực thi hàm kiểm tra hợp lệ `validate_project_graph`:
     - Xác nhận cấu trúc đồ thị thuộc một trong 2 chuẩn: Chuẩn Legacy 3 node hoặc Chuẩn Mở rộng 4 node (có System Prompt).
     - Kiểm tra sự tồn tại của `prompt_id` trong CSDL `system_prompts` và xác thực quyền sở hữu của người dùng đối với prompt đó.
  5. Backend lưu chuỗi JSON đồ thị vào cột `projects.graph_data`, cập nhật `is_valid = 1`, `last_validated_at = CURRENT_TIMESTAMP`.
  6. Backend trả về phản hồi `HTTP 200 OK` kèm thông báo thành công.
  7. Frontend hiển thị toast thông báo thành công và đặt `hasUnsavedChanges = false`.
- **Luồng ngoại lệ (Exception Flows):**
  - *EF-01 (Đồ thị không hợp lệ):* Đồ thị có node cô lập chưa nối dây, hoặc cạnh nối bị đảo chiều. Backend trả về `HTTP 400 Bad Request` kèm danh sách chi tiết các lỗi. Frontend hiển thị thông báo lỗi và giữ nguyên trạng thái chưa lưu để người dùng chỉnh sửa.
  - *EF-02 (Tham chiếu prompt không tồn tại):* `prompt_id` trong node không tồn tại trong CSDL. Backend trả về lỗi `HTTP 422 Unprocessable Content`: *"System Prompt được tham chiếu không tồn tại trong hệ thống."*
- **Hậu điều kiện (Postconditions):** Cấu trúc đồ thị mới được lưu vĩnh viễn vào CSDL; Project đủ điều kiện kích hoạt `ACTIVE`.

---

### 2.5. UC-SPN-05: Thực Thi Trò Chuyện Kèm Phân Giải System Prompt

- **Tác nhân chính (Primary Actor):** Người dùng (trên giao diện Chat).
- **Tiền điều kiện (Preconditions):** Project đang ở trạng thái `status = 'ACTIVE'`, đồ thị hợp lệ và đã liên kết với một System Prompt Node.
- **Sự kiện kích hoạt (Trigger):** Người dùng chọn Project này tại màn hình Chat và gửi một tin nhắn câu hỏi.
- **Luồng chính (Main Flow):**
  1. Frontend Chat gửi request `POST /api/v1/projects/{project_id}/chat` với nội dung tin nhắn và ID phiên hội thoại.
  2. Backend kiểm tra project: tồn tại, thuộc quyền sở hữu của user, trạng thái `ACTIVE`.
  3. Backend kiểm tra giới hạn số từ theo cấu hình `max_words_limit` của Web Input Node.
  4. Backend đọc `graph_data` của project:
     - Xác định Model Node và model mục tiêu (`target_model_id`).
     - Quét các cạnh nối đi vào Model Node, phát hiện cạnh xuất phát từ `system_prompt` node.
     - Trích xuất `prompt_id` từ node cấu hình.
  5. Backend truy vấn CSDL: `SELECT content FROM system_prompts WHERE id = :prompt_id AND user_id = :user_id`.
  6. Backend lấy được toàn văn nội dung chỉ dẫn (ví dụ 1.845 ký tự của prompt *"Senior Python Architect"*).
  7. Backend đóng gói nội dung prompt vào `SystemMessage` và câu hỏi người dùng vào `HumanMessage` qua LangChain Adapter.
  8. Backend khởi chạy luồng stream gọi AI Model Provider (Gemini / OpenAI / Claude).
  9. Model Provider sinh phản hồi tuần thủ vai trò và phong cách được định hình bởi System Prompt.
  10. Backend truyền các SSE chunk về giao diện Chat theo thời gian thực và lưu trữ tin nhắn vào CSDL khi hoàn tất.
- **Luồng phụ (Alternate Flows):**
  - *AF-01 (Project không có System Prompt Node - Legacy):* Backend không tìm thấy cạnh nối System Prompt nào. Hệ thống tự động sử dụng chỉ dẫn mặc định của trợ lý AI-Chan và gọi LLM bình thường.
- **Luồng ngoại lệ (Exception Flows):**
  - *EF-01 (Prompt bị xóa khỏi thư viện sau khi lưu project):* Backend truy vấn CSDL không tìm thấy bản ghi tương ứng với `prompt_id`. Backend ngắt request và trả về lỗi `HTTP 422` kèm mã lỗi `PROMPT_UNAVAILABLE` (Xem chi tiết tại `UC-SPN-06`).
- **Hậu điều kiện (Postconditions):** Người dùng nhận được câu trả lời chính xác, đúng giọng điệu và phong cách chuyên môn đã được cấu hình trong prompt.

---

### 2.6. UC-SPN-06: Xử Lý Tình Huống Prompt Tham Chiếu Bị Xóa/Sửa Đổi

- **Tác nhân chính (Primary Actor):** Người dùng / System Runtime.
- **Tiền điều kiện (Preconditions):** Một Project đã lưu trước đó đang tham chiếu tới System Prompt `sp_seed_python_expert`.
- **Sự kiện kích hoạt (Trigger):** Người dùng xóa hoặc sửa đổi nội dung prompt `sp_seed_python_expert` trong màn hình Thư viện Prompt `/prompts`.
- **Kịch bản A: Người dùng sửa nội dung prompt trong thư viện:**
  1. Người dùng cập nhật nội dung prompt trong `/prompts/[id]/edit` và lưu thành công vào CSDL.
  2. Ở lượt chat tiếp theo của Project, Backend tự động truy vấn CSDL lấy nội dung mới nhất tại thời điểm chạy (chính sách Reference).
  3. Model Provider lập tức phản hồi theo nội dung mới mà người dùng không cần phải mở lại Project Editor để lưu lại graph.
- **Kịch bản B: Người dùng xóa prompt khỏi thư viện:**
  1. Người dùng xóa vĩnh viễn prompt trong màn hình `/prompts`. Bản ghi bị xóa khỏi bảng `system_prompts`.
  2. Khi người dùng mở lại Project Editor của Project liên quan:
     - Project Editor nhận diện `prompt_id` không còn tồn tại trong danh sách nạp từ server.
     - Node trên Canvas hiển thị viền đỏ cảnh báo và huy hiệu: `⚠️ Prompt đã bị xóa`.
     - Trạng thái hợp lệ chuyển sang `is_valid = false`, nút Kích Hoạt `ACTIVE` bị vô hiệu hóa.
  3. Khi người dùng cố gắng gửi tin nhắn chat vào Project đó (nếu project trước đó đang ở trạng thái ACTIVE):
     - API Chat tại Backend phát hiện không tìm thấy prompt trong DB.
     - Backend trả về lỗi chuẩn hóa HTTP `422 Unprocessable Content`:
       ```json
       {
         "error_code": "PROMPT_UNAVAILABLE",
         "message": "System Prompt liên kết trong Project đã bị xóa hoặc không còn khả dụng. Vui lòng mở Project Editor để chọn lại prompt."
       }
       ```
     - Hệ thống từ chối gọi LLM, bảo vệ tính nhất quán và ngăn chặn hành vi suy luận sai lệch.
- **Hậu điều kiện (Postconditions):** Hệ thống duy trì tính toàn vẹn dữ liệu, không âm thầm nuốt lỗi và cung cấp thông báo rõ ràng để người dùng khắc phục.
