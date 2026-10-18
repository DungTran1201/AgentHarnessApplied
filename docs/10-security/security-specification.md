# ĐẶC TẢ AN NINH & BẢO MẬT HỆ THỐNG (SECURITY SPECIFICATION)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `SEC-SPEC-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Đặc tả toàn diện các tiêu chuẩn và cơ chế kỹ thuật bảo vệ tính Xác thực (Authentication), Phân quyền (Authorization), Bảo vệ phiên, Chống tấn công IDOR và Bảo mật bí mật máy chủ |

---

## 1. Cơ Chế Xác Thực & Quản Lý Phiên (Authentication & Session Security)

1. **Mã Hóa Băm Mật Khẩu (`SEC-002`)**:
   - Mật khẩu người dùng được băm bằng thuật toán `bcrypt` với muối (Salt) tự sinh ngẫu nhiên.
   - Nghiêm cấm tuyệt đối lưu trữ hoặc ghi nhật ký mật khẩu dạng văn bản thô (Plain-text).
2. **Quản Lý Phiên Bằng HttpOnly Secure Cookie (`SEC-004`)**:
   - Sử dụng JSON Web Token (JWT) được ký bằng khóa bí mật máy chủ (`SECRET_KEY`) theo thuật toán `HS256`.
   - Token chỉ chứa định danh chủ thể (`sub = user.id`) và thời gian hết hạn (`exp = now + 7 days`).
   - Cấu hình Cookie phản hồi bắt buộc:
     - `HttpOnly = True`: Ngăn chặn hoàn toàn việc script độc hại đọc token qua lỗ hổng XSS trên trình duyệt.
     - `Secure = True`: Chỉ truyền trên kênh mã hóa HTTPS.
     - `SameSite = Lax`: Chống tấn công giả mạo yêu cầu từ trang web khác (CSRF).
     - `Max-Age = 604800` (7 ngày hiệu lực theo `NFR-006`).

---

## 2. Kiểm Soát Quyền Truy Cập & Chống Lỗ Hổng IDOR (Authorization & Anti-IDOR)

1. **Cách Ly Tuyệt Đối Quyền Sở Hữu (`BR-002`, `NFR-018`)**:
   - Mọi thao tác truy vấn dữ liệu nhạy cảm (đọc lịch sử, đổi tên, xóa cuộc trò chuyện hoặc gửi tin nhắn) bắt buộc phải kèm mệnh đề lọc định danh người dùng:
     ```sql
     WHERE id = :conversation_id AND user_id = :current_user_id
     ```
   - Nếu người dùng cố tình gửi mã `conv_id` của tài khoản khác, máy chủ trả về mã lỗi `HTTP 404 Not Found` hoặc `HTTP 403 Forbidden` và ghi vết cảnh báo an ninh vào log.

---

## 3. Thẩm Định Dữ Liệu Đầu Vào & Giới Hạn Tần Suất (Validation & Rate Limiting)

1. **Thẩm Định Độc Lập Tại Backend (`BR-003`)**:
   - Pydantic schema kiểm tra kiểu dữ liệu, định dạng email chuẩn RFC và độ dài chuỗi tin nhắn (1 đến 4,000 ký tự).
   - Loại bỏ khoảng trắng thừa đầu cuối (`trim/strip`) trước khi xử lý logic.
2. **Kiểm Soát Tần Suất 2 Tầng (`BR-006`, `SEC-005`)**:
   - **Tầng 1 (Ingress Gateway Nginx)**: Giới hạn tối đa **10 request/giây** trên mỗi IP (burst=20) để chống flood thô.
   - **Tầng 2 (FastAPI Middleware)**: Giới hạn tối đa **60 request/phút** trên mỗi IP với thuật toán cửa sổ trượt (Sliding Window).
   - Khi vượt ngưỡng, lập tức trả về mã lỗi `HTTP 429 Too Many Requests` kèm tiêu đề `Retry-After: 60`.

---

## 4. Quản Lý Bí Mật & Khóa API Đám Mây (Secrets Management)

- Toàn bộ các khóa nhạy cảm (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `POSTGRES_PASSWORD`, `SECRET_KEY`) chỉ tồn tại trong tệp môi trường `.env` phía máy chủ, được liệt kê trong `.gitignore`.
- Tuyệt đối không để lộ khóa bí mật trong mã nguồn, tài liệu hay trả về cho trình duyệt máy khách.

---

## 5. Bảo Vệ Thao Tác Nhạy Cảm & Luân Chuyển Mật Khẩu (Sensitive Operations & Password Rotation)

1. **Cơ Chế Bắt Buộc Tái Xác Thực Danh Tính (`SEC-006`, `BR-008`)**:
   - Đối với các hoạt động nhạy cảm có khả năng thay đổi vĩnh viễn quyền truy cập tài khoản (bao gồm: **Đổi Email** và **Đổi Mật Khẩu**), hệ thống bắt buộc yêu cầu Client gửi kèm `current_password`.
   - Backend thực hiện kiểm tra `verify_password(current_password, user.hashed_password)` trước khi cho phép tiến hành logic nghiệp vụ.
   - Thất bại trong việc tái xác thực trả về `HTTP 401 Unauthorized` và tăng bộ đếm cảnh báo thử sai (Failed Re-auth Counter).
2. **Luân Chuyển Mật Khẩu & Thu Hồi Phiên Đăng Nhập Cũ (`SEC-007`, `BR-009`)**:
   - Hệ thống phát hành mã thông báo JWT mới và ghi đè cookie `access_token` trên trình duyệt hiện tại.
   - Khi giải mã JWT token ở middleware `get_current_user`, nếu thời điểm phát hành token (`iat`) nhỏ hơn `password_changed_at`, token cũ lập tức bị coi là hết hiệu lực và bị từ chối truy cập.

---

## 6. An Ninh Xác Thực Bên Thứ Ba & Bảo Vệ OAuth2 (OAuth2 State Guard & Secrets Hardening — SEC-008)

1. **Phòng Ngừa Tấn Công Cross-Site Request Forgery (CSRF) & Login Injection (`BR-016`, `SEC-008`)**:
   - Khi khởi tạo luồng đăng nhập Discord (`GET /auth/discord/login`), Backend tạo chuỗi `state` ngẫu nhiên 32 byte được ký bằng HMAC-SHA256 kết hợp timestamp.
   - Chuỗi `state` được thiết lập vào cookie tạm thời mang cờ `HttpOnly; SameSite=Lax; Max-Age=600`.
   - Tại callback (`GET /auth/discord/callback`), Backend đối chiếu giá trị query param `state` với cookie và kiểm tra tính hợp lệ của chữ ký HMAC cùng thời hạn 10 phút. Nếu phát hiện sai lệch, lập tức hủy luồng và ghi log cảnh báo an ninh `SEC_OAUTH_STATE_MISMATCH`.
2. **Ngăn Ngừa Chiếm Đoạt Tài Khoản Qua Email Giả Mạo (`BR-017`)**:
   - Hệ thống nghiêm cấm tự động liên kết tài khoản Discord với tài khoản sẵn có nếu trường `verified` từ Discord trả về có giá trị `false`.
3. **Bảo Mật Thông Tin Định Danh Ứng Dụng (Secrets Isolation)**:
   - `DISCORD_CLIENT_SECRET` chỉ được phép lưu trong biến môi trường máy chủ và sử dụng độc quyền trong các cuộc gọi Server-to-Server tới Discord Token Endpoint. Tuyệt đối không để lộ secret ra giao diện Client.

---

## 7. Giám Sát Tài Nguyên & Kiểm Soát Quota An Ninh (Resource Telemetry & Quota Defense — SEC-009)

1. **Kiểm Soát Xác Thực Luồng SSE & Chống Cạn Kiệt Kết Nối (`SEC-009`)**:
   - Endpoint SSE thời gian thực (`GET /api/v1/resources/stream`) bắt buộc xác thực phiên người dùng qua JWT Cookie (`HttpOnly`) hoặc tiêu đề `Authorization: Bearer <token>`.
   - Giới hạn tối đa **3 luồng SSE đồng thời** trên mỗi người dùng nhằm triệt tiêu nguy cơ tấn công cạn kiệt socket/kết nối (Resource Starvation).
2. **Cách Ly Dữ Liệu Đo Đạc Tài Nguyên Đa Người Dùng (`BR-021`)**:
   - Người dùng thông thường (`role: user`) chỉ được cấp quyền truy vấn số liệu thống kê (Tokens, Latency, API Requests, Quota) thuộc về chính định danh `user_id` của mình.
   - Chỉ tài khoản quản trị hệ thống (`role: admin`) mới được truy cập dữ liệu đo đạc tổng hợp trên toàn hệ thống (Global Aggregated Metrics).
3. **Chống Rò Rỉ Dữ Liệu Nhạy Cảm Trong Bản Ghi Đo Đạc (Telemetry Redaction)**:
   - Bảng `ApiMetricLog` và sự kiện SSE chỉ lưu giữ các chỉ số kỹ thuật vận hành: thời gian phản hồi (`latency_ms`), TTFT (`ttft_ms`), số lượng token (`prompt_tokens`, `completion_tokens`, `total_tokens`), mã HTTP phản hồi (`status_code`), và tên đường dẫn (`endpoint`).
   - Tuyệt đối **không lưu trữ nội dung văn bản thô** của câu hỏi (Prompt) hoặc câu trả lời (Response content) trong kho dữ liệu đo đạc tài nguyên để ngăn ngừa rò rỉ dữ liệu cá nhân (PII) và bí mật hệ thống.
4. **Kiểm Soát Ngăn Chặn Vượt Hạn Ngạch Quota Tức Thì (`BR-020`, `CTRL-008`)**:
   - Trước khi gửi yêu cầu tới các nhà cung cấp LLM bên thứ ba (Gemini, OpenAI), hệ thống bắt buộc kiểm tra hạn ngạch hàng ngày (`daily_tokens_used + estimated_tokens <= daily_token_limit`).
   - Nếu hạn ngạch đã chạm 100%, hệ thống lập tức từ chối và phản hồi `HTTP 429 Too Many Requests` với mã lỗi `DAILY_QUOTA_EXCEEDED`, ngăn ngừa lạm dụng chi phí tài nguyên API.

---

## 8. Kiểm Soát Đột Biến Cấu Hình Mô Hình & Phân Quyền An Toàn (Model Mutation Guard — SEC-010)

1. **Kiểm Soát Xác Thực & Thẩm Quyền Đột Biến Danh Mục (`SEC-010`, `CTRL-009`)**:
   - Mọi thao tác thay đổi danh mục mô hình bao gồm: Thêm mô hình mới (`POST /models`, `OP-022`), Chỉnh sửa cấu hình (`PUT /models/{id}`, `OP-023`), Xóa mềm/Lưu trữ (`DELETE /models/{id}`, `OP-025`), và Đặt mặc định (`PATCH /models/default`, `OP-015`) bắt buộc phải được xác thực bằng JWT Token hợp lệ và kiểm tra quyền hạn quản trị (`role: admin` hoặc quyền quản lý mô hình).
2. **Kiểm Soát Tính Bất Biến Của Mã Định Danh & Nhà Cung Cấp (`BR-022`)**:
   - Hệ thống nghiêm cấm mọi payload cố ý ghi đè trường `id` hoặc thay đổi `provider` của mô hình đã tồn tại. Thao tác này nhằm loại bỏ triệt để nguy cơ tấn công Parameter Tampering, ngăn chặn phá vỡ ràng buộc toàn vẹn khóa ngoại trong cơ sở dữ liệu.
3. **Thẩm Định Biên Giới Hạn Tham Số Đầu Vào (Input Boundary Validation — `BR-024`)**:
   - Toàn bộ payload đầu vào phải trải qua bộ lọc Schema Validation nghiêm ngặt trước khi tới tầng xử lý nghiệp vụ: `context_window` bắt buộc $\ge 1,000$ và $\le 10,000,000$; `max_tokens` bắt buộc $\ge 256$ và $\le 1,000,000$. Ngăn chặn các tấn công chèn tham số cực đoan nhằm gây tràn bộ nhớ đệm (Buffer Overflow) hoặc tiêu tốn tài nguyên máy chủ.
4. **Chốt Chặn Toàn Vẹn Hạ Tầng Đàm Thoại Mặc Định (`BR-023`)**:
   - Hệ thống chủ động kiểm tra và từ chối ngay lập tức mọi hành vi xóa mềm hoặc hủy kích hoạt mô hình đang được gán làm mặc định (`is_default == true`), đảm bảo tính sẵn sàng 24/7 của cổng dịch vụ AI đàm thoại.

---

## 9. Kiểm Soát An Toàn Liên Kết & Hủy Liên Kết Danh Tính OAuth2 (OAuth Identity Linking & Safe Unlinking Controls — SEC-011)

1. **Kiểm Soát Chống Chiếm Đoạt & Xung Đột Định Danh 1-1 (`SEC-011`, `CTRL-010`, `BR-025`)**:
   - Hệ thống áp dụng ràng buộc duy nhất `UNIQUE` cho trường `discord_id`.
   - Trong quá trình callback liên kết (`GET /api/v1/auth/discord/callback`, `OP-027`), backend bắt buộc kiểm tra xem tài khoản Discord này đã từng được liên kết với một `user_id` khác hay chưa. Nếu đã liên kết, hệ thống lập tức từ chối với mã lỗi `HTTP 409 Conflict`, triệt tiêu khả năng kẻ tấn công cố ý dùng tài khoản Discord của mình để chiếm đoạt hoặc liên kết chéo vào tài khoản người dùng khác.
2. **Chốt Chặn Chống Khóa Tài Khoản Vĩnh Viễn (Account Lockout Prevention — `BR-026`)**:
   - Trước khi thực hiện hủy liên kết Discord (`DELETE /api/v1/users/me/discord`, `OP-028`), hệ thống bắt buộc kiểm tra trường `user.hashed_password`.
   - Nếu tài khoản chưa có mật khẩu (`hashed_password IS NULL`), hệ thống cấm tuyệt đối việc gỡ liên kết OAuth và trả về `HTTP 400 Bad Request`. Cơ chế này đảm bảo người dùng luôn duy trì tối thiểu một phương thức đăng nhập hợp lệ.
3. **Cơ Chế Tái Xác Thực Mật Khẩu Bắt Buộc (Mandatory Re-authentication — `BR-027`, `SEC-006`)**:
   - Thao tác gỡ bỏ danh tính liên kết là một hành vi đột biến nhạy cảm. Yêu cầu hủy liên kết bắt buộc truyền mật khẩu hiện tại trong body và phải vượt qua xác thực `bcrypt.verify` của máy chủ. Loại bỏ nguy cơ bị kẻ xấu gỡ liên kết qua máy tính dùng chung hoặc qua tấn công XSS.
4. **Cô Lập & Ký Số Trạng Thái OAuth Theo Hành Động (Action-Scoped HMAC State — `BR-016`, `SEC-008`)**:
   - Tham số `state` trong luồng liên kết (`OP-026`) mã hóa rõ ràng trường `action=link` cùng `user_id` hiện tại và chữ ký HMAC-SHA256 có thời hạn 10 phút. Ngăn chặn việc sử dụng lại state của luồng login thông thường để thực hiện liên kết tài khoản trái phép.

---

## 10. Kiểm Soát An Ninh Tương Tác Bot Discord & Xác Thực Chữ Ký Số Ed25519 (Discord Interaction Security & Cryptographic Controls — SEC-013)

1. **Xác Thực Chữ Ký Số Mật Mã Học Ed25519 Bắt Buộc (`SEC-013`, `CTRL-012`)**:
   - Mọi yêu cầu tương tác gửi đến từ Discord Webhook bắt buộc phải chứa hai header an ninh: `X-Signature-Ed25519` (chữ ký số hex) và `X-Signature-Timestamp` (dấu thời gian phát hành).
   - Backend sử dụng Public Key của Discord Application thẩm định tính xác thực của chữ ký mật mã học trên chuỗi `timestamp + raw_body` bằng thuật toán Ed25519 (`nacl.signing.VerifyKey`).
   - Nếu chữ ký không khớp hoặc dấu thời gian bị sai lệch quá 300 giây (5 phút), hệ thống từ chối ngay lập tức với `HTTP 401 Unauthorized` nhằm triệt tiêu hoàn toàn nguy cơ tấn công giả mạo yêu cầu (Request Forgery) và tấn công phát lại (Replay Attack).
2. **Kiểm Soát Thẩm Quyền Máy Chủ Guild & Phân Tách Phạm Vi Hoạt Động (`BR-034`)**:
   - Khi tiếp nhận yêu cầu cấu hình bot (`PUT /api/v1/bot/discord/config`, `OP-032`), hệ thống bắt buộc đối chiếu danh sách Guild mà người dùng tham gia qua Discord OAuth2 API (`OP-033`).
   - Kiểm tra bitwise permissions: Bắt buộc người dùng phải sở hữu cờ `ADMINISTRATOR` (0x8) hoặc `MANAGE_GUILD` (0x20). Ngăn chặn người dùng cấu hình trái phép bot vào các máy chủ Discord của bên thứ ba mà họ không có quyền quản trị.
3. **Mã Hóa & Bảo Mật Tuyệt Đối Discord Bot Credentials**:
   - Discord Bot Token và Application Public Key được lưu trữ độc quyền trong biến môi trường server (`.env`) và nạp an toàn vào bộ nhớ khi khởi động ứng dụng.
   - Tuyệt đối không xuất hiện trong các phản hồi API gửi về Client, không ghi ra log telemetry hay snapshot lỗi hệ thống (`NFR-005`, `NFR-019`).
4. **Phòng Thủ Cạn Kiệt Tài Nguyên Qua Hạn Ngạch Token Hợp Nhất (`BR-032`, `CTRL-008`)**:
   - Mọi lượt đàm thoại qua Discord Bot đều chia sẻ chung hạn ngạch token `daily_token_limit` của tài khoản người dùng trên Web.
   - Nếu tài khoản đã sử dụng hết hạn ngạch trong ngày (`used_tokens >= total_limit`), hệ thống kích hoạt chốt chặn trả về mã phản hồi `HTTP 429 Too Many Requests` và từ chối gọi LLM Provider, ngăn chặn nguy cơ cạn kiệt ngân sách API thông qua spam lệnh trên Discord.

---

## 11. Cô Lập Đa Dự Án & Bộ Nhớ Hội Thoại Khi Thực Thi Qua Bot Đồ Thị (Multi-Project & Conversational Memory Isolation — SEC-014)

1. **Cô Lập Ngữ Cảnh Tuyệt Đối Giữa Các Dự Án (`SEC-014`, `BR-038`)**:
   - Mỗi yêu cầu thực thi từ Discord Bot chỉ được phép kích hoạt đúng một Project được liên kết xác định (`BR-038`).
   - Tuyệt đối không cho phép Project B kế thừa hoặc truy xuất ngữ cảnh System Prompt, Graph Canvas snapshot, hay danh sách Kỹ năng (Skills) của Project A.
   - Khi phát hiện cấu hình xung đột hoặc nhiều hơn 1 Project đang hoạt động cho cùng một Bot, Backend từ chối ngay lập tức với `HTTP 400 Bad Request` thay vì suy đoán ngẫu nhiên.
2. **Kiểm Soát Trạng Thái Hoạt Động Của Dự Án (`BR-039`)**:
   - Mọi thao tác thực thi bắt buộc kiểm tra cờ `project.status != 'STOP'`.
   - Dự án ở trạng thái `STOP` bị từ chối với lỗi rõ ràng, ngăn ngừa lãng phí tài nguyên tính toán và chi phí API LLM.
3. **Phân Tách & Bảo Vệ Lịch Sử Đàm Thoại Đa Lượt**:
   - Bảng `messages` lưu trữ tin nhắn với các khóa ngoại tường minh (`user_id`, `project_id`, `conversation_id`).
   - Bộ nhớ hội thoại nạp vào agent được giới hạn trong phạm vi đúng phiên của người dùng và dự án tương ứng, ngăn chặn rò rỉ dữ liệu xuyên tài khoản (Cross-Tenant Data Leakage).

---

## 12. Kiểm Soát An Ninh Kết Nối Catalog Kỹ Năng Bên Ngoài (External Skills Catalog Security Guard — SEC-020)

1. **Phòng Chống Tấn Công Gửi Yêu Cầu Giả Mạo Phía Máy Chủ (SSRF Prevention)**:
   - Áp dụng cơ chế **Strict Host & Path Allowlist**: máy chủ chỉ kết nối ra ngoài tới các máy chủ đã được chỉ định (`raw.githubusercontent.com`, `api.github.com`) với tiền tố kho lưu trữ cố định `sickn33/agentic-awesome-skills`.
   - Tuyệt đối cấm client gửi URL tùy ý để máy chủ tải về (`SEC-020`).
2. **Ngăn Chặn Leo Thang Đường Dẫn & Tấn Công Hệ Thống Tệp (Anti-Path Traversal)**:
   - Mọi định danh kỹ năng (`source_skill_id`) và đường dẫn tệp (`path`) đều được chuẩn hóa và kiểm tra biểu thức chính quy `^[a-zA-Z0-9_\-\./]+$`.
   - Chặn tuyệt đối chuỗi phân cấp `..`, ký tự null byte (`0x00`), và ký tự điều khiển.
3. **Bộ Quét An Ninh Nội Dung & Phòng Ngừa Prompt Injection**:
   - Tệp `SKILL.md` trước khi cho phép xem trước hoặc nhập đều trải qua bộ quét tĩnh `scan_content_security()`.
   - Phát hiện và cảnh báo các mẫu tấn công: thẻ `<script>`, event handlers (`onload`, `onerror`), lệnh shell nguy hiểm (`curl ... | sh`, `rm -rf`), và các cụm từ nghi vấn prompt injection / jailbreak.
4. **Hiển Thị An Toàn & Bảo Vệ Nội Dung Cục Bộ (Safe Markdown Rendering & Overwrite Guard)**:
   - Frontend hiển thị xem trước bằng `SafeMarkdownViewer.tsx` ngăn chặn thực thi JavaScript/HTML injection.
   - So sánh mã băm SHA-256 (`source_content_hash`) để phát hiện chỉnh sửa local và yêu cầu người dùng xác nhận rõ ràng (`RENAME` / `REPLACE` / `SKIP`), ngăn ngừa ghi đè âm thầm.








