# Sơ Đồ Thành Phần Kiến Trúc (Component Architecture Diagram)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-COMP-001` |
| **Loại Sơ Đồ** | **C4 Component Diagram (Level 3 - ai-backend Core)** |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/06-architecture/sad.md](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/sad.md) (`ARCH-SAD-001`) |
| **Mục Đích** | Trực quan hóa cấu trúc các module, dịch vụ nghiệp vụ, tầng điều phối AI và tầng dữ liệu bên trong Backend |

---

## 1. Biểu Đồ Thành Phần Chi Tiết (C4 Component View)

```mermaid
flowchart TD
    Client["Trình Duyệt Người Dùng<br/>(Next.js Web Client)"]
    
    subgraph IngressLayer ["TẦNG CỔNG INGRESS (ai-infra)"]
        NginxGateway["Nginx 1.27 Reverse Proxy<br/>- SSL Termination (HTTPS:443)<br/>- Rate Limit Layer 1 (10 req/s)<br/>- Static & API Routing"]
    end

    subgraph BackendApp ["ỨNG DỤNG LÕI BACKEND (ai-backend - FastAPI)"]
        subgraph APILayer ["Tầng Điều Phối & Router (API Layer)"]
            RateLimitMW["SlowAPI Rate Limiter<br/>[Layer 2: 30 req/min/IP]"]
            AuthDep["get_current_user Dependency<br/>[JWT Verification & Cookie Extractor]"]
            AuthRouter["Auth Router<br/>/api/v1/auth/*"]
            ConvRouter["Conversation Router<br/>/api/v1/conversations/*"]
            ChatRouter["Chat Stream Router<br/>/api/v1/conversations/:id/messages/stream"]
            ModelRouter["Model Management Router<br/>/api/v1/models/* (ADR-006)"]
        end

        subgraph ServiceLayer ["Tầng Dịch Vụ Nghiệp Vụ (Service Layer)"]
            AuthService["AuthService<br/>- Băm mật khẩu bcrypt<br/>- Sinh & ký mã JWT Token"]
            ConvService["ConversationService<br/>- Quản lý vòng đời hội thoại<br/>- Kiểm tra quyền sở hữu (Anti-IDOR)<br/>- Tự động đổi tên tiêu đề"]
            ModelManager["AgentModelManager Service (ADR-006)<br/>- Quản lý danh mục Model đa nhà cung cấp<br/>- Ping & Health Check trực tiếp<br/>- Activate/Deactivate Soft State (BR-012, BR-013)"]
            EnvLoader["EnvKeyLoader<br/>- Đọc keys từ .env (GEMINI, OPENAI, ANTHROPIC, GROQ, OLLAMA)<br/>- Khởi tạo adapter khả dụng"]
            LangGraphEngine["LangGraph Agent StateGraph (ADR-005)<br/>- Quản lý State: messages, current_model<br/>- Nodes: ContextNode (INV-04), PrimaryNode, FallbackNode<br/>- Conditional Edge: Tự động Failover (BR-005)"]
            LangChainAdapters["LangChain Model Adapters<br/>- ChatGoogleGenerativeAI (Primary)<br/>- ChatOpenAI (Fallback)<br/>- ChatAnthropic / ChatGroq / ChatOllama"]
        end

        subgraph RepositoryLayer ["Tầng Truy Xuất Dữ Liệu (Data Layer)"]
            UserRepo["UserRepository<br/>User CRUD & Query"]
            ConvRepo["ConversationRepository<br/>Conversation Thread CRUD"]
            MsgRepo["MessageRepository<br/>Message Persistence & Sliding Window"]
            ModelRepo["AgentModelRepository<br/>Model status, is_default, metrics"]
            DBSession["SQLAlchemy 2.0<br/>AsyncSession Pool"]
        end
    end

    subgraph InfrastructureStorage ["HẠ TẦNG LƯU TRỮ (PERSISTENCE)"]
        Postgres[("PostgreSQL 16 / SQLite Database<br/>- Bảng users<br/>- Bảng conversations<br/>- Bảng messages<br/>- Bảng models (AgentModel)")]
        RedisStore[("Redis 7 Cache<br/>- Rate Limiting Token Bucket")]
    end

    subgraph ExternalLLM ["DỊCH VỤ NGOÀI INTERNET (CLOUD LLMs TẢI TỪ .ENV)"]
        GeminiAPI["Google Gemini 3.8/3.5 Flash API<br/>[Primary: GEMINI_API_KEY]"]
        OpenAIAPI["OpenAI GPT-4o-mini API<br/>[Fallback: OPENAI_API_KEY]"]
        OtherLLMAPI["Anthropic / Groq / Ollama<br/>[Khả dụng khi có Key trong .env]"]
    end

    %% Giao tiếp từ Client tới Nginx
    Client -->|"HTTPS:443 / Cookie"| NginxGateway
    NginxGateway -->|"HTTP:8000"| RateLimitMW

    %% Từ Router sang Middleware / Dependency
    RateLimitMW --> AuthRouter
    RateLimitMW --> ConvRouter
    RateLimitMW --> ChatRouter
    RateLimitMW --> ModelRouter

    ConvRouter --> AuthDep
    ChatRouter --> AuthDep
    ModelRouter --> AuthDep

    %% Từ Router sang Service
    AuthRouter --> AuthService
    ConvRouter --> ConvService
    ChatRouter --> ConvService
    ChatRouter --> LangGraphEngine
    ModelRouter --> ModelManager

    %% Quản lý Model & Điều phối LangGraph
    ModelManager --> EnvLoader
    ModelManager --> LangChainAdapters
    ModelManager --> ModelRepo
    LangGraphEngine --> ModelManager
    EnvLoader --> LangGraphEngine
    LangGraphEngine --> LangChainAdapters
    LangGraphEngine --> MsgRepo

    %% Phối hợp Service & Data
    AuthService --> UserRepo
    ConvService --> ConvRepo
    ConvService --> MsgRepo

    %% Tầng Repo sang Database Session
    UserRepo --> DBSession
    ConvRepo --> DBSession
    MsgRepo --> DBSession
    ModelRepo --> DBSession
    DBSession -->|"Asyncpg TCP:5432"| Postgres
    RateLimitMW -->|"TCP:6379"| RedisStore

    %% Từ Provider Adapters ra ngoài Cloud
    LangChainAdapters -->|"Outbound HTTPS"| GeminiAPI
    LangChainAdapters -.->|"Failover Edge Outbound HTTPS"| OpenAIAPI
    LangChainAdapters -.->|"Outbound HTTPS / Local HTTP"| OtherLLMAPI

    style IngressLayer fill:#eff6ff,stroke:#3b82f6
    style BackendApp fill:#f8fafc,stroke:#334155,stroke-width:2px
    style APILayer fill:#f1f5f9,stroke:#64748b
    style ServiceLayer fill:#ecfdf5,stroke:#10b981
    style RepositoryLayer fill:#fffbeb,stroke:#f59e0b
    style InfrastructureStorage fill:#f0fdf4,stroke:#22c55e
    style ExternalLLM fill:#fefce8,stroke:#ca8a04
```
