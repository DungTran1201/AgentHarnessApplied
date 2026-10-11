# 04. ĐẶC TẢ YÊU CẦU PHẦN MỀN (SOFTWARE REQUIREMENTS SPECIFICATION - SRS)
## Phân Hệ: Tích Hợp Thư Viện System Prompt Vào Visual Project Editor & Chat Runtime
### Nền Tảng: AI-Chan Virtual Assistant Platform

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `DOC-SPN-SRS-01` |
| **Trạng Thái** | `PROPOSED` |
| **Phiên Bản** | `1.0.0-MVP` |
| **Ngày Lập** | `2026-10-11` |

---

## 1. Yêu Cầu Chức Năng (Functional Requirements - FR)

### 1.1. Phân Nhóm & Hiển Thị Node Catalog
- **`FR-SPN-001` (Bốn Nhóm Node Cố Định):**
  - Hệ thống **BẮT BUỘC** tổ chức danh sách Node Catalog bên trái Project Editor thành đúng 4 nhóm cấp cao:
    1. **Input:** Chứa các node nhận dữ liệu đầu vào (tối thiểu `Web Input Node`).
    2. **System Prompt:** Chứa danh sách các System Prompt lấy động từ Thư viện Prompt của người dùng.
    3. **Model:** Chứa danh sách các Model LLM khả dụng từ Model Registry (Gemini, OpenAI, Claude...).
    4. **Output:** Chứa các node xuất kết quả (tối thiểu `Web Output Node`).
  - Không được hiển thị thêm các nhóm ngoài phạm vi MVP như Skills, Tools, RAG, Memory.

- **`FR-SPN-002` (Hành Vi Accordion Thu Gọn/Mở Rộng):**
  - Mỗi nhóm trong 4 nhóm phải có header riêng biệt, tiêu đề rõ ràng, icon nhóm, huy hiệu đếm số lượng item hiện có và mũi tên chỉ thị trạng thái thu gọn/mở rộng.
  - Người dùng có thể nhấn vào header để đóng hoặc mở từng nhóm một cách độc lập.
  - Trạng thái mặc định khi mở Project Editor: Mở rộng nhóm `Input`, `System Prompt`, `Model`, `Output`.

- **`FR-SPN-003` (Thanh Tìm Kiếm Node Catalog):**
  - Hệ thống phải bố trí thanh tìm kiếm (Search Bar) ở vị trí trên cùng của danh mục Node Catalog.
  - Tìm kiếm tức thời (áp dụng debounce 200ms) theo tên node, tên prompt, tên model và mô tả ngắn (nếu có).
  - Tìm kiếm không phân biệt chữ hoa/thường (`NOCASE`) và hỗ trợ gõ tiếng Việt có dấu.
  - Khi có kết quả tìm kiếm nằm trong một nhóm đang bị thu gọn, nhóm đó phải **tự động mở rộng** để hiển thị kết quả.
  - Có nút `✕` để xóa nhanh từ khóa tìm kiếm và đưa catalog về trạng thái ban đầu.

- **`FR-SPN-004` (Bộ Lọc Danh Mục Node):**
  - Bố trí các nút bấm lọc danh mục (Filter Pills/Tabs) gồm: `Tất cả`, `Input`, `System Prompt`, `Model`, `Output`.
  - Bộ lọc kết hợp với thanh tìm kiếm theo nguyên tắc logic `AND` (ví dụ: đang chọn lọc `System Prompt` và gõ `Python` -> chỉ hiển thị prompt chứa từ khóa Python).
  - Cho phép người dùng chuyển đổi bộ lọc hoặc bấm reset về `Tất cả`.

- **`FR-SPN-005` (Nạp Động Danh Sách System Prompt):**
  - Khi Project Editor khởi tạo, hệ thống phải tự động gọi API `GET /api/v1/system-prompts` để lấy danh sách prompt thuộc quyền sở hữu của người dùng hiện tại (hoặc tài khoản `guest_user`).
  - Mỗi mục System Prompt hiển thị: Tên prompt, mô tả ngắn gọn, huy hiệu độ dài ký tự (`x ký tự`).
  - Tuyệt đối không hiển thị toàn bộ văn bản 10.000 ký tự trong catalog để giữ giao diện gọn gàng và bảo mật.

### 1.2. Thao Tác Canvas & System Prompt Node
- **`FR-SPN-006` (Tạo System Prompt Node Trên Canvas):**
  - Người dùng có thể kéo thả một mục System Prompt cụ thể từ catalog thả vào canvas (hoặc nhấn nút thêm).
  - Node mới được tạo ra trên canvas mang kiểu `system_prompt`, hiển thị rõ tên prompt đã chọn, huy hiệu độ dài và liên kết chặt chẽ với `prompt_id` của tài nguyên tương ứng.
  - Cho phép người dùng xem chi tiết hoặc đổi sang System Prompt khác thông qua panel cấu hình bên phải.

- **`FR-SPN-007` (Cổng Kết Nối Đa Kiểu Trên Model Node):**
  - Model Node trên Canvas phải hỗ trợ 2 cổng đầu vào (Inbound Ports) phân biệt rõ ràng:
    1. **Data Inbound Port (Cổng Dữ Liệu):** Nhận tin nhắn chat của người dùng từ `Web Input Node`.
    2. **Instruction Inbound Port (Cổng Chỉ Dẫn):** Nhận chỉ dẫn hệ thống từ `System Prompt Node`.
  - Cổng đầu ra (Outbound Port) của Model Node truyền phản hồi tới `Web Output Node`.
  - System Prompt Node chỉ có duy nhất 1 cổng đầu ra (Instruction Out) hướng sang Model Node.

- **`FR-SPN-008` (Ràng Buộc Số Lượng Kết Nối MVP):**
  - Trong phạm vi MVP, mỗi Model Node chỉ được phép liên kết với **tối đa 1 System Prompt Node** (`0..1`).
  - Nếu người dùng cố gắng kéo thêm một System Prompt Node thứ hai nối vào cùng một Model Node, hệ thống phải từ chối cạnh nối và hiển thị thông báo: *"Model Node hiện chỉ hỗ trợ tối đa 1 System Prompt trong phiên bản MVP."*

### 1.3. Xác Thực Đồ Thị & Lưu Trữ (Validation & Persistence)
- **`FR-SPN-009` (Quy Tắc Xác Thực Đồ Thị Hai Chế Độ):**
  - Graph Engine (tại cả Frontend và Backend) phải công nhận tính hợp lệ cho 2 cấu trúc đồ thị:
    1. **Cấu Trúc Tuyến Tính Cơ Bản (Legacy 3-Node Standard):** Gồm chính xác 1 `web_input`, 1 `model`, 1 `output` và 2 cạnh nối `web_input → model`, `model → output`.
    2. **Cấu Trúc Mở Rộng Kèm Chỉ Dẫn (Extended 4-Node Standard):** Gồm 1 `web_input`, 1 `system_prompt`, 1 `model`, 1 `output` và 3 cạnh nối `web_input → model`, `system_prompt → model`, `model → output`.
  - Mọi cạnh nối sai hướng (ví dụ `system_prompt → output`, `system_prompt → web_input`, chu trình lặp) đều bị đánh dấu `is_valid = false` và không được phép kích hoạt `ACTIVE`.

- **`FR-SPN-010` (Chính Sách Lưu Trữ Dạng Tham Chiếu - DEC-SPN-01):**
  - Khi lưu đồ thị (`PUT /api/v1/projects/{id}/graph`), hệ thống lưu trữ `prompt_id` bên trong đối tượng cấu hình node (`data.config.prompt_id`).
  - Không lưu trữ bản sao nội dung văn bản prompt (Snapshot) bên trong JSON đồ thị nhằm đảm bảo nguyên tắc duy nhất nguồn sự thật (Single Source of Truth) từ Thư viện Prompt.

### 1.4. Thực Thi Mô Hình Khi Chat (Runtime Model Execution)
- **`FR-SPN-011` (Phân Giải Prompt Tại Thời Điểm Chat):**
  - Khi người dùng gửi câu hỏi qua API `POST /api/v1/projects/{id}/chat`:
    - Backend kiểm tra cấu trúc đồ thị đã lưu của project.
    - Nếu phát hiện có cạnh nối từ một `System Prompt Node` vào `Model Node`, runtime trích xuất `prompt_id`.
    - Backend thực hiện truy vấn cơ sở dữ liệu `system_prompts` để lấy nội dung văn bản mới nhất của prompt đó.
    - Cưỡng chế kiểm tra Anti-IDOR: Prompt phải thuộc về người dùng hiện tại hoặc tài khoản `guest_user`.

- **`FR-SPN-012` (Đưa Chỉ Dẫn Vào Provider Chat Request):**
  - Nội dung System Prompt phải được đóng gói vào đối tượng `SystemMessage` của LangChain hoặc tham số `system_instruction` của API Provider (Google Gemini, OpenAI, Claude).
  - Câu hỏi của người dùng và lịch sử trò chuyện phải được đóng gói riêng biệt dưới dạng `HumanMessage` và `AIMessage`.
  - Tuyệt đối không được ghép nối thô (concatenate) nội dung prompt vào cuối câu hỏi của người dùng.

- **`FR-SPN-013` (Xử Lý Lỗi Khi Prompt Không Khả Dụng - DEC-SPN-04):**
  - Nếu System Prompt liên kết trong project bị xóa, bị vô hiệu hóa hoặc người dùng bị thu hồi quyền truy cập:
    - Khi người dùng bấm Chat, hệ thống phải chặn yêu cầu và trả về lỗi chuẩn hóa HTTP `422 Unprocessable Content` kèm mã lỗi `PROMPT_UNAVAILABLE`.
    - Thông báo rõ ràng: *"System Prompt được liên kết trong Project đã bị xóa hoặc không còn khả dụng. Vui lòng mở Project Editor để chọn lại prompt."*
    - Tuyệt đối không âm thầm bỏ qua System Prompt để chat mà không báo cho người dùng.

- **`FR-SPN-014` (Bảo Toàn Tương Thích Ngược Project Cũ):**
  - Nếu project không chứa bất kỳ System Prompt Node nào (project tạo trước đó):
    - Hệ thống tự động sử dụng chỉ dẫn trợ lý mặc định của AI-Chan (`"Bạn là AI-Chan, trợ lý ảo thông minh..."`).
    - Hoạt động chat, streaming và lưu trữ tin nhắn diễn ra bình thường, không yêu cầu người dùng phải chỉnh sửa lại graph.

---

## 2. Yêu Cầu Phi Chức Năng (Non-Functional Requirements - NFR)

- **`NFR-SPN-001` (Thời Gian Đáp Ứng Tìm Kiếm & Lọc Catalog):**
  - Thời gian lọc và hiển thị danh mục Node Catalog phải dưới **50ms** sau khi nhập từ khóa tìm kiếm (xử lý client-side trên bộ dữ liệu đã fetch).
- **`NFR-SPN-002` (Độ Trễ Phân Giải Prompt Tại Runtime):**
  - Thời gian truy vấn CSDL để phân giải nội dung System Prompt tại Backend trước khi gọi LLM không được vượt quá **15ms** nhờ chỉ mục `PRIMARY KEY (id)`.
- **`NFR-SPN-003` (Bảo Mật Quyền Riêng Tư - Privacy First):**
  - Nhật ký hệ thống (Logs), telemetry và metric logs chỉ được ghi nhận độ dài ký tự (`content_length`), mã `prompt_id` và `model_id`. Tuyệt đối không ghi toàn văn nội dung System Prompt hay tin nhắn người dùng vào nhật ký INFO/DEBUG.
- **`NFR-SPN-004` (Bảo Toàn Định Dạng Văn Bản & Unicode):**
  - Nội dung System Prompt khi truyền từ CSDL qua Runtime và nạp vào LLM API phải được bảo toàn nguyên vẹn 100% định dạng UTF-8, dấu tiếng Việt, ký tự xuống dòng (`\n`), khoảng thụt đầu dòng (tabs/spaces), thẻ Markdown và Emoji.
- **`NFR-SPN-005` (Khả Năng Phục Hồi Khi Mất Kết Nối UI):**
  - Giao diện Project Editor phải hỗ trợ cơ chế cảnh báo Unsaved Changes Guard: Khi người dùng đã thay đổi vị trí, thêm/xóa node/cạnh mà cố tình chuyển trang, hiển thị modal xác nhận hủy thay đổi để tránh mất dữ liệu đồ thị.
- **`NFR-SPN-006` (Bảo Vệ Ngưỡng Quota & Token Limits):**
  - Hệ thống phải tính toán tổng số từ/token đầu vào gồm cả System Prompt và User Message để cảnh báo nếu tổng dung lượng có nguy cơ vượt qua `context_window` của mô hình LLM được chọn.

---

## 3. Bộ Quy Tắc Nghiệp Vụ (Business Rules - BR)

- **`BR-SPN-001` (Quy Tắc Ranh Giới 4 Nhóm):** Node Catalog luôn luôn có đúng 4 nhóm. Không được tạo nhóm thứ 5 trong phạm vi MVP.
- **`BR-SPN-002` (Quy Tắc Sở Hữu Prompt):** Người dùng chỉ được nhìn thấy và sử dụng các System Prompt do chính họ tạo lập hoặc thuộc tài khoản mặc định `guest_user`.
- **`BR-SPN-003` (Quy Tắc Chiều Cạnh Nối Hướng Dẫn):** Cạnh nối từ System Prompt Node **bắt buộc** phải đi theo hướng `System Prompt (Out) → Model (Instruction In)`. Không cho phép hướng ngược lại hoặc nối sang Web Input / Output.
- **`BR-SPN-004` (Quy Tắc Hạn Ngạch 1 Prompt / Model):** Trong phiên bản MVP, một Model Node chỉ chấp nhận duy nhất 1 cạnh nối hướng dẫn từ System Prompt.
- **`BR-SPN-005` (Quy Tắc Không Ràng Buộc Bắt Buộc):** System Prompt là một thành phần **tùy chọn (Optional)** trong Project. Graph không có System Prompt vẫn được coi là hợp lệ tuyệt đối nếu thỏa mãn luồng `Web Input → Model → Output`.
- **`BR-SPN-006` (Quy Tắc Nguồn Sự Thật Duy Nhất):** Sửa nội dung prompt trong Thư viện Prompt (`/prompts`) sẽ có hiệu lực tức thì cho các lượt chat tiếp theo của mọi Project đang tham chiếu tới prompt đó mà không cần mở lại Project Editor để lưu lại graph.
- **`BR-SPN-007` (Quy Tắc Chống Lạm Quyền Client):** Client không được phép tự truyền nội dung System Prompt thô trong payload của API Chat `POST /projects/{id}/chat`. Backend là nơi duy nhất có thẩm quyền đọc graph đã lưu, phân giải prompt từ CSDL và nạp vào request.

---

## 4. Tiêu Chí Nghiệm Thu (Acceptance Criteria - AC)

### 4.1. Tiêu Chí Node Catalog (AC-CAT)
- **`AC-CAT-01`:**
  - **Given** người dùng mở màn hình Project Editor (`/projects/[id]/editor`).
  - **When** trang hoàn tất quá trình nạp dữ liệu.
  - **Then** thanh bên trái hiển thị chính xác 4 nhóm Accordion: `Input`, `System Prompt`, `Model`, `Output`.
- **`AC-CAT-02`:**
  - **Given** Node Catalog đang mở.
  - **When** người dùng nhấn vào header của nhóm `System Prompt`.
  - **Then** nhóm thu gọn lại và mũi tên chuyển hướng; nhấn lần nữa thì nhóm mở rộng trở lại.
- **`AC-CAT-03`:**
  - **Given** người dùng nhập từ khóa `"Python"` vào thanh tìm kiếm trên Catalog.
  - **When** kết thúc 200ms debounce.
  - **Then** chỉ các node hoặc prompt có tên/mô tả chứa `"Python"` được hiển thị; nếu nhóm `System Prompt` đang thu gọn thì tự động mở rộng để hiển thị kết quả.
- **`AC-CAT-04`:**
  - **Given** người dùng chọn bộ lọc category `"System Prompt"` và nhập từ khóa không tồn tại.
  - **Then** hệ thống hiển thị trạng thái No Results: *"Không tìm thấy node hoặc prompt phù hợp"* kèm nút xóa bộ lọc.

### 4.2. Tiêu Chí Canvas & System Prompt Node (AC-CANVAS)
- **`AC-CANVAS-01`:**
  - **Given** người dùng kéo một System Prompt mang tên `"Chuyên Gia Python"` từ catalog thả vào canvas.
  - **When** chuột được thả ra trên vùng canvas.
  - **Then** một System Prompt Node xuất hiện tại vị trí thả, hiển thị tên `"Chuyên Gia Python"` và cổng kết nối đầu ra màu cam/vàng.
- **`AC-CANVAS-02`:**
  - **Given** System Prompt Node và Model Node đã có mặt trên canvas.
  - **When** người dùng kéo dây từ cổng ra của System Prompt Node vào cổng Instruction của Model Node.
  - **Then** một cạnh nối nét đứt màu cam được tạo lập thành công.
- **`AC-CANVAS-03`:**
  - **Given** Model Node đã được nối với 1 System Prompt Node.
  - **When** người dùng cố kéo thêm một System Prompt Node khác nối vào Model Node đó.
  - **Then** hệ thống từ chối tạo cạnh và hiển thị thông báo lỗi giới hạn hạn ngạch MVP.
- **`AC-CANVAS-04`:**
  - **Given** đồ thị gồm 4 node: Web Input, System Prompt, Model, Web Output với 3 cạnh nối hợp lệ.
  - **When** người dùng bấm nút `"Lưu Cấu Trúc Graph"`.
  - **Then** hệ thống hiển thị thông báo lưu thành công và trạng thái tính hợp lệ của Project là `is_valid = true`.

### 4.3. Tiêu Chí Thực Thi Chat Runtime (AC-RUN)
- **`AC-RUN-01`:**
  - **Given** Project đang ở trạng thái `ACTIVE` và đồ thị có liên kết System Prompt `"Chuyên Gia Python"`.
  - **When** người dùng gửi câu hỏi `"Viết hàm tính Fibonacci"` qua giao diện Chat của Project.
  - **Then** Backend gửi request tới Model với `SystemMessage` chứa toàn văn nội dung chỉ dẫn của prompt `"Chuyên Gia Python"`, và câu trả lời phản hồi định dạng chuẩn theo phong cách chuyên gia.
- **`AC-RUN-02`:**
  - **Given** Project đang ở trạng thái `ACTIVE` nhưng System Prompt liên kết bị người dùng xóa khỏi thư viện `/prompts`.
  - **When** người dùng gửi tin nhắn chat vào Project đó.
  - **Then** API trả về lỗi `HTTP 422 Unprocessable Content` với thông báo hành động rõ ràng và không thực thi gọi mô hình.
- **`AC-RUN-03`:**
  - **Given** một Project cũ được tạo trước đó chỉ có 3 node `Web Input → Model → Web Output`.
  - **When** người dùng chọn Project và chat.
  - **Then** phản hồi streaming vẫn diễn ra bình thường dựa trên instruction mặc định của AI-Chan, không bị gián đoạn hay phát sinh lỗi thiếu node.
