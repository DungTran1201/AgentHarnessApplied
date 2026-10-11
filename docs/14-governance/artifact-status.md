# Trạng Thái Các Tài Liệu Dự Án (Artifact Status Register)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Trạng Thái Định Nghĩa | Diễn Giải |
| :--- | :--- |
| **`APPROVED`** | Đã hoàn thành, đã qua kiểm duyệt cổng chất lượng và khóa baseline chính thức. |
| **`IN_REVIEW`** | Đang trong giai đoạn đánh giá độc lập hoặc thẩm định kỹ thuật. |
| **`DRAFT`** | Đang khởi tạo, chưa qua kiểm duyệt. |
| **`SUPERSEDED`** | Đã được thay thế bởi phiên bản mới hơn. |
| **`BLOCKED`** | Bị chặn do thiếu minh chứng hoặc chưa có quyết định kiến trúc/nghiệp vụ. |

---

## Bảng Tổng Hợp Trạng Thái Artifacts Toàn Bộ 15 Giai Đoạn (00 → 14)

| Giai Đoạn | Thư Mục Tài Liệu | Canonical Model | Artifacts Chính | Trạng Thái Quản Trị | Ghi Chú |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Phase 00** | `docs/00-discovery/` | N/A | Khảo sát dự án, đăng ký minh chứng, giả định ban đầu | **`APPROVED`** | Đầy đủ minh chứng |
| **Phase 01** | `docs/01-planning/` | N/A | WBS, kế hoạch phát triển, ma trận phụ thuộc | **`APPROVED`** | 100% tài liệu baselined |
| **Phase 02** | `docs/02-requirements/` | `models/requirements/` | FRS (`FR-001..014`), NFR (`NFR-001..019`), BR (`BR-001..006`), AC (`AC-001..005`) | **`APPROVED`** | Baseline nguồn chân lý |
| **Phase 03** | `docs/03-business-process/` | `models/process/` | Quy trình nghiệp vụ BPMN (`PROC-001..010`), Swimlane | **`APPROVED`** | Đầy đủ luồng chính/nhánh |
| **Phase 04** | `docs/04-use-cases/` | `models/context/` | Mô hình Use Case (`UC-001..009`), 9 file đặc tả Use Case chi tiết | **`APPROVED`** | Ánh xạ 100% FRS |
| **Phase 05** | `docs/05-system-analysis/` | `models/context/` | Biên giới hệ thống, System Capabilities, Phân tích SSE vs WS | **`APPROVED`** | Phân tích sâu kiến trúc |
| **Phase 06** | `docs/06-architecture/` | `models/architecture/` | SAD C4 Model, Quyết định kiến trúc (`ADR-001..004`), Triển khai | **`APPROVED`** | ADRs accepted |
| **Phase 07** | `docs/07-domain/` | `models/domain/` | Bounded Contexts, Thực thể, Aggregates, Invariants (`INV-01..04`) | **`APPROVED`** | DDD chuẩn hóa |
| **Phase 08** | `docs/08-api/` | `models/api/api.yaml` | Đặc tả API (`API-001..008`), OpenAPI 3.1.0 schema, Hợp đồng tích hợp LLM | **`APPROVED`** | Hợp đồng máy đọc |
| **Phase 09** | `docs/09-behavior/` | `models/interaction/` | Sơ đồ tuần tự (`SEQ-001..004`), Máy trạng thái (`STATE-001..003`) | **`APPROVED`** | Mô hình hóa hành vi động |
| **Phase 10** | `docs/10-security/` | `models/security/` | Đặc tả an ninh (`SEC-001..005`), Mô hình đe dọa STRIDE (`THR-001..006`), Phòng thủ (`CTRL-001..006`) | **`APPROVED`** | Kiểm soát an ninh 3 lớp |
| **Phase 11** | `docs/11-ux/` | `models/ux/ux.yaml` | Information Architecture, Sơ đồ luồng, Đặc tả tương tác (`UX-001..005`) | **`APPROVED`** | Giao diện responsive & mượt |
| **Phase 12** | `docs/12-testing/` | `models/testing/testing.yaml`| Chiến lược kiểm thử, Kế hoạch kiểm thử, 15 Test Cases (`TC-001..015`) | **`APPROVED`** | 100% AC/FRS bao phủ |
| **Phase 13** | `docs/13-operations/` | `models/deployment/deployment.yaml` | Hướng dẫn triển khai (`DEP-001`), Sổ tay vận hành (Runbook), Giám sát (`DEP-002`) | **`APPROVED`** | Khớp 100% Docker thực tế |
| **Phase 14** | `docs/14-governance/` | N/A | Quy chế quản trị tài liệu, Mục lục ADR, Ngôn ngữ phổ quát, DoD | **`APPROVED`** | Khóa baseline toàn diện |
