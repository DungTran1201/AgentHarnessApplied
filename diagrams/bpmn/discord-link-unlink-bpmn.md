# Sơ Đồ BPMN: Quy Trình Liên Kết & Hủy Liên Kết Tài Khoản Discord (Discord Link & Unlink BPMN)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-BPMN-011` |
| **Quy Trình Nghiệp Vụ** | `BP-USER-003 [PROC-019]` & `BP-USER-004 [PROC-020]` |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/03-business-process/business-process-catalog.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/business-process-catalog.md), [docs/02-requirements/functional-requirements.md](file:///c:/Users/PC/Project/ai-chan/docs/02-requirements/functional-requirements.md) (`FR-040`, `FR-041`, `FR-042`), [docs/06-architecture/ADR/ADR-010-discord-account-linking-and-unlinking.md](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-010-discord-account-linking-and-unlinking.md) |
| **Mục Đích** | Trực quan hóa toàn diện chuỗi sự kiện, cổng kiểm tra an ninh (Chữ ký HMAC action=link, Ánh xạ duy nhất 1-1 BR-025, Chốt chặn có mật khẩu BR-026 và Tái xác thực mật khẩu BR-027) |

---

## 1. Biểu Đồ BPMN Quy Trình Liên Kết Tài Khoản Discord (PROC-019)

```mermaid
flowchart TD
    StartLink((Bắt Đầu: Click 'Liên kết Discord' tại Settings)) --> GenLinkState[Backend sinh State ký HMAC chứa action=link & user_id - OP-026]
    GenLinkState --> RedirectOAuth[HTTP 307 Chuyển hướng trình duyệt sang Discord OAuth2 Consent]
    RedirectOAuth --> UserConsent{Người dùng đồng ý cấp quyền trên Discord?}

    UserConsent -- Từ chối / Cancel --> ConsentCancelled[Discord Callback trả về error=access_denied]
    ConsentCancelled --> RedirectCancelled[Redirect về /settings?tab=connections&error=cancelled]
    RedirectCancelled --> EndLinkCancel((Kết Thúc: Hủy liên kết))

    UserConsent -- Đồng ý (Yes) --> CallbackLink[Discord Callback kèm code & state - OP-027]
    CallbackLink --> ValidateLinkState{D-LINK-01: State hợp lệ, action=link, đúng chữ ký HMAC & <= 10 phút?}

    ValidateLinkState -- Không hợp lệ / Hết hạn --> RejectInvalidState[Từ chối: HTTP 400 Bad Request / invalid_state]
    RejectInvalidState --> RedirectInvalidState[Redirect về /settings?tab=connections&error=invalid_state]
    RedirectInvalidState --> EndLinkCSRF((Kết Thúc: Chặn CSRF))

    ValidateLinkState -- Hợp lệ (Yes) --> ExchangeToken[Backend POST trao đổi code lấy access_token với Discord]
    ExchangeToken --> FetchDiscordUser[Backend lấy hồ sơ Discord: discord_id, discord_username]
    FetchDiscordUser --> CheckDuplicateDiscord{D-LINK-02: discord_id đã được liên kết với user khác trong CSDL? - BR-025}

    CheckDuplicateDiscord -- Đã liên kết với user khác (Conflict) --> RejectConflict[Từ chối liên kết: HTTP 409 Conflict]
    RejectConflict --> RedirectConflict[Redirect về /settings?tab=connections&error=discord_already_linked]
    RedirectConflict --> EndLinkConflict((Kết Thúc: Xung đột tài khoản))

    CheckDuplicateDiscord -- Chưa ai liên kết (Hợp lệ) --> SaveDiscordLink[Cập nhật discord_id & discord_username vào tài khoản hiện tại - FR-040]
    SaveDiscordLink --> RedirectSuccess[Redirect về /settings?tab=connections&status=linked_success]
    RedirectSuccess --> ShowSuccessToast[Hiển thị Toast thông báo liên kết thành công & cập nhật UI - FR-042]
    ShowSuccessToast --> EndLinkSuccess((Kết Thúc: Liên kết thành công))
```

---

## 2. Biểu Đồ BPMN Quy Trình Hủy Liên Kết Tài Khoản Discord Có Chốt Chặn (PROC-020)

```mermaid
flowchart TD
    StartUnlink((Bắt Đầu: Click 'Hủy liên kết' trên thẻ Discord)) --> OpenReauthModal[Frontend mở Modal yêu cầu nhập mật khẩu xác nhận - UX-009]
    OpenReauthModal --> UserConfirm{Người dùng nhập mật khẩu & xác nhận?}

    UserConfirm -- Hủy bỏ (Cancel) --> CloseModal[Đóng Modal, giữ nguyên trạng thái liên kết]
    CloseModal --> EndUnlinkCancel((Kết Thúc: Hủy thao tác))

    UserConfirm -- Xác nhận (Submit) --> SendDeleteReq[Gửi DELETE /api/v1/users/me/discord kèm password - OP-028]
    SendDeleteReq --> CheckLockoutGuard{D-UNLINK-01: Tài khoản đã có mật khẩu: hashed_password IS NOT NULL? - BR-026}

    CheckLockoutGuard -- Không có mật khẩu (NULL) --> RejectLockout[Kích hoạt Chốt Chặn Khóa Tài Khoản: HTTP 400 Bad Request]
    RejectLockout --> ShowLockoutWarning[Hiển thị cảnh báo: Bắt buộc tạo mật khẩu tại tab Bảo mật trước - BR-026]
    ShowLockoutWarning --> EndUnlinkLockoutGuard((Kết Thúc: Chặn mất tài khoản))

    CheckLockoutGuard -- Đã có mật khẩu (Yes) --> VerifyPassword{D-UNLINK-02: Mật khẩu xác thực khớp với bcrypt hash? - BR-027}

    VerifyPassword -- Sai mật khẩu (Invalid) --> RejectWrongPass[Từ chối: HTTP 401 Unauthorized]
    RejectWrongPass --> ShowPassError[Hiển thị lỗi: Mật khẩu xác nhận không chính xác]
    ShowPassError --> EndUnlinkWrongPass((Kết Thúc: Sai mật khẩu))

    VerifyPassword -- Mật khẩu đúng (Valid) --> ClearDiscordIdentity[Gán discord_id = NULL & discord_username = NULL - FR-041]
    ClearDiscordIdentity --> AuditLog[Ghi nhận nhật ký an ninh gỡ liên kết định danh - SEC-006, SEC-011]
    AuditLog --> ReturnSuccess[Phản hồi HTTP 200 OK: Hủy liên kết thành công <= 500ms - NFR-023]
    ReturnSuccess --> UpdateCanvas[Frontend chuyển thẻ Discord sang trạng thái 'Chưa liên kết' - FR-042]
    UpdateCanvas --> EndUnlinkSuccess((Kết Thúc: Hủy liên kết an toàn))
```
