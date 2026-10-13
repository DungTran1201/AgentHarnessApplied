# TÀI LIỆU HÀNH VI TƯƠNG TÁC HỆ THỐNG (SYSTEM BEHAVIOR & INTERACTION)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

## 1. Mục Đích Giai Đoạn (Phase Objective)
Thư mục `docs/09-behavior/` lưu trữ các đặc tả về hành vi động (**Dynamic Behavior**) của hệ thống **AI-Chan Assistant**, bao gồm các sơ đồ tuần tự chi tiết (**Sequence Diagrams**) và các máy trạng thái hữu hạn (**State Machines**):
```text
docs/08-api/ (Hợp đồng API & Endpoints)
          │
          ▼
docs/09-behavior/ (Đặc tả hành vi tuần tự Sequence & Máy trạng thái State) ◄── GIAI ĐOẠN HIỆN TẠI
          │
          ▼
docs/10-security/ (Đặc tả an ninh, STRIDE Threat Model & Controls)
```

---

## 2. Danh Mục Tài Liệu Giai Đoạn

| Tệp Tài Liệu | Nội Dung Trọng Tâm |
| :--- | :--- |
| **[sequence-diagrams.md](file:///c:/Users/PC/Project/ai-chan/docs/09-behavior/sequence-diagrams.md)** | Các sơ đồ tuần tự chi tiết (`SEQ-001` đến `SEQ-004`) mô tả thông điệp trao đổi giữa các thành phần. |
| **[state-machines.md](file:///c:/Users/PC/Project/ai-chan/docs/09-behavior/state-machines.md)** | Mô hình máy trạng thái (`STATE-001` đến `STATE-003`) cho Hội thoại, Tin nhắn và Phiên làm việc. |
| **[traceability.md](file:///c:/Users/PC/Project/ai-chan/docs/09-behavior/traceability.md)** | Ma trận truy vết từ Yêu cầu / Use Case tới các kịch bản tuần tự và trạng thái. |

---

## 3. Trạng Thái Cổng Kiểm Soát Chất Lượng
- **Quality Gate**: `READY_FOR_NEXT_PHASE` (Sẵn sàng làm đầu vào cho Phase 10 Security).
