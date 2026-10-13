# Bản Ghi Quyết Định Kiến Trúc (Architectural Decision Record)
## ADR-010: Kiến Trúc Liên Kết & Hủy Liên Kết Danh Tính Discord Có Chốt Chặn An Toàn

---

| Thông Tin Quản Trị | Chi Tiết |
| :--- | :--- |
| **Mã Quyết Định** | `ADR-010` |
| **Tiêu Đề** | Bi-directional Discord Identity Binding, Conflict Rejection & Safe Account Unlinking Architecture |
| **Trạng Thái** | **APPROVED** |
| **Ngày Phê Duyệt** | 2026-10-10 |
| **Tác Giả** | Senior Solution Architect + System Analyst |
| **Phạm Vi Kỹ Thuật** | Quản lý định danh OAuth2, Bảo vệ tài khoản người dùng, Chốt chặn chống khóa tài khoản |
| **Truy Vết Yêu Cầu** | `FR-040`, `FR-041`, `FR-042`, `BR-025`, `BR-026`, `BR-027`, `SEC-011`, `CTRL-010`, `OP-026`..`029` |

---

## 1. Ngữ Cảnh & Vấn Đề Đặt Ra (Context & Problem Statement)
Hệ thống AI-Chan đã hỗ trợ đăng ký và đăng nhập nhanh thông qua Discord OAuth2 (`ADR-007`). Tuy nhiên, phát sinh các yêu cầu thực tế:
1. Người dùng đã đăng ký tài khoản trước đó bằng email/mật khẩu muốn liên kết tài khoản Discord cá nhân để có thể đăng nhập bằng một chạm trong tương lai.
2. Người dùng muốn chủ động hủy liên kết (unlink) tài khoản Discord khỏi tài khoản website tại màn hình Cài đặt (`/settings?tab=connections`).
3. **Nguy cơ bảo mật và trải nghiệm (Critical Vulnerabilities & UX Risks)**:
   - **Xung đột định danh (Account Hijacking / Multi-Binding Conflict)**: Nếu một tài khoản Discord đã được liên kết với Người dùng A, sau đó Người dùng B cố ý liên kết với cùng tài khoản Discord đó, hệ thống phải xử lý như thế nào để không làm đảo lộn quyền sở hữu tài khoản?
   - **Nguy cơ mất quyền truy cập tài khoản vĩnh viễn (Permanent Account Lockout)**: Những người dùng đăng ký ban đầu thuần túy qua Discord OAuth2 có trường `hashed_password = NULL` (`BR-018`). Nếu người dùng này bấm "Hủy liên kết Discord", họ sẽ không còn bất kỳ phương thức xác thực nào (không có mật khẩu để đăng nhập bằng form, cũng không còn liên kết Discord), dẫn đến việc bị khóa vĩnh viễn khỏi tài khoản của chính mình!
   - **Chiếm đoạt phiên làm việc qua máy trạm không giám sát (Unattended Session Tampering)**: Nếu ai đó truy cập máy tính của người dùng đang đăng nhập và bấm hủy liên kết Discord mà không cần xác thực mật khẩu, người dùng sẽ mất quyền truy cập tiện lợi.

---

## 2. Các Quyết Định Kiến Trúc Then Chốt (Key Architectural Decisions)

### 2.1 Luồng Khởi Tạo Liên Kết Có Phân Biệt Hành Động (Action-Scoped OAuth Flow)
- Endpoint `GET /api/v1/auth/discord/link` (`OP-026`) sinh tham số `state` có cấu trúc:
  ```
  state = base64(json({
    "action": "link",
    "user_id": current_user.id,
    "timestamp": current_epoch,
    "nonce": secure_random_hex(16)
  })) + "." + HMAC_SHA256(secret, payload)
  ```
- Khi callback `GET /api/v1/auth/discord/callback` (`OP-027`) nhận được `action: "link"`:
  - Backend xác thực chữ ký số HMAC và thời hạn 10 phút (`BR-016`, `SEC-008`).
  - Backend xác định mục đích của request là liên kết cho `user_id` chỉ định, chứ không phải đăng nhập hoặc đăng ký tài khoản mới.

### 2.2 Quy Tắc Bất Biến Ánh Xạ Định Danh Duy Nhất 1-1 (`BR-025`)
- Hệ thống thực thi truy vấn kiểm tra trùng lặp trước khi ghi nhận:
  ```sql
  SELECT id FROM users WHERE discord_id = :discord_profile_id AND id != :current_user_id;
  ```
- **Xử lý xung đột**:
  - Nếu đã tồn tại người dùng khác có cùng `discord_id`: Backend lập tức từ chối và phản hồi lỗi `HTTP 409 Conflict` (hoặc chuyển hướng kèm cờ lỗi `?error=discord_already_linked`), tuyệt đối không ghi đè dữ liệu của người dùng khác.
  - Nếu chưa ai liên kết: Cập nhật `discord_id` và `discord_username` cho `current_user`.

### 2.3 Chốt Chặn Chống Khóa Tài Khoản Khi Hủy Liên Kết (`BR-026`)
- Khi người dùng gửi yêu cầu hủy liên kết `DELETE /api/v1/users/me/discord` (`OP-028`):
  - Backend kiểm tra trường `hashed_password` của tài khoản hiện hành.
  - **Nếu `hashed_password IS NULL`**: Từ chối ngay lập tức với mã phản hồi `HTTP 400 Bad Request`:
    ```json
    {
      "detail": "Không thể hủy liên kết Discord vì tài khoản chưa thiết lập mật khẩu đăng nhập. Vui lòng tạo mật khẩu tại tab Bảo mật trước khi hủy liên kết."
    }
    ```
  - **Nếu `hashed_password IS NOT NULL`**: Cho phép tiếp tục quy trình kiểm tra mật khẩu.

### 2.4 Tái Xác Thực Bắt Buộc Trước Khi Hủy Liên Kết (`BR-027`, `SEC-006`)
- Request body của `DELETE /api/v1/users/me/discord` bắt buộc chứa:
  ```json
  {
    "password": "<mật khẩu hiện tại của người dùng>"
  }
  ```
- Backend thực thi `verify_password(payload.password, user.hashed_password)`. Nếu sai mật khẩu, trả về `HTTP 401 Unauthorized`.
- Sau khi xác thực hợp lệ, thực thi giao dịch:
  ```sql
  UPDATE users SET discord_id = NULL, discord_username = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = :current_user_id;
  ```

---

## 3. Hệ Quả & Đánh Giá (Consequences & Trade-offs)

### Mặt Tích Cực (Positive Consequences):
1. **Triệt tiêu 100% rủi ro mất tài khoản (Zero Lockout Risk)**: Người dùng luôn luôn có ít nhất một phương thức xác thực hoạt động (mật khẩu hoặc Discord).
2. **Ngăn chặn triệt để chiếm đoạt định danh (Anti-Takeover)**: Ràng buộc tính duy nhất 1-1 bảo vệ các tài khoản khác không bị cướp quyền liên kết.
3. **Phù hợp tiêu chuẩn bảo mật hiện đại**: Tái xác thực mật khẩu (Re-auth) cho các thao tác nhạy cảm tuân thủ NIST SP 800-63B và OWASP ASVS.
4. **Trải nghiệm người dùng rõ ràng**: Giao diện cung cấp thông điệp cảnh báo sớm nếu tài khoản chưa có mật khẩu, hướng dẫn người dùng tạo mật khẩu trước.

### Điểm Cần Chú Ý (Trade-offs):
- Người dùng đăng ký qua Discord ban đầu nếu muốn hủy liên kết Discord sẽ phải trải qua bước thiết lập mật khẩu tài khoản trước. Đây là ràng buộc an ninh bắt buộc (Deliberate friction) để bảo vệ chính người dùng.

---

## 4. Hợp Đồng Triển Khai Kỹ Thuật (Implementation Contract)
- **Database Schema**: Cột `discord_id VARCHAR UNIQUE` và `discord_username VARCHAR` đã sẵn sàng từ `CR-004`.
- **API Endpoints**:
  - `GET /api/v1/auth/discord/link` (`OP-026`)
  - `GET /api/v1/auth/discord/callback` (`OP-027`)
  - `DELETE /api/v1/users/me/discord` (`OP-028`)
  - `GET /api/v1/users/me/connections` (`OP-029`)
