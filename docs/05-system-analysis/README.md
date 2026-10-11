# KHÔNG GIAN PHÂN TÍCH HỆ THỐNG (SYSTEM ANALYSIS SPACE)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

## 1. Mục Đích Của Giai Đoạn (Phase Objective)
Thư mục `docs/05-system-analysis/` là không gian tài liệu phân tích hệ thống (**System Analysis Space**) của dự án **AI-Chan Assistant**.

Giai đoạn này chuyển tiếp từ các Ca sử dụng (Use Cases) và Quy trình nghiệp vụ (Business Processes) sang các khái niệm vận hành và ranh giới hệ thống logic:
```text
docs/04-use-cases/ (Use Case Model & Specifications: UC-001..009)
          │
          ▼
docs/05-system-analysis/ (Ranh giới hệ thống, Ngữ cảnh hệ thống, Năng lực logic) ◄── GIAI ĐOẠN HIỆN TẠI
          │
          ▼
docs/06-architecture/ (Kiến trúc phần mềm SAD, C4 Models, ADRs)
```

### Nhiệm Vụ Trọng Tâm:
1. **Xác lập Ngữ cảnh Hệ thống (System Context)**: Định vị chính xác ranh giới giữa hệ thống AI-Chan, các tác nhân con người và các hệ thống bên ngoài.
2. **Hệ thống hóa Năng lực Hệ thống (System Capabilities)**: Ánh xạ từ các Use Case thành các năng lực xử lý kỹ thuật logic.
3. **Phân tích Hành vi Hệ thống (System Behavior Analysis)**: Phân tích cơ chế trao đổi đồng bộ/bất đồng bộ, luồng streaming Server-Sent Events, và quản lý ngữ cảnh đàm thoại.

---

## 2. Nguồn Sự Thật & Trật Tự Ưu Tiên
1. **Primary Input**: [docs/04-use-cases/](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/) và [docs/03-business-process/](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/).
2. **Secondary Input**: [docs/02-requirements/](file:///c:/Users/PC/Project/ai-chan/docs/02-requirements/) và [docs/01-planning/](file:///c:/Users/PC/Project/ai-chan/docs/01-planning/).

---

## 3. Danh Mục Tài Liệu Giai Đoạn

| Tệp Tài Liệu | Nội Dung Trọng Tâm |
| :--- | :--- |
| **[system-context.md](file:///c:/Users/PC/Project/ai-chan/docs/05-system-analysis/system-context.md)** | Ranh giới hệ thống, sơ đồ ngữ cảnh (System Context Diagram), các giao diện giao tiếp ngoại vi. |
| **[system-capabilities.md](file:///c:/Users/PC/Project/ai-chan/docs/05-system-analysis/system-capabilities.md)** | Đặc tả các cụm năng lực hệ thống cốt lõi và phụ trợ tương ứng với các phân hệ. |
| **[system-behavior-analysis.md](file:///c:/Users/PC/Project/ai-chan/docs/05-system-analysis/system-behavior-analysis.md)** | Phân tích cơ chế streaming SSE thời gian thực, quản lý ngữ cảnh trượt (Sliding Window), cơ chế tự phục hồi Failover. |
| **[traceability.md](file:///c:/Users/PC/Project/ai-chan/docs/05-system-analysis/traceability.md)** | Ma trận truy vết từ Yêu cầu -> Quy trình -> Use Case -> Năng lực Hệ thống. |

---

## 4. Trạng Thái Cổng Kiểm Soát Chất Lượng
- **Quality Gate**: `READY_FOR_NEXT_PHASE` (Sẵn sàng làm đầu vào cho Phase 06 Architecture).
