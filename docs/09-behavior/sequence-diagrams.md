# ĐẶC TẢ SƠ ĐỒ TUẦN TỰ HÀNH VI (SEQUENCE DIAGRAMS SPECIFICATION)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `BEH-SEQ-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Mô hình hóa chuỗi trao đổi thông điệp tuần tự giữa Client, Ingress, Backend, Database và AI Services |

---

## 1. SEQ-001: Luồng Đăng Ký Tài Khoản & Băm Mật Khẩu (Registration Flow)

```mermaid
sequenceDiagram
    autonumber
    actor Guest as ACT-01: Guest
    participant UI as Next.js Client
    participant Nginx as Nginx Gateway
    participant Backend as FastAPI Backend
    participant DB as PostgreSQL 16

    Guest->>UI: Điền Form đăng ký (email, password, full_name)
    UI->>Nginx: POST /api/v1/auth/register
    Nginx->>Backend: Proxy request
    Backend->>Backend: Pydantic validate schema
    Backend->>DB: SELECT id FROM users WHERE email = :email
    DB-->>Backend: None (Email chưa tồn tại)
    Backend->>Backend: bcrypt.hashpw(password)
    Backend->>DB: INSERT INTO users (id, email, hashed_password, status='ACTIVE')
    DB-->>Backend: Success
    Backend-->>Nginx: HTTP 201 Created (UserProfile)
    Nginx-->>UI: HTTP 201 Created
    UI-->>Guest: Thông báo thành công & chuyển sang /login
```

---

## 2. SEQ-002: Luồng Đăng Nhập & Thiết Lập HttpOnly Cookie (Login Flow)

```mermaid
sequenceDiagram
    autonumber
    actor User as ACT-01/02
    participant UI as Next.js Client
    participant Nginx as Nginx Gateway
    participant Backend as FastAPI Backend
    participant DB as PostgreSQL 16

    User->>UI: Nhập Email & Mật khẩu -> Bấm Login
    UI->>Nginx: POST /api/v1/auth/login
    Nginx->>Backend: Proxy request
    Backend->>DB: SELECT * FROM users WHERE email = :email
    DB-->>Backend: User record (kèm hashed_password, status)
    Backend->>Backend: bcrypt.checkpw(password, hashed_password)
    Backend->>Backend: Ký tạo JWT token (exp = 7 ngày, sub = user.id)
    Backend-->>Nginx: HTTP 200 OK + Set-Cookie: access_token=... (HttpOnly, Secure, SameSite=Lax)
    Nginx-->>UI: HTTP 200 OK + Set-Cookie
    UI->>UI: Lưu profile và cập nhật Auth State
    UI-->>User: Điều hướng vào giao diện /chat
```

---

## 3. SEQ-003: Luồng Gửi Tin Nhắn & Server-Sent Events Streaming (Chat SSE Flow)

```mermaid
sequenceDiagram
    autonumber
    actor User as ACT-02: User
    participant UI as Next.js Client
    participant Nginx as Nginx Gateway
    participant Backend as FastAPI Backend
    participant DB as PostgreSQL 16
    participant Agent as LangGraph Agent (ai-backend/llm)
    participant LLM as External LLM (Loaded via .env)

    User->>UI: Nhập prompt (<= 4000 chars) -> Nhấn Gửi
    UI->>UI: Render tin nhắn User ngay trên UI (Optimistic)
    UI->>Nginx: POST /api/v1/conversations/{id}/messages/stream (kèm Cookie)
    Nginx->>Backend: Proxy stream request
    Backend->>Backend: Verify JWT Cookie & conv_id ownership (BR-001, BR-002)
    Backend->>DB: INSERT INTO messages (role='user', content=prompt)
    Backend->>DB: SELECT * FROM messages WHERE conv_id = :id ORDER BY created_at DESC LIMIT 20
    DB-->>Backend: 20 tin nhắn gần nhất (Sliding context)
    Backend->>Agent: Kích hoạt LangGraph StateGraph (ContextNode, KeyLoader từ .env)
    Agent->>LLM: Gọi LangChain Model Adapter (ChatGoogleGenerativeAI / ChatOpenAI)
    Backend-->>Nginx: HTTP 200 OK + Content-Type: text/event-stream
    Nginx-->>UI: Thiết lập kết nối SSE
    
    loop Truyền nhận từng chunk token
        LLM-->>Agent: Chunk ("Xin", " chào", ...)
        Agent-->>Backend: Chuyển tiếp stream token
        Backend-->>Nginx: data: {"token": "...", "status": "streaming"}\n\n
        Nginx-->>UI: SSE chunk event
        UI->>UI: Hiển thị ký tự mới lên màn hình theo thời gian thực
    end

    LLM-->>Agent: Hoàn tất stream từ AI
    Agent-->>Backend: StateGraph hoàn tất (END)
    Backend->>DB: INSERT INTO messages (role='assistant', content=full_response)
    Backend-->>Nginx: data: {"status": "done"}\n\n
    Nginx-->>UI: SSE done event
    UI->>UI: Đóng stream, render Markdown & Code highlight
```

---

## 4. SEQ-004: Luồng Tự Động Chuyển Vùng Dự Phòng (LLM Failover Flow)

```mermaid
sequenceDiagram
    autonumber
    participant Backend as FastAPI Backend Router
    participant Graph as LangGraph StateGraph (ai-backend/llm)
    participant Gemini as Google Gemini (Primary via .env)
    participant OpenAI as OpenAI (Fallback via .env)

    Backend->>Graph: Khởi tạo luồng StateGraph với prompt & context
    Graph->>Graph: Node: PrimaryModelNode (ChatGoogleGenerativeAI)
    Graph->>Gemini: Gửi prompt stream
    
    alt Gemini lỗi 429 Quota Exceeded HOẶC Timeout 30s
        Gemini-->>Graph: HTTP 429 / Timeout exception
        Note over Graph: Kích hoạt Conditional Edge: Chuyển sang FallbackModelNode (ADR-005)
        Graph->>OpenAI: Gọi ChatOpenAI adapter với cùng State
        OpenAI-->>Graph: HTTP 200 OK + Token Chunks stream
        Graph-->>Backend: Stream chunks tiếp tục trong suốt
        Backend-->>Backend: Lưu kết quả Assistant với model_used tương ứng
    end
```

---

## 5. SEQ-005: Luồng Kiểm Tra Kết Nối, Kích Hoạt & Cấu Hình Mặc Định Model (Model Management Flow)

```mermaid
sequenceDiagram
    autonumber
    actor User as ACT-02: User / Admin
    participant UI as Next.js Client
    participant Router as Model Router (/api/v1/models)
    participant Mgr as AgentModelManager
    participant Env as EnvKeyLoader (.env)
    participant Adapter as LangChain Adapter
    participant Cloud as External AI Provider API
    participant DB as SQLite / PostgreSQL

    Note over User, Cloud: BƯỚC 1: KIỂM TRA KẾT NỐI (PING / HEALTH CHECK)
    User->>UI: Nhấn "Kiểm tra kết nối" (Ping) trên Model Card
    UI->>Router: POST /api/v1/models/{id}/test
    Router->>Mgr: test_model_connection(model_id)
    Mgr->>Env: get_config() kiểm tra API Key
    alt Thiếu API Key trong .env
        Env-->>Mgr: Key rỗng
        Mgr-->>Router: Error: Missing API Key
        Router-->>UI: HTTP 400 Bad Request ("Chưa cấu hình API Key trong .env")
    else Có API Key hợp lệ
        Mgr->>Adapter: Khởi tạo ChatModel (timeout=10s, max_tokens=5)
        Mgr->>Cloud: Gửi prompt test "ping"
        Cloud-->>Mgr: Phản hồi thành công (200 OK)
        Mgr->>Mgr: Đo thời gian latency_ms
        Mgr->>DB: UPDATE models SET latency_ms = :ms, last_checked_at = CURRENT_TIMESTAMP
        Mgr-->>Router: HealthResult(healthy=True, latency_ms=ms)
        Router-->>UI: HTTP 200 OK (Latency & Status Badge Xanh)
    end

    Note over User, Cloud: BƯỚC 2: KÍCH HOẠT MÔ HÌNH (ACTIVATE MODEL)
    User->>UI: Bật công tắc "Kích hoạt" (Activate)
    UI->>Router: PATCH /api/v1/models/{id}/activate
    Router->>Mgr: activate_model(model_id)
    Mgr->>Env: Kiểm tra API Key tồn tại (BR-014)
    Mgr->>DB: UPDATE models SET status = 'ACTIVE' WHERE id = :id
    DB-->>Mgr: Thành công
    Mgr-->>Router: Model activated
    Router-->>UI: HTTP 200 OK
    UI->>UI: Đưa model vào danh sách lựa chọn trên khung chat

    Note over User, Cloud: BƯỚC 3: THIẾT LẬP MÔ HÌNH MẶC ĐỊNH (SET DEFAULT)
    User->>UI: Bấm "Đặt làm mặc định"
    UI->>Router: PATCH /api/v1/models/default (body: {model_id})
    Router->>Mgr: set_default_model(model_id)
    Mgr->>DB: Kiểm tra model.status == 'ACTIVE' (BR-013)
    Mgr->>DB: UPDATE models SET is_default = (id == :model_id)
    DB-->>Mgr: Cập nhật thành công
    Mgr-->>Router: Default updated
    Router-->>UI: HTTP 200 OK (Hiển thị nhãn Mặc định)
```

---

## 6. SEQ-011: Luồng Quản Lý Cấu Hình & Điều Phối Đàm Thoại Bot Discord

```mermaid
sequenceDiagram
    autonumber
    actor User as ACT-02: User (Đã liên kết Discord)
    participant UI as Next.js Console (SCR-006)
    participant Router as Discord Bot Router (/bot/discord)
    participant Sec as Security Guard (SEC-013, CTRL-012)
    participant DiscordAPI as Discord API v10
    participant LLM as LLM Orchestrator
    participant DB as SQLite (configs, quotas, messages)

    Note over User, DB: PHẦN 1: KHÁM PHÁ MÁY CHỦ & LƯU CẤU HÌNH BOT (BP-BOT-001)
    User->>UI: Truy cập /bot/discord (SCR-006, UX-011)
    UI->>Router: GET /api/v1/bot/discord/guilds (OP-033) & GET /config (OP-031)
    Router->>Sec: Kiểm tra discord_id IS NOT NULL (BR-031)
    Sec-->>Router: Hợp lệ
    Router->>DiscordAPI: GET /users/@me/guilds
    DiscordAPI-->>Router: Guilds list
    Router->>Router: Lọc quyền bitwise (0x8 Administrator | 0x20 Manage Guild) (BR-034)
    Router-->>UI: HTTP 200 OK (Danh sách Guilds hợp lệ & Cấu hình hiện hành)
    UI-->>User: Hiển thị Guild Grid & Form cấu hình

    User->>UI: Chọn Guild, chọn Active Model, nhập Persona Prompt & Lưu
    UI->>Router: PUT /api/v1/bot/discord/config (OP-032)
    Router->>DB: Kiểm tra active_model_id có status == 'ACTIVE' (BR-033)
    alt Mô hình không ACTIVE
        Router-->>UI: HTTP 400 Bad Request ("Mô hình chỉ định không khả dụng")
    else Hợp lệ
        Router->>DB: UPSERT INTO discord_bot_configs (...)
        DB-->>Router: Success
        Router-->>UI: HTTP 200 OK (Config updated)
        UI-->>User: Toast thông báo lưu cấu hình thành công
    end

    Note over User, DB: PHẦN 2: ĐIỀU PHỐI TƯƠNG TÁC ĐÀM THOẠI & TRỪ HẠN NGẠCH (BP-BOT-002)
    User->>Router: POST /api/v1/bot/discord/test-dispatch (OP-034)
    Router->>Sec: Xác thực Header / Chữ ký số Ed25519 (SEC-013)
    Sec-->>Router: Chữ ký hợp lệ
    Router->>DB: Kiểm tra hạn ngạch user_quotas.used_tokens < total_limit (BR-032)
    alt Hết hạn ngạch
        Router-->>User: HTTP 429 Too Many Requests ("Hạn ngạch token đã cạn kiệt")
    else Còn hạn ngạch
        Router->>DB: Nạp active_model_id & persona prompt
        Router->>LLM: Gọi sinh phản hồi (System Prompt + User Query)
        LLM-->>Router: Câu trả lời AI + Số token tiêu thụ
        Router->>DB: UPDATE user_quotas (cộng dồn tokens nguyên tử) (BR-032)
        Router->>DB: INSERT INTO api_metric_logs (source='DISCORD_BOT')
        Router->>DB: INSERT INTO messages (source='DISCORD', sync Web history) (FR-047)
        Router-->>User: HTTP 200 OK (Phản hồi AI thành công <= 300ms) (NFR-025)
    end
```





