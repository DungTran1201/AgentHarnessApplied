# Sơ Đồ Swimlane: Quản Lý Tài Khoản & Hồ Sơ Cá Nhân (User Management Swimlane)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-SWIM-004` |
| **Quy Trình Nghiệp Vụ** | `BP-USER-001 [PROC-011]`, `BP-USER-002 [PROC-012]` |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/03-business-process/actor-interactions.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/actor-interactions.md), [docs/08-api/api-specifications.md](file:///c:/Users/PC/Project/ai-chan/docs/08-api/api-specifications.md) |
| **Mục Đích** | Phân định ranh giới trách nhiệm đa làn (Multi-lane) giữa Người dùng, Giao diện Client (Next.js), Lớp API / Xác thực (FastAPI), và Lớp Cơ sở dữ liệu (SQLite) |

---

## 1. Biểu Đồ Swimlane Quản Lý Tài Khoản

```mermaid
flowchart TD
    subgraph LaneUser ["LÀN 1: NGƯỜI DÙNG (ACT-02)"]
        U_OpenSettings["1. Truy cập /settings"]
        U_EditProfile["3. Nhập Full Name, Username, Bio"]
        U_ChangePass["6. Nhập Mật khẩu cũ & Mật khẩu mới"]
    end

    subgraph LaneFrontend ["LÀN 2: FRONTEND CLIENT (Next.js)"]
        F_ReqProfile["2. Gửi GET /api/v1/users/me"]
        F_ShowProfile["Render Tab Hồ sơ & Thống kê"]
        F_SubmitProfile["4. Gửi PATCH /api/v1/users/me/profile"]
        F_ToastSuccess["Cập nhật State UI & Báo thành công"]
        F_SubmitPass["7. Gửi POST /api/v1/users/me/change-password"]
        F_UpdateCookiePass["Nhận Cookie mới & Thông báo thành công"]
    end

    subgraph LaneBackend ["LÀN 3: BACKEND API & AUTH (FastAPI)"]
        B_AuthCheck["Trích xuất Cookie & Lấy User ID"]
        B_ValProfile["5. Thẩm định Regex & Check trùng username"]
        B_VerifyOldPass["8. Đối chiếu bcrypt(current_password) & băm new_password"]
        B_IssueNewJwt["Cập nhật password_changed_at & Phát hành JWT mới"]
    end

    subgraph LaneDB ["LÀN 4: CƠ SỞ DỮ LIỆU (SQLite)"]
        DB_ReadUser["SELECT user, COUNT(conversations), COUNT(messages)"]
        DB_UpdateProfile["UPDATE users SET full_name, username, bio..."]
        DB_UpdatePass["UPDATE users SET hashed_password, password_changed_at"]
    end

    %% Luồng xem profile
    U_OpenSettings --> F_ReqProfile
    F_ReqProfile --> B_AuthCheck
    B_AuthCheck --> DB_ReadUser
    DB_ReadUser --> F_ShowProfile

    %% Luồng cập nhật hồ sơ
    U_EditProfile --> F_SubmitProfile
    F_SubmitProfile --> B_ValProfile
    B_ValProfile --> DB_UpdateProfile
    DB_UpdateProfile --> F_ToastSuccess

    %% Luồng đổi mật khẩu
    U_ChangePass --> F_SubmitPass
    F_SubmitPass --> B_VerifyOldPass
    B_VerifyOldPass --> DB_UpdatePass
    DB_UpdatePass --> B_IssueNewJwt
    B_IssueNewJwt --> F_UpdateCookiePass

    style LaneUser fill:#f8fafc,stroke:#64748b
    style LaneFrontend fill:#eff6ff,stroke:#3b82f6
    style LaneBackend fill:#f5f3ff,stroke:#8b5cf6
    style LaneDB fill:#ecfdf5,stroke:#10b981
```

---

## 2. Bảng Phân Định Trách Nhiệm Từng Làn (Responsibility Assignment)

| Thành Phần (Lane) | Trách Nhiệm Chính |
| :--- | :--- |
| **Làn 1: Người dùng** | Cung cấp thông tin hồ sơ, khởi xướng các thao tác đổi mật khẩu/email và xác nhận trong các Modal nhạy cảm. |
| **Làn 2: Frontend (Next.js)** | Xác thực định dạng sơ bộ (Client-side regex), hiển thị giao diện động các Tab, thanh đo độ mạnh mật khẩu và xử lý Cookie tự động. |
| **Làn 3: Backend API (FastAPI)** | Thẩm định Pydantic schema, kiểm tra quyền sở hữu IDOR, kiểm tra mật khẩu hiện tại bằng Bcrypt (`SEC-006`), cấp phát lại JWT Token và thu hồi phiên. |
| **Làn 4: Database (SQLite)** | Lưu trữ bền vững, thực thi ràng buộc duy nhất (`UNIQUE COLLATE NOCASE`). |
