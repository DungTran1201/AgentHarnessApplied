# Sơ Đồ Tuần Tự: Xác Thực Discord OAuth2 (Discord OAuth2 Sequence Diagram)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-SEQ-006` |
| **Mã Kịch Bản** | `SEQ-006` |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/08-api/api-specifications.md](file:///c:/Users/PC/Project/ai-chan/docs/08-api/api-specifications.md) (`OP-016`, `OP-017`), [docs/06-architecture/ADR/ADR-007-discord-oauth2-authentication.md](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-007-discord-oauth2-authentication.md), [docs/04-use-cases/specifications/UC-AUTH-004-register-discord.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/specifications/UC-AUTH-004-register-discord.md) |
| **Mục Đích** | Mô tả chi tiết trình tự trao đổi thông điệp mạng giữa Người dùng, Next.js Client, FastAPI Backend, Máy chủ Discord OAuth2 API và Cơ sở dữ liệu trong quá trình đăng ký và đăng nhập |

---

## 1. SEQ-006: Trình Tự Xác Thực Authorization Code Grant Với Discord OAuth2

```mermaid
sequenceDiagram
    autonumber
    actor User as ACT-01/02: Người Dùng
    participant UI as Next.js Web Client
    participant Backend as FastAPI Backend
    participant Discord as Discord OAuth2 Server
    participant DB as SQLite Database

    %% Giai đoạn 1: Khởi tạo luồng xác thực
    User->>UI: Bấm nút "Tiếp tục với Discord" (Login / Register)
    UI->>Backend: GET /api/v1/auth/discord/login (OP-016)
    Backend->>Backend: Sinh chuỗi ngẫu nhiên 32-byte & ký HMAC-SHA256 (state)
    Backend-->>UI: HTTP 307 Redirect sang Discord Consent URL<br/>Set-Cookie: oauth_state={signed_state}; HttpOnly; Max-Age=600 (BR-016, SEC-008)
    UI->>Discord: Điều hướng trình duyệt sang discord.com/oauth2/authorize

    %% Giai đoạn 2: Cấp quyền & Tiếp nhận Callback
    User->>Discord: Xác nhận thông tin & bấm "Authorize" cấp quyền
    Discord-->>UI: HTTP 302 Redirect về Callback URL<br/>/api/v1/auth/discord/callback?code={auth_code}&state={state}
    UI->>Backend: GET /api/v1/auth/discord/callback?code={auth_code}&state={state} (OP-017)

    %% Giai đoạn 3: Xác thực CSRF State & Trao đổi mã ủy quyền lấy Token
    Backend->>Backend: So khớp query state với Cookie oauth_state & kiểm tra chữ ký HMAC
    alt State không hợp lệ hoặc hết hạn (> 10 phút)
        Backend-->>UI: HTTP 307 Redirect /login?error=invalid_state (Ghi log an ninh)
        UI-->>User: Hiển thị cảnh báo lỗi bảo mật CSRF
    else State hợp lệ
        Backend->>Discord: HTTPS POST /api/oauth2/token<br/>(client_id, client_secret, code, redirect_uri)
        Discord-->>Backend: HTTP 200 OK: {access_token, token_type, expires_in}
        
        %% Giai đoạn 4: Trích xuất hồ sơ người dùng từ Discord
        Backend->>Discord: HTTPS GET /api/users/@me (Bearer access_token)
        Discord-->>Backend: HTTP 200 OK: {id, username, email, verified, avatar}
        
        %% Giai đoạn 5: Đối chiếu cơ sở dữ liệu & Phân nhánh tài khoản
        alt Email chưa xác minh (verified == false)
            Backend-->>UI: HTTP 307 Redirect /login?error=unverified_email (BR-017)
            UI-->>User: Cảnh báo: Yêu cầu xác thực email trên Discord
        else Email đã xác minh (verified == true)
            Backend->>DB: SELECT * FROM users WHERE discord_id = :discord_id
            
            alt Đã có tài khoản liên kết discord_id
                DB-->>Backend: Trả về bản ghi User hiện tại
                Backend->>DB: UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = :id
            else Chưa có discord_id -> Tìm kiếm theo email
                Backend->>DB: SELECT * FROM users WHERE email = :email
                
                alt Email đã tồn tại (Tài khoản tạo bằng mật khẩu truyền thống)
                    DB-->>Backend: Trả về bản ghi User hiện tại
                    Backend->>DB: UPDATE users SET discord_id = :d_id, discord_username = :d_user (BR-017 Auto-link)
                else Email chưa tồn tại (Người dùng mới hoàn toàn)
                    DB-->>Backend: None
                    Backend->>DB: INSERT INTO users (id, email, full_name, discord_id, discord_username, hashed_password=NULL) (FR-027, BR-018)
                end
            end
            
            %% Giai đoạn 6: Cấp phát phiên làm việc & Chuyển hướng
            Backend->>Backend: Ký phát hành JWT Token (sub = user.id, exp = 7 ngày)
            Backend-->>UI: HTTP 307 Redirect /chat<br/>Set-Cookie: access_token={jwt}; HttpOnly; Secure; SameSite=Lax (ADR-002)
            UI-->>User: Tải giao diện Chatbot AI-Chan (Trạng thái đã đăng nhập)
        end
    end
```

---

## 2. Bảng Phân Tích Thông Điệp Giao Thức (Protocol Message Analysis)

| Bước | Tên Thông Điệp | Giao Thức | Bên Gửi -> Bên Nhận | Nội Dung Dữ Liệu Chính | Biện Pháp Bảo Mật Áp Dụng |
| :---: | :--- | :---: | :---: | :--- | :--- |
| **2** | Khởi tạo OAuth | HTTP GET | Client -> Backend | `GET /auth/discord/login` | Rate Limiting 10 r/s (`SEC-005`) |
| **3-4** | Chuyển hướng cấp quyền | HTTP 307 | Backend -> Client | Cookie `oauth_state`, URL Discord Authorization | Chữ ký HMAC-SHA256, TTL 10 phút (`BR-016`, `SEC-008`) |
| **5** | Cấp quyền ủy quyền | HTTPS | User -> Discord | Chấp thuận scope `identify email` | Cơ chế OAuth2 Consent của Discord |
| **6-7** | Phản hồi Callback | HTTP GET | Client -> Backend | `code={auth_code}&state={state}` | So khớp Cookie bảo vệ chống tấn công CSRF |
| **9-10**| Đổi Access Token | HTTPS POST | Backend -> Discord | `grant_type=authorization_code`, `client_secret` | Kênh Backend-to-Discord, không để lộ Secret (`SEC-001`) |
| **11-12**| Lấy User Profile | HTTPS GET | Backend -> Discord | `GET /users/@me` kèm Header `Authorization: Bearer` | Kiểm tra cờ `verified == true` (`BR-017`) |
| **14-20**| Đồng bộ CSDL | SQL | Backend -> DB | `SELECT / INSERT / UPDATE users` | Parameterized Queries chống SQL Injection, Mật khẩu Null (`BR-018`) |
| **22**| Thiết lập phiên | HTTP 307 | Backend -> Client | Cookie `access_token` (JWT 7 ngày) | HttpOnly, Secure, SameSite=Lax (`ADR-002`, `SEC-004`) |
