# SƠ ĐỒ CA SỬ DỤNG PHÂN HỆ ĐÀM THOẠI & AI (CHAT USE CASES)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

## 1. Sơ Đồ Ca Sử Dụng Đàm Thoại & Tương Tác Trí Tuệ Nhân Tạo

```mermaid
flowchart LR
    User(["Người Dùng Đã Xác Thực<br/>(ACT-02: User)"])

    subgraph ChatBoundary ["Phân Hệ Đàm Thoại & Trí Tuệ Nhân Tạo"]
        UC8(["UC-CHAT-001 [UC-008]<br/>Gửi Tin Nhắn & Tương Tác AI"])
        UC9(["UC-CHAT-002 [UC-009]<br/>Lựa Chọn Mô Hình AI"])
        UC6(["UC-CONV-003 [UC-006]<br/>Đổi Tên Cuộc Trò Chuyện"])
    end

    subgraph ExternalBoundary ["Dịch Vụ Đám Mây Ngoài"]
        ExtAI(["External AI Provider<br/>(Google Gemini / OpenAI)"])
    end

    User --> UC8
    User --> UC9

    UC9 -.->|<<extend>><br/>Trước khi gửi tin nhắn| UC8
    UC8 -.->|<<include>><br/>Tự động nếu là tin nhắn đầu (BR-004)| UC6

    UC8 --- ExtAI

    style ChatBoundary fill:#fff7ed,stroke:#f97316,stroke-width:2px
    style UC8 fill:#ffffff,stroke:#f97316
    style UC9 fill:#ffffff,stroke:#f97316
    style UC6 fill:#ffffff,stroke:#22c55e
    style User fill:#e2e8f0,stroke:#1e3a8a
    style ExtAI fill:#fef9c3,stroke:#ca8a04
```
