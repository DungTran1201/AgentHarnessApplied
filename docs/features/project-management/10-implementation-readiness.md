# 10. ĐÁNH GIÁ MỨC ĐỘ SẴN SÀNG TRIỂN KHAI (IMPLEMENTATION READINESS & ROLLOUT PLAN)
## Nhánh Tính Năng: Quản Lý Project (Project Management MVP)
### Hệ Thống: AI-Chan Virtual Assistant Platform

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `DOC-PRJ-10` |
| **Trạng Thái** | `PROPOSED (Chờ Duyệt Từ Product Owner & Architecture Gate)` |
| **Vai Trò Phụ Trách** | Solution Architect & Engineering Lead |
| **Phiên Bản** | `1.0.0-MVP` |
| **Ngày Lập** | `2026-10-11` |

---

## 1. Tiêu Chí Sẵn Sàng (Definition of Ready - DoR)

Trước khi chuyển giao nhánh tính năng Quản lý Project sang giai đoạn **Lập Trình Thực Tế (Coding Phase)**, toàn bộ các tiêu chí trong bảng sau phải được xác nhận đạt chuẩn:

| Tiêu Chí Sẵn Sàng (DoR Criteria) | Trạng Thái Hiện Tại | Minh Chứng Đạt Chuẩn |
| :--- | :---: | :--- |
| **1. Đặc tả yêu cầu kỹ thuật & AC hoàn chỉnh** | **ĐẠT (PASS)** | Bộ tài liệu SRS `02-srs-project-management.md` đã có đầy đủ 23 FRs, 8 NFRs, 15 BRs, 9 Use Cases chi tiết và 8 Acceptance Criteria đo lường được. |
| **2. Mô hình dữ liệu & Quan hệ thực thể ổn định** | **ĐẠT (PASS)** | Tài liệu `03-domain-data-model.md` đã xác định rõ cấu trúc bảng `projects`, quan hệ với `users`, `models`, `conversations` và JSON schema cho `graph_data`. |
| **3. Hợp đồng API REST & SSE được định nghĩa rõ ràng** | **ĐẠT (PASS)** | Tài liệu `04-architecture-and-api-contract.md` và `09-openapi-or-api-examples.md` đã đặc tả 13 API endpoints kèm ví dụ payload thành công và thất bại. |
| **4. Mô hình trạng thái & Ma trận validation hoàn tất** | **ĐẠT (PASS)** | Tài liệu `05-project-state-and-graph-validation.md` đã chuẩn hóa máy trạng thái (`active`, `stop`, `deactive`), quy tắc hạn ngạch và ma trận bắt lỗi graph. |
| **5. Đánh giá an ninh STRIDE & Chống IDOR** | **ĐẠT (PASS)** | Tài liệu `07-security-risk-review.md` đã hoàn tất phân tích mô hình đe dọa, khẳng định SSRF không áp dụng, bảo mật khóa bí mật và cơ chế chống IDOR. |
| **6. Kế hoạch kiểm thử & Bộ 25 Test Cases đầy đủ** | **ĐẠT (PASS)** | Tài liệu `08-test-plan-and-test-cases.md` đã xây dựng 25 Test Cases có ID ổn định bao quát toàn diện các luồng từ P0 đến P1. |
| **7. Đầy đủ 10 Sơ đồ trực quan Mermaid** | **ĐẠT (PASS)** | Đã tạo và kiểm tra cú pháp 10 biểu đồ Mermaid bắt buộc, thể hiện chính xác kiến trúc và luồng nghiệp vụ. |

---

## 2. Tiêu Chuẩn Hoàn Thành (Definition of Done - DoD)

### 2.1. DoD Cho Giai Đoạn Đặc Tả Kỹ Thuật (Documentation Phase DoD - HIỆN TẠI)
- [x] Đã khảo sát 100% cấu trúc codebase thực tế của `ai-backend` và `ai-frontend`.
- [x] Không can thiệp, sửa đổi mã nguồn sản phẩm hay database thật ngoài phạm vi cho phép.
- [x] Tạo đầy đủ bộ 11 tài liệu kỹ thuật có mã định danh ổn định tại `docs/features/project-management/`.
- [x] Cập nhật và dẫn chiếu đồng bộ vào hệ thống hồ sơ kỹ thuật tổng thể của dự án.
- [x] Bảng ma trận truy vết (Traceability Matrix) 2 chiều khép kín, không có yêu cầu nào mồ côi.

### 2.2. DoD Cho Giai Đoạn Lập Trình Tiếp Theo (Implementation Phase DoD - TƯƠNG LAI)
- [ ] **Database Migration**: Tạo migration script an toàn (ví dụ: `database/migrations/005_add_projects_table.sql`) có hỗ trợ rollback.
- [ ] **Backend Service**:
  - Triển khai `ai-backend/src/api/v1/projects.py` với đầy đủ validation Pydantic v2.
  - Xử lý Transaction an toàn khi kích hoạt project để chống Race Condition quota.
  - Tích hợp kiểm tra số từ và gọi AI streaming qua Output Node.
- [ ] **Frontend Application**:
  - Cài đặt dependency `@xyflow/react`.
  - Triển khai trang `/projects` (danh sách) và `/projects/:id/editor` (canvas).
  - Tích hợp dropdown chọn project active tại Trang Chủ (`/`).
- [ ] **Automated Testing**:
  - Viết tối thiểu 15 Pytest unit/integration tests bao phủ các case P0 (`PRJ-TC-001..PRJ-TC-019`).
  - Viết E2E test kiểm tra luồng tạo project -> kéo thả -> lưu -> chat.
- [ ] **Release Readiness**: `npm run build` không lỗi, API docs Swagger tự động cập nhật, không rò rỉ API key.

---

## 3. Đánh Giá Phụ Thuộc Kỹ Thuật (Dependency Evaluation Checklist)

### Đánh Giá Thư Viện Canvas Cho Frontend:

| Tiêu Chí So Sánh | Phương Án A: `@xyflow/react` (React Flow v12) | Phương Án B: Tự Viết SVG / HTML5 Canvas Thuần |
| :--- | :--- | :--- |
| **Độ phức tạp phát triển** | **Rất Thấp**: Cung cấp sẵn Node, Edge, Pan/Zoom, Viewport, MiniMap, Controls. | **Rất Cao**: Phải tự xử lý ma trận tọa độ, zoom điểm chuột, tính toán đường cong Bezier cho dây nối, tương tác kéo thả. |
| **Khả năng mở rộng (Extensibility)** | **Cao**: Custom Node hoàn toàn bằng React component; dễ dàng thêm node mới sau này. | **Trung bình**: Phải tự viết lại logic render cho từng loại node hình học. |
| **Khả năng tương thích** | Tương thích tốt với React 19 và Next.js 15 (Chạy dưới chế độ `'use client'`). | Tương thích tuyệt đối (không phụ thuộc package ngoài). |
| **Giấy phép phần mềm (License)** | **MIT License** (Hoàn toàn tự do sử dụng thương mại). | N/A (Mã nguồn tự viết). |
| **Kích thước Bundle (Bundle Size)** | ~40 KB gzipped (Nhẹ, tối ưu hóa tốt). | ~10 KB. |
| **KẾT LUẬN LỰA CHỌN** | **KHUYẾN NGHỊ CHỌN PHƯƠNG ÁN A (`@xyflow/react`)**: Giúp rút ngắn 80% thời gian phát triển giao diện canvas trong MVP, đảm bảo độ ổn định cao. | Không khuyến nghị cho tiến độ MVP. |

---

## 4. Kế Hoạch Triển Khai Thực Nghiệm (Rollout & Demo Checklist)

1. **Bước 1: Chạy Migration CSDL**:
   - Chạy script tạo bảng `projects` và thêm cột `project_id` vào `conversations` trên database thử nghiệm.
   - Kiểm tra các ràng buộc khóa ngoại `PRAGMA foreign_keys = ON;`.
2. **Bước 2: Triển Khai Backend API & Unit Tests**:
   - Thêm router `projects_router` vào `src/api/v1/router.py`.
   - Chạy bộ test Pytest tự động: Đảm bảo 100% test cases P0 pass.
3. **Bước 3: Triển Khai Frontend Canvas & Components**:
   - Cài đặt `@xyflow/react`.
   - Tạo các component Custom Node (`WebInputNode`, `ModelNode`, `OutputNode`).
   - Ghép nối trang Danh sách và Canvas Editor.
4. **Bước 4: Tích Hợp Chat Trang Chủ**:
   - Cập nhật `HomeProjectSelector` tại `ai-frontend/src/app/page.tsx` và `/chat`.
   - Kiểm thử luồng chat SSE với các mô hình Gemini và OpenAI.
   - *Kịch bản 1*: Vào `/projects` (không bắt buộc đăng nhập trước) -> Nhấn "Tạo Project Mới" -> Đặt tên "Trợ Lý Python" -> Tạo thành công project.
   - *Kịch bản 2*: Kéo 3 node vào Canvas -> Cấu hình `max_words = 100`, chọn `gemini-3.8-flash` -> Bấm Lưu -> Nhận thông báo "Lưu thành công".
   - *Kịch bản 3*: Bấm "Kích Hoạt" -> Trạng thái đổi sang màu xanh `ACTIVE`.
   - *Kịch bản 4*: Quay lại Trang Chủ -> Chọn "Trợ Lý Python" -> Gõ câu hỏi 15 từ -> Nhận phản hồi streaming tức thì từ AI.
   - *Kịch bản 5*: Thử gõ câu hỏi dài 150 từ -> Nhận thông báo chặn vượt quá giới hạn 100 từ.

---

## 5. Tồn Đọng Quyết Định Cần Phê Duyệt (Decision Backlog)

| Mã Quyết Định | Nội Dung Vấn Đề | Đề Xuất Kỹ Thuật | Tác Động Nghiệp Vụ | Trạng Thái Phê Duyệt |
| :--- | :--- | :--- | :--- | :---: |
| **DEC-PRJ-01** | Lựa chọn thư viện `@xyflow/react` cho Visual Builder. | Sử dụng `@xyflow/react` (MIT License). | Tăng tốc độ release MVP, giảm rủi ro bug UI. | `CHỜ PHÊ DUYỆT` |
| **DEC-PRJ-02** | Lưu trữ Graph dạng JSON snapshot trong cột `graph_data`. | Lưu JSON1 trong SQLite, validate ở backend. | Đơn giản hóa kiến trúc, hỗ trợ Atomic Save. | `CHỜ PHÊ DUYỆT` |
| **DEC-PRJ-03** | Khóa Transaction khi kích hoạt để chống Race Condition. | Dùng `BEGIN IMMEDIATE` trong SQLite transaction. | Đảm bảo không bao giờ vượt quá `MAX_ACTIVE_PROJECTS`. | `CHỜ PHÊ DUYỆT` |
| **DEC-PRJ-04** | Cho phép Soft Delete Project trong MVP. | Đánh dấu `status = 'DELETED'`, hoàn trả quota. | Tăng tính tiện ích, tránh rác dữ liệu. | `CHỜ PHÊ DUYỆT` |
| **DEC-PRJ-05** | Liên kết Project với Conversation hiện có qua `project_id`. | Thêm cột `project_id` vào `conversations`. | Tái sử dụng toàn bộ hạ tầng chat hiện có. | `CHỜ PHÊ DUYỆT` |
