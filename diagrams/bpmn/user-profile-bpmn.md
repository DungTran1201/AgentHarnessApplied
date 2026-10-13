# Sơ Đồ BPMN: Quy Trình Quản Lý Hồ Sơ & Cài Đặt Người Dùng (User Profile BPMN)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-BPMN-005` |
| **Quy Trình Nghiệp Vụ** | `BP-USER-001 [PROC-011]` |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/03-business-process/business-process-catalog.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/business-process-catalog.md), [docs/02-requirements/functional-requirements.md](file:///c:/Users/PC/Project/ai-chan/docs/02-requirements/functional-requirements.md) (`FR-015`, `FR-016`, `FR-017`, `FR-020`) |
| **Mục Đích** | Mô tả các sự kiện, hoạt động thẩm định và nhánh rẽ điều kiện trong quy trình xem, cập nhật hồ sơ cá nhân và thay đổi tùy chọn hiển thị |

---

## 1. Biểu Đồ BPMN Quy Trình Quản Lý Hồ Sơ (PROC-011)

```mermaid
flowchart TD
    StartEvent((Bắt Đầu: User truy cập /settings)) --> FetchProfile[Client gửi GET /api/v1/users/me]
    FetchProfile --> CheckAuth{Auth: Token Cookie hợp lệ?}

    CheckAuth -- Không hợp lệ / Hết hạn --> Return401[Trả về HTTP 401 Unauthorized]
    Return401 --> RedirectLogin[Client điều hướng về /login]
    RedirectLogin --> EndEventAuthFail((Kết Thúc: Chưa xác thực))

    CheckAuth -- Hợp lệ --> RenderSettings[Client render Tab Hồ Sơ & Thống Kê Hoạt Động]
    RenderSettings --> UserChoice{Người dùng chọn hành động nào?}

    %% Nhánh 1: Cập nhật thông tin hồ sơ
    UserChoice -- Cập nhật thông tin --> EditForm[User nhập Họ tên, Username, Bio, Số điện thoại]
    EditForm --> ClientRegex{Validate: Username slug 3-30 ký tự & Bio <= 500?}
    ClientRegex -- Không đạt --> ShowValErr[Client hiển thị lỗi validate inline]
    ShowValErr --> EditForm

    ClientRegex -- Đạt chuẩn --> SendPatchProfile[Gửi PATCH /api/v1/users/me/profile]
    SendPatchProfile --> CheckUsernameConflict{D-USER-01: Username đã tồn tại?}
    CheckUsernameConflict -- Trùng lặp (Yes) --> Return409[Trả về HTTP 409 Conflict: Username đã có người dùng]
    Return409 --> ShowConflictErr[Client cảnh báo đỏ dưới ô Username]
    ShowConflictErr --> EditForm

    CheckUsernameConflict -- Hợp lệ (No) --> UpdateDBProfile[Backend cập nhật users: full_name, username, bio, phone, updated_at]
    UpdateDBProfile --> Return200Profile[Trả về HTTP 200 OK + Profile mới]
    Return200Profile --> ToastSuccessProfile[Hiển thị Toast: Cập nhật hồ sơ thành công]
    ToastSuccessProfile --> EndEventSuccess((Kết Thúc: Cập nhật thành công))

    %% Nhánh 2: Đổi Avatar
    UserChoice -- Đổi Avatar --> InputAvatar[User dán HTTPS URL ảnh mới]
    InputAvatar --> CheckAvatarUrl{Validate: URL an toàn HTTPS & <= 500 ký tự?}
    CheckAvatarUrl -- Không hợp lệ --> ShowAvatarErr[Hiển thị lỗi: URL ảnh không hợp lệ]
    ShowAvatarErr --> InputAvatar

    CheckAvatarUrl -- Hợp lệ --> SendPatchAvatar[Gửi PATCH /api/v1/users/me/avatar]
    SendPatchAvatar --> UpdateDBAvatar[Backend cập nhật avatar_url trong bảng users]
    UpdateDBAvatar --> Return200Avatar[Trả về HTTP 200 OK + URL mới]
    Return200Avatar --> UpdateNavAvatar[Đồng bộ hiển thị avatar trên Header & Sidebar]
    UpdateNavAvatar --> EndEventSuccess

    %% Nhánh 3: Đổi Tùy chọn Theme/Ngôn ngữ
    UserChoice -- Tùy chọn giao diện --> SelectPref[User chọn Theme DARK/LIGHT và Ngôn ngữ vi/en]
    SelectPref --> SendPatchPref[Gửi PATCH /api/v1/users/me/preferences]
    SendPatchPref --> UpdateDBPref[Backend cập nhật theme_preference & language_preference]
    UpdateDBPref --> Return200Pref[Trả về HTTP 200 OK]
    Return200Pref --> ApplyThemeInstant[Client áp dụng Theme/i18n ngay lập tức]
    ApplyThemeInstant --> EndEventSuccess

    style StartEvent fill:#dcfce7,stroke:#15803d
    style EndEventSuccess fill:#dcfce7,stroke:#15803d
    style EndEventAuthFail fill:#fee2e2,stroke:#b91c1c
    style CheckAuth fill:#fef3c7,stroke:#d97706
    style UserChoice fill:#e0e7ff,stroke:#4338ca
    style ClientRegex fill:#fef3c7,stroke:#d97706
    style CheckUsernameConflict fill:#fef3c7,stroke:#d97706
    style CheckAvatarUrl fill:#fef3c7,stroke:#d97706
```

---

## 2. Bảng Thuyết Minh Các Điểm Quyết Định (Decision Points)

| Mã Điểm Quyết Định | Điều Kiện Kiểm Tra | Nhánh Đúng (True) | Nhánh Sai (False) |
| :--- | :--- | :--- | :--- |
| **`CheckAuth`** | Cookie `access_token` hợp lệ và tài khoản `ACTIVE` | Render giao diện cài đặt | Trả về `401 Unauthorized` và chuyển hướng về `/login` |
| **`ClientRegex`** | `username` 3-30 ký tự la-tinh thường/số/gạch (`BR-007`), `bio` <= 500 | Gửi request `PATCH /api/v1/users/me/profile` | Hiển thị cảnh báo inline trên form |
| **`D-USER-01`** | `SELECT id FROM users WHERE username = :username AND id != :current_user_id` | Trả về `HTTP 409 Conflict` | Cập nhật CSDL và trả về `HTTP 200 OK` |
| **`CheckAvatarUrl`**| URL bắt đầu bằng `https://` và độ dài <= 500 ký tự (`BR-011`) | Gửi request `PATCH /api/v1/users/me/avatar` | Hiển thị lỗi định dạng URL ảnh |
