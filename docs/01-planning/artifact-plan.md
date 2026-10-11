# KẾ HOẠCH TẠO & QUẢN LÝ SẢN PHẨM CHUYỂN GIAO (ARTIFACT PLAN)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `ART-PLAN-001` |
| **Mục đích** | Xác định toàn bộ danh mục sản phẩm chuyển giao (Artifacts) trong suốt vòng đời dự án, phân loại tính bắt buộc và trách nhiệm thực hiện |
| **Nguyên tắc** | Không tạo tài liệu chỉ để đủ bộ hình thức; mỗi artifact phải có mục đích phục vụ trực tiếp cho quá trình thiết kế, triển khai hoặc kiểm thử |

---

## 1. Danh Mục Toàn Bộ Artifacts Của Dự Án

| Mã Artifact | Tên Sản Phẩm Chuyển Giao (Artifact) | Đường Dẫn Lưu Trữ Dự Kiến | Mục Đích Sử Dụng | Đầu Vào Chính | Đầu Ra Mong Đợi | Vai Trò Phụ Trách | Phase | Phụ Thuộc | Phân Loại |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :--- | :---: |
| **ART-01** | **Software Requirements Specification (SRS)** | `docs/SRS.md` | Đặc tả toàn bộ yêu cầu nghiệp vụ, chức năng, phi chức năng | Yêu cầu nghiệp vụ, Repo discovery | Bộ baseline yêu cầu chính thức | Senior BA | Khởi đầu | Không | **Required** |
| **ART-02** | **Project Development Plan** | `docs/01-planning/project-development-plan.md` | Định hình kế hoạch phát triển, WBS, dependencies, milestones | `docs/SRS.md` | Lộ trình và chỉ dẫn cho Agent coding | Project Planner | Planning | ART-01 | **Required** |
| **ART-03** | **System Architecture Document (SAD)** | `docs/07-architecture/system-architecture-document.md` | Đặc tả chi tiết kiến trúc 3 tầng, module, luồng dữ liệu | `docs/SRS.md`, PDP | Bản thiết kế kiến trúc toàn diện | Solution Architect | **P01** | ART-01, ART-02 | **Required** |
| **ART-04** | **C4 Component Diagrams** | `diagrams/component/component-diagram.puml` | Trực quan hóa ranh giới các thành phần phần mềm | SAD, Cấu trúc mã nguồn | Sơ đồ component PlantUML | Solution Architect | **P01** | ART-03 | **Required** |
| **ART-05** | **Relational Database Design** | `docs/05-domain/database-design.md` | Đặc tả cấu trúc bảng, khóa chính, khóa ngoại, chỉ mục PostgreSQL | Conceptual Data Req (SRS) | Lược đồ DDL và mô hình dữ liệu | Data Architect | **P01** | ART-03 | **Required** |
| **ART-06** | **OpenAPI 3.1 Specification** | `docs/08-api/openapi.yaml` | Hợp đồng giao tiếp máy đọc cho toàn bộ REST API endpoints | SAD, Database Design | File OpenAPI YAML chuẩn hóa | API Designer | **P01** | ART-03, ART-05 | **Required** |
| **ART-07** | **Sequence Diagrams** | `diagrams/sequence/chat-interaction.puml` | Mô tả chi tiết trình tự gọi hàm và xử lý Fallback qua các tầng | Workflow SRS, OpenAPI | Sơ đồ tuần tự tương tác chat | System Analyst | **P01** | ART-06 | **Required** |
| **ART-08** | **Security Specification & Threat Model** | `docs/10-security/threat-model.md` | Định danh tài sản, điểm xâm nhập, mối đe dọa và biện pháp kiểm soát | SAD, OpenAPI, Secrets flow | Mô hình đe dọa STRIDE/OWASP | Security Reviewer | **P01** | ART-03, ART-06 | **Required** |
| **ART-09** | **Master Test Plan** | `docs/11-testing/test-plan.md` | Kế hoạch kiểm thử chất lượng, ma trận ca kiểm thử, công cụ | SRS Acceptance Criteria | Chiến lược kiểm thử tự động | QA Lead | **P01** | ART-01, ART-06 | **Required** |
| **ART-10** | **Backend Implementation Plan (`/plan`)** | `work-items/WI-AUTH-impl.md`, `WI-CHAT-impl.md` | Kế hoạch chi tiết từng bước lập trình Backend | SAD, OpenAPI, DoR | Kế hoạch reviewable code step | Senior Dev | **P02..04** | ART-06, ART-08 | **Required** |
| **ART-11** | **Security Audit Report** | `docs/10-security/security-audit-report.md` | Ghi nhận kết quả rà soát lộ lọt bí mật, XSS, Prompt Injection | Mã nguồn sau Phase 04 | Báo cáo đánh giá an ninh độc lập | Security Reviewer | **P05** | Mã nguồn P04 | **Required** |
| **ART-12** | **Load Test Benchmark Report** | `docs/11-testing/load-test-results.md` | Báo cáo đo lường sức chịu tải 100 concurrent users và TTFT | Môi trường test hoàn chỉnh | Biểu đồ hiệu năng và độ trễ | QA Lead | **P05** | ART-09, P04 | **Required** |
| **ART-13** | **Production Docker Compose** | `ai-infra/compose/docker-compose.prod.yml` | Cấu hình đóng gói cụm container môi trường thật | Cấu hình infra hiện hữu | File Compose gia cố an toàn | DevOps Engineer | **P06** | ART-11 | **Required** |
| **ART-14** | **Operations Runbook** | `docs/12-operations/runbook.md` | Hướng dẫn vận hành, giám sát, sao lưu cơ sở dữ liệu định kỳ | Kiến trúc hạ tầng | Cẩm nang vận hành hệ thống | DevOps Engineer | **P06** | ART-13 | **Required** |
| **ART-15** | **Rollback & Disaster Recovery Plan** | `docs/12-operations/rollback-plan.md` | Quy trình khôi phục sự cố và hạ phiên bản khi release lỗi | Cấu hình triển khai | Kế hoạch xử lý sự cố khẩn cấp | DevOps Engineer | **P06** | ART-14 | **Required** |

---

## 2. Tiêu Chí Phân Loại Sản Phẩm Chuyển Giao

1. **Required (Bắt Buộc)**:
   - Các tài liệu bắt buộc phải tồn tại và được thẩm định đạt yêu cầu trước khi chuyển sang giai đoạn phát triển kế tiếp. Bao gồm: `SRS`, `PDP`, `SAD`, `OpenAPI Spec`, `Database Design`, `Test Plan`, `Security Report` và `Runbook`.
2. **Conditional (Có Điều Kiện)**:
   - Chỉ phát sinh khi có sự thay đổi phạm vi hoặc khi rủi ro kích hoạt:
     - Kế hoạch chuyển đổi dữ liệu (`Migration Plan`) chỉ cần khi có thay đổi cấu trúc bảng sau phiên bản 1.
3. **Future (Tương Lai)**:
   - Tài liệu đặc tả tích hợp File Upload (RAG) và Cổng quản trị Admin Portal (chỉ phát triển ở các phiên bản tiếp theo).
