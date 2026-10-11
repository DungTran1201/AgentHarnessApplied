# CỔNG KIỂM SOÁT CHẤT LƯỢNG DỰ ÁN (QUALITY GATES SPECIFICATION)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `QG-SPEC-001` |
| **Tiêu chuẩn căn cứ** | [.agents/config/phase-gates.yaml](file:///c:/Users/PC/Project/ai-chan/.agents/config/phase-gates.yaml) |
| **Mục đích** | Thiết lập các cổng kiểm soát kỹ thuật nghiêm ngặt (Quality Gates) ngăn chặn việc chuyển giao sản phẩm lỗi hoặc chưa đủ bằng chứng sang giai đoạn sau |

---

## 1. Sơ Đồ Hệ Thống Các Cổng Kiểm Soát Chất Lượng (Quality Gates Framework)

```text
[Yêu cầu & Khảo sát] ──► G0: DISCOVERY GATE ──► G1: REQUIREMENT GATE
                                                       │
                                                       ▼
[Triển khai Mã nguồn] ◄── G3: PLAN REVIEW GATE ◄── G2: DESIGN GATE
         │
         ▼
    G4: IMPLEMENT GATE ──► G5: VERIFY GATE ──► G6: RELEASE GATE ──► [SẢN PHẨM SẢN XUẤT]
```

---

## 2. Đặc Tả Chi Tiết Từng Cổng Kiểm Soát (Gate Specifications)

---

### CỔNG G0: KHẢO SÁT & XÁC ĐỊNH HIỆN TRẠNG (G0_DISCOVERY)
- **Điều Kiện Vào (Entry Criteria)**: Tiếp nhận yêu cầu dự án Website Chatbot Trợ lý ảo từ người dùng hoặc Product Owner.
- **Tài Liệu Bắt Buộc (Required Documents)**:
  - Bảng khảo sát hiện trạng: `docs/00-discovery/current-db-observations.md`.
- **Người Thẩm Định (Required Reviewer)**: `discovery-analyst`, Senior BA.
- **Bằng Chứng Bắt Buộc (Required Evidence)**:
  - Bảng bằng chứng (Evidence Register) phân biệt rõ ràng: `FACT`, `ASSUMPTION`, `DECISION`, `OPEN QUESTION`.
  - Xác định các hệ thống bên ngoài tiềm năng (Google Gemini, OpenAI).
- **Tiêu Chí Thoát Cổng (Exit Criteria)**:
  - Hiểu rõ ranh giới hiện trạng, không nhầm lẫn giữa code đã có và tính năng chưa có.
  - Các nghi vấn schema hay mã nguồn cũ được ghi nhận đầy đủ.

---

### CỔNG G1: ĐẶC TẢ YÊU CẦU NGHIỆP VỤ (G1_REQUIREMENT)
- **Điều Kiện Vào (Entry Criteria)**: Cổng G0 đã được phê duyệt.
- **Tài Liệu Bắt Buộc (Required Documents)**:
  - [docs/SRS.md](file:///c:/Users/PC/Project/ai-chan/docs/SRS.md) hoàn chỉnh 15 chương.
- **Người Thẩm Định (Required Reviewer)**: Product Owner, Senior BA, Solution Architect.
- **Bằng Chứng Bắt Buộc (Required Evidence)**:
  - Danh mục Functional Requirements (`FR-001` -> `FR-011`) có đầy đủ Preconditions, Flow, Postconditions.
  - Danh mục Business Rules (`BR-001` -> `BR-006`) và NFRs đo lường được.
  - Bộ tiêu chí nghiệm thu cấp cao (`AC-001` -> `AC-005`).
- **Tiêu Chí Thoát Cổng (Exit Criteria)**:
  - 100% các bên liên quan thống nhất phạm vi In-Scope, Out-of-Scope và MVP.
  - Vượt qua kiểm tra tự động `tools/validators/validate_docs.py` (0 lỗi).

---

### CỔNG G2: THIẾT KẾ KIẾN TRÚC & HỢP ĐỒNG (G2_DESIGN)
- **Điều Kiện Vào (Entry Criteria)**: Cổng G1 đã được phê duyệt; bộ tài liệu Planning tại `docs/01-planning/` đã hoàn tất.
- **Tài Liệu Bắt Buộc (Required Documents)**:
  - System Architecture Document (SAD): `docs/07-architecture/system-architecture-document.md`.
  - Hợp đồng giao tiếp: `docs/08-api/openapi.yaml`.
  - Thiết kế cơ sở dữ liệu: `docs/05-domain/database-design.md`.
  - Mô hình đe dọa an ninh: `docs/10-security/threat-model.md`.
- **Người Thẩm Định (Required Reviewer)**: `architecture-modeler`, `security-reviewer`, Solution Architect.
- **Bằng Chứng Bắt Buộc (Required Evidence)**:
  - Sơ đồ C4 Component và Sequence Diagram tương thích với kiến trúc 3 tầng.
  - Lược đồ cơ sở dữ liệu PostgreSQL chuẩn hóa, không có khóa ngoại mồ côi.
  - Toàn bộ endpoints trong OpenAPI có schema request/response đầy đủ.
- **Tiêu Chí Thoát Cổng (Exit Criteria)**:
  - Vượt qua kiểm tra `tools/validators/validate_models.py` và `validate_traceability.py`.
  - Không còn bất đồng kiến trúc giữa Frontend và Backend.

---

### CỔNG G3: XEM XÉT KẾ HOẠCH TRIỂN KHAI (G3_PLAN_REVIEW)
- **Điều Kiện Vào (Entry Criteria)**: Cổng G2 đã được phê duyệt.
- **Tài Liệu Bắt Buộc (Required Documents)**:
  - Implementation Plan cụ thể (`work-items/WI-*.md`) sinh ra từ lệnh Antigravity `/plan`.
- **Người Thẩm Định (Required Reviewer)**: Tech Lead, Kỹ sư phụ trách, Senior Dev (`ponytail` mode).
- **Bằng Chứng Bắt Buộc (Required Evidence)**:
  - Kế hoạch chia nhỏ từng tệp cần tạo/sửa, không tạo abstraction thừa.
  - Có sẵn kịch bản kiểm thử đơn vị tự chạy (Runnable self-check).
  - Có kế hoạch lùi bước (Rollback/Revert) nếu sửa đổi thất bại.
- **Tiêu Chí Thoát Cổng (Exit Criteria)**:
  - Con người (Human) phê duyệt Implementation Plan trước khi Agent bắt đầu viết code.

---

### CỔNG G4: THỰC THI LẬP TRÌNH (G4_IMPLEMENT)
- **Điều Kiện Vào (Entry Criteria)**: Kế hoạch triển khai đã được duyệt tại G3.
- **Tài Liệu & Mã Nguồn Bắt Buộc**:
  - Mã nguồn thực thi tại `ai-backend/`, `ai-frontend/`, `ai-infra/`.
  - File di chuyển lược đồ dữ liệu nếu có thay đổi DB.
- **Người Thẩm Định (Required Reviewer)**: Peer Reviewer, Linter, Static Code Analysis.
- **Bằng Chứng Bắt Buộc (Required Evidence)**:
  - Mã nguồn tuân thủ nguyên tắc `ponytail`: Diff ngắn nhất, tận dụng helper sẵn có, sửa tận gốc.
  - Không hardcode bí mật, không commit file `.env` chứa secret thật.
  - Đạt chuẩn linter (flake8/black cho Python, eslint cho Next.js).
- **Tiêu Chí Thoát Cổng (Exit Criteria)**: Mã nguồn biên dịch thành công, không có lỗi cú pháp hoặc cảnh báo nghiêm trọng.

---

### CỔNG G5: XÁC MINH & KIỂM THỬ CHẤT LƯỢNG (G5_VERIFY)
- **Điều Kiện Vào (Entry Criteria)**: Triển khai mã nguồn tại G4 đã hoàn thành.
- **Tài Liệu Bắt Buộc (Required Documents)**:
  - Báo cáo kết quả kiểm thử: `docs/11-testing/test-results.md`.
  - Báo cáo kiểm thử tải: `docs/11-testing/load-test-results.md`.
  - Báo cáo kiểm toán an ninh: `docs/10-security/security-audit-report.md`.
- **Người Thẩm Định (Required Reviewer)**: `qa-reviewer`, `security-reviewer`, Independent Auditor.
- **Bằng Chứng Bắt Buộc (Required Evidence)**:
  - 100% các tiêu chí nghiệm thu `AC-001` -> `AC-005` được kiểm chứng và đạt (Pass).
  - Kiểm thử chịu tải 100 concurrent users đạt yêu cầu độ trễ.
  - Kiểm thử rò rỉ secret và tiêm nhiễm prompt injection không phát hiện lỗi.
  - Đồng bộ lại toàn bộ tài liệu và mô hình (`models/` và `docs/`).
- **Tiêu Chí Thoát Cổng (Exit Criteria)**:
  - Chạy `python tools/validators/run_all.py` đạt `0 failed checks`.

---

### CỔNG G6: SẴN SÀNG PHÁT HÀNH (G6_RELEASE)
- **Điều Kiện Vào (Entry Criteria)**: Cổng G5 đã hoàn tất nghiệm thu không có lỗi chặn (No blockers).
- **Tài Liệu Bắt Buộc (Required Documents)**:
  - Sổ tay vận hành: `docs/12-operations/runbook.md`.
  - Kế hoạch khôi phục: `docs/12-operations/rollback-plan.md`.
  - Báo cáo trạng thái bàn giao: `docs/14-governance/artifact-status.md`.
- **Người Thẩm Định (Required Reviewer)**: Product Owner, Lead DevOps, Security Officer.
- **Bằng Chứng Bắt Buộc (Required Evidence)**:
  - Cụm container Production khởi động sạch, health check `/api/v1/health` trả HTTP 200.
  - Cấu hình HTTPS TLS 1.3 và Rate Limiting 2 tầng hoạt động hoàn hảo.
  - Toàn bộ rủi ro và câu hỏi mở đã được giải quyết hoặc chấp nhận chính thức bằng văn bản.
- **Tiêu Chí Thoát Cổng (Exit Criteria)**: Hệ thống chính thức sẵn sàng đưa vào vận hành thực tế.
