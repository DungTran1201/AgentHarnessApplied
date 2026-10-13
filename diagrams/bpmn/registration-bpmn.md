# Sơ Đồ BPMN: Quy Trình Đăng Ký Tài Khoản (User Registration BPMN)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-BPMN-001` |
| **Quy Trình Nghiệp Vụ** | `BP-AUTH-001 [PROC-001]` |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/03-business-process/process-flows.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/process-flows.md), [docs/02-requirements/functional-requirements.md](file:///c:/Users/PC/Project/ai-chan/docs/02-requirements/functional-requirements.md) (`FR-001`) |
| **Mục Đích** | Mô tả các sự kiện bắt đầu/kết thúc, hoạt động kiểm tra, và các nhánh rẽ điều kiện trong quy trình tạo tài khoản mới |

---

## 1. Biểu Đồ BPMN Quy Trình Đăng Ký (PROC-001)

```mermaid
flowchart TD
    StartEvent((Bắt Đầu: Khách truy cập /register)) --> UserInput[Người dùng nhập Email, Mật khẩu & Họ tên]
    UserInput --> ClientValidate{Client Validate: Email hợp lệ & Mật khẩu >= 8 ký tự?}

    ClientValidate -- Không hợp lệ --> ShowClientErr[Hiển thị cảnh báo lỗi định dạng trên UI]
    ShowClientErr --> UserInput

    ClientValidate -- Hợp lệ --> SendRequest[Gửi POST /api/v1/auth/register]
    SendRequest --> IngressCheck{Ingress & SlowAPI: Đạt giới hạn Rate Limit?}

    IngressCheck -- Vượt ngưỡng (Yes) --> Return429[Trả về HTTP 429 Too Many Requests]
    Return429 --> ShowRateLimitErr[Hiển thị Toast cảnh báo thao tác quá nhanh]
    ShowRateLimitErr --> EndEventFail((Kết Thúc: Thất bại))

    IngressCheck -- Hợp lệ (No) --> DBCheck{D-AUTH-01: Email đã tồn tại trong CSDL?}

    DBCheck -- Đã tồn tại (Yes) --> Return409[Trả về HTTP 409 Conflict: Email đã được sử dụng]
    Return409 --> ShowConflictErr[Hiển thị cảnh báo đỏ bên dưới ô nhập Email]
    ShowConflictErr --> UserInput

    DBCheck -- Chưa tồn tại (No) --> HashPassword[Backend băm mật khẩu bằng Bcrypt kèm muối ngẫu nhiên]
    HashPassword --> InsertDB[Ghi bản ghi người dùng mới vào bảng users với status = ACTIVE]
    InsertDB --> Return201[Trả về HTTP 201 Created kèm UserProfile]
    Return201 --> RedirectLogin[Hiển thị Toast thành công và tự động chuyển hướng sang /login]
    RedirectLogin --> EndEventSuccess((Kết Thúc: Đăng ký thành công))

    style StartEvent fill:#dcfce7,stroke:#15803d
    style EndEventSuccess fill:#dcfce7,stroke:#15803d
    style EndEventFail fill:#fee2e2,stroke:#b91c1c
    style ClientValidate fill:#fef3c7,stroke:#d97706
    style IngressCheck fill:#fef3c7,stroke:#d97706
    style DBCheck fill:#fef3c7,stroke:#d97706
```

---

## 2. Bảng Thuyết Minh Các Điểm Quyết Định (Decision Points)

| Mã Điểm Quyết Định | Điều Kiện Kiểm Tra | Nhánh Đúng (True) | Nhánh Sai (False) |
| :--- | :--- | :--- | :--- |
| **`ClientValidate`** | Định dạng Email regex chuẩn và mật khẩu có ít nhất 8 ký tự kèm chữ hoa, số | Gửi request lên Backend | Hiển thị thông báo yêu cầu sửa form tại Client |
| **`IngressCheck`** | Tần suất request không vượt quá 10 req/s (Nginx) và 30 req/min (Backend) | Chuyển tiếp request vào xử lý nghiệp vụ | Trả về `HTTP 429 Too Many Requests` |
| **`D-AUTH-01`** | `SELECT id FROM users WHERE email = :email` | Trả về `HTTP 409 Conflict` (trùng email) | Thực hiện băm mật khẩu bcrypt và tạo user mới |
