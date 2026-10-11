# Phiếu Đăng Ký Yêu Cầu Thay Đổi (Change Request Record)
## CR-004: Mở Rộng Xác Thực Đăng Ký & Đăng Nhập Bằng Tài Khoản Discord OAuth2

---

| Thông Tin Quản Trị | Chi Tiết |
| :--- | :--- |
| **Mã Thay Đổi** | `CR-004` |
| **Loại Thay Đổi** | `feature_extension` |
| **Mức Độ Rủi Ro** | `R2` (Phê duyệt tài liệu kiến trúc, mô hình dữ liệu & sơ đồ) |
| **Ngày Đăng Ký** | 2026-10-09 |
| **Trạng Thái** | **`DESIGN_APPROVED` (Đã hoàn thiện tài liệu & biểu đồ, sẵn sàng triển khai)** |
| **Phạm Vi Thực Hiện** | **CHỈ TÀI LIỆU, MÔ HÌNH VÀ BIỂU ĐỒ (NO CODING / NO SOURCE CODE CHANGES)** |

---

## 1. Bối Cảnh & Mục Tiêu Thay Đổi (Reason & Objective)
- **Bối cảnh**: Hệ thống hiện chỉ hỗ trợ đăng ký và đăng nhập bằng email và mật khẩu truyền thống. Để mở rộng đối tượng người dùng, tối ưu hóa tỷ lệ chuyển đổi khi đăng ký mới và cung cấp trải nghiệm đăng nhập nhanh, hệ thống cần bổ sung phương thức xác thực tài khoản thông qua Discord OAuth2.
- **Mục tiêu**:
  1. Cho phép khách truy cập đăng ký tài khoản mới bằng ủy quyền Discord OAuth2 (`FR-027`).
  2. Cho phép người dùng đăng nhập và tự động liên kết tài khoản đã có sẵn qua email Discord đã được xác minh (`FR-028`, `BR-017`).
  3. Đảm bảo an toàn bảo mật tuyệt đối với chữ ký số HMAC cho tham số `state` chống CSRF (`BR-016`, `SEC-008`).
  4. Mở rộng cấu trúc cơ sở dữ liệu với `discord_id` và `discord_username`, cho phép mật khẩu `NULL` cho tài khoản đăng ký thuần túy qua OAuth (`BR-018`).
  5. Cấp phát HttpOnly JWT session cookie đảm bảo tính tương thích 100% với phiên bản hiện tại (`ADR-002`, `ADR-007`).

---

## 2. Ma Trận Tác Động Tài Liệu (Impacted Artifacts Matrix)

| Phân Vùng | Tệp Hồ Sơ Kỹ Thuật | Mức Độ Tác Động | Hành Động Đã Thực Hiện |
| :--- | :--- | :--- | :--- |
| **Canonical Models** | `models/requirements/requirements.yaml` | `DIRECT` | **EXTEND**: Thêm `FR-027`, `FR-028`, `BR-016`, `BR-017`, `BR-018`, `SEC-008`. |
| **Canonical Models** | `models/domain/domain.yaml` | `DIRECT` | **EXTEND**: Thêm thuộc tính `discord_id`, `discord_username` vào thực thể `User`. |
| **Canonical Models** | `models/architecture/architecture.yaml` | `DIRECT` | **UPDATE**: Bổ sung trách nhiệm OAuth2 cho `COMP-002` và đăng ký `ADR-007`. |
| **Canonical Models** | `models/process/processes.yaml` | `DIRECT` | **ADD**: Thêm quy trình `PROC-014` (`BP-AUTH-004`). |
| **Canonical Models** | `models/api/api.yaml` | `DIRECT` | **ADD**: Thêm endpoint `OP-016` và `OP-017`. |
| **Canonical Models** | `models/testing/testing.yaml` | `DIRECT` | **ADD**: Thêm ca kiểm thử `TC-021`, `TC-022`, `TC-023`. |
| **Phase 02: Requirements**| `docs/02-requirements/functional-requirements.md` | `DIRECT` | **EXTEND**: Đặc tả chi tiết `FR-027` và `FR-028`. |
| **Phase 02: Requirements**| `docs/02-requirements/business-rules.md` | `DIRECT` | **EXTEND**: Bổ sung quy tắc nghiệp vụ `BR-016`, `BR-017`, `BR-018`. |
| **Phase 02: Requirements**| `docs/02-requirements/requirement-traceability.md`| `DIRECT` | **UPDATE**: Cập nhật ma trận truy vết với `FR-027`, `FR-028`. |
| **Phase 03: Process** | `docs/03-business-process/business-process-catalog.md` | `DIRECT` | **ADD**: Thêm quy trình `BP-AUTH-004 [PROC-014]`. |
| **Phase 03: Process** | `docs/03-business-process/business-rules-mapping.md` | `DIRECT` | **UPDATE**: Ánh xạ `BR-016`, `BR-017`, `BR-018`. |
| **Phase 04: Use Cases** | `docs/04-use-cases/use-case-catalog.md` | `DIRECT` | **EXTEND**: Thêm `UC-AUTH-004 [UC-021]` và `UC-AUTH-005 [UC-022]`. |
| **Phase 04: Use Cases** | `docs/04-use-cases/specifications/` | `DIRECT` | **ADD**: Tạo mới đặc tả `UC-AUTH-004-register-discord.md` và `UC-AUTH-005-login-discord.md`. |
| **Phase 06: Architecture**| `docs/06-architecture/ADR/` | `DIRECT` | **ADD**: Tạo mới bản ghi quyết định kiến trúc `ADR-007-discord-oauth2-authentication.md`. |
| **Phase 06: Architecture**| `docs/06-architecture/decisions.md` | `DIRECT` | **UPDATE**: Cập nhật danh mục ADRs. |
| **Phase 07: Domain** | `docs/07-domain/entities.md` | `DIRECT` | **UPDATE**: Cập nhật thực thể `User` và hành vi `link_discord`. |
| **Database DDL** | `ai-backend/database/schema.sql` | `DIRECT` | **UPDATE**: Mở rộng DDL bảng `users` với `discord_id`, `discord_username`, chỉ mục tìm kiếm và cho phép mật khẩu `NULL`. |
| **Database Migration** | `ai-backend/database/migrations/004_discord_oauth_support.sql` | `DIRECT` | **ADD**: Tạo script migration nâng cấp dữ liệu. |
| **Phase 08: API** | `docs/08-api/api-specifications.md` | `DIRECT` | **ADD**: Đặc tả `GET /auth/discord/login` và `GET /auth/discord/callback`. |
| **Phase 10: Security** | `docs/10-security/security-specification.md` | `DIRECT` | **UPDATE**: Bổ sung đặc tả kiểm soát an ninh `SEC-008`. |
| **Phase 10: Security** | `docs/10-security/security-controls.md` | `DIRECT` | **ADD**: Bổ sung biện pháp kiểm soát `CTRL-007`. |
| **Phase 11: UX** | `docs/11-ux/ui-interaction-specs.md` | `DIRECT` | **UPDATE**: Đặc tả nút bấm thương hiệu Discord và phản hồi giao diện. |
| **Phase 12: Testing** | `docs/12-testing/test-cases.md` | `DIRECT` | **ADD**: Đặc tả ca kiểm thử `TC-021`, `TC-022`, `TC-023`. |
| **Phase 14: Governance**| `docs/14-governance/decision-log.md` | `DIRECT` | **ADD**: Ghi nhận quyết định điều hành `DEC-010`. |
| **Diagrams (BPMN)** | `diagrams/bpmn/discord-auth-bpmn.md` | `DIRECT` | **ADD**: Tạo sơ đồ BPMN `DIAG-BPMN-008` cho luồng Discord OAuth2. |
| **Diagrams (Sequence)** | `diagrams/sequence/discord-oauth-sequence.md` | `DIRECT` | **ADD**: Tạo sơ đồ tuần tự `SEQ-006` đặc tả Authorization Code Grant. |
| **Diagrams (Swimlane)** | `diagrams/swimlane/discord-oauth-swimlane.md` | `DIRECT` | **ADD**: Tạo sơ đồ phân làn `DIAG-SWIM-005`. |
| **Diagrams (State)** | `diagrams/state/user-account-state.md` | `DIRECT` | **UPDATE**: Cập nhật trạng thái chuyển đổi đăng ký/đăng nhập Discord. |

---

## 3. Ràng Buộc Kỹ Thuật Đã Tuân Thủ Nghiêm Ngặt (Hard Rules Adherence)
- [x] **NO CODING / NO SOURCE CODE CHANGES**: Tuyệt đối không can thiệp mã nguồn ứng dụng `ai-backend/src/*` và `ai-frontend/src/*`.
- [x] **NO REQUIREMENT INVENTION**: Bám sát yêu cầu nghiệp vụ đăng ký/đăng nhập Discord, chuẩn hóa theo RFC 6749 và khuyến nghị OAuth 2.1.
- [x] **NO SILENT CONFLICT RESOLUTION / NO SILENT BEHAVIOR INVENTION**: Xác định rõ ràng cơ chế phòng chống chiếm đoạt tài khoản khi email chưa được verify (`BR-017`) và bất biến mật khẩu null (`BR-018`).
- [x] **NO DESTRUCTIVE DIAGRAM DELETION**: Toàn bộ biểu đồ cũ được bảo toàn; các sơ đồ mới được gắn mã định danh chuẩn hóa.
- [x] **NO DUPLICATE CANONICAL DIAGRAMS**: Phân định rõ ràng BPMN, Sequence, Swimlane và State Machine.
- [x] **DOCUMENTATION IS THE SOURCE OF TRUTH**: Cập nhật canonical model YAML và docs trước, biểu đồ được ánh xạ tương ứng.

---

## 4. Kế Hoạch Tiếp Theo (Next Steps)
Sau khi tài liệu và thiết kế kiến trúc được phê duyệt:
1. Sử dụng lệnh `/plan` để lập kế hoạch triển khai chi tiết mã nguồn.
2. Cấu hình biến môi trường Discord API trên Backend (`DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`).
3. Triển khai controller router `auth_discord.py` và helper `discord_oauth.py`.
4. Bổ sung nút Discord vào giao diện đăng nhập/đăng ký tại Next.js.
5. Thực thi kiểm thử tự động cho `TC-021`, `TC-022`, `TC-023`.
