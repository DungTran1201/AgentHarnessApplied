# Thư Mục Kế Hoạch Phát Triển Dự Án (Project Planning)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

## 1. Giới Thiệu Giai Đoạn Planning (Planning Phase)
Thư mục này chứa toàn bộ tài liệu kế hoạch phát triển dự án mang tính cấu trúc và có thể kiểm chứng được, được xây dựng bởi **Senior Business Analyst + Product Manager + Project Planner + Solution Architect**.

Giai đoạn Planning đóng vai trò là chiếc cầu nối kỹ thuật bắt buộc giữa **Yêu Cầu Nghiệp Vụ (SRS)** và **Thực Thi Kỹ Thuật (Architecture & Implementation)**, đảm bảo:
- Không bao giờ nhảy cóc trực tiếp từ yêu cầu sơ khai sang viết mã nguồn (No premature coding).
- Mọi Work Package đều xác định rõ ràng: **WHAT, WHY, WHO, WHEN, IN WHICH ORDER, DEPEND ON WHAT, PRODUCE WHICH ARTIFACT, HOW TO VERIFY**.
- Phân định rõ thứ tự phụ thuộc, loại trừ rủi ro bỏ sót bảo mật, xử lý ngoại lệ và phân quyền.

---

## 2. Danh Mục Tài Liệu Kế Hoạch (Planning Documents Inventory)

| Tên Tài Liệu | Mô Tả & Mục Đích | Tài Liệu Phụ Thuộc / Liên Quan |
| :--- | :--- | :--- |
| **[project-development-plan.md](file:///c:/Users/PC/Project/ai-chan/docs/01-planning/project-development-plan.md)** | **Tài liệu Kế hoạch Tổng thể (Master Plan)**: Tổng quan mục tiêu, chiến lược phân rã, các mốc thời gian, ranh giới MVP và lộ trình. | `docs/SRS.md` |
| **[development-phases.md](file:///c:/Users/PC/Project/ai-chan/docs/01-planning/development-phases.md)** | **Chi Tiết Các Phase Phát Triển**: Đặc tả mục tiêu, đầu vào, yêu cầu bao phủ, work package, tiêu chí nghiệm thu từng phase. | `project-development-plan.md` |
| **[work-breakdown-structure.md](file:///c:/Users/PC/Project/ai-chan/docs/01-planning/work-breakdown-structure.md)** | **Cơ Cấu Phân Rã Công Việc (WBS)**: Danh sách chi tiết các Work Package (WP) độc lập, có thể đo lường và bàn giao. | `development-phases.md` |
| **[requirement-traceability.md](file:///c:/Users/PC/Project/ai-chan/docs/01-planning/requirement-traceability.md)** | **Ma Trận Truy Vết Yêu Cầu**: Đối chiếu 100% từ FR/NFR/BR sang Work Package, Phase, Artifact và Validation. | `docs/SRS.md`, WBS |
| **[capability-dependencies.md](file:///c:/Users/PC/Project/ai-chan/docs/01-planning/capability-dependencies.md)** | **Phân Tích Phụ Thuộc Năng Lực**: Sơ đồ Mermaid và phân loại phụ thuộc cứng (Hard), mềm (Soft), kỹ thuật và nghiệp vụ. | `development-phases.md` |
| **[build-order.md](file:///c:/Users/PC/Project/ai-chan/docs/01-planning/build-order.md)** | **Thứ Tự Xây Dựng & Luồng Song Song**: Lý giải tại sao A phải làm trước B, các hạng mục chạy song song và điểm nghẽn. | `capability-dependencies.md` |
| **[milestone-plan.md](file:///c:/Users/PC/Project/ai-chan/docs/01-planning/milestone-plan.md)** | **Kế Hoạch Các Cột Mốc (Milestones)**: Các mốc bàn giao kiểm chứng được (M01 -> M05) kèm tiêu chí thoát. | `project-development-plan.md` |
| **[artifact-plan.md](file:///c:/Users/PC/Project/ai-chan/docs/01-planning/artifact-plan.md)** | **Kế Hoạch Tạo & Quản Lý Artifacts**: Danh sách các sản phẩm chuyển giao (SAD, OpenAPI, DB Schema, Test Plan...). | `development-phases.md` |
| **[quality-gates.md](file:///c:/Users/PC/Project/ai-chan/docs/01-planning/quality-gates.md)** | **Cổng Kiểm Soát Chất Lượng (Quality Gates)**: Quy chuẩn kiểm định G0 -> G6 theo chuẩn Antigravity Starter v3. | `.agents/config/phase-gates.yaml` |
| **[definition-of-ready.md](file:///c:/Users/PC/Project/ai-chan/docs/01-planning/definition-of-ready.md)** | **Định Nghĩa Sẵn Sàng (DoR)**: Điều kiện tiên quyết để một task/phase được phép chuyển sang trạng thái bắt đầu. | `quality-gates.md` |
| **[definition-of-done.md](file:///c:/Users/PC/Project/ai-chan/docs/01-planning/definition-of-done.md)** | **Định Nghĩa Hoàn Thành (DoD)**: Tiêu chuẩn nghiệm thu toàn diện trước khi đóng một task hoặc phase. | `quality-gates.md` |
| **[risk-register.md](file:///c:/Users/PC/Project/ai-chan/docs/01-planning/risk-register.md)** | **Sổ Bộ Quản Trị Rủi Ro**: Định danh, đánh giá mức độ, biện pháp giảm thiểu và kế hoạch dự phòng cho AI & Hệ thống. | `docs/SRS.md` |
| **[critical-path.md](file:///c:/Users/PC/Project/ai-chan/docs/01-planning/critical-path.md)** | **Đường Găng Dự Án (Critical Path)**: Tuyến công việc quyết định thời gian hoàn thành dự án và các nút thắt rủi ro cao. | `build-order.md` |
| **[open-questions.md](file:///c:/Users/PC/Project/ai-chan/docs/01-planning/open-questions.md)** | **Sổ Theo Dõi Vấn Đề Chờ Làm Rõ**: Tập trung các câu hỏi mở, giả định, mục TBD và các quyết định kiến trúc cần chốt. | `docs/SRS.md` |

---

## 3. Hướng Dẫn Dành Cho Agent Coding (Agent Usage Guide)

Khi một AI Agent hoặc Kỹ sư bắt đầu thực hiện công việc ở các giai đoạn tiếp theo, **BẮT BUỘC** tuân thủ quy trình sau:
1. **Kiểm tra Definition of Ready**: Tra cứu [definition-of-ready.md](file:///c:/Users/PC/Project/ai-chan/docs/01-planning/definition-of-ready.md) để xác định Work Package đã đủ điều kiện bắt đầu hay chưa. Tuyệt đối không viết code nếu task chưa có thiết kế hoặc còn vướng câu hỏi mở trọng yếu.
2. **Tuân thủ Build Order & Critical Path**: Tham chiếu [build-order.md](file:///c:/Users/PC/Project/ai-chan/docs/01-planning/build-order.md) và [critical-path.md](file:///c:/Users/PC/Project/ai-chan/docs/01-planning/critical-path.md) để biết rõ thứ tự thực hiện, không nhảy cóc qua các dependency chưa hoàn tất.
3. **Sử dụng lệnh `/plan` của Antigravity**: Đối với mọi thay đổi mã nguồn từ mức R2 trở lên, phải lập Implementation Plan chi tiết theo mẫu [implementation-plan.template.md](file:///c:/Users/PC/Project/ai-chan/docs/01-planning/implementation-plan.template.md) trước khi sửa code.
4. **Nghiệm thu theo Definition of Done**: Trước khi chuyển trạng thái sang `DONE`, bắt buộc đối chiếu tiêu chí tại [definition-of-done.md](file:///c:/Users/PC/Project/ai-chan/docs/01-planning/definition-of-done.md) và chạy kiểm tra tự động qua `python tools/validators/run_all.py`.
