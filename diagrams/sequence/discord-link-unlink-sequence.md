# Sơ Đồ Tuần Tự: Liên Kết & Hủy Liên Kết Tài Khoản Discord (Discord Link & Unlink Sequence Diagram)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-SEQ-009` |
| **Mã Kịch Bản** | `SEQ-009` |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/08-api/api-specifications.md](file:///c:/Users/PC/Project/ai-chan/docs/08-api/api-specifications.md) (`OP-026`, `OP-027`, `OP-028`, `OP-029`), [docs/06-architecture/ADR/ADR-010-discord-account-linking-and-unlinking.md](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-010-discord-account-linking-and-unlinking.md), [docs/04-use-cases/specifications/UC-USER-007-link-and-unlink-discord.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/specifications/UC-USER-007-link-and-unlink-discord.md) |
| **Mục Đích** | Mô tả chi tiết trình tự trao đổi thông điệp mạng giữa Người dùng đã đăng nhập, Next.js Web Client, FastAPI Backend, Máy chủ Discord OAuth2 API và SQLite Database cho cả luồng liên kết và luồng hủy liên kết |

---

## 1. SEQ-009: Trình Tự Liên Kết Tài Khoản Discord Cho Người Dùng Đang Đăng Nhập

```mermaid
sequenceDiagram
    autonumber
    actor User as ACT-02: Người Dùng Đã Đăng Nhập
    participant UI as Next.js Web Client (SCR-005)
    participant Backend as FastAPI Backend
    participant Discord as Discord OAuth2 Server
    participant DB as SQLite Database

    %% Giai đoạn 1: Khởi tạo luồng liên kết
    User->>UI: Nhấn nút "Liên kết Discord" tại /settings?tab=connections
    UI->>Backend: GET /api/v1/auth/discord/link (OP-026) [Cookie: access_token]
    Backend->>Backend: Tạo payload: {action: "link", user_id: current_user.id, nonce: hex}
    Backend->>Backend: Ký số HMAC-SHA256 tạo tham số state (BR-016, SEC-011)
    Backend-->>UI: HTTP 200 OK: {authorization_url, state}
    UI->>Discord: Chuyển hướng trình duyệt sang discord.com/oauth2/authorize

    %% Giai đoạn 2: Phê duyệt tại Discord & Tiếp nhận Callback
    User->>Discord: Bấm "Authorize" đồng ý liên kết ứng dụng AI-Chan
    Discord-->>UI: HTTP 302 Redirect /api/v1/auth/discord/callback?code={auth_code}&state={state}
    UI->>Backend: GET /api/v1/auth/discord/callback?code={auth_code}&state={state} (OP-027)

    %% Giai đoạn 3: Xác thực State & Trao đổi Token
    Backend->>Backend: Kiểm tra chữ ký HMAC, action="link" và thời hạn <= 10 phút (BR-016)
    alt State không hợp lệ hoặc hết hạn
        Backend-->>UI: HTTP 307 Redirect /settings?tab=connections&error=invalid_state
        UI-->>User: Hiển thị thông báo lỗi phiên ủy quyền không hợp lệ
    else State hợp lệ
        Backend->>Discord: HTTPS POST /api/oauth2/token (client_id, client_secret, code)
        Discord-->>Backend: HTTP 200 OK: {access_token, token_type}
        
        %% Giai đoạn 4: Trích xuất hồ sơ Discord & Kiểm tra xung đột 1-1
        Backend->>Discord: HTTPS GET /api/users/@me (Bearer access_token)
        Discord-->>Backend: HTTP 200 OK: {id: "discord_123", username: "DiscordUserA"}
        
        Backend->>DB: SELECT id FROM users WHERE discord_id = 'discord_123' AND id != current_user.id (BR-025)
        alt Discord ID đã liên kết với người dùng khác (Conflict)
            DB-->>Backend: Trả về record người dùng khác
            Backend-->>UI: HTTP 307 Redirect /settings?tab=connections&error=discord_already_linked (HTTP 409)
            UI-->>User: Cảnh báo: "Tài khoản Discord này đã được liên kết với một tài khoản AI-Chan khác"
        else Chưa ai liên kết (Hợp lệ)
            Backend->>DB: UPDATE users SET discord_id = 'discord_123', discord_username = 'DiscordUserA', updated_at = CURRENT_TIMESTAMP WHERE id = current_user.id (FR-040)
            DB-->>Backend: UPDATE 1 row
            Backend-->>UI: HTTP 307 Redirect /settings?tab=connections&status=linked_success
            UI-->>User: Hiển thị Success Toast & cập nhật thẻ Discord sang "Đã kết nối" (FR-042, UX-009)
        end
    end
```

---

## 2. SEQ-009 (Phần 2): Trình Tự Hủy Liên Kết Discord Có Chốt Chặn Mật Khẩu An Toàn

```mermaid
sequenceDiagram
    autonumber
    actor User as ACT-02: Người Dùng Đã Đăng Nhập
    participant UI as Next.js Web Client (SCR-005)
    participant Backend as FastAPI Backend
    participant DB as SQLite Database

    %% Giai đoạn 1: Mở Modal và nhập mật khẩu
    User->>UI: Bấm nút "Hủy liên kết" trên thẻ Discord
    UI->>UI: Mở Modal tái xác thực: yêu cầu nhập mật khẩu hiện tại (BR-027, UX-009)
    User->>UI: Nhập mật khẩu & bấm "Xác nhận hủy liên kết"
    
    %% Giai đoạn 2: Gửi request gỡ liên kết
    UI->>Backend: DELETE /api/v1/users/me/discord (OP-028)<br/>Headers: [Cookie: access_token]<br/>Body: {"password": "UserPass123!"}
    
    Backend->>DB: SELECT hashed_password, discord_id FROM users WHERE id = current_user.id
    DB-->>Backend: Trả về thông tin tài khoản hiện tại

    %% Giai đoạn 3: Kiểm tra chốt chặn an toàn và mật khẩu
    alt Chốt chặn khóa tài khoản: hashed_password IS NULL (BR-026)
        Backend-->>UI: HTTP 400 Bad Request: "Không thể hủy liên kết Discord vì tài khoản chưa thiết lập mật khẩu"
        UI-->>User: Hiển thị cảnh báo: Bắt buộc tạo mật khẩu tại tab Bảo mật trước (BR-026, TC-034)
    else Tài khoản đã có mật khẩu: hashed_password IS NOT NULL
        Backend->>Backend: bcrypt.verify("UserPass123!", user.hashed_password) (BR-027, SEC-006)
        alt Mật khẩu không chính xác
            Backend-->>UI: HTTP 401 Unauthorized: "Mật khẩu xác nhận không chính xác"
            UI-->>User: Hiển thị lỗi đỏ: Mật khẩu sai, vui lòng thử lại
        else Mật khẩu chính xác
            Backend->>DB: UPDATE users SET discord_id = NULL, discord_username = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = current_user.id (FR-041)
            DB-->>Backend: UPDATE 1 row
            Backend->>Backend: Ghi log an ninh: SEC_DISCORD_UNLINKED (SEC-006, SEC-011)
            Backend-->>UI: HTTP 200 OK: {"message": "Hủy liên kết thành công", "discord_id": null} (NFR-023 <= 500ms)
            UI->>UI: Đóng Modal, cập nhật thẻ Discord về trạng thái "Chưa liên kết" (FR-042)
            UI-->>User: Hiển thị Success Toast: "Đã hủy liên kết tài khoản Discord thành công"
        end
    end
```
