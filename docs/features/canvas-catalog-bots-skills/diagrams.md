# Diagrams: Project Canvas Bots, Skills, and Tools Subsystem

## 1. Catalog Discovery & Dynamic Loading
```mermaid
sequenceDiagram
    autonumber
    actor User as Authenticated User
    participant Editor as Project Editor (React)
    participant BotAPI as Bot Router (/api/v1/bot/discord)
    participant SkillAPI as Skills Router (/api/v1/skills)
    participant ToolAPI as Tools Router (/api/v1/tools)
    participant DB as SQLite Database

    User->>Editor: Opens Project Editor
    par Fetch Authorized Bots
        Editor->>BotAPI: GET /available
        BotAPI->>DB: Check discord_id & bot_configs
        alt Linked & Configured
            BotAPI-->>Editor: 200 OK [ AvailableBotItem ]
        else Not Linked
            BotAPI-->>Editor: 403 Forbidden (DISCORD_NOT_LINKED)
            Editor->>Editor: Render "Discord connection required" CTA
        end
    and Fetch Available Skills
        Editor->>SkillAPI: GET ?status=VALID
        SkillAPI->>DB: Query skills WHERE status='VALID'
        SkillAPI-->>Editor: 200 OK { items: [ Skill ] }
    and Fetch Real Tools from Registry
        Editor->>ToolAPI: GET /api/v1/tools?limit=100
        ToolAPI->>DB: Query tools table
        ToolAPI-->>Editor: 200 OK { items: [ ToolSummaryResponse ] }
    end
    Editor->>User: Renders Catalog with Bots, Skills & Tools groups
```

## 2. Interactive Connection Validation (Single Bot, Multi Skills, Multi Tools)
```mermaid
sequenceDiagram
    autonumber
    actor User as User
    participant Canvas as Canvas Viewport
    participant RuleEngine as Connection Rules Engine

    User->>Canvas: Drags edge from Model ("out") to Bot A ("bot_in")
    Canvas->>RuleEngine: validateConnectionAttempt(Model, Bot A)
    RuleEngine-->>Canvas: { valid: true }
    Canvas->>Canvas: Creates edge (type: "bot_binding")

    User->>Canvas: Attempts edge from Model ("out") to Bot B ("bot_in")
    Canvas->>RuleEngine: validateConnectionAttempt(Model, Bot B)
    RuleEngine-->>Canvas: { valid: false, error: "This model can be connected to only one bot..." }
    Canvas-->>User: Toast error, reject edge, preserve Bot A intact

    User->>Canvas: Drags edge from Model ("out") to Tool 1 (Calculator, "tool_in")
    Canvas->>RuleEngine: validateConnectionAttempt(Model, Tool 1)
    RuleEngine-->>Canvas: { valid: true }
    Canvas->>Canvas: Creates edge (type: "model_tool", stroke: #0ea5e9)

    User->>Canvas: Drags edge from Model ("out") to Tool 2 (Convert Units, "tool_in")
    Canvas->>RuleEngine: validateConnectionAttempt(Model, Tool 2)
    RuleEngine-->>Canvas: { valid: true }
    Canvas->>Canvas: Creates edge (Model now bound to 2 tools)

    User->>Canvas: Attempts edge from Tool 1 ("tool_in") to Model ("out")
    Canvas->>RuleEngine: validateConnectionAttempt(Tool 1, Model)
    RuleEngine-->>Canvas: { valid: false, error: "Reverse connection not allowed" }
    Canvas-->>User: Toast error, reject reverse edge

    User->>Canvas: Attempts duplicate edge to another instance of Calculator on same Model
    Canvas->>RuleEngine: validateConnectionAttempt(Model, Tool 1 duplicate)
    RuleEngine-->>Canvas: { valid: false, error: "Tool already connected to this model" }
    Canvas-->>User: Toast error, reject duplicate edge
```

## 3. Graph Saving & Project Tool Bindings Synchronization
```mermaid
sequenceDiagram
    autonumber
    actor User as User
    participant Editor as Project Editor
    participant Backend as Projects Router (/graph)
    participant Validator as Graph Validator
    participant Registry as Tool Registry Service
    participant DB as SQLite Database

    User->>Editor: Clicks "Save Graph"
    Editor->>Backend: PUT /api/v1/projects/:id/graph { nodes, edges, viewport }
    Backend->>Validator: validate_project_graph(graph_dict)
    Validator->>DB: Verify Model exists & active
    Validator->>DB: Verify connected Tools exist in Tool Registry
    Validator-->>Backend: { is_valid: true, tool_ids: ['calculator', 'convert_units'] }
    Backend->>DB: UPDATE projects SET graph_data=?, is_valid=1
    Backend->>DB: SELECT tool_id FROM project_tool_bindings WHERE project_id=:id
    Note over Backend,Registry: Synchronize diff: unbind removed tools, bind/update linked tools
    Backend->>Registry: bind_tool_to_project(p_id, 'calculator', is_enabled=True, timeout=15)
    Backend->>Registry: bind_tool_to_project(p_id, 'convert_units', is_enabled=True, timeout=20)
    Backend-->>Editor: 200 OK { is_valid: true, message: "Đã lưu cấu trúc đồ thị thành công" }
    Editor-->>User: Success toast & enabled Project Activation
```

## 4. Project Chat Execution Runtime with On-Demand Tool Calling
```mermaid
sequenceDiagram
    autonumber
    actor User as User
    participant ChatUI as Floating Project Chat
    participant Backend as Projects Router (/chat)
    participant Agent as LangGraph Orchestrator (astream_agent)
    participant PolicyGate as Policy Gate Service
    participant ToolExecutor as Tool Executor Service
    participant Model as LLM Provider (Gemini/OpenAI)

    User->>ChatUI: Sends message ("tính 25 * 4")
    ChatUI->>Backend: POST /api/v1/projects/:id/chat (SSE)
    Backend->>Backend: Parse graph: resolve Model, Skills, and Tools (Model -> Tool)
    Backend->>Backend: Check Tools status == AVAILABLE & project_tool_bindings
    Backend-->>ChatUI: event: start { model: "...", tools: [{id: "calculator", ...}] }
    Backend->>Agent: astream_agent(prompt, history, tools=tool_defs, project_id=id)
    Agent->>Model: Bind tools & invoke
    alt Model decides to reply directly without tools
        Model-->>Agent: Token chunks
        Agent-->>ChatUI: event: chunk { content: "..." }
    else Model requests tool call ("calculator", {"expression": "25 * 4"})
        Model-->>Agent: ToolCall(name="calculator", args={expression: "25 * 4"})
        Agent->>PolicyGate: verify_invocation(tool_id="calculator", args, project_id=id)
        PolicyGate-->>Agent: Approved (timeout=15s)
        Agent->>ToolExecutor: execute_tool("calculator", args)
        ToolExecutor->>ToolExecutor: Run handle_calculator with timeout bounds
        ToolExecutor->>Backend: INSERT INTO tool_executions (status='SUCCEEDED', ...)
        ToolExecutor-->>Agent: ToolExecutionResponse(result={"result": 100})
        Agent->>Model: ToolMessage(result=100)
        Model-->>Agent: Final token stream ("Kết quả là 100")
        Agent-->>ChatUI: event: chunk { content: "..." }
    end
    Agent-->>ChatUI: event: done
```

## 5. Tool Node Lifecycle State Machine
```mermaid
stateDiagram-v2
    [*] --> InCatalog: Registered in Backend Tool Registry
    InCatalog --> PlacedOnCanvas: Drag/Click from Node Catalog
    PlacedOnCanvas --> Configured: Inspector Drawer (is_enabled, timeout)
    Configured --> BoundToModel: Edge connected (Model -> Tool)
    BoundToModel --> SavedAndActive: Graph saved & Project ACTIVE
    
    SavedAndActive --> InvokedAtRuntime: User prompt triggers tool call
    InvokedAtRuntime --> Success: Handler executes under timeout
    InvokedAtRuntime --> PolicyBlocked: Disabled / unauthorized
    InvokedAtRuntime --> ExecutionError: Handler exception / timeout
    
    Success --> SavedAndActive: Audit logged & result returned
    PolicyBlocked --> SavedAndActive: Error returned to agent
    ExecutionError --> SavedAndActive: Error returned to agent
    
    SavedAndActive --> Unbound: Edge deleted or Tool Node removed
    Unbound --> [*]: project_tool_bindings deleted on save
```

## 6. Regression Flow for Legacy Graph without Tools
```mermaid
sequenceDiagram
    autonumber
    actor User as User
    participant Editor as Project Editor
    participant Backend as Projects Router
    participant Agent as AI Agent Engine

    Note over User,Editor: Legacy Graph: Web Input -> Model -> Web Output (0 tools)
    Editor->>Backend: PUT /api/v1/projects/:id/graph
    Backend->>Backend: validate_project_graph (tools count == 0)
    Backend-->>Editor: 200 OK (is_valid: true)
    User->>Editor: POST /api/v1/projects/:id/chat {"message": "Hello"}
    Backend->>Agent: astream_agent(prompt, history, tools=None)
    Agent-->>User: Streams standard conversational response with zero tool calls
```
