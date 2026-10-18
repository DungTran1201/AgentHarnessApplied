# HỒ SƠ ĐẶC TẢ KỸ THUẬT TOÀN DIỆN: PHÂN HỆ QUẢN LÝ QUY TẮC (RULES MANAGEMENT MVP)
## Master Documentation Index — Rules Management Feature Branch
### Hệ Thống: Nền Tảng Trợ Lý Ảo AI-Chan (AI-Chan Virtual Assistant Platform)

---

| Thông Tin Quản Trị | Chi Tiết Kỹ Thuật |
| :--- | :--- |
| **Nhánh Tính Năng** | **Quản Lý Quy Tắc (Rules Management — Rules Library & Rule Editor)** |
| **Thư Mục Lưu Trữ** | `docs/features/rules-management/` |
| **Trạng Thái Quản Trị** | **`IMPLEMENTED (Triển khai hoàn tất Frontend + Backend + Migration + Tests)`** |
| **Phiên Bản Tài Liệu** | `1.1.0-IMPLEMENTED` |
| **Ngày Hoàn Thành** | `2026-10-18` |
| **Đội Ngũ Phụ Trách** | Senior Full-Stack Engineer, Backend Architect, Frontend Engineer, Security & QA Engineer |
| **Nguyên Tắc Bắt Buộc** | Tuân thủ `AGENTS.md`, `.agents/rules/documentation.md`, `.agents/rules/diagrams.md`. |

---

## 1. Giới Thiệu Tổng Quan Phân Hệ (Executive Summary)

Phân hệ **Quản Lý Quy Tắc (Rules Management MVP)** là phân hệ quản trị tài nguyên nhận thức tập trung cho phép người dùng xây dựng, lưu trữ, tùy biến và liên kết các quy tắc chỉ dẫn lâu dài (Directives, Coding Conventions, Architecture Standards, Security Constraints) nhằm định hướng hành vi của Trợ lý ảo AI-Chan:

1. **Quản Lý Thư Viện Tập Trung (Rules Library — `/rules`)**:
   - Duyệt danh sách Rules khả dụng dưới dạng Card Grid hoặc Table View trực quan.
   - Tìm kiếm tức thì theo tên, mô tả và tags; hỗ trợ tiếng Việt có dấu và không phân biệt hoa/thường.
   - Lọc đa tiêu chí: Theo Phạm vi (`Tất cả`, `Cá nhân - User`, `Hệ thống - System`), theo Chế độ kích hoạt (`always_on`, `model_decision`, `glob`, `manual`), theo Trạng thái (`Active`, `Inactive`, `Archived`).
   - Xử lý mượt mà **6 trạng thái giao diện chuẩn mực** (Loading Skeleton, Populated, Empty State, No-Results, Error State, Unauthorized).
   - Thao tác nhanh: Bật/Tắt công tắc trạng thái `active`/`inactive`, Nhân bản (Clone) Rule hệ thống thành Rule cá nhân, Xóa mềm (Soft Delete) kèm hộp thoại kiểm tra dự án liên kết.

2. **Quản Lý Từng Quy Tắc & Soạn Thảo (Rule Detail & Editor — `/rules/:id`, `/rules/new`)**:
   - Biểu mẫu trực quan cho phép nhập: Tên, Mô tả, Tags, Activation Mode, Glob Patterns, Priority (0-100) và Nội dung Markdown.
   - Trình soạn thảo Markdown hai chế độ (Chuyển đổi linh hoạt giữa tab `Soạn Thảo` và `Xem Trước Live Preview`).
   - Khử khuẩn an toàn dữ liệu 100% bằng `DOMPurify`, ngăn chặn triệt để nguy cơ Stored XSS.
   - Bộ đếm ký tự thời gian thực, cưỡng chế giới hạn tối đa 10.000 ký tự để chống DoS bộ nhớ và cạn kiệt context token.
   - Cơ chế **Bảo vệ biểu mẫu chưa lưu (Dirty State Guard)**: Cảnh báo xác nhận khi người dùng cố tình rời trang mà có dữ liệu chưa lưu.
   - Chế độ chỉ đọc (Read-Only) đối với Quy tắc Hệ thống (System Rules), hiển thị banner giải thích và nút nhân bản nổi bật.
   - Kiểm soát xung đột ghi đè đồng thời (Optimistic Concurrency Control qua trường `version`).

3. **Ranh Giới An Toàn & Phân Tách Kiến Trúc Tuyệt Đối**:
   - **Phân tách CRUD vs Runtime**: Phân hệ MVP tập trung 100% vào việc hoàn thiện Thư viện quản trị (Registry / CRUD); cơ chế nạp Rules vào luồng sinh chat được đặt ở phần Đề xuất Kiến trúc Tương lai (Future Runtime Integration), không ngụy tạo như thể hệ thống đã chạy.
   - **Chính sách không nhồi nhét tự động (No Auto-Global Ingestion)**: Quy tắc trong thư viện cá nhân KHÔNG BAO GIỜ tự động bị chèn vào mọi dự án của người dùng, tránh ô nhiễm ngữ cảnh và lãng phí token.
   - **Bảo mật Anti-IDOR**: 100% các endpoint được kiểm soát quyền sở hữu theo `user_id` của JWT token; tuyệt đối không rò rỉ dữ liệu giữa các người dùng.

---

## 2. Bản Đồ Mục Lục 12 Tài Liệu Kỹ Thuật (Master Documentation Map)

Hồ sơ phân hệ bao gồm 12 tài liệu kỹ thuật chuyên sâu được liên kết truy vết 2 chiều khép kín:

| STT | Mã Tài Liệu | Tệp Hồ Sơ Chi Tiết | Tóm Tắt Nội Dung Trọng Tâm | Trạng Thái |
| :---: | :---: | :--- | :--- | :---: |
| **00** | `RUL-DOC-00` | [00-discovery-and-evidence-register.md](file:///c:/Users/PC/Project/ai-chan/docs/features/rules-management/00-discovery-and-evidence-register.md) | Khảo sát tĩnh codebase, Bảng đăng ký minh chứng (Evidence Register: 12 claims `EXISTS`, `MISSING`, `PARTIAL`), Fact classification và Reference Log. | **ĐÃ HOÀN TẤT** |
| **01** | `RUL-DOC-01` | [01-feature-inventory-and-scope.md](file:///c:/Users/PC/Project/ai-chan/docs/features/rules-management/01-feature-inventory-and-scope.md) | Danh mục 40 tính năng (`RUL-F-001..040`), ranh giới MVP vs Ngoài phạm vi, ma trận phân quyền tác nhân (Guest, User, Project Owner, Admin). | **ĐÃ HOÀN TẤT** |
| **02** | `RUL-DOC-02` | [02-srs-rules-management.md](file:///c:/Users/PC/Project/ai-chan/docs/features/rules-management/02-srs-rules-management.md) | Đặc tả SRS đầy đủ: 14 Functional Requirements (`RUL-FR-###`), 10 Non-Functional Requirements (`RUL-NFR-###`), 15 Business Rules (`RUL-BR-###`) và tiêu chí nghiệm thu (AC). | **ĐÃ HOÀN TẤT** |
| **03** | `RUL-DOC-03` | [03-use-cases-and-user-flows.md](file:///c:/Users/PC/Project/ai-chan/docs/features/rules-management/03-use-cases-and-user-flows.md) | Đặc tả 10 Use Cases chi tiết (`RUL-UC-001..010`), luồng chính (Happy Path), luồng phụ, ngoại lệ và sơ đồ điều hướng người dùng (User Flows). | **ĐÃ HOÀN TẤT** |
| **04** | `RUL-DOC-04` | [04-domain-model-and-data-dictionary.md](file:///c:/Users/PC/Project/ai-chan/docs/features/rules-management/04-domain-model-and-data-dictionary.md) | Mô hình miền DDD, từ điển dữ liệu chi tiết bảng `rules` và `project_rules`, chiến lược đánh index và bản DDL Migration đề xuất (`017_rules_management_system.sql`). | **ĐÃ HOÀN TẤT** |
| **05** | `RUL-DOC-05` | [05-architecture-and-api-contract.md](file:///c:/Users/PC/Project/ai-chan/docs/features/rules-management/05-architecture-and-api-contract.md) | Ranh giới kiến trúc 3 tầng, hợp đồng 10 API RESTful đề xuất theo OpenAPI 3.1.0, Schemas Pydantic v2 và Interfaces TypeScript cho Frontend. | **ĐÃ HOÀN TẤT** |
| **06** | `RUL-DOC-06` | [06-rules-vs-skills-prompts-tools-comparison.md](file:///c:/Users/PC/Project/ai-chan/docs/features/rules-management/06-rules-vs-skills-prompts-tools-comparison.md) | Ma trận đối chiếu chuyên sâu 4 thành phần nhận thức (Rules, System Prompts, Skills, Tools) trên 10 tiêu chí kỹ thuật cốt lõi. | **ĐÃ HOÀN TẤT** |
| **07** | `RUL-DOC-07` | [07-architecture-and-runtime-integration.md](file:///c:/Users/PC/Project/ai-chan/docs/features/rules-management/07-architecture-and-runtime-integration.md) | Phân tích 4 trụ cột (Storage Scope, Application Scope, Activation Mode, Conflict Policy), phân định CRUD vs Runtime và mô hình đề xuất Runtime Resolver. | **ĐÃ HOÀN TẤT** |
| **08** | `RUL-DOC-08` | [08-security-threat-model-and-policies.md](file:///c:/Users/PC/Project/ai-chan/docs/features/rules-management/08-security-threat-model-and-policies.md) | Đánh giá an ninh theo mô hình đe dọa STRIDE (8 Threats `RUL-THR-###`), 8 Biện pháp kiểm soát (`RUL-CTRL-###`), phòng chống IDOR, XSS, Path Traversal, Rule Poisoning. | **ĐÃ HOÀN TẤT** |
| **09** | `RUL-DOC-09` | [09-mermaid-diagrams.md](file:///c:/Users/PC/Project/ai-chan/docs/features/rules-management/09-mermaid-diagrams.md) | Tập hợp **16 biểu đồ Mermaid chuẩn hóa** mô tả trực quan 100% luồng nghiệp vụ, tương tác API, máy trạng thái, ERD, bảo mật và cơ chế phân giải. | **ĐÃ HOÀN TẤT** |
| **10** | `RUL-DOC-10` | [10-test-plan-and-test-cases.md](file:///c:/Users/PC/Project/ai-chan/docs/features/rules-management/10-test-plan-and-test-cases.md) | Chiến lược kim tự tháp kiểm thử 3 tầng và bộ **20 Ca kiểm thử chi tiết (`RUL-TC-001..020`)** phân loại P0/P1/P2 bao quát toàn bộ ranh giới an toàn và chức năng. | **ĐÃ HOÀN TẤT** |
| **11** | `RUL-DOC-11` | [11-traceability-matrix.md](file:///c:/Users/PC/Project/ai-chan/docs/features/rules-management/11-traceability-matrix.md) | Ma trận truy vết hai chiều (Bidirectional Traceability Matrix) liên kết 100% Yêu cầu (FR) ↔ Quy tắc (BR) ↔ Use Case ↔ API ↔ UI ↔ Biểu đồ ↔ Kiểm thử. | **ĐÃ HOÀN TẤT** |
| **12** | `RUL-DOC-12` | [12-decision-log-and-assumptions.md](file:///c:/Users/PC/Project/ai-chan/docs/features/rules-management/12-decision-log-and-assumptions.md) | Nhật ký 8 quyết định kiến trúc (`DEC-RUL-###`), bảng phân loại Fact/Assumption, 4 câu hỏi mở chờ PO phê duyệt và Reference Log nguồn chính thức. | **ĐÃ HOÀN TẤT** |

---

## 3. Mục Lục 16 Biểu Đồ Mermaid Chuẩn Hóa (Master Diagram Registry)

Tất cả 16 biểu đồ kỹ thuật được định dạng chuẩn xác tại tệp [09-mermaid-diagrams.md](file:///c:/Users/PC/Project/ai-chan/docs/features/rules-management/09-mermaid-diagrams.md):

1. **`RUL-DIA-01`**: Use Case Diagram — Quản Lý Thư Viện Rules (Rules Library)
2. **`RUL-DIA-02`**: Use Case Diagram — Quản Lý Từng Rule & Soạn Thảo (Rule Detail & Editor)
3. **`RUL-DIA-03`**: User Flow — Mở Thư Viện Rules, Tìm Kiếm, Lọc & Mở Rule
4. **`RUL-DIA-04`**: User Flow — Tạo Mới, Soạn Thảo, Lưu & Xử Lý Biểu Mẫu Chưa Lưu (Dirty State)
5. **`RUL-DIA-05`**: Swimlane Diagram — Phân Vai Trò End-to-End (User → Frontend → API → Service → Database)
6. **`RUL-DIA-06`**: Sequence Diagram — Tải Danh Sách Rules (Pagination, Search, Scope Filters)
7. **`RUL-DIA-07`**: Sequence Diagram — Tạo Mới Rule (Client Validation, Duplicate Check, Persistence)
8. **`RUL-DIA-08`**: Sequence Diagram — Cập Nhật Rule & Xử Lý Xung Đột Ghi Đè (Optimistic Concurrency)
9. **`RUL-DIA-09`**: Sequence Diagram — Xóa Mềm Rule & Kiểm Tra Dự Án Đang Sử Dụng (Delete In-Use Guard)
10. **`RUL-DIA-10`**: State Diagram — Vòng Đời Dữ Liệu Rule & Trạng Thái Biểu Mẫu UI
11. **`RUL-DIA-11`**: Entity-Relationship Diagram (ERD) — Bảng Rules & Quan Hệ Với Users, Projects
12. **`RUL-DIA-12`**: Component & Architecture Diagram — Kiến Trúc Hệ Thống & Điểm Tích Hợp Runtime
13. **`RUL-DIA-13`**: Security Flow — Kiểm Soát Quyền Truy Cập Anti-IDOR & Bảo Vệ System Rules
14. **`RUL-DIA-14`**: Rule Activation & Resolution Flow — Cơ Chế Phân Giải Quy Tắc Lúc Chạy (Proposed Runtime)
15. **`RUL-DIA-15`**: Error Handling & Recovery Flow — Xử Lý Ngoại Lệ (400, 401, 403, 404, 409, 422, 500)
16. **`RUL-DIA-16`**: Traceability & Feature Dependency Diagram — Ma Trận Phụ Thuộc Tính Năng

---

## 4. Tóm Tắt Đối Chiếu 4 Khái Niệm Nhận Thức

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    HỆ SINH THÁI NHẬN THỨC CỦA AI-CHAN                       │
├─────────────────┬────────────────────────────────────────────────────────────┤
│ THÀNH PHẦN      │ BẢN CHẤT VÀ VAI TRÒ TRONG HỆ THỐNG                         │
├─────────────────┼────────────────────────────────────────────────────────────┤
│ 1. RULE         │ Ràng buộc thụ động / tiêu chuẩn hành vi (Passive Directives)│
│                 │ Không có side effect, kích hoạt có điều kiện (glob/trigger)│
├─────────────────┼────────────────────────────────────────────────────────────┤
│ 2. SYSTEM PROMPT│ Định hình vai trò, giọng điệu, tính cách (Persona / Framing)│
│                 │ Cố định xuyên suốt phiên chat (Singleton per session)      │
├─────────────────┼────────────────────────────────────────────────────────────┤
│ 3. SKILL        │ Năng lực quy trình chủ động đa bước (Procedural Workflow)   │
│                 │ Chứa tệp hướng dẫn SKILL.md, tài nguyên và scripts hỗ trợ  │
├─────────────────┼────────────────────────────────────────────────────────────┤
│ 4. TOOL         │ Khả năng thực thi tác vụ cụ thể (Execution Primitives)     │
│                 │ Chạy Python / Terminal / API, có Schema JSON, có side effect│
└─────────────────┴────────────────────────────────────────────────────────────┘
```

---

## 5. Đánh Giá Tiêu Chuẩn Nghiệm Thu & Sẵn Sàng Triển Khai (Definition of Done)

Hồ sơ đặc tả kỹ thuật và mã nguồn phân hệ Rules Management đã đáp ứng 100% các tiêu chí nghiệm thu của quy chế kỹ thuật AI-Chan:

- [x] **Evidence Register**: Khảo sát tĩnh dựa trên mã nguồn thật, phân loại minh chứng đầy đủ (`EXISTS`, `PARTIAL`, `MISSING`, `CONFLICT`).
- [x] **Ranh giới phân hệ rõ ràng**: Tách biệt hoàn toàn giữa Thư viện Quản lý (MVP) và Trình phân giải Runtime (Future Integration).
- [x] **Bảng đối chiếu 4 trụ cột**: Làm rõ ranh giới giữa Rules, System Prompts, Skills và Tools trên 10 tiêu chí.
- [x] **Hệ thống định danh chuẩn mực**: 100% yêu cầu có ID ổn định (`RUL-FR-###`, `RUL-NFR-###`, `RUL-BR-###`, `RUL-UC-###`, `RUL-API-###`, `RUL-THR-###`, `RUL-CTRL-###`, `RUL-TC-###`, `RUL-DIA-###`, `DEC-RUL-###`).
- [x] **Bộ 16 Biểu Đồ Mermaid**: Đầy đủ 16 sơ đồ cú pháp chuẩn xác, nhất quán với SRS, Data Dictionary và API Contract.
- [x] **Mô hình DDL Migration**: Script `017_rules_management_system.sql` hoàn chỉnh, có Index tối ưu và seed data mẫu, đã chạy migration thành công trên cơ sở dữ liệu `app.db`.
- [x] **Đánh giá An ninh STRIDE**: Phân tích và cài đặt đầy đủ các biện pháp phòng chống IDOR, Stored XSS, Path Traversal, Rule Poisoning, Token DoS.
- [x] **Bộ Kiểm Thử Toàn Diện**: 12/12 backend pytest tests PASSED, 31/31 regression tests PASSED, 39/39 frontend node tests PASSED, 0 TypeScript compile errors.
- [x] **Ma trận truy vết 2 chiều**: Ánh xạ khép kín không để lại khoảng trống logic.
- [x] **Triển Khai Hoàn Tất End-to-End**: Đã triển khai đầy đủ mã nguồn backend (`rule_service.py`, `rules.py`), migration, frontend (`/rules`, `/rules/new`, `/rules/[id]`), API client (`ruleService.ts`) và safe markdown viewer (`SafeMarkdownViewer.tsx`).

---

## 6. Nhật Ký Triển Khai Mã Nguồn (Source Code Implementation Summary)

| Tầng Hệ Thống | Tệp Mã Nguồn / Cấu Hình | Vai Trò & Chức Năng Đã Triển Khai |
| :--- | :--- | :--- |
| **Database Migration** | `ai-backend/database/migrations/017_rules_management_system.sql` | DDL tạo bảng `rules`, `project_rules`, triggers cập nhật timestamps, indexes và seed 3 System Rules |
| **Migration Runner** | `ai-backend/database/apply_migrations.py` | Áp dụng migration tự động trên cả `ai-backend/database/app.db` và root `app.db` |
| **Backend Service** | `ai-backend/src/services/rule_service.py` | Pydantic v2 schemas, Rule CRUD, Status toggle, Clone, Soft-delete với Project guard, Optimistic lock, Anti-IDOR |
| **Backend API** | `ai-backend/src/api/v1/rules.py` | FastAPI Router cho `/rules` và `/projects/{project_id}/rules` |
| **Router Mount** | `ai-backend/src/api/v1/router.py` | Đăng ký `rules_router` và `project_rules_router` vào router v1 |
| **Backend Tests** | `ai-backend/tests/test_rules_api.py` | 12 test cases kiểm thử CRUD, IDOR, System Rule Protection, Soft delete guard, 409 Conflict, Binding |
| **Frontend Types** | `ai-frontend/src/types/rule.ts` | Định nghĩa `Rule`, `RuleDetail`, `ActivationMode`, `RuleStatus`, `RuleScope`, `RuleCreatePayload`, `RuleUpdatePayload` |
| **Frontend Service** | `ai-frontend/src/services/ruleService.ts` | API client kết nối backend `/rules`, phân trang, tìm kiếm, clone, delete, associated projects |
| **UI Component** | `ai-frontend/src/components/ui/Icon.tsx` | Bổ sung icon `'rules'` (quy tắc/văn bản pháp quy) |
| **Navigation** | `ai-frontend/src/components/chat/Sidebar.tsx` | Bổ sung menu item Rules (href `/rules`) giữa Tools và Dashboard |
| **Safe Markdown** | `ai-frontend/src/components/rules/SafeMarkdownViewer.tsx` | Parser chuyển đổi Markdown thuần thành React elements, chống Stored XSS |
| **List Page** | `ai-frontend/src/app/(app)/rules/page.tsx` | Rules Library: Grid/Table view, debounce search, filters, quick toggle status, clone, soft delete, pagination, 6 UI states |
| **Create Page** | `ai-frontend/src/app/(app)/rules/new/page.tsx` | Form tạo mới Rule: Scope, Activation Mode, Glob security check, Priority slider, Tab Soạn thảo/Xem trước, Dirty guard |
| **Detail/Edit Page** | `ai-frontend/src/app/(app)/rules/[id]/page.tsx` | Xem/sửa Rule: System Rule read-only banner & clone, 409 Concurrency modal, Associated projects tab, Delete guard |
| **Frontend Tests** | `ai-frontend/src/tests/rulesNavigationAndAccess.test.ts` | Unit tests xác minh NAV_ITEMS, route matching, client input validation, path traversal check, system rule immutability |
