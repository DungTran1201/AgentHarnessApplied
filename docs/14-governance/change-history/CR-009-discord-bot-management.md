# Phiếu Đăng Ký Yêu Cầu Thay Đổi (Change Request Record)
## CR-009: Phân Hệ Quản Lý Bot Discord Cho Người Dùng Đã Liên Kết / Đăng Nhập Discord

---

| Thông Tin Quản Trị | Chi Tiết |
| :--- | :--- |
| **Mã Thay Đổi** | `CR-009` |
| **Loại Thay Đổi** | `feature_extension` |
| **Mức Độ Rủi Ro** | `R2` (Phê duyệt tài liệu kiến trúc, mô hình dữ liệu, hợp đồng API & sơ đồ kỹ thuật) |
| **Ngày Đăng Ký** | 2026-10-10 |
| **Trạng Thái** | **`DESIGN_APPROVED` (Đã hoàn thiện đầy đủ tài liệu & biểu đồ, sẵn sàng triển khai)** |
| **Phạm Vi Thực Hiện** | **CHỈ TÀI LIỆU, MÔ HÌNH VÀ BIỂU ĐỒ (NO CODING / NO SOURCE CODE CHANGES)** |

---

## 1. Bối Cảnh & Mục Tiêu Thay Đổi (Reason & Objective)

- **Bối cảnh**: Tiếp nối thành công của phân hệ Xác thực Discord OAuth2 (`CR-004`, `ADR-007`) và tính năng Liên kết / Hủy liên kết tài khoản Discord (`CR-007`, `ADR-010`), người dùng hệ thống có nhu cầu đưa trợ lý ảo thông minh AI-Chan vào các máy chủ Discord của họ để hỗ trợ tương tác cộng đồng và làm việc nhóm.
- **Mục tiêu**:
  1. **Khám phá máy chủ & Kiểm soát quyền quản trị Guild (`FR-044`, `BR-034`, `OP-033`, `UC-032`)**: Cho phép người dùng khám phá các máy chủ Discord mà họ tham gia và sở hữu quyền quản trị (`ADMINISTRATOR` 0x8 hoặc `MANAGE_GUILD` 0x20), ngăn chặn việc cấu hình bot vào các máy chủ không thuộc quyền sở hữu.
  2. **Định tuyến mô hình linh hoạt & Persona Prompt (`FR-045`, `BR-033`, `OP-031`, `OP-032`, `UC-032`)**: Cho phép người dùng tùy chọn mô hình AI trong danh mục hoạt động (`ACTIVE`), soạn thảo Persona System Prompt để định hình phong cách trả lời cho bot, thiết lập trần token và bật/tắt hoạt động linh hoạt.
  3. **Hợp nhất hạn ngạch token Web & Discord (`FR-046`, `BR-032`, `OP-034`, `UC-033`)**: Áp dụng chung hạn ngạch `daily_token_limit` giữa Web và Discord. Chặn `HTTP 429 Too Many Requests` khi chạm trần 100%, bảo vệ máy chủ khỏi cạn kiệt tài nguyên hoặc lạm dụng qua Discord gateway.
  4. **An ninh chữ ký số mật mã học Ed25519 (`SEC-013`, `CTRL-012`)**: Xác thực chữ ký số Ed25519 cho mọi webhook tương tác từ Discord, chống giả mạo thông điệp và tấn công phát lại (Replay Attack).
  5. **Đồng bộ hội thoại hai chiều Discord - Web (`FR-047`, `UC-034`)**: Toàn bộ nội dung trao đổi qua Bot Discord được tự động lưu vào bảng `messages` với `source = 'DISCORD'`, cho phép người dùng theo dõi và xem lại ngữ cảnh trên giao diện Web Chat.
  6. **Độ trễ & Trải nghiệm giao diện (`NFR-025`, `UX-011`, `SCR-006`)**: Thời gian phản hồi Interaction $\le 300\text{ms}$; Bảng điều khiển Console trực quan với Guild Grid, Form cấu hình, Live Quota Gauge và công cụ kiểm thử tương tác tức thì.

---

## 2. Ma Trận Tác Động Tài Liệu (Impacted Artifacts Matrix)

| Phân Vùng | Tệp Hồ Sơ Kỹ Thuật | Mức Độ Tác Động | Hành Động Đã Thực Hiện |
| :--- | :--- | :--- | :--- |
| **Canonical Models** | `models/requirements/requirements.yaml` | `DIRECT` | **EXTEND**: Thêm `FR-044`..`047`, `BR-031`..`034`, `SEC-013`. |
| **Canonical Models** | `models/architecture/architecture.yaml` | `DIRECT` | **UPDATE**: Đăng ký quyết định kiến trúc `ADR-012`. |
| **Canonical Models** | `models/process/processes.yaml` | `DIRECT` | **ADD**: Bổ sung quy trình `PROC-022` (`BP-BOT-001`) và `PROC-023` (`BP-BOT-002`). |
| **Canonical Models** | `models/domain/domain.yaml` | `DIRECT` | **ADD**: Bổ sung thực thể miền `DiscordBotConfig`. |
| **Canonical Models** | `models/api/api.yaml` | `DIRECT` | **ADD**: Thêm các thao tác `OP-031`, `OP-032`, `OP-033`, `OP-034`. |
| **Canonical Models** | `models/testing/testing.yaml` | `DIRECT` | **ADD**: Thêm các ca kiểm thử `TC-039`, `TC-040`, `TC-041`, `TC-042`. |
| **Canonical Models** | `models/interaction/interactions.yaml` | `DIRECT` | **ADD**: Bổ sung kịch bản tương tác `SEQ-011`. |
| **Canonical Models** | `models/ux/ux.yaml` | `DIRECT` | **UPDATE**: Thêm yêu cầu `UX-011`, luồng `FLOW-BOT-MANAGE` và màn hình `SCR-006`. |
| **Phase 02: Requirements**| `docs/02-requirements/functional-requirements.md` | `DIRECT` | **EXTEND**: Đặc tả chi tiết Mục 10 với `FR-044`..`FR-047`. |
| **Phase 02: Requirements**| `docs/02-requirements/business-rules.md` | `DIRECT` | **EXTEND**: Bổ sung quy tắc nghiệp vụ `BR-031`..`BR-034`. |
| **Phase 02: Requirements**| `docs/02-requirements/non-functional-requirements.md`| `DIRECT` | **EXTEND**: Bổ sung yêu cầu phi chức năng hiệu năng `NFR-025`. |
| **Phase 02: Requirements**| `docs/02-requirements/requirement-traceability.md`| `DIRECT` | **UPDATE**: Đồng bộ ma trận truy vết toàn diện cho các mã định danh mới. |
| **Phase 03: Process** | `docs/03-business-process/business-process-catalog.md` | `DIRECT` | **ADD**: Thêm quy trình `BP-BOT-001 [PROC-022]` và `BP-BOT-002 [PROC-023]`. |
| **Phase 03: Process** | `docs/03-business-process/business-rules-mapping.md` | `DIRECT` | **UPDATE**: Ánh xạ quy tắc `BR-031`..`BR-034`. |
| **Phase 04: Use Cases** | `docs/04-use-cases/use-case-catalog.md` | `DIRECT` | **EXTEND**: Bổ sung `UC-BOT-001 [UC-032]`, `UC-BOT-002 [UC-033]`, `UC-BOT-003 [UC-034]`. |
| **Phase 04: Use Cases** | `docs/04-use-cases/specifications/` | `DIRECT` | **ADD**: Tạo mới đặc tả chi tiết `UC-BOT-001-discord-bot-configuration.md`. |
| **Phase 06: Architecture**| `docs/06-architecture/ADR/` | `DIRECT` | **ADD**: Tạo mới bản ghi kiến trúc `ADR-012-discord-bot-management-and-quota-sharing.md`. |
| **Phase 06: Architecture**| `docs/06-architecture/decisions.md` | `DIRECT` | **UPDATE**: Cập nhật danh mục quyết định với `ADR-012`. |
| **Phase 07: Domain** | `docs/07-domain/entities.md` | `DIRECT` | **UPDATE**: Bổ sung thực thể miền `DiscordBotConfig`. |
| **Phase 08: API** | `docs/08-api/api-specifications.md` | `DIRECT` | **ADD**: Đặc tả chi tiết Mục 10 với `OP-031`, `OP-032`, `OP-033`, `OP-034`. |
| **Phase 09: Behavior**| `docs/09-behavior/state-machines.md` | `DIRECT` | **UPDATE**: Cập nhật máy trạng thái `STATE-007`. |
| **Phase 09: Behavior**| `docs/09-behavior/sequence-diagrams.md` | `DIRECT` | **ADD**: Bổ sung sơ đồ tuần tự `SEQ-011`. |
| **Phase 10: Security** | `docs/10-security/security-specification.md` | `DIRECT` | **UPDATE**: Bổ sung yêu cầu bảo mật tương tác bot `SEC-013`. |
| **Phase 10: Security** | `docs/10-security/security-controls.md` | `DIRECT` | **ADD**: Bổ sung biện pháp kiểm soát an ninh `CTRL-012`. |
| **Phase 11: UX** | `docs/11-ux/ui-interaction-specs.md` | `DIRECT` | **UPDATE**: Đặc tả chi tiết bảng điều khiển quản lý bot `UX-011`. |
| **Phase 12: Testing** | `docs/12-testing/test-cases.md` | `DIRECT` | **ADD**: Đặc tả các ca kiểm thử `TC-039`, `TC-040`, `TC-041`, `TC-042`. |
| **Phase 14: Governance**| `docs/14-governance/decision-log.md` | `DIRECT` | **ADD**: Ghi nhận quyết định điều hành `DEC-015`. |
| **Diagrams (BPMN)** | `diagrams/bpmn/discord-bot-management-bpmn.md` | `DIRECT` | **ADD**: Tạo sơ đồ BPMN `DIAG-BPMN-013`. |
| **Diagrams (Swimlane)**| `diagrams/swimlane/discord-bot-management-swimlane.md`| `DIRECT` | **ADD**: Tạo sơ đồ Swimlane `DIAG-SWIM-010`. |
| **Diagrams (Sequence)**| `diagrams/sequence/discord-bot-management-sequence.md`| `DIRECT` | **ADD**: Tạo sơ đồ Tuần tự `DIAG-SEQ-011`. |
| **Diagrams (State)** | `diagrams/state/discord-bot-config-state.md` | `DIRECT` | **ADD**: Tạo sơ đồ Trạng thái `DIAG-STATE-009`. |
| **Diagrams Index** | `diagrams/README.md` | `DIRECT` | **UPDATE**: Đăng ký cả 4 sơ đồ mới vào danh mục tổng thể. |
