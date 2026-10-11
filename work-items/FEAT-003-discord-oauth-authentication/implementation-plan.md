# Kế Hoạch Thiết Kế & Đặc Tả Kỹ Thuật (Design & Modeling Plan)
## Mã Công Việc: FEAT-003-discord-oauth-authentication

---

## 1. Mục Tiêu & Phạm Vi (Scope & Objectives)
- **Nghiệp vụ cốt lõi**:
  1. Cho phép người dùng đăng ký tài khoản mới qua Discord OAuth2 (`identify`, `email`).
  2. Cho phép người dùng đăng nhập bằng tài khoản Discord đã liên kết.
  3. Tự động liên kết tài khoản Discord với tài khoản đã tồn tại nếu email trùng khớp và đã được xác thực phía Discord (`BR-017`).
  4. Cơ chế bảo vệ CSRF nghiêm ngặt với mã `state` có chữ ký HMAC (`BR-016`, `SEC-008`).
  5. Phát hành HttpOnly JWT Cookie tương thích hoàn toàn với kiến trúc bảo mật hiện tại (`ADR-002`, `SEC-004`).
- **Ràng buộc cứng (Hard Rules)**:
  - **CHỈ THỰC HIỆN ĐẶC TẢ TÀI LIỆU, MÔ HÌNH VÀ BIỂU ĐỒ (NO CODING / NO SOURCE CODE CHANGES)**.
  - Tuân thủ quy tắc ma trận truy vết, không để sót orphan IDs.
  - Kiểm tra 100% bằng bộ công cụ xác thực `tools/validators/run_all.py`.

---

## 2. Danh Mục Tài Liệu Cần Cập Nhật & Tạo Mới
1. **Yêu cầu & Quy tắc nghiệp vụ (`docs/02-requirements/`)**:
   - `functional-requirements.md`: Thêm `FR-027` (Discord Registration), `FR-028` (Discord Login & Linking).
   - `business-rules.md`: Thêm `BR-016` (OAuth2 State Guard), `BR-017` (Verified Email Linking), `BR-018` (Null-Password Invariant).
   - `requirement-traceability.md`: Bổ sung ma trận truy vết cho `FR-027`, `FR-028`.
2. **Quy trình nghiệp vụ (`docs/03-business-process/`)**:
   - `business-process-catalog.md`: Thêm `BP-AUTH-004` (`PROC-014`).
   - `business-rules-mapping.md`: Ánh xạ `BR-016`, `BR-017`, `BR-018`.
3. **Ca sử dụng (`docs/04-use-cases/`)**:
   - `use-case-catalog.md`: Thêm `UC-021` (`UC-AUTH-004`), `UC-022` (`UC-AUTH-005`).
   - `specifications/`: Tạo 2 tệp đặc tả ca sử dụng `UC-AUTH-004-register-discord.md` và `UC-AUTH-005-login-discord.md`.
4. **Kiến trúc & Quyết định (`docs/06-architecture/`)**:
   - `ADR/`: Tạo `ADR-007-discord-oauth2-authentication.md`.
   - `decisions.md` & `docs/14-governance/adr-index.md`: Cập nhật mục lục ADRs.
5. **Mô hình Dữ liệu (`docs/07-domain/` & `ai-backend/database/`)**:
   - `entities.md`: Cập nhật thực thể `User` với `discord_id`, `discord_username`.
   - `schema.sql`: Cập nhật bản thiết kế DDL.
   - `migrations/`: Tạo `004_discord_oauth_support.sql`.
6. **Hợp đồng API (`docs/08-api/`)**:
   - `api-specifications.md`: Thêm mục 1.4 và 1.5 đặc tả `GET /auth/discord/login` và `GET /auth/discord/callback`.
7. **An ninh & Kiểm soát (`docs/10-security/`)**:
   - `security-specification.md` & `security-controls.md`: Thêm `SEC-008` (OAuth2 State Guard & Secrets Hardening).
8. **Trải nghiệm người dùng (`docs/11-ux/`)**:
   - `ui-interaction-specs.md` & `traceability.md`: Thêm nút "Tiếp tục với Discord" vào `UX-001` và `UX-002`.
9. **Kiểm thử (`docs/12-testing/`)**:
   - `test-cases.md`: Thêm `TC-021`, `TC-022`, `TC-023`.
10. **Quản trị (`docs/14-governance/`)**:
    - `change-history/`: Tạo `CR-004-discord-oauth-authentication.md`.
    - `decision-log.md`: Thêm quyết định `DEC-010`.

---

## 3. Danh Mục Biểu Đồ Cần Tạo Mới & Cập Nhật (`diagrams/`)
1. **BPMN**: `diagrams/bpmn/discord-auth-bpmn.md` (`DIAG-BPMN-008`) - Quy trình nghiệp vụ Discord OAuth2 Flow.
2. **Sequence**: `diagrams/sequence/discord-oauth-sequence.md` (`SEQ-006`) - Luồng tuần tự Authorization Code, Token Exchange, Cookie Issue.
3. **Swimlane**: `diagrams/swimlane/discord-oauth-swimlane.md` (`DIAG-SWIM-005`) - Phân làn Người dùng -> Next.js -> FastAPI -> Discord API -> SQLite.
4. **State Machine**: `diagrams/state/user-account-state.md` - Cập nhật trạng thái chuyển đổi đăng ký/đăng nhập qua Discord.
