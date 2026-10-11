# ĐẶC TẢ USE CASE CHI TIẾT (USE CASE SPECIFICATION)
## UC-USER-007 & UC-USER-008: Liên Kết & Hủy Liên Kết Tài Khoản Discord Có Chốt Chặn An Toàn

---

| Thông Tin Quản Trị | Chi Tiết |
| :--- | :--- |
| **Mã Use Case** | `UC-USER-007 [UC-029]` & `UC-USER-008 [UC-030]` |
| **Tên Use Case** | Liên Kết & Hủy Liên Kết Tài Khoản Với Discord (Link & Unlink Discord Account) |
| **Phân Hệ Nghiệp Vụ** | Quản Lý Tài Khoản Người Dùng (`CAP-USER-MGMT`) |
| **Tác Nhân Chính** | `ACT-02` (Người dùng đã xác thực / Registered User) |
| **Tác Nhân Hỗ Trợ** | Discord OAuth2 Server, Trình duyệt Web (`ai-frontend`), API Gateway & Controller (`ai-backend`) |
| **Độ Ưu Tiên** | `MUST` |
| **Trạng Thái** | **BASELINED** |
| **Truy Vết Yêu Cầu** | `FR-040`, `FR-041`, `FR-042`, `BR-025`, `BR-026`, `BR-027`, `NFR-023`, `SEC-011`, `CTRL-010` |

---

## 1. UC-USER-007 [UC-029]: Liên Kết Tài Khoản Đang Đăng Nhập Với Discord

### 1.1 Mục Đích
Cho phép người dùng đã đăng nhập kết nối tài khoản Discord cá nhân với tài khoản AI-Chan hiện tại, phục vụ cho việc đăng nhập nhanh một chạm trong các lần truy cập tiếp theo và đồng bộ thông tin định danh mạng xã hội.

### 1.2 Điều Kiện Tiên Quyết (Preconditions)
- Người dùng đã đăng nhập vào hệ thống với phiên JWT hợp lệ (`ACT-02`).
- Tài khoản hiện tại chưa liên kết với tài khoản Discord nào (`discord_id IS NULL`).

### 1.3 Luồng Sự Kiện Chính (Main Flow)
1. Người dùng truy cập trang Cài đặt tại tab Kết nối (`/settings?tab=connections`) (`SCR-005`).
2. Giao diện hiển thị thẻ "Discord" ở trạng thái "Chưa kết nối" kèm nút "Liên kết Discord" (`FR-042`, `UX-009`).
3. Người dùng nhấn nút "Liên kết Discord".
4. Client gọi `GET /api/v1/auth/discord/link` (`OP-026`).
5. Backend sinh chuỗi `state` ký số HMAC mã hóa mục đích `action=link` và `user_id` hiện tại (`BR-016`, `SEC-008`, `SEC-011`), sau đó trả về URL chuyển hướng ủy quyền của Discord.
6. Client chuyển hướng trình duyệt của người dùng đến trang xác nhận cấp quyền Discord OAuth2.
7. Người dùng chọn phê duyệt cấp quyền ứng dụng AI-Chan trên Discord.
8. Discord chuyển hướng trình duyệt về `GET /api/v1/auth/discord/callback?code=...&state=...` (`OP-027`).
9. Backend kiểm tra tính hợp lệ của chữ ký HMAC và thời hạn 10 phút của `state`.
10. Backend gửi mã `code` sang Discord Token Endpoint để lấy `access_token` và truy xuất hồ sơ người dùng Discord (`id`, `username`, `verified`).
11. Backend kiểm tra ràng buộc ánh xạ 1-1 (`BR-025`): Xác nhận không có tài khoản người dùng nào khác trong hệ thống đang gắn `discord_id` này.
12. Backend cập nhật `discord_id` và `discord_username` vào bản ghi tài khoản của người dùng hiện tại (`FR-040`).
13. Backend chuyển hướng người dùng về `/settings?tab=connections&status=linked_success`.
14. Giao diện hiển thị thông báo thành công (Success Toast) và cập nhật thẻ Discord sang trạng thái "Đã liên kết" kèm tên tài khoản Discord.

### 1.4 Các Luồng Ngoại Lệ (Exception Flows)
- **EF-01: Tài khoản Discord đã được liên kết với người dùng khác (`BR-025`)**:
  - Tại bước 11, nếu `discord_id` đã tồn tại trên một tài khoản khác trong cơ sở dữ liệu:
  - Backend hủy bỏ thao tác liên kết, chuyển hướng về `/settings?tab=connections&error=discord_already_linked`.
  - Giao diện hiển thị thông báo lỗi màu đỏ: *"Tài khoản Discord này đã được liên kết với một tài khoản AI-Chan khác. Vui lòng sử dụng tài khoản Discord khác hoặc đăng nhập bằng tài khoản tương ứng."*
- **EF-02: State OAuth2 không hợp lệ hoặc hết hạn (`BR-016`, `SEC-008`)**:
  - Tại bước 9, nếu chữ ký HMAC sai hoặc thời gian hết hạn:
  - Backend từ chối xử lý, chuyển hướng về `/settings?tab=connections&error=invalid_state`.
  - Giao diện hiển thị lỗi: *"Phiên ủy quyền đã hết hạn hoặc không hợp lệ. Vui lòng thử lại."*
- **EF-03: Người dùng hủy cấp quyền tại Discord**:
  - Tại bước 7, người dùng bấm "Cancel" trên trang ủy quyền Discord:
  - Discord redirect về callback với tham số `error=access_denied`.
  - Backend chuyển hướng về trang cài đặt với thông báo: *"Bạn đã hủy liên kết tài khoản Discord."*

---

## 2. UC-USER-008 [UC-030]: Hủy Liên Kết Tài Khoản Discord Có Chốt Chặn An Toàn

### 2.1 Mục Đích
Cho phép người dùng gỡ bỏ liên kết tài khoản Discord khỏi tài khoản website AI-Chan với cơ chế xác thực mật khẩu và chốt chặn an toàn tuyệt đối chống việc người dùng bị khóa vĩnh viễn khỏi tài khoản.

### 2.2 Điều Kiện Tiên Quyết (Preconditions)
- Người dùng đã đăng nhập với JWT Cookie hợp lệ (`ACT-02`).
- Tài khoản hiện tại đang có liên kết Discord (`discord_id IS NOT NULL`).

### 2.3 Luồng Sự Kiện Chính (Main Flow)
1. Người dùng truy cập trang Cài đặt tại tab Kết nối (`/settings?tab=connections`) (`SCR-005`).
2. Giao diện hiển thị thông tin tài khoản Discord đã liên kết kèm nút "Hủy liên kết" (`FR-042`, `UX-009`).
3. Người dùng nhấn nút "Hủy liên kết".
4. Giao diện mở Modal xác nhận hủy liên kết, yêu cầu nhập mật khẩu hiện tại để xác thực (`BR-027`, `SEC-006`, `CTRL-010`).
5. Người dùng nhập mật khẩu và nhấn "Xác nhận hủy liên kết".
6. Client gửi yêu cầu `DELETE /api/v1/users/me/discord` kèm payload `{"password": "..."}` (`OP-028`).
7. Backend kiểm tra chốt chặn an toàn chống mất quyền truy cập tài khoản (`BR-026`): Kiểm tra trường `hashed_password` của người dùng.
8. Nếu `hashed_password IS NOT NULL`: Backend tiếp tục kiểm tra mật khẩu đã nhập bằng `bcrypt.verify`.
9. Mật khẩu chính xác: Backend thực thi lệnh gán `discord_id = NULL` và `discord_username = NULL` cho người dùng (`FR-041`).
10. Backend trả về mã phản hồi `HTTP 200 OK` kèm thông báo thành công trong thời gian $\le 500\text{ms}$ (`NFR-023`).
11. Giao diện đóng Modal, cập nhật thẻ Discord về trạng thái "Chưa kết nối" và hiển thị thông báo thành công.

### 2.4 Các Luồng Ngoại Lệ (Exception Flows)
- **EF-04: Tài khoản chưa thiết lập mật khẩu đăng nhập (Chốt chặn Khóa Tài Khoản `BR-026`)**:
  - Tại bước 7, nếu tài khoản người dùng đăng ký thuần túy qua Discord và chưa từng tạo mật khẩu (`hashed_password IS NULL` theo `BR-018`):
  - Backend từ chối ngay lập tức với mã `HTTP 400 Bad Request`: *"Không thể hủy liên kết Discord vì tài khoản chưa thiết lập mật khẩu đăng nhập. Vui lòng tạo mật khẩu tại tab Bảo mật trước khi hủy liên kết."*
  - Giao diện hiển thị cảnh báo hướng dẫn người dùng chuyển sang tab Bảo mật (`/settings?tab=security`) để đặt mật khẩu trước.
- **EF-05: Mật khẩu xác thực không chính xác (`BR-027`)**:
  - Tại bước 8, nếu mật khẩu nhập vào không khớp:
  - Backend trả về mã lỗi `HTTP 401 Unauthorized`: *"Mật khẩu xác nhận không chính xác."*
  - Giao diện rung lắc trường mật khẩu và hiển thị thông báo lỗi màu đỏ trong Modal.
- **EF-06: Tài khoản chưa từng liên kết Discord**:
  - Nếu người dùng gửi request khi tài khoản chưa có `discord_id`:
  - Backend trả về mã lỗi `HTTP 400 Bad Request`: *"Tài khoản hiện không có liên kết Discord nào."*

---

## 3. Điều Kiện Sau Thực Hiện (Postconditions)
- Trạng thái liên kết danh tính được cập nhật đồng bộ trong cơ sở dữ liệu (`User.discord_id`).
- Người dùng có thể đăng nhập bằng các phương thức còn hiệu lực mà không gặp rủi ro gián đoạn dịch vụ.
- Toàn bộ thao tác được ghi log kiểm toán an ninh (`NFR-019`).
