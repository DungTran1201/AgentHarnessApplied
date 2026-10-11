# Sơ Đồ Tuần Tự: Cập Nhật Hồ Sơ & Tùy Chọn Cá Nhân (Profile Update Sequence)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-SEQ-006` |
| **Mã Kịch Bản** | `SEQ-006` |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/09-behavior/sequence-diagrams.md](file:///c:/Users/PC/Project/ai-chan/docs/09-behavior/sequence-diagrams.md), [docs/02-requirements/functional-requirements.md](file:///c:/Users/PC/Project/ai-chan/docs/02-requirements/functional-requirements.md) (`FR-016`, `FR-017`, `FR-020`) |
| **Mục Đích** | Mô tả trình tự cập nhật các thông tin cá nhân thường (Họ tên, username slug, bio, avatar và cài đặt theme/language) |

---

## 1. Biểu Đồ Tuần Tự SEQ-006: Cập Nhật Hồ Sơ & Cài Đặt

```mermaid
sequenceDiagram
    autonumber
    actor User as ACT-02: User
    participant UI as Next.js Client
    participant Auth as Auth Middleware
    participant API as User Router
    participant DB as SQLite DB

    User->>UI: Thay đổi Họ tên, Username, Bio, Số điện thoại
    User->>UI: Nhấn [Lưu thay đổi]
    UI->>UI: Regex validate Username slug (3-30 ký tự [a-z0-9_-])
    UI->>Auth: PATCH /api/v1/users/me/profile (Payload JSON)
    
    Auth->>Auth: Xác thực Token -> Lấy user_id
    Auth->>API: Chuyển tiếp request

    opt Có thay đổi Username
        API->>DB: SELECT id FROM users WHERE username = :new_username COLLATE NOCASE AND id != :user_id
        DB-->>API: Kết quả kiểm tra
        alt Username ĐÃ TỒN TẠI
            API-->>UI: HTTP 409 Conflict ("Username đã có người sử dụng")
            UI-->>User: Cảnh báo đỏ tại ô Username
        end
    end

    API->>DB: UPDATE users SET full_name = :name, username = :user, bio = :bio, phone_number = :phone, updated_at = CURRENT_TIMESTAMP WHERE id = :user_id
    DB-->>API: Cập nhật thành công
    API-->>UI: HTTP 200 OK (UserProfile mới)
    UI->>UI: Cập nhật thông tin Header / Sidebar
    UI-->>User: Thông báo Toast: "Cập nhật hồ sơ thành công"

    %% Nhánh Đổi Tùy Chọn Theme
    Note over User, DB: Cập nhật Tùy chọn Giao diện (Theme / Ngôn ngữ)
    User->>UI: Chọn Chế độ Sáng / Tối (Light / Dark)
    UI->>UI: Đổi CSS class ngay lập tức (Zero-latency Theme Shift)
    UI->>API: PATCH /api/v1/users/me/preferences (theme_preference="LIGHT")
    API->>DB: UPDATE users SET theme_preference = 'LIGHT' WHERE id = :user_id
    DB-->>API: Đã lưu
    API-->>UI: HTTP 200 OK
```

---

## 2. Thuyết Minh Tương Tác Trực Quan

- **Cải thiện trải nghiệm (Zero-latency UI)**: Khi người dùng đổi theme, giao diện Next.js lập tức kích hoạt hoán đổi theme thông qua CSS class mà không đợi server phản hồi, mang lại cảm giác mượt mà tức thì. Request lên API chạy ngầm để lưu cấu hình bền vững cho các phiên sau.
