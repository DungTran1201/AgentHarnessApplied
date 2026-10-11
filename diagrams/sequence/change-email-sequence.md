# Sơ Đồ Tuần Tự: Thay Đổi Địa Chỉ Email An Toàn (Secure Email Change Sequence)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-SEQ-005` |
| **Mã Kịch Bản** | `SEQ-005` |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/09-behavior/sequence-diagrams.md](file:///c:/Users/PC/Project/ai-chan/docs/09-behavior/sequence-diagrams.md), [docs/02-requirements/functional-requirements.md](file:///c:/Users/PC/Project/ai-chan/docs/02-requirements/functional-requirements.md) (`FR-018`), [docs/02-requirements/business-rules.md](file:///c:/Users/PC/Project/ai-chan/docs/02-requirements/business-rules.md) (`BR-008`, `BR-010`) |
| **Mục Đích** | Mô tả trình tự đổi địa chỉ email đăng nhập với kiểm tra mật khẩu hiện tại và kiểm tra trùng lặp email duy nhất |

---

## 1. Biểu Đồ Tuần Tự SEQ-005: Đổi Email An Toàn

```mermaid
sequenceDiagram
    autonumber
    actor User as ACT-02: User
    participant UI as Next.js Client
    participant Auth as Auth Middleware (FastAPI)
    participant API as User Router
    participant DB as SQLite DB

    User->>UI: Nhập Email mới & Mật khẩu hiện tại
    UI->>UI: Kiểm tra Regex RFC 5322 Email hợp lệ
    UI->>Auth: POST /api/v1/users/me/change-email (Cookie access_token)
    
    Auth->>Auth: Xác thực JWT -> user_id
    Auth->>API: Chuyển tiếp request

    API->>DB: SELECT email, hashed_password FROM users WHERE id = :user_id
    DB-->>API: Trả về email hiện tại và hashed_password

    API->>API: verify_password(current_password, hashed_password)
    alt Mật khẩu hiện tại SAI
        API-->>UI: HTTP 401 Unauthorized ("Mật khẩu hiện tại không chính xác")
        UI-->>User: Cảnh báo đỏ: "Mật khẩu hiện tại không đúng"
    else Mật khẩu hiện tại ĐÚNG
        alt Email mới TRÙNG email hiện tại
            API-->>UI: HTTP 422 Unprocessable Entity ("Email mới không được trùng email hiện tại")
            UI-->>User: Cảnh báo yêu cầu nhập email khác
        else Email mới KHÁC
            API->>DB: SELECT id FROM users WHERE email = :new_email COLLATE NOCASE AND id != :user_id
            DB-->>API: Kết quả tìm kiếm
            alt Email mới ĐÃ TỒN TẠI ở tài khoản khác
                API-->>UI: HTTP 409 Conflict ("Email này đã được sử dụng")
                UI-->>User: Báo lỗi trùng email
            else Email mới CHƯA TỒN TẠI (Hợp lệ)
                API->>DB: UPDATE users SET email = :new_email, updated_at = CURRENT_TIMESTAMP WHERE id = :user_id
                DB-->>API: Cập nhật thành công
                API-->>UI: HTTP 200 OK ({"message": "Đổi email thành công", "email": new_email})
                UI->>UI: Cập nhật state hiển thị email mới
                UI-->>User: Thông báo Toast xanh: "Địa chỉ email đã được cập nhật thành công!"
            end
        end
    end
```

---

## 2. Thuyết Minh Ràng Buộc An Ninh

- **Kiểm soát tính toàn vẹn (Bước 15 - 19)**: Truy vấn `COLLATE NOCASE` đảm bảo không có hai tài khoản trùng email dù viết hoa hay viết thường (ví dụ: `User@example.com` và `user@example.com`).
- **Phòng chống tấn công chiếm đoạt (Bước 7 - 10)**: Bắt buộc `current_password` bảo vệ chủ sở hữu nếu bị kẻ gian thao tác lén trên máy tính (`SEC-006`).
