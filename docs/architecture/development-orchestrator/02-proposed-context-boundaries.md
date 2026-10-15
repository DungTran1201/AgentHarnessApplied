# 02. Proposed Context Boundaries — Development Orchestrator

> **Document Scope:** Architectural definition of context boundaries, domain concepts, and structural relationships for the AI-Chan Development Orchestrator.
> **Fact Classification:** `FACT` (verified codebase reality), `DECISION` (selected boundary architecture), `ASSUMPTION` (inferred requirements).

---

## 1. Domain Concept Separation

A fundamental design flaw would be conflating visual prompt graphs with local Git repositories. To ensure modularity, security, and scalability, the Development Orchestrator establishes six distinct boundaries:

| Concept | Boundary Scope | Responsibility | Primary Identity & State |
|---|---|---|---|
| **1. AI-Chan Project** | Web / UI Canvas Context | Visual node graph configuration (`web_input -> model -> output`), system prompt templates, Discord bot bindings. | `project_id` (UUID). Stored in `projects` table (`graph_data` JSON). |
| **2. Development Workspace** | Host Filesystem Context | Representation of a local software repository on host disk: root directory path, Git remote, active branch, and language runtime detection. | `workspace_id` (UUID). Stored in `development_workspaces` table. |
| **3. Agent Runner** | Execution Host Daemon | Host-side service that discovers local CLI runtimes (Antigravity CLI, Claude Code), accepts leased tasks, and spawns child processes securely. | `runner_id` (UUID). Connects outbound to Backend Control Plane. |
| **4. Runtime Adapter** | CLI Driver Context | Pluggable translation engine that adapts generic task instructions into CLI-specific command arguments, parses stdout/stderr streams, and normalizes events. | Polymorphic driver (e.g. `AntigravityAdapter`, `ClaudeCodeAdapter`). |
| **5. Development Task** | Lifecycle & Job Context | A discrete engineering change request with an explicit state machine: planning, running, waiting approval, completed, or failed. | `task_id` (UUID). Stored in `development_tasks` table. |
| **6. Task Artifact** | Verification & Review Context | Discrete outputs produced during a task: Git patch diffs, test logs, generated requirements, and conversation transcripts. | `artifact_id` (UUID). Stored in `task_artifacts` table. |

---

## 2. System Context Diagram (C4 Level 1)

The Context Diagram defines the boundary between external actors, AI-Chan, host machine tools, and external AI providers.

```mermaid
flowchart TD
    %% Actors
    Developer["Developer / User<br/>[Actor]"]

    %% AI-Chan System Boundary
    subgraph AI_Chan_System ["AI-Chan Platform Boundary"]
        ControlPlane["AI-Chan Control Plane<br/>[FastAPI Backend + Next.js Frontend]"]
        AgentRunner["AI-Chan Agent Runner<br/>[Host Worker Process]"]
    end

    %% External Systems & Tools
    subgraph Host_Environment ["Developer Workstation / Host Environment"]
        LocalRepo["Git Repository & Worktree<br/>[Local Filesystem]"]
        AgyCLI["Antigravity CLI (agy)<br/>[Local CLI Tool]"]
        ClaudeCLI["Claude Code CLI (claude)<br/>[Local CLI Tool]"]
    end

    subgraph External_Cloud ["External Cloud Services"]
        GeminiAPI["Google Gemini API<br/>[LLM Provider]"]
        AnthropicAPI["Anthropic Claude API<br/>[LLM Provider]"]
    end

    %% Interactions
    Developer -->|"Views UI, enters tasks, approves diffs"| ControlPlane
    ControlPlane <-->|"Outbound authenticated lease & event stream"| AgentRunner
    AgentRunner -->|"Executes tasks in isolated branch"| LocalRepo
    AgentRunner -->|"Drives process execution"| AgyCLI
    AgentRunner -->|"Drives process execution"| ClaudeCLI
    AgyCLI -.->|"Inference calls"| GeminiAPI
    ClaudeCLI -.->|"Inference calls"| AnthropicAPI
```

---

## 3. Container Architecture Diagram (C4 Level 2)

The Container Diagram details the internal layout of the AI-Chan system, separating web interaction from host execution.

```mermaid
flowchart TB
    subgraph UserInterface ["Frontend Container (Next.js 16)"]
        UI_Nav["Sidebar & Navigation<br/>(AppShell)"]
        UI_Workspace["Workspace Console<br/>(/workspaces)"]
        UI_TaskRunner["Task Stream & Log Viewer<br/>(SSE Client)"]
        UI_DiffViewer["Unified Diff Review Modal<br/>(Vanilla CSS)"]
    end

    subgraph BackendCore ["Backend Control Plane (FastAPI)"]
        API_Gateway["API Router (/api/v1)<br/>FastAPI Modular Routes"]
        AuthService["Auth & Permission Service<br/>JWT & Runner Tokens"]
        OrchestratorService["Orchestrator Service<br/>Task Queue & Dispatcher"]
        StreamHub["SSE Event Stream Hub<br/>FastAPI StreamingResponse"]
        SQLiteDB[("SQLite Database<br/>(app.db)")]
    end

    subgraph HostRunnerContainer ["Agent Runner (Local Host Process)"]
        RunnerClient["Runner Client<br/>(Outbound SSE/HTTP Worker)"]
        TaskExecutor["Task Execution Engine<br/>(Process Supervisor)"]
        GitIsolator["Git Isolation Manager<br/>(Branch/Worktree Guard)"]
        
        subgraph Adapters ["Runtime Adapters"]
            AgyAdapter["Antigravity Adapter<br/>(agy CLI Driver)"]
            ClaudeAdapter["Claude Code Adapter<br/>(claude CLI Driver)"]
        end
    end

    subgraph WorkstationHost ["Host Workspace"]
        Filesystem["Codebase Repository<br/>(/path/to/project)"]
    end

    %% UI to Backend
    UI_Nav -->|"Navigates"| UI_Workspace
    UI_Workspace -->|"REST API"| API_Gateway
    UI_TaskRunner -->|"GET /tasks/{id}/events (SSE)"| StreamHub
    UI_DiffViewer -->|"POST /tasks/{id}/approval"| API_Gateway

    %% Backend Internals
    API_Gateway -->|"Validates auth"| AuthService
    API_Gateway -->|"CRUD & Task trigger"| OrchestratorService
    OrchestratorService -->|"Persists state"| SQLiteDB
    OrchestratorService -->|"Broadcasts events"| StreamHub

    %% Backend to Runner Communication (Outbound from Runner)
    RunnerClient -->|"POST /runner/heartbeat & lease"| API_Gateway
    RunnerClient -->|"POST /tasks/{id}/events (Ingest)"| API_Gateway
    
    %% Runner Internals
    RunnerClient -->|"Dispatches task"| TaskExecutor
    TaskExecutor -->|"Prepares branch"| GitIsolator
    GitIsolator -->|"Inspects & isolates"| Filesystem
    TaskExecutor -->|"Invokes"| AgyAdapter
    TaskExecutor -->|"Invokes"| ClaudeAdapter
    AgyAdapter -->|"Subprocess execution"| Filesystem
    ClaudeAdapter -->|"Subprocess execution"| Filesystem
```

---

## 4. Entity Relationship & Data Boundary

```mermaid
erDiagram
    DEVELOPMENT_WORKSPACE ||--o{ DEVELOPMENT_TASK : "contains"
    AGENT_RUNNER ||--o{ DEVELOPMENT_TASK : "executes"
    DEVELOPMENT_TASK ||--o{ TASK_ARTIFACT : "generates"
    DEVELOPMENT_TASK ||--o{ TASK_LOG : "records"
    AI_CHAN_PROJECT ||..o{ DEVELOPMENT_WORKSPACE : "optionally references"

    DEVELOPMENT_WORKSPACE {
        uuid id PK
        string name
        string root_path
        string git_remote
        string default_branch
        datetime created_at
        datetime updated_at
    }

    AGENT_RUNNER {
        uuid id PK
        string name
        string machine_name
        string platform
        string status "IDLE | BUSY | OFFLINE"
        json capabilities "agy, claude, git"
        datetime last_heartbeat_at
    }

    DEVELOPMENT_TASK {
        uuid id PK
        uuid workspace_id FK
        uuid runner_id FK
        string title
        text prompt
        string runtime "antigravity | claude_code"
        string state "PENDING | PLANNING | RUNNING | WAITING_APPROVAL | COMPLETED | FAILED"
        string git_branch
        json metadata
        datetime created_at
        datetime completed_at
    }

    TASK_ARTIFACT {
        uuid id PK
        uuid task_id FK
        string artifact_type "diff | document | test_report | transcript"
        string file_path
        text content
        datetime created_at
    }

    TASK_LOG {
        uuid id PK
        uuid task_id FK
        string stream "stdout | stderr | system"
        text message
        datetime timestamp
    }
```

---

## 5. Security and Trust Boundaries

1. **Browser to Backend (Trust Boundary 1):**
   - Developer authenticates using existing JWT or session token.
   - Operations restricted to authorized user's workspaces and tasks.
2. **Backend to Agent Runner (Trust Boundary 2):**
   - Runner authenticates using a pre-shared `RUNNER_TOKEN`.
   - Communication is initiated **outbound** from Runner to Backend. The backend never attempts to connect directly into the developer's laptop port.
3. **Agent Runner to Local Filesystem (Trust Boundary 3):**
   - Execution is strictly scoped within `DEVELOPMENT_WORKSPACE.root_path`.
   - Path traversal prevention rejects paths resolving outside `root_path`.
   - Git status guard blocks tasks if uncommitted changes exist on current branch, automatically enforcing clean branch isolation (e.g., `ai-chan/task-{task_id}`).
