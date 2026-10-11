# HỒ SƠ ĐẶC TẢ KỸ THUẬT TOÀN DIỆN: PHÂN HỆ QUẢN LÝ SYSTEM PROMPT (MVP)
## Master Documentation Index — System Prompt Management Feature Branch
### Hệ Thống: Nền Tảng Trợ Lý Ảo AI-Chan (AI-Chan Virtual Assistant Platform)

---

| Thông Tin Tổng Quan | Chi Tiết Kỹ Thuật |
| :--- | :--- |
| **Nhánh Tính Năng** | **Quản Lý System Prompt (System Prompt Management MVP)** |
| **Thư Mục Lưu Trữ** | `docs/features/system-prompt-management/` |
| **Trạng Thái Quản Trị** | **`PROPOSED (Chờ Phê Duyệt Từ Product Owner & Architecture Board)`** |
| **Phiên Bản Tài Liệu** | `1.0.0-MVP` |
| **Ngày Hoàn Thành** | `2026-10-11` |
| **Nhóm Phụ Trách** | Senior Business Analyst, Solution Architect, UX Designer, QA Lead & AppSec Reviewer |

---

## 1. Giới Thiệu Tổng Quan Phân Hệ (Executive Summary)

Phân hệ **Quản Lý System Prompt (System Prompt Management MVP)** là phân hệ quản trị tài nguyên cấu hình tập trung cho phép người dùng xây dựng, lưu trữ và quản lý một thư viện các chỉ dẫn hệ thống (System Instructions / Personas) nhằm định hướng phong cách và nguyên tắc hoạt động của mô hình AI:
- **Quản lý danh sách tập trung (`/prompts`):** Tìm kiếm tức thì theo tên/mô tả, sắp xếp linh hoạt, hiển thị thông tin tóm tắt độ dài ký tự và thời gian cập nhật, xử lý 6 trạng thái giao diện chuẩn mực (Loading, Populated, Empty, No-results, Error, Unauthorized).
- **Quản lý từng System Prompt:** Tạo mới, xem chi tiết, chỉnh sửa an toàn với độ dài lên tới 10.000 ký tự, bảo toàn 100% định dạng xuống dòng và ký tự Unicode tiếng Việt, cảnh báo dữ liệu chưa lưu khi rời trang (Dirty Form Guard), và xóa vĩnh viễn có hộp thoại xác nhận.
- **Ranh giới an toàn tuyệt đối:** Bản ghi chỉ lưu trữ và hiển thị văn bản thuần túy (Plain Text Data), vô hiệu hóa hoàn toàn nguy cơ Stored XSS; cưỡng chế kiểm tra quyền sở hữu (Anti-IDOR) trên 100% các thao tác; không log nội dung prompt nhạy cảm.

> [!NOTE]
> **Tuyên bố ranh giới phân hệ:** Trong phạm vi MVP, phân hệ chỉ tập trung vào việc quản lý tài nguyên System Prompt; **KHÔNG** gắn prompt vào Canvas Project Builder và **KHÔNG** can thiệp vào luồng chat runtime hiện hành.

---

## 2. Bản Đồ Mục Lục 11 Tài Liệu Kỹ Thuật (Master Documentation Map)

Hồ sơ phân hệ bao gồm 11 tài liệu chuyên sâu được liên kết truy vết khép kín:

| STT | Mã Tài Liệu | Tệp Tài Liệu Kỹ Thuật | Vai Trò & Nội Dung Trọng Tâm | Trạng Thái |
| :---: | :---: | :--- | :--- | :---: |
| **00** | `DOC-SPM-00` | [00-scope-assumptions-decisions.md](file:///c:/Users/PC/Project/ai-chan/docs/features/system-prompt-management/00-scope-assumptions-decisions.md) | Phạm vi MVP, hạng mục loại trừ, khảo sát codebase, bảng phân tích khoảng trống (Gap Analysis) và nhật ký quyết định (Decision Log). | **ĐÃ HOÀN TẤT** |
| **01** | `DOC-SPM-01` | [01-feature-inventory-and-traceability.md](file:///c:/Users/PC/Project/ai-chan/docs/features/system-prompt-management/01-feature-inventory-and-traceability.md) | Bảng kiểm kê 27 tính năng (`SPM-F-001..027`), phân quyền Actor, ma trận Must/Should/Later và Ma trận truy vết xuyên suốt (Traceability Matrix). | **ĐÃ HOÀN TẤT** |
| **02** | `DOC-SPM-02` | [02-srs-system-prompt-management.md](file:///c:/Users/PC/Project/ai-chan/docs/features/system-prompt-management/02-srs-system-prompt-management.md) | Đặc tả SRS: 16 FRs (`SPM-FR-xxx`), 13 NFRs (`SPM-NFR-xxx`), 10 Business Rules (`SPM-BR-xxx`) và các tiêu chí nghiệm thu kiểm thử được. | **ĐÃ HOÀN TẤT** |
| **03** | `DOC-SPM-03` | [03-use-cases-and-acceptance-criteria.md](file:///c:/Users/PC/Project/ai-chan/docs/features/system-prompt-management/03-use-cases-and-acceptance-criteria.md) | Đặc tả 7 Use Cases chi tiết (`UC-SPM-01..07`) với đầy đủ luồng chính (Happy Path), các luồng phụ, ngoại lệ lỗi và tiêu chí nghiệm thu. | **ĐÃ HOÀN TẤT** |
| **04** | `DOC-SPM-04` | [04-domain-model-and-data-dictionary.md](file:///c:/Users/PC/Project/ai-chan/docs/features/system-prompt-management/04-domain-model-and-data-dictionary.md) | Mô hình miền DDD, từ điển dữ liệu bảng `system_prompts`, chính sách duy nhất, bất biến và bản DDL Migration đề xuất (`009_...sql`). | **ĐÃ HOÀN TẤT** |
| **05** | `DOC-SPM-05` | [05-architecture-and-api-contract.md](file:///c:/Users/PC/Project/ai-chan/docs/features/system-prompt-management/05-architecture-and-api-contract.md) | Ranh giới kiến trúc 3 tầng, 6 hợp đồng API RESTful đề xuất (`GET`, `POST`, `PUT`, `DELETE`, `CLONE`), Pydantic v2 schemas và TypeScript interfaces. | **ĐÃ HOÀN TẤT** |
| **06** | `DOC-SPM-06` | [06-ux-ia-and-user-flows.md](file:///c:/Users/PC/Project/ai-chan/docs/features/system-prompt-management/06-ux-ia-and-user-flows.md) | Kiến trúc thông tin (IA), wireframe bố cục danh sách/form soạn thảo, xử lý 6 trạng thái giao diện, bộ đếm ký tự và 3 User Flows chính. | **ĐÃ HOÀN TẤT** |
| **07** | `DOC-SPM-07` | [07-mermaid-diagrams.md](file:///c:/Users/PC/Project/ai-chan/docs/features/system-prompt-management/07-mermaid-diagrams.md) | Tập hợp 12 biểu đồ Mermaid chuẩn hóa: Use Case, User Flow, Sequence CRUD, ERD, Component, Authorization, Security Data Flow, Form State. | **ĐÃ HOÀN TẤT** |
| **08** | `DOC-SPM-08` | [08-security-and-risk-review.md](file:///c:/Users/PC/Project/ai-chan/docs/features/system-prompt-management/08-security-and-risk-review.md) | Đánh giá an ninh ứng dụng: Phân tích đe dọa STRIDE (`THR-SPM-xxx`), 7 biện pháp kiểm soát (`CTRL-001..007`), chống IDOR/XSS/DoS và Safe Logging. | **ĐÃ HOÀN TẤT** |
| **09** | `DOC-SPM-09` | [09-test-plan-and-test-cases.md](file:///c:/Users/PC/Project/ai-chan/docs/features/system-prompt-management/09-test-plan-and-test-cases.md) | Chiến lược kim tự tháp kiểm thử 3 cấp độ, bộ 26 Test Cases chi tiết (`SPM-TC-001..026`) phân loại P0/P1/P2 bao quát toàn bộ ranh giới. | **ĐÃ HOÀN TẤT** |
| **10** | `DOC-SPM-10` | [10-open-questions-and-implementation-readiness.md](file:///c:/Users/PC/Project/ai-chan/docs/features/system-prompt-management/10-open-questions-and-implementation-readiness.md) | Bảng câu hỏi mở cần PO xác nhận (`OQ-SPM-01..04`), đánh giá Definition of Ready (DoR) và Definition of Done (DoD) cho hồ sơ tài liệu. | **ĐÃ HOÀN TẤT** |

---

## 3. Danh Mục 12 Sơ Đồ Mermaid Chuẩn Hóa (Master Diagram Registry)

Tất cả 12 sơ đồ kỹ thuật đã được tạo và kiểm tra cú pháp hợp lệ tại [07-mermaid-diagrams.md](file:///c:/Users/PC/Project/ai-chan/docs/features/system-prompt-management/07-mermaid-diagrams.md):

1. **Use Case Diagram** (`DIA-SPM-01`): Tác nhân và phạm vi các use case.
2. **IA / User Navigation Flow** (`DIA-SPM-02`): Luồng di chuyển giữa các màn hình và modal cảnh báo chưa lưu.
3. **Flowchart: Tải & Lọc Danh Sách** (`DIA-SPM-03`): Xử lý kết quả API và cơ chế tìm kiếm client-side.
4. **Sequence Diagram: Xem Danh Sách** (`DIA-SPM-04`): Tương tác giữa UI, API, Auth và CSDL.
5. **Sequence Diagram: Tạo Mới System Prompt** (`DIA-SPM-05`): Xác thực 2 lớp và xử lý trùng tên HTTP 409.
6. **Sequence Diagram: Chỉnh Sửa & Lưu Prompt** (`DIA-SPM-06`): Nạp dữ liệu cũ, kiểm tra IDOR và lưu đè.
7. **Sequence Diagram: Xóa System Prompt** (`DIA-SPM-07`): Xác nhận modal và xóa vĩnh viễn trong CSDL.
8. **ER Diagram / Domain Model** (`DIA-SPM-08`): Cấu trúc bảng `system_prompts` và quan hệ với `users`.
9. **Component & Architecture Diagram** (`DIA-SPM-09`): Phân tầng module Frontend, Backend và CSDL.
10. **Permission & Anti-IDOR Enforcement Flow** (`DIA-SPM-10`): Cơ chế kiểm tra quyền truy cập ở Backend.
11. **Security Data-Flow & Threat Defense** (`DIA-SPM-11`): Luồng bảo vệ dữ liệu chống XSS, DoS, Log Leakage và SQL Injection.
12. **Form State Lifecycle Diagram** (`DIA-SPM-12`): Máy trạng thái biểu mẫu và theo dõi cờ `isDirty`.

---

## 4. Cam Kết & Trạng Thái Sẵn Sàng (Implementation Readiness)

- **Trạng thái mã nguồn:** Toàn bộ công việc thực hiện trong nhiệm vụ này là **phân tích, đặc tả, nghiên cứu và tạo tài liệu/biểu đồ**. **KHÔNG CÓ BẤT KỲ DÒNG MÃ NGUỒN SẢN PHẨM HOẶC MIGRATION CSDL NÀO BỊ THAY ĐỔI**.
- **Mức độ sẵn sàng triển khai (DoR):** Đạt 100% tiêu chí Definition of Ready. Đội ngũ kỹ thuật có thể sử dụng bộ tài liệu này làm căn cứ triển khai chính xác ở giai đoạn tiếp theo.
