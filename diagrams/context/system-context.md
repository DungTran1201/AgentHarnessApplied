# Sơ Đồ Ngữ Cảnh Hệ Thống (System Context Diagram)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-CTX-001` |
| **Loại Sơ Đồ** | **System Context Diagram (C4 Context Level 1)** |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/05-system-analysis/system-context.md](file:///c:/Users/PC/Project/ai-chan/docs/05-system-analysis/system-context.md), [docs/06-architecture/sad.md](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/sad.md) |
| **Mục Đích** | Mô tả biên giới hệ thống AI-Chan, các tác nhân con người tương tác và các dịch vụ đám mây ngoại vi |

---

## 1. Biểu Đồ Ngữ Cảnh Mermaid

```mermaid
flowchart TD
    subgraph HumanActors ["TÁC NHÂN CON NGƯỜI (HUMAN ACTORS)"]
        Guest["Khách Vãng Lai<br/>[ACT-01: Guest]<br/>Truy cập trang công khai (/login, /register)"]
        User["Người Dùng Đã Xác Thực<br/>[ACT-02: Registered User]<br/>Trò chuyện, quản lý hội thoại, đổi tên, xóa"]
    end

    subgraph SystemBoundary ["BIÊN GIỚI HỆ THỐNG TRỢ LÝ ẢO AI-CHAN (IN-SCOPE)"]
        AI_System["Hệ Thống Web Chatbot AI-Chan<br/>[ai-chan Core Platform]<br/>- Giao diện người dùng Web (Next.js)<br/>- Cổng Ingress & Rate Limiter (Nginx)<br/>- Dịch vụ xác thực & Quản lý hội thoại (FastAPI)<br/>- Điều phối mô hình LLM & Failover<br/>- Cơ sở dữ liệu quan hệ (PostgreSQL) & Cache (Redis)"]
    end

    subgraph ExternalCloud ["DỊCH VỤ NGOÀI INTERNET (EXTERNAL CLOUD SERVICES)"]
        Gemini["Google Gemini API<br/>[EXT-01: Primary LLM Provider]<br/>gemini-2.5-flash / pro<br/>Streaming Inference (HTTPS)"]
        OpenAI["OpenAI API<br/>[EXT-02: Fallback LLM Provider]<br/>gpt-4o-mini / gpt-4o<br/>Dự phòng khi Gemini sự cố (HTTPS)"]
    end

    %% Inbound Interactions
    Guest -->|"1. Đăng ký tài khoản & Đăng nhập<br/>[HTTPS:443 / JSON]"| AI_System
    User -->|"2. Quản lý hội thoại & Gửi Prompt câu hỏi<br/>[HTTPS:443 / JSON]"| AI_System
    AI_System -->|"3. Truyền luồng phản hồi token thời gian thực<br/>[Server-Sent Events (SSE)]"| User

    %% Outbound Cloud Integrations
    AI_System -->|"4. Yêu cầu sinh văn bản chính (Primary Request)<br/>[Outbound HTTPS / REST Stream]"| Gemini
    AI_System -.->|"5. Tự động chuyển vùng dự phòng khi lỗi 429/5xx/timeout<br/>[Outbound HTTPS Failover]"| OpenAI

    style HumanActors fill:#eff6ff,stroke:#2563eb,stroke-width:1px
    style SystemBoundary fill:#f0fdf4,stroke:#16a34a,stroke-width:2px
    style ExternalCloud fill:#fefce8,stroke:#ca8a04,stroke-width:1px
```

---

## 2. Thuyết Minh Ranh Giới Kỹ Thuật

1. **Bên trong ranh giới (In-Scope)**:
   - Toàn bộ giao diện Web Chat (`ai-frontend`), API Gateway & Rate Limiter (`nginx-gateway`), Server nghiệp vụ (`ai-backend`), Database quan hệ (`postgres`) và Cache phiên (`redis`).
2. **Bên ngoài ranh giới (External)**:
   - Thiết bị và trình duyệt của người dùng (Edge Browser).
   - Nền tảng Google Gemini API và OpenAI API (Cloud PaaS/SaaS).
