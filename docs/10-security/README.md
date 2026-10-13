# TÀI LIỆU AN NINH & BẢO MẬT HỆ THỐNG (SECURITY SPECIFICATION & THREAT MODEL)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

## 1. Mục Đích Giai Đoạn (Phase Objective)
Thư mục `docs/10-security/` lưu trữ toàn bộ các hồ sơ đặc tả an toàn thông tin (**Security Specifications**), mô hình đe dọa STRIDE (**Threat Model**), các ranh giới tin cậy (Trust Boundaries) và danh mục các biện pháp kiểm soát an ninh (**Security Controls**):
```text
docs/09-behavior/ (Hành vi tuần tự & Máy trạng thái)
          │
          ▼
docs/10-security/ (Đặc tả an ninh, STRIDE Threat Model & Controls: CTRL-001..006) ◄── GIAI ĐOẠN HIỆN TẠI
          │
          ▼
docs/11-ux/ & docs/12-testing/ (Trải nghiệm người dùng & Kiểm thử phần mềm)
```

---

## 2. Danh Mục Tài Liệu Giai Đoạn

| Tệp Tài Liệu | Nội Dung Trọng Tâm |
| :--- | :--- |
| **[security-specification.md](file:///c:/Users/PC/Project/ai-chan/docs/10-security/security-specification.md)** | Đặc tả kiến trúc an ninh: Cơ chế băm bcrypt, HttpOnly Cookie, CORS, CSRF, Thẩm định dữ liệu đầu vào. |
| **[threat-model.md](file:///c:/Users/PC/Project/ai-chan/docs/10-security/threat-model.md)** | Mô hình đe dọa STRIDE (`THR-001` đến `THR-006`): Phân tích bề mặt tấn công, tác nhân đe dọa và mức độ rủi ro. |
| **[security-controls.md](file:///c:/Users/PC/Project/ai-chan/docs/10-security/security-controls.md)** | Danh mục 6 biện pháp kiểm soát an ninh kỹ thuật (`CTRL-001` đến `CTRL-006`) ứng phó trực tiếp với từng mối đe dọa. |
| **[traceability.md](file:///c:/Users/PC/Project/ai-chan/docs/10-security/traceability.md)** | Ma trận truy vết từ Yêu cầu an ninh (`SEC-###`) -> Mối đe dọa (`THR-###`) -> Kiểm soát (`CTRL-###`). |

---

## 3. Trạng Thái Cổng Kiểm Soát Chất Lượng
- **Quality Gate**: `READY_FOR_NEXT_PHASE` (Sẵn sàng làm đầu vào cho Phase 11 UX và Phase 12 Testing).
