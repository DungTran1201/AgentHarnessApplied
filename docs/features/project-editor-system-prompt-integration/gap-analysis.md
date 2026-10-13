# 03. PHÂN TÍCH BẰNG CHỨNG HIỆN TRẠNG & BÁO CÁO LỖ HỔNG (GAP ANALYSIS)
## Phân Hệ: Tích Hợp Thư Viện System Prompt Vào Visual Project Editor & Chat Runtime
### Nền Tảng: AI-Chan Virtual Assistant Platform

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `DOC-SPN-GAP-01` |
| **Trạng Thái** | `PROPOSED` |
| **Phiên Bản** | `1.0.0-MVP` |
| **Ngày Lập** | `2026-10-11` |

---

## 1. Phương Pháp Khảo Sát Bằng Chứng (Methodology)

Việc phân tích hiện trạng được thực hiện bằng cách đối chiếu trực tiếp mã nguồn thực tế tại:
- `ai-frontend/src/app/projects/[id]/editor/page.tsx` (Visual Canvas & Sidebar).
- `ai-frontend/src/services/projectService.ts` & `systemPromptService.ts`.
- `ai-backend/src/api/v1/projects.py` (Validation engine, Save Graph & Chat runtime).
- `ai-backend/llm/agent.py` (LangChain / LangGraph model invocation & prompt assembly).
- `ai-backend/src/api/v1/prompts.py` & bảng CSDL `system_prompts` trong SQLite.

---

## 2. Bảng Phân Tích Lỗ Hổng Chi Tiết (Comprehensive Gap Analysis Table)

| STT | Hạng Mục (Area) | Bằng Chứng Mã Nguồn Hiện Hữu (Existing Evidence) | Hành Vi Hiện Tại (Current Behavior) | Yêu Cầu Thay Đổi (Required Change) | Mức Độ Tác Động (Impact) | Khuyến Nghị Kỹ Thuật (Recommendation) | Độ Tin Cậy (Confidence) |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| 1 | **Node Catalog Structure** | [editor/page.tsx:555-577](file:///c:/Users/PC/Project/ai-chan/ai-frontend/src/app/projects/%5Bid%5D/editor/page.tsx#L555-L577) | Sidebar bên trái render danh sách phẳng gồm 3 mục hardcode: `web_input`, `model`, `output`. | Cấu trúc lại catalog thành **đúng 4 nhóm**: `Input`, `System Prompt`, `Model`, `Output`. | Cao (Frontend UI) | Tạo component `NodeCatalog` quản lý 4 categories độc lập; chuẩn hóa type mapping. | FACT (100%) |
| 2 | **Category Accordion** | [editor/page.tsx:540-609](file:///c:/Users/PC/Project/ai-chan/ai-frontend/src/app/projects/%5Bid%5D/editor/page.tsx#L540-L609) | Không có cơ chế thu gọn/mở rộng; toàn bộ danh sách luôn hiển thị đầy đủ. | Cho phép thu gọn/mở rộng từng nhóm độc lập; có icon trạng thái (chevron) và đếm số item. | Trung bình (UX) | Trạng thái mặc định: Mở rộng `System Prompt` & `Model`; tự động bung nhóm khi tìm kiếm có kết quả. | FACT (100%) |
| 3 | **Catalog Search & Filter** | [editor/page.tsx:540-554](file:///c:/Users/PC/Project/ai-chan/ai-frontend/src/app/projects/%5Bid%5D/editor/page.tsx#L540-L554) | Hoàn toàn chưa có thanh tìm kiếm hoặc nút lọc category trên đầu sidebar. | Bổ sung toolbar gồm ô Input tìm kiếm (tìm theo tên, mô tả ngắn) và thanh lọc danh mục (All/Categories). | Trung bình (Frontend) | Áp dụng debounce 200ms; logic kết hợp `AND` giữa category filter và keyword search. | FACT (100%) |
| 4 | **System Prompt Integration** | [editor/page.tsx:60-67](file:///c:/Users/PC/Project/ai-chan/ai-frontend/src/app/projects/%5Bid%5D/editor/page.tsx#L60-L67) | Editor chỉ tải danh sách `models` từ `/api/v1/models`, không gọi tới `/api/v1/system-prompts`. | Gọi đồng thời `SystemPromptService.getPrompts()` khi mount để lấy danh sách prompt khả dụng của user. | Trung bình (Data Fetching) | Thêm state `availablePrompts`; xử lý loading skeleton và empty state riêng cho nhóm System Prompt. | FACT (100%) |
| 5 | **System Prompt Node On Canvas** | [editor/page.tsx:188-223](file:///c:/Users/PC/Project/ai-chan/ai-frontend/src/app/projects/%5Bid%5D/editor/page.tsx#L188-L223), [types/index.ts](file:///c:/Users/PC/Project/ai-chan/ai-frontend/src/types/index.ts) | Kiểu `NodeType` chỉ gồm `'web_input' \| 'model' \| 'output'`. Bấm thêm node kiểm tra `nodes.some(n => n.type === type)`. | Bổ sung `NodeType = 'system_prompt'`. Cho phép kéo prompt cụ thể lên canvas với metadata `prompt_id`, `name`. | Cao (Graph Model) | Node hiển thị tên prompt, huy hiệu độ dài ký tự và nút đổi/xem chi tiết; lưu `config.prompt_id`. | FACT (100%) |
| 6 | **Edge Semantics & Typed Ports** | [editor/page.tsx:680-739](file:///c:/Users/PC/Project/ai-chan/ai-frontend/src/app/projects/%5Bid%5D/editor/page.tsx#L680-L739) | Cạnh nối lưu thuần túy `{ source, target }` dạng số học; Model Node chỉ có 1 cổng vào bên trái chung. | Model Node có 2 cổng vào riêng biệt: Cổng dữ liệu (Data In - từ Web Input) và Cổng chỉ dẫn (Instruction In - từ System Prompt). | Cao (Graph UX & Model) | Phân biệt kiểu đường nét: Cạnh data nét đứt tím `#a855f7`, cạnh system instruction nét đứt vàng `#f59e0b`. | FACT (100%) |
| 7 | **Graph Validation Engine** | [projects.py:43-112](file:///c:/Users/PC/Project/ai-chan/ai-backend/src/api/v1/projects.py#L43-L112), [editor/page.tsx:124-136](file:///c:/Users/PC/Project/ai-chan/ai-frontend/src/app/projects/%5Bid%5D/editor/page.tsx#L124-L136) | Ràng buộc cứng: `len(nodes) == 3 && len(edges) == 2`. Có thêm bất kỳ node/cạnh nào đều bị báo lỗi. | Hỗ trợ 2 dạng cấu trúc hợp lệ: **Chuẩn Legacy** (3 node, 2 cạnh) và **Chuẩn Extended** (4 node, 3 cạnh có System Prompt). | **Rất cao (Core Logic)** | Cho phép tối đa 1 System Prompt Node nối vào Model. Chặn mọi cạnh sai hướng hoặc nối vào Output/Input. | FACT (100%) |
| 8 | **Graph Persistence** | [projects.py:30-34](file:///c:/Users/PC/Project/ai-chan/ai-backend/src/api/v1/projects.py#L30-L34), `projects.graph_data` | Bảng `projects` lưu `graph_data` dưới dạng cột `TEXT` (JSON) chứa `nodes` và `edges`. | Giữ nguyên schema CSDL `projects.graph_data`. JSON lưu trữ node `system_prompt` với `config.prompt_id`. | Thấp (No Migration Needed) | Quyết định `DEC-SPN-01`: Lưu **Reference** (`prompt_id`), không lưu snapshot bản sao văn bản để tránh lệch đồng bộ. | FACT (100%) |
| 9 | **Chat Runtime Prompt Resolution** | [projects.py:592-620](file:///c:/Users/PC/Project/ai-chan/ai-backend/src/api/v1/projects.py#L592-L620) | Chỉ đọc `target_model_id` từ project; hoàn toàn không phân giải graph xem có System Prompt nào được gắn hay không. | Backend đọc `graph_data`, trích xuất `prompt_id` liên kết với Model Node, kiểm tra quyền và truy vấn DB lấy text prompt. | **Rất cao (Runtime Execution)** | Truy vấn: `SELECT content FROM system_prompts WHERE id = ? AND user_id = ?`. Báo lỗi nếu prompt bị xóa/không tìm thấy. | FACT (100%) |
| 10 | **Provider Adapter Prompt Injection** | [agent.py:122-141](file:///c:/Users/PC/Project/ai-chan/ai-backend/llm/agent.py#L122-L141), [agent.py:222-235](file:///c:/Users/PC/Project/ai-chan/ai-backend/llm/agent.py#L222-L235) | `build_langchain_messages` hardcode nội dung chỉ dẫn mặc định: `"Bạn là AI-Chan..."` dạng `SystemMessage`. | Bổ sung tham số `system_prompt_override: Optional[str] = None`. Nếu có giá trị, thay thế chỉ dẫn mặc định bằng nội dung của user prompt. | **Rất cao (LLM Integration)** | Sử dụng `SystemMessage(content=custom_prompt)`. Tách bạch tuyệt đối với `HumanMessage` của user chat. | FACT (100%) |
| 11 | **Backward Compatibility** | [projects.py:558-620](file:///c:/Users/PC/Project/ai-chan/ai-backend/src/api/v1/projects.py#L558-L620) | Tất cả các project hiện hữu đều không có System Prompt Node. | Khi project không có System Prompt Node: Hệ thống tự động fallback về instruction mặc định của AI-Chan, tiếp tục chạy bình thường. | Cao (Regression Safety) | Đảm bảo 100% project cũ tiếp tục hoạt động mà không cần can thiệp dữ liệu hay ép người dùng sửa graph. | FACT (100%) |
| 12 | **Authorization & Anti-IDOR** | [prompts.py:214-230](file:///c:/Users/PC/Project/ai-chan/ai-backend/src/api/v1/prompts.py#L214-L230) | API `system_prompts` đã có Anti-IDOR, nhưng runtime chat project chưa kiểm tra quyền sở hữu prompt. | Khi runtime phân giải `prompt_id`, bắt buộc phải xác thực quyền: `user_id == current_user["id"]` hoặc thuộc `guest_user`. | **Rất cao (Security)** | Ngăn chặn việc một project bị cố tình sửa JSON graph để tham chiếu trái phép prompt của người dùng khác. | FACT (100%) |

---

## 3. Tổng Kết Các Khoảng Trống Kiến Trúc Chính (Key Architectural Gaps)

1. **Gap G-01 (Catalog Presentation):** Sidebar Project Editor hiện tại mang tính tĩnh, chưa có tính năng nhóm, chưa phản ánh được tính năng Quản lý System Prompt mới xây dựng.
2. **Gap G-02 (Graph Schema Constraints):** Engine xác thực đồ thị tại cả Frontend và Backend quá cứng nhắc (`len(nodes) == 3 && len(edges) == 2`), từ chối mọi mô hình mở rộng có nhánh chỉ dẫn.
3. **Gap G-03 (Runtime Semantic Disconnection):** Hiện tại `chat_through_project` coi Project như một đối tượng chứa cấu hình model đơn giản, chưa thực sự "thực thi đồ thị" (Graph Execution) để gắn chỉ dẫn hệ thống vào lời gọi API mô hình.
