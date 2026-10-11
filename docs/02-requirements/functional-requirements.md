# ĐẶC TẢ CHI TIẾT YÊU CẦU CHỨC NĂNG (FUNCTIONAL REQUIREMENTS SPECIFICATION)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `FRS-SPEC-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Quy ước mã định danh** | `FR-001` đến `FR-026` (Duy nhất, Ổn định, Không thay đổi mã) |
| **Hệ thống Priority** | **`MUST`**, **`SHOULD`**, **`COULD`** |

---

## 1. Phân Hệ Xác Thực & Quản Lý Người Dùng (Identity & Authentication)

---

### FR-001: Đăng Ký Tài Khoản Người Dùng (User Registration)
- **Mã Yêu Cầu**: `FR-001`
- **Tên Yêu Cầu**: Đăng Ký Tài Khoản Người Dùng (User Registration).
- **Mô Tả**: Cung cấp khả năng tạo tài khoản mới bằng địa chỉ email hợp lệ và mật khẩu bảo mật.
- **Tác Nhân (Actor)**: `ACT-01` (Guest).
- **Điều Kiện Tiên Quyết (Preconditions)**: Khách chưa đăng nhập; email chưa từng tồn tại trong hệ thống.
- **Luồng Chính (Main Flow)**:
  1. Người dùng truy cập trang Đăng ký tài khoản (`/register`).
  2. Người dùng điền Email, Mật khẩu (độ dài >= 8 ký tự, có chữ hoa, số) và Xác nhận mật khẩu.
  3. Người dùng nhấn nút "Đăng ký".
  4. Hệ thống kiểm tra hợp lệ dữ liệu (Email regex, độ mạnh mật khẩu, mật khẩu trùng khớp).
  5. Hệ thống băm mật khẩu bằng Argon2id/Bcrypt kèm muối ngẫu nhiên (`NFR-006`).
  6. Hệ thống tạo bản ghi người dùng mới trong bảng `users` với trạng thái `ACTIVE`.
  7. Hệ thống hiển thị thông báo đăng ký thành công và tự động chuyển hướng người dùng sang trang Đăng nhập (`/login`).
- **Luồng Rẽ Nhánh (Alternative Flow)**: `Không có`.
- **Luồng Ngoại Lệ (Exception Flow)**:
  - *EF-01*: Email đã tồn tại -> Trả về lỗi `HTTP 409 Conflict`: "Email này đã được sử dụng. Vui lòng đăng nhập hoặc sử dụng email khác."
  - *EF-02*: Mật khẩu không đáp ứng độ phức tạp -> Trả về lỗi `HTTP 422 Unprocessable Entity`: "Mật khẩu phải chứa ít nhất 8 ký tự, bao gồm chữ hoa và chữ số."
- **Điều Kiện Sau (Postconditions)**: Tài khoản mới được lưu trữ an toàn trong cơ sở dữ liệu.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `CAP-FOUNDATION` (Database Schema bảng `users`).
- **Tiêu Chí Nghiệm Thu Liên Quan**: `AC-001-A`.

---

### FR-002: Đăng Nhập Hệ Thống (User Login & Session Establishment)
- **Mã Yêu Cầu**: `FR-002`
- **Tên Yêu Cầu**: Đăng Nhập Hệ Thống (User Login & Session Establishment).
- **Mô Tả**: Xác thực danh tính người dùng và cấp phát mã thông báo phiên làm việc an toàn (JWT Token).
- **Tác Nhân (Actor)**: `ACT-01` (Guest), `ACT-02` (Registered User).
- **Điều Kiện Tiên Quyết (Preconditions)**: Người dùng đã có tài khoản trong hệ thống.
- **Luồng Chính (Main Flow)**:
  1. Người dùng truy cập trang Đăng nhập (`/login`).
  2. Người dùng nhập Email và Mật khẩu, nhấn "Đăng nhập".
  3. Hệ thống tìm kiếm tài khoản theo email và đối chiếu hash mật khẩu an toàn.
  4. Hệ thống xác nhận tài khoản đang ở trạng thái `ACTIVE`.
  5. Hệ thống sinh Access Token (JWT) có thời hạn 60 phút và thiết lập HttpOnly Cookie an toàn (`SEC-004`).
  6. Hệ thống điều hướng người dùng vào giao diện Chat chính (`/`).
- **Luồng Ngoại Lệ (Exception Flow)**:
  - *EF-01*: Sai email hoặc mật khẩu -> Trả về `HTTP 401 Unauthorized`: "Email hoặc mật khẩu không chính xác." (Không tiết lộ email có tồn tại hay không).
  - *EF-02*: Tài khoản bị khóa -> Trả về `HTTP 403 Forbidden`: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên."
- **Điều Kiện Sau (Postconditions)**: Phiên làm việc được thiết lập; mọi request tiếp theo mang theo thông tin định danh hợp lệ.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-001`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `AC-001-B`.

---

### FR-003: Đăng Xuất Hệ Thống (User Logout)
- **Mã Yêu Cầu**: `FR-003`
- **Tên Yêu Cầu**: Đăng Xuất Hệ Thống (User Logout).
- **Mô Tả**: Thu hồi phiên làm việc và xóa bỏ mã thông báo xác thực tại trình duyệt.
- **Tác Nhân (Actor)**: `ACT-02` (Registered User).
- **Điều Kiện Tiên Quyết (Preconditions)**: Người dùng đang trong trạng thái đăng nhập.
- **Luồng Chính (Main Flow)**:
  1. Người dùng nhấn nút "Đăng xuất" trên menu tài khoản.
  2. Client gửi yêu cầu `POST /api/v1/auth/logout`.
  3. Hệ thống xóa Cookie phiên làm việc, xóa cache token tại Redis nếu có.
  4. Client xóa bỏ trạng thái người dùng trong bộ nhớ và điều hướng về trang `/login`.
- **Điều Kiện Sau (Postconditions)**: Người dùng quay về trạng thái Guest, không thể truy cập các API yêu cầu đăng nhập.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-002`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `AC-001-C`.

---

## 2. Phân Hệ Quản Lý Phiên Hội Thoại (Conversation Lifecycle)

---

### FR-004: Khởi Tạo Cuộc Trò Chuyện Mới (Create Conversation)
- **Mã Yêu Cầu**: `FR-004`
- **Tên Yêu Cầu**: Khởi Tạo Cuộc Trò Chuyện Mới (Create Conversation).
- **Mô Tả**: Cho phép người dùng tạo một luồng trao đổi mới với AI Assistant.
- **Tác Nhân (Actor)**: `ACT-02` (Registered User).
- **Điều Kiện Tiên Quyết (Preconditions)**: Người dùng đã đăng nhập hợp lệ (`BR-001`).
- **Luồng Chính (Main Flow)**:
  1. Người dùng nhấn nút "Cuộc trò chuyện mới" (New Chat) trên Sidebar.
  2. Client gọi API `POST /api/v1/conversations`.
  3. Hệ thống tạo một bản ghi mới trong bảng `conversations` với `user_id` của tài khoản hiện tại, tiêu đề mặc định là "Cuộc trò chuyện mới".
  4. Hệ thống trả về `conversation_id` mới.
  5. Giao diện người dùng chuyển trọng tâm vào khung chat của cuộc trò chuyện mới.
- **Điều Kiện Sau (Postconditions)**: Một phiên hội thoại mới được khởi tạo và sẵn sàng nhận tin nhắn.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-002`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `AC-002-A`.

---

### FR-005: Xem Danh Sách Lịch Sử Hội Thoại (List Conversation History)
- **Mã Yêu Cầu**: `FR-005`
- **Tên Yêu Cầu**: Xem Danh Sách Lịch Sử Hội Thoại (List Conversation History).
- **Mô Tả**: Lấy và hiển thị toàn bộ danh sách các cuộc trò chuyện trước đây của người dùng trên Sidebar.
- **Tác Nhân (Actor)**: `ACT-02` (Registered User).
- **Điều Kiện Tiên Quyết (Preconditions)**: Người dùng đã đăng nhập.
- **Luồng Chính (Main Flow)**:
  1. Khi mở trang web hoặc sau khi đăng nhập, Client gửi yêu cầu `GET /api/v1/conversations`.
  2. Hệ thống truy vấn các cuộc trò chuyện có `user_id = current_user.id` và `is_deleted = FALSE`.
  3. Hệ thống sắp xếp danh sách theo thời gian cập nhật gần nhất (`updated_at DESC`).
  4. Hệ thống trả về danh sách các conversation (bao gồm `id`, `title`, `updated_at`).
  5. Giao diện Sidebar hiển thị danh sách cuộc trò chuyện.
- **Luồng Ngoại Lệ (Exception Flow)**:
  - Nếu người dùng chưa có cuộc trò chuyện nào -> Hiển thị danh sách trống cùng nút gợi ý bắt đầu chat mới.
- **Điều Kiện Sau (Postconditions)**: Danh sách cuộc trò chuyện hiển thị đầy đủ trên Sidebar.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-004`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `AC-002-B`.

---

### FR-006: Đổi Tên Cuộc Trò Chuyện (Rename Conversation)
- **Mã Yêu Cầu**: `FR-006`
- **Tên Yêu Cầu**: Đổi Tên Cuộc Trò Chuyện (Rename Conversation).
- **Mô Tả**: Cập nhật tiêu đề cuộc trò chuyện bằng thao tác thủ công của người dùng hoặc tự động trích xuất từ câu hỏi đầu tiên.
- **Tác Nhân (Actor)**: `ACT-02` (Registered User), Hệ thống tự động.
- **Điều Kiện Tiên Quyết (Preconditions)**: Cuộc trò chuyện tồn tại và thuộc sở hữu của người dùng hiện tại (`BR-002`).
- **Luồng Chính (Main Flow - Thủ công)**:
  1. Người dùng nhấn nút biểu tượng "Sửa tên" bên cạnh cuộc trò chuyện trên Sidebar.
  2. Người dùng nhập tên mới (độ dài từ 1 đến 100 ký tự) và bấm Lưu.
  3. Client gọi API `PATCH /api/v1/conversations/{id}` kèm payload `{"title": "Tên mới"}`.
  4. Hệ thống cập nhật trường `title` và `updated_at` trong cơ sở dữ liệu.
  5. Giao diện Sidebar cập nhật tiêu đề mới tức thì.
- **Luồng Phụ (Alternative Flow - Tự động)**:
  - Khi người dùng gửi tin nhắn đầu tiên vào cuộc trò chuyện có tiêu đề là "Cuộc trò chuyện mới", hệ thống tự động trích xuất 30 ký tự đầu của tin nhắn đó làm tiêu đề hiển thị (`BR-004`).
- **Luồng Ngoại Lệ (Exception Flow)**:
  - Tên nhập vào rỗng hoặc vượt quá 100 ký tự -> Báo lỗi kiểm tra hợp lệ tại giao diện.
- **Điều Kiện Sau (Postconditions)**: Tiêu đề cuộc trò chuyện được cập nhật vĩnh viễn.
- **Độ Ưu Tiên**: `SHOULD`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-004`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `AC-002-C`.

---

### FR-007: Xóa Cuộc Trò Chuyện (Delete Conversation)
- **Mã Yêu Cầu**: `FR-007`
- **Tên Yêu Cầu**: Xóa Cuộc Trò Chuyện (Delete Conversation).
- **Mô Tả**: Cho phép người dùng xóa một cuộc trò chuyện và toàn bộ tin nhắn liên quan.
- **Tác Nhân (Actor)**: `ACT-02` (Registered User).
- **Điều Kiện Tiên Quyết (Preconditions)**: Cuộc trò chuyện tồn tại và thuộc quyền sở hữu của người dùng (`BR-002`).
- **Luồng Chính (Main Flow)**:
  1. Người dùng nhấn biểu tượng "Xóa" bên cạnh cuộc trò chuyện.
  2. Giao diện hiển thị hộp thoại xác nhận: "Bạn có chắc chắn muốn xóa cuộc trò chuyện này? Toàn bộ tin nhắn sẽ bị xóa vĩnh viễn."
  3. Người dùng chọn "Xác nhận xóa".
  4. Client gọi API `DELETE /api/v1/conversations/{id}`.
  5. Hệ thống đánh dấu xóa mềm (`is_deleted = TRUE`) hoặc xóa bản ghi cuộc trò chuyện và các tin nhắn con.
  6. Giao diện loại bỏ cuộc trò chuyện khỏi Sidebar; nếu đang mở phiên đó, tự động chuyển về màn hình New Chat.
- **Điều Kiện Sau (Postconditions)**: Cuộc trò chuyện không còn hiển thị và không thể truy cập lại (`NFR-018`).
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-004`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `AC-002-D`.

---

### FR-012: Cách Ly Quyền Sở Hữu & Phòng Thủ IDOR (Conversation Data Isolation)
- **Mã Yêu Cầu**: `FR-012`
- **Tên Yêu Cầu**: Cách Ly Quyền Sở Hữu & Phòng Thủ IDOR (Conversation Data Isolation).
- **Mô Tả**: Hệ thống bắt buộc phải kiểm tra quyền sở hữu đối với mọi thao tác đọc, sửa, xóa cuộc trò chuyện hoặc xem tin nhắn; nghiêm cấm truy cập chéo tài khoản.
- **Tác Nhân (Actor)**: Hệ thống Backend, `ACT-02` (Registered User).
- **Điều Kiện Tiên Quyết (Preconditions)**: Người dùng gửi yêu cầu có chứa `conversation_id`.
- **Luồng Chính (Main Flow)**:
  1. Khi nhận request tương tác với một `conversation_id`, Backend truy vấn kiểm tra bản ghi tương ứng.
  2. Backend đối chiếu `conversation.user_id == current_user.id`.
  3. Nếu trùng khớp -> Cho phép thực thi tiếp logic nghiệp vụ.
- **Luồng Ngoại Lệ (Exception Flow)**:
  - Nếu `user_id` không khớp -> Hệ thống lập tức từ chối và trả về mã lỗi `HTTP 403 Forbidden`: "Bạn không có quyền truy cập cuộc trò chuyện này." (`BR-002`). Ghi log cảnh báo an ninh.
- **Điều Kiện Sau (Postconditions)**: Dữ liệu người dùng được cách ly tuyệt đối.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-004`, `FR-002`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `AC-002-E`.

---

## 3. Phân Hệ Tương Tác Chat & Điều Phối Trí Tuệ Nhân Tạo (Chat & AI Orchestration)

---

### FR-008: Gửi Tin Nhắn & Kiểm Tra Đầu Vào (Send Message & Input Validation)
- **Mã Yêu Cầu**: `FR-008`
- **Tên Yêu Cầu**: Gửi Tin Nhắn & Kiểm Tra Đầu Vào (Send Message & Input Validation).
- **Mô Tả**: Tiếp nhận nội dung đàm thoại của người dùng, kiểm tra hợp lệ và lưu trữ vào cơ sở dữ liệu.
- **Tác Nhân (Actor)**: `ACT-02` (Registered User).
- **Điều Kiện Tiên Quyết (Preconditions)**: Đang ở trong một cuộc trò chuyện hợp lệ thuộc quyền sở hữu; nội dung không rỗng.
- **Luồng Chính (Main Flow)**:
  1. Người dùng nhập câu hỏi vào ô văn bản và nhấn phím Enter (hoặc bấm biểu tượng Gửi).
  2. Client kiểm tra độ dài chuỗi (không rỗng, <= 4,000 ký tự theo `BR-003`).
  3. Client hiển thị tin nhắn ngay trên màn hình chat với chỉ báo trạng thái đang gửi.
  4. Client gọi API gửi tin nhắn tới Backend kèm `conversation_id`.
  5. Backend lưu bản ghi tin nhắn vào bảng `messages` với `role: 'user'`.
  6. Backend cập nhật `updated_at` của conversation.
- **Luồng Ngoại Lệ (Exception Flow)**:
  - Tin nhắn vượt quá 4,000 ký tự -> Bị chặn ngay tại Client và Backend trả về `HTTP 422 Unprocessable Entity`: "Nội dung tin nhắn không được vượt quá 4,000 ký tự."
- **Điều Kiện Sau (Postconditions)**: Tin nhắn người dùng được lưu vết an toàn trong cơ sở dữ liệu.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-004`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `AC-003-A`.

---

### FR-009: Nhận Phản Hồi Từ AI & Kết Xuất Markdown (Receive AI Response & Rendering)
- **Mã Yêu Cầu**: `FR-009`
- **Tên Yêu Cầu**: Nhận Phản Hồi Từ AI & Kết Xuất Markdown (Receive AI Response & Rendering).
- **Mô Tả**: Gọi mô hình ngôn ngữ lớn để sinh câu trả lời, lưu trữ câu trả lời vào cơ sở dữ liệu và hiển thị định dạng văn bản phong phú trên giao diện.
- **Tác Nhân (Actor)**: `ACT-02` (Registered User), `ACT-03` (External AI Provider).
- **Điều Kiện Tiên Quyết (Preconditions)**: Tin nhắn người dùng đã được tiếp nhận thành công.
- **Luồng Chính (Main Flow)**:
  1. Backend tập hợp ngữ cảnh tin nhắn của phiên chat và gọi `LLMManager`.
  2. Mô hình AI phân tích và sinh câu trả lời văn bản hoàn chỉnh.
  3. Backend lưu câu trả lời vào bảng `messages` với `role: 'assistant'`.
  4. Backend trả kết quả về cho Client.
  5. Client kết xuất câu trả lời sử dụng bộ render Markdown an toàn, hỗ trợ in đậm, danh sách, bảng biểu và khối code có nút copy.
- **Điều Kiện Sau (Postconditions)**: Cuộc trò chuyện có thêm một lượt phản hồi hoàn chỉnh từ trợ lý ảo.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-008`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `AC-003-B`.

---

### FR-010: Tùy Chọn Mô Hình AI (Select AI Model/Provider)
- **Mã Yêu Cầu**: `FR-010`
- **Tên Yêu Cầu**: Tùy Chọn Mô Hình AI (Select AI Model/Provider).
- **Mô Tả**: Cho phép người dùng chuyển đổi mô hình AI mong muốn (ví dụ: Gemini 1.5 Flash, Gemini 1.5 Pro, GPT-4o-mini) cho cuộc trò chuyện.
- **Tác Nhân (Actor)**: `ACT-02` (Registered User).
- **Điều Kiện Tiên Quyết (Preconditions)**: Các mô hình đã được cấu hình khả dụng trong hệ thống.
- **Luồng Chính (Main Flow)**:
  1. Người dùng bấm vào menu chọn Model trên thanh công cụ chat.
  2. Hệ thống hiển thị danh sách các model đang hoạt động.
  3. Người dùng chọn một model mong muốn.
  4. Các yêu cầu đàm thoại tiếp theo sẽ truyền kèm tham số `model` và `provider` đã chọn.
- **Điều Kiện Sau (Postconditions)**: Yêu cầu AI được điều phối tới đúng model người dùng chỉ định.
- **Độ Ưu Tiên**: `SHOULD`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-008`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `AC-003-C`.

---

### FR-011: Tự Động Chuyển Vùng Dự Phòng Nhà Cung Cấp (Multi-Provider Failover)
- **Mã Yêu Cầu**: `FR-011`
- **Tên Yêu Cầu**: Tự Động Chuyển Vùng Dự Phòng Nhà Cung Cấp (Multi-Provider Failover).
- **Mô Tả**: Khi nhà cung cấp AI chính (Gemini) gặp sự cố (quá tải mã 429, lỗi 5xx, timeout > 30s), hệ thống tự động chuyển sang gọi nhà cung cấp phụ (OpenAI / Anthropic) thông qua đồ thị trạng thái LangGraph (`ADR-005`) mà không làm gián đoạn người dùng.
- **Tác Nhân (Actor)**: LangGraph Agent Orchestrator (`ai-backend/llm`), `ACT-03` (External AI Providers tải động từ `.env`).
- **Điều Kiện Tiên Quyết (Preconditions)**: Các nhà cung cấp liên quan có cấu hình API Key hợp lệ trong file `.env`.
- **Luồng Chính (Main Flow)**:
  1. LangGraph StateGraph khởi tạo luồng, chuẩn bị ngữ cảnh trượt 20 tin nhắn (`INV-04`) và tải adapter tương ứng từ key `.env`.
  2. Nút `PrimaryModelNode` gửi prompt tới Google Gemini API qua LangChain adapter.
  3. Nếu Gemini API trả về mã lỗi 429 (Quota Exceeded), lỗi 5xx hoặc timeout sau 30 giây:
  4. LangGraph kích hoạt cạnh điều kiện (Conditional Edge), ghi log cảnh báo mức `WARNING` kèm mã lỗi.
  5. Luồng chuyển trạng thái sang nút `FallbackModelNode` (OpenAI API / Anthropic) với cùng prompt và ngữ cảnh.
  6. Mô hình Fallback xử lý thành công và tiếp tục stream token về client.
  7. Backend lưu kết quả và hoàn tất phiên đàm thoại.
- **Luồng Ngoại Lệ (Exception Flow)**:
  - Tất cả các nhà cung cấp khả dụng trong `.env` đều thất bại -> Trả về mã lỗi `HTTP 503 Service Unavailable`: "Dịch vụ AI hiện đang tạm thời quá tải. Vui lòng thử lại sau ít phút."
- **Điều Kiện Sau (Postconditions)**: Người dùng vẫn nhận được câu trả lời liên tục; hệ thống ghi vết sự kiện failover.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-009`, `ADR-003`, `ADR-005`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `AC-004-A`.

---

### FR-013: Truyền Phản Hồi Dạng Luồng Dữ Liệu (Streaming Response Delivery)
- **Mã Yêu Cầu**: `FR-013`
- **Tên Yêu Cầu**: Truyền Phản Hồi Dạng Luồng Dữ Liệu (Streaming Response Delivery).
- **Mô Tả**: Cung cấp giao thức truyền dữ liệu chunk-by-chunk qua Server-Sent Events (SSE) để giảm độ trễ hiển thị trực quan (TTFT) xuống dưới 2.0 giây.
- **Tác Nhân (Actor)**: `ACT-02` (Registered User), Hệ thống Backend.
- **Điều Kiện Tiên Quyết (Preconditions)**: Client gửi request chat có yêu cầu stream (`Accept: text/event-stream`).
- **Luồng Chính (Main Flow)**:
  1. Backend mở kết nối HTTP Streaming Response với Client.
  2. Ngay khi nhận được token/từ đầu tiên từ AI Provider, Backend gửi ngay chunk văn bản về Client.
  3. Client đọc ReadableStream và cập nhật trực tiếp lên giao diện với hiệu ứng gõ phím.
  4. Khi AI sinh xong toàn bộ câu trả lời, Backend gửi sự kiện hoàn thành `[DONE]` và đóng stream.
  5. Backend lưu toàn văn câu trả lời hoàn chỉnh vào bảng `messages`.
- **Điều Kiện Sau (Postconditions)**: Người dùng thấy chữ xuất hiện tức thì trong vòng 2.0 giây (`NFR-002`).
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-009`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `AC-003-D`.

---

### FR-014: Đo Lường & Quản Lý Số Lượng Token (Message Token Accounting)
- **Mã Yêu Cầu**: `FR-014`
- **Tên Yêu Cầu**: Đo Lường & Quản Lý Số Lượng Token (Message Token Accounting).
- **Mô Tả**: Ghi nhận số lượng token tiêu thụ (prompt tokens, completion tokens, total tokens) của từng lượt sinh câu trả lời để kiểm soát chi phí.
- **Tác Nhân (Actor)**: Hệ thống Backend.
- **Điều Kiện Tiên Quyết (Preconditions)**: Lượt gọi AI hoàn thành thành công.
- **Luồng Chính (Main Flow)**:
  1. Backend trích xuất thông tin `usage_metadata` từ phản hồi của nhà cung cấp AI.
  2. Backend lưu số lượng `tokens_used` vào bản ghi của `messages`.
  3. Ghi nhận nhật ký vận hành để theo dõi ngân sách tiêu thụ.
- **Điều Kiện Sau (Postconditions)**: Minh bạch hóa mức độ tiêu thụ token của từng phiên trò chuyện.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-009`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `AC-003-E`.

---

## 5. Phân Hệ Quản Lý Tài Khoản & Hồ Sơ Cá Nhân (User Account & Profile Management)

---

### FR-015: Xem Thông Tin Hồ Sơ Cá Nhân & Thống Kê (View User Profile & Stats)
- **Mã Yêu Cầu**: `FR-015`
- **Tên Yêu Cầu**: Xem Thông Tin Hồ Sơ Cá Nhân & Thống Kê (View User Profile & Stats).
- **Mô Tả**: Cung cấp khả năng hiển thị chi tiết thông tin hồ sơ của người dùng hiện hành (họ tên, username, email, ảnh đại diện, tiểu sử, số điện thoại, ngày tham gia, ngày đăng nhập gần nhất) cùng số liệu thống kê sử dụng (tổng số hội thoại, tổng số tin nhắn).
- **Tác Nhân (Actor)**: `ACT-02` (Registered User).
- **Điều Kiện Tiên Quyết (Preconditions)**: Người dùng đã đăng nhập với JWT token hợp lệ.
- **Luồng Chính (Main Flow)**:
  1. Người dùng truy cập trang Cài đặt / Hồ sơ cá nhân (`/settings` hoặc `/profile`).
  2. Client gửi request `GET /api/v1/users/me`.
  3. Backend xác thực token người dùng, truy vấn thông tin chi tiết từ bảng `users` cùng số liệu thống kê tổng hợp từ bảng `conversations` và `messages`.
  4. Backend trả về thông tin hồ sơ (không bao gồm `hashed_password`).
  5. Client hiển thị dữ liệu trực quan lên giao diện người dùng.
- **Luồng Ngoại Lệ (Exception Flow)**:
  - *EF-01*: Token không hợp lệ hoặc hết hạn -> Trả về `HTTP 401 Unauthorized`, điều hướng về `/login`.
- **Điều Kiện Sau (Postconditions)**: Người dùng nắm bắt được thông tin cá nhân và mức độ tương tác của mình.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-002`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `AC-007-A`.

---

### FR-016: Cập Nhật Thông Tin Hồ Sơ Định Danh (Update Profile Information)
- **Mã Yêu Cầu**: `FR-016`
- **Tên Yêu Cầu**: Cập Nhật Thông Tin Hồ Sơ Định Danh (Update Profile Information).
- **Mô Tả**: Cho phép người dùng cập nhật Họ và tên (`full_name`), Tên đăng nhập (`username`), Tiểu sử (`bio`), và Số điện thoại (`phone_number`).
- **Tác Nhân (Actor)**: `ACT-02` (Registered User).
- **Điều Kiện Tiên Quyết (Preconditions)**: Người dùng đã đăng nhập hợp lệ.
- **Luồng Chính (Main Flow)**:
  1. Người dùng nhập thông tin cần cập nhật trên Form Hồ sơ cá nhân.
  2. Client gửi request `PATCH /api/v1/users/me/profile` kèm payload JSON.
  3. Backend kiểm tra tính hợp lệ dữ liệu (độ dài `full_name` <= 255, định dạng `username` theo `BR-007`, độ dài `bio` <= 500 ký tự, `phone_number` đúng định dạng).
  4. Nếu người dùng đổi `username`, kiểm tra tính duy nhất trong bảng `users`.
  5. Backend thực hiện cập nhật bản ghi trong bảng `users` và cập nhật trường `updated_at`.
  6. Backend trả về thông tin hồ sơ đã cập nhật kèm mã `HTTP 200 OK`.
- **Luồng Ngoại Lệ (Exception Flow)**:
  - *EF-01*: `username` đã được người dùng khác đăng ký -> Trả về `HTTP 409 Conflict`: "Tên đăng nhập này đã được sử dụng."
  - *EF-02*: Dữ liệu không hợp lệ -> Trả về `HTTP 422 Unprocessable Entity`.
- **Điều Kiện Sau (Postconditions)**: Thông tin hồ sơ mới được cập nhật ngay lập tức.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-015`, `BR-007`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `AC-007-B`.

---

### FR-017: Cập Nhật Ảnh Đại Diện Người Dùng (Update User Avatar)
- **Mã Yêu Cầu**: `FR-017`
- **Tên Yêu Cầu**: Cập Nhật Ảnh Đại Diện Người Dùng (Update User Avatar).
- **Mô Tả**: Cho phép người dùng cập nhật ảnh đại diện cá nhân bằng URL hợp lệ hoặc upload hình ảnh trực tiếp.
- **Tác Nhân (Actor)**: `ACT-02` (Registered User).
- **Điều Kiện Tiên Quyết (Preconditions)**: Người dùng đã đăng nhập hợp lệ.
- **Luồng Chính (Main Flow)**:
  1. Người dùng chọn cập nhật ảnh đại diện (nhập URL ảnh hoặc tải file ảnh).
  2. Client kiểm tra kích thước file ảnh (tối đa 2MB, định dạng png/jpg/webp) theo `BR-011`.
  3. Client gửi request `PATCH /api/v1/users/me/avatar`.
  4. Backend xác thực và cập nhật trường `avatar_url` trong bảng `users`.
  5. Backend trả về thông tin URL ảnh mới kèm mã `HTTP 200 OK`.
  6. Client cập nhật hiển thị avatar ngay lập tức trên thanh Sidebar và Header.
- **Luồng Ngoại Lệ (Exception Flow)**:
  - *EF-01*: Định dạng URL hoặc file ảnh không hợp lệ -> Trả về `HTTP 422 Unprocessable Entity`.
- **Điều Kiện Sau (Postconditions)**: Avatar mới được lưu trữ và hiển thị đồng bộ toàn hệ thống.
- **Độ Ưu Tiên**: `SHOULD`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-015`, `BR-011`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `AC-007-C`.

---

### FR-018: Thay Đổi Địa Chỉ Email An Toàn (Secure Email Change)
- **Mã Yêu Cầu**: `FR-018`
- **Tên Yêu Cầu**: Thay Đổi Địa Chỉ Email An Toàn (Secure Email Change).
- **Mô Tả**: Cho phép người dùng đổi địa chỉ email đăng nhập, với yêu cầu bắt buộc phải xác nhận mật khẩu hiện tại (`BR-008`) và kiểm tra email mới chưa từng tồn tại (`BR-010`).
- **Tác Nhân (Actor)**: `ACT-02` (Registered User).
- **Điều Kiện Tiên Quyết (Preconditions)**: Người dùng đã đăng nhập hợp lệ.
- **Luồng Chính (Main Flow)**:
  1. Người dùng mở tab Bảo mật, nhập Email mới và Mật khẩu hiện tại.
  2. Client gửi request `POST /api/v1/users/me/change-email`.
  3. Backend kiểm tra định dạng email mới hợp lệ và khác email hiện tại.
  4. Backend kiểm tra mật khẩu hiện tại khớp với hash trong CSDL (`SEC-006`).
  5. Backend kiểm tra email mới chưa có trong CSDL (Unique check).
  6. Backend cập nhật trường `email` mới trong bảng `users`.
  7. Backend ghi nhận log kiểm toán an ninh và trả về `HTTP 200 OK`.
- **Luồng Ngoại Lệ (Exception Flow)**:
  - *EF-01*: Mật khẩu hiện tại sai -> Trả về `HTTP 401 Unauthorized`: "Mật khẩu hiện tại không chính xác."
  - *EF-02*: Email mới đã tồn tại -> Trả về `HTTP 409 Conflict`: "Email này đã được sử dụng bởi tài khoản khác."
  - *EF-03*: Email mới trùng với email hiện tại -> Trả về `HTTP 422 Unprocessable Entity`.
- **Điều Kiện Sau (Postconditions)**: Email mới được lưu; người dùng sử dụng email mới cho các lần đăng nhập tiếp theo.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-002`, `BR-008`, `BR-010`, `SEC-006`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `AC-007-D`.

---

### FR-019: Thay Đổi Mật Khẩu Người Dùng (Secure Password Change)
- **Mã Yêu Cầu**: `FR-019`
- **Tên Yêu Cầu**: Thay Đổi Mật Khẩu Người Dùng (Secure Password Change).
- **Mô Tả**: Cung cấp tính năng đổi mật khẩu an toàn: kiểm tra mật khẩu cũ, kiểm tra mật khẩu mới đáp ứng tiêu chuẩn an toàn phức tạp, băm bcrypt, cập nhật trường `password_changed_at` và thu hồi các phiên đăng nhập cũ (`BR-009`, `SEC-007`).
- **Tác Nhân (Actor)**: `ACT-02` (Registered User).
- **Điều Kiện Tiên Quyết (Preconditions)**: Người dùng đã đăng nhập hợp lệ.
- **Luồng Chính (Main Flow)**:
  1. Người dùng vào tab Bảo mật, nhập Mật khẩu hiện tại, Mật khẩu mới và Xác nhận mật khẩu mới.
  2. Client kiểm tra sơ bộ mật khẩu mới đáp ứng >= 8 ký tự, có chữ hoa, số và ký tự đặc biệt.
  3. Client gửi request `POST /api/v1/users/me/change-password`.
  4. Backend kiểm tra mật khẩu hiện tại khớp với hash trong bảng `users`.
  5. Backend kiểm tra mật khẩu mới không được trùng với mật khẩu cũ.
  6. Backend băm mật khẩu mới bằng Bcrypt kèm muối ngẫu nhiên.
  7. Backend cập nhật `hashed_password` và cập nhật `password_changed_at = CURRENT_TIMESTAMP`.
  8. Backend cấp mới JWT Token và ghi đè cookie `access_token` để duy trì phiên hiện tại.
  9. Backend trả về `HTTP 200 OK`: "Đổi mật khẩu thành công."
- **Luồng Ngoại Lệ (Exception Flow)**:
  - *EF-01*: Mật khẩu hiện tại không chính xác -> Trả về `HTTP 401 Unauthorized`.
  - *EF-02*: Mật khẩu mới trùng mật khẩu cũ -> Trả về `HTTP 422 Unprocessable Entity`: "Mật khẩu mới không được trùng với mật khẩu hiện tại."
  - *EF-03*: Mật khẩu mới không đáp ứng độ phức tạp -> Trả về `HTTP 422 Unprocessable Entity`.
- **Điều Kiện Sau (Postconditions)**: Mật khẩu mới có hiệu lực ngay lập tức; các phiên token cũ bị vô hiệu.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-002`, `BR-008`, `BR-009`, `SEC-006`, `SEC-007`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `AC-007-E`.

---

### FR-020: Tùy Chỉnh Cài Đặt Cá Nhân (Update User Preferences)
- **Mã Yêu Cầu**: `FR-020`
- **Tên Yêu Cầu**: Tùy Chỉnh Cài Đặt Cá Nhân (Update User Preferences).
- **Mô Tả**: Cho phép người dùng tùy chọn chủ đề giao diện (`theme_preference`: DARK / LIGHT / SYSTEM) và ngôn ngữ hiển thị (`language_preference`: vi / en).
- **Tác Nhân (Actor)**: `ACT-02` (Registered User).
- **Điều Kiện Tiên Quyết (Preconditions)**: Người dùng đã đăng nhập hợp lệ.
- **Luồng Chính (Main Flow)**:
  1. Người dùng vào tab Cài đặt tùy chọn, lựa chọn Theme và Ngôn ngữ mong muốn.
  2. Client gửi request `PATCH /api/v1/users/me/preferences`.
  3. Backend xác thực và cập nhật các trường `theme_preference` và `language_preference` trong bảng `users`.
  4. Backend trả về `HTTP 200 OK`.
  5. Client lưu cấu hình và áp dụng giao diện/ngôn ngữ tương ứng ngay lập tức.
- **Luồng Ngoại Lệ (Exception Flow)**:
  - *EF-01*: Giá trị tùy chọn không nằm trong whitelist -> Trả về `HTTP 422 Unprocessable Entity`.
- **Điều Kiện Sau (Postconditions)**: Cấu hình cá nhân được lưu trên máy chủ và đồng bộ giữa các thiết bị đăng nhập.
- **Độ Ưu Tiên**: `SHOULD`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-015`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `AC-007-F`.

---

## 6. Phân Hệ Quản Lý Agent & Mô Hình Đa Nhà Cung Cấp (Multi-Provider Agent & Model Management)

---

### FR-021: Tra Cứu Danh Mục Agent Model Đa Nhà Cung Cấp (Multi-Provider Agent Model Catalog)
- **Mã Yêu Cầu**: `FR-021`
- **Tên Yêu Cầu**: Tra Cứu Danh Mục Agent Model Đa Nhà Cung Cấp (Multi-Provider Agent Model Catalog).
- **Mô Tả**: Cung cấp khả năng hiển thị toàn bộ danh sách các mô hình Agent được tích hợp trong hệ thống từ nhiều nhà cung cấp khác nhau (Google Gemini, Anthropic Claude, OpenAI, Groq, Ollama), kèm thông tin nhà cung cấp, trạng thái kích hoạt (`ACTIVE`, `INACTIVE`, `DEGRADED`), cờ mặc định (`is_default`) và nguồn cấu hình key từ `.env`.
- **Tác Nhân (Actor)**: `ACT-02` (Registered User), Quản trị viên hệ thống.
- **Điều Kiện Tiên Quyết (Preconditions)**: Người dùng đã đăng nhập vào hệ thống.
- **Luồng Chính (Main Flow)**:
  1. Người dùng mở trang Quản lý Model/Agent (`/models` hoặc tab Cài đặt Model).
  2. Client gửi request `GET /api/v1/models`.
  3. Backend truy vấn danh mục các mô hình được nạp từ cấu hình hệ thống và cơ sở dữ liệu.
  4. Backend bổ sung thông tin trạng thái khóa API khả dụng từ `.env` (`has_api_key: true/false`).
  5. Backend trả về danh sách kèm mã `HTTP 200 OK`.
  6. Client kết xuất giao diện thẻ (Model Cards) phân loại theo từng nhà cung cấp trực quan.
- **Điều Kiện Sau (Postconditions)**: Người dùng nắm bắt được toàn cảnh các mô hình Agent có thể sử dụng.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-002`, `ADR-005`, `ADR-006`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `AC-008-A`.

---

### FR-022: Xem Chi Tiết Cấu Hình & Chỉ Số Năng Lực Model (View Agent Model Details & Capability Specs)
- **Mã Yêu Cầu**: `FR-022`
- **Tên Yêu Cầu**: Xem Chi Tiết Cấu Hình & Chỉ Số Năng Lực Model (View Agent Model Details & Capability Specs).
- **Mô Tả**: Cho phép xem thông tin chuyên sâu của một mô hình cụ thể: kích thước cửa sổ ngữ cảnh (Context Window, ví dụ 1M token), giới hạn token đầu ra (`max_tokens`), khả năng hỗ trợ truyền luồng (`supports_streaming`), độ trễ kiểm tra gần nhất (`latency_ms`) và thời điểm đo lường (`last_checked_at`).
- **Tác Nhân (Actor)**: `ACT-02` (Registered User).
- **Điều Kiện Tiên Quyết (Preconditions)**: Mô hình tồn tại trong hệ thống.
- **Luồng Chính (Main Flow)**:
  1. Người dùng bấm xem chi tiết một model cụ thể trên giao diện.
  2. Client gửi request `GET /api/v1/models/{model_id}`.
  3. Backend kiểm tra mã `model_id` hợp lệ và trả về đầy đủ thuộc tính kỹ thuật.
  4. Giao diện hiển thị modal chi tiết các thông số kỹ thuật và khuyến nghị ngữ cảnh sử dụng.
- **Luồng Ngoại Lệ (Exception Flow)**:
  - *EF-01*: Model ID không tồn tại -> Trả về `HTTP 404 Not Found`.
- **Điều Kiện Sau (Postconditions)**: Người dùng hiểu rõ năng lực kỹ thuật của mô hình để chọn lựa tối ưu.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-021`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `AC-008-B`.

---

### FR-023: Kiểm Tra Kết Nối & Đo Độ Trễ Model (Ping / Health Check Agent Model)
- **Mã Yêu Cầu**: `FR-023`
- **Tên Yêu Cầu**: Kiểm Tra Kết Nối & Đo Độ Trễ Model (Ping / Health Check Agent Model).
- **Mô Tả**: Cho phép người dùng hoặc quản trị viên gửi yêu cầu kiểm tra thử nghiệm (Ping) trực tiếp tới API của nhà cung cấp sử dụng API Key hiện hành trong `.env`, xác thực tính hợp lệ của khóa và đo lường thời gian phản hồi thực tế (Round-Trip Latency).
- **Tác Nhân (Actor)**: `ACT-02` (Registered User), Hệ thống tự động.
- **Điều Kiện Tiên Quyết (Preconditions)**: Nhà cung cấp tương ứng có cấu hình khóa trong `.env`.
- **Luồng Chính (Main Flow)**:
  1. Người dùng nhấn nút "Kiểm tra kết nối" (Ping/Test) tại thẻ của mô hình.
  2. Client gửi request `POST /api/v1/models/{model_id}/test`.
  3. Backend tải LangChain adapter tương ứng với `model_id` và khóa API từ `.env`.
  4. Backend gửi prompt thử nghiệm tối giản (`ping` với `max_tokens=5`) và bấm giờ thực thi.
  5. Nhà cung cấp phản hồi thành công; Backend tính toán `latency_ms` và cập nhật `last_checked_at`.
  6. Backend trả về `HTTP 200 OK` kèm kết quả kiểm tra: `{"healthy": true, "latency_ms": 320, "message": "Kết nối thành công"}`.
  7. Client cập nhật huy hiệu trạng thái (Xanh lá) và hiển thị độ trễ.
- **Luồng Ngoại Lệ (Exception Flow)**:
  - *EF-01*: Chưa cấu hình API Key trong `.env` -> Trả về `HTTP 400 Bad Request`: "Chưa cấu hình API Key cho nhà cung cấp này trong file .env."
  - *EF-02*: API Key sai, bị thu hồi hoặc lỗi mạng -> Trả về `HTTP 502 Bad Gateway` kèm chi tiết lỗi từ nhà cung cấp.
- **Điều Kiện Sau (Postconditions)**: Trạng thái sức khỏe kết nối và độ trễ được ghi nhận chính xác.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-021`, `ADR-005`, `ADR-006`, `BR-014`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `AC-008-C`.

---

### FR-024: Kích Hoạt Mô Hình Agent (Activate Agent Model)
- **Mã Yêu Cầu**: `FR-024`
- **Tên Yêu Cầu**: Kích Hoạt Mô Hình Agent (Activate Agent Model).
- **Mô Tả**: Cho phép kích hoạt trạng thái của một mô hình Agent từ `INACTIVE` sang `ACTIVE`. Sau khi kích hoạt, mô hình sẽ xuất hiện trong danh sách lựa chọn của người dùng khi tạo hội thoại và tham gia vào chuỗi điều phối LangGraph (`ADR-005`).
- **Tác Nhân (Actor)**: `ACT-02` (Registered User), Quản trị viên.
- **Điều Kiện Tiên Quyết (Preconditions)**: Khóa API của nhà cung cấp đã được cấu hình trong `.env` và vượt qua kiểm tra hợp lệ (`BR-014`).
- **Luồng Chính (Main Flow)**:
  1. Người dùng bật công tắc "Kích hoạt" (Activate) trên thẻ mô hình đang ở trạng thái `INACTIVE`.
  2. Client gửi request `PATCH /api/v1/models/{model_id}/activate`.
  3. Backend xác thực khóa API tương ứng trong `.env` đang tồn tại và hoạt động (`BR-014`).
  4. Backend cập nhật trạng thái của model thành `ACTIVE` và ghi log kiểm toán.
  5. Backend trả về `HTTP 200 OK` kèm thông tin model sau kích hoạt.
  6. Client cập nhật nhãn trạng thái thành `ACTIVE` (Màu xanh) và bổ sung model vào Dropdown chọn model trên khung chat.
- **Luồng Ngoại Lệ (Exception Flow)**:
  - *EF-01*: Không tìm thấy khóa API trong `.env` -> Từ chối với `HTTP 400 Bad Request`: "Không thể kích hoạt mô hình khi chưa cấu hình API Key hợp lệ trong .env."
  - *EF-02*: Model đã ở trạng thái `ACTIVE` -> Trả về `HTTP 200 OK` (Idempotent).
- **Điều Kiện Sau (Postconditions)**: Mô hình sẵn sàng phục vụ các yêu cầu chat.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-021`, `FR-023`, `BR-014`, `ADR-006`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `AC-008-D`.

---

### FR-025: Hủy Kích Hoạt Mô Hình Agent (Deactivate Agent Model - Soft State Policy)
- **Mã Yêu Cầu**: `FR-025`
- **Tên Yêu Cầu**: Hủy Kích Hoạt Mô Hình Agent (Deactivate Agent Model - Soft State Policy).
- **Mô Tả**: Cho phép tạm dừng một mô hình bằng cách chuyển trạng thái từ `ACTIVE` sang `INACTIVE`. Hệ thống **tuyệt đối không xóa vật lý bản ghi (No Hard Deletion)** theo `BR-012` nhằm bảo toàn toàn vẹn dữ liệu cho các tin nhắn lịch sử và cho phép tái kích hoạt dễ dàng.
- **Tác Nhân (Actor)**: `ACT-02` (Registered User), Quản trị viên.
- **Điều Kiện Tiên Quyết (Preconditions)**: Mô hình đang ở trạng thái `ACTIVE` và không phải là mô hình mặc định duy nhất đang chạy (`BR-013`).
- **Luồng Chính (Main Flow)**:
  1. Người dùng bấm tắt kích hoạt (Deactivate) trên thẻ mô hình.
  2. Client gửi request `PATCH /api/v1/models/{model_id}/deactivate`.
  3. Backend kiểm tra xem mô hình này có đang được đặt làm mặc định (`is_default == true`) hay không.
  4. Nếu không phải mặc định: Backend chuyển trạng thái sang `INACTIVE`.
  5. Backend cập nhật cấu hình điều phối, loại mô hình khỏi danh sách chọn trong phòng chat.
  6. Backend trả về `HTTP 200 OK`.
  7. Client chuyển nhãn trạng thái sang `INACTIVE` (Màu xám) và loại bỏ khỏi Dropdown thanh công cụ chat.
- **Luồng Ngoại Lệ (Exception Flow)**:
  - *EF-01*: Cố tình hủy kích hoạt mô hình đang là mặc định (`is_default == true`) -> Từ chối với `HTTP 400 Bad Request`: "Không thể hủy kích hoạt mô hình đang được đặt làm mặc định. Vui lòng chọn một mô hình hoạt động khác làm mặc định trước." (`BR-013`).
- **Điều Kiện Sau (Postconditions)**: Mô hình bị ẩn khỏi giao diện chọn lựa nhưng dữ liệu lịch sử liên kết vẫn toàn vẹn 100%.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-021`, `BR-012`, `BR-013`, `ADR-006`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `AC-008-E`.

---

### FR-026: Thiết Lập Mô Hình Mặc Định & Thứ Tự Định Tuyến (Set Default Agent Model & Routing Priority)
- **Mã Yêu Cầu**: `FR-026`
- **Tên Yêu Cầu**: Thiết Lập Mô Hình Mặc Định & Thứ Tự Định Tuyến (Set Default Agent Model & Routing Priority).
- **Mô Tả**: Cho phép người dùng chỉ định một mô hình trong danh sách `ACTIVE` làm mô hình đàm thoại chính mặc định cho toàn bộ cuộc trò chuyện mới, đồng thời cấu hình thứ tự nhà cung cấp dự phòng khi xảy ra sự cố failover (`BR-005`, `ADR-005`).
- **Tác Nhân (Actor)**: `ACT-02` (Registered User), Quản trị viên.
- **Điều Kiện Tiên Quyết (Preconditions)**: Mô hình được chọn phải đang ở trạng thái `ACTIVE`.
- **Luồng Chính (Main Flow)**:
  1. Người dùng chọn nút "Đặt làm mặc định" (Set Default) trên một mô hình `ACTIVE`.
  2. Client gửi request `PATCH /api/v1/models/default` kèm payload `{"model_id": "gemini-3.8-flash"}`.
  3. Backend kiểm tra model tồn tại và có `status == ACTIVE`.
  4. Backend gỡ bỏ cờ `is_default` của model cũ và thiết lập `is_default = true` cho model mới.
  5. Backend cập nhật biến điều phối mặc định trong cấu hình phiên.
  6. Backend trả về `HTTP 200 OK`.
  7. Client hiển thị huy hiệu "MẶC ĐỊNH" (Default Badge) trên thẻ model tương ứng.
- **Luồng Ngoại Lệ (Exception Flow)**:
  - *EF-01*: Model chỉ định đang ở trạng thái `INACTIVE` -> Từ chối với `HTTP 400 Bad Request`: "Chỉ có thể đặt mô hình đang ở trạng thái ACTIVE làm mặc định."
- **Điều Kiện Sau (Postconditions)**: Các cuộc trò chuyện mới tự động sử dụng mô hình này nếu người dùng không chọn model khác.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-021`, `FR-024`, `BR-013`, `ADR-006`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `AC-008-F`.

---

## 5. Phân Hệ Xác Thực Bên Thứ Ba & OAuth2 (Third-Party Authentication & OAuth2)

---

### FR-027: Đăng Ký Tài Khoản Bằng Discord (Discord Account Registration)
- **Mã Yêu Cầu**: `FR-027`
- **Tên Yêu Cầu**: Đăng Ký Tài Khoản Bằng Discord (Discord Account Registration).
- **Mô Tả**: Cho phép người dùng chưa có tài khoản thực hiện đăng ký tài khoản mới trên hệ thống AI-Chan thông qua ủy quyền OAuth2 của Discord, tự động trích xuất thông tin định danh (`discord_id`, `email`, `discord_username`, `avatar`) mà không bắt buộc nhập mật khẩu thủ công.
- **Tác Nhân (Actor)**: `ACT-01` (Guest User).
- **Điều Kiện Tiên Quyết (Preconditions)**:
  - Khách truy cập đang ở màn hình Đăng ký (`/register`).
  - Người dùng có tài khoản Discord hợp lệ với email đã được xác minh (`verified == true`) từ Discord.
- **Luồng Chính (Main Flow)**:
  1. Người dùng nhấn nút "Tiếp tục với Discord" (Continue with Discord) trên màn hình Đăng ký (`UX-001`).
  2. Client chuyển hướng người dùng tới endpoint `GET /api/v1/auth/discord/login` (`OP-016`).
  3. Backend sinh chuỗi `state` ngẫu nhiên có chữ ký mật mã HMAC-SHA256 lưu tạm thời vào cookie/bộ nhớ và chuyển hướng người dùng tới URL xác thực Discord OAuth2 (`https://discord.com/oauth2/authorize`) với phạm vi `identify email` (`BR-016`, `SEC-008`).
  4. Người dùng chấp thuận ủy quyền truy cập trên trang xác thực của Discord.
  5. Discord chuyển hướng trình duyệt về Callback URL `GET /api/v1/auth/discord/callback?code={code}&state={state}` (`OP-017`).
  6. Backend xác thực tính toàn vẹn và hạn sử dụng của tham số `state` (`BR-016`).
  7. Backend thực hiện trao đổi authorization `code` lấy access token với Discord API qua kênh bảo mật Backend-to-Discord (`ADR-007`).
  8. Backend gọi API Discord (`https://discord.com/api/users/@me`) để lấy hồ sơ người dùng (`id`, `username`, `email`, `verified`, `avatar`).
  9. Backend kiểm tra `discord_id` chưa tồn tại trong bảng `users`.
  10. Backend kiểm tra nếu `email` đã tồn tại trong bảng `users` và email Discord đã verified -> Thực hiện tự động liên kết tài khoản (`BR-017`); nếu email chưa tồn tại -> Khởi tạo bản ghi `User` mới với `discord_id`, `discord_username`, `email`, `hashed_password = NULL` (`BR-018`).
  11. Backend phát hành JWT Token phiên đăng nhập và thiết lập cookie HttpOnly an toàn (`ADR-002`, `SEC-004`).
  12. Backend chuyển hướng người dùng về trang giao diện chính (`/chat`) kèm thông báo đăng ký thành công.
- **Luồng Ngoại Lệ (Exception Flow)**:
  - *EF-01*: Người dùng hủy ủy quyền trên Discord (`error=access_denied`) -> Backend chuyển hướng về `/register` kèm tham số lỗi `error=oauth_cancelled`. Client hiển thị thông báo "Bạn đã hủy đăng nhập Discord".
  - *EF-02*: Tham số `state` không hợp lệ hoặc đã hết hạn -> Backend từ chối với lỗi `HTTP 400 Bad Request` hoặc chuyển hướng về `/register?error=invalid_state` để ngăn ngừa tấn công CSRF (`BR-016`, `SEC-008`).
  - *EF-03*: Email từ tài khoản Discord chưa được xác thực (`verified == false`) -> Backend từ chối liên kết hoặc đăng ký mới với lỗi `HTTP 400 Bad Request`: "Tài khoản Discord của bạn cần xác thực email trước khi sử dụng để đăng ký."
- **Điều Kiện Sau (Postconditions)**: Bản ghi người dùng được tạo thành công trong cơ sở dữ liệu với `discord_id` được ghi nhận; người dùng được đăng nhập vào hệ thống với phiên JWT hợp lệ.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-001`, `BR-016`, `BR-017`, `BR-018`, `SEC-004`, `SEC-008`, `ADR-007`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `AC-009-A`.

---

### FR-028: Đăng Nhập & Tự Động Liên Kết Bằng Discord (Discord Account Login & Linking)
- **Mã Yêu Cầu**: `FR-028`
- **Tên Yêu Cầu**: Đăng Nhập & Tự Động Liên Kết Bằng Discord (Discord Account Login & Linking).
- **Mô Tả**: Cho phép người dùng đã liên kết tài khoản Discord đăng nhập nhanh vào hệ thống chỉ bằng 1 thao tác click, hoặc người dùng đã có tài khoản email/mật khẩu truyền thống được tự động liên kết với tài khoản Discord khi đăng nhập bằng Discord với email tương ứng (`BR-017`).
- **Tác Nhân (Actor)**: `ACT-01` (Guest User), `ACT-02` (Registered User).
- **Điều Kiện Tiên Quyết (Preconditions)**:
  - Người dùng truy cập màn hình Đăng nhập (`/login`) hoặc Đăng ký (`/register`).
  - Người dùng sở hữu tài khoản Discord đang hoạt động.
- **Luồng Chính (Main Flow)**:
  1. Người dùng nhấn nút "Tiếp tục với Discord" trên màn hình Đăng nhập (`UX-002`).
  2. Client gọi endpoint khởi tạo `GET /api/v1/auth/discord/login` (`OP-016`).
  3. Backend tạo mã bảo vệ CSRF `state` và chuyển hướng đến trang xác thực Discord OAuth2 (`BR-016`, `SEC-008`).
  4. Người dùng xác nhận cấp quyền trên Discord.
  5. Discord gọi về Callback URL `GET /api/v1/auth/discord/callback` kèm `code` và `state` (`OP-017`).
  6. Backend xác thực `state`, gửi `code` để lấy token từ Discord và truy xuất thông tin người dùng từ Discord `@me`.
  7. Backend tìm kiếm người dùng trong cơ sở dữ liệu:
     - Trường hợp A: Đã tồn tại bản ghi với `discord_id == discord_profile.id` -> Tiến hành xác thực thành công.
     - Trường hợp B: Chưa có `discord_id` nhưng tồn tại bản ghi có `email == discord_profile.email` và `verified == true` phía Discord -> Tự động cập nhật `discord_id` và `discord_username` vào bản ghi tài khoản hiện tại (`BR-017`).
  8. Backend cập nhật thời gian đăng nhập `updated_at`, sinh mã JWT Token và ghi cookie HttpOnly (`ADR-002`, `SEC-004`).
  9. Backend chuyển hướng trình duyệt về giao diện đàm thoại `/chat`.
- **Luồng Ngoại Lệ (Exception Flow)**:
  - *EF-01*: Lỗi trao đổi mã ủy quyền với máy chủ Discord (mạng hoặc mã code hết hạn) -> Backend chuyển hướng về `/login?error=discord_exchange_failed`.
  - *EF-02*: Sai lệch `state` CSRF -> Backend chặn ngay lập tức và trả về mã lỗi bảo mật (`BR-016`, `SEC-008`).
  - *EF-03*: Tài khoản người dùng đang bị khóa hoặc hạn chế -> Hệ thống từ chối đăng nhập với thông báo phù hợp.
- **Điều Kiện Sau (Postconditions)**: Người dùng thiết lập phiên đăng nhập thành công thông qua tài khoản Discord; thông tin định danh Discord được liên kết đồng bộ.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-002`, `BR-016`, `BR-017`, `SEC-004`, `SEC-008`, `ADR-007`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `AC-009-B`.

---

## 6. Phân Hệ Quản Lý Tài Nguyên & Dashboard Thời Gian Thực (Resource Management & Real-Time Dashboard)

---

### FR-029: Đo Lường Độ Trễ Phản Hồi API & TTFT (Response Time & TTFT Latency Telemetry)
- **Mã Yêu Cầu**: `FR-029`
- **Tên Yêu Cầu**: Đo Lường Độ Trễ Phản Hồi API & TTFT (Response Time & TTFT Latency Telemetry).
- **Mô Tả**: Chặn bắt và ghi nhận thời gian thực thi của từng yêu cầu API (`latency_ms`) và thời gian nhận ký tự đầu tiên (`ttft_ms`) cho luồng đàm thoại SSE streaming nhằm giám sát hiệu năng chi tiết.
- **Tác Nhân (Actor)**: `ACT-02` (Registered User), `FastAPI Telemetry Middleware`.
- **Điều Kiện Tiên Quyết (Preconditions)**: Yêu cầu HTTP hoặc SSE được gửi tới máy chủ Backend.
- **Luồng Chính (Main Flow)**:
  1. Middleware ghi nhận mốc thời gian bắt đầu `t_start` khi nhận request.
  2. Đối với request chat streaming, hook ghi nhận `t_first_chunk` khi token đầu tiên được tạo ra (`ttft_ms = (t_first_chunk - t_start) * 1000`).
  3. Khi response kết thúc, middleware tính toán tổng thời gian xử lý (`latency_ms = (t_end - t_start) * 1000`).
  4. Ghi bản ghi độ trễ vào bảng `api_metric_logs` (`BR-019`).
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-013`, `BR-019`, `NFR-020`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `TC-024`.

---

### FR-030: Thống Kê Tiêu Thụ Token & Phân Bổ Mô Hình (Token Consumption Accounting & Model Breakdown)
- **Mã Yêu Cầu**: `FR-030`
- **Tên Yêu Cầu**: Thống Kê Tiêu Thụ Token & Phân Bổ Mô Hình (Token Consumption Accounting & Model Breakdown).
- **Mô Tả**: Thu thập và phân loại chi tiết số lượng `prompt_tokens`, `completion_tokens` và `total_tokens` tiêu tốn trên từng lượt gọi mô hình LLM, gắn kết với `model_id` và `user_id`.
- **Tác Nhân (Actor)**: `ACT-02` (Registered User), `LLM Engine`.
- **Điều Kiện Tiên Quyết (Preconditions)**: Một lượt đàm thoại với AI kết thúc thành công.
- **Luồng Chính (Main Flow)**:
  1. Tầng LLM Engine (LangChain/LangGraph) trích xuất metadata token từ response hoặc stream terminator chunk.
  2. Ghi nhận số lượng token tương ứng với mô hình được chọn (Gemini, OpenAI, Claude, Groq, Ollama).
  3. Cập nhật số token tích lũy vào `ApiMetricLog` và tăng trường `daily_tokens_used` trong `UserQuota` (`BR-019`).
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-014`, `BR-019`, `ADR-008`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `TC-024`.

---

### FR-031: Theo Dõi Lưu Lượng API & Tỷ Lệ Mã Trạng Thái (API Request Volume, Rate & HTTP Status Tracking)
- **Mã Yêu Cầu**: `FR-031`
- **Tên Yêu Cầu**: Theo Dõi Lưu Lượng API & Tỷ Lệ Mã Trạng Thái (API Request Volume, Rate & HTTP Status Tracking).
- **Mô Tả**: Theo dõi số lượng request tổng cộng, tỷ lệ theo phút (RPM), và phân bố mã trạng thái HTTP (2xx Thành công, 4xx Lỗi máy khách, 5xx Lỗi máy chủ).
- **Tác Nhân (Actor)**: `ACT-02` (Registered User), `FastAPI Telemetry Middleware`.
- **Điều Kiện Tiên Quyết (Preconditions)**: Các yêu cầu API được tiếp nhận và xử lý tại backend.
- **Luồng Chính (Main Flow)**:
  1. Middleware ghi nhận mã trạng thái HTTP của response (`status_code`).
  2. Tích lũy số lượng yêu cầu theo từng phân loại mã trạng thái.
  3. Cung cấp số liệu thống kê thông qua endpoint tóm tắt `GET /api/v1/resources/summary` (`OP-018`).
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `BR-019`, `OP-018`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `TC-024`.

---

### FR-032: Quản Lý Hạn Ngạch & Kiểm Soát Quota Người Dùng (User Quota Management & Rate Limit Guard)
- **Mã Yêu Cầu**: `FR-032`
- **Tên Yêu Cầu**: Quản Lý Hạn Ngạch & Kiểm Soát Quota Người Dùng (User Quota Management & Rate Limit Guard).
- **Mô Tả**: Thiết lập và cưỡng chế hạn mức token hằng ngày (`daily_token_limit`) cho mỗi tài khoản, phát cảnh báo khi sử dụng đến 80% và điều tiết chặn HTTP 429 khi vượt quá 100% hạn ngạch (`CTRL-008`).
- **Tác Nhân (Actor)**: `ACT-02` (Registered User), `Quota Evaluator Service`.
- **Điều Kiện Tiên Quyết (Preconditions)**: Người dùng đã đăng nhập hệ thống.
- **Luồng Chính (Main Flow)**:
  1. Trước khi gửi prompt đến LLM, hệ thống kiểm tra `daily_tokens_used` so với `daily_token_limit` trong `UserQuota`.
  2. Nếu `daily_tokens_used / daily_token_limit >= 0.8`: Chuyển trạng thái sang `WARNING_80` và trả header cảnh báo (`BR-020`).
  3. Nếu `daily_tokens_used >= daily_token_limit`: Chuyển trạng thái sang `EXCEEDED_THROTTLED`, chặn thực thi và trả về mã `HTTP 429 Too Many Requests`: "Bạn đã sử dụng hết hạn ngạch token hôm nay. Vui lòng quay lại vào ngày mai." (`BR-020`, `CTRL-008`).
  4. Hạn ngạch tự động reset về 0 vào lúc 00:00:00 UTC hằng ngày.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `BR-020`, `CTRL-008`, `SEC-009`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `TC-026`.

---

### FR-033: Luồng Dữ Liệu Đo Lường Thời Gian Thực Qua SSE (Real-Time Telemetry Stream via Server-Sent Events)
- **Mã Yêu Cầu**: `FR-033`
- **Tên Yêu Cầu**: Luồng Dữ Liệu Đo Lường Thời Gian Thực Qua SSE (Real-Time Telemetry Stream via Server-Sent Events).
- **Mô Tả**: Cung cấp kênh phát luồng dữ liệu thời gian thực Server-Sent Events tại `GET /api/v1/resources/stream` (`OP-019`) đẩy số liệu nhịp đập (latency, tokens, live requests) mỗi giây về cho client.
- **Tác Nhân (Actor)**: `ACT-02` (Registered User / Admin), `SSE Broadcaster`.
- **Điều Kiện Tiên Quyết (Preconditions)**: Người dùng đã đăng nhập và mở màn hình Dashboard.
- **Luồng Chính (Main Flow)**:
  1. Client thiết lập kết nối SSE tới `GET /api/v1/resources/stream`.
  2. Backend kiểm tra xác thực cookie JWT và phân quyền người dùng (`BR-021`, `SEC-009`).
  3. Backend gửi gói dữ liệu ban đầu (Initial Snapshot) tóm tắt 24 giờ gần nhất.
  4. Backend đăng ký client vào In-Memory Ring Buffer bus.
  5. Định kỳ mỗi 1 giây hoặc khi có request kết thúc, backend đẩy sự kiện `event: metric_tick` chứa số liệu độ trễ, token và trạng thái quota hiện tại.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `OP-019`, `BR-021`, `SEC-009`, `NFR-021`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `TC-025`.

---

### FR-034: Giao Diện Dashboard Quản Lý Tài Nguyên Trực Quan (Interactive Real-Time Resource Dashboard UI)
- **Mã Yêu Cầu**: `FR-034`
- **Tên Yêu Cầu**: Giao Diện Dashboard Quản Lý Tài Nguyên Trực Quan (Interactive Real-Time Resource Dashboard UI).
- **Mô Tả**: Cung cấp giao diện bảng điều khiển tương tác tại tuyến đường `/dashboard`, tích hợp biểu đồ độ trễ động, thước đo hạn ngạch quota, biểu đồ cột tiêu thụ token và bảng nhật ký luồng yêu cầu thời gian thực.
- **Tác Nhân (Actor)**: `ACT-02` (Registered User), `Next.js Client`.
- **Điều Kiện Tiên Quyết (Preconditions)**: Người dùng đã đăng nhập và điều hướng đến `/dashboard`.
- **Luồng Chính (Main Flow)**:
  1. Màn hình `/dashboard` tải dữ liệu tổng quan ban đầu từ `GET /api/v1/resources/summary` (`OP-018`).
  2. Client tự động kết nối luồng SSE `GET /api/v1/resources/stream` (`OP-019`) và duy trì cập nhật mượt mà.
  3. Hiển thị 4 thẻ chỉ số nhanh: Độ trễ trung bình/P95, Tổng token đã dùng, Số lượng request, và Tỷ lệ lỗi.
  4. Hiển thị thước đo Gauge Hạn ngạch Quota hằng ngày (xanh lá cây: bình thường; vàng cam: >=80%; đỏ: chạm 100%).
  5. Vẽ biểu đồ Sparkline / Line chart hiển thị độ trễ và TTFT theo từng giây.
  6. Vẽ biểu đồ cột phân bổ token theo từng mô hình AI.
  7. Hiển thị bảng Live Request Feed với các badge trạng thái (200 OK, 429 Throttled, 500 Error).
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-033`, `UX-007`, `OP-018`, `OP-019`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `TC-025`.

---

## 7. Phân Hệ Mở Rộng Quản Lý Mô Hình Agent (Agent Model Management Extensions)

---

### FR-035: Đăng Ký & Bổ Sung Mô Hình Agent Mới (Register & Add New Agent Model)
- **Mã Yêu Cầu**: `FR-035`
- **Tên Yêu Cầu**: Đăng Ký & Bổ Sung Mô Hình Agent Mới (Register & Add New Agent Model).
- **Mô Tả**: Cho phép người dùng và quản trị viên khai báo thêm một mô hình Agent mới vào danh mục hệ thống với các thông số cấu hình: mã định danh (`id`), tên hiển thị (`name`), nhà cung cấp (`provider`), độ dài cửa sổ ngữ cảnh (`context_window`), giới hạn token tối đa (`max_tokens`), và cờ hỗ trợ streaming (`supports_streaming`).
- **Tác Nhân (Actor)**: `ACT-02` (Registered User / Admin).
- **Điều Kiện Tiên Quyết (Preconditions)**: Người dùng đã đăng nhập và có quyền quản trị/quản lý mô hình.
- **Luồng Chính (Main Flow)**:
  1. Người dùng mở hộp thoại "Thêm mô hình mới" trên giao diện `/models`.
  2. Người dùng nhập các thông tin mô hình và nhấn "Lưu mô hình".
  3. Client gửi yêu cầu `POST /api/v1/models` (`OP-022`).
  4. Backend kiểm tra mã định danh `id` chưa từng tồn tại trong hệ thống (`BR-022`).
  5. Backend thẩm định biên giới hạn tham số: `context_window >= 1000` và `max_tokens >= 256` (`BR-024`).
  6. Backend khởi tạo bản ghi `AgentModel` mới với trạng thái mặc định `INACTIVE` (hoặc `ACTIVE` nếu có API key hợp lệ).
  7. Backend ghi nhận sự kiện kiểm toán và trả về `HTTP 201 Created` kèm thực thể mô hình vừa tạo.
  8. Giao diện cập nhật danh mục mô hình và hiển thị thông báo thành công.
- **Luồng Ngoại Lệ (Exception Flow)**:
  - *EF-01*: Mã định danh `id` đã tồn tại trong cơ sở dữ liệu -> Trả về `HTTP 409 Conflict`: "Mã định danh mô hình đã tồn tại." (`BR-022`).
  - *EF-02*: Tham số ngoài biên an toàn (`context_window < 1000` hoặc `max_tokens < 256`) -> Trả về `HTTP 422 Unprocessable Entity` (`BR-024`).
- **Điều Kiện Sau (Postconditions)**: Mô hình mới được ghi nhận an toàn vào catalog và sẵn sàng cho các bước kiểm tra kết nối.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-021`, `BR-022`, `BR-024`, `SEC-010`, `OP-022`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `TC-027`.

---

### FR-036: Hiệu Chỉnh Cấu Hình & Tham Số Mô Hình (Update & Edit Agent Model Configuration)
- **Mã Yêu Cầu**: `FR-036`
- **Tên Yêu Cầu**: Hiệu Chỉnh Cấu Hình & Tham Số Mô Hình (Update & Edit Agent Model Configuration).
- **Mô Tả**: Cho phép chỉnh sửa thông tin chi tiết của mô hình hiện có bao gồm tên hiển thị, kích thước context window, giới hạn max tokens, và cờ hỗ trợ streaming; đồng thời nghiêm ngặt cấm thay đổi mã định danh `id` và nhà cung cấp `provider` (`BR-022`).
- **Tác Nhân (Actor)**: `ACT-02` (Registered User / Admin).
- **Điều Kiện Tiên Quyết (Preconditions)**: Mô hình cần chỉnh sửa tồn tại trong hệ thống.
- **Luồng Chính (Main Flow)**:
  1. Người dùng bấm nút "Chỉnh sửa" trên thẻ mô hình tại `/models`.
  2. Giao diện mở Drawer/Modal chỉnh sửa cấu hình với các trường dữ liệu hiện hành.
  3. Người dùng cập nhật các trường được phép thay đổi và bấm "Cập nhật".
  4. Client gửi yêu cầu `PUT /api/v1/models/{model_id}` (`OP-023`).
  5. Backend xác thực người dùng và quyền hạn (`SEC-010`, `CTRL-009`).
  6. Backend kiểm tra payload đảm bảo không cố gắng thay đổi `id` hoặc `provider` (`BR-022`).
  7. Backend thẩm định biên tham số hợp lệ (`BR-024`).
  8. Backend lưu thông tin cập nhật vào bảng `agent_models` và cập nhật timestamp `updated_at`.
  9. Backend trả về `HTTP 200 OK` kèm bản ghi đã cập nhật.
  10. Client cập nhật hiển thị ngay lập tức trên giao diện.
- **Luồng Ngoại Lệ (Exception Flow)**:
  - *EF-01*: Payload cố ý sửa đổi `id` hoặc `provider` -> Trả về `HTTP 400 Bad Request`: "Mã định danh và nhà cung cấp mô hình là bất biến." (`BR-022`).
  - *EF-02*: Mô hình không tồn tại -> Trả về `HTTP 404 Not Found`.
  - *EF-03*: Tham số không hợp lệ -> Trả về `HTTP 422 Unprocessable Entity` (`BR-024`).
- **Điều Kiện Sau (Postconditions)**: Cấu hình mô hình được cập nhật an toàn mà không làm rách vỡ liên kết khóa ngoại.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-021`, `FR-035`, `BR-022`, `BR-024`, `SEC-010`, `OP-023`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `TC-028`.

---

### FR-037: Tìm Kiếm Mô Hình Toàn Văn & Tìm Kiếm Mờ (Full-Text & Fuzzy Model Search)
- **Mã Yêu Cầu**: `FR-037`
- **Tên Yêu Cầu**: Tìm Kiếm Mô Hình Toàn Văn & Tìm Kiếm Mờ (Full-Text & Fuzzy Model Search).
- **Mô Tả**: Cung cấp công cụ tìm kiếm mô hình tức thì thông qua từ khóa tìm kiếm (`q`), so khớp không phân biệt hoa thường và tìm kiếm chuỗi con/tìm kiếm mờ trên cả tên hiển thị (`name`) và mã định danh (`id`) với độ trễ phản hồi thấp.
- **Tác Nhân (Actor)**: `ACT-02` (Registered User / Admin).
- **Điều Kiện Tiên Quyết (Preconditions)**: Người dùng truy cập trang danh mục mô hình `/models`.
- **Luồng Chính (Main Flow)**:
  1. Người dùng nhập chuỗi tìm kiếm vào ô Search Bar (ví dụ: "gemini", "flash", "sonnet", "llama").
  2. Client kích hoạt debounce 300ms (`UX-008`) và gửi yêu cầu `GET /api/v1/models/search?q={query}` (`OP-024`).
  3. Backend thực hiện lọc tập dữ liệu mô hình theo chuỗi con và token khớp từ khóa.
  4. Backend hoàn tất tính toán và trả về mảng kết quả trong thời gian $\le 200\text{ms}$ (`NFR-022`).
  5. Giao diện làm mới danh sách hiển thị các thẻ mô hình thỏa mãn điều kiện tìm kiếm, làm nổi bật (highlight) từ khóa khớp.
- **Điều Kiện Sau (Postconditions)**: Danh sách mô hình phù hợp được trình bày ngay lập tức cho người dùng.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-021`, `NFR-022`, `UX-008`, `OP-024`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `TC-029`.

---

### FR-038: Bộ Lọc Đa Thuộc Tính & Sắp Xếp Danh Mục Mô Hình (Multi-Attribute Model Filtering & Sorting)
- **Mã Yêu Cầu**: `FR-038`
- **Tên Yêu Cầu**: Bộ Lọc Đa Thuộc Tính & Sắp Xếp Danh Mục Mô Hình (Multi-Attribute Model Filtering & Sorting).
- **Mô Tả**: Cho phép người dùng lọc danh mục mô hình kết hợp nhiều tiêu chí: theo Nhà cung cấp (`provider`), Trạng thái hoạt động (`status`), Tình trạng khóa API (`has_api_key`), Mô hình mặc định (`is_default`), cùng tính năng sắp xếp đa dạng theo độ trễ, kích thước context hoặc tên gọi.
- **Tác Nhân (Actor)**: `ACT-02` (Registered User / Admin).
- **Điều Kiện Tiên Quyết (Preconditions)**: Người dùng ở màn hình danh mục mô hình.
- **Luồng Chính (Main Flow)**:
  1. Người dùng lựa chọn các bộ lọc phân loại trên thanh công cụ (ví dụ: Provider = "GOOGLE", Status = "ACTIVE", Has API Key = true).
  2. Người dùng chọn tiêu chí sắp xếp (ví dụ: Sắp xếp theo Độ trễ tăng dần, hoặc Context Window giảm dần).
  3. Client tổng hợp query params và gọi `GET /api/v1/models/search?provider=GOOGLE&status=ACTIVE&has_api_key=true&sort=latency_asc` (`OP-024`).
  4. Backend áp dụng vị từ lọc kết hợp (conjunction AND predicates) và áp dụng thuật toán sắp xếp tương ứng.
  5. Backend trả về kết quả lọc chính xác kèm mã `HTTP 200 OK` trong vòng $\le 200\text{ms}$ (`NFR-022`).
  6. Giao diện cập nhật danh sách hiển thị kèm bộ đếm số lượng kết quả tìm thấy.
- **Điều Kiện Sau (Postconditions)**: Người dùng dễ dàng định vị các mô hình thỏa mãn chính xác các tiêu chí kỹ thuật cần thiết.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-021`, `FR-037`, `NFR-022`, `OP-024`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `TC-029`.

---

### FR-039: Xóa Mềm & Lưu Trữ Mô Hình Có Bảo Vệ (Model Soft Deletion & Archival Guard)
- **Mã Yêu Cầu**: `FR-039`
- **Tên Yêu Cầu**: Xóa Mềm & Lưu Trữ Mô Hình Có Bảo Vệ (Model Soft Deletion & Archival Guard).
- **Mô Tả**: Cung cấp khả năng xóa mềm (soft delete) bằng cách chuyển trạng thái mô hình sang `ARCHIVED` (không xóa vật lý trong cơ sở dữ liệu), có chốt chặn kiểm tra nghiêm ngặt không cho phép xóa hoặc lưu trữ mô hình đang được đặt làm mặc định (`BR-023`).
- **Tác Nhân (Actor)**: `ACT-02` (Registered User / Admin).
- **Điều Kiện Tiên Quyết (Preconditions)**: Mô hình cần xóa tồn tại trong hệ thống.
- **Luồng Chính (Main Flow)**:
  1. Người dùng bấm biểu tượng "Xóa / Lưu trữ" trên thẻ mô hình.
  2. Giao diện hiển thị Modal xác nhận cảnh báo thao tác lưu trữ mô hình.
  3. Người dùng xác nhận lưu trữ; Client gửi `DELETE /api/v1/models/{model_id}` (`OP-025`).
  4. Backend kiểm tra cờ `is_default` của mô hình mục tiêu (`BR-023`).
  5. Nếu `is_default == true`: Backend từ chối ngay lập tức với mã `HTTP 400 Bad Request` (`BR-023`).
  6. Nếu `is_default == false`: Backend cập nhật `status = ARCHIVED` và lưu bản ghi.
  7. Backend đồng bộ loại mô hình khỏi danh sách chọn của Agent chat.
  8. Backend trả về `HTTP 200 OK` kèm thông báo: "Đã chuyển mô hình vào trạng thái lưu trữ an toàn."
  9. Client loại bỏ mô hình khỏi bảng hiển thị đang hoạt động.
- **Luồng Ngoại Lệ (Exception Flow)**:
  - *EF-01*: Cố tình xóa mô hình đang là mặc định (`is_default == true`) -> Chặn với `HTTP 400 Bad Request`: "Không thể xóa hoặc lưu trữ mô hình đang được đặt làm mặc định. Vui lòng chọn một mô hình hoạt động khác làm mặc định trước." (`BR-023`).
  - *EF-02*: Mô hình không tồn tại -> Trả về `HTTP 404 Not Found`.
- **Điều Kiện Sau (Postconditions)**: Mô hình được lưu trữ an toàn mà không phá vỡ tính toàn vẹn khóa ngoại của lịch sử trò chuyện.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-021`, `FR-025`, `BR-023`, `SEC-010`, `OP-025`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `TC-030`.

---

### FR-040: Liên Kết Tài Khoản Người Dùng Với Discord (Link Authenticated User Account with Discord)
- **Mã Yêu Cầu**: `FR-040`
- **Tên Yêu Cầu**: Liên Kết Tài Khoản Người Dùng Với Discord (Link Authenticated User Account with Discord).
- **Mô Tả**: Cho phép người dùng đã đăng nhập thực hiện liên kết tài khoản website hiện tại với tài khoản Discord cá nhân thông qua luồng ủy quyền Discord OAuth2, với cơ chế kiểm tra tính duy nhất 1-1 và từ chối xung đột (`BR-025`).
- **Tác Nhân (Actor)**: `ACT-02` (Registered User).
- **Điều Kiện Tiên Quyết (Preconditions)**: Người dùng đang đăng nhập với phiên JWT hợp lệ; tài khoản hiện tại chưa liên kết Discord (`discord_id IS NULL`).
- **Luồng Chính (Main Flow)**:
  1. Người dùng truy cập trang Cài đặt tab Kết nối (`/settings?tab=connections`) và nhấn "Liên kết Discord".
  2. Client gọi `GET /api/v1/auth/discord/link` (`OP-026`).
  3. Backend khởi tạo URL ủy quyền kèm tham số `state` ký HMAC chứa `action=link` và `user_id` hiện tại (`BR-016`, `SEC-008`, `SEC-011`).
  4. Người dùng được chuyển hướng đến cổng ủy quyền của Discord và bấm phê duyệt (Authorize).
  5. Discord redirect về `GET /api/v1/auth/discord/callback` (`OP-027`).
  6. Backend xác thực chữ ký HMAC của `state`, trao đổi code lấy access token và thông tin hồ sơ Discord (`id`, `username`).
  7. Backend kiểm tra tính duy nhất (`BR-025`): Không có tài khoản người dùng nào khác trong hệ thống sở hữu `discord_id` này.
  8. Backend cập nhật `discord_id` và `discord_username` vào bản ghi tài khoản hiện tại.
  9. Backend chuyển hướng người dùng về `/settings?tab=connections&status=linked_success`.
  10. Giao diện hiển thị thông báo thành công và cập nhật trạng thái đã liên kết.
- **Luồng Ngoại Lệ (Exception Flow)**:
  - *EF-01*: Tài khoản Discord đã được liên kết với một tài khoản AI-Chan khác -> Backend hủy bỏ và redirect về `/settings?tab=connections&error=discord_already_linked` (`BR-025`). Giao diện hiển thị lỗi cảnh báo xung đột tài khoản (`TC-032`).
  - *EF-02*: Tham số `state` không hợp lệ hoặc quá hạn 10 phút -> Chặn với lỗi `HTTP 400 Bad Request` (`BR-016`).
- **Điều Kiện Sau (Postconditions)**: Tài khoản người dùng được liên kết định danh với Discord, cho phép đăng nhập một chạm bằng Discord trong các phiên kế tiếp.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-002`, `FR-028`, `BR-016`, `BR-025`, `SEC-011`, `OP-026`, `OP-027`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `TC-031`, `TC-032`.

---

### FR-041: Hủy Liên Kết Tài Khoản Discord Có Chốt Chặn An Toàn (Unlink Discord Account with Lockout Guard)
- **Mã Yêu Cầu**: `FR-041`
- **Tên Yêu Cầu**: Hủy Liên Kết Tài Khoản Discord Có Chốt Chặn An Toàn (Unlink Discord Account with Lockout Guard).
- **Mô Tả**: Cung cấp khả năng hủy liên kết tài khoản Discord khỏi tài khoản website, tích hợp chốt chặn bắt buộc tài khoản phải có mật khẩu trước khi hủy (`BR-026`) và yêu cầu tái xác thực mật khẩu hiện tại (`BR-027`, `SEC-006`) nhằm ngăn chặn nguy cơ người dùng bị khóa vĩnh viễn khỏi tài khoản.
- **Tác Nhân (Actor)**: `ACT-02` (Registered User).
- **Điều Kiện Tiên Quyết (Preconditions)**: Người dùng đang đăng nhập và tài khoản đang có liên kết Discord (`discord_id IS NOT NULL`).
- **Luồng Chính (Main Flow)**:
  1. Người dùng bấm "Hủy liên kết" tại thẻ kết nối Discord trên trang Cài đặt (`/settings?tab=connections`).
  2. Giao diện hiển thị Modal xác nhận yêu cầu nhập mật khẩu hiện tại để xác thực an ninh (`BR-027`).
  3. Người dùng nhập mật khẩu và bấm "Xác nhận hủy liên kết".
  4. Client gửi `DELETE /api/v1/users/me/discord` kèm body `{"password": "..."}` (`OP-028`).
  5. Backend thẩm định chốt chặn chống khóa tài khoản (`BR-026`): Kiểm tra `hashed_password IS NOT NULL`.
  6. Backend xác thực mật khẩu nhập vào khớp với mật khẩu tài khoản (`BR-027`, `SEC-006`).
  7. Backend xóa thông tin liên kết: gán `discord_id = NULL`, `discord_username = NULL` và lưu CSDL.
  8. Backend phản hồi `HTTP 200 OK` với thông điệp: "Hủy liên kết tài khoản Discord thành công."
  9. Giao diện cập nhật thẻ Discord về trạng thái chưa liên kết.
- **Luồng Ngoại Lệ (Exception Flow)**:
  - *EF-01*: Tài khoản đăng ký qua Discord chưa thiết lập mật khẩu (`hashed_password IS NULL` theo `BR-018`) -> Backend từ chối ngay với `HTTP 400 Bad Request`: "Không thể hủy liên kết Discord vì tài khoản chưa thiết lập mật khẩu đăng nhập. Vui lòng tạo mật khẩu tại tab Bảo mật trước khi hủy liên kết." (`BR-026`, `TC-034`).
  - *EF-02*: Mật khẩu xác thực sai -> Trả về `HTTP 401 Unauthorized`: "Mật khẩu xác nhận không chính xác." (`BR-027`).
- **Điều Kiện Sau (Postconditions)**: Tài khoản được gỡ bỏ liên kết Discord an toàn mà không làm mất quyền đăng nhập của người dùng.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-019`, `FR-040`, `BR-026`, `BR-027`, `SEC-011`, `CTRL-010`, `OP-028`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `TC-033`, `TC-034`.

---

### FR-042: Quản Lý & Hiển Thị Trạng Thái Tài Khoản Mạng Xã Hội (Manage & Display Connected Social Accounts)
- **Mã Yêu Cầu**: `FR-042`
- **Tên Yêu Cầu**: Quản Lý & Hiển Thị Trạng Thái Tài Khoản Mạng Xã Hội (Manage & Display Connected Social Accounts).
- **Mô Tả**: Cung cấp giao diện trung tâm tại trang Cài đặt tài khoản (`/settings?tab=connections`) cho phép người dùng quan sát trực quan danh sách và trạng thái kết nối của các tài khoản mạng xã hội bên thứ ba (Discord), kèm theo định danh tài khoản, avatar và các nút hành động liên kết hoặc hủy liên kết tức thì.
- **Tác Nhân (Actor)**: `ACT-02` (Registered User).
- **Điều Kiện Tiên Quyết (Preconditions)**: Người dùng đã đăng nhập vào hệ thống.
- **Luồng Chính (Main Flow)**:
  1. Người dùng điều hướng đến `/settings?tab=connections` (`SCR-005`).
  2. Client gọi `GET /api/v1/users/me/connections` (`OP-029`).
  3. Backend truy xuất thông tin tài khoản hiện tại và trả về trạng thái kết nối của Discord (connected: true/false, username, avatar, linked_at).
  4. Giao diện kết xuất thẻ dịch vụ Discord với badge trạng thái màu xanh lá ("Đã kết nối") hoặc màu xám ("Chưa kết nối").
  5. Nếu tài khoản chưa có mật khẩu (`hashed_password IS NULL`), giao diện hiển thị banner thông tin cảnh báo: "Tài khoản của bạn hiện đang liên kết với Discord. Để hủy liên kết an toàn, bạn cần tạo mật khẩu tại tab Bảo mật trước."
- **Điều Kiện Sau (Postconditions)**: Người dùng nắm bắt minh bạch tình trạng kết nối danh tính của tài khoản.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-015`, `FR-040`, `FR-041`, `UX-009`, `OP-029`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `TC-031`, `TC-033`.

---

## 10. Phân Hệ Quản Lý Bot Discord Cho Tài Khoản Đã Liên Kết (Discord Bot Management for Linked Accounts)

### FR-044: Tra Cứu Trạng Thái Bot & Khám Phá Máy Chủ Discord (Discord Bot Status Inspection & Guild Discovery)
- **Mã Yêu Cầu**: `FR-044`
- **Tên Yêu Cầu**: Tra Cứu Trạng Thái Bot & Khám Phá Máy Chủ Discord (Discord Bot Status Inspection & Guild Discovery).
- **Mô Tả**: Cung cấp giao diện trực quan cho người dùng đã liên kết tài khoản Discord (`BR-031`) kiểm tra trạng thái hoạt động của Bot AI-Chan (Online/Offline, Bot ID), lấy đường dẫn mời Bot vào Discord Server với quyền hạn chuẩn (`bot`, `applications.commands`), và tra cứu danh sách các Discord Server (Guilds) mà tài khoản có quyền quản trị kèm trạng thái cài đặt Bot (`OP-031`, `OP-033`, `UC-BOT-001 [UC-032]`, `BP-BOT-001 [PROC-022]`).
- **Tác Nhân (Actor)**: `ACT-02` (Registered User có liên kết Discord).
- **Điều Kiện Tiên Quyết (Preconditions)**: Người dùng đã đăng nhập và tài khoản đã liên kết Discord (`discord_id IS NOT NULL` theo `BR-031`).
- **Luồng Chính (Main Flow)**:
  1. Người dùng điều hướng tới tab "Quản lý Bot Discord" (`/settings?tab=bot` - `SCR-006`).
  2. Client gửi yêu cầu `GET /api/v1/bot/discord/config` (`OP-031`) và `GET /api/v1/bot/discord/guilds` (`OP-033`).
  3. Backend kiểm tra tài khoản đã liên kết Discord (`BR-031`).
  4. Backend truy vấn cấu hình bot cá nhân từ bảng `user_discord_bot_configs` và danh sách Discord Guilds từ Discord API / CSDL.
  5. Backend trả về thông tin trạng thái bot, URL mời bot và danh sách các guild.
  6. Client hiển thị thẻ trạng thái Bot, danh sách các Server có huy hiệu "Đã cài đặt" hoặc nút "Mời Bot".
- **Luồng Ngoại Lệ (Exception Flow)**:
  - *EF-01*: Người dùng chưa liên kết Discord (`discord_id IS NULL`) -> Backend từ chối với `HTTP 403 Forbidden`: "Vui lòng liên kết tài khoản Discord trước khi quản lý Bot." (`BR-031`, `TC-040`). Client hiển thị banner hướng dẫn liên kết tại tab Kết nối.
  - *EF-02*: Discord API rate limit hoặc token bot hết hạn -> Backend trả về trạng thái ngoại tuyến với mã lỗi `HTTP 502 Bad Gateway`.
- **Điều Kiện Sau (Postconditions)**: Người dùng nắm được danh sách các Guild có thể triển khai bot và lấy được liên kết mời bot.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-040`, `BR-031`, `SEC-013`, `OP-031`, `OP-033`, `UC-032`, `PROC-022`, `ADR-012`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `TC-040`.

---

### FR-045: Cấu Hình Định Tuyến Mô Hình & Nhân Vật Trợ Lý Cho Bot Discord (Discord Bot Model Routing & Persona Configuration)
- **Mã Yêu Cầu**: `FR-045`
- **Tên Yêu Cầu**: Cấu Hình Định Tuyến Mô Hình & Nhân Vật Trợ Lý Cho Bot Discord (Discord Bot Model Routing & Persona Configuration).
- **Mô Tả**: Cho phép người dùng tùy biến cấu hình hoạt động của Bot Discord cho phạm vi cá nhân (Direct Message) hoặc Server quản trị (`BR-034`): lựa chọn mô hình AI ưu tiên (`preferred_model_id` ràng buộc trạng thái `ACTIVE` theo `BR-033`), thiết lập Prompt nhân vật (System Prompt / Persona), và chọn cơ chế kích hoạt (`@Mention`, `Custom Prefix`, hoặc `Slash Command`) (`OP-032`, `UC-BOT-002 [UC-033]`, `BP-BOT-001 [PROC-022]`).
- **Tác Nhân (Actor)**: `ACT-02` (Registered User có liên kết Discord / Guild Administrator).
- **Điều Kiện Tiên Quyết (Preconditions)**: Người dùng đã liên kết Discord (`BR-031`); mô hình được chọn đang hoạt động (`BR-033`).
- **Luồng Chính (Main Flow)**:
  1. Người dùng chọn phạm vi cấu hình (Cá nhân hoặc Server cụ thể).
  2. Người dùng chọn mô hình AI mong muốn (chỉ hiển thị các mô hình có `status = 'ACTIVE'`).
  3. Người dùng nhập System Prompt tùy biến (tối đa 2,000 ký tự) và chọn phương thức kích hoạt (`trigger_mode`).
  4. Người dùng bấm "Lưu cấu hình Bot".
  5. Client gửi yêu cầu `PUT /api/v1/bot/discord/config` (`OP-032`) kèm body cấu hình.
  6. Backend kiểm tra quyền sở hữu hoặc quyền quản trị Guild (`BR-034`).
  7. Backend kiểm tra mô hình được chọn có tồn tại và đang `ACTIVE` (`BR-033`).
  8. Backend lưu bản ghi cấu hình vào bảng `user_discord_bot_configs`.
  9. Backend trả về `HTTP 200 OK` kèm dữ liệu cấu hình đã cập nhật (`NFR-025`).
  10. Client hiển thị Toast thông báo lưu thành công và cập nhật giao diện.
- **Luồng Ngoại Lệ (Exception Flow)**:
  - *EF-01*: Mô hình được chọn không ở trạng thái `ACTIVE` -> Backend từ chối với `HTTP 400 Bad Request`: "Mô hình được chọn hiện không khả dụng. Vui lòng chọn mô hình đang hoạt động." (`BR-033`, `TC-042`).
  - *EF-02*: Cấu hình cho Server mà người dùng không có quyền quản trị -> Backend từ chối với `HTTP 403 Forbidden` (`BR-034`).
  - *EF-03*: System Prompt vượt quá 2,000 ký tự hoặc Prefix rỗng -> Backend trả về `HTTP 422 Unprocessable Entity`.
- **Điều Kiện Sau (Postconditions)**: Cấu hình mới được áp dụng ngay lập tức cho các câu hỏi tiếp theo được gửi tới bot trên Discord.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-021`, `FR-044`, `BR-031`, `BR-033`, `BR-034`, `SEC-013`, `OP-032`, `UC-033`, `PROC-022`, `ADR-012`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `TC-039`, `TC-042`.

---

### FR-046: Kiểm Soát Hạn Ngạch & Trần Tiêu Thụ Token Bot Discord (Discord Bot Quota Enforcement & Token Ceiling Control)
- **Mã Yêu Cầu**: `FR-046`
- **Tên Yêu Cầu**: Kiểm Soát Hạn Ngạch & Trần Tiêu Thụ Token Bot Discord (Discord Bot Quota Enforcement & Token Ceiling Control).
- **Mô Tả**: Ràng buộc toàn bộ lưu lượng token tiêu thụ bởi Bot Discord vào hạn ngạch token hàng ngày (`user_quotas`) của tài khoản người dùng (`BR-032`), thiết lập giới hạn trần token tối đa cho mỗi phản hồi của Bot (`max_tokens_per_response`, từ 256 đến 2,048 tokens), và cung cấp công tắc bật/tắt khẩn cấp hoạt động của bot (`is_enabled`) (`OP-032`, `UC-BOT-003 [UC-034]`, `BP-BOT-002 [PROC-023]`).
- **Tác Nhân (Actor)**: `ACT-02` (Registered User có liên kết Discord).
- **Điều Kiện Tiên Quyết (Preconditions)**: Tài khoản đã liên kết Discord và có bản ghi hạn ngạch trong `user_quotas`.
- **Luồng Chính (Main Flow)**:
  1. Người dùng điều chỉnh thanh trượt "Giới hạn token mỗi câu trả lời" (ví dụ: 1,000 tokens) và gạt công tắc kích hoạt Bot.
  2. Client gửi cập nhật `PUT /api/v1/bot/discord/config`.
  3. Backend lưu giá trị `max_tokens_per_response` và `is_enabled` vào cơ sở dữ liệu.
  4. Khi có tin nhắn gửi tới Bot trên Discord, Bot worker kiểm tra số token còn lại trong `user_quotas` của người dùng (`BR-032`).
  5. Nếu token còn lại > 0 và `is_enabled = true`, Bot thực thi gọi LLM với `max_tokens` khống chế bởi cấu hình trần.
  6. Sau khi sinh câu trả lời, hệ thống tự động cộng dồn token sử dụng vào `user_quotas.daily_tokens_used`.
- **Luồng Ngoại Lệ (Exception Flow)**:
  - *EF-01*: Hạn ngạch token hàng ngày đã chạm 100% -> Bot lập tức chặn yêu cầu trên Discord, không gọi LLM và phản hồi tin nhắn cảnh báo: "Bạn đã dùng hết hạn ngạch token trong ngày. Vui lòng quay lại sau khi hạn ngạch được đặt lại lúc 00:00 UTC." (`BR-032`, `TC-041`).
  - *EF-02*: Bot đang bị tắt (`is_enabled = false`) -> Bot im lặng hoặc thông báo bot đang tạm dừng theo cấu hình của người dùng.
- **Điều Kiện Sau (Postconditions)**: Tài khoản không bị vượt hạn ngạch do tin nhắn Discord; trần token bảo vệ tài nguyên người dùng.
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-032`, `BR-020`, `BR-032`, `CTRL-008`, `CTRL-012`, `OP-032`, `UC-034`, `PROC-023`, `ADR-012`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `TC-041`.

---

### FR-047: Đồng Bộ Hội Thoại Giữa Discord & Web (Discord-to-Web Conversation Sync & History Tracking)
- **Mã Yêu Cầu**: `FR-047`
- **Tên Yêu Cầu**: Đồng Bộ Hội Thoại Giữa Discord & Web (Discord-to-Web Conversation Sync & History Tracking).
- **Mô Tả**: Cung cấp tùy chọn đồng bộ hóa tự động các phiên đàm thoại diễn ra trên Discord vào danh mục lịch sử hội thoại trên Web Chat (`conversations` và `messages` có đánh dấu nguồn gốc `channel_source = 'discord'`), cho phép người dùng xem lại toàn bộ nội dung đã trò chuyện với Bot Discord ngay trong không gian làm việc của website (`OP-032`, `UC-BOT-003 [UC-034]`).
- **Tác Nhân (Actor)**: `ACT-02` (Registered User có liên kết Discord).
- **Điều Kiện Tiên Quyết (Preconditions)**: Người dùng bật cờ `sync_to_web = true` trong cấu hình Bot Discord.
- **Luồng Chính (Main Flow)**:
  1. Người dùng bật tùy chọn "Đồng bộ tin nhắn Discord lên Web" trong tab Quản lý Bot.
  2. Khi người dùng đàm thoại với Bot trên Discord, Bot worker tự động tìm hoặc khởi tạo một cuộc trò chuyện trong bảng `conversations` với tiêu đề `[Discord] Trò chuyện máy chủ/DM`.
  3. Tin nhắn người dùng và câu trả lời của AI được ghi nhận vào bảng `messages` với `role = 'user'` và `role = 'assistant'`.
  4. Người dùng mở trang Web Chat (`/chat`) có thể thấy ngay luồng hội thoại từ Discord hiển thị đồng bộ trên Sidebar.
- **Luồng Ngoại Lệ (Exception Flow)**:
  - *EF-01*: Người dùng tắt tính năng đồng bộ (`sync_to_web = false`) -> Bot chỉ phản hồi trên Discord, không ghi nhận bản ghi vào bảng `conversations` (chỉ trừ token trong `user_quotas`).
- **Điều Kiện Sau (Postconditions)**: Ngữ cảnh đàm thoại được thống nhất liền mạch giữa nền tảng Discord và giao diện Web.
- **Độ Ưu Tiên**: `SHOULD`.
- **Trạng Thái**: `BASELINED`.
- **Phụ Thuộc (Dependencies)**: `FR-004`, `FR-005`, `FR-045`, `OP-032`, `UC-034`, `PROC-023`, `ADR-012`.
- **Tiêu Chí Nghiệm Thu Liên Quan**: `TC-039`.

---

### FR-048: Kiến Trúc Chế Độ Kép Workspace & Companion (Dual-Mode Hybrid Architecture)
- **Mã Yêu Cầu**: `FR-048`
- **Tên Yêu Cầu**: Kiến Trúc Chế Độ Kép Workspace & Companion (Dual-Mode Hybrid Architecture).
- **Mô Tả**: Cung cấp khả năng chuyển đổi tức thì giữa Workspace Mode (bố cục desktop tập trung hiệu suất) và Companion Mode (không gian 3D toàn cảnh tương tác nhân vật), bảo toàn 100% ngữ cảnh hội thoại, model đang chọn và nội dung đang nhập.
- **Tác Nhân (Actor)**: `ACT-01` (Guest), `ACT-02` (Registered User).
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### FR-049: Tích Hợp Mô Hình 3D VRM Thực Thụ (Real 3D VRM Rendering Engine)
- **Mã Yêu Cầu**: `FR-049`
- **Tên Yêu Cầu**: Tích Hợp Mô Hình 3D VRM Thực Thụ (Real 3D VRM Rendering Engine).
- **Mô Tả**: Khởi tạo WebGL Scene với Three.js và `@pixiv/three-vrm`, tải và render mô hình chuẩn `.vrm`, hỗ trợ chiếu sáng rim light anime, camera OrbitControls và giải phóng GPU khi unmount.
- **Tác Nhân (Actor)**: `ACT-01` (Guest), `ACT-02` (Registered User).
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### FR-050: Máy Trạng Thái Hoạt Họa & Đồng Bộ Luồng AI (Avatar Animation State Machine & AI Sync)
- **Mã Yêu Cầu**: `FR-050`
- **Tên Yêu Cầu**: Máy Trạng Thái Hoạt Họa & Đồng Bộ Luồng AI (Avatar Animation State Machine & AI Sync).
- **Mô Tả**: Quản lý độc lập vòng đời animation (`STATE-003`) gồm thở nhẹ, chớp mắt tự nhiên, tư thế nghỉ (resting pose), chuyển sang `thinking` khi user gửi prompt, `speaking` (lip-sync khẩu hình mở đóng) khi stream SSE token, và `success`/`error` khi hoàn tất.
- **Tác Nhân (Actor)**: `ACT-01` (Guest), `ACT-02` (Registered User).
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### FR-051: Hệ Thống Design System Anime Minimalism (Anime Minimalism Design System)
- **Mã Yêu Cầu**: `FR-051`
- **Tên Yêu Cầu**: Hệ Thống Design System Anime Minimalism (Anime Minimalism Design System).
- **Mô Tả**: Chuẩn hóa design tokens với bảng màu Background `#0E0F1B`, Surface `#171821`, Elevated `#1F1B2B`, Primary Lavender `#A78BFA`, viền mảnh tinh tế, typography sans-serif hiện đại và micro-animations dịu mắt.
- **Tác Nhân (Actor)**: `ACT-01` (Guest), `ACT-02` (Registered User).
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### FR-052: Panel Trạng Thái AI-Chan & Công Cụ Nhanh (AI-Chan Status Panel & Quick Tools)
- **Mã Yêu Cầu**: `FR-052`
- **Tên Yêu Cầu**: Panel Trạng Thái AI-Chan & Công Cụ Nhanh (AI-Chan Status Panel & Quick Tools).
- **Mô Tả**: Hiển thị bảng điều khiển nổi tích hợp thông số kỹ thuật (Model, Temperature, Max tokens, Token sparkline progress) kèm 4 công cụ nhanh (Code, Image, File, Web), có thể thu gọn để tối ưu diện tích.
- **Tác Nhân (Actor)**: `ACT-01` (Guest), `ACT-02` (Registered User).
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### FR-053: Sân Khấu 3D Companion Mode & Điều Khiển Camera (Companion 3D Stage & Controls)
- **Mã Yêu Cầu**: `FR-053`
- **Tên Yêu Cầu**: Sân Khấu 3D Companion Mode & Điều Khiển Camera (Companion 3D Stage & Controls).
- **Mô Tả**: Không gian 3D tương tác toàn cảnh đưa nhân vật AI-Chan vào trung tâm, tích hợp ngăn kéo hội thoại bán trong suốt có thể ẩn/hiện, thanh công cụ biểu cảm (Happy, Shy, Surprised, Blink) và khung soạn thảo tin nhắn nổi.
- **Tác Nhân (Actor)**: `ACT-01` (Guest), `ACT-02` (Registered User).
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `BASELINED`.

---

### FR-054: Động Cơ Hoạt Họa Nghỉ Tự Nhiên & Biến Thiên Idle (Intelligent VRM Idle Behavior Engine)
- **Mã Yêu Cầu**: `FR-054`
- **Tên Yêu Cầu**: Động Cơ Hoạt Họa Nghỉ Tự Nhiên & Biến Thiên Idle (Intelligent VRM Idle Behavior Engine).
- **Mô Tả**: Duy trì trạng thái sống động tự nhiên liên tục của mô hình VRM trong lúc chờ đợi: thở đa khớp tuần hoàn (`chest`, `spine`, `shoulders`), chớp mắt ngẫu nhiên có chặn (chu kỳ 2.8s - 5.5s, thời lượng 150ms), vi chuyển động đầu (pitch, yaw, roll dao động < 0.08 rad), trôi nhẹ tiêu điểm nhìn (gaze drift cone) định kỳ quay về camera, tư thế tay nghỉ tự nhiên (resting pose) và lập lịch các biến thiên idle (nghiêng đầu tò mò, gật đầu nhẹ, hít sâu, chuyển trọng tâm) tự động nhường quyền khi có hội thoại.
- **Tác Nhân (Actor)**: `ACT-01` (Guest), `ACT-02` (Registered User).
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `IMPLEMENTED`.
- **Phụ Thuộc (Dependencies)**: `FR-049`, `FR-050`, `BR-035`, `ADR-013`.

---

### FR-055: Biên Đạo Cử Chỉ Ngữ Cảnh Theo Phản Hồi AI (Contextual AI Response Gesture Choreography)
- **Mã Yêu Cầu**: `FR-055`
- **Tên Yêu Cầu**: Biên Đạo Cử Chỉ Ngữ Cảnh Theo Phản Hồi AI (Contextual AI Response Gesture Choreography).
- **Mô Tả**: Tự động chuyển đổi nội dung phản hồi hoàn tất của AI thành kế hoạch hành vi (`CharacterBehaviorPlan`) dựa trên phân loại ý định cục bộ (greeting, explanation, confirmation, question, celebration, apology, comfort, warning, error, neutral). Kích hoạt cử chỉ procedural nửa thân trên (vẫy tay, mở tay giải thích, cúi chào lịch thiệp, gật đầu khẳng định, nghiêng đầu thắc mắc) kết hợp blend-in (300ms), hold, và blend-out (400ms) trả về tư thế nghỉ êm ái mà không gây xung đột khớp xương hay ngắt quãng hội thoại.
- **Tác Nhân (Actor)**: `ACT-01` (Guest), `ACT-02` (Registered User).
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `IMPLEMENTED`.
- **Phụ Thuộc (Dependencies)**: `FR-050`, `FR-054`, `BR-035`, `ADR-013`.

---

### FR-056: Động Cơ Biến Thiên Chống Lặp Cử Chỉ (Non-Repetitive Action Variation Engine)
- **Mã Yêu Cầu**: `FR-056`
- **Tên Yêu Cầu**: Động Cơ Biến Thiên Chống Lặp Cử Chỉ (Non-Repetitive Action Variation Engine).
- **Mô Tả**: Ngăn chặn tình trạng lặp lại cử chỉ đơn điệu nhàm chán bằng cách quản lý lịch sử gần nhất (cỡ 5), áp dụng hệ số phạt cử chỉ vừa thực hiện (chiết khấu trọng số xuống 0.3x và 0.15x cho hành động liền kề), kiểm tra thời gian hồi chiêu (cooldown 8s), sàng lọc danh sách xương/biểu cảm khả dụng của mô hình, và chọn lọc ngẫu nhiên theo trọng số (hỗ trợ PRNG Seed deterministic cho kiểm thử tự động).
- **Tác Nhân (Actor)**: `ACT-01` (Guest), `ACT-02` (Registered User).
- **Độ Ưu Tiên**: `MUST`.
- **Trạng Thái**: `IMPLEMENTED`.
- **Phụ Thuộc (Dependencies)**: `FR-054`, `FR-055`, `ADR-013`.
