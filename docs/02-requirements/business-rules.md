# ĐẶC TẢ QUY TẮC NGHIỆP VỤ HỆ THỐNG (BUSINESS RULES SPECIFICATION)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `BR-SPEC-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Quy ước mã định danh** | `BR-001` đến `BR-015` |
| **Mục đích** | Xác lập các quy định nghiệp vụ cốt lõi không thể vi phạm, làm căn cứ cho việc thiết kế kiểm soát dữ liệu và phân quyền |

---

## 1. Danh Mục Các Quy Tắc Nghiệp Vụ (Business Rules Catalog)

---

### BR-001: Bắt Buộc Xác Thực Để Lưu Trữ Phiên Hội Thoại
- **Mã Quy Tắc**: `BR-001`
- **Tên Quy Tắc**: Bắt Buộc Xác Thực Để Lưu Trữ Phiên Hội Thoại (Authentication Required for Conversation Storage).
- **Phát Biểu Quy Tắc**: Chỉ những người dùng đã đăng nhập hợp lệ (`Registered User`) và mang theo mã thông báo định danh (JWT Token) còn hiệu lực mới được phép khởi tạo, lưu trữ và xem lại các phiên hội thoại trên máy chủ. Khách vãng lai (`Guest`) chưa đăng nhập không được cấp phát kho lưu trữ dữ liệu vĩnh viễn trên cơ sở dữ liệu.
- **Cơ Sở Nghiệp Vụ (Business Rationale)**:
  - Ngăn ngừa tình trạng spam tạo rác dữ liệu trên máy chủ từ các bot tự động không định danh.
  - Đảm bảo tính pháp lý và ràng buộc dữ liệu hội thoại với một chủ thể tài khoản xác định.
- **Cơ Chế Thực Thi Kỹ Thuật (Enforcement Mechanism)**:
  - Các API quản lý cuộc trò chuyện (`/api/v1/conversations/*`) và gửi tin nhắn bắt buộc phải qua Dependency `get_current_user`.
  - Nếu thiếu token hoặc token không hợp lệ -> Hệ thống từ chối ngay lập tức với mã lỗi `HTTP 401 Unauthorized`.
- **Ngoại Lệ (Exceptions)**: Không có ngoại lệ.
- **Yêu Cầu Liên Quan**: `FR-001`, `FR-002`, `FR-004`, `SEC-004`.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### BR-002: Cách Ly Quyền Sở Hữu Cuộc Trò Chuyện (Conversation Ownership Isolation)
- **Mã Quy Tắc**: `BR-002`
- **Tên Quy Tắc**: Cách Ly Quyền Sở Hữu Cuộc Trò Chuyện (Conversation Ownership Isolation).
- **Phát Biểu Quy Tắc**: Một cuộc trò chuyện (`conversation`) và toàn bộ các tin nhắn (`messages`) bên trong thuộc sở hữu độc quyền của duy nhất một tài khoản người dùng (`user_id`). Người dùng chỉ được phép đọc, đổi tên hoặc xóa các cuộc trò chuyện do chính mình tạo ra. Nghiêm cấm tuyệt đối hành vi truy cập chéo dữ liệu giữa các tài khoản khác nhau.
- **Cơ Sở Nghiệp Vụ (Business Rationale)**:
  - Bảo vệ quyền riêng tư và bí mật trao đổi của từng cá nhân (`BO-04`).
  - Triệt tiêu hoàn toàn lỗ hổng an ninh truy cập trực tiếp đối tượng không an toàn (Insecure Direct Object Reference - IDOR).
- **Cơ Chế Thực Thi Kỹ Thuật (Enforcement Mechanism)**:
  - Mọi câu truy vấn dữ liệu SQL (SELECT, UPDATE, DELETE) đối với bảng `conversations` hoặc `messages` bắt buộc phải kèm mệnh đề lọc: `WHERE id = :conv_id AND user_id = :current_user_id`.
  - Nếu người dùng cố tình truy cập vào `conversation_id` của tài khoản khác -> Hệ thống từ chối với mã lỗi `HTTP 403 Forbidden` và ghi vết cảnh báo an ninh vào log.
- **Ngoại Lệ (Exceptions)**: Không có ngoại lệ.
- **Yêu Cầu Liên Quan**: `FR-005`, `FR-006`, `FR-007`, `FR-012`, `NFR-018`.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### BR-003: Giới Hạn Chiều Dài Tin Nhắn Đầu Vào (Maximum Message Length Limit)
- **Mã Quy Tắc**: `BR-003`
- **Tên Quy Tắc**: Giới Hạn Chiều Dài Tin Nhắn Đầu Vào (Maximum Message Length Limit).
- **Phát Biểu Quy Tắc**: Mỗi tin nhắn văn bản do người dùng gửi lên không được rỗng (sau khi cắt tỉa khoảng trắng đầu cuối) và có độ dài tối đa không vượt quá **4,000 ký tự**.
- **Cơ Sở Nghiệp Vụ (Business Rationale)**:
  - Kiểm soát chi phí tiêu thụ token của các API mô hình ngôn ngữ lớn (`BO-02`, `RSK-AI-02`).
  - Ngăn ngừa tấn công tràn bộ đệm (Buffer Overflow) hoặc làm cạn kiệt bộ nhớ tiến trình xử lý văn bản.
- **Cơ Chế Thực Thi Kỹ Thuật (Enforcement Mechanism)**:
  - Kiểm tra 2 lớp: Client kiểm tra độ dài chuỗi trước khi gửi; Schema Pydantic tại Backend kiểm tra `min_length=1, max_length=4000`.
  - Nếu vi phạm -> Backend lập tức trả về lỗi `HTTP 422 Unprocessable Entity` và từ chối gọi tiếp xuống tầng AI.
- **Ngoại Lệ (Exceptions)**: Không có.
- **Yêu Cầu Liên Quan**: `FR-008`, `CAP-CHAT-01`, `NFR-007`.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### BR-004: Quy Ước Đặt Tiêu Đề Cuộc Trò Chuyện Tự Động (Automatic Title Derivation)
- **Mã Quy Tắc**: `BR-004`
- **Tên Quy Tắc**: Quy Ước Đặt Tiêu Đề Cuộc Trò Chuyện Tự Động (Automatic Title Derivation).
- **Phát Biểu Quy Tắc**: Khi một cuộc trò chuyện mới được tạo ra, tiêu đề khởi tạo mặc định là `"Cuộc trò chuyện mới"`. Sau khi nhận được tin nhắn hợp lệ đầu tiên từ người dùng, nếu tiêu đề hiện tại vẫn là tiêu đề mặc định, hệ thống sẽ tự động trích xuất **tối đa 30 ký tự đầu tiên** của tin nhắn đó để cập nhật thành tiêu đề hiển thị chính thức của cuộc trò chuyện.
- **Cơ Sở Nghiệp Vụ (Business Rationale)**:
  - Tối ưu hóa trải nghiệm người dùng: Giúp người dùng nhận diện nhanh chủ đề cuộc trò chuyện trên Sidebar mà không bắt buộc phải tốn thao tác tự gõ đặt tên.
- **Cơ Chế Thực Thi Kỹ Thuật (Enforcement Mechanism)**:
  - Logic kiểm tra tại tầng Service khi lưu tin nhắn đầu tiên: Nếu `conv.title == "Cuộc trò chuyện mới"` -> Thực hiện `conv.title = user_prompt[:30].strip()`.
  - Nếu người dùng đã chủ động bấm nút "Đổi tên" thủ công trước đó -> Giữ nguyên tên người dùng đã đặt, không ghi đè tự động.
- **Ngoại Lệ (Exceptions)**: Không áp dụng nếu người dùng đã đặt tên thủ công trước đó.
- **Yêu Cầu Liên Quan**: `FR-004`, `FR-006`, `CAP-CONV-03`.
- **Độ Ưu Tiên**: `SHOULD`.
- **Trạng Thái**: `BASELINED`.

---

### BR-005: Thứ Tự Ưu Tiên Điều Phối Nhà Cung Cấp AI (Primary-Fallback Provider Precedence)
- **Mã Quy Tắc**: `BR-005`
- **Tên Quy Tắc**: Thứ Tự Ưu Tiên Điều Phối Nhà Cung Cấp AI (Primary-Fallback Provider Precedence).
- **Phát Biểu Quy Tắc**: Hệ thống mặc định ưu tiên phân luồng mọi yêu cầu đàm thoại tới nhà cung cấp chính là **Google Gemini API** (tối ưu chi phí và tốc độ). Chỉ khi và chỉ khi Google Gemini phản hồi lỗi không thể phục hồi (mã HTTP 429 Quota Exceeded, lỗi máy chủ 5xx, hoặc thời gian chờ vượt quá 30 giây), hệ thống mới tự động chuyển tiếp yêu cầu sang nhà cung cấp phụ là **OpenAI API**.
- **Cơ Sở Nghiệp Vụ (Business Rationale)**:
  - Đảm bảo tính liên tục của dịch vụ theo tiêu chuẩn sẵn sàng cao (`BO-02`, `NFR-REL-03`).
  - Tối ưu hóa ngân sách vận hành bằng cách tận dụng gói chi phí hợp lý của Gemini trước khi dùng đến OpenAI.
- **Cơ Chế Thực Thi Kỹ Thuật (Enforcement Mechanism)**:
  - Khối điều phối trong `LLMManager` thực thi mô hình Fallback: Bắt ngoại lệ từ `GeminiProvider`, nếu lỗi thuộc nhóm chuyển vùng được -> Chuyển sang `OpenAIProvider`.
- **Ngoại Lệ (Exceptions)**: Nếu người dùng chủ động chọn model cụ thể qua thanh menu chọn model (`FR-010`), hệ thống sẽ ưu tiên gọi đúng model được chọn trước.
- **Yêu Cầu Liên Quan**: `FR-009`, `FR-010`, `FR-011`, `AC-004`.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### BR-006: Xử Lý Khi Vượt Quá Tần Suất Cho Phép (Rate Limit Enforcement Policy)
- **Mã Quy Tắc**: `BR-006`
- **Tên Quy Tắc**: Xử Lý Khi Vượt Quá Tần Suất Cho Phép (Rate Limit Enforcement Policy).
- **Phát Biểu Quy Tắc**: Khi một địa chỉ IP hoặc tài khoản gửi yêu cầu vượt quá định mức cho phép (vượt quá 10 request/giây tại Ingress Gateway hoặc vượt quá 60 request/phút tại Backend API), hệ thống phải **từ chối phục vụ ngay lập tức**, không chuyển tiếp request xuống cơ sở dữ liệu hay mô hình AI, và trả về mã phản hồi `HTTP 429 Too Many Requests`.
- **Cơ Sở Nghiệp Vụ (Business Rationale)**:
  - Bảo vệ hạ tầng và ngân sách API trước các đợt tấn công từ chối dịch vụ (DDoS) hoặc công cụ tự động cào dữ liệu (`BO-04`).
- **Cơ Chế Thực Thi Kỹ Thuật (Enforcement Mechanism)**:
  - Tầng Ingress: Nginx `limit_req_zone` cắt tỉa request vượt ngưỡng với mã lỗi 429.
  - Tầng Backend: `app_rate_limiter.check(client_ip)` nâng ngoại lệ `HTTPException(status_code=429)`.
- **Ngoại Lệ (Exceptions)**: Các endpoint kiểm tra sức khỏe nội bộ (`/api/v1/health`) không áp dụng rate limit nghiêm ngặt để phục vụ giám sát container.
- **Yêu Cầu Liên Quan**: `NFR-007`, `SEC-005`, `AC-005`.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### BR-007: Tính Duy Nhất & Định Dạng Của Username (Username Format & Uniqueness)
- **Mã Quy Tắc**: `BR-007`
- **Tên Quy Tắc**: Tính Duy Nhất & Định Dạng Của Username (Username Format & Uniqueness).
- **Phát Biểu Quy Tắc**: Tên người dùng (`username`) nếu được thiết lập phải là duy nhất trên toàn hệ thống (không phân biệt chữ hoa, chữ thường), có độ dài từ **3 đến 30 ký tự**, chỉ chứa các ký tự chữ cái la-tinh thường `[a-z]`, chữ số `[0-9]`, dấu gạch dưới `_` hoặc gạch ngang `-`. Không được bắt đầu hoặc kết thúc bằng ký tự đặc biệt.
- **Cơ Sở Nghiệp Vụ (Business Rationale)**:
  - Đảm bảo tính định danh cá nhân độc nhất, phục vụ việc định danh tài khoản và tạo đường dẫn profile chuẩn (slug URL).
- **Cơ Chế Thực Thi Kỹ Thuật (Enforcement Mechanism)**:
  - Database: `username VARCHAR(50) UNIQUE COLLATE NOCASE`.
  - Pydantic Validator kiểm tra regex: `^[a-zA-Z0-9][a-zA-Z0-9_-]{1,28}[a-zA-Z0-9]$`.
- **Ngoại Lệ (Exceptions)**: Khi mới đăng ký qua email, nếu người dùng chưa đặt `username`, hệ thống có thể tạm để trống (NULL) hoặc tự động sinh từ phần tiền tố email.
- **Yêu Cầu Liên Quan**: `FR-016`, `AC-007-B`.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### BR-008: Bắt Buộc Xác Thực Lại Mật Khẩu Cho Tác Vụ Nhạy Cảm (Re-authentication for Sensitive Operations)
- **Mã Quy Tắc**: `BR-008`
- **Tên Quy Tắc**: Bắt Buộc Xác Thực Lại Mật Khẩu Cho Tác Vụ Nhạy Cảm (Re-authentication for Sensitive Operations).
- **Phát Biểu Quy Tắc**: Mọi thao tác làm thay đổi cơ chế đăng nhập hoặc ảnh hưởng tới quyền truy cập tài khoản bao gồm: **(1) Đổi địa chỉ Email** và **(2) Đổi Mật khẩu** bắt buộc phải yêu cầu người dùng nhập lại mật khẩu hiện tại (`current_password`) để kiểm tra trực tiếp trước khi thực thi.
- **Cơ Sở Nghiệp Vụ (Business Rationale)**:
  - Phòng chống tấn công chiếm đoạt tài khoản khi thiết bị bị bỏ quên (Cross-Site Request Forgery hoặc Session Hijacking).
- **Cơ Chế Thực Thi Kỹ Thuật (Enforcement Mechanism)**:
  - Backend gọi `verify_password(current_password, user.hashed_password)`. Nếu sai, lập tức trả về `HTTP 401 Unauthorized` và ghi log an ninh `AUTH_REAUTH_FAILED`.
- **Ngoại Lệ (Exceptions)**: Không có ngoại lệ.
- **Yêu Cầu Liên Quan**: `FR-018`, `FR-019`, `SEC-006`.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### BR-009: Tiêu Chuẩn Phức Tạp & Luân Chuyển Mật Khẩu (Password Complexity & Rotation Policy)
- **Mã Quy Tắc**: `BR-009`
- **Tên Quy Tắc**: Tiêu Chuẩn Phức Tạp & Luân Chuyển Mật Khẩu (Password Complexity & Rotation Policy).
- **Phát Biểu Quy Tắc**: Khi đổi mật khẩu, mật khẩu mới phải khác hoàn toàn mật khẩu hiện tại, có độ dài tối thiểu **8 ký tự**, bao gồm ít nhất 1 chữ cái in hoa, 1 chữ cái thường, 1 chữ số và 1 ký tự đặc biệt. Sau khi đổi mật khẩu thành công, toàn bộ token hoặc phiên đăng nhập trên các thiết bị khác phải bị vô hiệu hóa (`password_changed_at` được cập nhật).
- **Cơ Sở Nghiệp Vụ (Business Rationale)**:
  - Đảm bảo độ mạnh mật khẩu và cô lập nguy cơ rò rỉ phiên làm việc trên các thiết bị cũ.
- **Cơ Chế Thực Thi Kỹ Thuật (Enforcement Mechanism)**:
  - So khớp `verify_password(new_password, user.hashed_password)` -> nếu True, ném lỗi 422: "Mật khẩu mới không được trùng mật khẩu cũ".
  - Regex validator kiểm tra độ phức tạp. Cập nhật `password_changed_at = CURRENT_TIMESTAMP`.
- **Ngoại Lệ (Exceptions)**: Không có ngoại lệ.
- **Yêu Cầu Liên Quan**: `FR-019`, `SEC-007`.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### BR-010: Kiểm Soát Tính Duy Nhất Của Email Cập Nhật (Email Uniqueness on Update)
- **Mã Quy Tắc**: `BR-010`
- **Tên Quy Tắc**: Kiểm Soát Tính Duy Nhất Của Email Cập Nhật (Email Uniqueness on Update).
- **Phát Biểu Quy Tắc**: Địa chỉ email mới phải tuân thủ chuẩn RFC 5322, khác hoàn toàn với địa chỉ email hiện tại của tài khoản, và không được trùng với bất kỳ địa chỉ email nào đã tồn tại trong bảng `users` (không phân biệt chữ hoa, chữ thường).
- **Cơ Sở Nghiệp Vụ (Business Rationale)**:
  - Bảo toàn tính duy nhất của khóa định danh tài khoản đăng nhập `email`.
- **Cơ Chế Thực Thi Kỹ Thuật (Enforcement Mechanism)**:
  - Truy vấn `SELECT id FROM users WHERE email = :new_email COLLATE NOCASE AND id != :user_id`. Nếu tồn tại -> Trả về `HTTP 409 Conflict`.
- **Ngoại Lệ (Exceptions)**: Không có ngoại lệ.
- **Yêu Cầu Liên Quan**: `FR-018`.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### BR-011: Định Dạng & Kích Thước Giới Hạn Ảnh Đại Diện (Avatar Format & Size Constraints)
- **Mã Quy Tắc**: `BR-011`
- **Tên Quy Tắc**: Định Dạng & Kích Thước Giới Hạn Ảnh Đại Diện (Avatar Format & Size Constraints).
- **Phát Biểu Quy Tắc**: Ảnh đại diện chỉ được chấp nhận nếu là URL hợp lệ (sử dụng giao thức HTTPS) hoặc tập tin hình ảnh có định dạng thuộc whitelist: `image/jpeg`, `image/png`, `image/webp`. Dung lượng tập tin tối đa không vượt quá **2 MB**.
- **Cơ Sở Nghiệp Vụ (Business Rationale)**:
  - Ngăn ngừa tải lên các tập tin độc hại (RCE, SVG XSS) và tối ưu hóa băng thông hiển thị.
- **Cơ Chế Thực Thi Kỹ Thuật (Enforcement Mechanism)**:
  - Xác thực MIME-type, kích thước byte <= 2,097,152 bytes. Cấm định dạng `.svg` và `.exe`.
- **Ngoại Lệ (Exceptions)**: Nếu không có avatar, hệ thống hiển thị avatar mặc định theo chữ cái đầu của `full_name` hoặc mascot AI-Chan.
- **Yêu Cầu Liên Quan**: `FR-017`.
- **Độ Ưu Tiên**: `SHOULD`.
- **Trạng Thái**: `BASELINED`.

---

### BR-012: Cấm Xóa Cứng Mô Hình - Sử Dụng Kích Hoạt / Hủy Kích Hoạt (No Physical Deletion Policy - Soft State Toggle)
- **Mã Quy Tắc**: `BR-012`
- **Tên Quy Tắc**: Cấm Xóa Cứng Mô Hình - Sử Dụng Kích Hoạt / Hủy Kích Hoạt (No Physical Deletion Policy - Soft State Toggle).
- **Phát Biểu Quy Tắc**: Nghiêm cấm tuyệt đối mọi hành vi xóa vật lý (Hard DELETE) hoặc gỡ bỏ thực thể `AgentModel` khỏi hệ thống. Toàn bộ chu trình quản lý vòng đời của mô hình phải được điều phối thông qua hai trạng thái `ACTIVE` (Kích hoạt) và `INACTIVE` (Tạm dừng/Hủy kích hoạt).
- **Cơ Sở Nghiệp Vụ (Business Rationale)**:
  - Bảo toàn tính toàn vẹn tham chiếu dữ liệu (Referential Integrity): Các tin nhắn lịch sử trong bảng `messages` lưu trữ trường `model_used`. Xóa cứng sẽ làm hỏng dữ liệu báo cáo lịch sử và kiểm toán.
  - Cho phép người dùng hoặc quản trị viên tạm ẩn các model chưa sẵn sàng mà không làm mất cấu hình đã thiết lập; có thể bật lại bất cứ lúc nào khi bổ sung key.
- **Cơ Chế Thực Thi Kỹ Thuật (Enforcement Mechanism)**:
  - Tầng API không cung cấp điểm cuối `DELETE /api/v1/models/{id}`.
  - Sử dụng các endpoint chuyển đổi trạng thái `PATCH /api/v1/models/{id}/activate` và `PATCH /api/v1/models/{id}/deactivate`.
  - Bộ điều phối LangGraph chỉ lọc `SELECT * FROM models WHERE status = 'ACTIVE'`.
- **Ngoại Lệ (Exceptions)**: Không có ngoại lệ.
- **Yêu Cầu Liên Quan**: `FR-024`, `FR-025`, `ADR-006`.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### BR-013: Bất Biến Mô Hình Mặc Định Hoạt Động (Default Active Model Invariant)
- **Mã Quy Tắc**: `BR-013`
- **Tên Quy Tắc**: Bất Biến Mô Hình Mặc Định Hoạt Động (Default Active Model Invariant).
- **Phát Biểu Quy Tắc**: Hệ thống luôn luôn phải duy trì duy nhất một mô hình đang ở trạng thái `ACTIVE` mang cờ mặc định `is_default = true`. Nghiêm cấm hủy kích hoạt (`deactivate`) một mô hình đang được đặt làm mặc định khi chưa chuyển cờ mặc định sang một mô hình `ACTIVE` khác.
- **Cơ Sở Nghiệp Vụ (Business Rationale)**:
  - Đảm bảo trải nghiệm đàm thoại liên tục; khi người dùng bấm chat mà không chọn mô hình cụ thể, hệ thống luôn có một mô hình sẵn sàng đáp ứng.
- **Cơ Chế Thực Thi Kỹ Thuật (Enforcement Mechanism)**:
  - Khi nhận request `PATCH /api/v1/models/{id}/deactivate`: Kiểm tra nếu `model.is_default == true` -> Lập tức chặn lại với mã lỗi `HTTP 400 Bad Request`: "Không thể hủy kích hoạt mô hình đang được đặt làm mặc định. Vui lòng thiết lập một mô hình khác làm mặc định trước."
  - Khi thiết lập `PATCH /api/v1/models/default`: Bắt buộc kiểm tra `model.status == ACTIVE`. Nếu hợp lệ, thực thi transaction đặt `is_default = false` cho model cũ và `is_default = true` cho model mới.
- **Ngoại Lệ (Exceptions)**: Không có ngoại lệ.
- **Yêu Cầu Liên Quan**: `FR-025`, `FR-026`, `ADR-006`.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### BR-014: Xác Thực Khóa Nhà Cung Cấp Khi Kích Hoạt (Provider Credential Health Verification on Activation)
- **Mã Quy Tắc**: `BR-014`
- **Tên Quy Tắc**: Xác Thực Khóa Nhà Cung Cấp Khi Kích Hoạt (Provider Credential Health Verification on Activation).
- **Phát Biểu Quy Tắc**: Một mô hình chỉ được phép chuyển trạng thái sang `ACTIVE` nếu API Key của nhà cung cấp tương ứng đã được khai báo trong file môi trường `.env` (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, hoặc `OLLAMA_BASE_URL`).
- **Cơ Sở Nghiệp Vụ (Business Rationale)**:
  - Ngăn ngừa tình trạng người dùng chọn phải các mô hình không thể thực thi, dẫn đến lỗi runtime 500 hoặc thất bại chuỗi failover.
- **Cơ Chế Thực Thi Kỹ Thuật (Enforcement Mechanism)**:
  - Controller kiểm tra `EnvKeyLoader.get_config()` xem provider của `model_id` có tồn tại chuỗi key không rỗng hay không.
  - Nếu thiếu key -> Trả về lỗi `HTTP 400 Bad Request`: "Không thể kích hoạt mô hình do thiếu API Key của nhà cung cấp trong file .env."
- **Ngoại Lệ (Exceptions)**: Không có ngoại lệ.
- **Yêu Cầu Liên Quan**: `FR-023`, `FR-024`, `ADR-005`, `ADR-006`, `SEC-001`.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### BR-015: Tự Động Hạ Cấp Trạng Thái Khi Lỗi Kéo Dài (Automated Status Degradation on Quota / Outage)
- **Mã Quy Tắc**: `BR-015`
- **Tên Quy Tắc**: Tự Động Hạ Cấp Trạng Thái Khi Lỗi Kéo Dài (Automated Status Degradation on Quota / Outage).
- **Phát Biểu Quy Tắc**: Khi một mô hình liên tục gặp lỗi cạn hạn ngạch (HTTP 429 Quota Exceeded), từ chối xác thực (HTTP 401) hoặc lỗi máy chủ nhà cung cấp (HTTP 5xx / Timeout > 30s) trong quá trình điều phối đàm thoại, hệ thống sẽ tạm thời đánh dấu mô hình sang trạng thái `DEGRADED`.
- **Cơ Sở Nghiệp Vụ (Business Rationale)**:
  - Giảm thiểu độ trễ cho người dùng bằng cách tạm thời bỏ qua các mô hình đang gặp sự cố và ưu tiên định tuyến thẳng sang các mô hình hoạt động ổn định khác trong chuỗi LangGraph (`ADR-005`).
- **Cơ Chế Thực Thi Kỹ Thuật (Enforcement Mechanism)**:
  - Bộ đếm Circuit Breaker ghi nhận 3 lỗi liên tiếp trong 60 giây -> Tự động chuyển `status = DEGRADED`.
  - Bộ kiểm tra sức khỏe nền (Health Ping) định kỳ 5 phút một lần để tự động khôi phục về `ACTIVE` khi nhà cung cấp phục hồi.
- **Ngoại Lệ (Exceptions)**: Không áp dụng nếu chỉ có duy nhất 1 mô hình `ACTIVE` trong hệ thống.
- **Yêu Cầu Liên Quan**: `FR-011`, `FR-023`, `BR-005`, `ADR-003`, `ADR-006`.
- **Độ Ưu Tiên**: `SHOULD`.
- **Trạng Thái**: `BASELINED`.

---

### BR-016: Bảo Vệ Chống CSRF Qua Tham Số State Trong OAuth2 (OAuth2 State Parameter CSRF Guard)
- **Mã Quy Tắc**: `BR-016`
- **Tên Quy Tắc**: Bảo Vệ Chống CSRF Qua Tham Số State Trong OAuth2 (OAuth2 State Parameter CSRF Guard).
- **Phát Biểu Quy Tắc**: Trong mọi quy trình ủy quyền OAuth2 với Discord, Backend bắt buộc phải sinh một chuỗi ngẫu nhiên cryptographically secure `state`, được ký bằng secret key sử dụng HMAC-SHA256 kèm thời gian hết hạn (`exp` <= 10 phút), lưu trữ tạm vào cookie mã hóa hoặc phiên trình duyệt. Khi nhận callback từ Discord, Backend bắt buộc phải đối chiếu khớp tuyệt đối chuỗi `state` gửi đi và `state` trả về trước khi thực hiện trao đổi authorization code lấy token.
- **Cơ Sở Nghiệp Vụ (Business Rationale)**:
  - Ngăn chặn triệt để tấn công Cross-Site Request Forgery (CSRF) và tấn công gán tài khoản của kẻ tấn công vào phiên người dùng vô tội (Login CSRF).
- **Cơ Chế Thực Thi Kỹ Thuật (Enforcement Mechanism)**:
  - Hàm `generate_oauth_state()` tạo chuỗi `token = hmac_sign(random_bytes + timestamp)`.
  - Hàm `verify_oauth_state(received_state)` kiểm tra tính toàn vẹn và `time_now - timestamp <= 600s`.
  - Nếu `state` không khớp hoặc hết hạn, Backend từ chối ngay với `HTTP 400 Bad Request` và ghi log an ninh `SEC_OAUTH_STATE_MISMATCH`.
- **Ngoại Lệ (Exceptions)**: Không có ngoại lệ.
- **Yêu Cầu Liên Quan**: `FR-027`, `FR-028`, `SEC-008`, `ADR-007`.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### BR-017: Tự Động Liên Kết Tài Khoản Qua Email Đã Xác Minh Từ Discord (Discord Verified Email Auto-Linking)
- **Mã Quy Tắc**: `BR-017`
- **Tên Quy Tắc**: Tự Động Liên Kết Tài Khoản Qua Email Đã Xác Minh Từ Discord (Discord Verified Email Auto-Linking).
- **Phát Biểu Quy Tắc**: Khi người dùng đăng nhập bằng Discord OAuth2, nếu `discord_id` chưa từng liên kết nhưng `email` từ hồ sơ Discord trùng khớp với email của một tài khoản đã tồn tại trong hệ thống, hệ thống chỉ cho phép tự động liên kết tài khoản (`auto-link`) nếu và chỉ nếu trường `verified` từ Discord trả về có giá trị `true`. Nếu `verified == false`, hệ thống nghiêm cấm tự động liên kết và yêu cầu người dùng xác thực email trên Discord trước.
- **Cơ Sở Nghiệp Vụ (Business Rationale)**:
  - Ngăn ngừa tấn công chiếm quyền điều khiển tài khoản (Account Takeover) trong trường hợp kẻ xấu tạo tài khoản Discord giả mạo bằng địa chỉ email của nạn nhân chưa được xác thực.
- **Cơ Chế Thực Thi Kỹ Thuật (Enforcement Mechanism)**:
  - Kiểm tra `discord_user.get("verified") is True`.
  - Nếu True và `existing_user`: Thực hiện cập nhật `UPDATE users SET discord_id = :d_id, discord_username = :d_name, updated_at = CURRENT_TIMESTAMP WHERE id = :user_id`.
  - Nếu False: Nâng lỗi `HTTP 400 Bad Request`: "Tài khoản Discord chưa xác minh email. Không thể tự động liên kết."
- **Ngoại Lệ (Exceptions)**: Không có ngoại lệ.
- **Yêu Cầu Liên Quan**: `FR-027`, `FR-028`, `SEC-008`, `ADR-007`.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### BR-018: Bất Biến Mật Khẩu Null Cho Tài Khoản OAuth Thuần Túy (Discord Null-Password Invariant)
- **Mã Quy Tắc**: `BR-018`
- **Tên Quy Tắc**: Bất Biến Mật Khẩu Null Cho Tài Khoản OAuth Thuần Túy (Discord Null-Password Invariant).
- **Phát Biểu Quy Tắc**: Tài khoản người dùng được tạo mới trực tiếp từ kênh ủy quyền bên thứ ba (Discord OAuth2) được phép lưu giá trị `hashed_password` là `NULL`. Đối với các tài khoản có `hashed_password IS NULL`, hệ thống từ chối mọi yêu cầu đăng nhập truyền thống bằng form email/mật khẩu và yêu cầu người dùng tiếp tục đăng nhập qua nút Discord, trừ khi người dùng chủ động thiết lập mật khẩu trong trang Quản lý hồ sơ (`FR-019`).
- **Cơ Sở Nghiệp Vụ (Business Rationale)**:
  - Bảo đảm mô hình tài khoản linh hoạt, người dùng đăng ký qua mạng xã hội không bị bắt buộc phải nhớ thêm một mật khẩu vô nghĩa, nhưng vẫn giữ an toàn tuyệt đối chống việc dò mật khẩu rỗng trên API login form.
- **Cơ Chế Thực Thi Kỹ Thuật (Enforcement Mechanism)**:
  - Tầng DDL cơ sở dữ liệu: Cho phép cột `hashed_password` chấp nhận `NULL`.
  - Điểm cuối `POST /auth/login`: Kiểm tra `if user.hashed_password is None: raise HTTPException(400, "Tài khoản này được đăng ký qua Discord. Vui lòng đăng nhập bằng Discord.")`.
- **Ngoại Lệ (Exceptions)**: Nếu người dùng đã liên kết mật khẩu sau này (`hashed_password IS NOT NULL`), họ có thể đăng nhập bằng cả hai phương thức.
- **Yêu Cầu Liên Quan**: `FR-002`, `FR-019`, `FR-027`, `ADR-007`.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### BR-019: Tính Bất Biến & Toàn Vẹn Trong Ghi Nhận Telemetry & Token (Atomic Telemetry & Token Accounting Invariant)
- **Mã Quy Tắc**: `BR-019`
- **Tên Quy Tắc**: Tính Bất Biến & Toàn Vẹn Trong Ghi Nhận Telemetry & Token (Atomic Telemetry & Token Accounting Invariant).
- **Phát Biểu Quy Tắc**: Mọi yêu cầu API hoàn tất và mỗi lượt sinh câu trả lời AI kết thúc bắt buộc phải sinh một bản ghi đo lường duy nhất, không thể sửa đổi trong `api_metric_logs`. Việc ghi nhận nhật ký đo lường và cộng dồn số token đã dùng (`daily_tokens_used`) vào bảng `user_quotas` phải được thực hiện mang tính nguyên tử (Atomic transaction). Nếu quá trình ghi log gặp lỗi, không được phép làm gián đoạn việc trả về kết quả đàm thoại cho người dùng cuối.
- **Cơ Sở Nghiệp Vụ (Business Rationale)**:
  - Đảm bảo tính minh bạch, chính xác tuyệt đối của số liệu tài nguyên, ngăn chặn thất thoát thống kê hoặc ghi đè sai lệch dữ liệu quota.
- **Cơ Chế Thực Thi Kỹ Thuật (Enforcement Mechanism)**:
  - Sử dụng cơ chế ghi bất đồng bộ (Background Task / Middleware Hook) với khối `try-except` độc lập.
  - Cập nhật số token tích lũy: `UPDATE user_quotas SET daily_tokens_used = daily_tokens_used + :tokens, updated_at = CURRENT_TIMESTAMP WHERE user_id = :uid`.
- **Ngoại Lệ (Exceptions)**: Các request thăm dò sức khỏe hệ thống nội bộ (Health check `/health`, `/ping`) được miễn trừ ghi log chi tiết để tránh làm đầy dữ liệu.
- **Yêu Cầu Liên Quan**: `FR-029`, `FR-030`, `FR-031`, `ADR-008`.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### BR-020: Cảnh Báo Ngưỡng Hạn Ngạch & Điều Tiết Chặn Quota (Quota Threshold Warning & Throttling Invariant)
- **Mã Quy Tắc**: `BR-020`
- **Tên Quy Tắc**: Cảnh Báo Ngưỡng Hạn Ngạch & Điều Tiết Chặn Quota (Quota Threshold Warning & Throttling Invariant).
- **Phát Biểu Quy Tắc**:
  1. Khi người dùng tiêu thụ đạt từ **80%** đến dưới **100%** của `daily_token_limit`, trạng thái hạn ngạch chuyển thành `WARNING_80`. Hệ thống đính kèm header cảnh báo `X-Quota-Warning: near_limit` và hiển thị đồng hồ màu vàng cam trên Dashboard.
  2. Khi người dùng đạt từ **100%** trở lên của `daily_token_limit`, trạng thái hạn ngạch chuyển thành `EXCEEDED_THROTTLED`. Hệ thống lập tức từ chối mọi yêu cầu đàm thoại mới (`POST /chat/*`) với mã lỗi `HTTP 429 Too Many Requests` và header `Retry-After` chỉ định thời gian reset vào 00:00:00 UTC tiếp theo (`CTRL-008`).
- **Cơ Sở Nghiệp Vụ (Business Rationale)**:
  - Ngăn ngừa hành vi lạm dụng cạn kiệt tài nguyên API AI bên ngoài, bảo vệ ngân sách hệ thống và khuyến khích người dùng kiểm soát mức tiêu dùng hợp lý.
- **Cơ Chế Thực Thi Kỹ Thuật (Enforcement Mechanism)**:
  - Tầng Middleware hoặc Dependency kiểm tra hạn mức trước khi chuyển request tới LLM Engine.
  - Nếu `daily_tokens_used >= daily_token_limit`: Trả ngay response 429 không gọi xuống external API.
- **Ngoại Lệ (Exceptions)**: Tài khoản quản trị viên (System Admin) có thể được cấu hình hạn ngạch không giới hạn (`daily_token_limit = -1`).
- **Yêu Cầu Liên Quan**: `FR-032`, `CTRL-008`, `SEC-009`, `ADR-008`.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### BR-021: Phân Quyền & Cô Lập Dữ Liệu Đo Lường Dashboard (Role-Based Telemetry & Dashboard Data Isolation)
- **Mã Quy Tắc**: `BR-021`
- **Tên Quy Tắc**: Phân Quyền & Cô Lập Dữ Liệu Đo Lường Dashboard (Role-Based Telemetry & Dashboard Data Isolation).
- **Phát Biểu Quy Tắc**:
  - Người dùng thông thường (Regular User) khi truy cập Dashboard và kết nối luồng SSE `GET /api/v1/resources/stream` chỉ được phép truy xuất dữ liệu đo lường độ trễ, token tiêu thụ và hạn ngạch của chính tài khoản của mình (`WHERE user_id = current_user.id`). Tuyệt đối không rò rỉ dữ liệu hoặc lịch sử request của người dùng khác.
  - Chỉ tài khoản có vai trò Quản trị viên (System Admin) mới có quyền xem biểu đồ tổng hợp toàn hệ thống (Global Aggregate Telemetry) và danh sách request của toàn bộ người dùng.
- **Cơ Sở Nghiệp Vụ (Business Rationale)**:
  - Đảm bảo tính bảo mật, tuân thủ quyền riêng tư dữ liệu cá nhân của người dùng và an toàn vận hành hệ thống.
- **Cơ Chế Thực Thi Kỹ Thuật (Enforcement Mechanism)**:
  - Tại endpoint `GET /api/v1/resources/summary`, `GET /api/v1/resources/history`, và luồng SSE `GET /api/v1/resources/stream`: Bắt buộc lọc theo `current_user.id` nếu không phải Admin.
- **Ngoại Lệ (Exceptions)**: Không có ngoại lệ.
- **Yêu Cầu Liên Quan**: `FR-033`, `FR-034`, `SEC-009`, `ADR-008`.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### BR-022: Tính Bất Biến & Duy Nhất Toàn Cục Của Định Danh Mô Hình (Model Identifier Immutability & Global Uniqueness)
- **Mã Quy Tắc**: `BR-022`
- **Tên Quy Tắc**: Tính Bất Biến & Duy Nhất Toàn Cục Của Định Danh Mô Hình (Model Identifier Immutability & Global Uniqueness).
- **Phát Biểu Quy Tắc**:
  1. Khi đăng ký một mô hình mới vào danh mục (`FR-035`), mã định danh `id` của mô hình phải là duy nhất trên toàn hệ thống (Case-insensitive unique). Nếu phát hiện `id` đã tồn tại, hệ thống từ chối đăng ký với mã `HTTP 409 Conflict`.
  2. Đối với mô hình đã tồn tại, trong mọi thao tác cập nhật cấu hình (`FR-036`), mã định danh `id` và nhà cung cấp `provider` là **hoàn toàn bất biến (Strictly Immutable)**. Nghiêm cấm bất kỳ client nào sửa đổi `id` hoặc chuyển đổi `provider` của bản ghi. Mọi yêu cầu cố ý thay đổi `id` hoặc `provider` bị từ chối ngay lập tức với mã `HTTP 400 Bad Request`.
- **Cơ Sở Nghiệp Vụ (Business Rationale)**:
  - Trường `id` của mô hình được tham chiếu làm khóa ngoại trong bảng tin nhắn lịch sử (`messages.model_used`) và bảng nhật ký đo lường (`api_metric_logs.model_used`). Việc cho phép sửa đổi ID hoặc nhà cung cấp sẽ phá vỡ toàn vẹn dữ liệu quan hệ, gây mâu thuẫn báo cáo thống kê và làm hỏng chuỗi định tuyến LLM adapter.
- **Cơ Chế Thực Thi Kỹ Thuật (Enforcement Mechanism)**:
  - Tầng Controller / Service: Kiểm tra `model_id` trong URL so với trường `id` trong body. Nếu khác nhau hoặc cố ý truyền `provider` mới không khớp với bản ghi hiện hành, nâng lỗi `HTTP 400 Bad Request`: "Mã định danh và nhà cung cấp mô hình là bất biến."
- **Ngoại Lệ (Exceptions)**: Không có ngoại lệ.
- **Yêu Cầu Liên Quan**: `FR-035`, `FR-036`, `SEC-010`, `ADR-009`.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### BR-023: Bảo Vệ Bất Biến Mô Hình Mặc Định Khi Xóa/Lưu Trữ (Default Model Protection & Archival Restriction)
- **Mã Quy Tắc**: `BR-023`
- **Tên Quy Tắc**: Bảo Vệ Bất Biến Mô Hình Mặc Định Khi Xóa/Lưu Trữ (Default Model Protection & Archival Restriction).
- **Phát Biểu Quy Tắc**: Hệ thống nghiêm cấm tuyệt đối hành vi xóa mềm, chuyển sang trạng thái lưu trữ (`status = ARCHIVED`) hoặc vô hiệu hóa (`status = INACTIVE`) đối với mô hình đang được gán cờ mặc định (`is_default == 1` hoặc `is_default == true`). Để có thể xóa mềm hoặc lưu trữ mô hình này, người dùng bắt buộc phải chỉ định một mô hình hoạt động khác (`status = ACTIVE`) làm mô hình mặc định trước.
- **Cơ Sở Nghiệp Vụ (Business Rationale)**:
  - Đảm bảo tính sẵn sàng liên tục của hệ thống đàm thoại: Luôn luôn phải có ít nhất một mô hình hoạt động mặc định làm điểm tựa tiếp nhận câu hỏi của người dùng và làm đích đến dự phòng cho luồng chat tự động.
- **Cơ Chế Thực Thi Kỹ Thuật (Enforcement Mechanism)**:
  - Tại endpoint `DELETE /api/v1/models/{model_id}` (`OP-025`) và `PATCH /api/v1/models/{model_id}/deactivate` (`OP-014`): Truy vấn thuộc tính `is_default` của mô hình.
  - Nếu `is_default == true`: Chặn đứng thao tác và trả về lỗi `HTTP 400 Bad Request` kèm thông điệp rõ ràng: "Không thể xóa hoặc lưu trữ mô hình đang được đặt làm mặc định. Vui lòng chọn một mô hình hoạt động khác làm mặc định trước."
- **Ngoại Lệ (Exceptions)**: Không có ngoại lệ.
- **Yêu Cầu Liên Quan**: `FR-025`, `FR-026`, `FR-039`, `SEC-010`, `ADR-009`.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### BR-024: Thẩm Định Biên Tham Số & Cửa Sổ Ngữ Cảnh An Toàn (Parameter Boundary & Context Window Sanity)
- **Mã Quy Tắc**: `BR-024`
- **Tên Quy Tắc**: Thẩm Định Biên Tham Số & Cửa Sổ Ngữ Cảnh An Toàn (Parameter Boundary & Context Window Sanity).
- **Phát Biểu Quy Tắc**: Trong mọi thao tác thêm mới (`FR-035`) hoặc chỉnh sửa thông tin mô hình (`FR-036`), các tham số kỹ thuật phải thỏa mãn nghiêm ngặt các ngưỡng biên an toàn tối thiểu sau:
  1. `context_window`: Phải là số nguyên dương $\ge 1,000$ tokens và $\le 10,000,000$ tokens.
  2. `max_tokens`: Phải là số nguyên dương $\ge 256$ tokens và $\le 1,000,000$ tokens, đồng thời không được vượt quá `context_window`.
  3. `name`: Chuỗi ký tự độ dài từ 2 đến 100 ký tự, không được chỉ chứa khoảng trắng.
- **Cơ Sở Nghiệp Vụ (Business Rationale)**:
  - Ngăn chặn việc cấu hình sai lệch dẫn đến lỗi runtime của thư viện LangChain / LangGraph, chống lỗi tràn bộ nhớ hoặc việc thiết lập max_tokens quá nhỏ làm câu trả lời của AI bị ngắt quãng giữa chừng gây trải nghiệm tồi tệ.
- **Cơ Chế Thực Thi Kỹ Thuật (Enforcement Mechanism)**:
  - Sử dụng Pydantic Validator ở tầng Request Schema Backend:
    - `@field_validator('context_window')`: Kiểm tra `1000 <= v <= 10000000`.
    - `@field_validator('max_tokens')`: Kiểm tra `256 <= v <= 1000000`.
  - Nếu vi phạm: Trả về mã lỗi `HTTP 422 Unprocessable Entity` kèm mô tả chi tiết trường vi phạm.
- **Ngoại Lệ (Exceptions)**: Không có ngoại lệ.
- **Yêu Cầu Liên Quan**: `FR-035`, `FR-036`, `SEC-010`, `ADR-009`.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### BR-025: Ràng Buộc Ánh Xạ 1-1 & Tính Duy Nhất Của Discord ID (Discord ID Unique & Single Account Binding Invariant)
- **Mã Quy Tắc**: `BR-025`
- **Tên Quy Tắc**: Ràng Buộc Ánh Xạ 1-1 & Tính Duy Nhất Của Discord ID (Discord ID Unique & Single Account Binding Invariant).
- **Phát Biểu Quy Tắc**: Một tài khoản Discord (`discord_id`) chỉ được phép ánh xạ và liên kết với tối đa **duy nhất 01 tài khoản người dùng** trên website AI-Chan tại bất kỳ thời điểm nào. Nghiêm cấm ghi đè liên kết hoặc cho phép nhiều tài khoản website dùng chung một tài khoản Discord.
- **Cơ Sở Nghiệp Vụ (Business Rationale)**:
  - Loại bỏ hoàn toàn nguy cơ chiếm đoạt tài khoản (Account Hijacking) và xung đột định danh OAuth. Nếu cho phép liên kết trùng lặp, khi người dùng thực hiện "Đăng nhập với Discord", hệ thống sẽ không thể xác định phiên làm việc thuộc về người dùng nào, gây mất an toàn dữ liệu cá nhân.
- **Cơ Chế Thực Thi Kỹ Thuật (Enforcement Mechanism)**:
  - Trong luồng callback liên kết `GET /api/v1/auth/discord/callback` (`OP-027`): Backend thực hiện truy vấn `SELECT id FROM users WHERE discord_id = :discord_id AND id != :current_user_id`.
  - Nếu tìm thấy bản ghi: Backend lập tức từ chối thao tác, hủy bỏ giao dịch và phản hồi mã lỗi `HTTP 409 Conflict` (hoặc redirect với `?error=discord_already_linked`).
  - Cột `discord_id` trong cơ sở dữ liệu được áp dụng ràng buộc `UNIQUE INDEX idx_users_discord_id`.
- **Ngoại Lệ (Exceptions)**: Không có ngoại lệ.
- **Yêu Cầu Liên Quan**: `FR-040`, `SEC-011`, `CTRL-010`, `ADR-010`.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### BR-026: Chốt Chặn Chống Khóa Tài Khoản Khi Hủy Liên Kết (Account Lockout Prevention Guard on Unlink)
- **Mã Quy Tắc**: `BR-026`
- **Tên Quy Tắc**: Chốt Chặn Chống Khóa Tài Khoản Khi Hủy Liên Kết (Account Lockout Prevention Guard on Unlink).
- **Phát Biểu Quy Tắc**: Người dùng **chỉ được phép hủy liên kết tài khoản Discord** nếu tài khoản đã tồn tại mật khẩu đăng nhập cục bộ hợp lệ (`hashed_password IS NOT NULL`). Nghiêm cấm tuyệt đối hành vi hủy liên kết đối với các tài khoản đăng ký thuần túy qua OAuth2 mà chưa từng thiết lập mật khẩu tài khoản.
- **Cơ Sở Nghiệp Vụ (Business Rationale)**:
  - Đối với các tài khoản đăng ký qua Discord (`FR-027`), trường `hashed_password` ban đầu mang giá trị `NULL` (`BR-018`). Nếu cho phép hủy liên kết Discord, tài khoản sẽ không còn bất kỳ phương thức xác thực nào khả dụng (không có mật khẩu để đăng nhập bằng form và không còn liên kết OAuth), dẫn đến việc người dùng bị khóa vĩnh viễn (Permanent Account Lockout) khỏi tài khoản và mất toàn bộ lịch sử trò chuyện.
- **Cơ Chế Thực Thi Kỹ Thuật (Enforcement Mechanism)**:
  - Tại endpoint `DELETE /api/v1/users/me/discord` (`OP-028`): Tầng Controller kiểm tra trường `user.hashed_password`.
  - Nếu `user.hashed_password IS NULL`: Lập tức từ chối và trả về mã lỗi `HTTP 400 Bad Request` kèm thông báo: *"Không thể hủy liên kết Discord vì tài khoản chưa thiết lập mật khẩu đăng nhập. Vui lòng tạo mật khẩu tại tab Bảo mật trước khi hủy liên kết."*
  - Trên giao diện Frontend (`SCR-005`): Nút "Hủy liên kết" bị làm mờ (disabled) hoặc hiển thị tooltip cảnh báo nếu tài khoản chưa có mật khẩu, kèm liên kết dẫn sang tab Đổi mật khẩu.
- **Ngoại Lệ (Exceptions)**: Không có ngoại lệ.
- **Yêu Cầu Liên Quan**: `FR-041`, `SEC-011`, `CTRL-010`, `ADR-010`.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### BR-027: Tái Xác Thực Khi Hủy Liên Kết Danh Tính Mạng Xã Hội (Re-authentication on Discord Unlink)
- **Mã Quy Tắc**: `BR-027`
- **Tên Quy Tắc**: Tái Xác Thực Khi Hủy Liên Kết Danh Tính Mạng Xã Hội (Re-authentication on Discord Unlink).
- **Phát Biểu Quy Tắc**: Mọi yêu cầu hủy liên kết tài khoản Discord (`DELETE /api/v1/users/me/discord`) bắt buộc phải đi kèm thông tin xác thực mật khẩu hiện tại của người dùng trong request body (`{"password": "..."}`) và phải vượt qua kiểm tra so khớp mã băm mật khẩu (`bcrypt.verify`).
- **Cơ Sở Nghiệp Vụ (Business Rationale)**:
  - Hủy liên kết danh tính mạng xã hội là một hành động đột biến định danh nhạy cảm (Sensitive Identity Mutation). Cơ chế Re-authentication tuân thủ `SEC-006` nhằm ngăn chặn các tấn công CSRF, tấn công chiếm đoạt phiên qua máy tính công cộng không khóa màn hình (Unattended Workstation), hoặc tấn công Cross-Site Scripting thao túng API.
- **Cơ Chế Thực Thi Kỹ Thuật (Enforcement Mechanism)**:
  - Controller tiếp nhận payload `UnlinkDiscordRequest` chứa trường `password`.
  - Thực thi kiểm tra `security.verify_password(payload.password, user.hashed_password)`.
  - Nếu mật khẩu không khớp: Trả về mã lỗi `HTTP 401 Unauthorized`: *"Mật khẩu xác nhận không chính xác."*
  - Ghi nhận nhật ký an ninh cho thao tác gỡ bỏ định danh (`SEC-006`, `NFR-019`).
- **Ngoại Lệ (Exceptions)**: Không có ngoại lệ.
- **Yêu Cầu Liên Quan**: `FR-041`, `SEC-006`, `SEC-011`, `CTRL-010`, `ADR-010`.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### BR-031: Tiền Điều Kiện Liên Kết Tài Khoản Discord Cho Quản Lý Bot (Discord Account Linking Precondition for Bot Management)
- **Mã Quy Tắc**: `BR-031`
- **Tên Quy Tắc**: Tiền Điều Kiện Liên Kết Tài Khoản Discord Cho Quản Lý Bot (Discord Account Linking Precondition for Bot Management).
- **Phát Biểu Quy Tắc**: Quyền truy cập vào tính năng và các API quản lý Bot Discord chỉ được cấp phép cho người dùng đã liên kết hợp lệ tài khoản Discord cá nhân với tài khoản website (`discord_id IS NOT NULL`). Người dùng chưa liên kết Discord tuyệt đối không được phép xem hoặc chỉnh sửa cấu hình Bot.
- **Cơ Sở Nghiệp Vụ (Business Rationale)**:
  - Cấu hình Bot Discord gắn liền với định danh người dùng Discord để xác định quyền hạn, hạn ngạch token và khả năng tương tác. Nếu người dùng chưa liên kết tài khoản Discord, hệ thống không có định danh đích để liên kết cấu hình và giám sát việc sử dụng.
- **Cơ Chế Thực Thi Kỹ Thuật (Enforcement Mechanism)**:
  - Tại toàn bộ các endpoint thuộc nhóm `/api/v1/bot/discord/*` (`OP-031`, `OP-032`, `OP-033`): Backend kiểm tra `current_user["discord_id"]`.
  - Nếu `current_user["discord_id"] IS NULL`: Backend từ chối ngay với `HTTP 403 Forbidden` kèm thông điệp: *"Vui lòng liên kết tài khoản Discord trước khi truy cập tính năng quản lý Bot."*
  - Trên giao diện Frontend (`SCR-006`): Tự động hiển thị màn hình khóa kèm nút bấm chuyển hướng người dùng sang tab Kết nối (`/settings?tab=connections`) để thực hiện liên kết OAuth2.
- **Ngoại Lệ (Exceptions)**: Không có ngoại lệ.
- **Yêu Cầu Liên Quan**: `FR-040`, `FR-044`, `FR-045`, `SEC-013`, `ADR-012`.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### BR-032: Bất Biến Dùng Chung Hạn Ngạch Token Giữa Web & Bot Discord (Shared Token Quota Invariant across Discord & Web)
- **Mã Quy Tắc**: `BR-032`
- **Tên Quy Tắc**: Bất Biến Dùng Chung Hạn Ngạch Token Giữa Web & Bot Discord (Shared Token Quota Invariant across Discord & Web).
- **Phát Biểu Quy Tắc**: Mọi token phát sinh từ các câu hỏi và phản hồi của Bot Discord đều phải được trừ trực tiếp vào hạn ngạch token hàng ngày (`user_quotas`) của tài khoản người dùng tương ứng. Khi hạn ngạch đạt 100% (`status = EXCEEDED_THROTTLED`), Bot Discord lập tức từ chối xử lý câu hỏi mới trên mọi kênh Discord.
- **Cơ Sở Nghiệp Vụ (Business Rationale)**:
  - Ngăn chặn tình trạng người dùng lợi dụng kênh Discord để vượt rào (bypass) hệ thống kiểm soát chi phí LLM của nền tảng web, bảo đảm tính công bằng tài nguyên và bảo vệ ngân sách API của hệ thống.
- **Cơ Chế Thực Thi Kỹ Thuật (Enforcement Mechanism)**:
  - Khi Bot nhận được câu hỏi từ Discord User: Hệ thống tra cứu `user_id` qua `discord_id`, đọc bản ghi `user_quotas`.
  - Nếu `daily_tokens_used >= daily_token_limit`: Bot từ chối tạo phản hồi LLM, phản hồi thông báo ngắn gọn trên Discord: *"Bạn đã sử dụng hết hạn ngạch token trong ngày. Vui lòng thử lại vào ngày mai hoặc nâng cấp tài khoản."*
  - Nếu còn hạn ngạch: Thực thi gọi LLM, tính toán `prompt_tokens + completion_tokens` và cập nhật cộng dồn `daily_tokens_used` vào bảng `user_quotas` trong cùng giao dịch cơ sở dữ liệu.
- **Ngoại Lệ (Exceptions)**: Không có ngoại lệ.
- **Yêu Cầu Liên Quan**: `FR-032`, `FR-046`, `BR-020`, `CTRL-008`, `CTRL-012`, `ADR-012`.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### BR-033: Bất Biến Định Tuyến Mô Hình Hoạt Động Cho Bot Discord (Active Model Routing Invariant for Discord Bot)
- **Mã Quy Tắc**: `BR-033`
- **Tên Quy Tắc**: Bất Biến Định Tuyến Mô Hình Hoạt Động Cho Bot Discord (Active Model Routing Invariant for Discord Bot).
- **Phát Biểu Quy Tắc**: Mô hình được chỉ định làm mô hình phục vụ cho Bot Discord (`preferred_model_id`) bắt buộc phải ở trạng thái hoạt động (`ACTIVE`) trong bảng `models`. Nếu mô hình được cấu hình bị chuyển sang trạng thái `INACTIVE` hoặc `ARCHIVED`, hệ thống phải tự động chuyển hướng dự phòng (failover) về mô hình mặc định của hệ thống (`is_default = 1`) mà không làm gián đoạn trải nghiệm của người dùng trên Discord.
- **Cơ Sở Nghiệp Vụ (Business Rationale)**:
  - Bảo đảm tính sẵn sàng cao (High Availability) cho dịch vụ Bot Discord: Không để bot bị crash hoặc trả về lỗi kỹ thuật khi quản trị viên tạm dừng hoặc cập nhật một mô hình AI cụ thể.
- **Cơ Chế Thực Thi Kỹ Thuật (Enforcement Mechanism)**:
  - Tại API cập nhật cấu hình `PUT /api/v1/bot/discord/config` (`OP-032`): Backend kiểm tra mô hình gửi lên phải có `status == 'ACTIVE'`. Nếu không, từ chối với `HTTP 400 Bad Request`.
  - Tại luồng điều phối tin nhắn Bot (`PROC-023`): Trước khi gọi LLM, kiểm tra trạng thái hiện thời của `preferred_model_id`. Nếu mô hình không còn `ACTIVE`, tự động lấy mô hình có `is_default = 1` để thay thế và ghi log cảnh báo telemetry.
- **Ngoại Lệ (Exceptions)**: Không có ngoại lệ.
- **Yêu Cầu Liên Quan**: `FR-024`, `FR-026`, `FR-045`, `BR-013`, `ADR-003`, `ADR-012`.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### BR-034: Thẩm Quyền Quản Trị Server Cho Cấu Hình Bot Phạm Vi Guild (Guild Admin Permission Enforcement for Server Bot Config)
- **Mã Quy Tắc**: `BR-034`
- **Tên Quy Tắc**: Thẩm Quyền Quản Trị Server Cho Cấu Hình Bot Phạm Vi Guild (Guild Admin Permission Enforcement for Server Bot Config).
- **Phát Biểu Quy Tắc**: Người dùng chỉ được phép xem và thay đổi cấu hình Bot Discord áp dụng cho một Discord Server (Guild) cụ thể nếu người dùng sở hữu quyền `ADMINISTRATOR` (bit 0x8) hoặc `MANAGE_GUILD` (bit 0x20) tại Server đó. Người dùng là thành viên thông thường chỉ có quyền tùy biến cấu hình Bot cho kênh cá nhân DM của chính mình.
- **Cơ Sở Nghiệp Vụ (Business Rationale)**:
  - Bảo vệ quyền riêng tư và quyền kiểm soát của người sở hữu máy chủ Discord: Ngăn chặn thành viên thường thay đổi prompt, đổi mô hình tốn kém hoặc tắt bot trong server công cộng.
- **Cơ Chế Thực Thi Kỹ Thuật (Enforcement Mechanism)**:
  - Khi lưu cấu hình phạm vi Guild (`scope = 'GUILD'`): Backend kiểm tra danh sách quyền của người dùng tại Guild thông qua Discord OAuth Token hoặc danh sách Guild Cache.
  - Nếu thiếu quyền quản trị: Backend từ chối với mã lỗi `HTTP 403 Forbidden`: *"Bạn không có quyền quản lý Server Discord này."*
- **Ngoại Lệ (Exceptions)**: Không có ngoại lệ.
- **Yêu Cầu Liên Quan**: `FR-044`, `FR-045`, `SEC-013`, `ADR-012`.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.






