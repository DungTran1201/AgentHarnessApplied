# MÔ HÌNH MIỀN & RANH GIỚI NGỮ CẢNH (DOMAIN MODEL & BOUNDED CONTEXTS)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `DOM-MODEL-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Phân định ranh giới ngữ cảnh miền (Bounded Contexts) và thiết lập Ngôn ngữ chung (Ubiquitous Language) của hệ thống |

---

## 1. Bản Đồ Ngữ Cảnh Miền (Bounded Context Map)

```mermaid
flowchart LR
    subgraph Context_Identity ["1. NGỮ CẢNH ĐỊNH DANH (IDENTITY CONTEXT)"]
        UserEntity["Thực thể: User<br/>- id (UUID)<br/>- email (EmailAddress)<br/>- full_name<br/>- status: ACTIVE / DISABLED"]
    end

    subgraph Context_Conversation ["2. NGỮ CẢNH HỘI THOẠI (CONVERSATION CONTEXT)"]
        ConvEntity["Thực thể Gốc: Conversation<br/>- id (UUID)<br/>- user_id (Tham chiếu)<br/>- title: ConversationTitle<br/>- created_at, updated_at"]
    end

    subgraph Context_Chat ["3. NGỮ CẢNH ĐÀM THOẠI & AI (CHAT CONTEXT)"]
        MsgEntity["Thực thể: Message<br/>- id (UUID)<br/>- conversation_id (Tham chiếu)<br/>- role: USER / ASSISTANT<br/>- content: MessageContent<br/>- model_used: ModelIdentifier"]
    end

    subgraph Context_Model ["4. NGỮ CẢNH QUẢN LÝ AGENT & MODEL (MODEL MANAGEMENT CONTEXT)"]
        ModelEntity["Thực thể Gốc: AgentModel<br/>- id (ModelId)<br/>- name (DisplayName)<br/>- provider: ProviderEnum<br/>- status: ACTIVE / INACTIVE / DEGRADED<br/>- is_default: Boolean<br/>- context_window, max_tokens<br/>- latency_ms, last_checked_at"]
    end

    %% Context Relationships
    Context_Identity -->|Upstream / Cung cấp user_id| Context_Conversation
    Context_Conversation -->|Upstream / Cung cấp conv_id & Quản lý vòng đời| Context_Chat
    Context_Model -->|Upstream / Cung cấp model_id hợp lệ & Kiểm tra trạng thái| Context_Chat

    style Context_Identity fill:#eff6ff,stroke:#2563eb,stroke-width:2px
    style Context_Conversation fill:#f0fdf4,stroke:#16a34a,stroke-width:2px
    style Context_Chat fill:#fff7ed,stroke:#ea580c,stroke-width:2px
    style Context_Model fill:#fdf4ff,stroke:#c026d3,stroke-width:2px
```

---

## 2. Ngôn Ngữ Chung Của Miền (Ubiquitous Language)

| Thuật Ngữ Nghiệp Vụ | Định Nghĩa Trong Ngữ Cảnh Hệ Thống | Phạm Vi Sử Dụng |
| :--- | :--- | :--- |
| **User (Người Dùng)** | Chủ thể tài khoản định danh cá nhân có quyền sở hữu các phiên trò chuyện. | Identity Context, Security |
| **Conversation (Cuộc Trò Chuyện)** | Một không gian ngữ cảnh đàm thoại độc lập gắn liền với một người dùng xác định (`BR-002`). | Conversation Context |
| **Message (Tin Nhắn)** | Một lượt trao đổi văn bản đơn lẻ bên trong cuộc trò chuyện, mang vai trò người gửi (`user`) hoặc trợ lý ảo (`assistant`). | Chat Context |
| **Prompt** | Đoạn văn bản câu hỏi hoặc yêu cầu do người dùng đưa vào để mô hình AI xử lý. | Chat Context |
| **Token Stream** | Luồng các mảnh văn bản (tokens) được mô hình AI sinh ra và truyền phát dần theo thời gian thực. | Chat & Inference Context |
| **Failover (Chuyển Vùng)** | Hành vi tự động chuyển đổi nhà cung cấp từ Google Gemini sang OpenAI/Anthropic khi có lỗi phát sinh (`BR-005`). | Inference Context |
| **Anti-IDOR Policy** | Quy tắc bất biến cấm người dùng truy cập hoặc thao tác lên cuộc trò chuyện của tài khoản khác (`BR-002`). | Cross-Cutting Rule |
| **Agent Model** | Thực thể mô hình AI từ các nhà cung cấp ngoài (Google, Anthropic, OpenAI, Groq, Ollama), quản trị qua vòng đời trạng thái (`ADR-006`). | Model Management Context |
| **Soft Toggle (Bật / Tắt Mềm)** | Hành vi kích hoạt hoặc hủy kích hoạt mô hình (`ACTIVE` <-> `INACTIVE`) mà tuyệt đối không xóa cứng khỏi CSDL (`BR-012`). | Model Management Context |
| **Default Model Invariant** | Quy tắc bất biến bảo đảm hệ thống luôn duy trì chính xác 1 mô hình `ACTIVE` mang cờ mặc định (`BR-013`). | Model Management Context |

