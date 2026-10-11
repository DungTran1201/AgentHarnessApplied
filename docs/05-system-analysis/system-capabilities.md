# NĂNG LỰC HỆ THỐNG LOGIC (SYSTEM CAPABILITIES SPECIFICATION)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `SYS-CAP-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Mô hình hóa và phân loại các cụm năng lực xử lý kỹ thuật logic của hệ thống phục vụ cho các Ca sử dụng |

---

## 1. Bản Đồ Năng Lực Hệ Thống (System Capability Map)

```text
CỤM NĂNG LỰC HỆ THỐNG AI-CHAN
│
├── 1. Cụm Năng Lực Quản Lý Định Danh (Identity Capabilities)
│   ├── CAP-AUTH-01: Quản lý đăng ký tài khoản và mã hóa bảo mật (bcrypt)
│   ├── CAP-AUTH-02: Xác thực thông tin và quản lý phiên làm việc (JWT HttpOnly Cookie)
│   └── CAP-AUTH-03: Thu hồi phiên và kiểm soát trạng thái đăng xuất
│
├── 2. Cụm Năng Lực Quản Lý Hội Thoại (Conversation Capabilities)
│   ├── CAP-CONV-01: Khởi tạo không gian hội thoại độc lập
│   ├── CAP-CONV-02: Truy xuất và sắp xếp lịch sử hội thoại cá nhân
│   ├── CAP-CONV-03: Tự động và thủ công quản lý tiêu đề cuộc trò chuyện
│   └── CAP-CONV-04: Xóa bỏ dữ liệu hội thoại và quan hệ ràng buộc
│
├── 3. Cụm Năng Lực Đàm Thoại & Trình Diễn (Chat & Presentation Capabilities)
│   ├── CAP-CHAT-01: Tiếp nhận và thẩm định dữ liệu tin nhắn người dùng (<= 4,000 ký tự)
│   ├── CAP-CHAT-02: Truyền phát phản hồi thời gian thực qua Server-Sent Events (SSE)
│   ├── CAP-CHAT-03: Render định dạng Markdown chuẩn và syntax highlighting mã nguồn
│   └── CAP-CHAT-04: Quản lý và lưu trữ bền vững chuỗi hội thoại đa lượt
│
├── 4. Cụm Năng Lực Điều Phối Trí Tuệ Nhân Tạo (AI Orchestration Capabilities)
│   ├── CAP-AI-01: Đóng gói prompt và tích hợp Google Gemini API
│   ├── CAP-AI-02: Giám sát độ trễ (30s timeout) và tự động chuyển vùng dự phòng (OpenAI Failover)
│   └── CAP-AI-03: Hỗ trợ người dùng lựa chọn và chuyển đổi linh hoạt giữa các mô hình AI
│
└── 5. Cụm Năng Lực Bảo Vệ An Ninh & Hạ Tầng (Security & Protection Capabilities)
    ├── CAP-SEC-01: Kiểm soát tần suất lưu lượng 2 tầng (Ingress 10 r/s, Backend 60 r/min)
    └── CAP-SEC-02: Cách ly dữ liệu nhiều người dùng và triệt tiêu lỗ hổng IDOR
```

---

## 2. Đặc Tả Chi Tiết Các Cụm Năng Lực

| Mã Năng Lực | Tên Năng Lực Logic | Đầu Vào Kỹ Thuật | Đầu Ra Kỹ Thuật | Ràng Buộc Đảm Bảo |
| :--- | :--- | :--- | :--- | :--- |
| **`CAP-AUTH`** | Xác thực & Cấp phiên | Form credentials (email, pass) | JWT Cookie, Profile JSON | Không lộ plain password, Cookie an toàn (`SEC-004`). |
| **`CAP-CONV`** | Quản lý vòng đời hội thoại | `user_id`, `conversation_id`, `title` | Entity cuộc trò chuyện | Cách ly quyền sở hữu `BR-002`, Anti-IDOR. |
| **`CAP-CHAT`** | Đàm thoại trực tuyến | Nội dung text (1 - 4000 ký tự) | Chunks SSE, Markdown stream | Độ trễ bắt đầu stream < 2s (`NFR-003`). |
| **`CAP-AI`** | Điều phối AI đa nhà cung cấp | Prompt, Sliding context (20 msgs) | Async Token Generator | Ưu tiên Gemini, tự động failover sang OpenAI (`BR-005`). |
| **`CAP-SEC`** | Kiểm soát lưu lượng & bảo vệ | Inbound HTTP request | Phê duyệt hoặc HTTP 429 | Ingress 10 req/s, API 60 req/min (`BR-006`). |
