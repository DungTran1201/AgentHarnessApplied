# 08 - Bộ 16 Biểu đồ Kiến trúc và Luồng Thực thi (Mermaid Diagrams Specification)

Hồ sơ này tập hợp đầy đủ **16 biểu đồ Mermaid bắt buộc**, mô hình hóa từ tầng nghiệp vụ, trải nghiệm người dùng, kiến trúc dữ liệu, đến luồng thực thi và kiểm soát an ninh.

---

## 1. Biểu đồ Trường hợp Sử dụng (Use Case Diagram: List & Detail Management)

```mermaid
flowchart TD
    User([Người dùng / Kỹ sư AI])
    Admin([Quản trị viên Hệ thống])

    subgraph Tool_Management_Boundary["Hệ thống Quản lý Tool (AI-Chan)"]
        UC1["UC-01: Duyệt danh mục Tools"]
        UC2["UC-02: Tìm kiếm & Lọc Tools"]
        UC3["UC-03: Xem chi tiết & Schema Inspector"]
        UC4["UC-04: Cấu hình tham số & Khóa API"]
        UC5["UC-05: Kiểm tra kết nối (Health Check)"]
        UC6["UC-06: Bật / Tắt Tool"]
        UC7["UC-07: Gắn Tool vào Project Graph"]
        UC8["UC-08: Xem Nhật ký Thực thi (Audit Log)"]
        UC9["UC-09: Khấu hao Tool (Deprecate / Retire)"]
    end

    User --> UC1
    User --> UC2
    User --> UC3
    User --> UC4
    User --> UC5
    User --> UC6
    User --> UC7
    User --> UC8

    Admin --> UC1
    Admin --> UC4
    Admin --> UC6
    Admin --> UC8
    Admin --> UC9
```

---

## 2. Biểu đồ Luồng Người dùng & Kiến trúc Thông tin (IA / User Flow)

```mermaid
flowchart TD
    StartNav["Thanh Điều hướng Chính (Sidebar)"] --> ClickTools["Nhấn chọn 'Tools'"]
    ClickTools --> ToolRegistryView["Giao diện Tool Registry (/tools)"]
    
    ToolRegistryView --> SearchFilter["Nhập Từ khóa / Chọn Bộ lọc Nhóm / Trạng thái"]
    SearchFilter --> DisplayCards["Cập nhật Danh sách Thẻ Tools"]
    
    DisplayCards --> CheckStatus{"Trạng thái Tool?"}
    CheckStatus -- "AVAILABLE" --> ActionAvail["Có thể gán vào Project ngay"]
    CheckStatus -- "NEEDS_CONFIGURATION" --> ClickConfig["Bấm 'Configure'"]
    CheckStatus -- "DEPENDENCY_MISSING" --> ClickInstall["Xem hướng dẫn cài pip"]
    CheckStatus -- "DISABLED" --> ClickEnable["Bấm 'Enable'"]
    
    DisplayCards --> ClickCard["Bấm vào Thẻ Tool bất kỳ"]
    ClickCard --> ToolDetailView["Trang Chi tiết Tool (/tools/:id)"]
    
    ToolDetailView --> ViewSchema["Xem trước JSON Schema In/Out"]
    ToolDetailView --> EditConfig["Chỉnh sửa Tham số / Nhập API Key"]
    ToolDetailView --> RunTest["Chạy Kiểm tra Kết nối (Health Check)"]
    ToolDetailView --> ViewAudit["Xem Lịch sử Thực thi gần nhất"]
```

---

## 3. Sơ đồ Tuần tự: Lấy Danh sách Tools (Sequence: List Tools & Status)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng (Browser)
    participant UI as ToolRegistryView Component
    participant API as Tools API (GET /api/v1/tools)
    participant Registry as ToolRegistryService
    participant Checker as DependencyChecker
    participant DB as SQLite Database

    User->>UI: Mở trang /tools
    UI->>API: GET /api/v1/tools?category=&status=
    API->>Registry: list_tools(user_id, filters)
    
    Registry->>DB: SELECT * FROM tools LEFT JOIN tool_configurations
    DB-->>Registry: Trả về danh sách định nghĩa và cấu hình của user
    
    loop Kiểm tra Năng lực Thực tế (Real-time Status Resolution)
        Registry->>Checker: verify_dependencies(tool.dependencies)
        alt Thiếu thư viện Python (e.g. faiss)
            Checker-->>Registry: status = DEPENDENCY_MISSING
        else Chưa có API Key bắt buộc
            Checker-->>Registry: status = NEEDS_CONFIGURATION
        else Bị tắt bởi user
            Checker-->>Registry: status = DISABLED
        else Thỏa mãn đầy đủ
            Checker-->>Registry: status = AVAILABLE
        end
    end
    
    Registry-->>API: Danh sách tools kèm resolved status
    API-->>UI: 200 OK {total, items: [...]}
    UI-->>User: Hiển thị lưới thẻ công cụ kèm badge trạng thái thực tế
```

---

## 4. Sơ đồ Tuần tự: Chỉnh sửa và Lưu Cấu hình (Sequence: Edit & Validate Config)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant UI as ToolConfigEditor Component
    participant API as Tools API (PUT /tools/:id/config)
    participant Registry as ToolRegistryService
    participant DB as SQLite Database

    User->>UI: Thay đổi timeout (15s) và nhập API Key
    User->>UI: Bấm "Lưu Cấu hình"
    
    UI->>UI: Validate Client-side format
    UI->>API: PUT /api/v1/tools/{tool_id}/config<br/>{timeout_seconds: 15, secret_value: "sk-..."}
    
    API->>Registry: update_tool_configuration(user_id, tool_id, payload)
    Registry->>Registry: Kiểm tra tính hợp lệ của tham số
    Registry->>Registry: Mã hóa / Lưu trữ khóa bí mật tách biệt
    
    Registry->>DB: INSERT/UPDATE tool_configurations (health_status='AVAILABLE')
    DB-->>Registry: Đã ghi nhận bản ghi
    
    Registry-->>API: Cấu hình đã cập nhật thành công
    API-->>UI: 200 OK {status: "updated", health_status: "AVAILABLE"}
    UI-->>User: Hiển thị thông báo thành công màu xanh
```

---

## 5. Sơ đồ Tuần tự: Kiểm tra Kết nối Độc lập (Sequence: Health Check / Test Run)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant UI as TestRunPanel Component
    participant API as Tools API (POST /tools/:id/test)
    participant Exec as ToolExecutorService
    participant Tool as Tool Adapter Function
    participant DB as SQLite Database

    User->>UI: Điền payload thử nghiệm vào form tự động sinh
    User->>UI: Bấm "Chạy Thử nghiệm (Test)"
    
    UI->>API: POST /api/v1/tools/{id}/test {payload: {...}}
    API->>Exec: execute_isolated_test(tool_id, payload, timeout=10s)
    
    Exec->>Exec: Validate payload với Input JSON Schema
    alt Payload sai Schema
        Exec-->>API: 422 Unprocessable Entity {detail: "Sai kiểu dữ liệu"}
        API-->>UI: Hiển thị lỗi đỏ chi tiết
    else Schema hợp lệ
        Exec->>Tool: Thực thi hàm kiểm thử
        Tool-->>Exec: Kết quả thành công trong 45ms
        Exec->>DB: UPDATE tool_configurations SET last_health_check_at=NOW(), health_status='AVAILABLE'
        Exec-->>API: {status: "SUCCESS", duration_ms: 45, result: {...}}
        API-->>UI: 200 OK
        UI-->>User: Hiển thị kết quả JSON và độ trễ 45ms
    end
```

---

## 6. Sơ đồ Tuần tự: Vòng lặp Gọi Tool từ Mô hình (Sequence: Model Tool Calling Loop)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng Chat
    participant Agent as LangChain Agent Orchestrator
    participant Model as LLM Provider (Gemini / OpenAI)
    participant Gate as PolicyGate & SecurityShield
    participant Exec as ToolExecutorService
    participant Tool as Tool Adapter (e.g. calculator)
    participant Audit as Tool Execution Audit Log

    User->>Agent: Gửi câu hỏi: "Cộng 1250 và 8750 rồi nhân 2"
    Agent->>Gate: Lấy danh sách tools được phép trong Project (Allowlist)
    Gate-->>Agent: [calculator]
    
    Agent->>Model: Gửi messages kèm bind_tools([calculator])
    Model-->>Agent: Trả về AIMessage với tool_calls:<br/>[id: call_1, name: "calculator", args: {"expression": "(1250 + 8750) * 2"}]
    
    rect rgb(20, 35, 45)
        Note over Agent,Exec: Tầng Thực thi An toàn (Safe Execution Sandbox)
        Agent->>Gate: Xác thực quyền gọi tool 'calculator'
        Gate-->>Agent: Hợp lệ (Policy Check: PASS)
        
        Agent->>Exec: execute_tool("calculator", args, timeout=15s)
        Exec->>Exec: Validate Input Schema
        Exec->>Tool: Chạy hàm AST toán học an toàn
        Tool-->>Exec: {"result": 20000}
        
        Exec->>Audit: Ghi nhật ký thực thi (COMPLETED, 8ms)
        Exec-->>Agent: Trả về ToolMessage(content='{"result": 20000}', tool_call_id="call_1")
    end

    Agent->>Model: Gửi lại toàn bộ lịch sử + ToolMessage
    Model-->>Agent: Trả về câu trả lời tự nhiên: "Kết quả của phép tính là 20.000."
    Agent-->>User: Hiển thị câu trả lời trên màn hình chat
```

---

## 7. Sơ đồ Tuần tự: Xử lý Lỗi, Quá hạn và Thử lại (Sequence: Error / Timeout / Retry)

```mermaid
sequenceDiagram
    autonumber
    participant Agent as Agent Orchestrator
    participant Exec as ToolExecutorService
    participant Target as External Service (e.g. Web Provider)
    participant Audit as Audit Log

    Agent->>Exec: execute_tool("web_search", {query: "..."})
    Exec->>Target: Gửi HTTP Request ra ngoài
    
    alt Trường hợp 1: Timeout quá 15 giây
        Target--xExec: Không phản hồi sau 15 giây
        Exec->>Exec: asyncio.wait_for kích hoạt TimeoutError
        Exec->>Audit: Ghi log {status: TIMED_OUT, duration_ms: 15000}
        Exec-->>Agent: ToolMessage(error="TOOL_EXECUTION_TIMEOUT: Quá 15 giây.")
    else Trường hợp 2: Lỗi mạng tạm thời (HTTP 503) -> Retry
        Target-->>Exec: 503 Service Unavailable (Lần 1)
        Exec->>Exec: Chờ 1 giây (Exponential Backoff)
        Exec->>Target: Thử lại lần 2
        Target-->>Exec: 200 OK (Thành công)
        Exec->>Audit: Ghi log {status: COMPLETED, retries: 1}
        Exec-->>Agent: ToolMessage(content="...")
    else Trường hợp 3: Vi phạm lá chắn SSRF
        Exec->>Exec: Phát hiện IP đích thuộc 192.168.1.1
        Exec->>Audit: Ghi log {status: DENIED, error_code: SSRF_TARGET_BLOCKED}
        Exec-->>Agent: ToolMessage(error="SSRF_TARGET_BLOCKED: Địa chỉ mạng nội bộ bị cấm.")
    end
```

---

## 8. Biểu đồ Trạng thái: Vòng đời Khả dụng của Tool (State Diagram: Tool Lifecycle)

```mermaid
stateDiagram-v2
    [*] --> NEEDS_CONFIGURATION : Tạo mới, thiếu API Key / URL
    [*] --> DEPENDENCY_MISSING : Thiếu thư viện Python (FAISS, openpyxl, ...)
    [*] --> AVAILABLE : Đủ dependencies và cấu hình mặc định

    NEEDS_CONFIGURATION --> AVAILABLE : Người dùng nhập và lưu cấu hình hợp lệ
    DEPENDENCY_MISSING --> AVAILABLE : Cài đặt dependency vào môi trường host
    
    AVAILABLE --> DISABLED : Quản trị viên chủ động tắt
    DISABLED --> AVAILABLE : Quản trị viên kích hoạt lại
    
    AVAILABLE --> ERROR : Health check thất bại hoặc lỗi runtime liên tiếp
    ERROR --> AVAILABLE : Sửa lỗi kết nối / Cập nhật cấu hình thành công
    
    AVAILABLE --> DEPRECATED : Đánh dấu không còn khuyến nghị sử dụng
    DEPRECATED --> [*] : Gỡ bỏ vĩnh viễn (khi không còn Project nào liên kết)
```

---

## 9. Biểu đồ Trạng thái: Vòng đời Lượt Thực thi (State Diagram: Tool Execution Lifecycle)

```mermaid
stateDiagram-v2
    [*] --> QUEUED : Model đề xuất gọi Tool
    QUEUED --> VALIDATING : Bắt đầu quy trình kiểm tra an ninh
    
    VALIDATING --> DENIED : Vi phạm Policy Gate / Không nằm trong Allowlist
    VALIDATING --> EXECUTING : Schema hợp lệ và được cấp quyền
    
    EXECUTING --> COMPLETED : Thực thi hoàn tất thành công
    EXECUTING --> FAILED : Lỗi dữ liệu / Lỗi nghiệp vụ nội bộ
    EXECUTING --> TIMED_OUT : Quá thời hạn quy định (Timeout > 15s)
    
    DENIED --> [*] : Trả lỗi quyền hạn cho Agent
    COMPLETED --> [*] : Trả ToolMessage hợp lệ cho Agent
    FAILED --> [*] : Trả ToolMessage mô tả lỗi an toàn
    TIMED_OUT --> [*] : Trả ToolMessage quá thời gian
```

---

## 10. Biểu đồ Lớp Miền (Domain Class Diagram)

```mermaid
classDiagram
    class ToolDefinition {
        +string id
        +string name
        +string description
        +string category
        +string risk_level
        +boolean is_builtin
        +dict input_schema
        +dict output_schema
        +list dependencies
        +validate_input(args) bool
    }

    class ToolConfiguration {
        +string id
        +string user_id
        +string tool_id
        +boolean is_enabled
        +dict custom_params
        +string secret_ref
        +int timeout_seconds
        +int max_retries
        +string health_status
        +datetime last_health_check_at
    }

    class ProjectToolBinding {
        +string id
        +string project_id
        +string tool_id
        +boolean is_enabled
        +dict config_override
    }

    class ToolExecution {
        +string id
        +string user_id
        +string tool_id
        +string project_id
        +string conversation_id
        +string status
        +int duration_ms
        +dict input_payload
        +string output_summary
        +string error_code
    }

    ToolDefinition "1" -- "0..*" ToolConfiguration : configured by
    ToolDefinition "1" -- "0..*" ProjectToolBinding : bound in
    ToolDefinition "1" -- "0..*" ToolExecution : tracked in
    ToolConfiguration "1" -- "0..*" ToolExecution : executes under
```

---

## 11. Biểu đồ Quan hệ Thực thể Đề xuất (Proposed ER Diagram)

```mermaid
erDiagram
    TOOLS ||--o{ TOOL_CONFIGURATIONS : has
    TOOLS ||--o{ PROJECT_TOOL_BINDINGS : binds
    TOOLS ||--o{ TOOL_EXECUTIONS : logs
    
    USERS ||--o{ TOOL_CONFIGURATIONS : owns
    PROJECTS ||--o{ PROJECT_TOOL_BINDINGS : includes
    PROJECTS ||--o{ TOOL_EXECUTIONS : scopes

    TOOLS {
        TEXT id PK
        TEXT name
        TEXT description
        TEXT category
        TEXT risk_level
        BOOLEAN is_builtin
        TEXT input_schema
        TEXT output_schema
        TEXT dependencies
        DATETIME created_at
    }

    TOOL_CONFIGURATIONS {
        TEXT id PK
        TEXT user_id FK
        TEXT tool_id FK
        BOOLEAN is_enabled
        TEXT config_data
        TEXT secret_ref
        INTEGER timeout_seconds
        INTEGER max_retries
        TEXT health_status
        DATETIME last_health_check_at
    }

    PROJECT_TOOL_BINDINGS {
        TEXT id PK
        TEXT project_id FK
        TEXT tool_id FK
        BOOLEAN is_enabled
        TEXT config_override
        DATETIME created_at
    }

    TOOL_EXECUTIONS {
        TEXT id PK
        TEXT user_id FK
        TEXT tool_id FK
        TEXT project_id FK
        TEXT conversation_id FK
        TEXT status
        INTEGER duration_ms
        TEXT input_payload
        TEXT output_summary
        TEXT error_code
        DATETIME created_at
    }
```

---

## 12. Biểu đồ Thành phần Kiến trúc (Component & Architecture Diagram)

```mermaid
graph TD
    subgraph Frontend["Frontend Client (Next.js 15)"]
        RegistryView["ToolRegistryView"]
        ConfigModal["ToolConfigModal"]
        CanvasEditor["ProjectGraphEditor (ToolNode)"]
        ChatBox["ChatWorkspace / FloatingChat"]
    end

    subgraph Backend_API["API Gateway (FastAPI)"]
        ToolsAPI["/api/v1/tools"]
        ExecAPI["/api/v1/tools/execute"]
        ChatStreamAPI["/conversations/.../messages/stream"]
    end

    subgraph Service_Core["Service Core Layer"]
        RegistryService["ToolRegistryService"]
        PolicyGate["PolicyGate & SecurityShield"]
        ExecutorService["ToolExecutorService"]
        AuditLogger["ExecutionAuditLogger"]
    end

    subgraph Adapter_Layer["Tool Adapters Engine"]
        WebModule["WebSearch & Scraper Adapter"]
        FileModule["File & Document Parser Adapter"]
        FAISSModule["FAISS Local Vector Store Adapter"]
        UtilityModule["Safe Math & Utility Adapter"]
    end

    subgraph External_Providers["External Services"]
        GoogleAI["Google Gemini (Tool Calling)"]
        OpenAI["OpenAI GPT-4o (Tool Calling)"]
        PublicWeb["Public Web Endpoints"]
    end

    Frontend --> Backend_API
    Backend_API --> Service_Core
    Service_Core --> Adapter_Layer
    Service_Core --> External_Providers
    Adapter_Layer --> PublicWeb
```

---

## 13. Biểu đồ Luồng Kiểm soát An ninh (Security Flow & Policy Gate)

```mermaid
flowchart TD
    Req["Yêu cầu Gọi Tool từ Agent"] --> AuthCheck{"Xác thực Người dùng hợp lệ?"}
    AuthCheck -- "Không" --> RejectAuth["401 Unauthorized"]
    
    AuthCheck -- "Có" --> BindingCheck{"Tool có nằm trong Project Allowlist?"}
    BindingCheck -- "Không" --> RejectBinding["403 Forbidden: Tool không được cấp quyền cho Project"]
    
    BindingCheck -- "Có" --> StatusCheck{"Tool có ở trạng thái AVAILABLE?"}
    StatusCheck -- "Không (Disabled / Missing Dep)" --> RejectStatus["400 Bad Request: Tool chưa sẵn sàng"]
    
    StatusCheck -- "Có" --> SchemaCheck{"Tham số có khớp Input JSON Schema?"}
    SchemaCheck -- "Không" --> RejectSchema["422 Unprocessable: Tham số không hợp lệ"]
    
    SchemaCheck -- "Có" --> TypeCheck{"Thuộc loại Tool nào?"}
    
    TypeCheck -- "Web Request" --> SSRFCheck{"Lá chắn SSRF: IP có công cộng?"}
    SSRFCheck -- "Phát hiện IP nội bộ / Metadata" --> RejectSSRF["403 Forbidden: SSRF Target Blocked"]
    SSRFCheck -- "Hợp lệ" --> SafeExec["Thực thi có giới hạn Timeout (15s)"]
    
    TypeCheck -- "File Access" --> PathCheck{"Anti-IDOR: Tệp có thuộc sở hữu của User?"}
    PathCheck -- "Không" --> RejectIDOR["404 Not Found: Tệp không tồn tại"]
    PathCheck -- "Hợp lệ" --> SafeExec
    
    TypeCheck -- "Math / Code" --> EvalCheck{"Có chứa hàm eval / exec nguy hiểm?"}
    EvalCheck -- "Có mã độc" --> RejectEval["403 Forbidden: Malicious Expression Blocked"]
    EvalCheck -- "AST Toán học thuần" --> SafeExec
    
    SafeExec --> PayloadCap{"Dữ liệu trả về <= 10.000 ký tự?"}
    PayloadCap -- "Vượt quá" --> TruncateOutput["Tự động cắt tỉa an toàn (Context Budget)"]
    PayloadCap -- "Nằm trong ngưỡng" --> ReturnResult["Trả ToolMessage cho Agent"]
    TruncateOutput --> ReturnResult
```

---

## 14. Biểu đồ Luồng Dữ liệu CSV (Data Flow: CSV Ingestion & Analysis)

```mermaid
flowchart LR
    CSVFile["Tệp CSV Đính kèm (Local Storage)"] --> Upload["POST /attachments/upload"]
    Upload --> SafeStore["Lưu trữ an toàn att_...dat"]
    
    SafeStore --> ToolParse["Tool: parse_csv"]
    ToolParse --> DetectDelim["Phát hiện Delimiter & Header"]
    DetectDelim --> InferSchema["Suy luận kiểu dữ liệu các cột"]
    
    InferSchema --> Filter["Tool: filter_csv_rows<br/>(Lọc logic không eval)"]
    InferSchema --> Stats["Tool: summarize_csv_statistics<br/>(Mean, Min, Max, Count)"]
    InferSchema --> ConvertJSON["Tool: convert_csv_to_json<br/>(Max 500 records)"]
    
    Filter --> AgentContext["Đưa vào Ngữ cảnh LLM"]
    Stats --> AgentContext
    ConvertJSON --> AgentContext
```

---

## 15. Biểu đồ Luồng Dữ liệu FAISS (Data Flow: Document Ingestion -> FAISS -> Retrieval)

```mermaid
flowchart TD
    DocUpload["1. Tài liệu Nguồn (.pdf, .docx, .txt, .md)"] --> ReadFile["2. Đọc file từ Storage bảo vệ"]
    ReadFile --> ChunkSplitter["3. Phân đoạn Văn bản (RecursiveTextSplitter)<br/>Size: 800 ký tự, Overlap: 100 ký tự"]
    
    ChunkSplitter --> BatchEmbedding["4. Sinh Embeddings theo mẻ (Google 768d / OpenAI 1536d)"]
    BatchEmbedding --> L2Norm["5. Chuẩn hóa Vector (L2-Normalize cho Cosine)"]
    
    L2Norm --> FAISSBinary["6a. Nạp vào faiss_index.add() -> index.faiss"]
    L2Norm --> SQLiteMeta["6b. Ghi metadata text vào metadata.sqlite"]
    
    subgraph Retrieval_Phase["Giai đoạn Truy vấn Ngữ nghĩa (Search Phase)"]
        UserQuery["7. Câu hỏi người dùng"] --> QueryEmbed["8. Sinh Vector Embedding cho Query"]
        QueryEmbed --> FAISSSearch["9. faiss_index.search(query_vec, top_k=4)"]
        FAISSSearch --> SQLiteLookup["10. Đọc nội dung đoạn trích từ metadata.sqlite"]
        SQLiteLookup --> RelevantChunks["11. Danh sách Top đoạn trích liên quan nhất"]
    end
    
    FAISSBinary -.-> FAISSSearch
    SQLiteMeta -.-> SQLiteLookup
    RelevantChunks --> LLMPrompt["12. Ghép vào Context cho Mô hình AI"]
```

---

## 16. Biểu đồ Tương thích và Năng lực Mô hình (Compatibility Diagram)

```mermaid
graph TD
    ProjectConfig["Project Workflow Configuration"] --> ModelSelect["Chọn Model Node"]
    ProjectConfig --> ToolBindings["Gán Tool Nodes"]

    ModelSelect --> CheckModel{"Kiểm tra Model Provider"}
    
    CheckModel -- "Google Gemini (2.5/3.8)" --> NativeTooling["Hỗ trợ Native Tool Calling<br/>(bind_tools)"]
    CheckModel -- "OpenAI (GPT-4o, 4o-mini)" --> NativeTooling
    CheckModel -- "Anthropic (Claude 3.5)" --> NativeTooling
    CheckModel -- "Mô hình Nhỏ / Ollama Cũ" --> PlainTextFallback["Không hỗ trợ Tool Calling<br/>(Fallback về Plain Text có cảnh báo)"]
    CheckModel -- "Local Simulator (Dev/Test)" --> SimAdapter["Mô phỏng phản hồi Tool trong Test"]

    ToolBindings --> CheckDependencies{"Kiểm tra Phụ thuộc Tool"}
    CheckDependencies -- "Đủ Thư viện & Keys" --> ActivateTools["Kích hoạt Tool trong Loop"]
    CheckDependencies -- "Thiếu Thư viện (FAISS...)" --> ShowWarning["Báo lỗi DEPENDENCY_MISSING"]
    CheckDependencies -- "Thiếu Secret (API Key)" --> ShowConfigPrompt["Báo lỗi NEEDS_CONFIGURATION"]

    NativeTooling --> ActivateTools
    SimAdapter --> ActivateTools
```
