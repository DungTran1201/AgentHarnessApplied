# MÔ HÌNH MIỀN NGHIỆP VỤ (DOMAIN MODELING DOCUMENTATION)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

## 1. Mục Đích Giai Đoạn (Phase Objective)
Thư mục `docs/07-domain/` lưu trữ tài liệu đặc tả mô hình miền (**Domain Model**) theo tư duy Thiết kế Hướng Miền (Domain-Driven Design - DDD) của dự án **AI-Chan Assistant**.

Giai đoạn này xác lập ranh giới ngữ cảnh (Bounded Contexts), ngôn ngữ chung (Ubiquitous Language), các thực thể (Entities), đối tượng giá trị (Value Objects), cụm kết hợp (Aggregates) và các bất biến nghiệp vụ (Domain Invariants):
```text
docs/06-architecture/ (Kiến trúc tổng thể SAD & Quyết định ADR)
          │
          ▼
docs/07-domain/ (Mô hình miền DDD: Bounded Contexts, Entities, Aggregates) ◄── GIAI ĐOẠN HIỆN TẠI
          │
          ▼
docs/08-api/ & docs/09-behavior/ (Hợp đồng API & Hành vi tương tác)
```

---

## 2. Danh Mục Tài Liệu Giai Đoạn

| Tệp Tài Liệu | Nội Dung Trọng Tâm |
| :--- | :--- |
| **[domain-model.md](file:///c:/Users/PC/Project/ai-chan/docs/07-domain/domain-model.md)** | Bản đồ Bounded Contexts, Ngôn ngữ chung (Ubiquitous Language) và quan hệ giữa các miền con. |
| **[entities.md](file:///c:/Users/PC/Project/ai-chan/docs/07-domain/entities.md)** | Đặc tả các Thực thể (`User`, `Conversation`, `Message`) và Đối tượng giá trị (`EmailAddress`, `MessageContent`, v.v.). |
| **[aggregates.md](file:///c:/Users/PC/Project/ai-chan/docs/07-domain/aggregates.md)** | Ranh giới cụm kết hợp: `User Aggregate` và `Conversation Aggregate` (Root & Children). |
| **[domain-rules.md](file:///c:/Users/PC/Project/ai-chan/docs/07-domain/domain-rules.md)** | Các bất biến nghiệp vụ (Invariants) bảo đảm tính toàn vẹn của trạng thái miền. |
| **[traceability.md](file:///c:/Users/PC/Project/ai-chan/docs/07-domain/traceability.md)** | Ma trận truy vết từ Yêu cầu chức năng / Business Rules sang các phần tử miền. |

---

## 3. Trạng Thái Cổng Kiểm Soát Chất Lượng
- **Quality Gate**: `READY_FOR_NEXT_PHASE` (Sẵn sàng làm đầu vào cho Phase 08 API và Phase 09 Behavior).
