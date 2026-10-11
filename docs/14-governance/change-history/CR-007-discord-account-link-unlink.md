# Phiếu Đăng Ký Yêu Cầu Thay Đổi (Change Request Record)
## CR-007: Mở Rộng Quản Lý Tài Khoản - Liên Kết & Hủy Liên Kết Tài Khoản Với Discord

---

| Thông Tin Quản Trị | Chi Tiết |
| :--- | :--- |
| **Mã Thay Đổi** | `CR-007` |
| **Loại Thay Đổi** | `feature_extension` |
| **Mức Độ Rủi Ro** | `R2` (Phê duyệt tài liệu kiến trúc, mô hình dữ liệu, hợp đồng API & sơ đồ kỹ thuật) |
| **Ngày Đăng Ký** | 2026-10-10 |
| **Trạng Thái** | **`DESIGN_APPROVED` (Đã hoàn thiện đầy đủ tài liệu & biểu đồ, sẵn sàng triển khai)** |
| **Phạm Vi Thực Hiện** | **CHỈ TÀI LIỆU, MÔ HÌNH VÀ BIỂU ĐỒ (NO CODING / NO SOURCE CODE CHANGES)** |

---

## 1. Bối Cảnh & Mục Tiêu Thay Đổi (Reason & Objective)
- **Bối cảnh**: Hệ thống trước đây đã triển khai tính năng đăng ký và đăng nhập nhanh bằng Discord OAuth2 cho khách truy cập (`CR-004`, `FR-027`, `FR-028`, `ADR-007`). Tuy nhiên, đối với người dùng đã có tài khoản thông qua hình thức đăng ký email/mật khẩu truyền thống, hoặc người dùng muốn chủ động quản lý các kết nối định danh bên thứ ba tại màn hình Cài đặt (`/settings?tab=connections`), hệ thống chưa cung cấp tính năng liên kết tài khoản đang đăng nhập với tài khoản Discord, cũng như chưa có cơ chế hủy liên kết an toàn phòng chống mất quyền truy cập tài khoản (Account Lockout).
- **Mục tiêu**:
  1. **Liên kết tài khoản Discord cho người dùng đã đăng nhập (Link Discord Account)**: Cho phép người dùng kết nối danh tính Discord với tài khoản AI-Chan hiện tại thông qua luồng OAuth2 có chữ ký HMAC bảo vệ (`FR-040`, `BR-025`, `OP-026`, `OP-027`, `UC-029`).
  2. **Hủy liên kết tài khoản Discord có chốt chặn an toàn (Safe Discord Unlinking with Lockout Guard)**: Cho phép người dùng gỡ bỏ liên kết Discord (`FR-041`, `OP-028`, `UC-030`), đồng thời thiết lập chốt chặn bắt buộc tài khoản phải có mật khẩu trước khi hủy (`BR-026`) và yêu cầu tái xác thực mật khẩu (`BR-027`, `SEC-006`) nhằm ngăn ngừa triệt để nguy cơ người dùng bị khóa vĩnh viễn khỏi tài khoản.
  3. **Quản lý và hiển thị trạng thái kết nối mạng xã hội (Connected Accounts Dashboard View)**: Cung cấp giao diện trực quan hiển thị thông tin tài khoản Discord đã liên kết (Avatar, Discord Username, Discord ID) cùng nút bấm thực hiện hành động liên kết/hủy liên kết tức thì (`FR-042`, `UX-009`, `OP-029`, `SCR-005`).
  4. **Bảo toàn tính duy nhất và toàn vẹn định danh 1-1**: Đảm bảo mỗi tài khoản Discord chỉ có thể liên kết với tối đa một tài khoản website duy nhất, tự động từ chối với mã lỗi `HTTP 409 Conflict` nếu tài khoản Discord đã được liên kết với một người dùng khác (`BR-025`, `SEC-011`, `CTRL-010`).
  5. **Hiệu năng & Trải nghiệm**: Toàn bộ thao tác kiểm tra trạng thái và thực hiện liên kết/hủy liên kết phản hồi trong thời gian $\le 500\text{ms}$ (`NFR-023`).

---

## 2. Ma Trận Tác Động Tài Liệu (Impacted Artifacts Matrix)

| Phân Vùng | Tệp Hồ Sơ Kỹ Thuật | Mức Độ Tác Động | Hành Động Đã Thực Hiện |
| :--- | :--- | :--- | :--- |
| **Canonical Models** | `models/requirements/requirements.yaml` | `DIRECT` | **EXTEND**: Thêm `FR-040`, `FR-041`, `FR-042`, `BR-025`, `BR-026`, `BR-027`, `SEC-011`. |
| **Canonical Models** | `models/architecture/architecture.yaml` | `DIRECT` | **UPDATE**: Đăng ký quyết định kiến trúc `ADR-010`. |
| **Canonical Models** | `models/process/processes.yaml` | `DIRECT` | **ADD**: Bổ sung quy trình `PROC-019` (`BP-USER-003`) và `PROC-020` (`BP-USER-004`). |
| **Canonical Models** | `models/api/api.yaml` | `DIRECT` | **ADD**: Thêm các thao tác `OP-026`, `OP-027`, `OP-028`, `OP-029`. |
| **Canonical Models** | `models/testing/testing.yaml` | `DIRECT` | **ADD**: Thêm các ca kiểm thử `TC-031`, `TC-032`, `TC-033`, `TC-034`. |
| **Canonical Models** | `models/interaction/interactions.yaml` | `DIRECT` | **ADD**: Bổ sung kịch bản tương tác `SEQ-009`. |
| **Canonical Models** | `models/ux/ux.yaml` | `DIRECT` | **UPDATE**: Thêm màn hình `SCR-005`, luồng `FLOW-DISCORD-LINK` và yêu cầu `UX-009`. |
| **Phase 02: Requirements**| `docs/02-requirements/functional-requirements.md` | `DIRECT` | **EXTEND**: Đặc tả chi tiết 3 yêu cầu chức năng `FR-040`, `FR-041`, `FR-042`. |
| **Phase 02: Requirements**| `docs/02-requirements/business-rules.md` | `DIRECT` | **EXTEND**: Bổ sung quy tắc nghiệp vụ `BR-025`, `BR-026`, `BR-027`. |
| **Phase 02: Requirements**| `docs/02-requirements/non-functional-requirements.md`| `DIRECT` | **EXTEND**: Bổ sung yêu cầu phi chức năng hiệu năng liên kết `NFR-023`. |
| **Phase 02: Requirements**| `docs/02-requirements/requirement-traceability.md`| `DIRECT` | **UPDATE**: Đồng bộ ma trận truy vết toàn diện cho toàn bộ mã định danh mới. |
| **Phase 03: Process** | `docs/03-business-process/business-process-catalog.md` | `DIRECT` | **ADD**: Thêm quy trình `BP-USER-003 [PROC-019]` và `BP-USER-004 [PROC-020]`. |
| **Phase 03: Process** | `docs/03-business-process/business-rules-mapping.md` | `DIRECT` | **UPDATE**: Ánh xạ quy tắc `BR-025`, `BR-026`, `BR-027`. |
| **Phase 04: Use Cases** | `docs/04-use-cases/use-case-catalog.md` | `DIRECT` | **EXTEND**: Bổ sung `UC-USER-007 [UC-029]` và `UC-USER-008 [UC-030]`. |
| **Phase 04: Use Cases** | `docs/04-use-cases/specifications/` | `DIRECT` | **ADD**: Tạo mới đặc tả chi tiết `UC-USER-007-link-and-unlink-discord.md`. |
| **Phase 06: Architecture**| `docs/06-architecture/ADR/` | `DIRECT` | **ADD**: Tạo mới bản ghi kiến trúc `ADR-010-discord-account-linking-and-unlinking.md`. |
| **Phase 06: Architecture**| `docs/06-architecture/decisions.md` | `DIRECT` | **UPDATE**: Cập nhật danh mục quyết định với `ADR-010`. |
| **Phase 08: API** | `docs/08-api/api-specifications.md` | `DIRECT` | **ADD**: Đặc tả chi tiết 4 endpoints `OP-026`, `OP-027`, `OP-028`, `OP-029`. |
| **Phase 09: Behavior**| `docs/09-behavior/state-machines.md` | `DIRECT` | **UPDATE**: Bổ sung máy trạng thái liên kết định danh Discord `STATE-006`. |
| **Phase 10: Security** | `docs/10-security/security-specification.md` | `DIRECT` | **UPDATE**: Bổ sung yêu cầu bảo mật liên kết danh tính `SEC-011`. |
| **Phase 10: Security** | `docs/10-security/security-controls.md` | `DIRECT` | **ADD**: Bổ sung biện pháp kiểm soát `CTRL-010`. |
| **Phase 11: UX** | `docs/11-ux/ui-interaction-specs.md` | `DIRECT` | **UPDATE**: Đặc tả chi tiết giao diện màn hình quản lý tài khoản liên kết `UX-009`. |
| **Phase 12: Testing** | `docs/12-testing/test-cases.md` | `DIRECT` | **ADD**: Đặc tả ca kiểm thử `TC-031`, `TC-032`, `TC-033`, `TC-034`. |
| **Phase 14: Governance**| `docs/14-governance/decision-log.md` | `DIRECT` | **ADD**: Ghi nhận quyết định điều hành `DEC-013`. |
| **Diagrams (BPMN)** | `diagrams/bpmn/discord-link-unlink-bpmn.md` | `DIRECT` | **ADD**: Tạo sơ đồ BPMN `DIAG-BPMN-011` cho quy trình liên kết và hủy liên kết Discord. |
| **Diagrams (Swimlane)** | `diagrams/swimlane/discord-link-unlink-swimlane.md`| `DIRECT` | **ADD**: Tạo sơ đồ Swimlane `DIAG-SWIM-008` phân làn giữa User, UI, API Gateway, Discord OAuth và Database. |
| **Diagrams (Sequence)** | `diagrams/sequence/discord-link-unlink-sequence.md`| `DIRECT` | **ADD**: Tạo sơ đồ tuần tự `SEQ-009` (`DIAG-SEQ-009`) mô tả chi tiết luồng liên kết và hủy liên kết có chốt chặn mật khẩu. |
| **Diagrams (State)** | `diagrams/state/discord-link-state.md` | `DIRECT` | **ADD**: Tạo sơ đồ máy trạng thái `DIAG-STATE-007` cho vòng đời liên kết danh tính Discord. |
| **Diagrams Index** | `diagrams/README.md` | `DIRECT` | **UPDATE**: Đăng ký các biểu đồ mới vào bảng mục lục. |

---

## 3. Tiêu Chí Nghiệm Thu (Acceptance Criteria)
1. **Khả năng liên kết Discord cho tài khoản hiện hữu**: Người dùng đã đăng nhập có thể thực hiện liên kết Discord qua URL ủy quyền hợp lệ; sau callback, trường `discord_id` và `discord_username` được gán chính xác cho tài khoản hiện tại (`AC-CR07-01`).
2. **Ngăn chặn xung đột tài khoản (`BR-025`)**: Nếu tài khoản Discord được chọn đã liên kết với một tài khoản người dùng khác trong hệ thống, hệ thống lập tức từ chối liên kết với mã `HTTP 409 Conflict` và giữ nguyên trạng thái tài khoản ban đầu (`AC-CR07-02`).
3. **Chốt chặn chống mất quyền truy cập tài khoản (`BR-026`)**: Khi người dùng yêu cầu hủy liên kết Discord, hệ thống kiểm tra trường `hashed_password`. Nếu tài khoản chưa có mật khẩu (`hashed_password IS NULL`), hệ thống từ chối hủy liên kết với mã `HTTP 400 Bad Request` và hướng dẫn người dùng thiết lập mật khẩu trước (`AC-CR07-03`).
4. **Tái xác thực mật khẩu khi hủy liên kết (`BR-027`, `SEC-006`)**: Mọi thao tác hủy liên kết bắt buộc người dùng cung cấp mật khẩu hiện tại trong payload; từ chối với mã `HTTP 401 Unauthorized` nếu mật khẩu sai (`AC-CR07-04`).
5. **Hiển thị thông tin kết nối trực quan (`FR-042`, `UX-009`)**: Màn hình cài đặt hiển thị chính xác trạng thái kết nối, tên người dùng Discord và ảnh đại diện hoặc nút "Liên kết Discord" tương ứng (`AC-CR07-05`).
6. **Truy vết 100%**: Tất cả các mã định danh kỹ thuật (`FR-040` .. `FR-042`, `BR-025` .. `BR-027`, `NFR-023`, `SEC-011`, `CTRL-010`, `UX-009`) đều được liên kết nhất quán trong tối thiểu 2 tài liệu thuộc `docs/`.
