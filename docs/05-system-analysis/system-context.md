# NGỮ CẢNH HỆ THỐNG & RANH GIỚI HOẠT ĐỘNG (SYSTEM CONTEXT & BOUNDARY)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `SYS-CTX-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Định vị ranh giới hệ thống, các đối tượng bên ngoài và các giao thức kết nối ngoại vi |

---

## 1. Sơ Đồ Ngữ Cảnh Hệ Thống (System Context Diagram)

```mermaid
flowchart TD
    subgraph ExternalUsers ["TÁC NHÂN CON NGƯỜI (HUMAN ACTORS)"]
        Guest["Khách Vãng Lai<br/>(ACT-01: Guest)"]
        User["Người Dùng Đã Xác Thực<br/>(ACT-02: User)"]
    end

    subgraph SystemScope ["HỆ THỐNG TRỢ LÝ ẢO AI-CHAN (IN-SCOPE)"]
        AI_Chan_System["Hệ Thống Web Chatbot AI-Chan<br/>- Giao diện người dùng Web<br/>- API Gateway & Rate Limiter<br/>- Dịch vụ xác thực & Quản lý hội thoại<br/>- Bộ điều phối mô hình AI (Orchestrator)<br/>- Cơ sở dữ liệu lưu trữ bền vững"]
    end

    subgraph ExternalSystems ["DỊCH VỤ NGOÀI (EXTERNAL CLOUD SERVICES)"]
        GeminiAPI["Google Gemini API<br/>(Primary LLM Provider)"]
        OpenAIAPI["OpenAI API<br/>(Fallback LLM Provider)"]
    end

    %% Inbound Connections
    Guest -->|1. Đăng ký & Đăng nhập (HTTPS)| AI_Chan_System
    User -->|2. Quản lý hội thoại & Gửi câu hỏi (HTTPS / SSE)| AI_Chan_System

    %% Outbound Connections
    AI_Chan_System -->|3. Streaming Inference Request (HTTPS)| GeminiAPI
    AI_Chan_System -.->|4. Failover Streaming Request (HTTPS)| OpenAIAPI

    style SystemScope fill:#f0fdf4,stroke:#16a34a,stroke-width:2px
    style ExternalUsers fill:#eff6ff,stroke:#2563eb
    style ExternalSystems fill:#fefce8,stroke:#ca8a04
```

---

## 2. Phân Định Ranh Giới Hệ Thống (System Boundary Definition)

### 2.1 Thành Phần Nằm Trong Ranh Giới (Inside System Boundary)
- **Tầng Giao Diện Người Dùng (Presentation)**: Cung cấp giao diện web responsive, hỗ trợ render Markdown, tô màu mã nguồn, và tiếp nhận luồng dữ liệu thời gian thực (SSE).
- **Tầng Kiểm Soát Tải & An Ninh (Security & Ingress)**: Bảo vệ hệ thống bằng cơ chế kiểm soát tần suất 2 tầng (`BP-SEC-001`), xác thực JWT Cookie và cách ly dữ liệu (`BR-002`).
- **Tầng Xử Lý Nghiệp Vụ (Application Services)**: Quản lý người dùng, vòng đời hội thoại, và điều phối ngữ cảnh tin nhắn.
- **Tầng Điều Phối AI (LLM Orchestration)**: Đóng gói prompt, quản lý thời gian chờ 30s và kích hoạt chuyển vùng dự phòng tự động (`BR-005`).
- **Tầng Lưu Trữ (Persistence)**: Quản lý tính toàn vẹn và quan hệ dữ liệu trong PostgreSQL.

### 2.2 Thành Phần Nằm Ngoài Ranh Giới (Outside System Boundary)
- **Trình duyệt máy khách (Client Web Browser)**: Môi trường thực thi của người dùng con người.
- **Google Gemini API**: Đám mây trí tuệ nhân tạo của Google, được gọi qua giao thức HTTPS.
- **OpenAI API**: Đám mây trí tuệ nhân tạo của OpenAI, được gọi qua giao thức HTTPS.

---

## 3. Giao Diện Tương Tác Ngoại Vi (External Interfaces)

| Giao Diện Ngoại Vi | Hướng Truyền | Giao Thức / Định Dạng | Mô Tả & Vai Trò | Ràng Buộc / SLA |
| :--- | :--- | :--- | :--- | :--- |
| **Web Client Interface** | Inbound | HTTPS / JSON & Server-Sent Events (SSE) | Nhận yêu cầu từ người dùng và trả về dữ liệu token stream thời gian thực. | Rate Limit 10 r/s (Ingress), 60 r/min (API). Độ trễ < 2s (`NFR-003`). |
| **Google Gemini API** | Outbound | HTTPS / Streaming REST (Google GenAI) | Gửi prompt kèm lịch sử ngữ cảnh, nhận luồng token câu trả lời. | Timeout 30s (`NFR-008`). Chuyển vùng khi gặp lỗi 429 hoặc 5xx. |
| **OpenAI API** | Outbound | HTTPS / Streaming REST (OpenAI SDK) | Tiếp nhận yêu cầu dự phòng khi Gemini gặp sự cố (`BR-005`). | Kích hoạt trong suốt với người dùng. |
