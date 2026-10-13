# TÀI LIỆU ĐẶC TẢ KIẾN TRÚC & NGHIỆP VỤ: PROJECT EDITOR — NODE CATALOG, SYSTEM PROMPT NODE & MODEL EXECUTION
## Phân Hệ: Tích Hợp Thư Viện System Prompt Vào Visual Project Editor & Chat Runtime (MVP)
### Nền Tảng: AI-Chan Virtual Assistant Platform

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã Phân Hệ** | `FEAT-PE-SPN` (Project Editor - System Prompt Node Integration) |
| **Trạng Thái** | `PROPOSED (Sẵn Sàng Review Nghiệp Vụ & Kiến Trúc — Không Sửa Source Code)` |
| **Phiên Bản** | `1.0.0-MVP` |
| **Ngày Lập** | `2026-10-11` |
| **Vai Trò Phụ Trách** | Senior Business Analyst, Solution Architect, UX/Product Designer, AI Integration Engineer, QA Engineer, Application Security Reviewer |
| **Tài Liệu Cơ Sở Liên Quan** | `docs/features/project-management/`, `docs/features/system-prompt-management/`, `models/domain/domain.yaml` |

---

## 1. Mục Đích & Bối Cảnh Nghiệp Vụ

Hệ thống **AI-Chan** hiện cung cấp:
1. **Phân hệ Quản lý Project (`/projects`)**: Cho phép tạo và cấu hình Project dạng Visual Canvas đồ thị (Graph) đơn giản `Web Input → Model LLM → Web Output`.
2. **Phân hệ Thư Viện System Prompt (`/prompts`)**: Quản lý độc lập các mẫu chỉ dẫn hệ thống cá nhân hóa của người dùng (tên, mô tả, nội dung văn bản tới 10.000 ký tự).

Mục tiêu của bộ tài liệu này là **nâng cấp trải nghiệm Project Editor và cơ chế thực thi mô hình (Model Execution)**:
- Tổ chức lại bảng Node Catalog bên trái thành **bốn nhóm có thể thu gọn/mở rộng (Accordion)**: `Input`, `System Prompt`, `Model`, `Output`.
- Cung cấp **thanh tìm kiếm và bộ lọc nhóm** trên đầu Node Catalog.
- Nhóm `System Prompt` tự động nạp danh sách các System Prompt khả dụng từ thư viện của người dùng hiện tại.
- Cho phép người dùng kéo thả một System Prompt Node lên Canvas và nối trực tiếp vào cổng chỉ dẫn của Model Node (`System Prompt → Model`).
- Tại thời điểm người dùng chat với Project đang `ACTIVE`, Backend Chat Runtime sẽ tự động phân giải nội dung System Prompt đã liên kết và nạp vào tham số `system_instruction` / `SystemMessage` của request gửi sang AI Model Provider.
- **Bảo toàn 100% tính tương thích ngược**: Luồng tuyến tính cơ bản `Input → Model → Output` của các project cũ tiếp tục vận hành bình thường mà không bắt buộc phải có System Prompt Node.

> [!IMPORTANT]
> **Quy Định Ranh Giới Nhiệm Vụ (Scope & Execution Boundary)**:
> Toàn bộ nội dung trong thư mục này là **tài liệu phân tích, đặc tả yêu cầu, thiết kế kiến trúc và ma trận kiểm thử**. Tuyệt đối **KHÔNG** chỉnh sửa mã nguồn sản phẩm, không chạy migration CSDL, không thêm dependencies trong nhiệm vụ này.

---

## 2. Mục Lục Bộ Tài Liệu (Document Suite Index)

Bộ tài liệu được tổ chức thành 15 tài liệu chuyên sâu, có tính liên kết và truy vết chéo chặt chẽ:

| STT | Tên Tài Liệu | File Path | Mục Đích Chính |
| :---: | :--- | :--- | :--- |
| 1 | **Tổng Quan & Mục Lục** | [README.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-editor-system-prompt-integration/README.md) | Giới thiệu, phạm vi, thứ tự đọc và ma trận tài liệu. |
| 2 | **Kiểm Kê Chức Năng** | [feature-inventory.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-editor-system-prompt-integration/feature-inventory.md) | Phân loại FACT / CHANGE / PROPOSED / OUT-OF-SCOPE, Actors, Dependencies. |
| 3 | **Phân Tích Bằng Chứng & Gap** | [gap-analysis.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-editor-system-prompt-integration/gap-analysis.md) | Khảo sát bằng chứng thực tế từ codebase, bảng Gap Analysis 12 hạng mục. |
| 4 | **Đặc Tả Yêu Cầu Phần Mềm (SRS)** | [srs.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-editor-system-prompt-integration/srs.md) | Yêu cầu chức năng (`FR-SPN-###`), phi chức năng (`NFR-SPN-###`), Business Rules (`BR-SPN-###`). |
| 5 | **Đặc Tả Use Cases** | [use-cases.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-editor-system-prompt-integration/use-cases.md) | Luồng nghiệp vụ chi tiết (`UC-SPN-01` đến `UC-SPN-06`), tiền/hậu điều kiện, ngoại lệ. |
| 6 | **Thiết Kế Trải Nghiệm & Luồng UX** | [ux-flows.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-editor-system-prompt-integration/ux-flows.md) | Đặc tả 4 nhóm Accordion, Search/Filter Toolbar, Drag-Drop Canvas, Unsaved guard. |
| 7 | **Mô Hình Miền & Dữ Liệu** | [domain-model.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-editor-system-prompt-integration/domain-model.md) | Bóc tách 4 khái niệm (Catalog Item vs Node Instance vs Resource vs Prompt Node), Binding Policy. |
| 8 | **Đặc Tả Hợp Đồng API** | [api-contracts.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-editor-system-prompt-integration/api-contracts.md) | Chi tiết REST Endpoints, Graph Save Validation, SSE Stream Chat Runtime contracts. |
| 9 | **Kiến Trúc Kỹ Thuật & Thực Thi Model** | [architecture.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-editor-system-prompt-integration/architecture.md) | Cấu trúc phân tầng, cơ chế Provider Adapter Prompt Injection (Gemini, OpenAI, Claude). |
| 10 | **Đánh Giá An Toàn & Bảo Mật** | [security-review.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-editor-system-prompt-integration/security-review.md) | Ranh giới tin cậy, Anti-IDOR, phòng chống Prompt Injection, bảo vệ Secret & Logs. |
| 11 | **Kế Hoạch & Bộ Ca Kiểm Thử (QA)** | [test-plan.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-editor-system-prompt-integration/test-plan.md) | Ma trận kiểm thử toàn diện (`TC-SPN-###`), kiểm thử hồi quy project cũ, kiểm thử bảo mật. |
| 12 | **Biểu Đồ Hệ Thống (Mermaid)** | [diagrams.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-editor-system-prompt-integration/diagrams.md) | 12 biểu đồ Mermaid chuẩn hóa biểu diễn toàn diện các góc nhìn hệ thống. |
| 13 | **Nhật Ký Quyết Định Kiến Trúc (ADR)** | [assumptions-and-decisions.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-editor-system-prompt-integration/assumptions-and-decisions.md) | Bảng quyết định bắt buộc (`DEC-SPN-01` đến `DEC-SPN-08`), giả định và đánh đổi kỹ thuật. |
| 14 | **Ma Trận Truy Vết Yêu Cầu** | [traceability-matrix.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-editor-system-prompt-integration/traceability-matrix.md) | Truy vết xuyên suốt Requirement → Rules → Architecture → Diagrams → AC → Tests. |
| 15 | **Nguồn Tham Khảo & Đánh Giá Giấy Phép** | [references.md](file:///c:/Users/PC/Project/ai-chan/docs/features/project-editor-system-prompt-integration/references.md) | Nguồn chính thống (React Flow, n8n, Langflow, Flowise, Provider APIs, OWASP) có ghi nhận ngày và license. |

---

## 3. Hướng Dẫn Thứ Tự Đọc Tài Liệu (Reading Guide)

Tùy theo vai trò chuyên môn, các thành viên đội ngũ dự án có thể tiếp cận bộ tài liệu theo lộ trình khuyến nghị:

1. **Dành cho Product Owner / Business Analyst**:
   - Đọc `README.md` → `feature-inventory.md` → `srs.md` → `use-cases.md` → `ux-flows.md`.
   - Xem các biểu đồ `DIAG-SPN-UC-001`, `DIAG-SPN-IA-001`, `DIAG-SPN-UF-001` trong `diagrams.md`.
2. **Dành cho Solution Architect / Backend / AI Engineer**:
   - Đọc `gap-analysis.md` → `assumptions-and-decisions.md` → `domain-model.md` → `architecture.md` → `api-contracts.md` → `security-review.md`.
   - Xem các biểu đồ `DIAG-SPN-GRAPH-001`, `DIAG-SPN-SEQ-002`, `DIAG-SPN-SEQ-003`, `DIAG-SPN-ARCH-001` trong `diagrams.md`.
3. **Dành cho Frontend / UX Designer**:
   - Đọc `ux-flows.md` → `api-contracts.md` → `diagrams.md` (`DIAG-SPN-IA-001`, `DIAG-SPN-ACT-001`, `DIAG-SPN-GRAPH-001`).
4. **Dành cho QA / Security Reviewer**:
   - Đọc `srs.md` → `security-review.md` → `test-plan.md` → `traceability-matrix.md`.
