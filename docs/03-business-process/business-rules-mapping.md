# ÁNH XẠ QUY TẮC NGHIỆP VỤ VÀO QUY TRÌNH (BUSINESS RULES MAPPING)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `BP-BR-MAP-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Đối chiếu chi tiết từng quy tắc nghiệp vụ (`BR-001` đến `BR-006`) đã được định nghĩa trong Requirements Baseline vào từng bước thực thi cụ thể của các quy trình nghiệp vụ |

---

## 1. Ma Trận Ánh Xạ Quy Tắc Nghiệp Vụ Vào Quy Trình

| Mã Quy Tắc | Tên Quy Tắc Nghiệp Vụ | Quy Trình Thực Thi Chính | Vị Trí / Bước Kiểm Soát Trong Luồng | Cơ Chế Thực Thi Kỹ Thuật | Hành Vi Khi Vi Phạm |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`BR-001`** | Bắt Buộc Xác Thực Để Lưu Trữ Phiên Hội Thoại | `BP-CONV-001`, `BP-CONV-002`, `BP-CHAT-001` | Bước xác thực đầu tiên của mọi API hội thoại và tin nhắn | Kiểm tra sự tồn tại và tính hợp lệ của Cookie `access_token` qua FastAPI Dependency | Từ chối ngay lập tức với mã lỗi `HTTP 401 Unauthorized`; điều hướng về `/login` |
| **`BR-002`** | Cách Ly Quyền Sở Hữu Cuộc Trò Chuyện (Anti-IDOR) | `BP-CONV-002`, `BP-CONV-003`, `BP-CONV-004`, `BP-CHAT-001` | Tầng Service/Repository trước khi đọc, sửa, xóa hoặc thêm tin nhắn | Bắt buộc kèm điều kiện: `WHERE id = :conv_id AND user_id = :current_user_id` trong mọi câu lệnh SQL | Trả về `HTTP 404 Not Found` hoặc `HTTP 403 Forbidden`; ghi log cảnh báo an ninh |
| **`BR-003`** | Giới Hạn Chiều Dài Tin Nhắn Đầu Vào (<= 4,000 ký tự) | `BP-CHAT-001 [PROC-008]` | 1. Client trước khi gửi; 2. Pydantic validation tại Backend | Client đếm ký tự (`length <= 4000`); Schema Pydantic `Field(min_length=1, max_length=4000)` | Client khóa nút gửi; Backend trả về `HTTP 422 Unprocessable Entity` |
| **`BR-004`** | Quy Ước Đặt Tiêu Đề Cuộc Trò Chuyện Tự Động | `BP-CHAT-001`, `BP-CONV-003` | Sau khi lưu tin nhắn đầu tiên của người dùng | Kiểm tra `if conv.title == "Cuộc trò chuyện mới": conv.title = prompt[:30].strip()` | Không áp dụng nếu người dùng đã đổi tên thủ công trước đó |
| **`BR-005`** | Thứ Tự Ưu Tiên Điều Phối Nhà Cung Cấp AI (Gemini -> OpenAI) | `BP-AI-001 [PROC-009]` | Tầng `LLMManager` khi nhận yêu cầu chat | Gọi `GeminiProvider` trước; nếu bắt ngoại lệ (429, 5xx, timeout 30s) -> chuyển `OpenAIProvider` | Nếu cả 2 đều lỗi -> trả về thông báo lỗi hệ thống thân thiện |
| **`BR-006`** | Xử Lý Khi Vượt Quá Tần Suất Cho Phép (Rate Limiting) | `BP-SEC-001 [PROC-010]` | 1. Ingress Nginx; 2. Middleware Backend FastAPI | Nginx `limit_req_zone` (10 r/s); In-memory sliding window (60 r/min/IP) | Chặn đứng yêu cầu; trả về `HTTP 429 Too Many Requests` kèm tiêu đề `Retry-After: 60` |
| **`BR-016`** | Bảo Vệ Chống CSRF Qua Tham Số State Trong OAuth2 | `BP-AUTH-004 [PROC-014]` | Chuyển hướng ủy quyền và xử lý callback OAuth2 | Mã hóa mật mã HMAC-SHA256 kèm TTL 10 phút | Từ chối xử lý, trả về `HTTP 400 Bad Request` |
| **`BR-017`** | Tự Động Liên Kết Tài Khoản Qua Email Đã Xác Minh | `BP-AUTH-004 [PROC-014]` | Callback OAuth2 khi tìm thấy email trùng khớp | Kiểm tra cờ `verified == true` từ Discord API | Từ chối tự động liên kết nếu chưa xác minh |
| **`BR-018`** | Bất Biến Mật Khẩu Null Cho Tài Khoản OAuth Thuần Túy | `BP-AUTH-004`, `BP-AUTH-002` | Khởi tạo tài khoản OAuth & Đăng nhập form | Cột `hashed_password NULL` & Kiểm tra null khi login | Chặn đăng nhập form thường, yêu cầu đăng nhập Discord |
| **`BR-019`** | Tính Bất Biến & Toàn Vẹn Trong Ghi Nhận Telemetry | `BP-RES-001 [PROC-015]` | Kết thúc request API hoặc lượt đàm thoại streaming | Giao dịch nguyên tử ghi `api_metric_logs` và tăng quota | Bọc trong try-except không làm gián đoạn response |
| **`BR-020`** | Cảnh Báo Ngưỡng Hạn Ngạch & Điều Tiết Chặn Quota | `BP-RES-002 [PROC-016]` | Trước khi chuyển request tới LLM Engine | Kiểm tra `daily_tokens_used / daily_token_limit` | Cảnh báo khi >=80%, chặn HTTP 429 khi >=100% |
| **`BR-021`** | Phân Quyền & Cô Lập Dữ Liệu Đo Lường Dashboard | `BP-RES-002 [PROC-016]` | Endpoint tóm tắt, lịch sử và luồng SSE metrics | Lọc truy vấn `WHERE user_id = current_user.id` | Ngăn chặn rò rỉ dữ liệu tài nguyên chéo tài khoản |

---

## 2. Chi Tiết Thực Thi Từng Quy Tắc Nghiệp Vụ

---

### 2.1 BR-001: Bắt Buộc Xác Thực Để Lưu Trữ Phiên Hội Thoại
- **Mục Tiêu**: Ngăn chặn tình trạng spam tài nguyên cơ sở dữ liệu và bảo đảm mọi phiên hội thoại đều thuộc về một chủ thể người dùng định danh.
- **Áp Dụng Trong Quy Trình**:
  - `BP-CONV-001`: Ngăn người chưa đăng nhập tạo hội thoại mới.
  - `BP-CONV-002`: Ngăn người chưa đăng nhập đọc trộm dữ liệu hội thoại.
  - `BP-CHAT-001`: Ngăn người chưa đăng nhập gửi câu hỏi lưu vào CSDL.
- **Bằng Chứng Truy Vết**: Đáp ứng các yêu cầu `FR-001`, `FR-002`, `FR-004`, `SEC-004`.

---

### 2.2 BR-002: Cách Ly Quyền Sở Hữu Cuộc Trò Chuyện (Anti-IDOR)
- **Mục Tiêu**: Đảm bảo người dùng `User A` tuyệt đối không thể xem, sửa tên, xóa hoặc chat vào cuộc trò chuyện của `User B`.
- **Áp Dụng Trong Quy Trình**:
  - `BP-CONV-002` (Xem lịch sử): Chỉ nạp các cuộc trò chuyện có `user_id == current_user_id`.
  - `BP-CONV-003` (Đổi tên): Chỉ cập nhật nếu thuộc quyền sở hữu của người gọi API.
  - `BP-CONV-004` (Xóa hội thoại): Chỉ xóa khi người yêu cầu là chủ sở hữu.
  - `BP-CHAT-001` (Gửi tin nhắn): Chỉ cho phép gửi tin nhắn vào cuộc trò chuyện của chính mình.
- **Bằng Chứng Truy Vết**: Đáp ứng các yêu cầu `FR-005`, `FR-006`, `FR-007`, `FR-012`, `NFR-018`.

---

### 2.3 BR-003: Giới Hạn Chiều Dài Tin Nhắn Đầu Vào
- **Mục Tiêu**: Tối ưu hóa chi phí token và ngăn ngừa sự cố tràn bộ nhớ xử lý chuỗi.
- **Áp Dụng Trong Quy Trình**:
  - `BP-CHAT-001`: Kiểm tra chuỗi văn bản không được rỗng sau khi strip khoảng trắng và độ dài từ 1 đến tối đa 4,000 ký tự.
- **Bằng Chứng Truy Vết**: Đáp ứng các yêu cầu `FR-008`, `NFR-007`.

---

### 2.4 BR-004: Quy Ước Đặt Tiêu Đề Cuộc Trò Chuyện Tự Động
- **Mục Tiêu**: Nâng cao trải nghiệm người dùng, tự động phân loại chủ đề mà không đòi hỏi thao tác gõ thủ công.
- **Áp Dụng Trong Quy Trình**:
  - `BP-CONV-001`: Đặt tiêu đề ban đầu là `"Cuộc trò chuyện mới"`.
  - `BP-CHAT-001`: Sau khi tin nhắn đầu tiên gửi thành công, nếu tiêu đề vẫn là tiêu đề mặc định -> tự động lấy 30 ký tự đầu làm tiêu đề mới.
  - `BP-CONV-003`: Nếu người dùng đã tự sửa tên thủ công -> Vô hiệu hóa quy tắc đặt tên tự động.
- **Bằng Chứng Truy Vết**: Đáp ứng các yêu cầu `FR-004`, `FR-006`.

---

### 2.5 BR-005: Thứ Tự Ưu Tiên Điều Phối Nhà Cung Cấp AI
- **Mục Tiêu**: Tiết kiệm chi phí vận hành (ưu tiên Google Gemini) nhưng đảm bảo độ sẵn sàng 99.9% (chuyển vùng sang OpenAI khi có sự cố).
- **Áp Dụng Trong Quy Trình**:
  - `BP-AI-001`: Được thực thi trực tiếp bên trong `LLMManager`.
- **Bằng Chứng Truy Vết**: Đáp ứng các yêu cầu `FR-009`, `FR-010`, `FR-011`, `NFR-008`, `AC-004`.

---

### 2.6 BR-006: Xử Lý Khi Vượt Quá Tần Suất Cho Phép
- **Mục Tiêu**: Bảo vệ hệ thống trước tấn công từ chối dịch vụ (DDoS) và bot lạm dụng tài nguyên.
- **Áp Dụng Trong Quy Trình**:
  - `BP-SEC-001`: Lá chắn kiểm soát kép tại Ingress Gateway (10 r/s) và FastAPI Application (60 r/min).
- **Bằng Chứng Truy Vết**: Đáp ứng các yêu cầu `NFR-007`, `SEC-005`, `AC-005`.

---

### 2.7 BR-016: Bảo Vệ Chống CSRF Qua Tham Số State Trong OAuth2
- **Mục Tiêu**: Ngăn chặn tấn công CSRF và tấn công chiếm đoạt phiên xác thực bên thứ ba.
- **Áp Dụng Trong Quy Trình**:
  - `BP-AUTH-004`: Sinh state ký HMAC khi chuyển hướng và kiểm tra khớp chuỗi state tại callback.
- **Bằng Chứng Truy Vết**: Đáp ứng các yêu cầu `FR-027`, `FR-028`, `SEC-008`, `ADR-007`.

---

### 2.8 BR-017: Tự Động Liên Kết Tài Khoản Qua Email Đã Xác Minh Từ Discord
- **Mục Tiêu**: Tránh tạo bản ghi tài khoản trùng lặp và bảo vệ chống chiếm đoạt tài khoản khi email chưa được verify.
- **Áp Dụng Trong Quy Trình**:
  - `BP-AUTH-004`: Kiểm tra cờ `verified` từ Discord trước khi tự động gắn `discord_id` vào tài khoản có cùng email.
- **Bằng Chứng Truy Vết**: Đáp ứng các yêu cầu `FR-027`, `FR-028`, `SEC-008`, `ADR-007`.

---

### 2.9 BR-018: Bất Biến Mật Khẩu Null Cho Tài Khoản OAuth Thuần Túy
- **Mục Tiêu**: Cho phép người dùng đăng ký qua Discord không cần mật khẩu nhưng chặn các request login form không có password hợp lệ.
- **Áp Dụng Trong Quy Trình**:
  - `BP-AUTH-004`: Cho phép `hashed_password = NULL` khi khởi tạo từ Discord.
  - `BP-AUTH-002`: Chặn đăng nhập truyền thống nếu tài khoản chưa từng thiết lập mật khẩu (`hashed_password IS NULL`).
- **Bằng Chứng Truy Vết**: Đáp ứng các yêu cầu `FR-002`, `FR-019`, `FR-027`, `ADR-007`.

---

### 2.10 BR-019: Tính Bất Biến & Toàn Vẹn Trong Ghi Nhận Telemetry & Token
- **Mục Tiêu**: Bảo toàn sự toàn vẹn của số liệu đo lường tài nguyên, không để thất thoát hoặc ghi đè sai lệch dữ liệu token.
- **Áp Dụng Trong Quy Trình**:
  - `BP-RES-001`: Ghi log đo lường vào `api_metric_logs` và tăng quota `user_quotas` một cách nguyên tử.
- **Bằng Chứng Truy Vết**: Đáp ứng các yêu cầu `FR-029`, `FR-030`, `FR-031`, `ADR-008`.

---

### 2.11 BR-020: Cảnh Báo Ngưỡng Hạn Ngạch & Điều Tiết Chặn Quota
- **Mục Tiêu**: Ngăn chặn vét cạn hạn ngạch AI, bảo vệ máy chủ và cảnh báo sớm cho người dùng.
- **Áp Dụng Trong Quy Trình**:
  - `BP-RES-002`: Cảnh báo khi chạm 80% quota và chặn HTTP 429 khi chạm 100% quota hằng ngày.
- **Bằng Chứng Truy Vết**: Đáp ứng các yêu cầu `FR-032`, `CTRL-008`, `SEC-009`, `ADR-008`.

---

### 2.12 BR-021: Phân Quyền & Cô Lập Dữ Liệu Đo Lường Dashboard
- **Mục Tiêu**: Đảm bảo an toàn quyền riêng tư, cách ly dữ liệu sử dụng giữa các người dùng và phân định quyền quản trị viên.
- **Áp Dụng Trong Quy Trình**:
  - `BP-RES-002`: Lọc số liệu Dashboard và luồng SSE theo `user_id == current_user.id` cho người dùng thông thường; chỉ cho phép Admin xem số liệu toàn hệ thống.
- **Bằng Chứng Truy Vết**: Đáp ứng các yêu cầu `FR-033`, `FR-034`, `SEC-009`, `ADR-008`.

---

### 2.13 BR-022: Tính Bất Biến & Duy Nhất Toàn Cục Của Định Danh Mô Hình
- **Mục Tiêu**: Bảo toàn tính toàn vẹn quan hệ cơ sở dữ liệu và ngăn chặn rách vỡ liên kết khóa ngoại với tin nhắn và số liệu đo lường.
- **Áp Dụng Trong Quy Trình**:
  - `BP-MOD-001`: Kiểm tra tính duy nhất khi thêm mới mô hình và cấm sửa đổi `id` hoặc `provider` trong mọi yêu cầu cập nhật.
- **Bằng Chứng Truy Vết**: Đáp ứng các yêu cầu `FR-035`, `FR-036`, `SEC-010`, `ADR-009`.

---

### 2.14 BR-023: Bảo Vệ Bất Biến Mô Hình Mặc Định Khi Xóa/Lưu Trữ
- **Mục Tiêu**: Duy trì tính sẵn sàng liên tục của hệ sinh thái đàm thoại, luôn đảm bảo có ít nhất một mô hình hoạt động tiếp nhận câu hỏi.
- **Áp Dụng Trong Quy Trình**:
  - `BP-MOD-002`: Chặn đứng yêu cầu xóa mềm hoặc hủy kích hoạt nếu mô hình đang mang cờ `is_default = 1`.
- **Bằng Chứng Truy Vết**: Đáp ứng các yêu cầu `FR-025`, `FR-026`, `FR-039`, `SEC-010`, `ADR-009`.

---

### 2.15 BR-024: Thẩm Định Biên Tham Số & Cửa Sổ Ngữ Cảnh An Toàn
- **Mục Tiêu**: Ngăn ngừa lỗi runtime của thư viện LangChain / LangGraph và bảo vệ độ hoàn chỉnh của câu trả lời do AI sinh ra.
- **Áp Dụng Trong Quy Trình**:
  - `BP-MOD-001`: Kiểm tra giới hạn an toàn `context_window >= 1000` và `max_tokens >= 256` bằng schema validator trước khi lưu.
- **Bằng Chứng Truy Vết**: Đáp ứng các yêu cầu `FR-035`, `FR-036`, `SEC-010`, `ADR-009`.

---

### 2.16 BR-025: Ràng Buộc Ánh Xạ 1-1 & Tính Duy Nhất Của Discord ID
- **Mục Tiêu**: Loại bỏ nguy cơ xung đột định danh OAuth và ngăn ngừa tấn công chiếm đoạt tài khoản.
- **Áp Dụng Trong Quy Trình**:
  - `BP-USER-003`: Kiểm tra tính duy nhất của `discord_id`, từ chối với HTTP 409 Conflict nếu tài khoản Discord đã được liên kết với người dùng khác.
- **Bằng Chứng Truy Vết**: Đáp ứng các yêu cầu `FR-040`, `SEC-011`, `CTRL-010`, `ADR-010`.

---

### 2.17 BR-026: Chốt Chặn Chống Khóa Tài Khoản Khi Hủy Liên Kết
- **Mục Tiêu**: Bảo vệ người dùng không bị mất quyền truy cập tài khoản vĩnh viễn khi hủy liên kết Discord.
- **Áp Dụng Trong Quy Trình**:
  - `BP-USER-004`: Kiểm tra `hashed_password IS NOT NULL`, từ chối hủy liên kết nếu tài khoản chưa thiết lập mật khẩu cục bộ.
- **Bằng Chứng Truy Vết**: Đáp ứng các yêu cầu `FR-041`, `SEC-011`, `CTRL-010`, `ADR-010`.

---

### 2.18 BR-027: Tái Xác Thực Khi Hủy Liên Kết Danh Tính Mạng Xã Hội
- **Mục Tiêu**: Ngăn chặn tấn công CSRF và thao túng tài khoản từ máy trạm không giám sát khi thực hiện thao tác nhạy cảm.
- **Áp Dụng Trong Quy Trình**:
  - `BP-USER-004`: Yêu cầu gửi kèm mật khẩu hiện tại và kiểm tra khớp bcrypt trước khi gỡ `discord_id`.
- **Bằng Chứng Truy Vết**: Đáp ứng các yêu cầu `FR-041`, `SEC-006`, `SEC-011`, `CTRL-010`, `ADR-010`.

---

### 2.19 BR-031: Tiền Điều Kiện Tài Khoản Liên Kết Discord Cho Tính Năng Bot
- **Mục Tiêu**: Ngăn chặn truy cập bất hợp pháp hoặc cấu hình rỗng khi người dùng chưa có danh tính Discord được xác thực.
- **Áp Dụng Trong Quy Trình**:
  - `BP-BOT-001` (`PROC-022`): Kiểm tra `user.discord_id IS NOT NULL`, từ chối ngay với HTTP 403 Forbidden nếu tài khoản chưa liên kết Discord.
  - `BP-BOT-002` (`PROC-023`): Chặn xử lý tương tác nếu tài khoản sở hữu bot bị ngắt kết nối.
- **Bằng Chứng Truy Vết**: Đáp ứng các yêu cầu `FR-044`, `SEC-011`, `SEC-013`, `CTRL-012`, `ADR-012`, `OP-031`.

---

### 2.20 BR-032: Bất Biến Hợp Nhất & Dùng Chung Hạn Ngạch Token Giữa Web và Discord
- **Mục Tiêu**: Duy trì chính sách kiểm soát tài nguyên đồng nhất, chống vượt trần token miễn phí hoặc lạm dụng tài nguyên qua Discord gateway.
- **Áp Dụng Trong Quy Trình**:
  - `BP-BOT-002` (`PROC-023`): Mọi token tiêu thụ bởi Discord interaction đều được trừ nguyên tử vào bản ghi `user_quotas` của cùng tài khoản người dùng; chặn ngay với HTTP 429 nếu vượt ngưỡng `total_limit`.
- **Bằng Chứng Truy Vết**: Đáp ứng các yêu cầu `FR-046`, `BR-019`, `BR-020`, `CTRL-008`, `CTRL-012`, `ADR-012`, `OP-034`.

---

### 2.21 BR-033: Bất Biến Định Tuyến Mô Hình Hoạt Động & Cơ Chế Phục Hồi Failover
- **Mục Tiêu**: Đảm bảo chỉ mô hình đang sẵn sàng (ACTIVE) được điều phối xử lý hội thoại Discord; tự động chuyển sang mô hình mặc định nếu mô hình cấu hình bị tắt hoặc gặp sự cố.
- **Áp Dụng Trong Quy Trình**:
  - `BP-BOT-001` (`PROC-022`): Xác thực `active_model_id` phải tồn tại trong bảng `models` và có trạng thái `ACTIVE`.
  - `BP-BOT-002` (`PROC-023`): Khi dispatch gọi LLM, nếu mô hình chỉ định bị lỗi hoặc không khả dụng, tự động fallback về mô hình mang cờ `is_default = 1`.
- **Bằng Chứng Truy Vết**: Đáp ứng các yêu cầu `FR-045`, `BR-023`, `CTRL-009`, `CTRL-012`, `ADR-012`, `OP-032`.

---

### 2.22 BR-034: Thẩm Quyền Quản Trị Discord Guild & Ràng Buộc Kênh Hoạt Động
- **Mục Tiêu**: Ngăn chặn người dùng cấu hình bot vào các server Discord mà họ không có quyền sở hữu hoặc quyền quản trị, bảo vệ an toàn cho các cộng đồng Discord.
- **Áp Dụng Trong Quy Trình**:
  - `BP-BOT-001` (`PROC-022`): Kiểm tra bitwise permission `(permissions & 0x8) != 0` (Administrator) hoặc `(permissions & 0x20) != 0` (Manage Guild) từ danh sách Guild của Discord OAuth API; từ chối lưu Guild không thuộc quyền quản trị.
- **Bằng Chứng Truy Vết**: Đáp ứng các yêu cầu `FR-044`, `SEC-013`, `CTRL-012`, `ADR-012`, `OP-033`.







