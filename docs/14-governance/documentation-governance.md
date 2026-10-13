# Quy Chế Quản Trị Tài Liệu & Vòng Đời Thay Đổi (Documentation Governance)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã tài liệu** | `GOV-POL-001` |
| **Giai đoạn** | **Phase 14 — Governance & Lifecycle Management** |
| **Phụ thuộc Thượng nguồn** | Toàn bộ chuỗi tài liệu từ Phase 00 đến Phase 13 |
| **Trạng thái** | **BASELINED** |

---

## 1. Nguyên Tắc Cốt Lõi Về Nguồn Chân Lý (Source of Truth Hierarchy)

Hệ thống tài liệu tuân thủ thứ bậc ưu tiên nghiêm ngặt theo quy định kỹ thuật:
1. **Yêu cầu & Tiêu chí nghiệm thu đã được phê duyệt**: Nguồn chân lý cao nhất về phạm vi chức năng (`docs/02-requirements/`).
2. **Quy tắc nghiệp vụ & Quyết định kiến trúc đã phê duyệt**: Ràng buộc bất biến (`docs/06-architecture/ADR/`, `docs/07-domain/domain-rules.md`).
3. **Mã nguồn, Cấu hình hạ tầng & Schema hiện hữu**: Minh chứng xác thực cho hành vi đang vận hành (`ai-infra/compose/docker-compose.yml`, `models/`).
4. **Mô hình chuẩn hóa (Canonical Models)**: Thư mục `models/` là lớp mô hình chuẩn định dạng máy đọc (YAML). Thư mục `docs/` là lớp tài liệu người đọc. Thư mục `diagrams/` là các hình ảnh/sơ đồ chiếu.
5. **Suy luận AI**: Chỉ được xem là `ASSUMPTION` (Giả định) cho đến khi được con người phê duyệt thành `DECISION` hoặc `FACT`.

---

## 2. Quy Trình Vòng Đời Quản Lý Thay Đổi (Change Lifecycle Workflow)

Mọi yêu cầu thay đổi (Change Request - CR) trong hệ thống đều phải trải qua quy trình 13 bước khép kín:

```
[1. Tiếp nhận & Phân loại]
        ↓
[2. Khảo sát hiện trạng (Evidence Discovery)]
        ↓
[3. Phân tích tác động (Impact Analysis)]
        ↓
[4. Chọn Artifacts cần cập nhật từ Artifact Matrix]
        ↓
[5. Cập nhật Yêu cầu / Mô hình / Thiết kế]
        ↓
[6. Cập nhật Sơ đồ & Hợp đồng giao tiếp (Contracts)]
        ↓
[7. Thẩm định chéo (Cross-Validation)]
        ↓
[8. Lập kế hoạch triển khai (Implementation Plan)]
        ↓
[9. Duyệt qua Cổng phê duyệt (Gate Approval)]
        ↓
[10. Lập trình (Implementation) - Coding Phase]
        ↓
[11. Kiểm thử xác minh (Verification)]
        ↓
[12. Đồng bộ hóa Mô hình & Tài liệu (Synchronization)]
        ↓
[13. Đánh giá sẵn sàng phát hành (Release Readiness)]
```

---

## 3. Chính Sách Quản Lý Mã Định Danh Bất Biến (Stable Identifier Policy)

Mọi thực thể kỹ thuật phải mang mã định danh cố định, duy nhất và được bảo tồn qua các phiên bản:

| Tiền Tố (Prefix) | Ý Nghĩa Thực Thể | Thư Mục Quản Lý | Ví Dụ Mã |
| :--- | :--- | :--- | :--- |
| `FR-###` | Functional Requirement (Yêu cầu chức năng) | `docs/02-requirements/` | `FR-001`, `FR-013` |
| `NFR-###` | Non-Functional Requirement (Phi chức năng) | `docs/02-requirements/` | `NFR-001`, `NFR-005` |
| `BR-###` | Business Rule (Quy tắc nghiệp vụ) | `docs/02-requirements/` | `BR-001`, `BR-006` |
| `SEC-###` | Security Requirement (Yêu cầu an ninh) | `docs/02-requirements/`, `docs/10-security/` | `SEC-001`, `SEC-005` |
| `UX-###` | User Experience Requirement (Trải nghiệm UI) | `docs/11-ux/` | `UX-001`, `UX-005` |
| `UC-###` | Use Case (Trường hợp sử dụng) | `docs/04-use-cases/` | `UC-001`, `UC-009` |
| `PROC-###` | Business Process (Quy trình nghiệp vụ) | `docs/03-business-process/` | `PROC-001`, `PROC-010` |
| `DOM-###` | Domain Model Entity / Value Object | `docs/07-domain/` | `DOM-001`, `DOM-004` |
| `ARCH-###` | Architecture Component / Boundary | `docs/06-architecture/` | `ARCH-001` |
| `API-###` | API Contract Endpoint | `docs/08-api/` | `API-001`, `API-008` |
| `SEQ-###` | Sequence Interaction Scenario | `docs/09-behavior/` | `SEQ-001`, `SEQ-004` |
| `STATE-###` | Lifecycle State Machine | `docs/09-behavior/` | `STATE-001`, `STATE-003` |
| `THR-###` | Threat Model STRIDE Entry | `docs/10-security/` | `THR-001`, `THR-006` |
| `CTRL-###` | Security Defense Control | `docs/10-security/` | `CTRL-001`, `CTRL-006` |
| `TC-###` | Test Case (Ca kiểm thử) | `docs/12-testing/` | `TC-001`, `TC-015` |
| `ADR-###` | Architecture Decision Record | `docs/06-architecture/ADR/` | `ADR-001`, `ADR-004` |
| `DEP-###` | Deployment Node / Topology Policy | `docs/13-operations/` | `DEP-001`, `DEP-002` |

---

## 4. Kiểm Soát Tính Toàn Vẹn Tự Động (Automated Integrity Gates)

Mỗi khi có cập nhật tài liệu hoặc mô hình, bộ script kiểm tra tự động phải được thực thi:
```bash
python tools/validators/run_all.py
```
Điều kiện bắt buộc:
- **0 errors**: Cú pháp YAML, cấu trúc thư mục, hook registry và artifact matrix phải hoàn toàn chuẩn xác.
- **0 traceability review findings**: Không có mã định danh mồ côi (xuất hiện dưới 2 tài liệu).
