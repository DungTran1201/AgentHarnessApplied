# TIÊU CHÍ NGHIỆM THU ĐỊNH LƯỢNG (ACCEPTANCE CRITERIA SPECIFICATION)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `AC-SPEC-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Định dạng chuẩn** | **Given ... When ... Then ...** (Chuẩn kiểm thử hành vi BDD) |
| **Mục đích** | Làm cơ sở không thể tranh cãi cho việc phát triển ca kiểm thử tự động (Test Cases) và nghiệm thu chất lượng mã nguồn |

---

## 1. Nhóm Tiêu Chí Xác Thực & Quản Lý Phiên (AC-001: Authentication & Session)

---

### AC-001-A: Đăng Ký Tài Khoản Mới Thành Công (Happy Path)
- **Truy vết**: `FR-001`, `CAP-AUTH-01`.
- **Kịch bản**:
  - **Given** người dùng là khách vãng lai (Guest) chưa đăng nhập vào hệ thống
  - **And** email `user@example.com` chưa từng tồn tại trong cơ sở dữ liệu
  - **When** người dùng gửi biểu mẫu đăng ký với email `user@example.com` và mật khẩu `Secret@123`
  - **Then** hệ thống tạo bản ghi người dùng mới với mật khẩu được băm an toàn bằng Argon2id/Bcrypt
  - **And** hệ thống trả về mã trạng thái `HTTP 201 Created` kèm thông báo đăng ký thành công
  - **And** người dùng được tự động chuyển hướng tới trang Đăng nhập.

---

### AC-001-B: Đăng Ký Trùng Lặp Email (Exception Flow)
- **Truy vết**: `FR-001`.
- **Kịch bản**:
  - **Given** email `existing@example.com` đã được kích hoạt trong hệ thống
  - **When** người dùng cố tình gửi form đăng ký với email `existing@example.com`
  - **Then** hệ thống từ chối tạo tài khoản và trả về mã lỗi `HTTP 409 Conflict`
  - **And** giao diện hiển thị thông báo: "Email này đã được sử dụng. Vui lòng đăng nhập hoặc sử dụng email khác."

---

### AC-001-C: Đăng Nhập Với Thông Tin Hợp Lệ (Happy Path)
- **Truy vết**: `FR-002`, `CAP-AUTH-02`.
- **Kịch bản**:
  - **Given** tài khoản `user@example.com` tồn tại với mật khẩu chính xác `Secret@123`
  - **And** trạng thái tài khoản là `ACTIVE`
  - **When** người dùng gửi yêu cầu đăng nhập với đúng email và mật khẩu trên
  - **Then** hệ thống cấp phát mã thông báo JWT hợp lệ trong Cookie `HttpOnly; Secure; SameSite=Strict`
  - **And** hệ thống trả về mã `HTTP 200 OK` và chuyển hướng người dùng vào giao diện Chat chính.

---

### AC-001-D: Đăng Nhập Sai Mật Khẩu Hoặc Email (Exception Flow)
- **Truy vết**: `FR-002`.
- **Kịch bản**:
  - **Given** người dùng nhập sai mật khẩu hoặc nhập một email không tồn tại
  - **When** người dùng nhấn nút "Đăng nhập"
  - **Then** hệ thống trả về mã lỗi `HTTP 401 Unauthorized`
  - **And** giao diện hiển thị thông báo lỗi chung: "Email hoặc mật khẩu không chính xác."
  - **And** không tiết lộ thông tin email có tồn tại trong hệ thống hay không.

---

### AC-001-E: Đăng Xuất Hệ Thống (Happy Path)
- **Truy vết**: `FR-003`, `CAP-AUTH-03`.
- **Kịch bản**:
  - **Given** người dùng đang ở trạng thái đã đăng nhập với JWT cookie hợp lệ
  - **When** người dùng nhấn nút "Đăng xuất"
  - **Then** hệ thống thu hồi và xóa bỏ Cookie phiên làm việc
  - **And** người dùng được điều hướng về trang Đăng nhập
  - **And** các request tiếp theo không mang token sẽ bị chặn với `HTTP 401 Unauthorized`.

---

## 2. Nhóm Tiêu Chí Quản Lý Phiên Hội Thoại (AC-002: Conversation Management)

---

### AC-002-A: Khởi Tạo Cuộc Trò Chuyện Mới (Happy Path)
- **Truy vết**: `FR-004`, `CAP-CONV-01`, `BR-001`.
- **Kịch bản**:
  - **Given** người dùng đã đăng nhập hợp lệ với định danh `user_A`
  - **When** người dùng nhấn nút "Cuộc trò chuyện mới" (New Chat) trên Sidebar
  - **Then** hệ thống tạo một bản ghi conversation mới trong cơ sở dữ liệu với `user_id = user_A.id` và tiêu đề "Cuộc trò chuyện mới"
  - **And** giao diện mở ra khung chat trống với thông điệp chào mừng
  - **And** URL được cập nhật thành `/c/{new_conversation_id}`.

---

### AC-002-B: Xem Danh Sách Lịch Sử Hội Thoại Theo Thứ Tự Cập Nhật
- **Truy vết**: `FR-005`, `CAP-CONV-02`.
- **Kịch bản**:
  - **Given** người dùng `user_A` sở hữu nhiều cuộc trò chuyện đã tạo trước đây
  - **When** người dùng tải lại trang hoặc mở Sidebar
  - **Then** hệ thống trả về danh sách các cuộc trò chuyện của `user_A`
  - **And** danh sách được sắp xếp chính xác theo thứ tự thời gian cập nhật giảm dần (`updated_at DESC`).

---

### AC-002-C: Đổi Tên Cuộc Trò Chuyện Thủ Công & Tự Động
- **Truy vết**: `FR-006`, `CAP-CONV-03`, `BR-004`.
- **Kịch bản 1 (Tự động)**:
  - **Given** cuộc trò chuyện mới có tiêu đề mặc định là "Cuộc trò chuyện mới"
  - **When** người dùng gửi tin nhắn đầu tiên có nội dung: "Lập trình Python cơ bản cho người mới bắt đầu"
  - **Then** hệ thống tự động cập nhật tiêu đề cuộc trò chuyện thành: "Lập trình Python cơ bản cho n..." (cắt tối đa 30 ký tự)
  - **And** Sidebar hiển thị tiêu đề mới vừa cập nhật.
- **Kịch bản 2 (Thủ công)**:
  - **Given** người dùng muốn đặt tên theo ý muốn
  - **When** người dùng chọn nút Sửa tên và nhập "Dự án Machine Learning 2026"
  - **Then** tiêu đề được cập nhật thành "Dự án Machine Learning 2026" và không bị tự động ghi đè ở các tin nhắn sau.

---

### AC-002-D: Xóa Cuộc Trò Chuyện Thành Công
- **Truy vết**: `FR-007`, `CAP-CONV-04`, `NFR-018`.
- **Kịch bản**:
  - **Given** cuộc trò chuyện `conv_1` thuộc quyền sở hữu của người dùng hiện tại
  - **When** người dùng bấm biểu tượng Xóa và chọn "Xác nhận xóa"
  - **Then** hệ thống đánh dấu xóa bản ghi `conv_1` và toàn bộ các tin nhắn bên trong
  - **And** cuộc trò chuyện lập tức biến mất khỏi danh sách hiển thị trên Sidebar
  - **And** gọi trực tiếp API `GET /api/v1/conversations/{conv_1}` sẽ nhận được mã lỗi `HTTP 404 Not Found`.

---

### AC-002-E: Phòng Thủ Truy Cập Trái Phép IDOR (Security Negative Flow)
- **Truy vết**: `FR-012`, `CAP-CONV-05`, `BR-002`.
- **Kịch bản**:
  - **Given** người dùng `user_A` đang đăng nhập hợp lệ
  - **And** cuộc trò chuyện `conv_B` thuộc quyền sở hữu của người dùng `user_B`
  - **When** `user_A` cố tình gọi API `GET /api/v1/conversations/{conv_B}` hoặc gửi tin nhắn vào `conv_B`
  - **Then** hệ thống bắt buộc từ chối phục vụ và trả về mã lỗi `HTTP 403 Forbidden`
  - **And** không có bất kỳ dữ liệu tin nhắn nào của `user_B` bị rò rỉ ra ngoài.

---

## 3. Nhóm Tiêu Chí Tương Tác Chat & AI (AC-003: Chat & AI Engine)

---

### AC-003-A: Gửi Tin Nhắn Hợp Lệ & Lưu Vết Dữ Liệu
- **Truy vết**: `FR-008`, `CAP-CHAT-01`, `CAP-CHAT-02`.
- **Kịch bản**:
  - **Given** người dùng đang ở trong cuộc trò chuyện hợp lệ của mình
  - **When** người dùng gửi tin nhắn có nội dung văn bản 500 ký tự
  - **Then** hệ thống lưu bản ghi mới vào bảng `messages` với `role: 'user'`
  - **And** tin nhắn hiển thị ngay lập tức trên giao diện với trạng thái đang chờ AI trả lời.

---

### AC-003-B: Kiểm Soát Chiều Dài Tin Nhắn Đầu Vào (Validation Flow)
- **Truy vết**: `FR-008`, `BR-003`.
- **Kịch bản**:
  - **Given** người dùng nhập một đoạn văn bản có độ dài 4,005 ký tự
  - **When** người dùng cố gắng nhấn nút Gửi
  - **Then** giao diện Client cảnh báo: "Tin nhắn vượt quá giới hạn 4,000 ký tự" và chặn gửi
  - **And** nếu gọi trực tiếp qua API, Backend từ chối với mã lỗi `HTTP 422 Unprocessable Entity`.

---

### AC-003-C: Nhận Phản Hồi Dạng Streaming Với Độ Trễ TTFT < 2.0s
- **Truy vết**: `FR-009`, `FR-013`, `NFR-002`, `CAP-AI-04`.
- **Kịch bản**:
  - **Given** người dùng gửi một câu hỏi hợp lệ tới AI
  - **When** hệ thống tiếp nhận và chuyển tiếp yêu cầu tới mô hình AI
  - **Then** ký tự phản hồi đầu tiên bắt đầu xuất hiện trên màn hình trong thời gian dưới 2.0 giây
  - **And** toàn bộ câu trả lời được truyền luồng từng từ mượt mà qua ReadableStream / SSE cho đến khi kết thúc.

---

### AC-003-D: Kết Xuất Markdown & Làm Nổi Bật Mã Nguồn (Code Highlighting)
- **Truy vết**: `FR-009`, `CAP-AI-05`, `NFR-016`.
- **Kịch bản**:
  - **Given** câu trả lời của AI chứa định dạng danh sách, bảng biểu và khối code Python: ````python print('hello') ````
  - **When** giao diện người dùng nhận được câu trả lời
  - **Then** các khối code được hiển thị nổi bật với màu sắc cú pháp chuẩn (Syntax Highlighting)
  - **And** có nút bấm "Copy code" cho phép sao chép mã nguồn vào clipboard chỉ với 1 cú click.

---

## 4. Nhóm Tiêu Chí Chuyển Vùng Dự Phòng Tự Động (AC-004: Failover Resilience)

---

### AC-004-A: Tự Động Chuyển Vùng Dự Phòng Sang OpenAI Khi Gemini Lỗi
- **Truy vết**: `FR-011`, `BR-005`, `CAP-AI-03`, `NFR-REL-03`.
- **Kịch bản**:
  - **Given** hệ thống đang sử dụng cấu hình mặc định Google Gemini (Primary) và OpenAI (Fallback)
  - **And** tài khoản Google Gemini gặp sự cố lỗi `HTTP 429 Quota Exceeded` hoặc mất kết nối timeout 30s
  - **When** người dùng gửi một câu hỏi đàm thoại
  - **Then** `LLMManager` tự động bắt ngoại lệ lỗi của Gemini và ngay lập tức gọi tiếp sang OpenAI API
  - **And** người dùng vẫn nhận được câu trả lời hoàn chỉnh bình thường mà không hề thấy thông báo lỗi
  - **And** hệ thống ghi một dòng nhật ký cảnh báo mức `WARNING` ghi nhận việc chuyển vùng dự phòng.

---

### AC-004-B: Xử Lý Khi Toàn Bộ Nhà Cung Cấp AI Thất Bại (Graceful Degradation)
- **Truy vết**: `FR-011`, `NFR-011`.
- **Kịch bản**:
  - **Given** cả Google Gemini và OpenAI đều đồng thời gặp sự cố đứt kết nối mạng quốc tế
  - **When** người dùng gửi câu hỏi
  - **Then** hệ thống không bị crash tiến trình Backend
  - **And** hệ thống trả về mã trạng thái `HTTP 503 Service Unavailable`
  - **And** giao diện hiển thị thông báo thân thiện: "Dịch vụ AI hiện đang tạm thời quá tải. Vui lòng thử lại sau ít phút."

---

## 5. Nhóm Tiêu Chí An Ninh & Kiểm Soát Tần Suất (AC-005: Security & Protection)

---

### AC-005-A: Thực Thi Giới Hạn Tần Suất Rate Limiting (Anti-Abuse)
- **Truy vết**: `BR-006`, `NFR-007`, `SEC-005`, `CAP-SEC-01`.
- **Kịch bản**:
  - **Given** một địa chỉ IP gửi yêu cầu dồn dập vào API chat
  - **When** số lượng request vượt quá 60 request trong vòng 60 giây trượt (Sliding Window)
  - **Then** hệ thống từ chối phục vụ kể từ request thứ 61 và trả về mã lỗi `HTTP 429 Too Many Requests`
  - **And** thông điệp trả về: "Application rate limit exceeded: maximum requests per minute reached."

---

### AC-005-B: Tuyệt Đối Không Rò Rỉ Khóa Bí Mật API (Zero Credential Leak)
- **Truy vết**: `NFR-005`, `SEC-001`, `CST-01`.
- **Kịch bản**:
  - **Given** hệ thống đang vận hành và phục vụ người dùng thực tế
  - **When** kiểm toán viên phân tích toàn bộ mã nguồn Frontend, file build JavaScript và các gói tin HTTP trong tab Network của trình duyệt
  - **Then** không tìm thấy bất kỳ chuỗi ký tự nào khớp với định dạng khóa API của Gemini hoặc OpenAI
  - **And** mọi cuộc gọi tới dịch vụ AI đều bắt nguồn từ địa chỉ IP của máy chủ Backend.

---

### AC-005-C: Làm Sạch Mã Độc XSS Trong Phản Hồi AI (Output Sanitization)
- **Truy vết**: `NFR-008`, `SEC-003`, `CAP-SEC-02`.
- **Kịch bản**:
  - **Given** câu trả lời từ mô hình AI vô tình chứa đoạn mã: `<img src="x" onerror="alert('xss')">`
  - **When** giao diện Next.js hiển thị câu trả lời này lên màn hình
  - **Then** bộ lọc khử khuẩn (Sanitizer) tự động bóc tách và loại bỏ thuộc tính `onerror` nguy hiểm
  - **And** trình duyệt không thực thi bất kỳ đoạn mã JavaScript độc hại nào.

---

## 6. Nhóm Tiêu Chí Quản Lý Tài Khoản & Hồ Sơ Cá Nhân (AC-007: User Profile & Account Management)

---

### AC-007-A: Xem Hồ Sơ & Thống Kê Hoạt Động (View Profile & Activity Stats)
- **Truy vết**: `FR-015`, `UC-010`, `CAP-USER-01`.
- **Kịch bản**:
  - **Given** người dùng `Tester` đã đăng nhập và đã tạo 5 cuộc hội thoại với tổng cộng 42 tin nhắn
  - **When** người dùng truy cập trang Hồ sơ / Cài đặt cá nhân
  - **Then** hệ thống hiển thị chính xác họ tên, username, email, ngày tham gia
  - **And** hiển thị số lượng cuộc hội thoại: 5, số lượng tin nhắn: 42
  - **And** không để lộ trường `hashed_password` trong response API.

---

### AC-007-B: Cập Nhật Họ Tên, Username & Tiểu Sử (Profile Update Flow)
- **Truy vết**: `FR-016`, `BR-007`, `UC-011`, `CAP-USER-02`.
- **Kịch bản 1 (Thành công)**:
  - **Given** người dùng đổi họ tên thành "Nguyễn Văn A", username thành "vana_nguyen" và tiểu sử "AI Enthusiast"
  - **When** người dùng bấm nút "Lưu thay đổi"
  - **Then** hệ thống cập nhật bản ghi thành công với mã `HTTP 200 OK`
  - **And** trên giao diện hiển thị thông báo Toast: "Cập nhật hồ sơ thành công."
- **Kịch bản 2 (Trùng lặp Username)**:
  - **Given** username "admin_pro" đã thuộc về một tài khoản khác
  - **When** người dùng cố gắng đổi username của mình thành "admin_pro"
  - **Then** hệ thống từ chối với mã lỗi `HTTP 409 Conflict` và cảnh báo: "Tên đăng nhập này đã được sử dụng."

---

### AC-007-C: Cập Nhật Ảnh Đại Diện Bằng URL Hợp Lệ (Avatar Update Flow)
- **Truy vết**: `FR-017`, `BR-011`, `UC-012`, `CAP-USER-03`.
- **Kịch bản**:
  - **Given** người dùng dán đường dẫn ảnh: `https://example.com/avatar.png`
  - **When** người dùng nhấn "Cập nhật ảnh đại diện"
  - **Then** hệ thống lưu đường dẫn vào trường `avatar_url` trong bảng `users`
  - **And** avatar trên thanh Header và Sidebar được cập nhật ngay lập tức.

---

### AC-007-D: Thay Đổi Địa Chỉ Email An Toàn (Secure Email Change Flow)
- **Truy vết**: `FR-018`, `BR-008`, `BR-010`, `UC-013`, `SEC-006`.
- **Kịch bản 1 (Thành công)**:
  - **Given** người dùng nhập email mới `new_email@aichan.vn` và mật khẩu hiện tại chính xác
  - **When** người dùng bấm "Xác nhận đổi Email"
  - **Then** hệ thống cập nhật trường `email` mới trong CSDL và phản hồi `HTTP 200 OK`.
- **Kịch bản 2 (Sai mật khẩu hiện tại)**:
  - **Given** người dùng nhập sai mật khẩu hiện tại
  - **When** người dùng bấm "Xác nhận đổi Email"
  - **Then** hệ thống từ chối cập nhật, trả về `HTTP 401 Unauthorized` và thông báo: "Mật khẩu hiện tại không chính xác."
- **Kịch bản 3 (Trùng email đã có)**:
  - **Given** email mới trùng với một tài khoản khác trong hệ thống
  - **When** người dùng bấm "Xác nhận đổi Email"
  - **Then** hệ thống từ chối cập nhật với mã lỗi `HTTP 409 Conflict`.

---

### AC-007-E: Thay Đổi Mật Khẩu Đăng Nhập & Luân Chuyển Khóa (Password Rotation Flow)
- **Truy vết**: `FR-019`, `BR-008`, `BR-009`, `UC-014`, `SEC-002`, `SEC-007`.
- **Kịch bản 1 (Thành công)**:
  - **Given** người dùng nhập đúng mật khẩu cũ và nhập mật khẩu mới "NewSecretPass2026!"
  - **When** người dùng bấm "Cập nhật mật khẩu"
  - **Then** hệ thống băm mật khẩu mới bằng Bcrypt, cập nhật `password_changed_at = CURRENT_TIMESTAMP`
  - **And** cấp phát cookie token mới để duy trì phiên làm việc hiện tại của người dùng.
- **Kịch bản 2 (Mật khẩu mới trùng mật khẩu cũ)**:
  - **Given** người dùng nhập mật khẩu mới giống hệt mật khẩu hiện tại
  - **When** người dùng bấm "Cập nhật mật khẩu"
  - **Then** hệ thống từ chối với mã lỗi `HTTP 422 Unprocessable Entity` và thông báo: "Mật khẩu mới không được trùng với mật khẩu hiện tại."

---

### AC-007-F: Tùy Chỉnh Chế Độ Giao Diện & Ngôn Ngữ (Preferences Flow)
- **Truy vết**: `FR-020`, `UC-015`, `CAP-USER-06`.
- **Kịch bản**:
  - **Given** người dùng chuyển đổi Theme từ `DARK` sang `LIGHT`
  - **When** hệ thống lưu cài đặt qua API `PATCH /api/v1/users/me/preferences`
  - **Then** giao diện website chuyển ngay sang chế độ sáng mà không cần tải lại trang
  - **And** cài đặt này được duy trì khi người dùng mở phiên làm việc trên trình duyệt khác.


