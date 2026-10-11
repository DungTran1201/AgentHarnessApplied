# Phiếu Đăng Ký Yêu Cầu Thay Đổi (Change Request Record)
## CR-005: Xây Dựng Phân Hệ Quản Lý Tài Nguyên & Màn Hình Dashboard Thời Gian Thực

---

| Thông Tin Quản Trị | Chi Tiết |
| :--- | :--- |
| **Mã Thay Đổi** | `CR-005` |
| **Loại Thay Đổi** | `feature_extension` |
| **Mức Độ Rủi Ro** | `R2` (Phê duyệt tài liệu kiến trúc, mô hình dữ liệu, hợp đồng API & sơ đồ kỹ thuật) |
| **Ngày Đăng Ký** | 2026-10-10 |
| **Trạng Thái** | **`DESIGN_APPROVED` (Đã hoàn thiện đầy đủ tài liệu & biểu đồ, sẵn sàng triển khai)** |
| **Phạm Vi Thực Hiện** | **CHỈ TÀI LIỆU, MÔ HÌNH VÀ BIỂU ĐỒ (NO CODING / NO SOURCE CODE CHANGES)** |

---

## 1. Bối Cảnh & Mục Tiêu Thay Đổi (Reason & Objective)
- **Bối cảnh**: Hệ thống AI-Chan đã vận hành đàm thoại đa mô hình LLM và quản lý tài khoản người dùng hoàn chỉnh. Tuy nhiên, việc sử dụng các dịch vụ AI bên ngoài tiềm ẩn rủi ro cạn kiệt tài nguyên (Token Exhaustion, Quota Limits), độ trễ phản hồi dao động lớn (Latency, TTFT) và thiếu công cụ theo dõi lưu lượng theo thời gian thực cho cả người dùng và quản trị viên.
- **Mục tiêu**:
  1. **Đo lường độ trễ chi tiết**: Thu thập chính xác thời gian hoàn thành API (`latency_ms`) và độ trễ nhận ký tự đầu tiên (`ttft_ms`) của luồng SSE (`FR-029`).
  2. **Kiểm soát & Thống kê Token**: Đo lường chính xác `prompt_tokens`, `completion_tokens`, `total_tokens` tiêu hao theo từng phiên đàm thoại và phân bổ theo từng nhà cung cấp/mô hình (`FR-030`).
  3. **Theo dõi lưu lượng API**: Ghi nhận số lượng yêu cầu (Requests count), tần suất theo phút (RPM), và phân bố mã trạng thái HTTP (2xx, 4xx, 5xx) (`FR-031`).
  4. **Quản lý Hạn ngạch (Quota Guard)**: Thiết lập hạn mức token hằng ngày (`daily_token_limit`), cảnh báo khi chạm 80% và chặn cưỡng chế mã HTTP 429 khi chạm 100% hạn ngạch (`FR-032`, `BR-020`, `CTRL-008`).
  5. **Cung cấp luồng dữ liệu thời gian thực (SSE Stream)**: Phát dữ liệu telemetry theo từng giây thông qua Server-Sent Events tại endpoint `GET /api/v1/resources/stream` (`FR-033`, `SEC-009`).
  6. **Màn hình Dashboard tương tác trực quan**: Cung cấp giao diện trực quan tại `/dashboard` hiển thị biểu đồ độ trễ, đồng hồ đo hạn ngạch quota, biểu đồ cột tiêu thụ token theo mô hình và bảng nhật ký yêu cầu thời gian thực (`FR-034`, `UX-007`).

---

## 2. Ma Trận Tác Động Tài Liệu (Impacted Artifacts Matrix)

| Phân Vùng | Tệp Hồ Sơ Kỹ Thuật | Mức Độ Tác Động | Hành Động Đã Thực Hiện |
| :--- | :--- | :--- | :--- |
| **Canonical Models** | `models/requirements/requirements.yaml` | `DIRECT` | **EXTEND**: Thêm `FR-029` .. `FR-034`, `BR-019` .. `BR-021`, `SEC-009`. |
| **Canonical Models** | `models/domain/domain.yaml` | `DIRECT` | **EXTEND**: Thêm thực thể `ApiMetricLog`, `UserQuota` và quan hệ liên kết. |
| **Canonical Models** | `models/architecture/architecture.yaml` | `DIRECT` | **UPDATE**: Mở rộng trách nhiệm telemetry cho `COMP-001`, `COMP-002` và đăng ký `ADR-008`. |
| **Canonical Models** | `models/process/processes.yaml` | `DIRECT` | **ADD**: Bổ sung quy trình `PROC-015` (`BP-RES-001`) và `PROC-016` (`BP-RES-002`). |
| **Canonical Models** | `models/api/api.yaml` | `DIRECT` | **ADD**: Thêm các thao tác `OP-018`, `OP-019`, `OP-020`, `OP-021`. |
| **Canonical Models** | `models/testing/testing.yaml` | `DIRECT` | **ADD**: Thêm kịch bản `SCENARIO-RESOURCE-MANAGEMENT` và các ca kiểm thử `TC-024`, `TC-025`, `TC-026`. |
| **Canonical Models** | `models/interaction/interactions.yaml` | `DIRECT` | **ADD**: Bổ sung kịch bản tương tác `SEQ-007`. |
| **Canonical Models** | `models/ux/ux.yaml` | `DIRECT` | **UPDATE**: Thêm màn hình `SCR-003`, luồng `FLOW-RESOURCE-MONITOR` và yêu cầu `UX-007`. |
| **Phase 02: Requirements**| `docs/02-requirements/functional-requirements.md` | `DIRECT` | **EXTEND**: Đặc tả chi tiết 6 yêu cầu `FR-029` .. `FR-034`. |
| **Phase 02: Requirements**| `docs/02-requirements/business-rules.md` | `DIRECT` | **EXTEND**: Bổ sung quy tắc nghiệp vụ `BR-019`, `BR-020`, `BR-021`. |
| **Phase 02: Requirements**| `docs/02-requirements/non-functional-requirements.md`| `DIRECT` | **EXTEND**: Bổ sung yêu cầu phi chức năng `NFR-020`, `NFR-021`. |
| **Phase 02: Requirements**| `docs/02-requirements/requirement-traceability.md`| `DIRECT` | **UPDATE**: Đồng bộ ma trận truy vết toàn diện cho toàn bộ mã định danh mới. |
| **Phase 03: Process** | `docs/03-business-process/business-process-catalog.md` | `DIRECT` | **ADD**: Thêm quy trình `BP-RES-001 [PROC-015]` và `BP-RES-002 [PROC-016]`. |
| **Phase 03: Process** | `docs/03-business-process/business-rules-mapping.md` | `DIRECT` | **UPDATE**: Ánh xạ quy tắc `BR-019`, `BR-020`, `BR-021`. |
| **Phase 04: Use Cases** | `docs/04-use-cases/use-case-catalog.md` | `DIRECT` | **EXTEND**: Bổ sung `UC-RES-001 [UC-023]`, `UC-RES-002 [UC-024]`, `UC-RES-003 [UC-025]`. |
| **Phase 04: Use Cases** | `docs/04-use-cases/specifications/` | `DIRECT` | **ADD**: Tạo mới đặc tả chi tiết `UC-RES-001-monitor-realtime-dashboard.md`. |
| **Phase 06: Architecture**| `docs/06-architecture/ADR/` | `DIRECT` | **ADD**: Tạo mới bản ghi quyết định kiến trúc `ADR-008-resource-telemetry-and-realtime-dashboard.md`. |
| **Phase 06: Architecture**| `docs/06-architecture/decisions.md` | `DIRECT` | **UPDATE**: Cập nhật danh mục quyết định với `ADR-008`. |
| **Phase 07: Domain** | `docs/07-domain/entities.md` | `DIRECT` | **UPDATE**: Cập nhật mô hình thực thể `ApiMetricLog` và `UserQuota`. |
| **Phase 08: API** | `docs/08-api/api-specifications.md` | `DIRECT` | **ADD**: Đặc tả chi tiết 4 endpoints `OP-018` .. `OP-021`. |
| **Phase 10: Security** | `docs/10-security/security-specification.md` | `DIRECT` | **UPDATE**: Bổ sung đặc tả bảo mật luồng metrics `SEC-009`. |
| **Phase 10: Security** | `docs/10-security/security-controls.md` | `DIRECT` | **ADD**: Bổ sung biện pháp kiểm soát hạn ngạch `CTRL-008`. |
| **Phase 11: UX** | `docs/11-ux/ui-interaction-specs.md` | `DIRECT` | **UPDATE**: Đặc tả chi tiết giao diện màn hình Dashboard `UX-007`. |
| **Phase 12: Testing** | `docs/12-testing/test-cases.md` | `DIRECT` | **ADD**: Đặc tả ca kiểm thử `TC-024`, `TC-025`, `TC-026`. |
| **Phase 14: Governance**| `docs/14-governance/decision-log.md` | `DIRECT` | **ADD**: Ghi nhận quyết định điều hành `DEC-011`. |
| **Diagrams (BPMN)** | `diagrams/bpmn/resource-management-bpmn.md` | `DIRECT` | **ADD**: Tạo sơ đồ BPMN `DIAG-BPMN-009` cho quy trình thu thập và hiển thị tài nguyên. |
| **Diagrams (Swimlane)** | `diagrams/swimlane/resource-management-swimlane.md`| `DIRECT` | **ADD**: Tạo sơ đồ Swimlane `DIAG-SWIM-006` phân làn tương tác. |
| **Diagrams (Sequence)** | `diagrams/sequence/resource-telemetry-sequence.md` | `DIRECT` | **ADD**: Tạo sơ đồ tuần tự `SEQ-007` mô tả luồng SSE stream và telemetry capture. |
| **Diagrams (State)** | `diagrams/state/quota-lifecycle-state.md` | `DIRECT` | **ADD**: Tạo sơ đồ máy trạng thái hạn ngạch Quota `DIAG-STATE-005` (`STATE-005`). |

---

## 3. Ràng Buộc Kỹ Thuật Đã Tuân Thủ Nghiêm Ngặt (Hard Rules Adherence)
- [x] **NO CODING / NO SOURCE CODE CHANGES**: Tuyệt đối không can thiệp mã nguồn ứng dụng trong đợt yêu cầu này.
- [x] **PRESERVE STABLE IDENTIFIERS**: Giữ nguyên tính liên tục của hệ thống mã: `FR-029..034`, `NFR-020..021`, `BR-019..021`, `SEC-009`, `CTRL-008`, `UX-007`, `UC-023..025`, `PROC-015..016`, `OP-018..021`, `ADR-008`, `DEC-011`, `SEQ-007`, `STATE-005`, `TC-024..026`.
- [x] **SOURCE OF TRUTH HIERARCHY**: Cập nhật tầng mô hình Canonical `models/` trước, kế tiếp là tài liệu `docs/`, và ánh xạ qua các góc nhìn trực quan `diagrams/`.
- [x] **TRACEABILITY COMPLIANCE**: Đảm bảo 100% các mã định danh đều xuất hiện ở tối thiểu 2 tài liệu nhằm vượt qua công cụ kiểm tra tự động `tools/validators/run_all.py`.
