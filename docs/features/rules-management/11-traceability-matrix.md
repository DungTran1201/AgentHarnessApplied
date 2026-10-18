# PHẦN 11: MA TRẬN TRUY VẾT YÊU CẦU TOÀN DIỆN (BIDIRECTIONAL TRACEABILITY MATRIX)
## Phân Hệ: Quản Lý Quy Tắc (Rules Management — Rules Library & Rule Editor)
### Dự Án: Nền Tảng Trợ Lý Ảo AI-Chan (AI-Chan Assistant Platform)

---

| Thông Tin Quản Trị | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `RUL-DOC-11` |
| **Nhánh Tính Năng** | **Rules Management (Rules Library & Rule Editor)** |
| **Trạng Thái Quản Trị** | **`PROPOSED (Chờ Duyệt Từ Architecture Board & Product Owner)`** |
| **Phiên Bản** | `1.0.0-PROPOSAL` |
| **Ngày Ban Hành** | `2026-10-18` |
| **Tác Giả / Vai Trò** | Senior Business Analyst & QA Lead |

---

## 1. Mục Đích & Nguyên Tắc Truy Vết Khép Kín

Ma trận truy vết hai chiều (Bidirectional Traceability Matrix) đảm bảo rằng:
1. **100% Yêu Cầu Chức Năng (FR)** đều được hiện thực hóa qua các Use Case, Quy Tắc Nghiệp Vụ, Hợp Đồng API, Thành Phần Giao Diện, Sơ Đồ Kiến Trúc và Ca Kiểm Thử.
2. Không có bất kỳ thành phần mã nguồn, endpoint hay bảng dữ liệu nào được xây dựng mà không có yêu cầu nghiệp vụ làm gốc rễ (Nguyên tắc YAGNI).
3. Mọi rủi ro an ninh đều có biện pháp kiểm soát và bài kiểm thử xác minh tương ứng.

---

## 2. Bảng Ma Trận Truy Vết Tổng Thể (Master Traceability Matrix)

| Mã Yêu Cầu (FR) | Tên Yêu Cầu Chức Năng | Quy Tắc Nghiệp Vụ (BR) | Ca Sử Dụng (UC) | Hợp Đồng API | Thành Phần UI (Frontend) | Biểu Đồ Kỹ Thuật (Mermaid) | Đe Dọa & Kiểm Soát An Ninh | Ca Kiểm Thử (Test Case) |
| :---: | :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: |
| **RUL-FR-001** | Xem Danh Sách Thư Viện Rules | `RUL-BR-003`<br>`RUL-BR-015` | `RUL-UC-001` | `RUL-API-01`<br>`GET /rules` | `RulesPage.tsx`<br>`RulesTable.tsx`<br>`RuleCardGrid.tsx` | `RUL-DIA-01`<br>`RUL-DIA-03`<br>`RUL-DIA-06` | `RUL-THR-002`<br>`RUL-CTRL-002` | `RUL-TC-001`<br>`RUL-TC-018` |
| **RUL-FR-002** | Tìm Kiếm & Lọc Danh Sách Rules | `RUL-BR-008` | `RUL-UC-002` | `RUL-API-01`<br>`GET /rules` | `RulesFilterToolbar.tsx`<br>`RulesSearchBar.tsx` | `RUL-DIA-01`<br>`RUL-DIA-03` | N/A | `RUL-TC-002`<br>`RUL-TC-003` |
| **RUL-FR-003** | Thay Đổi Trạng Thái Hoạt Động Nhanh | `RUL-BR-002`<br>`RUL-BR-003` | `RUL-UC-003` | `RUL-API-05`<br>`PATCH /status` | `RuleStatusSwitch.tsx` | `RUL-DIA-01`<br>`RUL-DIA-10` | `RUL-THR-001`<br>`RUL-CTRL-001` | `RUL-TC-017` |
| **RUL-FR-004** | Nhân Bản Rule (Clone Rule) | `RUL-BR-002`<br>`RUL-BR-012` | `RUL-UC-007` | `RUL-API-06`<br>`POST /clone` | `RuleCloneButton.tsx` | `RUL-DIA-01`<br>`RUL-DIA-10` | N/A | `RUL-TC-009` |
| **RUL-FR-005** | Xóa Mềm Rule & Kiểm Tra Sử Dụng | `RUL-BR-002`<br>`RUL-BR-006`<br>`RUL-BR-007` | `RUL-UC-008` | `RUL-API-07`<br>`DELETE /rules/:id` | `RuleDeleteConfirmModal.tsx`<br>`ProjectDependencyWarning.tsx` | `RUL-DIA-01`<br>`RUL-DIA-09`<br>`RUL-DIA-10` | `RUL-THR-001`<br>`RUL-CTRL-001` | `RUL-TC-010`<br>`RUL-TC-011` |
| **RUL-FR-006** | Tạo Mới Rule | `RUL-BR-001`<br>`RUL-BR-004`<br>`RUL-BR-005` | `RUL-UC-004` | `RUL-API-02`<br>`POST /rules` | `RuleEditorPage.tsx`<br>`RuleForm.tsx` | `RUL-DIA-02`<br>`RUL-DIA-04`<br>`RUL-DIA-07` | `RUL-THR-001`<br>`RUL-THR-003`<br>`RUL-THR-005` | `RUL-TC-004`<br>`RUL-TC-005`<br>`RUL-TC-015`<br>`RUL-TC-016` |
| **RUL-FR-007** | Chỉnh Sửa & Cập Nhật Rule | `RUL-BR-002`<br>`RUL-BR-003`<br>`RUL-BR-011` | `RUL-UC-005` | `RUL-API-04`<br>`PUT /rules/:id` | `RuleEditorPage.tsx`<br>`ConcurrencyConflictModal.tsx` | `RUL-DIA-02`<br>`RUL-DIA-04`<br>`RUL-DIA-08` | `RUL-THR-001`<br>`RUL-THR-002`<br>`RUL-CTRL-002` | `RUL-TC-007`<br>`RUL-TC-008`<br>`RUL-TC-012` |
| **RUL-FR-008** | Xem Chi Tiết System Rule (Read-Only)| `RUL-BR-002` | `RUL-UC-006` | `RUL-API-03`<br>`GET /rules/:id` | `RuleEditorPage.tsx`<br>`SystemRuleBanner.tsx` | `RUL-DIA-02`<br>`RUL-DIA-03` | `RUL-THR-001`<br>`RUL-CTRL-001` | `RUL-TC-008` |
| **RUL-FR-009** | Soạn Thảo & Xem Trước Markdown | `RUL-BR-004`<br>`RUL-BR-010` | `RUL-UC-005` | N/A (Client-side) | `MarkdownEditor.tsx`<br>`MarkdownLivePreview.tsx` | `RUL-DIA-04` | `RUL-THR-004`<br>`RUL-CTRL-004` | `RUL-TC-014` |
| **RUL-FR-010** | Cảnh Báo Khi Rời Trang Chưa Lưu | `RUL-BR-009` | `RUL-UC-010` | N/A (Client-side) | `DirtyFormGuardModal.tsx`<br>`useBlocker.ts` | `RUL-DIA-04`<br>`RUL-DIA-10` | N/A | `RUL-TC-013` |
| **RUL-FR-011** | Xem Danh Sách Dự Án Đang Dùng | `RUL-BR-003` | `RUL-UC-009` | `RUL-API-08`<br>`GET /rules/:id/projects`| `AssociatedProjectsTab.tsx` | `RUL-DIA-02`<br>`RUL-DIA-09` | `RUL-THR-002`<br>`RUL-CTRL-002` | `RUL-TC-010` |
| **RUL-FR-012** | Quản Lý Gán Rule Vào Dự Án | `RUL-BR-003`<br>`RUL-BR-014` | `RUL-UC-009` | `RUL-API-10`<br>`PUT /projects/:id/rules`| `ProjectRulesBindingSettings.tsx` | `RUL-DIA-11`<br>`RUL-DIA-12` | `RUL-THR-002`<br>`RUL-CTRL-002` | `RUL-TC-019` |
| **RUL-FR-013** | Khử Khuẩn XSS & Chống Đầu Độc | `RUL-BR-010`<br>`RUL-BR-013` | N/A (Cross-cutting) | N/A | `DOMPurify` Helper<br>`RulePoisoningGate.py` | `RUL-DIA-13` | `RUL-THR-003`<br>`RUL-THR-004`<br>`RUL-CTRL-003`<br>`RUL-CTRL-004` | `RUL-TC-014` |
| **RUL-FR-014** | Kiểm Toán & Ghi Nhận Lịch Sử | `RUL-BR-003` | N/A (Cross-cutting) | N/A | Backend Logging Middleware | `RUL-DIA-05` | `RUL-THR-007`<br>`RUL-CTRL-007` | `RUL-TC-004`<br>`RUL-TC-011` |

---

## 3. Đánh Giá Độ Bao Phủ Truy Vết (Traceability Coverage Assessment)

- **Độ bao phủ yêu cầu chức năng (FR Coverage)**: 14/14 FRs (**100%**) được ánh xạ trực tiếp sang các Use Case, Hợp Đồng API, Biểu đồ Mermaid và Ca kiểm thử.
- **Độ bao phủ an ninh (Security Coverage)**: 8/8 Nguy cơ STRIDE (**100%**) được kiểm soát bởi các biện pháp kiến trúc và có các ca kiểm thử bảo mật chuyên biệt (`RUL-TC-006`, `007`, `008`, `014`, `016`).
- **Khoảng trống còn lại (Remaining Gaps)**: Không có khoảng trống logic nào chưa được định nghĩa; toàn bộ các thành phần mở rộng tương lai (Import/Export, Canvas Rule Node, Runtime Resolver) đều đã được gắn nhãn `PROPOSED` và phân định ranh giới rõ ràng.
