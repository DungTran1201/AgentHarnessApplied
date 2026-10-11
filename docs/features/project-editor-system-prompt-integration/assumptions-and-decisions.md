# 13. NHẬT KÝ QUYẾT ĐỊNH KIẾN TRÚC, GIẢ ĐỊNH & CÂU HỎI MỞ (ADR & ASSUMPTIONS)
## Phân Hệ: Tích Hợp Thư Viện System Prompt Vào Visual Project Editor & Chat Runtime
### Nền Tảng: AI-Chan Virtual Assistant Platform

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `DOC-SPN-ADR-01` |
| **Trạng Thái** | `PROPOSED` |
| **Phiên Bản** | `1.0.0-MVP` |
| **Ngày Lập** | `2026-10-11` |

---

## 1. Nhật Ký Quyết Định Kiến Trúc Bắt Buộc (Architecture Decision Records - ADR)

Bảng dưới đây ghi nhận 8 quyết định kiến trúc trọng yếu (`DEC-SPN-01` đến `DEC-SPN-08`) được phân tích kỹ lưỡng dựa trên bằng chứng codebase và nguyên tắc thiết kế tối ưu:

| Mã Quyết Định (Decision ID) | Chủ Đề (Topic) | Các Phương Án Cân Nhắc (Options) | Quyết Định Đề Xuất (Proposed Decision) | Bằng Chứng / Lý Do Kỹ Thuật (Evidence & Rationale) | Tác Động Hệ Thống (Impact) | Trạng Thái (Status) |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| **`DEC-SPN-01`** | **Cơ chế liên kết System Prompt (Prompt Binding)** | 1. Reference (Tham chiếu ID)<br>2. Snapshot (Nhúng toàn văn text)<br>3. Versioned Reference | **Chọn: Reference (Tham chiếu ID qua `prompt_id`)** | CSDL đã có bảng chuẩn `system_prompts`. Tham chiếu ID đảm bảo nguyên tắc Single Source of Truth; dung lượng JSON đồ thị siêu nhẹ (~50 bytes thay vì ~20KB); đồng bộ ngay lập tức khi user sửa prompt trong thư viện. | Data Schema, Chat Runtime | **Confirmed Baseline** |
| **`DEC-SPN-02`** | **Số lượng Prompt liên kết với 1 Model (Prompt Cardinality)** | 1. Tối đa 1 prompt (`0..1`)<br>2. Cho phép ghép nhiều prompt (`0..N`) | **Chọn: Tối đa 1 System Prompt cho mỗi Model Node (`0..1`)** | Ghép nhiều prompt trong MVP sẽ phát sinh bài toán phức tạp về thứ tự ưu tiên, giải quyết xung đột chỉ dẫn và tràn token context. Giữ 0..1 giúp giao diện trực quan, rõ ràng và giảm thiểu lỗi. | Graph Validation, Canvas UI | **Confirmed Baseline** |
| **`DEC-SPN-03`** | **Vòng đời khi sửa Prompt trong Thư viện** | 1. Phản ánh nội dung mới nhất ở lần chạy sau<br>2. Cố định version cũ<br>3. Bắt buộc mở editor lưu lại | **Chọn: Phản ánh nội dung mới nhất tại lần chat kế tiếp** | Phù hợp hoàn hảo với quyết định `DEC-SPN-01` (Reference). Người dùng sửa lỗi chính tả hay cải tiến rule trong thư viện sẽ thấy hiệu quả ngay trong project mà không cần thao tác lặp lại. | Runtime Resolution | **Confirmed Baseline** |
| **`DEC-SPN-04`** | **Xử lý khi Prompt bị xóa / không khả dụng** | 1. Chặn chạy chat, báo lỗi rõ ràng<br>2. Âm thầm fallback về prompt mặc định | **Chọn: Chặn chạy chat, trả mã lỗi HTTP 422 `PROMPT_UNAVAILABLE`** | Âm thầm fallback sẽ che giấu lỗi, khiến bot trả lời sai lệch so với kỳ vọng chuyên môn của người dùng. Báo lỗi rõ ràng giúp người dùng chủ động mở editor chọn lại prompt hoặc khôi phục. | Chat Error Contract | **Confirmed Baseline** |
| **`DEC-SPN-05`** | **Phạm vi tìm kiếm trong Node Catalog** | 1. Tên node/prompt<br>2. Tên + Mô tả ngắn<br>3. Tìm trong toàn bộ nội dung prompt 10k ký tự | **Chọn: Tìm kiếm theo Tên + Mô tả ngắn gọn** | Tìm kiếm trong toàn bộ văn bản 10.000 ký tự sẽ gây lãng phí băng thông khi nạp catalog, chậm thuật toán lọc client-side và có nguy cơ rò rỉ nội dung riêng tư không cần thiết. | Frontend UX, Catalog API | **Confirmed Baseline** |
| **`DEC-SPN-06`** | **Tập hợp bộ lọc Catalog (Filter Set)** | 1. Chỉ lọc theo 4 nhóm Category<br>2. Bổ sung lọc theo Provider/Availability | **Chọn: 5 Filter Pills (`Tất cả`, `Input`, `System Prompt`, `Model`, `Output`)** | Giữ giao diện tinh gọn, không chiếm diện tích canvas. Chỉ lọc các thuộc tính thực sự tồn tại trong data model, không tạo bộ lọc giả. | UI Toolbar | **Confirmed Baseline** |
| **`DEC-SPN-07`** | **Tương thích ngược Project cũ (Legacy Compatibility)** | 1. Bắt buộc nâng cấp thêm prompt<br>2. Giữ nguyên tính hợp lệ của graph 3 node cũ | **Chọn: 100% Tương thích ngược với graph 3 node `Input → Model → Output`** | Bảo vệ trải nghiệm người dùng hiện tại; hàng loạt project cũ đã kích hoạt `ACTIVE` tiếp tục hoạt động trơn tru mà không cần chạy migration sửa dữ liệu. | Graph Engine, Validation | **Confirmed Baseline** |
| **`DEC-SPN-08`** | **System Prompt mặc định khi graph không có Prompt Node** | 1. Không dùng prompt nào<br>2. Dùng instruction mặc định của AI-Chan | **Chọn: Dùng chỉ dẫn trợ lý mặc định của hệ thống AI-Chan** | Tránh tình trạng model trần trụi không có vai trò, bảo đảm phong cách giao tiếp lịch sự, chuẩn mực và định dạng Markdown/mã nguồn đồng nhất. | LangChain Agent | **Confirmed Baseline** |

---

## 2. Danh Sách Các Giả Định Kỹ Thuật (Technical Assumptions)

1. **`ASSUMPTION-SPN-01`:** Bảng `system_prompts` trong SQLite `app.db` và API `/api/v1/system-prompts` đã hoạt động ổn định và có sẵn dữ liệu mẫu cho tài khoản `guest_user`.
2. **`ASSUMPTION-SPN-02`:** Người dùng thông thường sở hữu số lượng prompt cá nhân dưới 100 bản ghi; do đó việc nạp toàn bộ metadata danh sách prompt vào catalog qua một request `GET /system-prompts` không gây nghẽn hiệu năng.
3. **`ASSUMPTION-SPN-03`:** Thư viện `reactflow` / `@xyflow/react` hoặc engine canvas hiện tại hỗ trợ khả năng khai báo nhiều cổng vào (Custom Multiple Handles) trên một node tùy biến.
4. **`ASSUMPTION-SPN-04`:** Các model LLM chính của hệ thống (Gemini 3.8 Flash, GPT-4o Mini) đều hỗ trợ cơ chế tiếp nhận `SystemMessage` / `system_instruction` độc lập.

---

## 3. Danh Sách Câu Hỏi Mở & Khuyến Nghị Cần Xác Nhận (Open Questions - OQ)

| Mã Câu Hỏi | Nội Dung Vấn Đề Cần Xác Nhận | Khuyến Nghị Đề Xuất Của Kỹ Sư | Tác Động Nếu Thay Đổi |
| :---: | :--- | :--- | :--- |
| **`OQ-SPN-01`** | Khi một System Prompt Node bị xóa khỏi Canvas, có nên tự động xóa cạnh nối liên kết với nó hay cảnh báo người dùng? | **Tự động xóa cạnh nối liên kết.** Tránh để lại cạnh mồ côi (Dangling Edge) gây lỗi crash render SVG trên canvas. | Canvas Event Handler |
| **`OQ-SPN-02`** | Trong tương lai có cần lưu vết lịch sử (Audit Log) mỗi khi người dùng thay đổi liên kết prompt trong project không? | **Tạm hoãn ở MVP.** Chỉ cần cập nhật cột `projects.updated_at` và `last_validated_at` là đủ đáp ứng nhu cầu kiểm tra. | Schema / DB |
| **`OQ-SPN-03`** | Có cần nút bấm *"Mở nhanh trang sửa System Prompt"* ngay trong Drawer cấu hình của Project Editor không? | **Có, mở trong tab mới (`target="_blank"`).** Giúp người dùng chỉnh sửa nhanh prompt mà không làm mất trạng thái canvas đang vẽ. | Frontend UX |

---

## 4. Ghi Chú Đánh Đổi Kỹ Thuật (Ponytail Lazy Dev Ceiling Notes)

> `ponytail: ceiling note on prompt binding`  
> **Trần kỹ thuật hiện tại:** Liên kết theo Reference ID (`prompt_id`) không có versioning.  
> **Hệ quả biết trước:** Nếu người dùng sửa prompt, các phiên chat trước đó không thể tái lập 100% nếu cần kiểm thử đối chiếu kết quả.  
> **Lộ trình nâng cấp:** Khi hệ thống bổ sung tính năng Prompt Versioning (`v1.0.0`, `v1.1.0`), `GraphNode.data.config` sẽ lưu thêm `prompt_version_id` để cố định version theo mong muốn.
