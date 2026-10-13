# ĐẶC TẢ USE CASE CHI TIẾT (USE CASE SPECIFICATION)
## UC-BOT-001, UC-BOT-002 & UC-BOT-003: Quản Lý Cấu Hình & Điều Phối Tương Tác Bot Discord

---

| Thông Tin Quản Trị | Chi Tiết |
| :--- | :--- |
| **Mã Use Case** | `UC-BOT-001 [UC-032]`, `UC-BOT-002 [UC-033]`, `UC-BOT-003 [UC-034]` |
| **Tên Use Case** | Quản Lý Cấu Hình, Điều Phối Tương Tác & Đồng Bộ Lịch Sử Bot Discord |
| **Phân Hệ Nghiệp Vụ** | Quản Lý Bot Discord (`CAP-BOT-MGMT`) |
| **Tác Nhân Chính** | `ACT-02` (Người dùng đã liên kết Discord / Registered User) |
| **Tác Nhân Hỗ Trợ** | Discord Gateway / Webhook Server, Discord REST API v10, Trình duyệt Web (`ai-frontend`), API Gateway & Bot Service (`ai-backend`), LLM Providers (OpenAI, Gemini, Ollama, DeepSeek) |
| **Độ Ưu Tiên** | `MUST` |
| **Trạng Thái** | **BASELINED** |
| **Truy Vết Yêu Cầu** | `FR-044`, `FR-045`, `FR-046`, `FR-047`, `NFR-025`, `BR-031`, `BR-032`, `BR-033`, `BR-034`, `SEC-013`, `CTRL-012`, `UX-011`, `ADR-012` |

---

## 1. UC-BOT-001 [UC-032]: Cấu Hình & Khám Phá Máy Chủ Discord Bot

### 1.1 Mục Đích
Cho phép người dùng đã liên kết hoặc đăng nhập bằng tài khoản Discord khám phá các máy chủ (Discord Guilds) mà họ nắm quyền quản trị (`BR-034`), chọn máy chủ và kênh áp dụng bot, cấu hình mô hình AI định tuyến hoạt động (`BR-033`), thiết lập câu lệnh định hình nhân cách (Persona System Prompt) và trần token tối đa cho mỗi phản hồi.

### 1.2 Điều Kiện Tiên Quyết (Preconditions)
- Người dùng đã đăng nhập vào hệ thống với phiên JWT hợp lệ (`ACT-02`).
- Tài khoản người dùng đã liên kết tài khoản Discord (`discord_id IS NOT NULL` - `BR-031`).
- Người dùng có quyền `ADMINISTRATOR` (0x8) hoặc `MANAGE_GUILD` (0x20) tại Discord Guild muốn cấu hình (`BR-034`).

### 1.3 Luồng Sự Kiện Chính (Main Flow)
1. Người dùng điều hướng đến trang Quản lý Bot Discord tại đường dẫn `/bot/discord` (`SCR-006`, `UX-011`).
2. Giao diện frontend gửi song song 2 yêu cầu:
   - `GET /api/v1/bot/discord/config` (`OP-031`) để lấy cấu hình hiện hành của người dùng.
   - `GET /api/v1/bot/discord/guilds` (`OP-033`) để truy vấn danh sách máy chủ khả dụng.
3. Backend kiểm tra tiền điều kiện liên kết Discord (`BR-031`): Xác thực `current_user.discord_id IS NOT NULL`.
4. Backend gọi Discord REST API v10 (`/users/@me/guilds`) sử dụng OAuth Access Token hoặc Bot Token để lấy danh sách máy chủ mà người dùng tham gia.
5. Backend lọc danh sách Guild theo bitwise permissions (`permissions & 0x8 != 0` hoặc `permissions & 0x20 != 0` - `BR-034`) và đánh dấu trạng thái bot đã hiện diện hay chưa (`has_bot: true/false`).
6. Frontend kết xuất giao diện bảng điều khiển Console (`UX-011`):
   - Lưới danh sách Guild (Guild Card Grid).
   - Form thông số cấu hình: Chọn mô hình định tuyến (`active_model_id`), trường nhập Persona System Prompt, thanh trượt giới hạn `max_tokens_per_response`, và nút chuyển đổi trạng thái kích hoạt `is_enabled`.
7. Người dùng chọn Guild mục tiêu, lựa chọn mô hình AI (chỉ hiển thị các mô hình có trạng thái `ACTIVE` - `BR-033`), nhập prompt tùy chỉnh nhân cách cho Bot, điều chỉnh trần token và nhấn "Lưu cấu hình".
8. Client gửi yêu cầu `PUT /api/v1/bot/discord/config` (`OP-032`) kèm payload JSON.
9. Backend kiểm tra tính hợp lệ:
   - Xác thực mô hình `active_model_id` tồn tại và mang trạng thái `ACTIVE` (`BR-033`).
   - Xác thực `guild_id` gửi lên thuộc danh sách Guild người dùng có quyền quản trị (`BR-034`).
   - Kiểm tra ngưỡng `max_tokens_per_response` nằm trong dải [50, 4000].
10. Backend lưu hoặc cập nhật bản ghi trong bảng `discord_bot_configs`.
11. Backend trả về `HTTP 200 OK` với dữ liệu cấu hình cập nhật.
12. Frontend hiển thị thông báo thành công (Success Toast) và cập nhật trạng thái hiển thị trên màn hình.

### 1.4 Các Luồng Ngoại Lệ (Exception Flows)
- **EF-01: Tài khoản chưa liên kết Discord (`BR-031`)**:
  - Tại bước 3, nếu `current_user.discord_id IS NULL`:
  - Backend trả về mã lỗi `HTTP 403 Forbidden` kèm mã lỗi `DISCORD_NOT_LINKED`.
  - Frontend hiển thị Banner nhắc nhở kèm nút chuyển hướng: *"Bạn cần liên kết tài khoản Discord để quản lý Bot. Đi đến Cài đặt liên kết."*
- **EF-02: Mô hình cấu hình không hoạt động hoặc không tồn tại (`BR-033`)**:
  - Tại bước 9, nếu mô hình chỉ định mang trạng thái `INACTIVE` hoặc `ARCHIVED`:
  - Backend từ chối với `HTTP 400 Bad Request` và gợi ý tự động fallback về mô hình mặc định hệ thống (`is_default = 1`).
- **EF-03: Người dùng không có quyền quản trị trên Guild (`BR-034`)**:
  - Tại bước 9, nếu `guild_id` không thỏa mãn bitwise quyền quản trị:
  - Backend trả về `HTTP 403 Forbidden` (`INSUFFICIENT_GUILD_PERMISSIONS`).
  - Giao diện hiển thị cảnh báo: *"Bạn không có quyền quản trị máy chủ Discord này."*

---

## 2. UC-BOT-002 [UC-033]: Điều Phối Đàm Thoại & Trừ Quota Bot Discord

### 2.1 Mục Đích
Tiếp nhận và điều phối câu hỏi đàm thoại từ Discord (qua Webhook hoặc Interaction Endpoint), xác thực tính toàn vẹn chữ ký số Ed25519 (`SEC-013`), kiểm tra hạn ngạch token dùng chung với Web (`BR-032`), định tuyến prompt đến mô hình AI đang kích hoạt (`BR-033`), trừ quota nguyên tử và gửi phản hồi trở lại Discord với độ trễ tối ưu (`NFR-025`).

### 2.2 Điều Kiện Tiên Quyết (Preconditions)
- Cấu hình Bot của người dùng đã được kích hoạt (`is_enabled = true`).
- Người dùng còn hạn ngạch token sử dụng trong ngày (`used_tokens < total_limit` - `BR-032`).

### 2.3 Luồng Sự Kiện Chính (Main Flow)
1. Discord Webhook gửi yêu cầu Interaction hoặc Client gửi yêu cầu kiểm thử `POST /api/v1/bot/discord/test-dispatch` (`OP-034`).
2. Backend kiểm tra chữ ký số mật mã học Ed25519 sử dụng Public Key của Discord App (`SEC-013`, `CTRL-012`). Nếu xác thực thất bại, từ chối ngay lập tức.
3. Backend nạp cấu hình `DiscordBotConfig` tương ứng với `guild_id` hoặc `user_id`.
4. Backend kiểm tra chốt chặn hạn ngạch token chung (`BR-032`, `CTRL-008`):
   - Truy vấn bản ghi `user_quotas` của chủ sở hữu bot.
   - Nếu `used_tokens >= total_limit`, từ chối xử lý và gửi phản hồi cảnh báo cạn kiệt hạn ngạch về Discord channel.
5. Backend nạp mô hình định tuyến hoạt động (`BR-033`):
   - Nếu mô hình `active_model_id` khả dụng, khởi tạo bộ điều phối LLM Orchestrator.
   - Nếu mô hình gặp sự cố, tự động failover về mô hình mặc định có `is_default = 1`.
6. Backend kết hợp Persona System Prompt từ cấu hình (`system_prompt`) cùng nội dung câu hỏi của người dùng và gọi API tới LLM Provider.
7. Backend nhận kết quả phản hồi từ LLM và đếm số token thực tế tiêu thụ (`prompt_tokens`, `completion_tokens`, `total_tokens`).
8. Backend thực hiện giao dịch nguyên tử:
   - Tăng `used_tokens` trong `user_quotas` (`BR-032`).
   - Ghi bản ghi đo lường vào `api_metric_logs` với nguồn `DISCORD_BOT`.
9. Backend đóng gói nội dung câu trả lời và gửi phản hồi về Discord channel trong thời hạn $\le 300\text{ms}$ (`NFR-025`).

### 2.4 Các Luồng Ngoại Lệ (Exception Flows)
- **EF-01: Chữ ký Ed25519 không hợp lệ (`SEC-013`)**:
  - Tại bước 2, nếu chữ ký sai hoặc timestamp bị lệch quá 5 phút:
  - Backend từ chối ngay với `HTTP 401 Unauthorized`.
- **EF-02: Vượt trần hạn ngạch token trong ngày (`BR-032`, `BR-020`)**:
  - Tại bước 4, nếu hạn ngạch đã chạm ngưỡng 100%:
  - Backend trả về thông báo lỗi: *"Tài khoản của bạn đã sử dụng hết hạn ngạch token hằng ngày trên hệ thống AI-Chan. Vui lòng quay lại vào ngày mai hoặc nâng cấp gói dịch vụ."*
- **EF-03: Bot đang bị tắt (`is_enabled = false`)**:
  - Tại bước 3, nếu cấu hình bot đang tắt:
  - Backend phản hồi thông báo bot tạm dừng hoạt động và không gọi LLM để tránh lãng phí tài nguyên.

---

## 3. UC-BOT-003 [UC-034]: Đồng Bộ Lịch Sử Trò Chuyện Discord - Web

### 3.1 Mục Đích
Tự động ghi nhận và đồng bộ các lượt tương tác phát sinh từ Discord Bot vào kho lưu trữ hội thoại của người dùng trên Web (`messages`), giúp người dùng theo dõi và xem lại toàn bộ ngữ cảnh đối thoại tập trung từ cả hai nền tảng (`FR-047`).

### 3.2 Điều Kiện Tiên Quyết (Preconditions)
- Lượt tương tác đàm thoại qua Discord Bot hoàn thành thành công trong `UC-BOT-002`.

### 3.3 Luồng Sự Kiện Chính (Main Flow)
1. Khi hoàn tất điều phối câu trả lời ở bước 8 của `UC-BOT-002`, Bot Service kiểm tra phiên trò chuyện Discord của người dùng trong bảng `conversations`.
2. Nếu chưa có phiên trò chuyện chuyên biệt cho Discord, hệ thống tự động khởi tạo cuộc trò chuyện mới có tiêu đề `Discord Bot: [Tên Máy Chủ]` và gắn cờ phân loại nguồn.
3. Backend tạo 2 bản ghi trong bảng `messages`:
   - Bản ghi câu hỏi của người dùng (`role = 'user'`, `content = query_text`, `source = 'DISCORD'`).
   - Bản ghi phản hồi của trợ lý AI (`role = 'assistant'`, `content = ai_response`, `model_used = active_model_id`, `source = 'DISCORD'`).
4. Khi người dùng truy cập giao diện Web Chat (`/chat` - `SCR-001`), phiên hội thoại Discord hiển thị trong danh sách lịch sử kèm huy hiệu biểu tượng Discord (Discord Badge).
5. Người dùng có thể đọc lại toàn bộ nội dung đã hỏi đáp trên máy chủ Discord trực tiếp từ trình duyệt Web.
