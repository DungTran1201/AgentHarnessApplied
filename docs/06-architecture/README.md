# TÀI LIỆU KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE DOCUMENTATION)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

## 1. Mục Đích Giai Đoạn (Phase Objective)
Thư mục `docs/06-architecture/` lưu trữ tài liệu đặc tả kiến trúc phần mềm (**Software Architecture Document - SAD**) và hồ sơ các quyết định kiến trúc (**Architectural Decision Records - ADR**) của dự án **AI-Chan Assistant**.

Giai đoạn này xác lập các quyết định cấu trúc then chốt, chuyển hóa các Năng lực logic (System Capabilities) từ Phase 05 thành các khối thành phần kỹ thuật, giao thức và hạ tầng triển khai cụ thể:
```text
docs/05-system-analysis/ (Ranh giới hệ thống & Năng lực logic)
          │
          ▼
docs/06-architecture/ (Kiến trúc tổng thể SAD, C4 Models, ADRs, Deployment Concept) ◄── GIAI ĐOẠN HIỆN TẠI
          │
          ▼
docs/07-domain/ & docs/08-api/ (Mô hình miền & Hợp đồng giao tiếp API)
```

---

## 2. Danh Mục Tài Liệu Kiến Trúc

| Tệp Tài Liệu | Nội Dung Trọng Tâm |
| :--- | :--- |
| **[sad.md](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/sad.md)** | Tài liệu đặc tả kiến trúc phần mềm tổng thể: Mô hình C4 (Context, Container, Component), Công nghệ chủ đạo và Nguyên tắc thiết kế. |
| **[decisions.md](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/decisions.md)** | Bảng tổng hợp tóm tắt các quyết định kiến trúc chiến lược. |
| **[deployment-concept.md](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/deployment-concept.md)** | Khái niệm kiến trúc triển khai: Docker Compose 3-tier, ranh giới mạng nội bộ, quản lý cấu hình môi trường. |
| **[traceability.md](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/traceability.md)** | Ma trận truy vết từ Yêu cầu / Use Case tới các Thành phần kiến trúc. |
| **[ADR/](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/)** | Thư mục chứa các bản ghi quyết định kiến trúc chuẩn (`ADR-001` đến `ADR-004`). |

---

## 3. Trạng Thái Cổng Kiểm Soát Chất Lượng
- **Quality Gate**: `READY_FOR_NEXT_PHASE` (Sẵn sàng làm đầu vào cho Phase 07 Domain và Phase 08 API).
