# SƠ ĐỒ TỔNG QUAN CA SỬ DỤNG HỆ THỐNG (USE CASE OVERVIEW DIAGRAM)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

## 1. Sơ Đồ Toàn Cảnh Ca Sử Dụng (High-Level Use Case Map)

```mermaid
flowchart LR
    subgraph HumanActors ["TÁC NHÂN CON NGƯỜI"]
        Guest(["Khách Vãng Lai<br/>(ACT-01: Guest)"])
        User(["Người Dùng Đã Xác Thực<br/>(ACT-02: User)"])
    end

    subgraph SystemBoundary ["HỆ THỐNG WEBSITE CHATBOT AI-CHAN"]
        subgraph DomainAuth ["1. Xác Thực & Định Danh"]
            UC1["UC-AUTH-001 [UC-001]<br/>Đăng Ký Tài Khoản"]
            UC2["UC-AUTH-002 [UC-002]<br/>Đăng Nhập Hệ Thống"]
            UC3["UC-AUTH-003 [UC-003]<br/>Đăng Xuất Khỏi Hệ Thống"]
        end

        subgraph DomainConv ["2. Quản Lý Cuộc Trò Chuyện"]
            UC4["UC-CONV-001 [UC-004]<br/>Khởi Tạo Cuộc Trò Chuyện"]
            UC5["UC-CONV-002 [UC-005]<br/>Xem Lịch Sử Hội Thoại"]
            UC6["UC-CONV-003 [UC-006]<br/>Đổi Tên Cuộc Trò Chuyện"]
            UC7["UC-CONV-004 [UC-007]<br/>Xóa Cuộc Trò Chuyện"]
        end

        subgraph DomainChat ["3. Đàm Thoại & Trí Tuệ Nhân Tạo"]
            UC8["UC-CHAT-001 [UC-008]<br/>Gửi Tin Nhắn & Tương Tác AI"]
            UC9["UC-CHAT-002 [UC-009]<br/>Lựa Chọn Mô Hình AI"]
        end
    end

    subgraph ExternalActors ["DỊCH VỤ NGOÀI"]
        ExtAI(["Dịch Vụ AI Đám Mây<br/>(Gemini / OpenAI)"])
    end

    %% Actor to Use Cases
    Guest --> UC1
    Guest --> UC2

    User --> UC2
    User --> UC3
    User --> UC4
    User --> UC5
    User --> UC6
    User --> UC7
    User --> UC8
    User --> UC9

    %% Use Case to External
    UC8 --- ExtAI

    %% Relationships
    UC8 -.->|<<extend>>| UC9
    UC8 -.->|<<include>> (BR-004)| UC6

    style SystemBoundary fill:#f8fafc,stroke:#334155,stroke-width:2px
    style DomainAuth fill:#eff6ff,stroke:#3b82f6
    style DomainConv fill:#f0fdf4,stroke:#22c55e
    style DomainChat fill:#fff7ed,stroke:#f97316
    style Guest fill:#f1f5f9,stroke:#475569
    style User fill:#e2e8f0,stroke:#1e3a8a
    style ExtAI fill:#fef9c3,stroke:#ca8a04
```
