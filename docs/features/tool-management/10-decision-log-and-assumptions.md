# Nhật Ký Quyết Định & Giả Định (Decision Log & Assumptions) — Tool Management

> **Tài liệu:** Nhật ký quyết định kiến trúc (ADRs), danh mục giả định, câu hỏi mở và kế hoạch chuyển đổi/tương thích (Migration & Rollout Plan).  
> **Trạng thái:** `SPECIFIED` (Đặc tả thiết kế phục vụ phê duyệt kiến trúc).  
> **Phiên bản:** 1.0.0 (Ngày: 17/10/2026).  
> **Tài liệu liên quan:** [README.md](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/README.md), [00-discovery-and-as-is-audit.md](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/00-discovery-and-as-is-audit.md), [04-architecture-and-invocation-lifecycle.md](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/04-architecture-and-invocation-lifecycle.md), [05-data-model-and-api-contracts.md](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/05-data-model-and-api-contracts.md), [07-faiss-local-vector-store-spec.md](file:///c:/Users/PC/Project/ai-chan/docs/features/tool-management/07-faiss-local-vector-store-spec.md).

---

## 1. Nhật Ký Quyết Định Kiến Trúc (Architecture Decision Records - ADR)

### ADR-TOOL-001: Quản lý Tập trung (Centralized Tool Registry & Unified Execution Service)
- **Bối cảnh:** Hiện tại trong `ai-backend`, các phân hệ Chat, Project Graph và Discord Bot hoạt động tương đối độc lập. Nếu mỗi phân hệ tự cài đặt cách gọi tool và adapter riêng, hệ thống sẽ bị phân mảnh, trùng lặp code, không thể kiểm soát an ninh (SSRF, Path Traversal) và khó kiểm toán (audit log).
- **Quyết định:** Xây dựng một dịch vụ trung tâm duy nhất: `ToolRegistryService` (quản lý định nghĩa, schema, vòng đời) và `ToolExecutorService` kết hợp với `PolicyGateService` (kiểm duyệt quyền, rate limit, timeout, bảo mật). Toàn bộ các consumer (Chat thông thường, Project Graph Agent, Discord Bot) bắt buộc phải đi qua cổng này để thực thi công cụ.
- **Hệ quả:**
  - *Tích cực:* Đảm bảo 100% lệnh gọi tool tuân thủ chính sách bảo mật, tập trung ghi log lịch sử thực thi (`tool_executions`), dễ dàng bổ sung adapter mới.
  - *Tiêu cực:* Tạo thêm một tầng trừu tượng (abstraction layer), cần thiết kế API nội bộ tối ưu để không làm tăng độ trễ (latency).
- **Trạng thái:** `APPROVED_AS_DEFAULT_DESIGN`.

---

### ADR-TOOL-002: Cơ chế Nạp Chậm (Lazy Loading) cho Thư viện Phụ thuộc Nặng và Đặc thù HĐH
- **Bối cảnh:** Một số công cụ nâng cao như FAISS (`faiss-cpu`), PyPDF (`pypdf`), python-docx đòi hỏi cài đặt thêm thư viện Python và có thể phụ thuộc vào môi trường C++ runtime trên Windows. Nếu thực hiện `import faiss` ngay tại file khởi động chính (`main.py` hoặc `__init__.py`), ứng dụng sẽ bị crash ngay lập tức trên máy người dùng chưa cài đặt dependency này khi chạy `run-demo.bat`.
- **Quyết định:** Tuyệt đối không import các thư viện phụ thuộc tùy chọn ở phạm vi module (top-level). Toàn bộ import của FAISS, PDF, DOCX, XLSX phải được đặt bên trong hàm khởi tạo hoặc hàm thực thi của Adapter cụ thể (`lazy import`). Khi thư viện chưa sẵn sàng, hệ thống bắt ngoại lệ `ImportError` và trả về trạng thái `DEPENDENCY_MISSING` rõ ràng cho người dùng thay vì gây dừng ứng dụng.
- **Hệ quả:**
  - *Tích cực:* Bảo vệ luồng khởi động `run-demo.bat` của AI-Chan hoạt động ổn định 100% trên mọi môi trường Windows.
  - *Tiêu cực:* Lần thực thi đầu tiên của tool sẽ chịu thêm chi phí import động (khoảng 50-200ms).
- **Trạng thái:** `APPROVED_AS_DEFAULT_DESIGN`.

---

### ADR-TOOL-003: Kiến trúc Phòng thủ SSRF Đa tầng (Defense-in-Depth SSRF Engine)
- **Bối cảnh:** Các công cụ truy xuất web (`fetch_webpage`, `web_search`, `parse_sitemap`) tiềm ẩn nguy cơ bảo mật SSRF nghiêm trọng (truy cập tài nguyên mạng nội bộ `127.0.0.1`, subnet riêng `192.168.x.x`, hoặc endpoint nhạy cảm của cloud metadata `169.254.169.254`).
- **Quyết định:** Thiết kế module `SSRFGuardEngine` thực hiện xác thực độc lập 3 tầng:
  1. *URL Parse & Scheme Whitelist:* Chỉ chấp nhận scheme `http://` và `https://`. Chặn `file://`, `gopher://`, `dict://`.
  2. *Pre-request DNS Resolution & CIDR Filter:* Phân giải tên miền ra IP và đối soát với danh sách đen CIDRs (RFC 1918, RFC 3927 link-local, loopback, IPv6 mapped).
  3. *Socket Connection Hook & Redirect Tracking:* Kiểm tra lại địa chỉ IP tại thời điểm bắt tay kết nối TCP thực tế (chống DNS Rebinding) và kiểm tra lại toàn bộ URL đích của mỗi bước redirect (tối đa 3 hops).
- **Hệ quả:**
  - *Tích cực:* Ngăn chặn triệt để tấn công xâm nhập mạng nội bộ từ phía server.
  - *Tiêu cực:* Cần thêm 1 lượt DNS lookup trước mỗi request mạng ngoài.
- **Trạng thái:** `APPROVED_AS_DEFAULT_DESIGN`.

---

### ADR-TOOL-004: Parser Toán học và Lọc Dữ liệu An toàn Dựa trên AST (Không Dùng `eval()`)
- **Bối cảnh:** Người dùng và Model thường cần tính toán số học (`calculator`) hoặc lọc các dòng dữ liệu trong file CSV (`filter_csv_rows`). Việc sử dụng hàm `eval()` trong Python tạo lỗ hổng Remote Code Execution (RCE) tức thì.
- **Quyết định:** Xây dựng `SafeASTMathEvaluator` sử dụng thư viện chuẩn `ast` của Python. Bộ duyệt AST chỉ chấp nhận các node toán học cơ bản (`ast.BinOp`, `ast.UnaryOp`, `ast.Constant`, `ast.Add`, `ast.Sub`, `ast.Mult`, `ast.Div`, `ast.Pow`). Mọi node dạng `Call`, `Import`, `Attribute`, `Name` đều bị từ chối và báo lỗi cú pháp. Tương tự, phép lọc CSV chỉ hỗ trợ các toán tử so sánh tường minh (`==`, `!=`, `>`, `<`, `>=`, `<=`, `contains`).
- **Hệ quả:**
  - *Tích cực:* Triệt tiêu 100% nguy cơ tiêm mã độc qua biểu thức số học hoặc chuỗi lọc CSV.
  - *Tiêu cực:* Không hỗ trợ các biểu thức phức tạp hoặc hàm tùy ý nếu chưa khai báo whitelist.
- **Trạng thái:** `APPROVED_AS_DEFAULT_DESIGN`.

---

### ADR-TOOL-005: Mô hình Lưu trữ Kép cho FAISS (Binary Index + SQLite Metadata Store)
- **Bối cảnh:** File nhị phân `index.faiss` của FAISS chỉ lưu trữ vector số thực (embeddings) và ID số nguyên nội bộ. Nó hoàn toàn không lưu trữ nội dung văn bản gốc, tên file nguồn, chunk text hoặc metadata đi kèm. Nếu file nhị phân này bị hỏng hoặc mất đồng bộ, toàn bộ dữ liệu sẽ không thể truy xuất.
- **Quyết định:** Sử dụng mô hình lưu trữ kép (Dual-Storage Architecture):
  1. File `index.faiss`: Lưu trữ vector phục vụ tìm kiếm khoảng cách siêu tốc (L2 / Inner Product).
  2. File `metadata.sqlite`: Lưu trữ văn bản gốc, chunking info, source file hash, embedding model metadata và liên kết ID.
  - Bổ sung công cụ `rebuild_faiss_index` cho phép đọc toàn bộ dữ liệu từ `metadata.sqlite` để tạo lại file `index.faiss` bất cứ lúc nào.
- **Hệ quả:**
  - *Tích cực:* Đảm bảo tính toàn vẹn dữ liệu, cho phép khôi phục vector store mà không lo mất dữ liệu nguồn.
  - *Tiêu cực:* Tốn thêm dung lượng đĩa cho SQLite metadata (khoảng 1.2x dung lượng tài liệu gốc).
- **Trạng thái:** `APPROVED_AS_DEFAULT_DESIGN`.

---

### ADR-TOOL-006: Tích hợp Node Công cụ (Tool Node) Bổ sung và Tương thích Ngược vào Project Graph
- **Bối cảnh:** Project Graph hiện hữu đang hỗ trợ các node: Model, System Prompt, Skills, Sub-projects. Cần tích hợp khả năng gọi Tool vào graph mà không làm hỏng cấu trúc canvas hiện có hoặc gây lỗi cho các Project cũ.
- **Quyết định:** Định nghĩa kiểu node mới `tool` trong Project Graph. Trong cơ sở dữ liệu, việc liên kết giữa Project và Tool được lưu trong bảng riêng `project_tool_bindings`. Đối với các Project cũ chưa có node `tool`, đồ thị LangGraph được biên dịch ở chế độ thông thường (không bind tool). Đối với các Project có gắn node `tool`, LangGraph biên dịch bổ sung một subgraph Tool Execution Loop. Nếu Model của Project không hỗ trợ tool calling, hệ thống tự động fallback mà không làm gián đoạn hội thoại.
- **Hệ quả:**
  - *Tích cực:* Đảm bảo tính tương thích ngược 100% (Zero-breaking change).
  - *Tiêu cực:* Giao diện canvas Project Graph cần cập nhật thêm node palette và component renderer cho Node Tool trong tương lai.
- **Trạng thái:** `APPROVED_AS_DEFAULT_DESIGN`.

---

## 2. Danh Mục Giả Định (Assumptions Log)

Mọi giả định kiến trúc trong tài liệu đều được gắn nhãn `ASSUMPTION` và được đối chiếu với hiện trạng mã nguồn:

1. **`ASSUMPTION-01` (LangChain Tool Calling Readiness):** Giả định rằng `langchain_core.tools.BaseTool` và phương thức `model.bind_tools()` trong LangChain 0.3.0 hoạt động ổn định với cả `ChatGoogleGenerativeAI` và `ChatOpenAI`.  
   *Căn cứ:* Đã xác minh LangChain 0.3.0 và LangGraph 0.2 có trong virtualenv hiện tại.
2. **`ASSUMPTION-02` (Concurrency & SQLite Locking):** Giả định rằng số lượng người dùng đồng thời trên bản local demo là nhỏ (1-5 người dùng), do đó cơ chế khóa file của SQLite khi ghi `tool_executions` sẽ không gây nghẽn cổ chai nếu bật chế độ WAL (`PRAGMA journal_mode=WAL;`).  
   *Căn cứ:* Đã kiểm tra cấu hình database hiện tại của AI-Chan đang dùng SQLite nội bộ.
3. **`ASSUMPTION-03` (Windows File Path Separator):** Giả định rằng ứng dụng chạy trên Windows PowerShell, do đó các thao tác kiểm tra đường dẫn an toàn bắt buộc phải chuẩn hóa bằng `pathlib.Path.resolve()` để tránh lỗi xung đột giữa dấu `/` và `\`.  
   *Căn cứ:* Môi trường phát triển hiện tại đang chạy trên Windows.
4. **`ASSUMPTION-04` (Provider API Key Availability):** Giả định rằng người dùng có thể chủ động cung cấp API key cho các công cụ ngoài (DuckDuckGo, Brave Search) hoặc chấp nhận sử dụng các công cụ nội bộ (File, CSV, Math, Date) hoàn toàn miễn phí mà không cần API key.

---

## 3. Câu Hỏi Mở & Khuyến Nghị An Toàn Mặc Định (Open Questions & Safe Defaults)

| ID | Câu hỏi mở cần người dùng/PO quyết định | Các phương án lựa chọn | Khuyến nghị mặc định an toàn (Default Safe Recommendation) | Lý do khuyến nghị |
| :--- | :--- | :--- | :--- | :--- |
| **OQ-01** | Có nên cho phép người dùng tạo Custom Tool bằng cách viết script Python trực tiếp trên UI không? | **A.** Không cho phép (Chỉ declarative tools).<br>**B.** Cho phép nhưng chạy trong Docker sandbox.<br>**C.** Cho phép chạy trực tiếp bằng subprocess. | **Phương án A: Không cho phép** (Chỉ hỗ trợ built-in declarative tools đã được đăng ký và kiểm duyệt). | Ngăn chặn tuyệt đối nguy cơ RCE (Remote Code Execution) và rủi ro chiếm quyền điều khiển hệ thống máy tính người dùng. |
| **OQ-02** | Không gian lưu trữ Index FAISS nên được cô lập theo cấp độ nào? | **A.** Toàn cục (Global - dùng chung cho tất cả Projects).<br>**B.** Theo Project (Cô lập dữ liệu theo từng Project).<br>**C.** Theo từng phiên chat (Ephemeral). | **Phương án B: Cô lập theo từng Project** (`storage/faiss/{project_id}/{index_id}`). | Đảm bảo tính bảo mật dữ liệu, tránh rò rỉ thông tin nhạy cảm giữa các đồ án khác nhau, đồng thời hỗ trợ quản lý vòng đời index dễ dàng. |
| **OQ-03** | Chiến lược xử lý khi Model gọi Tool bị lỗi hoặc Timeout như thế nào? | **A.** Ngắt phiên chat và báo lỗi đỏ cho người dùng.<br>**B.** Tự động retry vô hạn lần.<br>**C.** Tự động retry tối đa 1 lần (với lỗi mạng) và trả error message có cấu trúc cho Model. | **Phương án C: Tự động retry tối đa 1 lần với lỗi mạng; trả error message có cấu trúc cho Model**. | Giúp Model hiểu lý do thất bại (ví dụ: file không tìm thấy, URL bị chặn) để tự điều chỉnh lời giải thích cho người dùng một cách tự nhiên. |
| **OQ-04** | Có nên hỗ trợ chạy Tool dạng tác vụ nền (Async Background Tasks) cho các file lớn không? | **A.** Hỗ trợ ngay trong MVP.<br>**B.** Hoãn sang giai đoạn nâng cao (Phase M6). | **Phương án B: Hoãn sang giai đoạn nâng cao (M6)**. | Giữ cho kiến trúc MVP tinh gọn, dễ kiểm thử và tương thích trực tiếp với vòng lặp hội thoại hiện có của LangGraph. |

---

## 4. Kế Hoạch Chuyển Đổi & Triển Khai (Migration & Rollout Plan)

### 4.1 Kế hoạch Di chuyển Cơ sở Dữ liệu (Database Migration Plan)
- **Quy tắc vàng:** Không sửa đổi, không xóa, không đổi tên bất kỳ bảng nào hiện có (`projects`, `skills`, `chat_sessions`, `messages`, `file_attachments`).
- **Thực thi:**
  1. Tạo file migration SQLAlchemy/Alembic mới bổ sung 4 bảng mới: `tools`, `tool_configurations`, `project_tool_bindings`, `tool_executions`.
  2. Tạo trigger hoặc script tự động seed 32 tools ban đầu vào bảng `tools` với trạng thái phù hợp (`AVAILABLE`, `NEEDS_CONFIGURATION`, `DEPENDENCY_MISSING`).
  3. Kích hoạt `PRAGMA foreign_keys = ON;` và `PRAGMA journal_mode = WAL;` để tối ưu ghi đồng thời.

### 4.2 Kế hoạch Tương thích Đồ thị Dự án (Project Graph Compatibility)
- Cập nhật engine biên dịch đồ thị trong `ai-backend/services/project_graph_executor.py`:
  - Kiểm tra xem canvas có chứa node `tool` hay không.
  - Nếu **Không có**: Biên dịch đồ thị theo pipeline tiêu chuẩn hiện tại.
  - Nếu **Có**: Bổ sung `ToolNode` và conditional edge `tools_condition` vào đồ thị StateGraph của LangGraph.

### 4.3 Lộ trình Triển khai Phân kỳ (Phased Rollout)

```
Giai đoạn 1: Móng & Registry (M1-M2)
- Tạo bảng CSDL & Seed 32 tools.
- Triển khai REST API đọc danh sách & chi tiết Tools.
- Dựng giao diện Tool Registry UI (chế độ xem).

Giai đoạn 2: Cấu hình & Sandbox (M3-M4)
- Triển khai màn hình Tool Configuration (nhập key, timeout, quota).
- Hoàn thiện SSRF Engine & AST Math Evaluator.
- Triển khai tính năng Test Connection / Health Check.

Giai đoạn 3: Tích hợp Runtime & Project Graph (M5)
- Thêm node Tool vào Project Graph UI & Backend Compiler.
- Tích hợp vòng lặp Tool Execution vào luồng Chat của Model.
- Hoàn thiện cơ chế Fallback khi model không hỗ trợ function calling.

Giai đoạn 4: Bộ Công cụ FAISS & Nâng cao (M6)
- Tích hợp FAISS adapter với lazy import.
- Hoàn thiện luồng Chunking -> Embedding -> FAISS -> Semantic Search.
- Kiểm thử toàn diện và bàn giao sản phẩm.
```

---
*Tài liệu Nhật ký Quyết định & Giả định đã được rà soát để đảm bảo tối đa tính an toàn, tính khả thi và tính ổn định dài hạn cho toàn bộ hệ thống AI-Chan.*
