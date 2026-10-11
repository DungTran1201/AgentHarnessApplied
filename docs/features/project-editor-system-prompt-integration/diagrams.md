# 12. BỘ BIỂU ĐỒ HỆ THỐNG MERMAID (STANDARDIZED MERMAID DIAGRAMS)
## Phân Hệ: Tích Hợp Thư Viện System Prompt Vào Visual Project Editor & Chat Runtime
### Nền Tảng: AI-Chan Virtual Assistant Platform

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `DOC-SPN-DIAG-01` |
| **Trạng Thái** | `PROPOSED` |
| **Phiên Bản** | `1.0.0-MVP` |
| **Ngày Lập** | `2026-10-11` |

---

## 1. Danh Mục Các Biểu Đồ Chuẩn Hóa

Bộ tài liệu này định nghĩa chính xác 12 biểu đồ Mermaid tiêu chuẩn, bao phủ toàn bộ các khía cạnh từ ca sử dụng, giao diện, luồng tuần tự, cấu trúc dữ liệu đến kiến trúc an ninh:

1. **`DIAG-SPN-UC-001`**: Sơ đồ Use Case tổng thể hệ thống.
2. **`DIAG-SPN-IA-001`**: Sơ đồ kiến trúc thông tin Node Catalog (4 nhóm & thanh công cụ).
3. **`DIAG-SPN-UF-001`**: Sơ đồ luồng người dùng (User Flow) chỉnh sửa Project và liên kết Prompt.
4. **`DIAG-SPN-ACT-001`**: Sơ đồ hoạt động (Activity Flow) tìm kiếm và lọc Node Catalog.
5. **`DIAG-SPN-SEQ-001`**: Sơ đồ tuần tự thêm System Prompt Node vào Canvas.
6. **`DIAG-SPN-SEQ-002`**: Sơ đồ tuần tự lưu cấu trúc đồ thị Project an toàn.
7. **`DIAG-SPN-SEQ-003`**: Sơ đồ tuần tự thực thi Chat phân giải System Prompt ra Provider.
8. **`DIAG-SPN-GRAPH-001`**: Sơ đồ cấu trúc kết nối đồ thị Canvas đa kiểu (Typed Ports & Edges).
9. **`DIAG-SPN-STATE-001`**: Sơ đồ máy trạng thái vòng đời Project và bộ kiểm tra hợp lệ Graph.
10. **`DIAG-SPN-ERD-001`**: Sơ đồ thực thể quan hệ miền dữ liệu (Domain Entity Relationship).
11. **`DIAG-SPN-ARCH-001`**: Sơ đồ phân rã thành phần kiến trúc hệ thống (Component Architecture).
12. **`DIAG-SPN-SEC-001`**: Sơ đồ phân vùng ranh giới tin cậy và luồng kiểm soát an toàn (Trust Boundaries).

---

## 2. Chi Tiết 12 Biểu Đồ Hệ Thống Chuẩn Hóa

### 2.1. Biểu Đồ 1: Sơ Đồ Use Case Tổng Thể (`DIAG-SPN-UC-001`)
*Mô tả:* Minh họa các tương tác chính của Người dùng và AI Model Provider đối với Project Editor, Thư viện Prompt và Chat Runtime.  
*Truy vết:* `UC-SPN-01` đến `UC-SPN-06`, `FR-SPN-001` đến `FR-SPN-014`.

```mermaid
flowchart LR
    ActorUser((Người Dùng / Guest))
    ActorProvider((AI Model Provider))

    subgraph ProjectPlatform["AI-Chan Virtual Assistant Platform"]
        UC1(["UC-SPN-01: Duyệt & Tìm Kiếm Node Catalog"])
        UC2(["UC-SPN-02: Kéo Thả System Prompt Node"])
        UC3(["UC-SPN-03: Nối Cạnh Chỉ Dẫn System Prompt -> Model"])
        UC4(["UC-SPN-04: Lưu Cấu Trúc Graph Kèm Tham Chiếu Prompt"])
        UC5(["UC-SPN-05: Chat Qua Project & Nạp System Instruction"])
        UC6(["UC-SPN-06: Xử Lý Khi Prompt Tham Chiếu Bị Sửa/Xóa"])
        UC_Lib(["Quản Lý Thư Viện System Prompts (/prompts)"])
    end

    ActorUser --> UC1
    ActorUser --> UC2
    ActorUser --> UC3
    ActorUser --> UC4
    ActorUser --> UC5
    ActorUser --> UC_Lib

    UC2 -.->|Tham chiếu ID| UC_Lib
    UC5 -.->|Phân giải DB| UC_Lib
    UC5 -->|Gọi Stream SSE| ActorProvider
    UC6 -.->|Báo lỗi nếu thiếu| UC5
```

---

### 2.2. Biểu Đồ 2: Kiến Trúc Thông Tin Node Catalog (`DIAG-SPN-IA-001`)
*Mô tả:* Cấu trúc phân cấp 4 nhóm Accordion cùng thanh tìm kiếm và bộ lọc nhóm tại sidebar bên trái.  
*Truy vết:* `FR-SPN-001` đến `FR-SPN-005`, `BR-SPN-001`.

```mermaid
graph TD
    CatalogRoot["Node Catalog Sidebar (Trái)"]

    subgraph Toolbar["Thanh Công Cụ Trên Cùng"]
        SearchBox["Ô Tìm Kiếm: Tên, Mô tả (Debounce 200ms)"]
        FilterPills["Bộ Lọc Danh Mục: [Tất cả] [Input] [System Prompt] [Model] [Output]"]
    end

    subgraph FourCategories["4 Nhóm Accordion Cố Định"]
        CatInput["1. 📥 INPUT (1 Item)\n- Web Input Node (Giới hạn từ)"]
        CatSP["2. 📜 SYSTEM PROMPT (N Items Động)\n- Prompt A (Tên, Mô tả, Độ dài)\n- Prompt B (Tên, Mô tả, Độ dài)\n- ... nạp từ GET /system-prompts"]
        CatModel["3. 🧠 MODEL (6 Items)\n- Google Gemini 3.8 Flash\n- OpenAI GPT-4o Mini\n- Anthropic Claude 3.7..."]
        CatOutput["4. 💬 OUTPUT (1 Item)\n- Web Output Node (Streaming SSE)"]
    end

    CatalogRoot --> Toolbar
    Toolbar --> FourCategories
```

---

### 2.3. Biểu Đồ 3: Luồng Người Dùng Chỉnh Sửa Project (`DIAG-SPN-UF-001`)
*Mô tả:* Trình tự các bước thao tác của người dùng từ khi mở Project Editor đến khi lưu đồ thị thành công.  
*Truy vết:* `UC-SPN-01` đến `UC-SPN-04`, `AC-CANVAS-01` đến `AC-CANVAS-04`.

```mermaid
flowchart TD
    Start([Mở Project Editor]) --> LoadData[Nạp Project Data, Model Registry & Thư Viện Prompt]
    LoadData --> ViewCatalog[Duyệt Node Catalog 4 Nhóm]
    ViewCatalog --> SearchFilter{Tìm kiếm hoặc Lọc?}
    
    SearchFilter -- Có --> ApplySearch[Gõ từ khóa / Chọn category] --> FilteredView[Hiển thị mục khớp]
    SearchFilter -- Không --> FullView[Hiển thị danh sách đầy đủ]
    
    FilteredView --> DragPrompt[Kéo thả System Prompt cụ thể vào Canvas]
    FullView --> DragPrompt
    
    DragPrompt --> NodeOnCanvas[Tạo SystemPromptNode trên Canvas]
    NodeOnCanvas --> ConnectEdge[Kéo cổng Instruction Out vào cổng Instruction In của Model]
    
    ConnectEdge --> ValidateConnection{Hợp Lệ?}
    ValidateConnection -- Sai hướng / >1 prompt --> ShowError[Báo lỗi kết nối & Từ chối tạo cạnh] --> DragPrompt
    ValidateConnection -- Hợp lệ (0..1 prompt) --> EdgeCreated[Tạo cạnh nét đứt màu cam]
    
    EdgeCreated --> ClickSave[Nhấn nút Lưu Cấu Trúc Graph]
    ClickSave --> BackendVal{Backend Validation}
    BackendVal -- Lỗi --> ShowSaveErr[Báo lỗi & Giữ cờ Unsaved]
    BackendVal -- Thành công --> SaveSuccess[Lưu JSON vào DB, is_valid = 1] --> ReadyActive[Sẵn sàng kích hoạt ACTIVE để Chat]
```

---

### 2.4. Biểu Đồ 4: Sơ Đồ Hoạt Động Tìm Kiếm & Lọc Catalog (`DIAG-SPN-ACT-001`)
*Mô tả:* Cơ chế xử lý trạng thái giao diện khi tìm kiếm, lọc, lỗi và rỗng trong Node Catalog.  
*Truy vết:* `FR-SPN-003`, `FR-SPN-004`, `AC-CAT-01` đến `AC-CAT-04`.

```mermaid
flowchart TD
    StartSearch([Người dùng tương tác Catalog]) --> InputEvent[Nhập từ khóa hoặc Chọn nút Lọc]
    InputEvent --> Debounce[Chờ 200ms Debounce]
    Debounce --> FilterProcess[Áp dụng logic: Filter Category AND Keyword Match]
    
    FilterProcess --> CheckResult{Số lượng kết quả khớp?}
    
    CheckResult -- "> 0 mục" --> ShowMatched[Hiển thị các card khớp]
    ShowMatched --> CheckCollapsed{Nhóm chứa kết quả có đang thu gọn?}
    CheckCollapsed -- Có --> AutoExpand[Tự động mở rộng nhóm] --> Done([Hiển thị hoàn tất])
    CheckCollapsed -- Không --> Done
    
    CheckResult -- "0 mục" --> CheckHasSource{Thư viện có dữ liệu không?}
    CheckHasSource -- Có dữ liệu nhưng không khớp từ khóa --> NoResultsState[Hiển thị No Results: 'Không tìm thấy node' + Nút Xóa Lọc] --> Done
    CheckHasSource -- Thư viện hoàn toàn rỗng --> EmptyLibraryState[Hiển thị Empty: 'Chưa có prompt nào' + Nút Tạo Mới] --> Done
```

---

### 2.5. Biểu Đồ 5: Sơ Đồ Tuần Tự Thêm System Prompt Node (`DIAG-SPN-SEQ-001`)
*Mô tả:* Tương tác chi tiết giữa Frontend Canvas, Catalog và Engine khi kéo thả node.  
*Truy vết:* `UC-SPN-02`, `UC-SPN-03`, `AC-CANVAS-01`.

```mermaid
sequenceDiagram
    autonumber
    actor User as Người Dùng
    participant Catalog as Node Catalog Sidebar
    participant Canvas as Canvas Graph Engine
    participant Drawer as Right Config Drawer

    User->>Catalog: Chọn System Prompt 'Python Expert' và kéo thả
    Catalog->>Canvas: Thả chuột tại tọa độ (x: 420, y: 340)
    Canvas->>Canvas: Sinh ID duy nhất: node_sp_172864...
    Canvas->>Canvas: Gán data.config = { prompt_id: 'sp_seed_python_expert' }
    Canvas->>Canvas: Render SystemPromptNode (Icon 📜, viền vàng cam)
    Canvas->>Canvas: Bật cờ Has Unsaved Changes (*)
    
    User->>Canvas: Nhấp chọn SystemPromptNode
    Canvas->>Drawer: Mở Drawer hiển thị thông tin chi tiết prompt
    Drawer-->>User: Tên, mô tả, số ký tự, nút 'Đổi Prompt'
    
    User->>Canvas: Kéo cổng Instruction Out sang Model Node
    Canvas->>Canvas: Thẩm định cạnh: Model Node chưa có prompt -> HỢP LỆ
    Canvas->>Canvas: Render cạnh nét đứt màu cam (edge_sp_model)
```

---

### 2.6. Biểu Đồ 6: Sơ Đồ Tuần Tự Lưu Đồ Thị Project (`DIAG-SPN-SEQ-002`)
*Mô tả:* Quy trình Frontend xác thực sơ bộ, gửi API và Backend thực thi Anti-IDOR để lưu đồ thị.  
*Truy vết:* `UC-SPN-04`, `FR-SPN-009`, `FR-SPN-010`, `RISK-SPN-01`.

```mermaid
sequenceDiagram
    autonumber
    actor User as Người Dùng
    participant Editor as Frontend Project Editor
    participant API as FastAPI Backend (/projects/{id}/graph)
    participant DB as SQLite DB (app.db)

    User->>Editor: Bấm nút 'Lưu Cấu Trúc Graph'
    Editor->>Editor: Client Validation: Đủ node bắt buộc, không lặp cạnh
    Editor->>API: PUT /api/v1/projects/{id}/graph (payload: JSON nodes + edges)
    
    API->>API: Giải mã JWT (xác định user_id)
    API->>API: validate_project_graph(graph_data)
    
    alt Graph có chứa System Prompt Node
        API->>API: Trích xuất prompt_id từ config
        API->>DB: SELECT id FROM system_prompts WHERE id=:pid AND (user_id=:uid OR user_id='guest_user')
        DB-->>API: Bản ghi tồn tại (Quyền sở hữu hợp lệ)
    end

    API->>DB: UPDATE projects SET graph_data=:json, is_valid=1, updated_at=CURRENT_TIMESTAMP WHERE id=:id
    DB-->>API: Rowcount = 1
    API-->>Editor: HTTP 200 OK { is_valid: true, message: 'Đã lưu graph thành công' }
    Editor->>Editor: Tắt cờ Has Unsaved Changes
    Editor-->>User: Toast thông báo 'Lưu thành công!'
```

---

### 2.7. Biểu Đồ 7: Sơ Đồ Tuần Tự Thực Thi Chat Với System Prompt (`DIAG-SPN-SEQ-003`)
*Mô tả:* Luồng runtime hoàn chỉnh khi chat qua Project: phân giải prompt, tách vai trò và gọi LLM stream SSE.  
*Truy vết:* `UC-SPN-05`, `FR-SPN-011`, `FR-SPN-012`, `FR-SPN-013`.

```mermaid
sequenceDiagram
    autonumber
    actor User as Người Dùng Chat
    participant WebChat as Web Chat UI
    participant Backend as Backend FastAPI (/projects/{id}/chat)
    participant DB as SQLite DB (app.db)
    participant Adapter as LangChain Model Adapter
    participant LLM as External AI Provider (Gemini/OpenAI)

    User->>WebChat: Gửi câu hỏi: "Viết hàm Fibonacci tối ưu"
    WebChat->>Backend: POST /api/v1/projects/{id}/chat (message, conv_id)
    
    Backend->>DB: SELECT * FROM projects WHERE id=:id AND status='ACTIVE'
    DB-->>Backend: Project hợp lệ, target_model='gemini-3.8-flash'
    
    Backend->>Backend: Parse graph_data JSON -> Phát hiện cạnh system_prompt -> model
    
    alt Có System Prompt Node liên kết
        Backend->>DB: SELECT content FROM system_prompts WHERE id=:prompt_id AND user_id=:uid
        DB-->>Backend: Trả về nội dung: "Bạn là Senior Python Architect..."
        Backend->>Backend: system_instruction = prompt_content
    else Không có System Prompt Node (Legacy Project)
        Backend->>Backend: system_instruction = DEFAULT_AI_CHAN_INSTRUCTION
    end

    Backend->>Adapter: astream_agent(prompt, history, model, system_instruction)
    Adapter->>Adapter: Đóng gói SystemMessage(system_instruction) + HumanMessage(prompt)
    Adapter->>LLM: Gọi API Stream (system_instruction + messages)
    
    loop Stream Phản Hồi Từng Token (SSE)
        LLM-->>Adapter: Token Chunk
        Adapter-->>Backend: Chunk Event
        Backend-->>WebChat: event: chunk data: {"token": "..."}
        WebChat-->>User: Hiển thị chữ chạy thời gian thực
    end

    LLM-->>Adapter: Stream Done
    Backend->>DB: INSERT INTO messages (assistant, full_response)
    Backend-->>WebChat: event: done data: {"status": "done"}
```

---

### 2.8. Biểu Đồ 8: Cấu Trúc Kết Nối Đồ Thị Canvas Đa Kiểu (`DIAG-SPN-GRAPH-001`)
*Mô tả:* Biểu diễn trực quan 2 cấu trúc đồ thị hợp lệ trong MVP: Chuẩn Legacy và Chuẩn Extended.  
*Truy vết:* `FR-SPN-007`, `FR-SPN-009`, `BR-SPN-003`, `BR-SPN-004`.

```mermaid
flowchart LR
    subgraph ExtendedStandard["1. Cấu Trúc Mở Rộng Hợp Lệ (Extended 4-Node Standard)"]
        direction LR
        IN1["Web Input Node \n [max_words: 500] \n (Port: Data Out)"]
        SP1["System Prompt Node \n [Python Expert] \n (Port: Instruction Out)"]
        MOD1["Model LLM Node \n [gemini-3.8-flash] \n Ports: \n - Data In \n - Instruction In \n - Response Out"]
        OUT1["Web Output Node \n [Streaming: true] \n (Port: Response In)"]

        IN1 -->|Data Edge #a855f7| MOD1
        SP1 -->|Instruction Edge #f59e0b| MOD1
        MOD1 -->|Response Edge #10b981| OUT1
    end

    subgraph LegacyStandard["2. Cấu Trúc Tuyến Tính Cũ Hợp Lệ (Legacy 3-Node Standard)"]
        direction LR
        IN2["Web Input Node"] -->|Data Edge| MOD2["Model LLM Node"] -->|Response Edge| OUT2["Web Output Node"]
    end

    style ExtendedStandard fill:#0b192c,stroke:#3b82f6,stroke-width:2px,color:#fff
    style LegacyStandard fill:#0f172a,stroke:#64748b,stroke-width:2px,color:#fff
    style SP1 fill:#291e0a,stroke:#f59e0b,stroke-width:2px,color:#fff
    style MOD1 fill:#2e1065,stroke:#a855f7,stroke-width:2px,color:#fff
```

---

### 2.9. Biểu Đồ 9: Máy Trạng Thái Project & Thẩm Định Graph (`DIAG-SPN-STATE-001`)
*Mô tả:* Tương quan giữa tính hợp lệ của cấu trúc đồ thị (`is_valid`) và các trạng thái vòng đời Project.  
*Truy vết:* `FR-SPN-009`, `FR-SPN-013`.

```mermaid
stateDiagram-v2
    [*] --> Draft : Tạo Project Mới (POST /projects)

    state Draft {
        [*] --> IncompleteGraph : Graph thiếu node hoặc cạnh sai
        IncompleteGraph --> ValidatedGraph : Lưu graph đủ node (Legacy 3-node hoặc Extended 4-node)
        ValidatedGraph --> IncompleteGraph : Xóa node / đứt kết nối / Prompt bị xóa
    }

    state STOP {
        [*] --> ReadyToActivate : is_valid == 1 (Chờ kích hoạt)
        [*] --> UnreadyGraph : is_valid == 0 (Cần sửa graph)
    }

    state ACTIVE {
        [*] --> ServingChat : Sẵn sàng chat với Model + Prompt
    }

    state DEACTIVE {
        [*] --> Suspended : Tạm vô hiệu hóa
    }

    Draft --> STOP : Lưu Graph đầu tiên thành công
    STOP --> ACTIVE : Kích hoạt [is_valid == 1 && Quota Active < MAX]
    ACTIVE --> STOP : Người dùng bấm Tạm dừng
    ACTIVE --> DEACTIVE : Người dùng bấm Vô hiệu hóa
    STOP --> DEACTIVE : Người dùng bấm Vô hiệu hóa
    DEACTIVE --> ACTIVE : Kích hoạt lại [is_valid == 1]
    
    ACTIVE --> [*] : Xóa Project (Soft delete)
    STOP --> [*] : Xóa Project
```

---

### 2.10. Biểu Đồ 10: Sơ Đồ Thực Thể Quan Hệ Miền Dữ Liệu (`DIAG-SPN-ERD-001`)
*Mô tả:* Mối quan hệ giữa User, Project, Graph JSON, System Prompt và Model Registry trong CSDL SQLite.  
*Truy vết:* `DOC-SPN-DOM-01`, `models/domain/domain.yaml`.

```mermaid
erDiagram
    USERS ||--o{ PROJECTS : "owns (1..N)"
    USERS ||--o{ SYSTEM_PROMPTS : "creates (0..N)"
    USERS ||--o{ CONVERSATIONS : "starts (1..N)"
    PROJECTS ||--o{ CONVERSATIONS : "executes_in (0..N)"
    CONVERSATIONS ||--o{ MESSAGES : "contains (1..N)"
    PROJECTS }o--|| MODELS : "references target_model_id"
    PROJECTS ||--|| GRAPH_JSON : "stores serialized graph"

    USERS {
        varchar(36) id PK
        varchar(255) email UK
        varchar(50) username UK
        varchar(20) status
    }

    SYSTEM_PROMPTS {
        varchar(36) id PK "sp_hex..."
        varchar(36) user_id FK "References users(id)"
        varchar(100) name "Tên prompt duy nhất theo user"
        varchar(500) description "Mô tả ngắn"
        text content "Nội dung chỉ dẫn (1..10000)"
        timestamp updated_at
    }

    PROJECTS {
        varchar(36) id PK "UUID"
        varchar(36) user_id FK "References users(id)"
        varchar(100) name
        varchar(20) status "ACTIVE | STOP | DEACTIVE"
        text graph_data "JSON: nodes, edges, viewport"
        varchar(100) target_model_id FK
        boolean is_valid
        timestamp updated_at
    }

    GRAPH_JSON {
        json nodes "Gồm web_input, system_prompt, model, output"
        json edges "Gồm data_in, instruction_in, response_out"
        string prompt_id_ref "Tham chiếu logic tới SYSTEM_PROMPTS.id"
    }
```

---

### 2.11. Biểu Đồ 11: Phân Rã Thành Phần Kiến Trúc Hệ Thống (`DIAG-SPN-ARCH-001`)
*Mô tả:* Bản đồ các module và ranh giới trách nhiệm giữa Frontend, Backend và External Services.  
*Truy vết:* `DOC-SPN-ARCH-01`.

```mermaid
componentDiagram
    package "ai-frontend (Next.js 15 App Router)" {
        [ProjectEditorPage] --> [NodeCatalogComponent]
        [ProjectEditorPage] --> [CanvasWorkspaceComponent]
        [ProjectEditorPage] --> [NodeConfigDrawerComponent]
        [NodeCatalogComponent] --> [SystemPromptService]
        [ProjectEditorPage] --> [ProjectService]
    }

    package "ai-backend (FastAPI Service)" {
        [ProjectsRouter] --> [GraphValidatorEngine]
        [ProjectsRouter] --> [ChatRuntimeController]
        [SystemPromptsRouter] --> [PromptRepository]
        [ChatRuntimeController] --> [PromptResolver]
        [ChatRuntimeController] --> [LangGraphAgentOrchestrator]
    }

    database "SQLite Engine (app.db)" {
        folder "Tables" {
            [projects]
            [system_prompts]
            [models]
            [conversations]
            [messages]
        }
    }

    package "External AI Services" {
        [Google Gemini API]
        [OpenAI API]
        [Anthropic Claude API]
    }

    [SystemPromptService] ..> [SystemPromptsRouter] : HTTP GET
    [ProjectService] ..> [ProjectsRouter] : HTTP PUT/POST
    [PromptResolver] --> [system_prompts] : SQL Query
    [ProjectsRouter] --> [projects] : SQL Query
    [LangGraphAgentOrchestrator] --> [Google Gemini API] : HTTPS SSE
    [LangGraphAgentOrchestrator] --> [OpenAI API] : HTTPS SSE
```

---

### 2.12. Biểu Đồ 12: Phân Vùng Ranh Giới Tin Cậy & Bảo Mật (`DIAG-SPN-SEC-001`)
*Mô tả:* 4 vùng ranh giới tin cậy, luồng dữ liệu an toàn và điểm thực thi Anti-IDOR.  
*Truy vết:* `DOC-SPN-SEC-01`, `RISK-SPN-01` đến `RISK-SPN-06`.

```mermaid
flowchart TD
    subgraph UntrustedZone["1. UNTRUSTED ZONE (Client Browser)"]
        ClientUI["Next.js Browser UI\n- User gõ câu hỏi chat\n- User kéo thả tọa độ Canvas\n- Client gửi JSON Graph"]
    end

    subgraph TrustBoundary1["--- TRUST BOUNDARY 1 (HTTPS + JWT Authentication) ---"]
    end

    subgraph SecureBackend["2. SECURE INTERNAL BACKEND (FastAPI Engine)"]
        JWTGuard["JWT Auth Guard / Guest Validator"]
        GraphAuth["Graph Validator & Anti-IDOR Guard\n(Kiểm tra prompt_id thuộc user)"]
        RuntimeResolver["Runtime Prompt Content Resolver\n(Nạp prompt trực tiếp từ DB)"]
        RoleSeparator["LangChain Role Separator\n- SystemMessage: prompt_content\n- HumanMessage: user_chat"]
    end

    subgraph TrustBoundary2["--- TRUST BOUNDARY 2 (Internal SQL Parameterized) ---"]
    end

    subgraph DatabaseZone["3. PERSISTENCE STORAGE (SQLite app.db)"]
        DBTable[("Bảng system_prompts\n(Lưu nội dung bảo mật)")]
    end

    subgraph TrustBoundary3["--- TRUST BOUNDARY 3 (Server-to-Server HTTPS + Secret API Key) ---"]
    end

    subgraph ExternalProvider["4. EXTERNAL PROVIDER ZONE"]
        AIModel["Google Gemini / OpenAI / Claude\n(Thực thi suy luận có system instruction)"]
    end

    ClientUI -->|HTTP Request| TrustBoundary1
    TrustBoundary1 --> JWTGuard
    JWTGuard --> GraphAuth
    JWTGuard --> RuntimeResolver
    RuntimeResolver -->|SQL Query| TrustBoundary2
    TrustBoundary2 --> DBTable
    DBTable -->|Nội dung prompt thô| RuntimeResolver
    RuntimeResolver --> RoleSeparator
    RoleSeparator -->|HTTPS API Call| TrustBoundary3
    TrustBoundary3 --> AIModel
```
