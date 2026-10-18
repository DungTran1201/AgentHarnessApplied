# TÀI LIỆU KỸ THUẬT: TÍCH HỢP RULES LIBRARY VÀO PROJECT NODE CATALOG & QUAN HỆ MODEL ↔ NHIỀU RULES (1:N)

| Thông Tin Quản Trị | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `RUL-DOC-13` / `PRJ-DOC-11` |
| **Phân Hệ** | **Rules Management & Project Builder (Node Catalog, Canvas Graph, Chat Runtime)** |
| **Trạng Thái** | **`APPROVED & IMPLEMENTED`** |
| **Phiên Bản** | `1.0.0` |
| **Ngày Hoàn Thành** | `2026-10-18` |
| **Tác Giả** | Senior Full-Stack Engineer, Solution Architect & QA Engineer |
| **Truy Vết Yêu Cầu** | `RUL-FR-001`, `RUL-FR-003`, `RUL-FR-011`, `PRJ-FR-006`, `PRJ-BR-008`, `PRJ-BR-009`, `PRJ-BR-010` |

---

## 1. TỔNG QUAN & MỤC TIÊU NGHIỆP VỤ

### 1.1 Mục Tiêu Hệ Thống
Tính năng tích hợp **Rules Library** vào **Project Builder / Node Catalog** cho phép người dùng AI-Chan cấu hình các quy chuẩn kỹ thuật (Coding standards, Security guardrails, Brand persona, Domain policies) trực tiếp trên giao diện Canvas trực quan:
- **Node Catalog Rules Group**: Nhóm Catalog thứ 8 hiển thị các active rules được truy vấn từ backend API thực tế (`GET /api/v1/rules?status=active&limit=100`).
- **Thao tác Kéo/Thả/Click-to-Add**: Tạo Rule Node trên canvas với nhãn hiển thị, cấu hình `rule_id`, các badge phạm vi (`system`/`user`), độ ưu tiên (`priority`), và nút xóa.
- **Quan hệ 1:N (1 Model Node ↔ Nhiều Rule Nodes)**: Một Model Node có thể tiếp nhận nhiều chỉ dẫn quy tắc cùng lúc.
- **Quy ước Hướng Kết Nối (Edge Convention)**: Hướng cạnh chuẩn mực là `Rule Node → Model Node` (Edge type: `'rule_binding'`, Source Handle: `'rule_out'`, Target Handle: `'rule_in'`). Điều này phản ánh chính xác dòng chảy chỉ dẫn nhận thức nạp vào mô hình (tương tự System Prompt), tránh xung đột với các cổng xuất công cụ/kỹ năng (`Model -> Tool`, `Model -> Skill`, `Model -> Bot`, `Model -> Output`).
- **Kiểm Soát Tính Hợp Lệ Lưỡng Cực (Frontend + Backend Dual Validation)**:
  - Chặn kết nối ngược (`Model -> Rule`).
  - Chặn kết nối giữa 2 Rule (`Rule -> Rule`).
  - Chặn kết nối Rule tới các node khác (`Rule -> Input/Output/Tool/Bot`).
  - Chặn liên kết trùng lặp cùng một `rule_id` vào một Model Node.
  - Ngăn chặn IDOR: người dùng không thể gắn Rule riêng tư của người dùng khác vào Project của mình (ngoại trừ System Rules).
- **Đồng Bộ Bền Vững (Graph Persistence & Sync)**: Khi người dùng lưu Canvas Graph (`PUT /api/v1/projects/{id}/graph`), hệ thống tự động đồng bộ hóa danh sách `rule_ids` hợp lệ vào bảng cơ sở dữ liệu `project_rules` thông qua `RuleService.sync_project_rules`.
- **Phân Giải Thời Gian Thực Khi Chat (Runtime Chat Resolution & Deterministic Order)**: Khi streaming hội thoại (`POST /api/v1/projects/{id}/chat`), backend phân giải động các Rule Nodes được nối vào Model từ CSDL, sắp xếp xác định theo `priority DESC, name ASC, id ASC`, và tiêm vào `combined_instruction` dưới khối định dạng `--- ACTIVE ENGINEERING RULES ---`. Nếu rule bị vô hiệu hóa hoặc xóa sau khi lưu graph, hệ thống lập tức từ chối lượt chat với lỗi 422 (Fail-closed).

---

## 2. BỘ 10 SƠ ĐỒ MERMAID CHUẨN HÓA

### 2.1 Sơ Đồ 01: Use Case Diagram — Quản Lý & Liên Kết Rules Vào Model/Project (`RUL-PRJ-DIA-01`)

```mermaid
flowchart LR
    subgraph Actors["Tác Nhân"]
        User["Người Dùng (Project Owner)"]
        LLM["AI Model Runtime"]
    end

    subgraph Project_Builder["Phân Hệ Project Builder Canvas"]
        UC01["Xem Danh Sách Rules Trong Node Catalog"]
        UC02["Tìm Kiếm & Lọc Rules Trong Catalog"]
        UC03["Thêm Rule Node Vào Canvas (Drag / Click)"]
        UC04["Kết Nối Rule Node Vào Model Node (rule_out -> rule_in)"]
        UC05["Kết Nối Đa Rules Vào Cùng Model (1:N Binding)"]
        UC06["Xem Cấu Hình & Chuyển Hướng Chi Tiết Rule"]
        UC07["Xóa Rule Node Khỏi Canvas"]
        UC08["Lưu & Xác Thực Cấu Trúc Đồ Thị"]
    end

    subgraph Chat_Runtime["Phân Hệ Chat Runtime"]
        UC09["Phân Giải Quy Tắc Đã Nối (Rule Resolution)"]
        UC10["Sắp Xếp Quy Tắc Theo Độ Ưu Tiên (Priority DESC)"]
        UC11["Thực Thi Fail-Closed Khi Rule Bị Xóa/Vô Hiệu Hóa"]
        UC12["Tiêm Khối ACTIVE ENGINEERING RULES Vào Model Instruction"]
    end

    User --> UC01
    User --> UC02
    User --> UC03
    User --> UC04
    User --> UC05
    User --> UC06
    User --> UC07
    User --> UC08

    UC08 -.-> UC09
    UC09 --> UC10
    UC09 --> UC11
    UC10 --> UC12
    UC12 --> LLM
```

---

### 2.2 Sơ Đồ 02: Sequence Diagram — Tải Node Catalog & Lấy Danh Sách Rules (`RUL-PRJ-DIA-02`)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người Dùng
    participant Editor as Project Editor (Page)
    participant RuleSvc as RuleService (Client)
    participant API as FastAPI Backend (/api/v1/rules)
    participant DB as SQLite DB (rules table)

    User->>Editor: Mở trang Project Builder Editor (/projects/[id]/editor)
    Editor->>RuleSvc: getRules({ status: 'active', limit: 100 })
    RuleSvc->>API: GET /api/v1/rules?status=active&limit=100 (Bearer Token)
    API->>DB: SELECT * FROM rules WHERE deleted_at IS NULL AND status = 'active' AND (user_id = ? OR scope = 'system') ORDER BY priority DESC
    DB-->>API: Trả về danh sách Rule records
    API-->>RuleSvc: 200 OK (PaginatedRuleResponse: items, total)
    RuleSvc-->>Editor: Danh sách availableRules
    Editor->>Editor: Cập nhật state availableRules, loadingRules = false
    Editor-->>User: Hiển thị Nhóm 8 'Rules' trong Sidebar Catalog với metadata badges
```

---

### 2.3 Sơ Đồ 03: Sequence Diagram — Kéo Thả / Click Rule Vào Canvas & Khởi Tạo Rule Node (`RUL-PRJ-DIA-03`)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người Dùng
    participant Catalog as Node Catalog (Sidebar)
    participant Handler as handleAddRuleNode
    participant State as Canvas Nodes State
    participant Canvas as Canvas Viewport

    User->>Catalog: Chọn Rule từ danh sách hoặc kéo vào canvas
    Catalog->>Handler: Kích hoạt handleAddRuleNode(rule)
    Handler->>State: Kiểm tra trùng lặp (nodes.some(n => n.type === 'rule' && n.data.config.rule_id === rule.id))
    alt Đã tồn tại Rule Node này trên canvas
        Handler-->>User: Rung lắc/Highlight viền đỏ Rule Node đang có, thông báo người dùng
    else Chưa có trên canvas
        Handler->>Handler: Khởi tạo node mới: id = 'rule_node_' + uuid, type = 'rule'
        Handler->>Handler: Cấu hình: config = { rule_id: rule.id, name: rule.name, priority: rule.priority }
        Handler->>State: setNodes([...nodes, newRuleNode])
        Handler->>Canvas: Render Rule Node card với viền tím (#a855f7), Handle 'rule_out'
        Canvas-->>User: Hiển thị Rule Node sẵn sàng kết nối vào Model
    end
```

---

### 2.4 Sơ Đồ 04: Sequence Diagram — Kết Nối 1 Model Node Với Nhiều Rule Nodes (1:N) & Kiểm Tra Hợp Lệ (`RUL-PRJ-DIA-04`)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người Dùng
    participant Canvas as Canvas UI (Handle MouseUp)
    participant Validator as handleTargetHandleMouseUp
    participant Edges as Canvas Edges State
    participant ModelNode as Model Node Card

    User->>Canvas: Kéo dây từ Rule Node (rule_out) thả vào Model Node (rule_in)
    Canvas->>Validator: Kích hoạt handleTargetHandleMouseUp(modelNode.id, 'rule_in')
    Validator->>Validator: Kiểm tra loại node nguồn và đích (srcNode.type === 'rule' && tgtNode.type === 'model')
    
    alt Kết nối ngược (Model -> Rule) hoặc Rule -> Rule
        Validator-->>User: Hiển thị toast lỗi: "Invalid connection direction"
    else Rule này đã được nối vào Model này trước đó
        Validator-->>User: Hiển thị toast lỗi: "Quy tắc này đã được kết nối vào Model Node"
    else Kết nối hợp lệ (Quy tắc mới nối vào Model)
        Validator->>Validator: Tạo edge mới (id: 'e_rule_...', type: 'rule_binding', sourceHandle: 'rule_out', targetHandle: 'rule_in')
        Validator->>Edges: setEdges([...filteredEdges, newEdge])
        Validator->>ModelNode: Tăng badge đếm: "Rules: N" (Ví dụ: 1 -> 2 -> 3)
        ModelNode-->>User: Hiển thị đường nét đứt màu tím (#a855f7) nối từ Rule Node vào Model Node
    end
```

---

### 2.5 Sơ Đồ 05: Sequence Diagram — Lưu Graph, Kiểm Tra Backend & Đồng Bộ CSDL (`RUL-PRJ-DIA-05`)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người Dùng
    participant Editor as Project Editor
    participant API as FastAPI Backend (/api/v1/projects/{id}/graph)
    participant Val as validate_project_graph
    participant RuleSvc as RuleService.sync_project_rules
    participant DB as SQLite Database

    User->>Editor: Nhấn nút "Lưu Đồ Thị"
    Editor->>API: PUT /api/v1/projects/{id}/graph (GraphSaveRequest: nodes, edges)
    API->>Val: validate_project_graph(graph_dict, user_id)
    
    Val->>Val: Kiểm tra số cạnh hợp lệ: 2 + prompt + bot + skills + tools + rules
    Val->>Val: Xác minh cạnh có hướng: Rule Node -> Model Node
    Val->>DB: Truy vấn rules: tồn tại, active, thuộc user hoặc scope='system'
    DB-->>Val: Xác nhận các rule hợp lệ
    Val-->>API: Trả về { is_valid: True, rule_ids: [...] }
    
    API->>DB: Cập nhật projects: graph_data, is_valid = 1, updated_at
    API->>RuleSvc: sync_project_rules(user_id, project_id, rule_ids)
    RuleSvc->>DB: DELETE FROM project_rules WHERE project_id = ?
    RuleSvc->>DB: INSERT INTO project_rules (id, project_id, rule_id, is_enabled, bound_at)
    DB-->>RuleSvc: Đã chèn N bản ghi liên kết
    RuleSvc-->>API: Đồng bộ thành công
    API-->>Editor: 200 OK { project_id, is_valid: true, message: "Đã lưu thành công" }
    Editor-->>User: Hiển thị Toast thông báo lưu thành công & cập nhật trạng thái Valid
```

---

### 2.6 Sơ Đồ 06: Sequence Diagram — Runtime Chat Phân Giải & Nạp Rules Đã Liên Kết (`RUL-PRJ-DIA-06`)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người Dùng
    participant ChatDrawer as Project Chat Drawer
    participant StreamAPI as POST /api/v1/projects/{id}/chat
    participant TurnMgr as ProjectChatTurnManager
    participant DB as SQLite DB (rules, project_rules)
    participant LLM as Google Gemini / OpenAI Engine

    User->>ChatDrawer: Nhập tin nhắn và gửi
    ChatDrawer->>StreamAPI: POST /api/v1/projects/{id}/chat (SSE Stream)
    StreamAPI->>DB: Truy vấn project.graph_data
    StreamAPI->>StreamAPI: Trích xuất các Rule Nodes có cạnh nối vào Model Node
    StreamAPI->>DB: SELECT * FROM rules WHERE id IN (...) AND deleted_at IS NULL
    DB-->>StreamAPI: Danh sách rule records
    
    StreamAPI->>StreamAPI: Sắp xếp xác định: priority DESC, name ASC, id ASC
    StreamAPI->>StreamAPI: Định dạng: "### Rule: [Name]\n[Content]"
    StreamAPI->>StreamAPI: Ghép vào combined_instruction: [System Prompt] + [--- ACTIVE ENGINEERING RULES ---] + [Skills] + [Tools]
    
    StreamAPI->>TurnMgr: start_turn(..., combined_instruction, connected_rules_info)
    TurnMgr-->>ChatDrawer: SSE Event: start { turn_id, status: "PROCESSING", rules: [...] }
    ChatDrawer-->>User: Hiển thị badge các Rules đang áp dụng trong lượt chat
    
    TurnMgr->>LLM: Gửi request với full System Instruction chứa Rules
    LLM-->>TurnMgr: Stream token phản hồi tuân thủ quy tắc
    TurnMgr-->>ChatDrawer: SSE Event: delta { text: "..." }
    ChatDrawer-->>User: Hiển thị văn bản trả lời tuân thủ quy chuẩn
    TurnMgr-->>ChatDrawer: SSE Event: done { status: "COMPLETED" }
```

---

### 2.7 Sơ Đồ 07: Class/Entity/Graph Model Diagram — Cấu Trúc Dữ Liệu & Quan Hệ CSDL (`RUL-PRJ-DIA-07`)

```mermaid
classDiagram
    class Project {
        +string id
        +string user_id
        +string name
        +string target_model_id
        +int max_words_limit
        +string status
        +string graph_data
        +int is_valid
        +datetime created_at
        +datetime updated_at
    }

    class Rule {
        +string id
        +string user_id
        +string name
        +string description
        +string content
        +string scope
        +string activation_mode
        +string glob_patterns
        +string tags
        +int priority
        +string status
        +int version
        +datetime created_at
        +datetime updated_at
        +datetime deleted_at
    }

    class ProjectRuleBinding {
        +string id
        +string project_id
        +string rule_id
        +int is_enabled
        +int custom_priority
        +datetime bound_at
    }

    class GraphNode {
        +string id
        +NodeType type
        +Point position
        +NodeData data
    }

    class RuleNodeConfig {
        +string rule_id
        +string name
        +string description
        +int priority
        +string scope
        +string status
    }

    class GraphEdge {
        +string id
        +string source
        +string target
        +string type
        +string sourceHandle
        +string targetHandle
    }

    Project "1" -- "0..*" ProjectRuleBinding : "has bindings"
    Rule "1" -- "0..*" ProjectRuleBinding : "referenced by"
    Project "1" -- "1" GraphNode : "contains nodes in graph_data"
    GraphNode "1" -- "1" RuleNodeConfig : "embeds when type=rule"
    GraphNode "1" -- "0..*" GraphEdge : "connected by rule_binding"
```

---

### 2.8 Sơ Đồ 08: State Diagram — Vòng Đời Trạng Thái Rule & Tính Hợp Lệ Của Graph (`RUL-PRJ-DIA-08`)

```mermaid
stateDiagram-v2
    [*] --> DraftRule: Tạo mới Rule
    DraftRule --> ActiveRule: Kích hoạt (status='active')
    ActiveRule --> ArchivedRule: Vô hiệu hóa / Lưu trữ (status='archived')
    ArchivedRule --> ActiveRule: Kích hoạt lại
    ActiveRule --> DeletedRule: Xóa mềm (deleted_at != NULL)
    ArchivedRule --> DeletedRule: Xóa mềm

    state GraphValidationState {
        [*] --> EmptyGraph: Tạo mới dự án
        EmptyGraph --> InvalidGraph: Kéo Rule Node vào canvas nhưng chưa nối Model
        InvalidGraph --> ValidGraph: Nối cạnh Rule Node -> Model Node (1:N) & Lưu
        ValidGraph --> InvalidGraph: Xóa cạnh nối / Nối sai hướng / Nối trùng
        ValidGraph --> FailClosedRuntime: Rule liên kết bị Archive/Delete trong thư viện
        FailClosedRuntime --> ValidGraph: Gỡ bỏ Rule lỗi trên Canvas & Lưu lại
    }
```

---

### 2.9 Sơ Đồ 09: Sequence Diagram — Xử Lý Khi Rule Bị Vô Hiệu Hóa/Xóa Khỏi Thư Viện (Fail-Closed) (`RUL-PRJ-DIA-09`)

```mermaid
sequenceDiagram
    autonumber
    actor AdminUser as Người Quản Lý Thư Viện
    actor ChatUser as Người Dùng Chat
    participant RuleAPI as Rules Management
    participant DB as SQLite DB
    participant ChatAPI as Project Chat API (/projects/{id}/chat)

    AdminUser->>RuleAPI: DELETE /api/v1/rules/{rule_id} hoặc Archive Rule
    RuleAPI->>DB: UPDATE rules SET status = 'archived', deleted_at = NOW() WHERE id = ?
    DB-->>RuleAPI: Đã lưu trạng thái
    RuleAPI-->>AdminUser: 200 OK (Rule đã bị xóa mềm/archived)

    Note over ChatUser,ChatAPI: Dự án vẫn lưu graph_data tham chiếu tới rule_id cũ
    ChatUser->>ChatAPI: POST /api/v1/projects/{id}/chat (Gửi tin nhắn)
    ChatAPI->>DB: Phân giải Rule Nodes trong graph_data
    DB-->>ChatAPI: Rule record có status = 'archived' hoặc deleted_at IS NOT NULL
    
    ChatAPI->>ChatAPI: Kích hoạt chính sách bảo vệ Fail-Closed (Anti-Stale Rule)
    ChatAPI-->>ChatUser: 422 Unprocessable Entity { error_code: "RULE_DISABLED" / "RULE_UNAVAILABLE", message: "Quy tắc liên kết không tồn tại hoặc hiện không hoạt động." }
    Note over ChatUser: Ngăn chặn tuyệt đối việc sinh phản hồi thiếu quy chuẩn bảo mật/kỹ thuật
```

---

### 2.10 Sơ Đồ 10: Component & Architecture Diagram — Kiến Trúc Tổng Thể Tính Năng (`RUL-PRJ-DIA-10`)

```mermaid
flowchart TB
    subgraph Frontend["Frontend Layer (Next.js 14 App Router)"]
        Catalog["Node Catalog Component<br>(Group 8: Rules Library)"]
        CanvasEditor["Project Builder Canvas Editor<br>(React Flow Custom Layout)"]
        RuleNodeUI["Rule Node View Card<br>(Handle: rule_out, Purple Border)"]
        ModelNodeUI["Model Node View Card<br>(Handle: rule_in, Rules Counter Badge)"]
        Drawer["Config Drawer & Rule Deep Link"]
        ChatUI["Project Chat Drawer<br>(Active Rules Badges & SSE Client)"]
    end

    subgraph BackendAPI["Backend API Layer (FastAPI)"]
        RulesRouter["/api/v1/rules Router<br>(Rule CRUD, Clone, Scope Filters)"]
        ProjectsRouter["/api/v1/projects Router<br>(Graph Validation, Save, Chat Stream)"]
        GraphValidator["Graph Structure Validator<br>(Edge & Direction Rules, Anti-IDOR)"]
    end

    subgraph ServiceLayer["Service & Business Logic"]
        RuleService["RuleService<br>(sync_project_rules, resolve_rules)"]
        TurnManager["ProjectChatTurnManager<br>(Deterministic Rule Sort & Injection)"]
    end

    subgraph DataStorage["Persistence Layer (SQLite Database)"]
        TableRules[("rules<br>(id, scope, priority, content, status)")]
        TableProjectRules[("project_rules<br>(project_id, rule_id, is_enabled)")]
        TableProjects[("projects<br>(graph_data, target_model_id, is_valid)")]
    end

    subgraph ExternalEngine["AI Inference Service"]
        LLMProvider["Google Gemini / OpenAI Engine<br>(System Instructions with Rules)"]
    end

    Catalog -->|GET /api/v1/rules| RulesRouter
    CanvasEditor -->|Drag/Click| RuleNodeUI
    RuleNodeUI -->|rule_out -> rule_in| ModelNodeUI
    CanvasEditor --> Drawer
    CanvasEditor -->|PUT /projects/{id}/graph| ProjectsRouter
    
    ProjectsRouter --> GraphValidator
    ProjectsRouter --> RuleService
    RuleService --> TableProjectRules
    GraphValidator --> TableRules
    ProjectsRouter --> TableProjects

    ChatUI -->|POST /projects/{id}/chat| ProjectsRouter
    ProjectsRouter --> TurnManager
    TurnManager --> RuleService
    RuleService --> TableRules
    TurnManager --> LLMProvider
```

---

## 3. THIẾT KẾ CHI TIẾT & QUY TẮC LIÊN KẾT

### 3.1 Quy Ước Cổng Kết Nối & Đồ Thị
- **Cổng Nguồn**: `rule_out` trên `Rule Node` (vị trí bên phải node, màu tím `#a855f7`).
- **Cổng Đích**: `rule_in` trên `Model Node` (vị trí bên trái node, `top: 52%`, màu tím `#a855f7`, nằm giữa `input_handle` và `prompt_in`).
- **Loại Cạnh (Edge Type)**: `'rule_binding'`.
- **Màu Sắc & Kiểu Dáng Cạnh**: Màu tím tím sáng (`#a855f7`), nét đứt SVG `strokeDasharray: "5 3"`.
- **Bội Số Quan Hệ (Multiplicity)**:
  - `Model Node ↔ Rule Nodes`: **1 : N** (Một Model có thể nhận 0, 1 hoặc nhiều Rule Nodes).
  - `Rule Node ↔ Model Node`: **1 : 1** (Một Rule Node cụ thể trên canvas chỉ liên kết vào duy nhất một Model Node).
  - `Cấm Duplicate Rule ID`: Hai Rule Nodes khác nhau trên canvas không được cùng mang một `rule_id` khi nối vào cùng một Model Node.

### 3.2 Quy Trình Sắp Xếp Xác Định (Deterministic Ordering)
Nhằm đảm bảo prompt caching của LLM hoạt động tối ưu và không gây phân tán ngữ nghĩa, các quy tắc được sắp xếp theo thứ tự nghiêm ngặt:
$$\text{Priority (Giảm dần)} \longrightarrow \text{Name (A-Z)} \longrightarrow \text{Rule ID (A-Z)}$$

### 3.3 Định Dạng Tiêm Khối Quy Tắc (Injection Format)
Khối quy tắc được chèn vào `combined_instruction` ngay sau `System Prompt` và trước `Skills`/`Tools`:
```markdown
[System Prompt Content]

--- ACTIVE ENGINEERING RULES ---
### Rule: [Rule Name 1]
[Rule Content 1]

### Rule: [Rule Name 2]
[Rule Content 2]
--- END ACTIVE ENGINEERING RULES ---

--- ACTIVE SKILLS INSTRUCTIONS ---
...
--- END SKILLS INSTRUCTIONS ---

--- AVAILABLE TOOLS FOR THIS MODEL ---
...
--- END AVAILABLE TOOLS ---
```

---

## 4. MA TRẬN TRUY VẾT & BẰNG CHỨNG KIỂM THỬ

| Mã Kiểm Thử | Tầng | Mục Tiêu Kiểm Thử | Kết Quả |
| :--- | :--- | :--- | :--- |
| `TC-CANVAS-016` | Frontend | Kết nối hợp lệ Rule Node -> Model Node vào cổng `rule_in` | **PASS (100%)** |
| `TC-CANVAS-017` | Frontend | Kết nối 1 Model Node với 3 Rule Nodes riêng biệt (1:N) | **PASS (100%)** |
| `TC-CANVAS-018` | Frontend | Từ chối kết nối trùng lặp từ cùng Rule Node vào Model | **PASS (100%)** |
| `TC-CANVAS-019` | Frontend | Từ chối kết nối ngược `Model -> Rule` | **PASS (100%)** |
| `TC-CANVAS-020` | Frontend | Từ chối kết nối `Rule -> Rule` | **PASS (100%)** |
| `TC-CANVAS-021` | Frontend | Từ chối kết nối `Rule -> Input/Output/Tool/Bot` | **PASS (100%)** |
| `TC-CANVAS-022` | Frontend | `checkGraphValidity` hợp lệ khi kết nối đủ, báo lỗi khi Rule node bị bỏ rơi | **PASS (100%)** |
| `TC-PYTEST-001` | Backend | API Rules Catalog trả về danh sách active rules | **PASS (100%)** |
| `TC-PYTEST-002` | Backend | Lưu và tải lại Graph 1 Model + 3 Rules, đồng bộ `project_rules` | **PASS (100%)** |
| `TC-PYTEST-003` | Backend | Từ chối kết nối ngược `Model -> Rule` với mã lỗi 422 | **PASS (100%)** |
| `TC-PYTEST-004` | Backend | Từ chối kết nối `Rule -> Rule` với mã lỗi 422 | **PASS (100%)** |
| `TC-PYTEST-005` | Backend | Từ chối liên kết trùng lặp cùng `rule_id` vào một Model | **PASS (100%)** |
| `TC-PYTEST-006` | Backend | Báo lỗi khi Rule Node trên canvas không nối vào Model | **PASS (100%)** |
| `TC-PYTEST-007` | Backend | Anti-IDOR: Từ chối Rule riêng tư của người dùng khác | **PASS (100%)** |
| `TC-PYTEST-008` | Backend | Gỡ bỏ Rule Node trên canvas tự động hủy liên kết trong `project_rules` | **PASS (100%)** |
| `TC-PYTEST-009` | Backend | Runtime chat nạp rules theo thứ tự `priority DESC`, tiêm khối chỉ dẫn | **PASS (100%)** |
| `TC-PYTEST-010` | Backend | Fail-closed: Báo lỗi 422 khi Rule liên kết bị archive hoặc xóa | **PASS (100%)** |

---

## 5. KẾT LUẬN & SẴN SÀNG PHÁT HÀNH
Tính năng tích hợp Rules vào Project Builder Canvas đã hoàn thành 100% các tiêu chí nghiệm thu:
1. Đầy đủ giao diện Catalog nhóm Rules, kéo thả, hiển thị badge, cấu hình drawer.
2. Hỗ trợ đầy đủ quan hệ 1 Model ↔ Nhiều Rules (1:N) theo hướng chuẩn `Rule Node → Model Node`.
3. Kiểm tra tính hợp lệ chặt chẽ ở cả Frontend và Backend, ngăn ngừa IDOR và kết nối sai lệch.
4. Đồng bộ CSDL tức thì với `project_rules`.
5. Phân giải động và thực thi quy tắc nghiêm ngặt trong Runtime Chat SSE Streaming.
6. Hệ thống kiểm thử tự động 100% Pass (Frontend: 46/46 tests, Backend: 55/55 regression tests + 10/10 multi-rule integration tests).
7. Bộ tài liệu hoàn chỉnh 10 sơ đồ Mermaid chuẩn hóa phục vụ bàn giao và bảo trì.
