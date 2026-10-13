# HỒ SƠ ĐẶC TẢ KỸ THUẬT TOÀN DIỆN: PHÂN HỆ QUẢN LÝ PROJECT (MVP)
## Master Documentation Index — Project Management Feature Branch
### Hệ Thống: Nền Tảng Trợ Lý Ảo AI-Chan (AI-Chan Virtual Assistant Platform)

---

| Thông Tin Tổng Quan | Chi Tiết Kỹ Thuật |
| :--- | :--- |
| **Nhánh Tính Năng** | **Quản Lý Project (Project Management MVP)** |
| **Thư Mục Lưu Trữ** | `docs/features/project-management/` |
| **Trạng Thái Quản Trị** | **`PROPOSED (Chờ Phê Duyệt Từ Product Owner & Solution Architect)`** |
| **Phiên Bản Tài Liệu** | `1.0.0-MVP` |
| **Ngày Hoàn Thành** | `2026-10-11` |
| **Nhóm Phụ Trách** | Senior Business Analyst, Solution Architect, UX Designer, QA Lead & AppSec Reviewer |

---

## 1. Giới Thiệu Tổng Quan Phân Hệ (Executive Summary)

Phân hệ **Quản Lý Project (Project Management MVP)** là tính năng cốt lõi cho phép người dùng xây dựng, điều phối và vận hành các mô hình trí tuệ nhân tạo dưới dạng các luồng xử lý đồ họa trực quan (Visual Node-Based Workflows):
- **Giao diện Canvas kéo-thả hiện đại**: Người dùng kéo các khối thành phần (**Web Input Node**, **Model Node**, **Output Node**) vào Canvas và kết nối theo luồng tuyến tính chuẩn.
- **Quản trị vòng đời & hạn ngạch**: Quản lý 3 trạng thái nghiệp vụ rõ ràng (`ACTIVE`, `STOP`, `DEACTIVE`), tự động kiểm tra tính hợp lệ của đồ thị và kiểm soát hạn ngạch dự án hoạt động đồng thời (`MAX_ACTIVE_PROJECTS`).
- **Thực thi Chat từ Trang Chủ**: Người dùng chọn một Project đang `active` ngay tại Trang Chủ để tiến hành hội thoại với phản hồi dòng chảy SSE theo thời gian thực.

---

## 2. Bản Đồ Mục Lục 11 Tài Liệu Kỹ Thuật (Feature Documentation Map)

Toàn bộ hồ sơ phân hệ được tổ chức thành 11 tài liệu kỹ thuật có tính liên kết chặt chẽ và truy vết 2 chiều:

| STT | Mã Tài Liệu | Tệp Tài Liệu Kỹ Thuật | Vai Trò & Nội Dung Trọng Tâm | Trạng Thái |
| :---: | :---: | :--- | :--- | :---: |
| **00** | `DOC-PRJ-00` | [00-scope-assumptions-decisions.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-management/00-scope-assumptions-decisions.md) | Phạm vi MVP, hạng mục loại trừ, thuật ngữ phổ quát, giả định kiểm soát và nhật ký quyết định (Decision Log). | **ĐÃ HOÀN TẤT** |
| **01** | `DOC-PRJ-01` | [01-feature-inventory-and-traceability.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-management/01-feature-inventory-and-traceability.md) | Bảng kiểm kê 23 tính năng (`PRJ-F-001..023`), phân quyền Actor, ma trận Must/Should và ma trận truy vết khép kín. | **ĐÃ HOÀN TẤT** |
| **02** | `DOC-PRJ-02` | [02-srs-project-management.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-management/02-srs-project-management.md) | Đặc tả SRS: 23 FRs, 8 NFRs, 15 Business Rules (`PRJ-BR-xxx`), 9 Use Cases chi tiết và 8 Acceptance Criteria đo lường được. | **ĐÃ HOÀN TẤT** |
| **03** | `DOC-PRJ-03` | [03-domain-data-model.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-management/03-domain-data-model.md) | Mô hình miền DDD, thiết kế schema bảng `projects`, quan hệ ERD, JSON Schema cho đồ thị `graph_data` và phân vùng nhạy cảm. | **ĐÃ HOÀN TẤT** |
| **04** | `DOC-PRJ-04` | [04-architecture-and-api-contract.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-management/04-architecture-and-api-contract.md) | Kiến trúc hệ thống, phân rã trách nhiệm thành phần, sơ đồ System Context, sơ đồ Sequence lưu/chat và 13 hợp đồng API REST. | **ĐÃ HOÀN TẤT** |
| **05** | `DOC-PRJ-05` | [05-project-state-and-graph-validation.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-management/05-project-state-and-graph-validation.md) | Máy trạng thái vòng đời (`PRJ-DIAG-STATE-001`), sơ đồ xử lý Race Condition hạn ngạch, ma trận quy tắc bắt lỗi đồ thị và sơ đồ quyết định validation. | **ĐÃ HOÀN TẤT** |
| **06** | `DOC-PRJ-06` | [06-ux-information-architecture.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-management/06-ux-information-architecture.md) | Bản đồ kiến trúc thông tin, định hướng thẩm mỹ Dark Glassmorphism / Cyberpunk, wireframe bố cục, trạng thái UI và phím tắt trợ năng. | **ĐÃ HOÀN TẤT** |
| **07** | `DOC-PRJ-07` | [07-security-risk-review.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-management/07-security-risk-review.md) | Rà soát an ninh STRIDE (`PRJ-THR-xxx`), biện pháp kiểm soát (`PRJ-CTRL-xxx`), tuyên bố SSRF không áp dụng, bảo mật API Key và Risk Register. | **ĐÃ HOÀN TẤT** |
| **08** | `DOC-PRJ-08` | [08-test-plan-and-test-cases.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-management/08-test-plan-and-test-cases.md) | Chiến lược kim tự tháp kiểm thử, bộ 25 Test Cases chi tiết (`PRJ-TC-001..025`) bao quát happy path, validation, concurrency, word limit và IDOR. | **ĐÃ HOÀN TẤT** |
| **09** | `DOC-PRJ-09` | [09-openapi-or-api-examples.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-management/09-openapi-or-api-examples.md) | Mẫu chuẩn tải trọng giao tiếp HTTP REST và SSE Stream, cấu trúc lỗi chuẩn hóa, ví dụ cụ thể cho toàn bộ các endpoint CRUD và Chat. | **ĐÃ HOÀN TẤT** |
| **10** | `DOC-PRJ-10` | [10-implementation-readiness.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-management/10-implementation-readiness.md) | Đánh giá Definition of Ready (DoR), Definition of Done (DoD), so sánh thư viện `@xyflow/react`, kế hoạch Rollout/Demo và Decision Backlog. | **ĐÃ HOÀN TẤT** |

---

## 3. Danh Mục 10 Sơ Đồ Trực Quan Kỹ Thuật Mermaid (Master Diagram Registry)

Tất cả 10 sơ đồ bắt buộc đã được tạo và kiểm tra cú pháp chính xác, được nhúng trực tiếp trong các tài liệu tương ứng:

1. **System Context Diagram** (`PRJ-DIAG-CTX-001`): Xem tại [04-architecture-and-api-contract.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-management/04-architecture-and-api-contract.md#1-sơ-đồ-ngữ-cảnh-hệ-thống-system-context-diagram---prj-diag-ctx-001).
2. **Use Case Diagram** (`PRJ-DIAG-UC-001`): Xem tại [02-srs-project-management.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-management/02-srs-project-management.md#41-use-case-diagram-prj-diag-uc-001).
3. **End-to-End User Flow / Swimlane** (`PRJ-DIAG-SWIM-001`): Xem tại [02-srs-project-management.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-management/02-srs-project-management.md#42-end-to-end-user-flow--swimlane-diagram-prj-diag-swim-001).
4. **Sequence Diagram: Create/Edit/Save Project** (`PRJ-DIAG-SEQ-001`): Xem tại [04-architecture-and-api-contract.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-management/04-architecture-and-api-contract.md#31-sơ-đồ-tuần-tự-tạo-mới-chỉnh-sửa--lưu-graph-prj-diag-seq-001).
5. **Sequence Diagram: Activate Project with Active Limit** (`PRJ-DIAG-SEQ-002`): Xem tại [05-project-state-and-graph-validation.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-management/05-project-state-and-graph-validation.md#3-sơ-đồ-kích-hoạt-an-toàn-hạn-ngạch--chống-race-condition-prj-diag-seq-002).
6. **State Diagram: Project Lifecycle** (`PRJ-DIAG-STATE-001`): Xem tại [05-project-state-and-graph-validation.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-management/05-project-state-and-graph-validation.md#1-sơ-đồ-máy-trạng-thái-vòng-đời-project-state-diagram---prj-diag-state-001).
7. **Graph/Workflow Diagram (Standard & Invalid)** (`PRJ-DIAG-WF-001`): Xem tại [05-project-state-and-graph-validation.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-management/05-project-state-and-graph-validation.md#4-cấu-trúc-graph-chuẩn--các-trường-hợp-không-hợp-lệ-prj-diag-wf-001).
8. **Sequence Diagram: Chat Through Active Project** (`PRJ-DIAG-SEQ-003`): Xem tại [04-architecture-and-api-contract.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-management/04-architecture-and-api-contract.md#32-sơ-đồ-tuần-tự-thực-thi-chat-qua-project-đang-active-prj-diag-seq-003).
9. **ER Diagram / Domain Model** (`PRJ-DIAG-ERD-001`): Xem tại [03-domain-data-model.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-management/03-domain-data-model.md#2-sơ-đồ-thực-thể-quan-hệ-erd--class-diagram-prj-diag-erd-001).
10. **Validation Decision Flow** (`PRJ-DIAG-FLOW-001`): Xem tại [05-project-state-and-graph-validation.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-management/05-project-state-and-graph-validation.md#5-quy-trình-quyết-định-kiểm-tra-tính-hợp-lệ-validation-decision-flow---prj-diag-flow-001).

---

## 4. Bảng Tự Đánh Giá Tuân Thủ Tiêu Chuẩn (Compliance Audit Checklist)

| Nhóm Kiểm Tra | Tiêu Chí Kiểm Tra | Kết Quả | Minh Chứng |
| :--- | :--- | :---: | :--- |
| **Business / BA** | Có phạm vi, out-of-scope, actor, thuật ngữ phổ quát | **PASS** | `00-scope-assumptions-decisions.md` & `01-feature-inventory-and-traceability.md` |
| **Business / BA** | Đầy đủ Use Cases từ tạo, kéo node, lưu, đổi trạng thái, quota, chat | **PASS** | `02-srs-project-management.md` (9 ca sử dụng chi tiết) |
| **Business / BA** | Phân biệt rõ ngữ nghĩa `active`, `stop`, `deactive` | **PASS** | `05-project-state-and-graph-validation.md` (Mục 1 & 2) |
| **Business / BA** | Quy tắc giới hạn hạn ngạch và xử lý tranh chấp Concurrency an toàn | **PASS** | `05-project-state-and-graph-validation.md` (Mục 3) |
| **Visual Builder / UX** | Thao tác kéo-thả, bảng cấu hình Drawer, kết nối dây | **PASS** | `06-ux-information-architecture.md` (Mục 3.2 Wireframe) |
| **Visual Builder / UX** | Graph chỉ gồm Web Input → Model → Output, không chứa node ngoài | **PASS** | `00-scope-assumptions-decisions.md` & `05-project-state-and-graph-validation.md` |
| **Visual Builder / UX** | Định hướng phong cách riêng Dark Glassmorphism, không clone n8n | **PASS** | `06-ux-information-architecture.md` (Mục 2) |
| **Architecture / Data** | Khảo sát Model Catalog hiện có và bảo mật API Key | **PASS** | `03-domain-data-model.md` & `04-architecture-and-api-contract.md` |
| **Architecture / Data** | Mô hình dữ liệu ERD, cardinality, constraints, JSON snapshot | **PASS** | `03-domain-data-model.md` (Mục 2 & 4) |
| **Architecture / Data** | Hợp đồng API REST và SSE Stream được đánh dấu `PROPOSED` | **PASS** | `04-architecture-and-api-contract.md` & `09-openapi-or-api-examples.md` |
| **Security / QA** | Tuyệt đối không lưu/trả về API Key trong response hay graph JSON | **PASS** | `07-security-risk-review.md` (`PRJ-CTRL-005`) |
| **Security / QA** | Kiểm tra quyền sở hữu Anti-IDOR trên 100% API | **PASS** | `07-security-risk-review.md` (`PRJ-CTRL-004`) |
| **Security / QA** | Bộ 25 Test Cases đầy đủ kiểm tra quota, word limit, concurrency, IDOR | **PASS** | `08-test-plan-and-test-cases.md` (`PRJ-TC-001..025`) |
| **Diagrams** | Đầy đủ 10 biểu đồ Mermaid bắt buộc, đúng cú pháp, thể hiện nghiệp vụ | **PASS** | 10/10 biểu đồ đã được biên soạn và kiểm tra cú pháp |
| **Ranh Giới Source Code** | **KHÔNG SỬA ĐỔI SOURCE CODE SẢN PHẨM / DATABASE SẢN PHẨM** | **PASS** | Chỉ tạo tài liệu và biểu đồ trong `docs/features/project-management/` |
