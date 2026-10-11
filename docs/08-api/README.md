# HỢP ĐỒNG GIAO DIỆN LẬP TRÌNH ỨNG DỤNG (API SPECIFICATION & CONTRACTS)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

## 1. Mục Đích Giai Đoạn (Phase Objective)
Thư mục `docs/08-api/` chứa toàn bộ các hợp đồng giao tiếp API (**API Contracts**) chính thức của hệ thống **AI-Chan Assistant**, bao gồm đặc tả RESTful endpoints, giao thức streaming Server-Sent Events (SSE), tệp chuẩn máy đọc OpenAPI 3.1, và hợp đồng tích hợp với các dịch vụ AI bên ngoài:
```text
docs/07-domain/ (Mô hình miền DDD & Invariants)
          │
          ▼
docs/08-api/ (Hợp đồng API REST, SSE streaming, OpenAPI 3.1) ◄── GIAI ĐOẠN HIỆN TẠI
          │
          ▼
docs/09-behavior/ & docs/10-security/ (Hành vi tuần tự & An ninh ứng dụng)
```

---

## 2. Danh Mục Tài Liệu Giai Đoạn

| Tệp Tài Liệu | Nội Dung Trọng Tâm |
| :--- | :--- |
| **[api-specifications.md](file:///c:/Users/PC/Project/ai-chan/docs/08-api/api-specifications.md)** | Đặc tả chi tiết từng endpoint HTTP: Phương thức, Tham số, Headers, Request Body, Phản hồi thành công và Mã lỗi chuẩn. |
| **[openapi.yaml](file:///c:/Users/PC/Project/ai-chan/docs/08-api/openapi.yaml)** | Hợp đồng máy đọc OpenAPI 3.1.0 hoàn chỉnh mô tả toàn bộ API schema của hệ thống. |
| **[integration-contracts.md](file:///c:/Users/PC/Project/ai-chan/docs/08-api/integration-contracts.md)** | Hợp đồng tích hợp ngoại vi: Google Gemini API (Primary) và OpenAI API (Fallback). |
| **[traceability.md](file:///c:/Users/PC/Project/ai-chan/docs/08-api/traceability.md)** | Ma trận truy vết từ Yêu cầu chức năng / Ca sử dụng -> Endpoint API. |

---

## 3. Trạng Thái Cổng Kiểm Soát Chất Lượng
- **Quality Gate**: `READY_FOR_NEXT_PHASE` (Sẵn sàng làm đầu vào cho Phase 09 Behavior và Phase 10 Security).
