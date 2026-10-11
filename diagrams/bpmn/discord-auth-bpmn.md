# Sơ Đồ BPMN: Quy Trình Xác Thực & Đăng Ký Qua Discord OAuth2 (Discord Auth BPMN)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-BPMN-008` |
| **Quy Trình Nghiệp Vụ** | `BP-AUTH-004 [PROC-014]` |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/03-business-process/business-process-catalog.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/business-process-catalog.md), [docs/02-requirements/functional-requirements.md](file:///c:/Users/PC/Project/ai-chan/docs/02-requirements/functional-requirements.md) (`FR-027`, `FR-028`), [docs/06-architecture/ADR/ADR-007-discord-oauth2-authentication.md](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-007-discord-oauth2-authentication.md) |
| **Mục Đích** | Trực quan hóa toàn diện chuỗi sự kiện, các cổng kiểm tra an ninh (CSRF State, Verified Email, Token Exchange) và các nhánh xử lý tạo mới hoặc liên kết tài khoản |

---

## 1. Biểu Đồ BPMN Quy Trình Xác Thực Discord OAuth2 (PROC-014)

```mermaid
flowchart TD
    StartEvent((Bắt Đầu: Click Tiếp tục với Discord)) --> GenState[Backend sinh State ngẫu nhiên ký HMAC-SHA256 & thiết lập Cookie oauth_state]
    GenState --> RedirectDiscord[HTTP 307 Chuyển hướng trình duyệt sang Discord OAuth2 Consent URL]
    RedirectDiscord --> UserConsent{Người dùng duyệt cấp quyền trên Discord?}

    UserConsent -- Từ chối / Cancel --> CallbackDenied[Discord Callback error=access_denied]
    CallbackDenied --> ShowCancelToast[Chuyển hướng về /login?error=oauth_cancelled & hiển thị cảnh báo]
    ShowCancelToast --> EndFailCancel((Kết Thúc: Hủy bỏ))

    UserConsent -- Chấp thuận (Yes) --> CallbackSuccess[Discord Callback kèm code & state]
    CallbackSuccess --> StateCheck{D-DISCORD-01: State hợp lệ, khớp cookie & còn hạn <= 10p?}

    StateCheck -- Không hợp lệ / Hết hạn --> StateFail[Từ chối: Ghi log SEC_OAUTH_STATE_MISMATCH]
    StateFail --> ShowStateErr[Chuyển hướng về /login?error=invalid_state]
    ShowStateErr --> EndFailCSRF((Kết Thúc: Chặn CSRF))

    StateCheck -- Hợp lệ (Yes) --> TokenExchange[Backend POST HTTPS trao đổi code lấy access_token với Discord]
    TokenExchange --> TokenCheck{Trao đổi token thành công?}

    TokenCheck -- Thất bại (5xx/Network) --> ExchangeErr[Trả về HTTP 502 Bad Gateway / discord_exchange_failed]
    ExchangeErr --> EndFailNetwork((Kết Thúc: Lỗi kết nối))

    TokenCheck -- Thành công (Yes) --> FetchProfile[Backend GET /users/@me trích xuất hồ sơ Discord]
    FetchProfile --> VerifyEmailCheck{Email Discord đã được xác minh: verified == true?}

    VerifyEmailCheck -- Chưa xác minh (No) --> RejectUnverified[Từ chối liên kết theo quy tắc BR-017]
    RejectUnverified --> ShowUnverifiedToast[Chuyển hướng về /login?error=unverified_email]
    ShowUnverifiedToast --> EndFailUnverified((Kết Thúc: Chưa verify email))

    VerifyEmailCheck -- Đã xác minh (Yes) --> LookupDiscordID{D-DISCORD-02: discord_id đã tồn tại trong CSDL?}

    LookupDiscordID -- Đã tồn tại (Yes) --> UpdateLoginTime[Cập nhật last_login_at & updated_at]

    LookupDiscordID -- Chưa tồn tại (No) --> LookupEmail{Email Discord trùng khớp với tài khoản CSDL?}

    LookupEmail -- Trùng khớp (Yes) --> AutoLink[BR-017: Tự động cập nhật discord_id & discord_username vào tài khoản]
    AutoLink --> UpdateLoginTime

    LookupEmail -- Không trùng (No) --> CreateNewUser[FR-027, BR-018: Tạo User mới với discord_id, username, hashed_password=NULL]
    CreateNewUser --> UpdateLoginTime

    UpdateLoginTime --> IssueJWT[Phát hành JWT Token trong Cookie HttpOnly Secure SameSite=Lax]
    IssueJWT --> RedirectChat[Chuyển hướng người dùng về /chat]
    RedirectChat --> EndSuccess((Kết Thúc: Xác thực thành công))

    style StartEvent fill:#dcfce7,stroke:#15803d
    style EndSuccess fill:#dcfce7,stroke:#15803d
    style EndFailCancel fill:#fee2e2,stroke:#b91c1c
    style EndFailCSRF fill:#fee2e2,stroke:#b91c1c
    style EndFailNetwork fill:#fee2e2,stroke:#b91c1c
    style EndFailUnverified fill:#fee2e2,stroke:#b91c1c
    style UserConsent fill:#fef3c7,stroke:#d97706
    style StateCheck fill:#fef3c7,stroke:#d97706
    style TokenCheck fill:#fef3c7,stroke:#d97706
    style VerifyEmailCheck fill:#fef3c7,stroke:#d97706
    style LookupDiscordID fill:#fef3c7,stroke:#d97706
    style LookupEmail fill:#fef3c7,stroke:#d97706
```

---

## 2. Bảng Thuyết Minh Các Điểm Quyết Định & Rẽ Nhánh (Decision Gateways)

| Mã Điểm Quyết Định | Tên Điều Kiện Kiểm Tra | Nhánh Đúng (True) | Nhánh Sai (False) | Quy Tắc Liên Quan |
| :--- | :--- | :--- | :--- | :--- |
| **`UserConsent`** | Người dùng chấp thuận ủy quyền trên trang Discord OAuth2 | Tiếp tục với Callback `code` | Chuyển hướng hủy về `/login?error=oauth_cancelled` | RFC 6749 |
| **`D-DISCORD-01`** | Chuỗi `state` khớp cookie `oauth_state`, chữ ký HMAC hợp lệ và thời gian sống <= 10 phút | Tiến hành gọi token endpoint | Chặn request, ghi log `SEC_OAUTH_STATE_MISMATCH` | `BR-016`, `SEC-008` |
| **`TokenCheck`** | Phản hồi từ Discord token endpoint trả về HTTP 200 kèm `access_token` | Gọi API lấy hồ sơ `@me` | Báo lỗi `HTTP 502 Bad Gateway` | `ADR-007` |
| **`VerifyEmailCheck`** | Trường `verified` trong thông tin trả về từ Discord có giá trị `true` | Cho phép tiếp tục xử lý | Từ chối tự động liên kết tài khoản | `BR-017` |
| **`D-DISCORD-02`** | Đã tồn tại bản ghi trong bảng `users` có `discord_id == discord_profile.id` | Đăng nhập trực tiếp và cấp JWT | Kiểm tra email để liên kết hoặc tạo mới | `FR-028` |
| **`LookupEmail`** | Tồn tại tài khoản người dùng có cùng địa chỉ email trong bảng `users` | Tự động liên kết `discord_id` vào tài khoản sẵn có | Tạo mới tài khoản với `hashed_password = NULL` | `BR-017`, `BR-018`, `FR-027` |
