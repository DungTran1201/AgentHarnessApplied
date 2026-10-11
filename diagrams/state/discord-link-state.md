# Sơ Đồ Máy Trạng Thái: Vòng Đời Liên Kết Danh Tính Discord (Discord Identity Linking State Machine)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-STATE-007` |
| **Mã Trạng Thái** | `STATE-006` |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/09-behavior/state-machines.md](file:///c:/Users/PC/Project/ai-chan/docs/09-behavior/state-machines.md), [docs/07-domain/entities.md](file:///c:/Users/PC/Project/ai-chan/docs/07-domain/entities.md) (`User`), [docs/06-architecture/ADR/ADR-010-discord-account-linking-and-unlinking.md](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-010-discord-account-linking-and-unlinking.md) |
| **Mục Đích** | Mô tả chi tiết các trạng thái liên kết định danh Discord của tài khoản người dùng, các điều kiện bảo vệ chốt chặn chống mất tài khoản (BR-026) và quy tắc bất biến 1-1 (BR-025) |

---

## 1. STATE-006: Biểu Đồ Trạng Thái Liên Kết Danh Tính Discord

```mermaid
stateDiagram-v2
    [*] --> UNLINKED: Đăng ký tài khoản bằng Email & Mật khẩu (discord_id IS NULL)
    [*] --> LINKED_NO_PASSWORD: Đăng ký qua Discord OAuth2 (hashed_password IS NULL - BR-018)

    UNLINKED --> AUTHORIZING: Nhấn "Liên kết Discord" (GET /api/v1/auth/discord/link, action=link - OP-026)
    
    AUTHORIZING --> LINKED_WITH_PASSWORD: Phê duyệt OAuth & Callback thành công (BR-025, OP-027)
    AUTHORIZING --> UNLINKED: Người dùng hủy cấp quyền HOẶC Xung đột tài khoản khác (HTTP 409 - BR-025)

    state LINKED_NO_PASSWORD {
        [*] --> PASS_MISSING: discord_id hợp lệ, hashed_password NULL
        PASS_MISSING --> PASS_CONFIGURED: Thiết lập mật khẩu tại tab Bảo mật (PUT /users/me/password)
    }

    PASS_CONFIGURED --> LINKED_WITH_PASSWORD: Tài khoản đã có cả Discord và Mật khẩu đăng nhập

    state LINKED_WITH_PASSWORD {
        [*] --> IDLE_LINKED: Hoạt động bình thường
        IDLE_LINKED --> REAUTH_MODAL: Bấm "Hủy liên kết" (Mở Modal nhập mật khẩu - BR-027, UX-009)
        REAUTH_MODAL --> IDLE_LINKED: Đóng Modal / Nhập sai mật khẩu (HTTP 401)
    }

    LINKED_NO_PASSWORD --> UNLINK_BLOCKED: Người dùng cố tình gửi yêu cầu DELETE /users/me/discord
    note right of UNLINK_BLOCKED
        Chốt chặn chống khóa tài khoản (BR-026):
        Bị từ chối ngay với HTTP 400 Bad Request.
        Bắt buộc người dùng thiết lập mật khẩu trước!
    end note
    UNLINK_BLOCKED --> LINKED_NO_PASSWORD: Đóng cảnh báo, quay lại trạng thái ban đầu

    REAUTH_MODAL --> UNLINKED: Nhập đúng mật khẩu -> DELETE /users/me/discord (OP-028, discord_id=NULL)

    note right of LINKED_WITH_PASSWORD
        Tài khoản an toàn: Đã có mật khẩu cục bộ.
        Cho phép hủy liên kết khi vượt qua Re-auth (BR-027).
    end note
```

---

## 2. Bảng Thuyết Minh Chuyển Đổi Trạng Thái (State Transition Table)

| Trạng Thái Ban Đầu | Biến Cố Kích Hoạt (Event) | Điều Kiện Thẩm Định (Guard) | Trạng Thái Đích | Hành Động Kèm Theo (Action) |
| :--- | :--- | :--- | :--- | :--- |
| `[*]` | Đăng ký bằng Email | Đăng ký form thành công | `UNLINKED` | Lưu `users` với `discord_id = NULL`. |
| `[*]` | Đăng ký qua Discord | OAuth2 thành công (`CR-004`) | `LINKED_NO_PASSWORD` | Lưu `users` với `discord_id`, `hashed_password = NULL` (`BR-018`). |
| `UNLINKED` | Bấm "Liên kết Discord" | Đang đăng nhập phiên hợp lệ | `AUTHORIZING` | Gọi `GET /auth/discord/link`, sinh state ký HMAC chứa `action=link`. |
| `AUTHORIZING` | Callback OAuth hoàn tất | `discord_id` chưa bị trùng (`BR-025`) | `LINKED_WITH_PASSWORD` | Gán `discord_id`, `discord_username`, redirect về Settings kèm Toast thành công. |
| `AUTHORIZING` | Callback OAuth phát hiện trùng | `discord_id` đã thuộc user khác | `UNLINKED` | Từ chối với HTTP 409 Conflict, hủy giao dịch (`BR-025`). |
| `LINKED_NO_PASSWORD` | Tạo mật khẩu tại Bảo mật | Mật khẩu hợp lệ theo `BR-009` | `LINKED_WITH_PASSWORD` | Băm bcrypt, cập nhật `hashed_password`, mở khóa khả năng hủy liên kết. |
| `LINKED_NO_PASSWORD` | Bấm "Hủy liên kết" | `hashed_password IS NULL` | `UNLINK_BLOCKED` | Chặn đứng với HTTP 400 Bad Request theo Chốt Chặn Khóa Tài Khoản (`BR-026`). |
| `LINKED_WITH_PASSWORD` | Bấm "Hủy liên kết" | Nhấn nút trên UI | `REAUTH_MODAL` | Mở Modal yêu cầu nhập mật khẩu xác nhận (`BR-027`, `UX-009`). |
| `REAUTH_MODAL` | Xác nhận mật khẩu | Mật khẩu khớp bcrypt hash | `UNLINKED` | Gán `discord_id = NULL`, `discord_username = NULL`, ghi log an ninh (`FR-041`). |
| `REAUTH_MODAL` | Nhập sai mật khẩu | Mật khẩu không khớp hash | `IDLE_LINKED` | Báo lỗi HTTP 401 Unauthorized, rung lắc ô nhập liệu. |
