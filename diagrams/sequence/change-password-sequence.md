# Sơ Đồ Tuần Tự: Thay Đổi Mật Khẩu An Toàn (Secure Password Change Sequence)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-SEQ-004` |
| **Mã Kịch Bản** | `SEQ-004` |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/09-behavior/sequence-diagrams.md](file:///c:/Users/PC/Project/ai-chan/docs/09-behavior/sequence-diagrams.md), [docs/02-requirements/functional-requirements.md](file:///c:/Users/PC/Project/ai-chan/docs/02-requirements/functional-requirements.md) (`FR-019`), [docs/10-security/security-specification.md](file:///c:/Users/PC/Project/ai-chan/docs/10-security/security-specification.md) (`SEC-006`, `SEC-007`) |
| **Mục Đích** | Mô tả chi tiết trình tự các bước xác thực mật khẩu cũ, băm mật khẩu mới bằng Bcrypt, cập nhật `password_changed_at` và cấp phát lại token phiên mới |

---

## 1. Biểu Đồ Tuần Tự SEQ-004: Đổi Mật Khẩu & Luân Chuyển Token

```mermaid
sequenceDiagram
    autonumber
    actor User as ACT-02: User
    participant UI as Next.js Client
    participant Auth as Auth Middleware (FastAPI)
    participant API as User Router
    participant DB as SQLite DB

    User->>UI: Nhập Mật khẩu hiện tại, Mật khẩu mới, Xác nhận mật khẩu
    UI->>UI: Validate Client-side: new_password != current_password & khớp confirm
    UI->>Auth: POST /api/v1/users/me/change-password (Cookie access_token)
    
    Auth->>Auth: Giải mã JWT token -> Lấy user_id
    Auth->>API: Chuyển tiếp request với current_user

    API->>DB: SELECT hashed_password FROM users WHERE id = :user_id
    DB-->>API: Trả về hashed_password hiện tại

    API->>API: verify_password(current_password, hashed_password)
    alt Mật khẩu hiện tại SAI
        API-->>UI: HTTP 401 Unauthorized ("Mật khẩu hiện tại không chính xác")
        UI-->>User: Hiển thị thông báo lỗi màu đỏ tại ô Mật khẩu cũ
    else Mật khẩu hiện tại ĐÚNG
        API->>API: verify_password(new_password, hashed_password)
        alt Mật khẩu mới TRÙNG mật khẩu cũ
            API-->>UI: HTTP 422 Unprocessable Entity ("Mật khẩu mới không được trùng mật khẩu cũ")
            UI-->>User: Cảnh báo yêu cầu đổi mật khẩu khác
        else Mật khẩu mới HỢP LỆ
            API->>API: hash_password(new_password) [Bcrypt + Salt]
            API->>DB: UPDATE users SET hashed_password = :new_hash, password_changed_at = CURRENT_TIMESTAMP WHERE id = :user_id
            DB-->>API: Cập nhật CSDL thành công
            API->>API: create_access_token(user_id) [Cấp phát JWT mới]
            API-->>UI: HTTP 200 OK + Set-Cookie: access_token=new_jwt; HttpOnly; SameSite=Lax
            UI->>UI: Reset các trường Form mật khẩu
            UI-->>User: Thông báo Toast xanh: "Đổi mật khẩu thành công!"
        end
    end
```

---

## 2. Thuyết Minh Trình Tự & Ràng Buộc Kỹ Thuật

1. **Xác thực 2 lớp (Bước 7 - 10)**: Ngăn chặn triệt để hành vi đổi trộm mật khẩu khi người dùng rời bàn làm việc mà chưa khóa màn hình.
2. **Luân chuyển phiên (Bước 17 - 18)**: Khi trường `password_changed_at` được cập nhật, mọi token được phát hành trước thời điểm này sẽ bị vô hiệu hóa tại middleware giải mã token, giúp cô lập nguy cơ nếu token cũ bị đánh cắp trước đó (`SEC-007`).
