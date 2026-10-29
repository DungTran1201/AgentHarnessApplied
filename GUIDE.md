# AI-Chan User & Administrator Guide (v0.1.2)

## 1. Quản lý API Keys & Thứ tự Ưu tiên (`PERSONAL > SYSTEM > NONE`)

AI-Chan hỗ trợ cấu hình khóa API cho **7 nhà cung cấp** được chia làm 2 nhóm:
- **Mô hình Ngôn ngữ Lớn (LLM Providers)**:
  - **Google Gemini** (`google` / alias `gemini`) — Biến môi trường: `GEMINI_API_KEY`
  - **OpenAI** (`openai`) — Biến môi trường: `OPENAI_API_KEY`
  - **Anthropic Claude** (`anthropic` / alias `claude`) — Biến môi trường: `ANTHROPIC_API_KEY`
  - **Groq Cloud** (`groq`) — Biến môi trường: `GROQ_API_KEY`
  - **Ollama Local Service** (`ollama`) — Biến môi trường: `OLLAMA_BASE_URL` (mặc định: `http://localhost:11434`)
- **Công cụ Tìm kiếm Web (Search Integrations)**:
  - **Brave Search API** (`brave`) — Biến môi trường: `BRAVE_SEARCH_API_KEY`
  - **SerpAPI (Google Search)** (`serpapi`) — Biến môi trường: `SERPAPI_API_KEY`

### Quy tắc ưu tiên nguồn khóa tại Runtime
Hệ thống áp dụng thứ tự ưu tiên nhất quán cho mọi yêu cầu Chat, Streaming, Ping Test và Công cụ Tìm kiếm:

1. **`PERSONAL` (Khóa cá nhân của người dùng)**:
   - Được lưu trữ mã hóa **AES-256-GCM** trong bảng `user_api_keys` theo cặp `(user_id, provider)`.
   - Có độ ưu tiên cao nhất và **có hiệu lực ngay lập tức** ở lượt gọi tiếp theo mà không cần khởi động lại ứng dụng.
   - Khi bạn thay thế khóa cá nhân, bộ đếm cooldown giới hạn băng thông (HTTP 429) của khóa cũ sẽ tự động được xóa ngay lập tức.
2. **`SYSTEM` (Cấu hình mặc định máy chủ `.env`)**:
   - Được sử dụng khi người dùng chưa thiết lập khóa cá nhân cho nhà cung cấp đó, hoặc sau khi người dùng nhấn **Xóa khóa cá nhân**.
   - Nếu bạn đang có Khóa cá nhân (`PERSONAL`), việc cập nhật biến `.env` hệ thống sẽ **không** ghi đè khóa cá nhân của bạn cho đến khi bạn xóa khóa cá nhân đó.
3. **`NONE` (Chưa cấu hình)**:
   - Khi cả khóa cá nhân và khóa hệ thống đều chưa được thiết lập.

---

## 2. Hướng dẫn Thêm, Thay thế, Kiểm tra và Xóa Khóa trong Settings

Truy cập **Settings -> API Keys** (`/settings?tab=api-keys`):

1. **Thêm hoặc Thay thế Khóa cá nhân**:
   - Nhấn **Thay thế khóa cá nhân** (hoặc nhập trực tiếp nếu nhà cung cấp chưa có khóa).
   - Nhập khóa API mới vào ô nhập liệu.
   - *(Tùy chọn)* Nhấn **Test khóa vừa nhập (chưa lưu)** để kiểm tra thử khóa ứng viên mà không làm thay đổi trạng thái của khóa đã lưu trong cơ sở dữ liệu.
   - Nhấn **Lưu khóa thay thế** / **Lưu khóa cá nhân**. Giao diện sẽ tự động xóa chuỗi plaintext trong ô nhập, tải lại trạng thái từ máy chủ, hiển thị 4 ký tự cuối (`****abcd`) cùng mã định danh rút gọn (`SHA256 #...`).
   - Nhấn **Test khóa đang dùng** để xác nhận kết nối thực tế từ khóa đã lưu tới nhà cung cấp.
2. **Xóa Khóa cá nhân & Hoàn tác về Mặc định Hệ thống**:
   - Nhấn **Xóa khóa riêng (về .env)** / **Xóa khóa cá nhân** và xác nhận trong hộp thoại.
   - Hệ thống sẽ xóa bản ghi cá nhân và tự động chuyển nguồn khóa về `SYSTEM (.env)` (nếu máy chủ có cấu hình) hoặc `NONE`.
3. **Khắc phục Lỗi Giải mã Khóa cá nhân (`decryption_error`)**:
   - Nếu `SECRET_KEY` hoặc `AI_CHAN_SECRET_ENCRYPTION_KEY` của máy chủ bị thay đổi khiến khóa cá nhân cũ không thể giải mã, hệ thống sẽ **không** âm thầm chuyển sang khóa hệ thống mà hiển thị cảnh báo **Lỗi giải mã khóa cá nhân — Cần lưu lại**.
   - Để khắc phục, hãy nhấn **Thay thế khóa cá nhân** để lưu lại khóa mới hoặc nhấn **Xóa khóa cá nhân** để dùng cấu hình hệ thống.

---

## 3. Chẩn đoán Nhanh (Diagnostics Endpoint)

Người dùng đã đăng nhập có thể kiểm tra nguồn khóa thực tế đang có hiệu lực cho bất kỳ nhà cung cấp nào qua endpoint chẩn đoán an toàn (không bao giờ trả về khóa bí mật):

```http
GET /api/v1/settings/api-keys/{provider}/diagnostics
```

Phản hồi mẫu:
```json
{
  "provider": "openai",
  "name": "OpenAI",
  "category": "LLM",
  "env_var": "OPENAI_API_KEY",
  "effective_source": "PERSONAL",
  "is_configured": true,
  "has_personal_key": true,
  "has_system_key": true,
  "masked_hint": "****2222",
  "key_fingerprint": "9f8e7d6c",
  "decryption_error": false,
  "error_message": null,
  "routing_supported": true,
  "default_model": "gpt-4o-mini",
  "precedence_contract": "PERSONAL > SYSTEM > NONE"
}
```
