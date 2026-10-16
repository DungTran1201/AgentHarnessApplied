# Tool Management System (Hệ thống Quản lý và Điều phối Tools)
## Hồ sơ Đặc tả Kiến trúc, Nghiệp vụ và Danh mục Tool Catalog cho AI-Chan

---

## 1. Tổng quan Mục tiêu (Executive Overview)

Trong kiến trúc của **AI-Chan**, Agent không chỉ đóng vai trò là một mô hình ngôn ngữ sinh văn bản (text generator) đơn thuần mà là một **Autonomous Task-Oriented Agent** có khả năng tương tác với thế giới dữ liệu thực tế thông qua các công cụ thực thi (**Tools**).

Nhánh tài liệu **Tool Management** thiết lập toàn bộ nền tảng kiến trúc, đặc tả chức năng, mô hình bảo mật và danh mục công cụ ban đầu nhằm giải quyết các bài toán:
1. **Quản lý Tập trung Thư viện Tools (Tool Registry / Tool Library UI):** Cung cấp giao diện trực quan cho phép người dùng và quản trị viên duyệt danh mục, tìm kiếm, lọc theo danh mục, kiểm tra trạng thái khả dụng thực tế (`AVAILABLE`, `NEEDS_CONFIGURATION`, `DEPENDENCY_MISSING`, `DISABLED`, `ERROR`, `DEPRECATED`).
2. **Cấu hình và Vòng đời Tool (Tool Detail & Configuration Lifecycle):** Quản lý chi tiết từng Tool, xem trước JSON Schema input/output, lưu trữ cấu hình bảo mật (tách biệt secrets khỏi metadata), kiểm tra kết nối / health check, và quản lý bật/tắt an toàn.
3. **Danh mục Catalog Thực tế (32 Tool Candidates):** Đặc tả chi tiết 32 công cụ có giá trị sử dụng cao thuộc 4 nhóm nghiệp vụ: Web & Retrieval, File & Document, Local Knowledge Base (FAISS), và Data Validation & Utilities.
4. **Tích hợp An toàn vào Project Graph & Model Providers:** Cơ chế gắn Tool vào Project thông qua Project Graph (Node `tool` mới) hoặc Model Policy Gate, tương thích với cơ chế Function/Tool Calling của LangChain 0.3 (Gemini, OpenAI), kèm chiến lược Fallback rõ ràng cho các mô hình không hỗ trợ Tool Calling.
5. **Chính sách An toàn Nghiêm ngặt (Zero Trust & Non-Execution Policy):** Ngăn ngừa toàn diện các nguy cơ SSRF (Server-Side Request Forgery), Path Traversal, Arbitrary Code Execution (chặn hoàn toàn `eval()` và arbitrary shell/script execution), ReDoS, DoS, và IDOR.

---

## 2. Phân định Ranh giới Khái niệm: Tool vs Skill vs System Prompt

Để tránh sự nhầm lẫn phổ biến giữa các khái niệm trong hệ thống AI Agent, AI-Chan định nghĩa rõ ràng sự phân cấp:

| Khái niệm | Bản chất Kỹ thuật | Trọng tâm Nghiệp vụ | Đầu vào / Đầu ra | Ví dụ trong AI-Chan |
| :--- | :--- | :--- | :--- | :--- |
| **Tool** | Hàm thực thi mã nguồn xác định (Deterministic Executable Function) có JSON Schema ràng buộc. | **Hành động (Action):** Đọc file, tính toán, cào web, truy vấn vector index, lọc dữ liệu CSV. | **Input:** JSON có cấu trúc.<br>**Output:** JSON/Dữ liệu có cấu trúc. | `calculator`, `fetch_webpage`, `search_faiss_index`, `parse_csv` |
| **Skill** | Gói tài liệu hướng dẫn (`SKILL.md`), kịch bản tham chiếu, quy chuẩn nghiệp vụ cho Agent. | **Quy trình & Hướng dẫn (Process / Playbook):** Chỉ dẫn Agent từng bước thực hiện một mục tiêu phức tạp. | **Input:** Ngữ cảnh tác vụ.<br>**Output:** Quyết định chiến lược, thứ tự gọi Tool. | `web-design-guideline`, `project-discovery`, `ponytail` |
| **System Prompt** | Chỉ dẫn hệ thống ở tầng mô hình (System Role / Instruction). | **Tính cách & Vai trò (Persona & Constraints):** Định hình văn phong, ranh giới đạo đức, định dạng trả về. | **Input:** Văn bản chỉ dẫn.<br>**Output:** Thay đổi phân phối sinh token của LLM. | `AI-Chan Senior Architect`, `Friendly Assistant` |

> [!NOTE]
> **Mối quan hệ tương hỗ:**
> Một **Project Workflow** có thể bao gồm một **System Prompt** (xác định vai trò chuyên gia), nạp một **Skill** (quy định quy trình làm việc), và cấp quyền cho Agent gọi một số **Tools** (công cụ thực hiện các bước tính toán hoặc truy xuất dữ liệu cụ thể).

---

## 3. Cấu trúc Hồ sơ Đặc tả Nhánh Tool Management

Toàn bộ hồ sơ được chuẩn hóa trong thư mục [docs/features/tool-management/](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management) gồm 11 tài liệu chuyên sâu:

```
docs/features/tool-management/
├── README.md                                    # (Tài liệu này) Tổng quan, phân loại khái niệm, bản đồ hồ sơ
├── 00-discovery-and-as-is-audit.md              # Khảo sát hiện trạng codebase, bằng chứng thực tế, phân loại FACT/ASSUMPTION
├── 01-feature-inventory-and-scope.md            # Bảng kiểm kê tính năng, phạm vi MVP vs Post-MVP, máy trạng thái
├── 02-srs-tool-library-and-detail.md            # Yêu cầu kỹ thuật SRS, Use Cases, UI/UX flow cho Danh sách và Chi tiết Tool
├── 03-tool-catalog.md                           # Đặc tả chi tiết 32 công cụ: Schema In/Out, Dependency, Risk, Test ideas
├── 04-architecture-and-invocation-lifecycle.md  # Kiến trúc Registry, Executor, tích hợp Project Graph và Model Calling
├── 05-data-model-and-api-contracts.md          # Sơ đồ ERD đề xuất, cấu trúc DDL, đặc tả REST API contracts đầy đủ
├── 06-security-threat-model-and-policies.md     # Mô hình đe dọa STRIDE, kiến trúc chống SSRF, chống Path Traversal, cách ly Secret
├── 07-faiss-local-vector-store-spec.md          # Đặc tả chuyên sâu FAISS: embedding, dimension, persistence, chunking, rebuild
├── 08-mermaid-diagrams.md                       # 16 Biểu đồ Mermaid hoàn chỉnh (Use Case, Sequence, State, ERD, Data Flow...)
├── 09-test-plan-and-traceability-matrix.md      # Kế hoạch kiểm thử, 30+ Test Cases, Ma trận truy vết 2 chiều (Traceability)
└── 10-decision-log-and-assumptions.md           # Nhật ký quyết định kiến trúc (ADR), danh sách giả định và kế hoạch chuyển giao
```

---

## 4. Trạng thái Triển khai (Implementation Status Policy)

Theo quy tắc làm việc nghiêm ngặt của dự án AI-Chan, tài liệu này áp dụng quy chuẩn phân loại trạng thái minh bạch:
- **`EXISTS`**: Thành phần đã được kiểm chứng bằng mã nguồn thực tế trong repository (ví dụ: LangChain 0.3 core, file upload storage, project graph node system).
- **`SPECIFIED`**: Đặc tả đề xuất chuẩn kiến trúc cho nhánh Tool Management, sẵn sàng để đội ngũ kỹ thuật triển khai khi bước sang giai đoạn coding.
- **`OPTIONAL_DEPENDENCY`**: Tính năng yêu cầu cài đặt thêm thư viện phụ trợ (ví dụ: `faiss-cpu`, `openpyxl`, `python-docx`, `beautifulsoup4`) nhưng không được gây lỗi khởi động ứng dụng nếu vắng mặt.
- **`EXTERNAL_CONFIGURATION_REQUIRED`**: Tính năng yêu cầu khóa API hoặc dịch vụ bên ngoài (ví dụ: Search API Key, Cloud Embedding Key).
- **`DEFERRED`**: Tính năng thuộc giai đoạn mở rộng sau MVP (ví dụ: Sandbox Python code execution, multi-cluster vector DB).

> [!IMPORTANT]
> **Cam kết không làm hỏng Codebase hiện tại:**
> Giai đoạn này **chỉ xây dựng tài liệu đặc tả và biểu đồ kiến trúc**. Không có mã nguồn sản phẩm, API runtime handler hay database migration nào bị sửa đổi. Mọi thiết kế đều đảm bảo tính tương thích lùi (backward compatibility) 100% với các Project, Chat, System Prompts và Skills hiện hữu.
