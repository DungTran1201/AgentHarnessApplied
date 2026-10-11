# Sơ Đồ BPMN: Quy Trình Thay Đổi Bảo Mật (Security BPMN)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-BPMN-006` |
| **Quy Trình Nghiệp Vụ** | `BP-USER-002 [PROC-012]` |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/03-business-process/business-process-catalog.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/business-process-catalog.md), [docs/02-requirements/functional-requirements.md](file:///c:/Users/PC/Project/ai-chan/docs/02-requirements/functional-requirements.md) (`FR-018`, `FR-019`), [docs/10-security/security-specification.md](file:///c:/Users/PC/Project/ai-chan/docs/10-security/security-specification.md) (`SEC-006`, `SEC-007`) |
| **Mục Đích** | Mô tả luồng xử lý an ninh nghiêm ngặt khi thay đổi thuộc tính nhạy cảm (Email, Mật khẩu) có yêu cầu Re-authentication |

---

## 1. Biểu Đồ BPMN Quy Trình Bảo Mật (PROC-012)

```mermaid
flowchart TD
    StartSecEvent((Bắt Đầu: User vào Tab Bảo Mật)) --> SelectSecAction{Người dùng thực hiện tác vụ nào?}

    %% ==========================================
    %% NHÁNH 1: ĐỔI ĐỊA CHỈ EMAIL (FR-018)
    %% ==========================================
    SelectSecAction -- Đổi Email --> InputEmailForm[User nhập Email mới & Mật khẩu hiện tại]
    InputEmailForm --> SendChangeEmail[POST /api/v1/users/me/change-email]
    SendChangeEmail --> VerifyPwdEmail{SEC-006: Mật khẩu hiện tại chính xác?}

    VerifyPwdEmail -- Sai mật khẩu (No) --> Err401Email[Trả về HTTP 401 Unauthorized: Mật khẩu hiện tại sai]
    Err401Email --> ShowErrEmail[Client hiển thị thông báo lỗi bảo mật]
    ShowErrEmail --> InputEmailForm

    VerifyPwdEmail -- Đúng (Yes) --> CheckEmailDiff{BR-010: Email mới khác email cũ & chưa tồn tại?}
    CheckEmailDiff -- Trùng email cũ hoặc đã tồn tại --> Err409Email[Trả về HTTP 409 Conflict / 422 Invalid]
    Err409Email --> ShowConflictEmail[Client cảnh báo email không hợp lệ hoặc đã dùng]
    ShowConflictEmail --> InputEmailForm

    CheckEmailDiff -- Hợp lệ --> UpdateDBEmail[Cập nhật email mới trong bảng users & ghi log an ninh]
    UpdateDBEmail --> Return200Email[Trả về HTTP 200 OK: Đổi email thành công]
    Return200Email --> EndEmailSuccess((Kết Thúc: Đổi email thành công))

    %% ==========================================
    %% NHÁNH 2: ĐỔI MẬT KHẨU (FR-019)
    %% ==========================================
    SelectSecAction -- Đổi Mật khẩu --> InputPwdForm[User nhập: Mật khẩu cũ, Mật khẩu mới & Xác nhận]
    InputPwdForm --> ClientPwdCheck{Client Validate: Mật khẩu mới >= 8 ký tự & Trùng khớp xác nhận?}
    ClientPwdCheck -- Không đạt --> ShowPwdClientErr[Client hiển thị lỗi độ phức tạp mật khẩu]
    ShowPwdClientErr --> InputPwdForm

    ClientPwdCheck -- Đạt --> SendChangePwd[POST /api/v1/users/me/change-password]
    SendChangePwd --> VerifyPwdOld{SEC-006: Mật khẩu hiện tại chính xác?}
    VerifyPwdOld -- Sai mật khẩu (No) --> Err401Pwd[Trả về HTTP 401 Unauthorized: Sai mật khẩu hiện tại]
    Err401Pwd --> ShowErrPwd[Client hiển thị cảnh báo đỏ tại ô mật khẩu cũ]
    ShowErrPwd --> InputPwdForm

    VerifyPwdOld -- Đúng (Yes) --> CheckPwdNotSame{BR-009: Mật khẩu mới KHÁC mật khẩu cũ?}
    CheckPwdNotSame -- Trùng mật khẩu cũ (No) --> Err422Same[Trả về HTTP 422: Mật khẩu mới trùng mật khẩu cũ]
    Err422Same --> ShowSamePwdErr[Client thông báo yêu cầu chọn mật khẩu mới khác]
    ShowSamePwdErr --> InputPwdForm

    CheckPwdNotSame -- Hợp lệ (Yes) --> HashNewPwd[Bcrypt hash mật khẩu mới]
    HashNewPwd --> UpdateDBPwd[Cập nhật hashed_password & password_changed_at = NOW]
    UpdateDBPwd --> IssueNewToken[Sinh JWT token mới & Cập nhật Set-Cookie access_token]
    IssueNewToken --> Return200Pwd[Trả về HTTP 200 OK: Đổi mật khẩu thành công]
    Return200Pwd --> EndPwdSuccess((Kết Thúc: Đổi mật khẩu thành công))

    style StartSecEvent fill:#dcfce7,stroke:#15803d
    style EndEmailSuccess fill:#dcfce7,stroke:#15803d
    style EndPwdSuccess fill:#dcfce7,stroke:#15803d
    style SelectSecAction fill:#e0e7ff,stroke:#4338ca
    style VerifyPwdEmail fill:#fef3c7,stroke:#d97706
    style CheckEmailDiff fill:#fef3c7,stroke:#d97706
    style ClientPwdCheck fill:#fef3c7,stroke:#d97706
    style VerifyPwdOld fill:#fef3c7,stroke:#d97706
    style CheckPwdNotSame fill:#fef3c7,stroke:#d97706
```

---

## 2. Bảng Thuyết Minh Các Điểm Quyết Định An Ninh (Security Decision Points)

| Mã Điểm Quyết Định | Điều Kiện Kiểm Tra | Nhánh Đúng (True) | Nhánh Sai (False) |
| :--- | :--- | :--- | :--- |
| **`VerifyPwdEmail`** | `verify_password(current_password, hashed_password)` | Tiến hành kiểm tra tính duy nhất của email mới | Trả về `HTTP 401 Unauthorized` |
| **`CheckEmailDiff`** | `new_email != current_email` và không tồn tại trong CSDL | Cập nhật `email` mới trong bảng `users` | Trả về `HTTP 409 Conflict` hoặc `422` |
| **`VerifyPwdOld`** | `verify_password(current_password, hashed_password)` | Tiếp tục kiểm tra mật khẩu mới | Trả về `HTTP 401 Unauthorized` |
| **`CheckPwdNotSame`**| `verify_password(new_password, hashed_password) == False` | Mã hóa bcrypt và cập nhật mật khẩu mới | Trả về `HTTP 422 Unprocessable Entity` |
