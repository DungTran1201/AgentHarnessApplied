# ĐỊNH NGHĨA SẴN SÀNG ĐỂ TRIỂN KHAI (DEFINITION OF READY - DoR)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `DOR-SPEC-001` |
| **Mục đích** | Bản giao kèo kỹ thuật (Planning Contract) xác định điều kiện tiên quyết để một Gói Công Việc (Work Package) hoặc Task được phép bắt đầu phát triển mã nguồn |
| **Nguyên tắc cốt lõi** | **TUYỆT ĐỐI CẤM AGENT CODING BẮT ĐẦU NẾU CHƯA ĐẠT DoR** |

---

## 1. Bản Giao Kèo Định Nghĩa Sẵn Sàng (DoR Contract Checklist)

Trước khi bất kỳ lập trình viên hay AI Agent nào bắt đầu thực hiện mã nguồn cho một Work Package, gói công việc đó **bắt buộc phải vượt qua toàn bộ 7 tiêu chí** dưới đây:

### 1.1 Tiêu Chí Yêu Cầu (Requirement Clarity)
- [x] **Yêu cầu đã tồn tại trong SRS**: Gói công việc phải truy vết được về ít nhất một mã Functional Requirement (`FR-###`), Non-Functional Requirement (`NFR-###`), hoặc Business Rule (`BR-###`) cụ thể.
- [x] **Không còn mơ hồ về phạm vi**: Mô tả luồng chính (Main Flow), luồng phụ (Alternative Flow) và luồng ngoại lệ (Exception Flow) đã rõ ràng.

### 1.2 Tiêu Chí Phụ Thuộc (Dependency Resolution)
- [x] **Các phụ thuộc cứng (Hard Dependencies) đã hoàn thành**: Toàn bộ các Work Package nằm trước trong chuỗi phụ thuộc (xem [build-order.md](file:///c:/Users/PC/Project/ai-chan/docs/01-planning/build-order.md)) phải ở trạng thái `DONE` và đã được nghiệm thu.
- [x] **Không bị phụ thuộc vòng (No Circular Dependencies)**: Không có mâu thuẫn về thứ tự thực thi.

### 1.3 Tiêu Chí Thiết Kế & Hợp Đồng Dữ Liệu (Design & Contract Baseline)
- [x] **Hợp đồng API đã chốt**: Nếu gói công việc liên quan đến Backend/Frontend API, endpoint tương ứng phải được mô tả chi tiết trong `docs/08-api/openapi.yaml` (bao gồm URL, phương thức HTTP, headers, body request, schema response và các mã lỗi 4xx/5xx).
- [x] **Lược đồ dữ liệu đã có**: Nếu liên quan đến lưu trữ, bảng và các trường dữ liệu bắt buộc đã được đặc tả trong `docs/05-domain/database-design.md`.

### 1.4 Tiêu Chí Nghiệm Thu (Acceptance Criteria Defined)
- [x] **Có tiêu chí nghiệm thu kiểm chứng được**: Phải có ít nhất một Acceptance Criteria (`AC-###`) định lượng được, không sử dụng các từ ngữ chung chung như "chạy nhanh", "giao diện đẹp".
- [x] **Xác định rõ phương pháp kiểm chứng**: Đã chỉ rõ cách thức kiểm tra (Unit test, Integration test, E2E test, hoặc kịch bản kiểm tra thủ công).

### 1.5 Tiêu Chí An Ninh & Ngoại Lệ (Security & Error Considerations)
- [x] **Đã xem xét rủi ro an ninh**: Rà soát các yếu tố bảo vệ API Key, kiểm soát quyền truy cập theo `user_id`, khử khuẩn dữ liệu đầu vào chống XSS/Injection.
- [x] **Đã định nghĩa các trường hợp lỗi**: Xác định rõ mã phản hồi và thông điệp người dùng khi hệ thống gặp lỗi (401, 403, 404, 429, 503).

### 1.6 Tiêu Chí Xử Lý Vấn Đề Mở (Open Questions Closed)
- [x] **Không còn câu hỏi mở nghiêm trọng**: Toàn bộ các thắc mắc nghiệp vụ cốt lõi liên quan đến task đã được giải đáp hoặc đã được chốt quyết định chính thức (`DECISION`), không dựa trên suy đoán ngầm.

### 1.7 Kế Hoạch Triển Khai Chi Tiết (Implementation Plan Approved)
- [x] **Đã chạy quy trình `/plan` của Antigravity**: Đối với mọi thay đổi mã nguồn từ mức rủi ro R2 trở lên, đã soạn thảo bản kế hoạch chi tiết `work-items/WI-*.md` và được con người (Human) phê duyệt.

---

## 2. Quy Tắc Ứng Xử Dành Cho Agent (Agent Behavioral Guardrail)

> [!CAUTION]
> **RÀNG BUỘC NGHIÊM NGẶT DÀNH CHO AGENT CODING:**
> Nếu một Work Package chưa tích đủ toàn bộ các điều kiện trên:
> 1. Agent **KHÔNG ĐƯỢC PHÉP** tạo file mã nguồn mới.
> 2. Agent **KHÔNG ĐƯỢC PHÉP** sửa đổi logic trong mã nguồn hiện có.
> 3. Agent phải báo cáo rõ ràng: *"Work Package [MÃ_WP] chưa đạt Definition of Ready do thiếu [ĐIỀU_KIỆN_THIẾU]. Yêu cầu hoàn tất thiết kế/giải quyết câu hỏi mở trước khi triển khai."*
