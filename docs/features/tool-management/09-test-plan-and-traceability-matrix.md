# Kế Hoạch Kiểm Thử & Ma Trận Truy Vết (Test Plan & Traceability Matrix) — Tool Management

> **Tài liệu:** Kế hoạch kiểm thử chất lượng, danh mục kịch bản kiểm thử (Test Cases) và ma trận truy vết yêu cầu (Traceability Matrix) cho phân hệ Tool Management.  
> **Trạng thái:** `SPECIFIED` (Đặc tả thiết kế phục vụ QA và giai đoạn phát triển).  
> **Phiên bản:** 1.0.0 (Ngày: 17/10/2026).  
> **Tài liệu liên quan:** [README.md](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/README.md), [01-feature-inventory-and-scope.md](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/01-feature-inventory-and-scope.md), [02-srs-tool-library-and-detail.md](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/02-srs-tool-library-and-detail.md), [03-tool-catalog.md](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/03-tool-catalog.md), [06-security-threat-model-and-policies.md](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/06-security-threat-model-and-policies.md), [08-mermaid-diagrams.md](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/08-mermaid-diagrams.md).

---

## 1. Chiến Lược Kiểm Thử (Test Strategy)

Chiến lược kiểm thử phân hệ Tool Management áp dụng mô hình kim tự tháp (Testing Pyramid), nhấn mạnh việc cô lập rủi ro bảo mật (SSRF, Arbitrary Code Execution, Path Traversal) và bảo đảm tính tương thích với hạ tầng AI-Chan hiện hữu.

```
          / \
         / E2E \       Tier 4: E2E Chat/Project Graph Tool Loop (5%)
        /-------\
       / Integr. \     Tier 3: API & Policy Gate / Database Integration (20%)
      /-----------\
     /  Security   \   Tier 2: SSRF Engine, Path Traversal, AST Injection (35%)
    /---------------\
   /   Unit & Mock   \ Tier 1: Schema Validation, Isolated Tool Adapters (40%)
  /-------------------\
```

### 1.1 Phân tầng kiểm thử (Test Tiers)

1. **Tier 1: Unit & Schema Testing (Cấp độ Đơn vị):**
   - Kiểm tra độc lập từng hàm trong `ToolRegistryService`, `ToolExecutorService`.
   - Validate JSON Schema (Draft 7/2020-12) cho 32 công cụ trong catalog.
   - Kiểm tra parser toán học an toàn (AST Math Evaluator) loại bỏ hoàn toàn `eval()`.
   - Kiểm tra parser CSV (header, schema suy luận, thống kê min/max/mean/median).
2. **Tier 2: Security & Negative Testing (Cấp độ An ninh):**
   - **SSRF Engine:** Kiểm thử chặn toàn bộ dải IP riêng (RFC 1918), loopback, link-local (169.254.169.254), DNS rebinding, redirect chain độc hại.
   - **Path Traversal:** Kiểm thử chặn các chuỗi `../`, `..\\`, ký tự null byte `%00`, symlink escape ra khỏi thư mục uploads/data.
   - **Resource Exhaustion & ReDoS:** Kiểm thử timeout đối với biểu thức regex độc hại (`regex_extract`), giới hạn payload JSON/CSV, max file size.
   - **Anti-IDOR:** Ngăn người dùng của Project A gọi tool binding thuộc Project B khi chưa cấp quyền.
3. **Tier 3: API & Service Integration (Cấp độ Tích hợp):**
   - Kiểm thử các REST endpoints `/api/v1/tools/*` theo chuẩn FastAPI/Pydantic.
   - Kiểm thử luồng kiểm tra kết nối (`POST /api/v1/tools/{id}/test`).
   - Kiểm thử lưu trữ cấu hình bảo mật (tách rời plaintext metadata và mã hóa AES-256-GCM cho credentials).
   - Kiểm thử FAISS Vector Store: lifecycle index (`index.faiss` + `metadata.sqlite`), chunking và rebuild flow.
4. **Tier 4: End-to-End Runtime & Agent Loop (Cấp độ Toàn trình):**
   - Luồng kích hoạt Tool từ Model trong Project Graph (Gemini/OpenAI function calling loop).
   - Kiểm thử cơ chế Fallback mượt mà khi Model hoặc Provider không hỗ trợ function calling.
   - Đảm bảo các Project cũ không gắn Tool tiếp tục hoạt động 100% nguyên vẹn (Zero Regressions).

---

## 2. Môi Trường & Dữ Liệu Kiểm Thử (Fixtures & Environment)

### 2.1 Môi trường thử nghiệm
- **OS:** Windows 10/11 x64 (Native PowerShell) & Ubuntu 22.04 LTS (CI/CD pipeline).
- **Python Runtime:** Python 3.10+ (Virtualenv).
- **Backend Framework:** FastAPI, LangChain 0.3.0, LangGraph 0.2, SQLite 3.
- **Mock Services:**
  - `httpretty` hoặc `respx`: Mock HTTP response cho các adapter ngoài (DuckDuckGo, Brave Search).
  - Mock DNS Server: Kiểm thử DNS Rebinding attack.
  - Fake LLM Provider (`langchain_community.llms.fake.FakeListLLM`): Giả lập Model phát tín hiệu `tool_calls`.

### 2.2 Dữ liệu mẫu (Test Fixtures)
- `tests/fixtures/files/sample.csv`: File CSV chuẩn 100 dòng chứa đa dạng kiểu dữ liệu (int, float, date, string).
- `tests/fixtures/files/malformed.csv`: File CSV lỗi cú pháp, thiếu cột, dòng không đồng nhất.
- `tests/fixtures/files/sample.docx`, `sample.pdf`, `sample.xlsx`: File tài liệu văn phòng mẫu có cấu trúc chuẩn.
- `tests/fixtures/files/huge_payload.json`: File JSON kích thước 50MB để kiểm tra cơ chế chặn vượt ngưỡng dung lượng (Max Payload Guard).

---

## 3. Danh Mục Kịch Bản Kiểm Thử (Test Cases Catalogue)

### 3.1 Quản lý Thư viện Tools (Tool Registry & Library)

| Test Case ID | Tên kịch bản | Yêu cầu truy vết | Điều kiện tiên quyết | Các bước thực hiện | Kết quả mong đợi | Mức độ ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-TOOL-001** | Lấy danh sách toàn bộ Tool có sẵn trong Registry | `FR-TOOL-LIB-01` | Server backend đang chạy, DB có dữ liệu seed 32 tools | Gửi request `GET /api/v1/tools` | Trả về HTTP 200, danh sách chứa đủ 32 tools, đầy đủ metadata, schema, category và trạng thái | P1 (Cao) |
| **TC-TOOL-002** | Tìm kiếm tool theo từ khóa (name, tag, category) | `FR-TOOL-LIB-02` | Seed 32 tools | Gửi request `GET /api/v1/tools?search=csv` | Trả về 4 tools thuộc nhóm CSV (`parse_csv`, `filter_csv_rows`, `summarize_csv_statistics`, `convert_csv_to_json`) | P2 (Trung bình) |
| **TC-TOOL-003** | Lọc tool theo Trạng thái (Status Filter) | `FR-TOOL-LIB-02` | Môi trường chưa cài `faiss-cpu` | Gửi request `GET /api/v1/tools?status=DEPENDENCY_MISSING` | Danh sách trả về nhóm FAISS tools (`create_faiss_index`, `search_faiss_index`, ...) | P1 (Cao) |
| **TC-TOOL-004** | Kiểm tra phân trang và sắp xếp danh sách Tool | `FR-TOOL-LIB-04` | Seed 32 tools | Gửi request `GET /api/v1/tools?page=1&limit=10&sort_by=name&sort_order=asc` | Trả về đúng 10 records, sắp xếp theo tên A-Z, meta pagination `total=32`, `pages=4` | P2 (Trung bình) |
| **TC-TOOL-005** | Truy vấn chi tiết một Tool tồn tại | `FR-TOOL-DET-01` | Seed 32 tools | Gửi request `GET /api/v1/tools/calculator` | Trả về HTTP 200, chi tiết ID `calculator`, input_schema có `expression`, status `AVAILABLE` | P1 (Cao) |

---

### 3.2 Cấu hình & Vòng đời Tool (Configuration & Lifecycle)

| Test Case ID | Tên kịch bản | Yêu cầu truy vết | Điều kiện tiên quyết | Các bước thực hiện | Kết quả mong đợi | Mức độ ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-TOOL-006** | Cập nhật cấu hình hợp lệ cho Tool ngoài (`web_search`) | `FR-TOOL-DET-02`, `SEC-TOOL-04` | Tool `web_search` đang ở trạng thái `NEEDS_CONFIGURATION` | Gửi `PUT /api/v1/tools/web_search/configuration` kèm `api_key` và `provider=duckduckgo` | HTTP 200, secret được mã hóa lưu an toàn, tool chuyển sang trạng thái `AVAILABLE` | P1 (Cao) |
| **TC-TOOL-007** | Cập nhật cấu hình không hợp lệ (sai schema) | `FR-TOOL-DET-02` | Tool `fetch_webpage` tồn tại | Gửi `PUT /api/v1/tools/fetch_webpage/configuration` với `timeout_seconds=-10` | HTTP 422 Unprocessable Entity, báo lỗi chi tiết `timeout_seconds must be > 0` | P2 (Trung bình) |
| **TC-TOOL-008** | Bật / Tắt trạng thái hoạt động của Tool | `FR-TOOL-DET-03` | Tool `calculator` đang `AVAILABLE` | Gửi `PATCH /api/v1/tools/calculator/status` với body `{"status": "DISABLED"}` | HTTP 200, trạng thái cập nhật thành `DISABLED`, PolicyGate chặn mọi lượt gọi tiếp theo | P1 (Cao) |
| **TC-TOOL-009** | Chặn xóa Tool đang được Project liên kết (Dependency Protection) | `FR-TOOL-DET-04` | Tool `read_text_file` đang được liên kết vào Project A | Gửi request `DELETE /api/v1/tools/read_text_file` | HTTP 409 Conflict, thông báo rõ danh sách Project đang sử dụng, từ chối xóa | P1 (Cao) |
| **TC-TOOL-010** | Chạy kiểm tra kết nối / Health Check thành công | `FR-TOOL-DET-05` | Tool `date_time_info` đang `AVAILABLE` | Gửi `POST /api/v1/tools/date_time_info/test` với param `{"timezone": "UTC"}` | HTTP 200, kết quả kiểm tra `SUCCESS`, trả về thời gian hiện tại | P2 (Trung bình) |

---

### 3.3 An ninh & Bảo mật Web Tools (SSRF & Web Security)

| Test Case ID | Tên kịch bản | Yêu cầu truy vết | Điều kiện tiên quyết | Các bước thực hiện | Kết quả mong đợi | Mức độ ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-TOOL-011** | Chặn truy cập IP nội bộ Loopback qua `fetch_webpage` | `SEC-TOOL-01`, `BR-TOOL-06` | Tool `fetch_webpage` active | Gọi `fetch_webpage` với URL `http://127.0.0.1:8000/api/v1/tools` | Bị PolicyGate/SSRF Engine chặn ngay lập tức, trả mã lỗi `SECURITY_VIOLATION_SSRF`, không phát request HTTP ra ngoài | P1 (Nghiêm ngặt) |
| **TC-TOOL-012** | Chặn truy cập Cloud Metadata Endpoint (169.254.169.254) | `SEC-TOOL-01`, `BR-TOOL-06` | Tool `fetch_webpage` active | Gọi `fetch_webpage` với URL `http://169.254.169.254/latest/meta-data/` | Chặn đứng bởi bộ lọc Link-local CIDR, trả lỗi `SECURITY_VIOLATION_SSRF` | P1 (Nghiêm ngặt) |
| **TC-TOOL-013** | Chặn tấn công DNS Rebinding trong `fetch_webpage` | `SEC-TOOL-01` | Mock DNS trả về IP công khai lần 1, IP nội bộ lần 2 | Gọi `fetch_webpage` với domain `rebind.attacker.com` | Socket connection adapter xác thực IP đích ngay trước handshake TCP, chặn kết nối | P1 (Nghiêm ngặt) |
| **TC-TOOL-014** | Chặn Redirect vòng lặp hoặc Redirect sang IP nội bộ | `SEC-TOOL-01` | Web server ngoài redirect sang `http://192.168.1.1/admin` | Gọi `fetch_webpage` vào URL mồi | SSRF Engine hook vào callback redirect, chặn ngay khi phát hiện target IP thuộc dải cấm | P1 (Nghiêm ngặt) |

---

### 3.4 An ninh File & Sandbox Đọc Dữ Liệu

| Test Case ID | Tên kịch bản | Yêu cầu truy vết | Điều kiện tiên quyết | Các bước thực hiện | Kết quả mong đợi | Mức độ ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-TOOL-015** | Chặn tấn công Path Traversal (`../../etc/passwd`) | `SEC-TOOL-02`, `BR-TOOL-07` | Tool `read_text_file` active | Gọi `read_text_file` với `file_path = "../../../../windows/system32/cmd.exe"` | Sandbox chuẩn hóa path (`Path.resolve()`), phát hiện nằm ngoài whitelist directory, trả lỗi `PERMISSION_DENIED_SANDBOX` | P1 (Nghiêm ngặt) |
| **TC-TOOL-016** | Đọc file text hợp lệ trong thư mục được cấp quyền | `FR-TOOL-CAT-07` | File `test.txt` tồn tại trong thư mục uploads của Project | Gọi `read_text_file` với path hợp lệ | Trả về nội dung text, kích thước và encoding UTF-8 chuẩn xác | P1 (Cao) |
| **TC-TOOL-017** | Chặn đọc file vượt quá kích thước cho phép (Max Payload) | `NFR-TOOL-02` | File text giả lập kích thước 30MB | Gọi `read_text_file` với file 30MB | Chặn đọc, trả mã lỗi `PAYLOAD_TOO_LARGE`, thông báo giới hạn tối đa 10MB | P2 (Trung bình) |
| **TC-TOOL-018** | Xác thực Magic Bytes định dạng file (File Spoofing Defense) | `SEC-TOOL-02` | File text đổi đuôi giả mạo `.pdf` | Gọi `detect_file_metadata` | Phát hiện MIME type thực tế là `text/plain`, không tin tưởng extension giả mạo | P2 (Trung bình) |

---

### 3.5 Công cụ Tính Toán & Tiện Ích Dữ Liệu (Data Utilities)

| Test Case ID | Tên kịch bản | Yêu cầu truy vết | Điều kiện tiên quyết | Các bước thực hiện | Kết quả mong đợi | Mức độ ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-TOOL-019** | Tính toán biểu thức số học hợp lệ trong `calculator` | `FR-TOOL-CAT-25` | Tool `calculator` active | Gọi `calculator` với `expression = "(15 * 4) + (100 / 5) - 2^3"` | Trả về kết quả chính xác `72.0` | P1 (Cao) |
| **TC-TOOL-020** | Chặn tiêm mã độc Python qua `calculator` (Anti-Eval Injection) | `SEC-TOOL-03` | Tool `calculator` active | Gọi `calculator` với `expression = "__import__('os').system('dir')"` | AST parser phát hiện node không thuộc whitelist (Call/Import), từ chối thực thi với lỗi `UNSUPPORTED_EXPRESSION_NODE` | P1 (Nghiêm ngặt) |
| **TC-TOOL-021** | Lọc dòng CSV không sử dụng `eval()` an toàn | `FR-TOOL-CAT-12` | File `sample.csv` nạp sẵn | Gọi `filter_csv_rows` với `filter_column = "age"`, `operator = ">="`, `filter_value = "18"` | Trả về các dòng thỏa mãn điều kiện, không thực thi mã script ngoài | P1 (Cao) |
| **TC-TOOL-022** | Chống tấn công Regular Expression Denial of Service (ReDoS) | `SEC-TOOL-05` | Tool `regex_extract` active | Gọi `regex_extract` với pattern `(a+)+$` trên chuỗi 100 ký tự 'a' kèm ký tự '!' cuối | Engine ngắt xử lý sau 1000ms (timeout), trả về lỗi `EXECUTION_TIMEOUT`, không làm nghẽn CPU | P1 (Nghiêm ngặt) |

---

### 3.6 Bộ Công Cụ Local Knowledge Base / FAISS

| Test Case ID | Tên kịch bản | Yêu cầu truy vết | Điều kiện tiên quyết | Các bước thực hiện | Kết quả mong đợi | Mức độ ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-TOOL-023** | Báo lỗi rõ ràng khi gọi Tool FAISS lúc chưa cài thư viện | `BR-TOOL-04`, `FR-TOOL-CAT-19` | Môi trường thiếu `faiss-cpu` | Gọi tool `create_faiss_index` | Trả về lỗi `DEPENDENCY_MISSING` kèm hướng dẫn cài đặt `pip install faiss-cpu numpy`, backend không crash | P1 (Nghiêm ngặt) |
| **TC-TOOL-024** | Tạo Index FAISS thành công khi đầy đủ dependency | `FR-TOOL-CAT-19` | Đã cài `faiss-cpu`, có API key Embedding | Gọi `create_faiss_index` với danh sách tài liệu hợp lệ | Tạo thư mục index, file `index.faiss`, database `metadata.sqlite`, trả về `index_id` | P1 (Cao) |
| **TC-TOOL-025** | Chặn trộn vector có dimension hoặc embedding model khác nhau | `BR-TOOL-05` | Index đã khởi tạo với Google (768d) | Gọi `add_documents_to_faiss` với cấu hình embedding OpenAI (1536d) | Chặn thao tác, trả lỗi `INCOMPATIBLE_EMBEDDING_DIMENSION (Expected 768, got 1536)` | P1 (Cao) |
| **TC-TOOL-026** | Tái xây dựng toàn bộ Index từ nguồn gốc (Rebuild FAISS Index) | `FR-TOOL-CAT-24` | File `index.faiss` bị xóa hoặc corrupt | Gọi `rebuild_faiss_index` với `index_id` | Đọc lại dữ liệu gốc từ `metadata.sqlite`, tái tạo file `index.faiss`, bảo toàn toàn bộ vector | P1 (Cao) |

---

### 3.7 Runtime, Policy Gate & Vòng Lặp Agent

| Test Case ID | Tên kịch bản | Yêu cầu truy vết | Điều kiện tiên quyết | Các bước thực hiện | Kết quả mong đợi | Mức độ ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-TOOL-027** | Model yêu cầu gọi tool được cấp phép trong Project | `FR-TOOL-RUN-01` | Project X đã bind tool `calculator` | Model phát `tool_calls` cho `calculator` | PolicyGate phê duyệt, ToolExecutor thực thi an toàn, trả kết quả về Model tiếp tục sinh lời thoại | P1 (Cao) |
| **TC-TOOL-028** | Chặn thực thi tool khi Project chưa được cấp quyền (Unauthorized Call) | `FR-TOOL-RUN-02` | Project Y không bind tool `web_search` | Model phát `tool_calls` cho `web_search` | PolicyGate phát hiện vi phạm quyền, từ chối gọi, trả error message an toàn cho Model biết | P1 (Nghiêm ngặt) |
| **TC-TOOL-029** | Xử lý Timeout khi tool chạy quá thời gian cấu hình | `FR-TOOL-RUN-03` | Tool ngoài bị nghẽn mạng quá 15s | Executor kích hoạt timeout sau 10s | Ngắt thread/async task, trả mã lỗi `TIMEOUT`, không làm treo phiên chat | P1 (Cao) |
| **TC-TOOL-030** | Fallback mượt mà khi Model không hỗ trợ Tool Calling | `BR-TOOL-02` | Project dùng Model Simulator hoặc LLM cũ | Người dùng đặt câu hỏi yêu cầu dữ liệu tool | Hệ thống không bind tool vào model, prompt hướng dẫn model trả lời dựa trên ngữ cảnh đã có | P1 (Cao) |

---

## 4. Tiêu Chí Nghiệm Thu (Acceptance Criteria & DoD)

Dự án phân hệ Tool Management chỉ được coi là đạt yêu cầu và sẵn sàng bàn giao khi đáp ứng đầy đủ các tiêu chí sau:

- [x] **100% Pass Rate trên Security Test Cases:** Tất cả test cases mức Nghiêm ngặt (P1 Security: SSRF, Path Traversal, AST Injection, IDOR) phải vượt qua tuyệt đối.
- [x] **Zero Regressions:** 100% luồng Chat hiện tại, Project Graph hiện tại, Skills hiện tại không bị ảnh hưởng khi chưa cấu hình Tool.
- [x] **Không rò rỉ Secrets:** Toàn bộ API keys, token dịch vụ ngoài không xuất hiện trên Frontend, không lưu plain JSON, không xuất hiện trong file log.
- [x] **Độc lập Dependency:** Môi trường chưa cài `faiss-cpu` hoặc thư viện phụ thuộc vẫn khởi động thành công và hiển thị rõ trạng thái `DEPENDENCY_MISSING`.
- [x] **Dung sai lỗi (Fault Tolerance):** Khi tool ngoài thất bại hoặc timeout, phiên chat không bị crash mà nhận thông báo lỗi có cấu trúc để model phản hồi người dùng.

---

## 5. Ma Trận Truy Vết Hai Chiều (Bidirectional Traceability Matrix)

Bảng ma trận truy vết thể hiện sự liên kết chặt chẽ từ Yêu cầu Nghiệp vụ (`FR-TOOL-*`, `NFR-TOOL-*`, `SEC-TOOL-*`, `BR-TOOL-*`) đến Mô hình Kiến trúc, API Contract, Cơ sở Dữ liệu, Biểu đồ Mermaid và Kịch bản Kiểm thử tương ứng:

| Mã Yêu Cầu | Tên Yêu Cầu Nghiệp Vụ | Thành phần Thiết kế / DDL | API Contract | Biểu đồ Mermaid Liên quan | Kịch bản Kiểm thử (Test Cases) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-TOOL-LIB-01** | Xem danh sách Tool Registry | `ToolRegistryService`, table `tools` | `GET /api/v1/tools` | [08-mermaid-diagrams: SEQ-01](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/08-mermaid-diagrams.md#3-sequence-diagram--lấy-danh-sách-tools-seq-01), [COMP-01](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/08-mermaid-diagrams.md#12-component--architecture-diagram-comp-01) | `TC-TOOL-001` |
| **FR-TOOL-LIB-02** | Tìm kiếm & Lọc Tools | `ToolRegistryService.list_tools()` | `GET /api/v1/tools?search=&category=` | [08-mermaid-diagrams: IA-01](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/08-mermaid-diagrams.md#2-information-architecture--user-flow-ia-01) | `TC-TOOL-002`, `TC-TOOL-003` |
| **FR-TOOL-LIB-03** | Trạng thái Tool (State Machine) | `ToolStatus` Enum, table `tools` | `GET /api/v1/tools` | [08-mermaid-diagrams: STATE-01](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/08-mermaid-diagrams.md#8-state-diagram--vòng-đời-và-trạng-thái-công-cụ-state-01) | `TC-TOOL-003` |
| **FR-TOOL-LIB-04** | Phân trang danh sách Tool | `PaginationParams`, SQL LIMIT/OFFSET | `GET /api/v1/tools?page=&limit=` | [08-mermaid-diagrams: IA-01](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/08-mermaid-diagrams.md#2-information-architecture--user-flow-ia-01) | `TC-TOOL-004` |
| **FR-TOOL-DET-01** | Xem chi tiết & Schema Tool | `ToolDefinition`, `Input/Output Schema` | `GET /api/v1/tools/{id}` | [08-mermaid-diagrams: DOM-01](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/08-mermaid-diagrams.md#10-domain-class-diagram-dom-01) | `TC-TOOL-005` |
| **FR-TOOL-DET-02** | Cấu hình tham số & Secrets | `tool_configurations`, AES-256 Crypto | `PUT /api/v1/tools/{id}/configuration` | [08-mermaid-diagrams: SEQ-02](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/08-mermaid-diagrams.md#4-sequence-diagram--chỉnh-sửa-và-validate-tool-config-seq-02) | `TC-TOOL-006`, `TC-TOOL-007` |
| **FR-TOOL-DET-03** | Bật / Tắt trạng thái Tool | `ToolRegistryService.set_status()` | `PATCH /api/v1/tools/{id}/status` | [08-mermaid-diagrams: STATE-01](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/08-mermaid-diagrams.md#8-state-diagram--vòng-đời-và-trạng-thái-công-cụ-state-01) | `TC-TOOL-008` |
| **FR-TOOL-DET-04** | Xóa/Retire & Dependency Check | `project_tool_bindings`, Foreign Check | `DELETE /api/v1/tools/{id}` | [08-mermaid-diagrams: ERD-01](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/08-mermaid-diagrams.md#11-entity-relationship-diagram-erd-01) | `TC-TOOL-009` |
| **FR-TOOL-DET-05** | Health Check & Kiểm tra kết nối | `ToolExecutorService.test_connection()` | `POST /api/v1/tools/{id}/test` | [08-mermaid-diagrams: SEQ-03](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/08-mermaid-diagrams.md#5-sequence-diagram--kiểm-tra-kết-nối--dependency-seq-03) | `TC-TOOL-010` |
| **FR-TOOL-CAT-01..06** | Catalog Web & Retrieval | `WebToolsAdapter`, SSRF Guard Engine | In-process Tool Execution | [08-mermaid-diagrams: SEC-01](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/08-mermaid-diagrams.md#13-security-flow--phân-quyền-schema-validation-và-policy-gate-sec-01) | `TC-TOOL-011`..`014` |
| **FR-TOOL-CAT-07..18** | Catalog File & Documents | `FileToolsAdapter`, Storage Sandbox | In-process Tool Execution | [08-mermaid-diagrams: DF-01](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/08-mermaid-diagrams.md#14-data-flow--csv-ingestion-df-01) | `TC-TOOL-015`..`018` |
| **FR-TOOL-CAT-19..24** | Catalog Local FAISS Index | `FAISSToolsAdapter`, Vector Store Engine | In-process Tool Execution | [08-mermaid-diagrams: DF-02](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/08-mermaid-diagrams.md#15-data-flow--document-ingestion--faiss--retrieval-df-02) | `TC-TOOL-023`..`026` |
| **FR-TOOL-CAT-25..32** | Catalog Data & AST Utilities | `DataToolsAdapter`, AST Math Evaluator | In-process Tool Execution | [08-mermaid-diagrams: COMP-01](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/08-mermaid-diagrams.md#12-component--architecture-diagram-comp-01) | `TC-TOOL-019`..`022` |
| **FR-TOOL-RUN-01** | Tool Binding & Project Graph Loop | `ProjectToolNode`, LangGraph State | `POST /api/v1/projects/{id}/tools` | [08-mermaid-diagrams: SEQ-04](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/08-mermaid-diagrams.md#6-sequence-diagram--model-yêu-cầu-gọi-tool-policy-gate-và-thực-thi-seq-04) | `TC-TOOL-027` |
| **FR-TOOL-RUN-02** | Policy Gate & Quyền Gọi Tool | `PolicyGateService`, Whitelist Policy | In-process Policy Enforcement | [08-mermaid-diagrams: SEC-01](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/08-mermaid-diagrams.md#13-security-flow--phân-quyền-schema-validation-và-policy-gate-sec-01) | `TC-TOOL-028` |
| **FR-TOOL-RUN-03** | Xử lý Lỗi, Timeout & Retry | `ToolExecution` logging, Retry Handler | `GET /api/v1/tools/executions/{id}` | [08-mermaid-diagrams: SEQ-05](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/08-mermaid-diagrams.md#7-sequence-diagram--xử-lý-lỗi-timeout-và-retry-seq-05), [STATE-02](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/08-mermaid-diagrams.md#9-state-diagram--vòng-đời-thực-thi-tool-execution-state-02) | `TC-TOOL-029` |
| **BR-TOOL-01** | Phân định Tool vs Skill vs Prompt | Khái niệm kiến trúc chuẩn | Toàn hệ thống | [08-mermaid-diagrams: DOM-01](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/08-mermaid-diagrams.md#10-domain-class-diagram-dom-01) | N/A (Thiết kế nền tảng) |
| **BR-TOOL-02** | Khả năng Tool Calling của Model | `ModelCapabilityResolver` | Provider Adapters | [08-mermaid-diagrams: COMPAT-01](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/08-mermaid-diagrams.md#16-compatibility-diagram--projectmodeltools-và-provider-capability-compat-01) | `TC-TOOL-030` |
| **BR-TOOL-04** | Khởi động độc lập Lazy Import | Import cô lập trong adapter | Toàn hệ thống | [08-mermaid-diagrams: COMP-01](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/08-mermaid-diagrams.md#12-component--architecture-diagram-comp-01) | `TC-TOOL-023` |
| **BR-TOOL-05** | Cách ly Chiều Vector FAISS | `FAISSIndexMetadata.dimension` | FAISS Adapter | [08-mermaid-diagrams: DF-02](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/08-mermaid-diagrams.md#15-data-flow--document-ingestion--faiss--retrieval-df-02) | `TC-TOOL-025` |
| **SEC-TOOL-01** | Phòng thủ SSRF Đa tầng | `SSRFGuardEngine`, IP Blacklist | Web Adapters | [08-mermaid-diagrams: SEC-01](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/08-mermaid-diagrams.md#13-security-flow--phân-quyền-schema-validation-và-policy-gate-sec-01) | `TC-TOOL-011`..`014` |
| **SEC-TOOL-02** | Sandbox Đọc File & Path Traversal | `StorageSandbox`, Canonical Path | File Adapters | [08-mermaid-diagrams: SEC-01](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/08-mermaid-diagrams.md#13-security-flow--phân-quyền-schema-validation-và-policy-gate-sec-01) | `TC-TOOL-015`, `TC-TOOL-018` |
| **SEC-TOOL-03** | Chặn Thực thi Code Tùy ý (AST) | `SafeASTMathEvaluator` | `calculator` Tool | [08-mermaid-diagrams: COMP-01](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/08-mermaid-diagrams.md#12-component--architecture-diagram-comp-01) | `TC-TOOL-019`, `TC-TOOL-020` |
| **SEC-TOOL-04** | Bảo vệ Bí mật & Credentials | `SecretStorageService` (AES-256) | `tool_configurations` | [08-mermaid-diagrams: SEQ-02](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/08-mermaid-diagrams.md#4-sequence-diagram--chỉnh-sửa-và-validate-tool-config-seq-02) | `TC-TOOL-006` |
| **SEC-TOOL-05** | Giảm thiểu ReDoS & DoS | Regex Engine Timeout, Max Payload | `regex_extract`, Parser | [08-mermaid-diagrams: COMP-01](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/08-mermaid-diagrams.md#12-component--architecture-diagram-comp-01) | `TC-TOOL-017`, `TC-TOOL-022` |

---
*Tài liệu kiểm thử và ma trận truy vết được đối soát tự động, bảo đảm mọi yêu cầu đặc tả đều có kiểm thử tương ứng.*
