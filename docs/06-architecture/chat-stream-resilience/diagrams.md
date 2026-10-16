# HỆ THỐNG BIỂU ĐỒ KIẾN TRÚC (ARCHITECTURE DIAGRAMS)
## Trực Quan Hóa Luồng Gián Đoạn (As-Is) & Luồng Bền Vững (To-Be)
### Mã Tài Liệu: `DIAG-STREAM-RESILIENCE` | Phân Hệ: `ARCH-STREAM-RESILIENCE`

---

## 1. Biểu Đồ Sequence Luồng Hiện Tại Bị Lỗi (As-Is: Flawed Tightly-Coupled Flow)

Biểu đồ này mô tả chính xác lý do tại sao câu trả lời của mô hình AI bị biến mất khi người dùng chuyển sang chat khác trong mã nguồn hiện tại:

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng (Client)
    participant Page as ChatPage (Local React State)
    participant SSE as FastAPI SSE Generator
    participant Agent as LLM Agent (astream_agent)
    participant DB as SQLite DB (messages)

    User->>Page: 1. Nhập prompt & bấm Gửi (conv_A)
    Page->>DB: [POST /stream] Ghi tin nhắn User
    Page->>SSE: 2. Mở kết nối SSE Stream
    SSE->>Agent: 3. Bắt đầu sinh tokens (chunk 1..n)
    Agent-->>SSE: Trả về Token 1, 2, 3...
    SSE-->>Page: Stream chunk: "Xin chào..."
    Page->>Page: Render text tích lũy trên màn hình

    Note over User,Page: Người dùng lỡ tay bấm sang Chat B (conv_B)!
    User->>Page: 4. handleSelectConversation(conv_B)
    Page->>Page: 5. activeConvId đổi sang B -> Ghi đè messages = []
    Page--xSSE: 6. Đóng/Hủy kết nối HTTP SSE của conv_A (Socket Closed)

    Note over SSE,Agent: Uvicorn phát hiện Client Disconnect!
    SSE--xAgent: 7. Generator bị ngắt bởi asyncio.CancelledError
    
    Note over SSE,DB: ĐOẠN CODE LƯU DB NẰM SAU GENERATOR BỊ BỎ QUA!
    rect rgb(255, 200, 200)
        Note over SSE,DB: LỆNH "INSERT INTO messages (role='assistant')..." KHÔNG BAO GIỜ ĐƯỢC CHẠY!
    end

    User->>Page: 8. Người dùng bấm quay lại conv_A
    Page->>DB: 9. GET /conversations/conv_A/messages
    DB-->>Page: Chỉ có tin nhắn của User (KHÔNG CÓ TIN NHẮN ASSISTANT!)
    Page-->>User: 10. Màn hình rỗng, câu trả lời đã biến mất hoàn toàn!
```

---

## 2. Biểu Đồ Sequence Luồng Khắc Phục Bền Vững (To-Be: Resilient Decoupled Task)

Biểu đồ này mô tả cơ chế **Detached Background Task** và **Global Multi-Session Stream Store** bảo vệ toàn vẹn dữ liệu:

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng (Client)
    participant Store as Global Stream Store (Frontend)
    participant Page as Chat Workspace Viewport
    participant API as SSE Gateway (FastAPI)
    participant Worker as Detached Inference Worker (Task)
    participant Queue as Token Queue (asyncio.Queue)
    participant DB as SQLite DB (messages)

    User->>Page: 1. Nhập prompt & bấm Gửi (conv_A)
    Page->>Store: 2. startSession(conv_A)
    Store->>API: 3. POST /conversations/conv_A/messages/stream
    
    API->>DB: 4. INSERT User message & Assistant (status='STREAMING')
    API->>Worker: 5. asyncio.create_task(run_detached_inference_task)
    API->>Queue: Khởi tạo Token Queue
    
    par Luồng sinh suy luận ngầm độc lập
        Worker->>Worker: Gọi LLM sinh tokens
        Worker->>Queue: Đẩy chunk token vào Queue
    and Luồng truyền phát SSE về Client
        Queue->>API: Đọc chunk từ Queue
        API-->>Store: Stream chunk token qua SSE
        Store-->>Page: Cập nhật Viewport conv_A tức thì
    end

    Note over User,Page: Người dùng chuyển sang Chat B (conv_B)!
    User->>Page: 6. handleSelectConversation(conv_B)
    Page->>Page: 7. Viewport chuyển sang hiển thị conv_B
    Note over Store,API: Store tiếp tục giữ kết nối SSE của conv_A chạy ngầm!

    alt Trường hợp Client đóng Socket (hoặc Refresh trang)
        Store--xAPI: Client ngắt kết nối socket
        API->>API: SSE Dispatcher kết thúc nhẹ nhàng
        Note over Worker,DB: WORKER VẪN TIẾP TỤC CHẠY TRỌN VẸN TRONG NỀN!
        Worker->>Worker: LLM hoàn thành toàn bộ câu trả lời
        Worker->>DB: 8. COMMIT DB trong finally: UPDATE status='COMPLETED'
    end

    Note over User,Page: Người dùng bấm quay lại Chat A (conv_A)
    User->>Page: 9. handleSelectConversation(conv_A)
    alt Nếu stream vẫn đang chạy ngầm trong Store
        Store-->>Page: 10a. Hiển thị tức thì nội dung đang sinh tiếp tục
    else Nếu đã hoàn thành từ trước
        Page->>DB: 10b. GET /conversations/conv_A/messages
        DB-->>Page: Trả về câu trả lời hoàn chỉnh (status='COMPLETED')
        Page-->>User: Hiển thị đầy đủ 100% nội dung câu trả lời!
    end
```

---

## 3. Biểu Đồ Trạng Thái Tin Nhắn & Task Suy Luận (State Machine Diagram)

```mermaid
stateDiagram-v2
    [*] --> PENDING: Khởi tạo yêu cầu gửi tin nhắn
    PENDING --> STREAMING: Backend tạo Detached Task & phát sinh token đầu tiên
    
    state STREAMING {
        [*] --> ReceivingTokens: LLM đang sinh các đoạn token
        ReceivingTokens --> ReceivingTokens: Nạp token vào Queue & Buffer
    }

    STREAMING --> COMPLETED: LLM hoàn tất sinh câu trả lời (Commit vào SQLite DB)
    STREAMING --> ABORTED: Người dùng bấm nút "Stop Generation" có chủ đích
    STREAMING --> ERROR: Lỗi mạng từ AI Provider / Quota Exceeded

    COMPLETED --> [*]
    ABORTED --> [*]: Lưu đoạn văn bản đã sinh đến thời điểm Stop
    ERROR --> [*]: Ghi log lỗi & thông báo cho người dùng
```

---

## 4. Biểu Đồ Thành Phần Kiến Trúc (Component Architecture Diagram)

```mermaid
graph TB
    subgraph Frontend ["Frontend Tier (Next.js 14 / TypeScript)"]
        UI["ChatWorkspace UI"]
        Sidebar["Sidebar Navigation"]
        GStore["Global Stream Session Store<br/>Record&lt;conv_id, StreamSession&gt;"]
        
        Sidebar -->|Select Conv| UI
        UI <-->|Active Viewport| GStore
    end

    subgraph Backend ["Backend Tier (FastAPI Engine)"]
        SSEGate["SSE Gateway Dispatcher<br/>/conversations/{id}/messages/stream"]
        TaskPool["Detached Inference Pool<br/>asyncio.create_task"]
        TokenQueue["Async Queue Registry<br/>asyncio.Queue per conv"]
        StopHandler["Stop Controller<br/>POST /messages/stop"]
    end

    subgraph LLM ["AI Providers"]
        Gemini["Google Gemini API"]
        OpenAI["OpenAI GPT API"]
    end

    subgraph Storage ["Persistence Tier"]
        DB[(SQLite app.db<br/>bảng messages / attachments)]
    end

    GStore <==>|HTTP SSE Connections| SSEGate
    GStore -->|Explicit Abort| StopHandler
    StopHandler -->|Cancel Task| TaskPool

    SSEGate <-->|Consumer Read| TokenQueue
    TaskPool -->|Producer Put| TokenQueue
    TaskPool <==>|Stream Call| LLM
    TaskPool ==>>|Guaranteed Finally Commit| DB
    UI -->|Fetch History| DB
```
