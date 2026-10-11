# TÀI LIỆU ĐẶC TẢ KIẾN TRÚC PHẦN MỀM (SOFTWARE ARCHITECTURE DOCUMENT - SAD)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `ARCH-SAD-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Mô tả kiến trúc tổng thể của hệ thống dựa trên mô hình C4 (Context, Container, Component), xác lập các nguyên tắc phân tầng và lựa chọn công nghệ cốt lõi |

---

## 1. Mục Tiêu Kiến Trúc & Nguyên Tắc Thiết Kế (Architectural Drivers)

1. **Hiệu Năng & Độ Trễ Thấp (Performance & Low Latency)**: Tối ưu hóa thời gian bắt đầu stream phản hồi dưới 2 giây (`NFR-003`) thông qua Server-Sent Events (SSE).
2. **Độ Sẵn Sàng & Tính Tự Phục Hồi (High Availability & Resilience)**: Không phụ thuộc vào một nhà cung cấp duy nhất; tự động chuyển vùng dự phòng (Failover) từ Google Gemini sang OpenAI (`BR-005`, `NFR-008`).
3. **Bảo Mật Phòng Thủ Theo Chiều Sâu (Defense in Depth)**: Kiểm soát tần suất 2 tầng (`BP-SEC-001`), băm mật khẩu bcrypt (`SEC-002`), bảo vệ phiên bằng HttpOnly Secure Cookie (`SEC-004`) và cách ly dữ liệu cá nhân triệt tiêu lỗ hổng IDOR (`BR-002`, `NFR-018`).
4. **Kiến Trúc Tối Giản & Dễ Vận Hành (Simplicity - Ponytail Senior Dev Mode)**: Cấu trúc 3 tầng (3-tier) containerized rõ ràng, không thêm thấu kính phức tạp khi chưa có yêu cầu; đóng gói hoàn chỉnh qua Docker Compose.

---

## 2. Mô Hình Kiến Trúc C4 — Cấp Độ 2: Container View

```mermaid
flowchart TD
    User["Người Dùng Trình Duyệt Web<br/>[ACT-01 / ACT-02]"]

    subgraph ContainerBoundary ["HẠ TẦNG CONTAINER DOCKER (AI-CHAN)"]
        Nginx["Container 1: Ingress Gateway (ai-infra)<br/>Nginx 1.25 Reverse Proxy<br/>- SSL Termination<br/>- Rate Limiter Layer 1 (10 req/s)<br/>- Static Proxy Routing"]
        
        Frontend["Container 2: Web Client (ai-frontend)<br/>Next.js 14 App Router, React, Tailwind<br/>- Quản lý giao diện, Auth State<br/>- SSE Streaming Reader<br/>- Markdown & Code Highlighter"]
        
        Backend["Container 3: Application Server (ai-backend)<br/>FastAPI, Python 3.11, Uvicorn<br/>- Auth & Session Service<br/>- Conversation Lifecycle Service<br/>- Rate Limiter Layer 2 (60 req/min)<br/>- LLM Multi-Provider Orchestrator"]
        
        Postgres[("Container 4: Primary Database<br/>PostgreSQL 16 Alpine<br/>- Lưu Users, Conversations, Messages<br/>- ACID Relational Transactions")]
        
        Redis[("Container 5: In-Memory Store<br/>Redis 7 Alpine<br/>- Sliding Window Rate Limiting Cache")]
    end

    subgraph ExternalCloud ["DỊCH VỤ NGOÀI INTERNET"]
        Gemini["Google Gemini API<br/>gemini-1.5-flash / pro"]
        OpenAI["OpenAI API<br/>gpt-4o-mini / gpt-4o"]
    end

    User -->|HTTPS:443| Nginx
    Nginx -->|HTTP:3000| Frontend
    Nginx -->|HTTP:8000| Backend
    Frontend -.->|Browser fetch / SSE| Nginx

    Backend -->|SQLAlchemy / Asyncpg:5432| Postgres
    Backend -->|Redis Protocol:6379| Redis
    Backend -->|HTTPS Outbound| Gemini
    Backend -.->|HTTPS Outbound Failover| OpenAI

    style ContainerBoundary fill:#f8fafc,stroke:#334155,stroke-width:2px
    style Nginx fill:#eff6ff,stroke:#3b82f6
    style Frontend fill:#eff6ff,stroke:#3b82f6
    style Backend fill:#eff6ff,stroke:#3b82f6
    style Postgres fill:#f0fdf4,stroke:#22c55e
    style Redis fill:#f0fdf4,stroke:#22c55e
    style ExternalCloud fill:#fef9c3,stroke:#ca8a04
```

---

## 3. Mô Hình Kiến Trúc C4 — Cấp Độ 3: Component View (ai-backend Core)

```mermaid
flowchart TD
    subgraph API_Layer ["1. TẦNG GIAO TIẾP & ĐIỀU PHỐI (ROUTERS & MIDDLEWARE)"]
        RateLimitMW["RateLimiter Middleware<br/>Kiểm tra 60 req/min/IP (BR-006)"]
        AuthDep["get_current_user Dependency<br/>Giải mã & kiểm tra JWT Cookie"]
        AuthRouter["Auth Router<br/>/api/v1/auth/*"]
        ConvRouter["Conversation Router<br/>/api/v1/conversations/*"]
        ChatRouter["Chat Streaming Router<br/>/api/v1/chat/*"]
        ModelRouter["Model Management Router<br/>/api/v1/models/* (ADR-006)"]
    end

    subgraph Service_Layer ["2. TẦNG NGHIỆP VỤ & ĐIỀU PHỐI AI (SERVICES & ORCHESTRATION)"]
        AuthService["AuthService<br/>Bcrypt hash, JWT signer"]
        ConvService["ConversationService<br/>Anti-IDOR logic, Auto-rename (BR-004)"]
        ModelService["AgentModelManager Service<br/>Catalog, Health Ping, Soft Toggle (BR-012, BR-013)"]
        EnvLoader["EnvKeyLoader<br/>Tải động API Key từ .env"]
        LangGraphAgent["LangGraph Agent Orchestrator<br/>StateGraph: Context -> Primary -> Failover (ADR-005)"]
        LangChainAdapters["LangChain Model Adapters<br/>ChatGoogleGenerativeAI, ChatOpenAI, ChatAnthropic..."]
    end

    subgraph Data_Layer ["3. TẦNG DỮ LIỆU & REPOSITORIES"]
        UserRepo["UserRepository"]
        ConvRepo["ConversationRepository"]
        MsgRepo["MessageRepository"]
        ModelRepo["AgentModelRepository<br/>Model status, is_default, metrics"]
        DBSession["SQLAlchemy AsyncSession"]
    end

    RateLimitMW --> AuthRouter
    RateLimitMW --> ConvRouter
    RateLimitMW --> ChatRouter
    RateLimitMW --> ModelRouter

    ConvRouter --> AuthDep
    ChatRouter --> AuthDep
    ModelRouter --> AuthDep

    AuthRouter --> AuthService
    ConvRouter --> ConvService
    ChatRouter --> ConvService
    ChatRouter --> LangGraphAgent
    ModelRouter --> ModelService

    ModelService --> EnvLoader
    ModelService --> LangChainAdapters
    ModelService --> ModelRepo
    LangGraphAgent --> ModelService

    EnvLoader --> LangGraphAgent
    LangGraphAgent --> LangChainAdapters

    AuthService --> UserRepo
    ConvService --> ConvRepo
    ConvService --> MsgRepo
    ChatRouter --> MsgRepo

    UserRepo --> DBSession
    ConvRepo --> DBSession
    MsgRepo --> DBSession
    ModelRepo --> DBSession
```

---

## 4. Công Nghệ Chủ Đạo & Cơ Sở Lựa Chọn (Technology Stack Rationale)

1. **Backend Core (FastAPI & Python 3.11)**: Hỗ trợ bất đồng bộ nguyên bản (`async/await`), tích hợp sẵn Pydantic tự động validate dữ liệu chặt chẽ và cơ chế `StreamingResponse` hỗ trợ SSE hoàn hảo.
2. **Frontend UI (Next.js 14 App Router & React)**: Server Components kết hợp Client Components tối ưu SEO và tốc độ tải trang; quản lý trạng thái mượt mà cho trải nghiệm Chatbot hiện đại.
3. **Database (PostgreSQL 16)**: Đảm bảo toàn vẹn giao dịch ACID, quan hệ chặt chẽ giữa User, Conversation và Message, hỗ trợ cascade delete đáng tin cậy.
4. **Ingress (Nginx 1.25)**: Reverse proxy tiêu chuẩn cao, cấu hình bảo vệ tải Layer 1 mạnh mẽ, xử lý SSL Termination an toàn.
5. **AI Agent Framework (LangChain & LangGraph - ADR-005)**: Chuẩn hóa điều phối Agent qua đồ thị trạng thái StateGraph có khả năng xử lý failover mượt mà, tải các adapter nhà cung cấp động dựa trên key cấu hình trong `.env`, hỗ trợ truyền luồng token thời gian thực qua SSE.
6. **Multi-Provider Agent Model Manager (ADR-006)**: Quản lý danh mục mô hình tập trung từ các nhà cung cấp bên ngoài (Google, Anthropic, OpenAI, Groq, Ollama), cung cấp cơ chế kiểm tra kết nối trực tiếp (Ping/Health Check), kích hoạt và hủy kích hoạt linh hoạt qua chính sách Soft State (không xóa cứng theo `BR-012`), và bảo toàn bất biến duy trì ít nhất một mô hình mặc định hoạt động (`BR-013`).

