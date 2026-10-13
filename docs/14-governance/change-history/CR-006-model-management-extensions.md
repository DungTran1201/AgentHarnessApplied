# Phiếu Đăng Ký Yêu Cầu Thay Đổi (Change Request Record)
## CR-006: Mở Rộng Nhánh Quản Lý Mô Hình (Thêm, Chỉnh Sửa, Tìm Kiếm, Bộ Lọc & Lưu Trữ Mô Hình)

---

| Thông Tin Quản Trị | Chi Tiết |
| :--- | :--- |
| **Mã Thay Đổi** | `CR-006` |
| **Loại Thay Đổi** | `feature_extension` |
| **Mức Độ Rủi Ro** | `R2` (Phê duyệt tài liệu kiến trúc, mô hình dữ liệu, hợp đồng API & sơ đồ kỹ thuật) |
| **Ngày Đăng Ký** | 2026-10-10 |
| **Trạng Thái** | **`DESIGN_APPROVED` (Đã hoàn thiện đầy đủ tài liệu & biểu đồ, sẵn sàng triển khai)** |
| **Phạm Vi Thực Hiện** | **CHỈ TÀI LIỆU, MÔ HÌNH VÀ BIỂU ĐỒ (NO CODING / NO SOURCE CODE CHANGES)** |

---

## 1. Bối Cảnh & Mục Tiêu Thay Đổi (Reason & Objective)
- **Bối cảnh**: Hệ thống AI-Chan trước đây chỉ hỗ trợ xem danh mục mô hình tĩnh được nạp từ biến môi trường (`.env`), kiểm tra ping kết nối và bật/tắt kích hoạt (`FR-021` đến `FR-026`). Khi số lượng mô hình AI gia tăng từ nhiều nhà cung cấp khác nhau (Google Gemini, Anthropic Claude, OpenAI, Groq, Ollama, Custom), người dùng và quản trị viên gặp khó khăn trong việc mở rộng mô hình mới, tinh chỉnh tham số context window / max tokens, cũng như nhanh chóng tìm kiếm và sàng lọc các mô hình phù hợp theo nhu cầu sử dụng thực tế.
- **Mục tiêu**:
  1. **Thêm mô hình mới (Register & Add Model)**: Cung cấp khả năng khai báo và đăng ký mô hình AI mới vào danh mục hệ thống với kiểm tra tính duy nhất của mã định danh (`FR-035`, `BR-022`, `OP-022`, `UC-026`).
  2. **Chỉnh sửa thông tin mô hình (Edit Model Configuration)**: Cho phép hiệu chỉnh tên hiển thị, giới hạn context window, max tokens và cờ hỗ trợ streaming; đồng thời áp dụng quy tắc bất biến đối với ID và Nhà cung cấp (`FR-036`, `BR-022`, `BR-024`, `OP-023`, `UC-027`).
  3. **Tìm kiếm toàn văn & tìm kiếm mờ (Full-Text & Fuzzy Search)**: Tìm kiếm tức thì theo tên hiển thị và mã định danh mô hình với cơ chế debounce trên giao diện và độ trễ thấp (`FR-037`, `NFR-022`, `OP-024`, `UC-028`).
  4. **Bộ lọc thông tin đa thuộc tính (Multi-Attribute Filtering & Sorting)**: Sàng lọc linh hoạt theo nhà cung cấp (provider), trạng thái hoạt động (status), trạng thái có khóa API (has_api_key), mô hình mặc định (is_default), cùng sắp xếp theo độ trễ hoặc dung lượng context (`FR-038`, `OP-024`, `UC-028`).
  5. **Xóa mềm và bảo vệ mô hình mặc định (Soft Delete & Archive Guard)**: Hỗ trợ chuyển trạng thái mô hình sang `ARCHIVED` (không xóa vật lý trong cơ sở dữ liệu), có chốt chặn ngăn chặn tuyệt đối việc xóa hoặc lưu trữ mô hình đang được đặt làm mặc định (`FR-039`, `BR-023`, `OP-025`, `UC-027`).
  6. **Đảm bảo toàn vẹn kiến trúc & an ninh**: Kiểm soát quyền chỉnh sửa, phòng chống tấn công chèn tham số độc hại và bảo vệ tính sẵn sàng của hệ sinh thái AI (`SEC-010`, `CTRL-009`, `ADR-009`).

---

## 2. Ma Trận Tác Động Tài Liệu (Impacted Artifacts Matrix)

| Phân Vùng | Tệp Hồ Sơ Kỹ Thuật | Mức Độ Tác Động | Hành Động Đã Thực Hiện |
| :--- | :--- | :--- | :--- |
| **Canonical Models** | `models/requirements/requirements.yaml` | `DIRECT` | **EXTEND**: Thêm `FR-035` .. `FR-039`, `BR-022` .. `BR-024`, `SEC-010`. |
| **Canonical Models** | `models/domain/domain.yaml` | `DIRECT` | **UPDATE**: Mở rộng trạng thái `AgentModel` với giá trị `ARCHIVED`. |
| **Canonical Models** | `models/architecture/architecture.yaml` | `DIRECT` | **UPDATE**: Mở rộng trách nhiệm cho `COMP-002` và đăng ký `ADR-009`. |
| **Canonical Models** | `models/process/processes.yaml` | `DIRECT` | **ADD**: Bổ sung quy trình `PROC-017` (`BP-MOD-001`) và `PROC-018` (`BP-MOD-002`). |
| **Canonical Models** | `models/api/api.yaml` | `DIRECT` | **ADD**: Thêm các thao tác `OP-022`, `OP-023`, `OP-024`, `OP-025`. |
| **Canonical Models** | `models/testing/testing.yaml` | `DIRECT` | **ADD**: Thêm các ca kiểm thử `TC-027`, `TC-028`, `TC-029`, `TC-030`. |
| **Canonical Models** | `models/interaction/interactions.yaml` | `DIRECT` | **ADD**: Bổ sung kịch bản tương tác `SEQ-008`. |
| **Canonical Models** | `models/ux/ux.yaml` | `DIRECT` | **UPDATE**: Thêm màn hình `SCR-004`, luồng `FLOW-MODEL-MANAGE` và yêu cầu `UX-008`. |
| **Phase 02: Requirements**| `docs/02-requirements/functional-requirements.md` | `DIRECT` | **EXTEND**: Đặc tả chi tiết 5 yêu cầu `FR-035` .. `FR-039`. |
| **Phase 02: Requirements**| `docs/02-requirements/business-rules.md` | `DIRECT` | **EXTEND**: Bổ sung quy tắc nghiệp vụ `BR-022`, `BR-023`, `BR-024`. |
| **Phase 02: Requirements**| `docs/02-requirements/non-functional-requirements.md`| `DIRECT` | **EXTEND**: Bổ sung yêu cầu phi chức năng hiệu năng truy vấn `NFR-022`. |
| **Phase 02: Requirements**| `docs/02-requirements/requirement-traceability.md`| `DIRECT` | **UPDATE**: Đồng bộ ma trận truy vết toàn diện cho toàn bộ mã định danh mới. |
| **Phase 03: Process** | `docs/03-business-process/business-process-catalog.md` | `DIRECT` | **ADD**: Thêm quy trình `BP-MOD-001 [PROC-017]` và `BP-MOD-002 [PROC-018]`. |
| **Phase 03: Process** | `docs/03-business-process/business-rules-mapping.md` | `DIRECT` | **UPDATE**: Ánh xạ quy tắc `BR-022`, `BR-023`, `BR-024`. |
| **Phase 04: Use Cases** | `docs/04-use-cases/use-case-catalog.md` | `DIRECT` | **EXTEND**: Bổ sung `UC-MOD-001 [UC-026]`, `UC-MOD-002 [UC-027]`, `UC-MOD-003 [UC-028]`. |
| **Phase 04: Use Cases** | `docs/04-use-cases/specifications/` | `DIRECT` | **ADD**: Tạo mới đặc tả chi tiết `UC-MOD-001-add-and-manage-models.md`. |
| **Phase 06: Architecture**| `docs/06-architecture/ADR/` | `DIRECT` | **ADD**: Tạo mới bản ghi kiến trúc `ADR-009-extensible-model-management-search-filter.md`. |
| **Phase 06: Architecture**| `docs/06-architecture/decisions.md` | `DIRECT` | **UPDATE**: Cập nhật danh mục quyết định với `ADR-009`. |
| **Phase 07: Domain** | `docs/07-domain/entities.md` | `DIRECT` | **UPDATE**: Cập nhật mô hình thực thể `AgentModel` với trạng thái `ARCHIVED`. |
| **Phase 08: API** | `docs/08-api/api-specifications.md` | `DIRECT` | **ADD**: Đặc tả chi tiết 4 endpoints `OP-022`, `OP-023`, `OP-024`, `OP-025`. |
| **Phase 09: Behavior**| `docs/09-behavior/state-machines.md` | `DIRECT` | **UPDATE**: Cập nhật máy trạng thái vòng đời mô hình với trạng thái `ARCHIVED`. |
| **Phase 10: Security** | `docs/10-security/security-specification.md` | `DIRECT` | **UPDATE**: Bổ sung yêu cầu bảo mật quản lý cấu hình mô hình `SEC-010`. |
| **Phase 10: Security** | `docs/10-security/security-controls.md` | `DIRECT` | **ADD**: Bổ sung biện pháp kiểm soát `CTRL-009`. |
| **Phase 11: UX** | `docs/11-ux/ui-interaction-specs.md` | `DIRECT` | **UPDATE**: Đặc tả chi tiết giao diện màn hình quản lý mô hình `UX-008`. |
| **Phase 12: Testing** | `docs/12-testing/test-cases.md` | `DIRECT` | **ADD**: Đặc tả ca kiểm thử `TC-027`, `TC-028`, `TC-029`, `TC-030`. |
| **Phase 14: Governance**| `docs/14-governance/decision-log.md` | `DIRECT` | **ADD**: Ghi nhận quyết định điều hành `DEC-012`. |
| **Diagrams (BPMN)** | `diagrams/bpmn/model-management-bpmn.md` | `DIRECT` | **ADD**: Tạo sơ đồ BPMN `DIAG-BPMN-010` cho quy trình đăng ký, hiệu chỉnh và tìm kiếm mô hình. |
| **Diagrams (Swimlane)** | `diagrams/swimlane/model-management-swimlane.md`| `DIRECT` | **ADD**: Tạo sơ đồ Swimlane `DIAG-SWIM-007` phân làn giữa User, UI, API Gateway và Model Store. |
| **Diagrams (Sequence)** | `diagrams/sequence/model-mutation-sequence.md` | `DIRECT` | **ADD**: Tạo sơ đồ tuần tự `SEQ-008` (`DIAG-SEQ-008`) mô tả chi tiết luồng CRUD và lọc mô hình. |
| **Diagrams (State)** | `diagrams/state/model-lifecycle-extended-state.md`| `DIRECT` | **ADD**: Tạo sơ đồ máy trạng thái `DIAG-STATE-006` vòng đời mô hình mở rộng. |
| **Diagrams Index** | `diagrams/README.md` | `DIRECT` | **UPDATE**: Đăng ký các biểu đồ mới vào bảng mục lục. |

---

## 3. Tiêu Chí Nghiệm Thu (Acceptance Criteria)
1. **Khả năng đăng ký mô hình**: Thêm mới mô hình thành công với các tham số hợp lệ (`context_window >= 1000`, `max_tokens >= 256`), từ chối khi trùng mã định danh với HTTP 409 (`AC-CR06-01`).
2. **Khả năng hiệu chỉnh an toàn**: Chỉnh sửa tên, giới hạn context/tokens thành công; từ chối mọi yêu cầu cố gắng thay đổi `id` hoặc `provider` với HTTP 400 (`AC-CR06-02`).
3. **Tìm kiếm & Bộ lọc tức thì**: Tìm kiếm theo chuỗi con / từ khóa và lọc kết hợp (nhà cung cấp, trạng thái, có API key) trả về kết quả chuẩn xác trong thời gian < 200ms (`AC-CR06-03`).
4. **Bảo vệ mô hình mặc định**: Khi thực hiện xóa mềm (archive), hệ thống từ chối nếu mô hình đang là mô hình mặc định (`is_default = 1`), chỉ cho phép xóa mềm khi mô hình không phải là mặc định (`AC-CR06-04`).
5. **Truy vết 100%**: Tất cả các mã định danh kỹ thuật (`FR-035` .. `FR-039`, `BR-022` .. `BR-024`, `NFR-022`, `SEC-010`, `UX-008`) đều được liên kết nhất quán trong tối thiểu 2 tài liệu thuộc `docs/`.
