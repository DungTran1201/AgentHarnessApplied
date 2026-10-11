# SƠ ĐỒ CA SỬ DỤNG PHÂN HỆ QUẢN LÝ CUỘC TRÒ CHUYỆN (CONVERSATION USE CASES)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

## 1. Sơ Đồ Ca Sử Dụng Quản Lý Cuộc Trò Chuyện & Lịch Sử

```mermaid
flowchart LR
    User(["Người Dùng Đã Xác Thực<br/>(ACT-02: User)"])

    subgraph ConvBoundary ["Phân Hệ Quản Lý Cuộc Trò Chuyện (Ràng Buộc BR-002)"]
        UC4(["UC-CONV-001 [UC-004]<br/>Khởi Tạo Cuộc Trò Chuyện"])
        UC5(["UC-CONV-002 [UC-005]<br/>Xem Lịch Sử Hội Thoại"])
        UC6(["UC-CONV-003 [UC-006]<br/>Đổi Tên Cuộc Trò Chuyện"])
        UC7(["UC-CONV-004 [UC-007]<br/>Xóa Cuộc Trò Chuyện"])
    end

    User --> UC4
    User --> UC5
    User --> UC6
    User --> UC7

    UC4 ==>|Tạo thực thể mới| UC5
    UC5 -.->|Chọn để đổi tên| UC6
    UC5 -.->|Chọn để xóa| UC7

    style ConvBoundary fill:#f0fdf4,stroke:#22c55e,stroke-width:2px
    style UC4 fill:#ffffff,stroke:#22c55e
    style UC5 fill:#ffffff,stroke:#22c55e
    style UC6 fill:#ffffff,stroke:#22c55e
    style UC7 fill:#ffffff,stroke:#22c55e
    style User fill:#e2e8f0,stroke:#1e3a8a
```
