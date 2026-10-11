# ĐẶC TẢ THỰC THỂ & ĐỐI TƯỢNG GIÁ TRỊ (ENTITIES & VALUE OBJECTS)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `DOM-ENT-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Đặc tả cấu trúc thuộc tính, định danh và hành vi của các Thực thể (Entities) và Đối tượng giá trị (Value Objects) trong miền nghiệp vụ |

---

## 1. Danh Mục Các Thực Thể Nghiệp Vụ (Entities)

---

### 1.1 Thực Thể: User (Người Dùng)
- **Định Danh Duy Nhất (Identity)**: `id: UUID` (Khóa chính bất biến).
- **Ý Nghĩa**: Đại diện cho tài khoản cá nhân của người dùng đã đăng ký thành công trong hệ thống.
- **Thuộc Tính Nghiệp Vụ Cốt Lõi**:
  - `email: EmailAddress` (Duy nhất trên toàn hệ thống, RFC 5322 - `BR-010`).
  - `full_name: string` (Họ và tên hiển thị, tối đa 255 ký tự).
  - `hashed_password: Optional[HashedPassword]` (Chuỗi băm bcrypt an toàn, chấp nhận NULL cho tài khoản Discord OAuth thuần túy - `BR-018`, `SEC-002`).
  - `username: Optional[UsernameSlug]` (Tên định danh duy nhất, 3-30 ký tự slug - `BR-007`).
  - `avatar_url: Optional[UrlString]` (Đường dẫn hình ảnh đại diện cá nhân - `BR-011`).
  - `bio: Optional[string]` (Tiểu sử giới thiệu ngắn, tối đa 500 ký tự).
  - `phone_number: Optional[string]` (Số điện thoại liên hệ tùy chọn).
  - `discord_id: Optional[string]` (Mã định danh duy nhất Discord, UNIQUE - `FR-027`, `FR-028`).
  - `discord_username: Optional[string]` (Tên người dùng Discord liên kết - `FR-027`).
  - `theme_preference: ThemeMode` (Chủ đề giao diện: `DARK`, `LIGHT`, `SYSTEM` - Mặc định `DARK`).
  - `language_preference: LanguageCode` (Ngôn ngữ hiển thị: `vi`, `en` - Mặc định `vi`).
  - `status: UserStatus` (Trạng thái: `ACTIVE`, `DISABLED`).
  - `last_login_at: Optional[DateTime]` (Thời điểm đăng nhập thành công gần nhất).
  - `password_changed_at: Optional[DateTime]` (Thời điểm đổi mật khẩu lần cuối để thu hồi phiên cũ - `SEC-007`).
  - `created_at, updated_at: DateTime` (Dấu vết thời gian tạo và cập nhật bản ghi).
- **Hành Vi Miền (Domain Behaviors)**:
  - `update_profile(full_name, username, bio, phone_number)`: Cập nhật thông tin định danh cá nhân.
  - `update_avatar(avatar_url)`: Cập nhật liên kết ảnh đại diện.
  - `link_discord(discord_id, discord_username)`: Liên kết tài khoản Discord cho người dùng đã đăng nhập với kiểm tra tính duy nhất 1-1 (`FR-040`, `BR-025`).
  - `unlink_discord(current_password)`: Hủy liên kết tài khoản Discord sau khi xác thực mật khẩu, có chốt chặn bắt buộc `hashed_password IS NOT NULL` chống mất quyền truy cập tài khoản (`FR-041`, `BR-026`, `BR-027`).
  - `change_email(new_email, current_password)`: Đổi email kèm xác thực mật khẩu hiện tại (`BR-008`).
  - `change_password(new_password, current_password)`: Đổi mật khẩu, băm bcrypt, cập nhật `password_changed_at` (`BR-009`).
  - `update_preferences(theme, language)`: Cập nhật tùy chọn hiển thị và ngôn ngữ.
  - `verify_password(plain_password)`: Thẩm định mật khẩu hiện tại.


---

### 1.2 Thực Thể: Conversation (Cuộc Trò Chuyện)
- **Định Danh Duy Nhất (Identity)**: `id: UUID` (Khóa chính bất biến).
- **Ý Nghĩa**: Không gian ngữ cảnh đàm thoại độc lập thuộc sở hữu của duy nhất một người dùng.
- **Thuộc Tính Nghiệp Vụ**:
  - `user_id: UUID` (Khóa ngoại tham chiếu chủ sở hữu - `BR-002`).
  - `title: ConversationTitle` (Tiêu đề hiển thị, mặc định: `"Cuộc trò chuyện mới"` - `BR-004`).
  - `created_at, updated_at: DateTime` (Thời gian tạo và thời gian nhận tin nhắn mới nhất).
- **Hành Vi Miền (Domain Behaviors)**:
  - `rename(new_title)`: Cập nhật tiêu đề hiển thị mới.
  - `auto_derive_title(first_prompt)`: Tự động trích xuất 30 ký tự đầu nếu tiêu đề là mặc định (`BR-004`).
  - `touch()`: Cập nhật dấu thời gian `updated_at`.

---

### 1.3 Thực Thể: Message (Tin Nhắn Đàm Thoại)
- **Định Danh Duy Nhất (Identity)**: `id: UUID` (Khóa chính bất biến).
- **Ý Nghĩa**: Một phát ngôn bằng văn bản trong cuộc trò chuyện (của người dùng hoặc của trợ lý ảo).
- **Thuộc Tính Nghiệp Vụ**:
  - `conversation_id: UUID` (Khóa ngoại tham chiếu cuộc trò chuyện cha).
  - `role: MessageRole` (Vai trò người phát ngôn: `USER` hoặc `ASSISTANT`).
  - `content: MessageContent` (Nội dung văn bản tin nhắn - `BR-003`).
  - `model_used: Optional[ModelIdentifier]` (Ghi nhận mô hình đã sinh phản hồi: tham chiếu tới `AgentModel.id`).
  - `created_at: DateTime` (Thời điểm gửi tin nhắn).

---

### 1.4 Thực Thể: AgentModel (Mô Hình Trợ Lý / Agent)
- **Định Danh Duy Nhất (Identity)**: `id: ModelIdentifier` (Chuỗi slug định danh duy nhất, ví dụ: `gemini-3.8-flash`, `claude-3-7-sonnet`).
- **Ý Nghĩa**: Đại diện cho một mô hình trí tuệ nhân tạo được kết nối và điều phối thông qua các nhà cung cấp bên ngoài (Google, Anthropic, OpenAI, Groq, Ollama).
- **Thuộc Tính Nghiệp Vụ**:
  - `name: string` (Tên hiển thị trực quan trên giao diện, ví dụ: "Google Gemini 3.8 Flash").
  - `provider: ModelProvider` (Nhà cung cấp: `google`, `anthropic`, `openai`, `groq`, `ollama`).
  - `status: ModelStatus` (Trạng thái vòng đời: `ACTIVE`, `INACTIVE`, `DEGRADED`, `ARCHIVED`).
  - `is_default: boolean` (Cờ chỉ định mô hình mặc định cho các phiên chat mới - `BR-013`, `BR-023`).
  - `context_window: integer` (Kích thước cửa sổ ngữ cảnh tối đa tính theo token - `BR-024`).
  - `max_tokens: integer` (Giới hạn token tối đa cho mỗi phản hồi sinh ra - `BR-024`).
  - `supports_streaming: boolean` (Hỗ trợ truyền luồng token thời gian thực SSE).
  - `latency_ms: Optional[integer]` (Độ trễ Round-Trip đo lường trong lần kiểm tra gần nhất).
  - `last_checked_at: Optional[DateTime]` (Thời điểm kiểm tra sức khỏe kết nối gần nhất).
  - `created_at, updated_at: DateTime` (Thời gian khởi tạo và cập nhật bản ghi).
- **Hành Vi Miền (Domain Behaviors)**:
  - `activate()`: Xác thực khóa API trong `.env` (`BR-014`) và chuyển trạng thái sang `ACTIVE`.
  - `deactivate()`: Kiểm tra không phải mô hình mặc định (`BR-013`, `BR-023`) và chuyển trạng thái sang `INACTIVE` (Áp dụng Soft Toggle, không xóa cứng theo `BR-012`).
  - `update_configuration(name, context_window, max_tokens, supports_streaming)`: Cập nhật thông số mô hình, thẩm định biên an toàn (`BR-024`), duy trì bất biến `id` và `provider` (`BR-022`, `FR-036`).
  - `archive()`: Xóa mềm mô hình bằng cách chuyển trạng thái sang `ARCHIVED`, cấm thực hiện nếu đang là mô hình mặc định (`BR-023`, `FR-039`).
  - `record_latency(latency_ms)`: Ghi nhận thời gian trễ thực tế sau khi Ping kiểm tra kết nối thành công (`FR-023`).
  - `degrade()`: Tự động hạ cấp sang `DEGRADED` khi gặp lỗi hạn ngạch hoặc sự cố gián đoạn kéo dài (`BR-015`).
  - `set_as_default()`: Đặt làm mô hình mặc định khi đang ở trạng thái `ACTIVE` (`BR-013`).


---

### 1.5 Thực Thể: ApiMetricLog (Nhật Ký Đo Lường Tài Nguyên)
- **Định Danh Duy Nhất (Identity)**: `id: UUID` (Khóa chính bất biến).
- **Ý Nghĩa**: Đại diện cho một bản ghi đo lường chi tiết về hiệu năng, độ trễ và tiêu thụ token của một yêu cầu API hoặc lượt đàm thoại với AI (`BR-019`).
- **Thuộc Tính Nghiệp Vụ**:
  - `user_id: Optional[UUID]` (Khóa ngoại tham chiếu người dùng thực hiện yêu cầu; null cho khách vãng lai).
  - `endpoint: string` (Đường dẫn API, ví dụ: `/api/v1/chat/conversations/{conv_id}/stream`).
  - `http_method: string` (Phương thức HTTP: `GET`, `POST`, `PATCH`, `DELETE`).
  - `status_code: integer` (Mã phản hồi HTTP: 200, 400, 429, 500,...).
  - `latency_ms: float` (Tổng thời gian xử lý yêu cầu tính bằng mili-giây).
  - `ttft_ms: Optional[float]` (Thời gian nhận token đầu tiên cho luồng SSE stream).
  - `prompt_tokens: integer` (Số lượng token trong câu hỏi / ngữ cảnh người dùng).
  - `completion_tokens: integer` (Số lượng token trong câu trả lời sinh ra bởi AI).
  - `total_tokens: integer` (Tổng số token tiêu thụ: `prompt_tokens + completion_tokens`).
  - `model_used: Optional[ModelIdentifier]` (Mô hình AI đã thực thi phản hồi).
  - `ip_address: string` (Địa chỉ IP của client, đã được băm/ẩn danh bảo mật theo `NFR-019`).
  - `created_at: DateTime` (Thời điểm ghi nhận yêu cầu).

---

### 1.6 Thực Thể: UserQuota (Hạn Ngạch Tài Nguyên Người Dùng)
- **Định Danh Duy Nhất (Identity)**: `id: UUID` (Khóa chính bất biến).
- **Ý Nghĩa**: Quản lý hạn mức tài nguyên (Token hằng ngày và tốc độ yêu cầu) được cấp phát cho một tài khoản người dùng (`FR-032`, `BR-020`).
- **Thuộc Tính Nghiệp Vụ**:
  - `user_id: UUID` (Khóa ngoại UNIQUE tham chiếu `User.id`).
  - `daily_token_limit: integer` (Hạn mức token tối đa được sử dụng trong ngày, mặc định: 100,000 tokens).
  - `daily_tokens_used: integer` (Số token đã tiêu thụ trong ngày hiện tại, khởi tạo: 0).
  - `rpm_limit: integer` (Giới hạn số yêu cầu tối đa trên một phút, mặc định: 30 RPM).
  - `status: QuotaStatus` (Trạng thái hạn ngạch: `NORMAL`, `WARNING_80`, `EXCEEDED_THROTTLED`).
  - `reset_at: DateTime` (Thời điểm thiết lập lại hạn ngạch: 00:00:00 UTC hằng ngày).
  - `created_at, updated_at: DateTime` (Thời điểm khởi tạo và cập nhật).
- **Hành Vi Miền (Domain Behaviors)**:
  - `consume_tokens(amount)`: Tăng `daily_tokens_used`, cập nhật `status` tương ứng (`NORMAL` -> `WARNING_80` khi >=80%, `EXCEEDED_THROTTLED` khi >=100%).
  - `is_throttled() -> bool`: Kiểm tra xem tài khoản có đang bị chặn do hết hạn ngạch hay không.
  - `reset_daily_quota()`: Đặt lại `daily_tokens_used = 0` và chuyển trạng thái về `NORMAL`.

---

### 1.7 Thực Thể: DiscordBotConfig (Cấu Hình Bot Discord Đa Phạm Vi)
- **Định Danh Duy Nhất (Identity)**: `id: UUID` (Khóa chính bất biến).
- **Ý Nghĩa**: Đại diện cho cấu hình quản trị bot Discord của một người dùng đã liên kết Discord, kiểm soát phạm vi Guild hoạt động, mô hình định tuyến hoạt động, nhân cách prompt và trần token tối đa (`FR-044`, `FR-045`, `FR-046`, `BR-031`, `BR-033`, `BR-034`).
- **Thuộc Tính Nghiệp Vụ**:
  - `user_id: UUID` (Khóa ngoại UNIQUE tham chiếu `User.id`).
  - `guild_id: Optional[string]` (ID Discord server được liên kết; người dùng phải có quyền `ADMINISTRATOR` 0x8 hoặc `MANAGE_GUILD` 0x20 theo `BR-034`).
  - `channel_id: Optional[string]` (ID kênh chat Discord giới hạn; null nếu bot lắng nghe mọi kênh cho phép).
  - `active_model_id: string` (Khóa ngoại tham chiếu `AgentModel.id`, bắt buộc trạng thái `ACTIVE` theo `BR-033`).
  - `system_prompt: string` (Persona prompt định hình phong cách đàm thoại của Bot; mặc định: prompt trợ lý thông minh AI-Chan).
  - `max_tokens_per_response: integer` (Trần token tối đa cho mỗi phản hồi: 50 - 4,000, mặc định: 1,000).
  - `is_enabled: boolean` (Cờ bật/tắt hoạt động của bot; mặc định: true).
  - `created_at, updated_at: DateTime` (Thời điểm khởi tạo và cập nhật).
- **Hành Vi Miền (Domain Behaviors)**:
  - `update_config(...)`: Cập nhật cấu hình bot, kiểm tra bất biến model active (`BR-033`) và trần token hợp lệ.
  - `toggle_status(enabled: bool)`: Bật hoặc tạm ngưng hoạt động của bot.
  - `route_model(fallback_model_id: str) -> str`: Trả về `active_model_id` nếu khả dụng, ngược lại fallback về model mặc định (`BR-033`).

---

## 2. Danh Mục Các Đối Tượng Giá Trị (Value Objects)

Các đối tượng giá trị là các thành phần **bất biến (Immutable)** được định nghĩa bằng giá trị của chúng:

| Đối Tượng Giá Trị | Kiểu Dữ Liệu | Ràng Buộc Bất Biến (Invariants) |
| :--- | :--- | :--- |
| **`EmailAddress`** | String | Phải tuân thủ định dạng RFC 5322, tự động chuẩn hóa về chữ thường (lowercase), không chứa khoảng trắng. |
| **`HashedPassword`**| String | Chuỗi băm 60 ký tự theo chuẩn bcrypt (`$2b$...`). Không bao giờ chứa mật khẩu dạng plain-text. |
| **`MessageContent`**| String | Chuỗi ký tự có độ dài từ **1 đến tối đa 4,000 ký tự** sau khi cắt tỉa khoảng trắng đầu cuối (`BR-003`). Không được rỗng. |
| **`ConversationTitle`**| String | Chuỗi ký tự từ 1 đến 255 ký tự. Khi tự động sinh chỉ lấy tối đa 30 ký tự đầu (`BR-004`). |
| **`MessageRole`** | Enum | Giá trị hợp lệ: `user`, `assistant`, `system`. |
| **`ModelIdentifier`**| String | Chuỗi định danh mô hình hợp lệ: `gemini-3.8-flash`, `gemini-3.5-flash`, `gpt-4o-mini`, `claude-3-7-sonnet`,... |
| **`ModelProvider`** | Enum | Giá trị hợp lệ: `google`, `anthropic`, `openai`, `groq`, `ollama`. |
| **`ModelStatus`** | Enum | Giá trị hợp lệ: `ACTIVE`, `INACTIVE`, `DEGRADED`. |

