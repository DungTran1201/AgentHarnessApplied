# 02 - Đặc tả Yêu cầu Kỹ thuật và Trường hợp Sử dụng (SRS & Use Cases)

## 1. Yêu cầu Chức năng cho Tool Library (FR-TOOL-LIB)

### 1.1 `FR-TOOL-LIB-01`: Giao diện Danh mục Registry (Catalog View)
- Hệ thống phải hiển thị danh sách các tools có trong hệ thống dưới dạng lưới thẻ (Grid Cards) và chế độ xem bảng (Table View).
- Mỗi thẻ tool phải hiển thị tối thiểu: Biểu tượng (Icon), Tên hiển thị (Display Name), Định danh ổn định (Stable ID, ví dụ `web_search`), Nhãn danh mục (Category Tag), Mức độ rủi ro (`LOW`, `MEDIUM`, `HIGH`), và Badge trạng thái khả dụng.
- **Quy tắc hiển thị Badge:** Tuyệt đối không hiển thị badge `AVAILABLE` nếu tool chưa thỏa mãn đầy đủ các điều kiện thực thi thực tế (thiếu cấu hình API key hoặc thiếu thư viện Python).

### 1.2 `FR-TOOL-LIB-02`: Tìm kiếm và Bộ lọc Đa tiêu chí (Search & Filtering)
- **Tìm kiếm:** Cho phép người dùng tìm kiếm theo thời gian thực (real-time debounce 300ms) theo Tên tool, ID tool, Mô tả nghiệp vụ và Tags.
- **Bộ lọc:**
  - Nhóm danh mục: `All`, `Web & Retrieval`, `File & Document`, `Local FAISS`, `Data Validation & Utilities`.
  - Trạng thái khả dụng: `All`, `Available`, `Needs Configuration`, `Dependency Missing`, `Disabled`, `Error`, `Deprecated`.
  - Mức độ rủi ro: `All`, `Low`, `Medium`, `High`.
  - Nguồn gốc: `All`, `Built-in System`, `Custom Workspace`.

### 1.3 `FR-TOOL-LIB-03`: Trạng thái Giao diện Đặc biệt (UI State Handling)
- **Loading State:** Hiển thị khung xương (Skeleton loader) tương thích với design system tối giản và mượt mà của AI-Chan.
- **Empty State:** Khi hệ thống chưa có custom tool nào, hiển thị lời chào hướng dẫn và danh sách các built-in tools.
- **No Results State:** Khi bộ lọc/tìm kiếm không có kết quả, hiển thị thông báo "Không tìm thấy công cụ phù hợp" kèm nút "Đặt lại bộ lọc" (Reset Filters).
- **Dependency Missing State:** Hiển thị hộp cảnh báo màu vàng kèm câu lệnh terminal để người dùng cài đặt (ví dụ: `pip install faiss-cpu beautifulsoup4`).
- **Error State:** Hiển thị thông điệp lỗi cụ thể, không crash giao diện, cho phép bấm "Thử lại" (Retry).

### 1.4 `FR-TOOL-LIB-04`: Phân trang và Sắp xếp (Sorting & Pagination)
- Hỗ trợ sắp xếp theo: Tên (A-Z, Z-A), Nhóm danh mục, Mức độ rủi ro, Số lần được gọi thực tế.
- Hỗ trợ phân trang: Mặc định 12 cards / trang trên Desktop, hỗ trợ chuyển trang mượt mà không cuộn giật.

---

## 2. Yêu cầu Chức năng cho Tool Detail & Configuration (FR-TOOL-DET)

### 2.1 `FR-TOOL-DET-01`: Xem Chi tiết Thông số Kỹ thuật
- Trang chi tiết hiển thị toàn diện các thuộc tính:
  - Định danh ổn định (`id`), Tên hiển thị (`name`), Phiên bản (`version`, e.g. `1.0.0`).
  - Mô tả chức năng và mục đích nghiệp vụ cho Agent.
  - Phân loại danh mục (`category`), Mức độ rủi ro an ninh (`risk_level`).
  - Các thư viện phụ thuộc (`dependencies`), Quyền hạn hệ thống yêu cầu (`permissions`).
  - Chính sách giới hạn: Timeout (giây), Số lần thử lại tối đa (`max_retries`), Kích thước payload tối đa (`max_payload_size_kb`).

### 2.2 `FR-TOOL-DET-02`: Trình kiểm tra JSON Schema (Schema Inspector)
- Hiển thị tương tác hai cấu trúc schema chuẩn JSON Schema:
  - **Input Schema:** Danh sách các tham số đầu vào, kiểu dữ liệu (`string`, `integer`, `boolean`, `array`, `object`), đánh dấu trường bắt buộc (`required`), mô tả chi tiết từng trường để LLM hiểu được cách sinh tham số.
  - **Output Schema:** Cấu trúc đối tượng JSON mà tool sẽ trả về sau khi thực thi thành công.
- Hỗ trợ chế độ xem đồ họa trực quan (Visual Tree) và xem mã thô (Raw JSON/YAML).

### 2.3 `FR-TOOL-DET-03`: Trình Chỉnh sửa Cấu hình & Quản lý Bí mật (Secrets Management)
- Cho phép người dùng chỉnh sửa các tham số hoạt động (ví dụ: User-Agent cho `fetch_webpage`, default timezone cho `date_time_info`).
- **Bảo vệ Secret:** Đối với các trường nhạy cảm như API Key (ví dụ `SERPER_API_KEY`, `OPENAI_API_KEY`):
  - Giá trị trên giao diện phải được che dấu bằng dấu chấm (`••••••••`).
  - Backend tuyệt đối không trả lại giá trị bí mật thô cho frontend; chỉ trả cờ `has_key: true/false`.
  - Không bao giờ lưu khóa bí mật trong tệp JSON công khai hoặc log ứng dụng.

### 2.4 `FR-TOOL-DET-04`: Kiểm tra Kết nối Độc lập (Health Check & Test Run)
- Giao diện cung cấp khung chạy thử nghiệm độc lập:
  - Người dùng có thể điền payload thử nghiệm vào form được tự động sinh từ Input Schema.
  - Nhấn nút "Chạy thử nghiệm" (Test Execution / Ping).
  - Hệ thống gọi thực thi tool trong môi trường sandbox có kiểm soát, hiển thị kết quả JSON trả về, thời gian phản hồi (độ trễ tính bằng mili-giây) và mã trạng thái.
  - Cập nhật trạng thái của tool thành `AVAILABLE` (nếu pass) hoặc `ERROR` (nếu fail).

### 2.5 `FR-TOOL-DET-05`: Khấu hao và Bảo vệ Tính toàn vẹn của Đồ thị (Graph Integrity Protection)
- Quản trị viên có thể bật (`ENABLE`), tắt (`DISABLE`) hoặc đánh dấu khấu hao (`DEPRECATE`) một tool.
- **Ràng buộc toàn vẹn:** Hệ thống **tuyệt đối không cho phép xóa vĩnh viễn** một Tool nếu tool đó đang được tham chiếu bởi ít nhất một Project Graph còn hoạt động. Giao diện phải liệt kê danh sách các Project bị ảnh hưởng và yêu cầu người dùng gỡ liên kết khỏi Graph trước khi xóa.

---

## 3. Yêu cầu Phi Chức năng (Non-Functional Requirements)

| Mã NFR | Tiêu chí | Mô tả Yêu cầu Kỹ thuật |
| :--- | :--- | :--- |
| **NFR-TOOL-001** | Thời gian phản hồi UI | Giao diện danh mục và chi tiết tool tải trong vòng dưới 300ms; thanh tìm kiếm debounce 300ms phản hồi mượt mà 60fps. |
| **NFR-TOOL-002** | Giới hạn Thực thi (Timeout) | Thời gian thực thi mặc định của mỗi tool là 15 giây. Sau 15 giây, thread bị hủy tự động và trả mã lỗi `TOOL_EXECUTION_TIMEOUT`. |
| **NFR-TOOL-003** | Bảo vệ Context Budget | Dữ liệu trả về của Tool tối đa không vượt quá 10.000 ký tự (khoảng 2.500 tokens). Nếu vượt quá, dữ liệu được tự động tóm tắt hoặc cắt tỉa an toàn có cảnh báo. |
| **NFR-TOOL-004** | Cách ly Lỗi (Fault Isolation) | Lỗi bên trong một Tool không được làm gián đoạn tiến trình chính của ứng dụng hoặc gây sập Uvicorn server; bắt buộc bọc trong `try...except` và trả về `ToolExecutionResult(status="FAILED")`. |
| **NFR-TOOL-005** | Tương thích Độc lập OS | Core system khởi động bình thường ngay cả khi máy tính của người dùng chưa cài đặt các thư viện C++ nặng như FAISS. |
| **NFR-TOOL-006** | Tính Đẳng hạn (Idempotency) | Các tool chỉ đọc (Read-only tools) phải hoàn toàn không có tác dụng phụ (side-effects), cho phép gọi lại an toàn trong quá trình retry. |

---

## 4. Các Trường hợp Sử dụng Tiêu biểu (Use Cases)

### 4.1 `UC-TOOL-01`: Duyệt và Tìm kiếm Công cụ trong Registry
- **Tác nhân:** Người dùng / Kỹ sư AI.
- **Điều kiện tiên quyết:** Người dùng đã truy cập vào AI-Chan.
- **Luồng sự kiện chính:**
  1. Người dùng chọn mục **Tools** trên thanh điều hướng chính.
  2. Hệ thống gọi `GET /api/v1/tools` và hiển thị danh mục các công cụ kèm badge trạng thái thực tế.
  3. Người dùng nhập từ khóa "CSV" vào thanh tìm kiếm và chọn bộ lọc nhóm "File & Document".
  4. Hệ thống cập nhật danh sách hiển thị các tool: `parse_csv`, `filter_csv_rows`, `summarize_csv_statistics`, `convert_csv_to_json`.
  5. Người dùng nhấn vào thẻ `parse_csv` để mở trang chi tiết.

### 4.2 `UC-TOOL-02`: Cấu hình Khóa Bí mật và Kiểm tra Kết nối
- **Tác nhân:** Quản trị viên / Người dùng Project.
- **Điều kiện tiên quyết:** Tool `web_search` đang ở trạng thái `NEEDS_CONFIGURATION`.
- **Luồng sự kiện chính:**
  1. Người dùng mở trang chi tiết của `web_search`.
  2. Người dùng nhập API Key được cấp từ nhà cung cấp dịch vụ tìm kiếm vào ô `Search API Key`.
  3. Người dùng nhấn "Lưu cấu hình" (Save Configuration).
  4. Người dùng nhấn "Kiểm tra kết nối" (Test Connection) với từ khóa mẫu `"AI-Chan Assistant"`.
  5. Hệ thống thực thi lệnh tìm kiếm thử nghiệm, nhận về 3 kết quả hợp lệ trong vòng 820ms.
  6. Hệ thống cập nhật trạng thái của tool thành `AVAILABLE` và hiển thị thông báo thành công màu xanh.

### 4.3 `UC-TOOL-03`: Tích hợp Tool vào Project Workflow Canvas
- **Tác nhân:** Người dùng thiết kế Project.
- **Điều kiện tiên quyết:** Project Editor đang mở; tool `calculator` và `read_text_file` đang ở trạng thái `AVAILABLE`.
- **Luồng sự kiện chính:**
  1. Trong Canvas đồ thị Project, người dùng mở thanh Catalog Tools.
  2. Người dùng kéo Node Tool `calculator` vào vùng soạn thảo.
  3. Người dùng nối đầu ra của Node Model tới đầu vào của Node Tool `calculator`.
  4. Hệ thống xác thực tính tương thích của mô hình đã chọn (kiểm tra `supports_tools: true`).
  5. Người dùng lưu Project; hệ thống ghi nhận ràng buộc liên kết `project_tool_bindings`.
  6. Khi thực thi chat trong Project này, Agent được cấp quyền tự động gọi `calculator` khi người dùng hỏi các bài toán tính toán phức tạp.
