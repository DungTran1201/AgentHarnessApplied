# 00 - Khảo sát Hiện trạng Codebase (Discovery & As-Is Audit)

## 1. Mục tiêu Khảo sát

Tài liệu này ghi nhận kết quả rà soát thực tế mã nguồn, cấu hình, cơ sở dữ liệu và thư viện hiện có trong repository AI-Chan nhằm xác lập **Nguồn chân lý (Source of Truth)**, phân loại rõ ràng giữa thực tế đã có (`EXISTS`) và những gì chỉ tồn tại ở dạng tài liệu hoặc giả định.

---

## 2. Bằng chứng Thực tế trong Codebase (Codebase Evidence)

### 2.1 Cấu trúc Thư mục và Stack Công nghệ Hiện hữu
- **Frontend (`ai-frontend`):**
  - Next.js 15.5.27 (App Router), React 19, TypeScript.
  - Định vị UI: `src/app/(app)/` chứa các trang: `/chat`, `/projects`, `/prompts`, `/skills`, `/settings`, `/bot`.
  - Quản lý trạng thái & styling: CSS variables toàn cục (`--bg-surface`, `--accent`, `--border-default`), không sử dụng TailwindCSS.
- **Backend (`ai-backend`):**
  - FastAPI 0.115.x, Python 3.12 (môi trường ảo `.venv`), Uvicorn ASGI server.
  - Cơ sở dữ liệu: SQLite (`database/app.db`) với hệ thống migration dựa trên script Python tự động [apply_migrations.py](file:///c:/Users/PC/Project/ai-chan/ai-backend/database/apply_migrations.py).
- **LLM Orchestration Engine (`ai-backend/llm`):**
  - Đã cài đặt: `langchain>=0.3.0`, `langchain-core>=0.3.0`, `langgraph>=0.2.0`, `langchain-google-genai>=2.0.0`, `langchain-openai>=0.2.0`.
  - Tệp điều phối chính: [agent.py](file:///c:/Users/PC/Project/ai-chan/ai-backend/llm/agent.py) chứa class `ChatAgentOrchestrator`, `LangChainModelFactory`, `EnvKeyLoader`, và hàm streaming đa phương tiện `astream_agent`.

### 2.2 Rà soát Tham chiếu đến `tool`, `tool_call`, `tools`, `FAISS`, `vector`
1. **Thư mục `ai-backend/llm/tools/`:**
   - Trong `ai-backend/README.md` dòng 23 có ghi chú `│   ├── tools/ # Function calling tools & agent tool registry`.
   - **Thực tế kiểm tra:** Thư mục `ai-backend/llm/tools/` **hoàn toàn chưa tồn tại** trên đĩa.
2. **Cơ sở dữ liệu liên quan đến Tool:**
   - Rà soát toàn bộ các tệp migration từ `001_initial_schema.sql` đến `015_unified_file_upload_system.sql`.
   - **Thực tế kiểm tra:** Chưa có bất kỳ bảng `tools`, `tool_configurations`, hay `project_tool_bindings` nào trong database.
   - Bảng duy nhất chứa chữ `tool` là bảng `skills` (được tạo ở migration `010_agent_skills_management.sql`) có cột `allowed_tools TEXT`. Cột này hiện chỉ lưu chuỗi văn bản thuần túy được trích xuất từ metadata frontmatter của `SKILL.md` (ví dụ `"Bash(python:*) Read"`), không có ràng buộc khóa ngoại hay thực thi runtime.
3. **Thư viện Vector Store & FAISS:**
   - Kiểm tra `requirements.txt`: Hoàn toàn **chưa có `faiss-cpu`**, `faiss-gpu`, `chromadb`, hay bất kỳ vector store client nào.
   - Tìm kiếm từ khóa `faiss` và `vector` trong codebase: Trả về **0 kết quả**.
4. **Cơ chế gọi hàm (Function Calling / Tool Calling) của Model:**
   - Provider adapters trong [ai-backend/llm/providers/](file:///c:/Users/PC/Project/ai-chan/ai-backend/llm/providers) (`GeminiProvider`, `OpenAIProvider`) hiện chỉ triển khai phương thức `generate()` và `stream()`.
   - Hàm `astream_agent` trong [agent.py](file:///c:/Users/PC/Project/ai-chan/ai-backend/llm/agent.py) sử dụng `model.astream(messages)`. Hiện tại **chưa gắn `model.bind_tools(...)`** vào pipeline streaming.
5. **Đồ thị Project Graph (`ai-frontend/src/types/index.ts`):**
   - Loại Node hiện hữu (`NodeType`): `'web_input' | 'system_prompt' | 'model' | 'output' | 'bot' | 'skill'`.
   - **Thực tế kiểm tra:** Chưa có Node `'tool'` trong định nghĩa kiểu dữ liệu hay trong Project Editor canvas.

---

## 3. Phân loại Thông tin (Fact Classification Matrix)

Tuân thủ nguyên tắc cốt lõi của dự án AI-Chan: **"Never silently convert an assumption into a fact."**

| Loại Thông tin | Nội dung Chi tiết | Bằng chứng Xác thực (Evidence) |
| :--- | :--- | :--- |
| **FACT** | LangChain 0.3.x và LangGraph 0.2.x đã được cài đặt sẵn trong môi trường Python backend. | `ai-backend/requirements.txt` dòng 23-25. |
| **FACT** | Mô hình Gemini (`gemini-2.5-flash`, `gemini-3.8-flash`) và OpenAI (`gpt-4o`, `gpt-4o-mini`) hỗ trợ native tool calling thông qua SDK LangChain. | Tài liệu chính thức Google Generative AI & OpenAI API. |
| **FACT** | Chưa có bảng CSDL nào cho Tools, chưa có thư mục `llm/tools/`, chưa có thư viện FAISS trong môi trường. | Rà soát filesystem và `sqlite3 schema.sql`. |
| **FACT** | Hệ thống Unified File Upload (`015_...sql`) đã hoạt động ổn định và lưu file an toàn tại `database/uploads/`. | Test suite `tests/test_attachments.py` đạt 9/9 PASS. |
| **DECISION** | Nhánh Tool Management sẽ triển khai cơ chế trung tâm: `ToolRegistry` kết hợp `ToolExecutorService`, không để từng component tự thực thi tool riêng lẻ. | Thiết kế kiến trúc TO-BE trong hồ sơ này. |
| **DECISION** | Mọi thao tác web (`fetch_webpage`, `web_search`) bắt buộc phải đi qua lá chắn bảo vệ SSRF (chặn dải IP nội bộ RFC 1918, link-local, loopback, cloud metadata). | Tuân thủ chính sách bảo mật OWASP SSRF. |
| **DECISION** | Tuyệt đối không cho phép thực thi shell tùy ý hoặc `eval()` code Python tự do để đảm bảo an toàn tuyệt đối cho host server. | Chính sách Non-Execution Security Policy. |
| **ASSUMPTION** | Tích hợp FAISS sử dụng gói `faiss-cpu` (không bắt buộc GPU) để tương thích tốt trên cả môi trường Windows dev cục bộ và Linux Docker container. | Đề xuất dependency kỹ thuật. |
| **ASSUMPTION** | Giới hạn timeout mặc định cho mỗi lần thực thi tool là 15 giây; giới hạn payload trả về tối đa là 1 MB hoặc 10.000 ký tự để bảo vệ context token budget. | Cấu hình mặc định an toàn. |
| **OPEN QUESTION** | Trong tương lai, Project Workflow có muốn tạo Node `tool` độc lập trên Canvas kéo-thả hay chỉ quản lý binding Tool trực tiếp vào Model Node? | Đề xuất giải pháp an toàn mặc định: Hỗ trợ cả hai (xem tài liệu kiến trúc 04). |

---

## 4. Đánh giá Thư viện và Phụ thuộc Kỹ thuật (Dependency Assessment)

| Thư viện | Mục đích sử dụng | Trạng thái Hiện tại | Chiến lược Triển khai |
| :--- | :--- | :---: | :--- |
| `langchain_core.tools` | Cung cấp decorator `@tool` và lớp trừu tượng `BaseTool`. | **ĐÃ CÀI ĐẶT** | Sử dụng trực tiếp từ `langchain-core>=0.3.0`. |
| `faiss-cpu` | Quản lý vector index cục bộ, tìm kiếm ngữ nghĩa siêu nhanh bằng C++. | **CHƯA CÀI ĐẶT** | Đánh dấu là `OPTIONAL_DEPENDENCY`. Import dạng lazy; nếu thiếu, tool báo `DEPENDENCY_MISSING`. |
| `beautifulsoup4` | Bóc tách HTML và trích xuất nội dung bài viết từ URL. | **CHƯA CÀI ĐẶT** | Đánh dấu là `OPTIONAL_DEPENDENCY` cho nhóm Web Extraction tools. |
| `python-docx` | Đọc cấu trúc heading và nội dung văn bản `.docx`. | **CHƯA CÀI ĐẶT** | Đánh dấu là `OPTIONAL_DEPENDENCY` cho `extract_docx_text`. |
| `openpyxl` | Đọc dữ liệu bảng tính Microsoft Excel `.xlsx`. | **CHƯA CÀI ĐẶT** | Đánh dấu là `OPTIONAL_DEPENDENCY` cho `extract_xlsx_data`. |
| `duckduckgo-search` | Tìm kiếm web mở không yêu cầu API key trả phí. | **CHƯA CÀI ĐẶT** | Đánh dấu là `OPTIONAL_DEPENDENCY` cho `web_search`. |
| `pypdf` | Đọc và trích xuất text từ tệp PDF. | **ĐÃ CÀI ĐẶT** | Đã tích hợp sẵn trong tính năng File Upload của AI-Chan. |
| `filetype` | Phát hiện MIME thực tế qua chữ ký nhị phân (magic bytes). | **ĐÃ CÀI ĐẶT** | Đã tích hợp sẵn trong tính năng File Upload của AI-Chan. |
