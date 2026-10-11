# Sơ Đồ Swimlane: Quy Trình Đa Làn Liên Kết & Hủy Liên Kết Tài Khoản Discord (Discord Link & Unlink Swimlane)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-SWIM-008` |
| **Quy Trình Nghiệp Vụ** | `BP-USER-003 [PROC-019]` & `BP-USER-004 [PROC-020]` |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/03-business-process/business-process-catalog.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/business-process-catalog.md), [docs/02-requirements/functional-requirements.md](file:///c:/Users/PC/Project/ai-chan/docs/02-requirements/functional-requirements.md) (`FR-040`, `FR-041`, `FR-042`), [docs/06-architecture/ADR/ADR-010-discord-account-linking-and-unlinking.md](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-010-discord-account-linking-and-unlinking.md) |
| **Mục Đích** | Phân định ranh giới trách nhiệm và chuỗi điều phối 5 làn (5-Lane): Người dùng -> Next.js Frontend -> FastAPI Backend -> Discord OAuth2 API -> SQLite Database |

---

## 1. Biểu Đồ Swimlane Liên Kết & Hủy Liên Kết Discord

```mermaid
flowchart TD
    subgraph LaneUser ["LÀN 1: NGƯỜI DÙNG (ACT-02: Authenticated User)"]
        U_ClickLink["1. Nhấn nút 'Liên kết Discord' tại Settings Connections"]
        U_AuthorizeDiscord["4. Duyệt thông tin & bấm Authorize trên cổng Discord"]
        U_ViewLinked["11. Xem trạng thái 'Đã kết nối' trên giao diện"]
        U_ClickUnlink["12. Nhấn nút 'Hủy liên kết' trên thẻ Discord"]
        U_SubmitPassword["14. Nhập mật khẩu hiện tại vào Modal & xác nhận"]
        U_ViewUnlinked["19. Xem trạng thái 'Chưa liên kết' & nhận Success Toast"]
    end

    subgraph LaneFrontend ["LÀN 2: FRONTEND CLIENT (Next.js Web - SCR-005)"]
        F_CallLink["2. Gửi GET /api/v1/auth/discord/link (OP-026)"]
        F_RedirectDiscord["3. Tiếp nhận authorization_url & redirect sang Discord"]
        F_CallbackRedirect["5. Trình duyệt nhận redirect Callback kèm code & state"]
        F_CallCallback["6. Gửi GET /api/v1/auth/discord/callback (OP-027)"]
        F_RenderLinked["10. Nhận status=linked_success & cập nhật thẻ Discord"]
        F_OpenReauthModal["13. Mở Modal tái xác thực mật khẩu (BR-027, UX-009)"]
        F_CallDelete["15. Gửi DELETE /api/v1/users/me/discord kèm password (OP-028)"]
        F_RenderUnlinked["18. Nhận HTTP 200 OK & cập nhật thẻ về Chưa liên kết"]
    end

    subgraph LaneBackend ["LÀN 3: BACKEND API (FastAPI)"]
        B_GenLinkState["Sinh chuỗi State ký HMAC chứa action=link & user_id (SEC-011)"]
        B_ValidateState["7. Kiểm tra chữ ký HMAC & TTL state <= 10 phút (BR-016)"]
        B_ExchangeToken["8. HTTPS POST /oauth2/token đổi code lấy Access Token"]
        B_FetchProfile["9. HTTPS GET /users/@me trích xuất discord_id, username"]
        B_ProcessLink["Kiểm tra xung đột 1-1 & cập nhật liên kết (BR-025)"]
        B_CheckLockout["16. Kiểm tra chốt chặn: hashed_password IS NOT NULL (BR-026)"]
        B_VerifyPassword["17. Xác thực bcrypt(password) & gán discord_id=NULL (BR-027)"]
    end

    subgraph LaneDiscord ["LÀN 4: NHÀ CUNG CẤP DISCORD (Discord OAuth2 API)"]
        D_ConsentPrompt["Hiển thị màn hình chấp thuận ủy quyền scope identify"]
        D_IssueCode["Cấp Authorization Code qua Callback URL"]
        D_ReturnToken["Xác thực Client Credentials & trả về Access Token"]
        D_ReturnProfile["Trả về hồ sơ cá nhân: id, username"]
    end

    subgraph LaneDB ["LÀN 5: CƠ SỞ DỮ LIỆU (SQLite Database)"]
        DB_CheckConflict["Truy vấn: discord_id đã gán cho user khác? (BR-025)"]
        DB_UpdateLink["UPDATE users SET discord_id, discord_username WHERE id = current_user"]
        DB_GetUser["SELECT hashed_password FROM users WHERE id = current_user"]
        DB_ClearLink["UPDATE users SET discord_id = NULL, discord_username = NULL WHERE id = current_user"]
    end

    %% Luồng Liên Kết (Steps 1 -> 11)
    U_ClickLink --> F_CallLink
    F_CallLink --> B_GenLinkState
    B_GenLinkState --> F_RedirectDiscord
    F_RedirectDiscord --> D_ConsentPrompt
    D_ConsentPrompt --> U_AuthorizeDiscord
    U_AuthorizeDiscord --> D_IssueCode
    D_IssueCode --> F_CallbackRedirect
    F_CallbackRedirect --> F_CallCallback
    F_CallCallback --> B_ValidateState
    B_ValidateState --> B_ExchangeToken
    B_ExchangeToken --> D_ReturnToken
    D_ReturnToken --> B_FetchProfile
    B_FetchProfile --> D_ReturnProfile
    D_ReturnProfile --> B_ProcessLink
    B_ProcessLink --> DB_CheckConflict
    DB_CheckConflict -- Không trùng --> DB_UpdateLink
    DB_UpdateLink --> F_RenderLinked
    F_RenderLinked --> U_ViewLinked

    %% Luồng Hủy Liên Kết (Steps 12 -> 19)
    U_ClickUnlink --> F_OpenReauthModal
    F_OpenReauthModal --> U_SubmitPassword
    U_SubmitPassword --> F_CallDelete
    F_CallDelete --> B_CheckLockout
    B_CheckLockout --> DB_GetUser
    DB_GetUser --> B_VerifyPassword
    B_VerifyPassword -- Mật khẩu đúng --> DB_ClearLink
    DB_ClearLink --> F_RenderUnlinked
    F_RenderUnlinked --> U_ViewUnlinked
```
