# ĐẶC TẢ LUỒNG QUY TRÌNH NGHIỆP VỤ CHI TIẾT (PROCESS FLOW SPECIFICATIONS)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `BP-FLOW-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Mô tả chi tiết từng bước thực thi nghiệp vụ cho 10 quy trình hệ thống, bao gồm Luồng chính (Main Flow), Các điểm quyết định logic (Decision Points), Luồng thay thế (Alternative Flows) và Trạng thái kết thúc |

---

## 1. BP-AUTH-001 [PROC-001]: Đăng Ký Tài Khoản Người Dùng Mới

### 1.1 Luồng Chính (Main Flow)
1. **Khởi tạo**: Người dùng (`ACT-01`) truy cập trang Đăng ký (`/register`) trên trình duyệt web.
2. **Nhập liệu**: Người dùng điền Họ tên (`full_name`), Địa chỉ email (`email`), Mật khẩu (`password`).
3. **Thao tác**: Người dùng nhấn nút "Đăng ký tài khoản".
4. **Kiểm tra sơ bộ**: Giao diện Client kiểm tra tính đầy đủ và định dạng hợp lệ của email và mật khẩu (ít nhất 6 ký tự).
5. **Gửi yêu cầu**: Client gửi yêu cầu `POST /api/v1/auth/register` qua Ingress Gateway tới Backend.
6. **Kiểm tra an ninh**: Ingress và Backend kiểm tra tần suất gọi API (`BP-SEC-001`).
7. **Thẩm định dữ liệu**: Backend xác thực schema bằng Pydantic; kiểm tra sự tồn tại của email trong CSDL (`D-AUTH-01`).
8. **Mã hóa an toàn**: Backend thực hiện băm mật khẩu bằng thuật toán `bcrypt` (`SEC-002`).
9. **Lưu trữ**: Backend ghi nhận bản ghi người dùng mới vào bảng `users` với trạng thái `ACTIVE`.
10. **Phản hồi**: Backend trả về mã thành công `HTTP 201 Created` kèm thông tin tài khoản (loại bỏ trường mật khẩu).
11. **Kết thúc**: Frontend hiển thị thông báo "Đăng ký thành công!" và tự động chuyển hướng người dùng sang trang Đăng nhập (`/login`).

### 1.2 Điểm Quyết Định (Decision Points)
- **`D-AUTH-01` (Email đã tồn tại?)**:
  - *Điều kiện*: Truy vấn CSDL `SELECT id FROM users WHERE email = :email`.
  - *Nếu CÓ (True)*: Rẽ sang Luồng thay thế `AF-AUTH-01A` (Báo lỗi email đã được đăng ký).
  - *Nếu KHÔNG (False)*: Tiếp tục bước 8 (Băm mật khẩu và lưu trữ).
- **`D-AUTH-02` (Mật khẩu thỏa mãn độ dài tối thiểu?)**:
  - *Nếu KHÔNG (False)*: Rẽ sang Luồng thay thế `AF-AUTH-01B` (Báo lỗi độ dài mật khẩu).

### 1.3 Luồng Thay Thế & Rẽ Nhánh (Alternative Flows)
- **`AF-AUTH-01A` (Email đã được sử dụng)**:
  - Backend trả về mã lỗi `HTTP 400 Bad Request` với thông điệp: `"Email đã được đăng ký trong hệ thống."`.
  - Frontend hiển thị cảnh báo đỏ ngay bên dưới ô nhập email; giữ nguyên các trường thông tin để người dùng điều chỉnh.
- **`AF-AUTH-01B` (Dữ liệu đầu vào không hợp lệ)**:
  - Nếu email sai định dạng RFC hoặc mật khẩu dưới 6 ký tự -> Backend trả về `HTTP 422 Unprocessable Entity`.
  - Frontend highlight các trường vi phạm và yêu cầu sửa lại.

### 1.4 Trạng Thái Kết Thúc (Final State)
- **Thành công**: Tài khoản mới được khởi tạo bền vững (`User.status = ACTIVE`); chưa phát hành phiên làm việc (người dùng cần đăng nhập).
- **Thất bại**: Không có dữ liệu nào được ghi vào CSDL; hiển thị thông báo lỗi rõ ràng.

---

## 2. BP-AUTH-002 [PROC-002]: Đăng Nhập & Thiết Lập Phiên Làm Việc

### 2.1 Luồng Chính (Main Flow)
1. **Khởi tạo**: Người dùng (`ACT-01`) truy cập trang Đăng nhập (`/login`).
2. **Nhập liệu**: Người dùng nhập `email` và `password`.
3. **Thao tác**: Người dùng nhấn nút "Đăng nhập".
4. **Gửi yêu cầu**: Client gửi yêu cầu `POST /api/v1/auth/login` tới Backend.
5. **Kiểm tra an ninh**: Hệ thống kiểm tra Rate Limit (`BP-SEC-001`).
6. **Truy vấn tài khoản**: Backend tìm kiếm bản ghi người dùng theo `email`.
7. **Kiểm tra thông tin đăng nhập**: Backend đối chiếu mật khẩu gửi lên với mật khẩu băm đã lưu (`D-AUTH-03`).
8. **Kiểm tra trạng thái tài khoản**: Backend xác nhận trạng thái tài khoản đang hoạt động (`D-AUTH-04`).
9. **Cấp phát phiên**: Backend ký tạo mã JWT Access Token có thời hạn 7 ngày (`NFR-006`) chứa thông tin `sub = user.id`.
10. **Thiết lập Cookie**: Backend đóng gói Token vào Cookie phản hồi với các cờ bảo mật: `HttpOnly`, `SameSite=Lax`, `Secure` (`SEC-004`).
11. **Phản hồi**: Backend trả về `HTTP 200 OK` kèm thông tin hồ sơ cơ bản (`id`, `email`, `full_name`).
12. **Kết thúc**: Frontend cập nhật trạng thái người dùng sang `ACT-02` và chuyển hướng vào trang chính (`/chat`).

### 2.2 Điểm Quyết Định (Decision Points)
- **`D-AUTH-03` (Thông tin đăng nhập chính xác?)**:
  - *Nếu SAI*: Rẽ sang Luồng thay thế `AF-AUTH-02A` (Báo lỗi sai email hoặc mật khẩu).
  - *Nếu ĐÚNG*: Tiếp tục bước 8.
- **`D-AUTH-04` (Tài khoản đang hoạt động?)**:
  - *Nếu KHÔNG*: Rẽ sang Luồng thay thế `AF-AUTH-02B` (Báo lỗi tài khoản bị khóa/vô hiệu hóa).

### 2.3 Luồng Thay Thế (Alternative Flows)
- **`AF-AUTH-02A` (Sai email hoặc mật khẩu)**:
  - Backend trả về mã lỗi `HTTP 401 Unauthorized` với thông điệp trung tính: `"Email hoặc mật khẩu không chính xác."` (chống lộ thông tin tài khoản - User Enumeration).
  - Frontend hiển thị thông báo lỗi; người dùng thử lại.
- **`AF-AUTH-02B` (Tài khoản bị vô hiệu hóa)**:
  - Backend trả về mã lỗi `HTTP 403 Forbidden` với thông điệp: `"Tài khoản hiện đang bị tạm khóa. Vui lòng liên hệ quản trị viên."`.

### 2.4 Trạng Thái Kết Thúc (Final State)
- **Thành công**: Trình duyệt lưu Cookie phiên an toàn; người dùng ở trạng thái đăng nhập hợp lệ.
- **Thất bại**: Không phát hành Cookie; yêu cầu người dùng nhập lại thông tin.

---

## 3. BP-AUTH-003 [PROC-003]: Đăng Xuất & Hủy Bỏ Phiên Làm Việc

### 3.1 Luồng Chính (Main Flow)
1. **Khởi tạo**: Người dùng (`ACT-02`) đang làm việc tại trang `/chat` và bấm nút "Đăng xuất".
2. **Gửi yêu cầu**: Frontend gửi yêu cầu `POST /api/v1/auth/logout` kèm Cookie phiên hiện tại.
3. **Thu hồi phiên**: Backend tiếp nhận yêu cầu, thiết lập tiêu đề phản hồi `Set-Cookie: access_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`.
4. **Phản hồi**: Backend trả về `HTTP 200 OK` với thông báo `"Đăng xuất thành công"`.
5. **Dọn dẹp Client**: Frontend xóa bỏ toàn bộ dữ liệu trạng thái bộ nhớ đệm của người dùng.
6. **Kết thúc**: Trình duyệt điều hướng người dùng về trang Đăng nhập (`/login`).

### 3.2 Điểm Quyết Định (Decision Points)
- **`D-AUTH-05` (Cookie có tồn tại không?)**:
  - Dù Cookie có còn hợp lệ hay đã hết hạn, Backend vẫn thực hiện lệnh xóa Cookie (`Idempotent`) để bảo đảm an toàn tuyệt đối.

### 3.3 Trạng Thái Kết Thúc (Final State)
- **Thành công**: Trình duyệt xóa bỏ hoàn toàn Access Token; phiên bị vô hiệu hóa; người dùng quay về trạng thái `ACT-01` (Guest).

---

## 4. BP-CONV-001 [PROC-004]: Khởi Tạo Cuộc Trò Chuyện Mới

### 4.1 Luồng Chính (Main Flow)
1. **Khởi tạo**: Người dùng (`ACT-02`) nhấn nút "+ Đoạn chat mới" trên thanh Sidebar.
2. **Gửi yêu cầu**: Frontend gửi `POST /api/v1/conversations` kèm Cookie phiên.
3. **Xác thực quyền**: Backend giải mã JWT từ Cookie để trích xuất `current_user_id` (`D-CONV-01`).
4. **Tạo thực thể**: Backend khởi tạo bản ghi mới trong bảng `conversations`:
   - `id`: UUID tự sinh.
   - `user_id`: `current_user_id`.
   - `title`: `"Cuộc trò chuyện mới"` (`BR-004`).
   - `created_at`, `updated_at`: Thời gian hiện tại.
5. **Lưu trữ**: Backend commit transaction vào PostgreSQL.
6. **Phản hồi**: Backend trả về `HTTP 201 Created` kèm thực thể cuộc trò chuyện vừa tạo.
7. **Cập nhật giao diện**: Frontend chèn cuộc trò chuyện mới lên đầu danh sách Sidebar, kích hoạt active trạng thái cuộc trò chuyện này, và làm sạch khung chat sẵn sàng nhận câu hỏi.

### 4.2 Điểm Quyết Định (Decision Points)
- **`D-CONV-01` (Phiên làm việc còn hiệu lực?)**:
  - *Nếu KHÔNG*: Backend từ chối với `HTTP 401 Unauthorized`; Frontend điều hướng người dùng về `/login`.
  - *Nếu CÓ*: Tiếp tục bước 4.

### 4.3 Trạng Thái Kết Thúc (Final State)
- **Thành công**: Cuộc trò chuyện mới được tạo lập gắn chặt với `user_id`; trạng thái `Conversation.status = ACTIVE`.
- **Thất bại**: Không có cuộc trò chuyện nào được tạo; thông báo lỗi mạng nếu mất kết nối.

---

## 5. BP-CONV-002 [PROC-005]: Truy Xuất Danh Sách & Lịch Sử Cuộc Trò Chuyện

### 5.1 Luồng Chính (Main Flow)
1. **Khởi tạo**: Người dùng truy cập trang `/chat` hoặc nhấn chọn một cuộc trò chuyện trên Sidebar.
2. **Tải danh mục**: Frontend gửi `GET /api/v1/conversations`.
3. **Xác thực & Lọc dữ liệu**: Backend xác thực JWT và truy vấn CSDL: `SELECT * FROM conversations WHERE user_id = :current_user_id ORDER BY updated_at DESC`.
4. **Hiển thị danh mục**: Frontend render danh sách cuộc trò chuyện trên Sidebar.
5. **Tải chi tiết (Khi chọn 1 cuộc trò chuyện)**: Frontend gửi `GET /api/v1/conversations/{conv_id}/messages`.
6. **Kiểm tra quyền sở hữu**: Backend kiểm tra cuộc trò chuyện có thuộc về `current_user_id` không (`D-CONV-02` - thực thi `BR-002`).
7. **Truy vấn tin nhắn**: Backend truy vấn danh sách tin nhắn: `SELECT * FROM messages WHERE conversation_id = :conv_id ORDER BY created_at ASC`.
8. **Phản hồi**: Backend trả về `HTTP 200 OK` kèm danh sách tin nhắn.
9. **Kết thúc**: Frontend hiển thị toàn bộ lịch sử trò chuyện trên màn hình chính theo đúng thứ tự thời gian.

### 5.2 Điểm Quyết Định (Decision Points)
- **`D-CONV-02` (Cuộc trò chuyện thuộc về người dùng hiện tại?)**:
  - *Nếu KHÔNG (hoặc không tồn tại)*: Rẽ sang Luồng thay thế `AF-CONV-02A` (Từ chối truy cập / IDOR Protection).
  - *Nếu ĐÚNG*: Tiếp tục bước 7.

### 5.3 Luồng Thay Thế (Alternative Flows)
- **`AF-CONV-02A` (Truy cập trái phép vào cuộc trò chuyện của người khác)**:
  - Backend lập tức trả về mã lỗi `HTTP 404 Not Found` hoặc `HTTP 403 Forbidden` (`BR-002`).
  - Ghi nhận cảnh báo an ninh vào hệ thống log máy chủ.
  - Frontend hiển thị thông báo: `"Không tìm thấy cuộc trò chuyện hoặc bạn không có quyền truy cập."`.

### 5.4 Trạng Thái Kết Thúc (Final State)
- **Thành công**: Hiển thị chính xác và đầy đủ các tin nhắn của cuộc trò chuyện được chọn mà không làm rò rỉ dữ liệu của tài khoản khác.

---

## 6. BP-CONV-003 [PROC-006]: Đổi Tên Cuộc Trò Chuyện (Tự Động / Thủ Công)

### 6.1 Nhánh A: Đổi Tên Tự Động (Automatic Title Derivation - BR-004)
1. **Kích hoạt**: Được gọi nội bộ trong `BP-CHAT-001` khi tin nhắn đầu tiên của người dùng được gửi thành công.
2. **Kiểm tra điều kiện**: Backend kiểm tra tiêu đề hiện tại của cuộc trò chuyện (`D-CONV-03`).
3. **Trích xuất**: Nếu tiêu đề là `"Cuộc trò chuyện mới"`, Backend cắt lấy tối đa 30 ký tự đầu tiên của tin nhắn (`user_prompt[:30].strip()`).
4. **Cập nhật**: Backend cập nhật trường `title` vào bảng `conversations`.
5. **Đồng bộ**: Trả về tiêu đề mới cho Client để cập nhật tức thì trên Sidebar.

### 6.2 Nhánh B: Đổi Tên Thủ Công (Manual Rename)
1. **Kích hoạt**: Người dùng nhấn vào biểu tượng "Sửa tên" bên cạnh cuộc trò chuyện trên Sidebar.
2. **Nhập liệu**: Người dùng nhập tên mới (1 - 255 ký tự) và nhấn phím Enter hoặc nút Lưu.
3. **Gửi yêu cầu**: Frontend gửi `PATCH /api/v1/conversations/{conv_id}` kèm `{ "title": "Tên mới" }`.
4. **Kiểm tra quyền sở hữu**: Backend kiểm tra `user_id == current_user_id` (`BR-002`).
5. **Cập nhật CSDL**: Backend cập nhật `conversations.title = new_title, updated_at = NOW()`.
6. **Phản hồi**: Backend trả về `HTTP 200 OK`.
7. **Đồng bộ**: Frontend cập nhật tên hiển thị trên Sidebar.

### 6.3 Điểm Quyết Định (Decision Points)
- **`D-CONV-03` (Tiêu đề hiện tại có phải tiêu đề mặc định không?)**:
  - *Nếu ĐÚNG*: Tiến hành đổi tên tự động theo `BR-004`.
  - *Nếu KHÔNG (Người dùng đã đặt tên thủ công)*: Giữ nguyên, không ghi đè tự động.

---

## 7. BP-CONV-004 [PROC-007]: Xóa Cuộc Trò Chuyện & Dữ Liệu Liên Quan

### 7.1 Luồng Chính (Main Flow)
1. **Khởi tạo**: Người dùng (`ACT-02`) nhấn nút "Xóa" bên cạnh cuộc trò chuyện trên Sidebar.
2. **Xác nhận**: Giao diện hiển thị hộp thoại xác nhận: `"Bạn có chắc chắn muốn xóa cuộc trò chuyện này không?"`.
3. **Đồng ý**: Người dùng bấm "Xác nhận xóa".
4. **Gửi yêu cầu**: Frontend gửi `DELETE /api/v1/conversations/{conv_id}` tới Backend.
5. **Kiểm tra quyền sở hữu**: Backend xác thực quyền sở hữu cuộc trò chuyện thông qua `user_id` (`BR-002`).
6. **Thực thi xóa**: Backend thực hiện xóa cuộc trò chuyện và các tin nhắn liên quan trong CSDL.
7. **Phản hồi**: Backend trả về `HTTP 200 OK` (hoặc `HTTP 204 No Content`).
8. **Cập nhật giao diện**: Frontend xóa cuộc trò chuyện khỏi danh sách Sidebar; nếu cuộc trò chuyện đang mở bị xóa, giao diện tự động chuyển sang cuộc trò chuyện gần nhất hoặc hiển thị khung chat trống.

### 7.2 Điểm Quyết Định (Decision Points)
- **`D-CONV-04` (Người dùng xác nhận hủy hay xóa?)**:
  - *Nếu HỦY*: Đóng hộp thoại, không gửi yêu cầu đến máy chủ.
  - *Nếu XÁC NHẬN*: Tiếp tục bước 4.

---

## 8. BP-CHAT-001 [PROC-008]: Gửi Tin Nhắn & Tương Tác Đàm Thoại

### 8.1 Luồng Chính (Main Flow)
1. **Khởi tạo**: Người dùng (`ACT-02`) nhập câu hỏi vào ô nhập liệu và nhấn phím Enter (hoặc bấm biểu tượng Gửi).
2. **Xác thực Client**: Frontend kiểm tra nội dung không được rỗng và độ dài <= 4,000 ký tự (`BR-003`).
3. **Hiển thị tức thời (Optimistic UI)**: Frontend hiển thị ngay tin nhắn của người dùng trong khung chat với trạng thái "Đang gửi".
4. **Gửi yêu cầu**: Frontend mở kết nối HTTP POST tới endpoint chat streaming: `POST /api/v1/chat/conversations/{conv_id}/stream`.
5. **Kiểm tra an ninh**: Hệ thống kiểm tra Rate Limiting (`BP-SEC-001`).
6. **Xác thực Server**: Backend kiểm tra tính hợp lệ của Cookie (`BR-001`), quyền sở hữu cuộc trò chuyện (`BR-002`) và độ dài tin nhắn (`BR-003`).
7. **Lưu tin nhắn người dùng**: Backend lưu bản ghi tin nhắn của người dùng vào bảng `messages` (`role = user`).
8. **Đổi tên tự động nếu cần**: Nếu là tin nhắn đầu tiên, kích hoạt `BP-CONV-003` để cập nhật tiêu đề (`BR-004`).
9. **Chuẩn bị ngữ cảnh**: Backend nạp lịch sử các tin nhắn gần nhất của cuộc trò chuyện để tạo prompt ngữ cảnh cho AI.
10. **Gọi điều phối AI**: Backend chuyển giao ngữ cảnh cho `BP-AI-001 [PROC-009]` (`LLMManager`).
11. **Khởi tạo luồng SSE**: Backend thiết lập tiêu đề phản hồi `Content-Type: text/event-stream; Cache-Control: no-cache`.
12. **Truyền luồng dữ liệu (Streaming)**:
    - Khi nhận được từng token từ mô hình AI, Backend đẩy ngay một event SSE: `data: {"token": "...", "status": "streaming"}\n\n`.
    - Frontend nhận từng event, cập nhật liên tục câu trả lời của Trợ lý ảo lên màn hình.
13. **Kết thúc truyền luồng**:
    - AI hoàn tất câu trả lời -> Backend đẩy event kết thúc: `data: {"status": "done"}\n\n`.
14. **Lưu trữ phản hồi**: Backend gom toàn bộ chuỗi phản hồi hoàn chỉnh và lưu vào bảng `messages` (`role = assistant`).
15. **Kết thúc**: Frontend chuyển trạng thái tin nhắn sang hoàn thành và render định dạng Markdown/mã nguồn đẹp mắt (`FR-013`).

### 8.2 Điểm Quyết Định (Decision Points)
- **`D-CHAT-01` (Nội dung tin nhắn hợp lệ theo BR-003?)**:
  - *Nếu KHÔNG (Rỗng hoặc > 4,000 ký tự)*: Frontend chặn ngay, Backend trả về `HTTP 422 Unprocessable Entity`.
  - *Nếu HỢP LỆ*: Tiếp tục xử lý.
- **`D-CHAT-02` (Người dùng có bấm nút "Dừng tạo phản hồi" - Stop Generation?)**:
  - *Nếu CÓ*: Frontend đóng kết nối SSE, Backend hủy tác vụ stream và lưu lại phần nội dung đã trả về tính đến thời điểm dừng.

### 8.3 Trạng Thái Kết Thúc (Final State)
- **Thành công**: Cả tin nhắn người dùng và tin nhắn phản hồi của trợ lý ảo được lưu trữ bền vững; giao diện hiển thị câu trả lời hoàn chỉnh.
- **Thất bại**: Hiển thị thông báo lỗi thân thiện trên khung chat kèm nút "Thử lại".

---

## 9. BP-AI-001 [PROC-009]: Điều Phối AI & Tự Động Chuyển Vùng Dự Phòng

### 9.1 Luồng Chính (Main Flow)
1. **Tiếp nhận**: `LLMManager` tiếp nhận yêu cầu từ `BP-CHAT-001` gồm prompt người dùng, ngữ cảnh và tùy chọn mô hình.
2. **Xác định nhà cung cấp chính**: Mặc định chọn `Google Gemini Provider` (`BR-005`).
3. **Khởi tạo kết nối**: Gửi yêu cầu stream tới Google Gemini API kèm thiết lập timeout 30 giây (`NFR-008`).
4. **Giám sát phản hồi**:
   - `LLMManager` lắng nghe gói dữ liệu đầu tiên từ Gemini trong vòng 30 giây (`D-AI-01`).
5. **Nhánh Chính Thành Công**:
   - Gemini phản hồi luồng token bình thường -> `LLMManager` chuyển tiếp trực tiếp token sang tiến trình SSE của `BP-CHAT-001`.
6. **Hoàn tất**: Gemini hoàn thành việc sinh nội dung, kết thúc tác vụ.

### 9.2 Điểm Quyết Định & Cơ Chế Chuyển Vùng (Failover Logic)
- **`D-AI-01` (Gemini gặp sự cố không thể phục hồi?)**:
  - *Các điều kiện kích hoạt Failover*:
    - Lỗi HTTP 429: Hết quota hoặc bị giới hạn tần suất từ Google Gemini.
    - Lỗi HTTP 5xx: Máy chủ Google gặp sự cố gián đoạn dịch vụ.
    - Lỗi Timeout: Quá 30 giây không nhận được phản hồi.
    - Lỗi Mạng: Không thể thiết lập kết nối tới Google API.
  - *Nếu GẶP SỰ CỐ*: Rẽ sang Luồng chuyển vùng dự phòng `AF-AI-01 (Failover sang OpenAI)`.
  - *Nếu BÌNH THƯỜNG*: Tiếp tục luồng chính.

### 9.3 Luồng Thay Thế / Chuyển Vùng Dự Phòng (Alternative Failover Flow)
- **`AF-AI-01` (Tự động kích hoạt OpenAI Fallback)**:
  1. `LLMManager` bắt ngoại lệ lỗi từ Gemini, ghi nhận cảnh báo vào log: `[WARN] Gemini failed (Status: ...). Activating OpenAI fallback.`.
  2. `LLMManager` tự động khởi tạo kết nối tới nhà cung cấp phụ `OpenAI Provider` (sử dụng model cấu hình như `gpt-4o-mini`).
  3. Gửi lại prompt và ngữ cảnh tới OpenAI API.
  4. Tiếp nhận luồng stream từ OpenAI và trả tiếp về cho người dùng.
  5. Đánh dấu cờ nguồn phản hồi: `provider = "openai"` để ghi log giám sát.
- **`AF-AI-02` (Cả hai nhà cung cấp đều thất bại)**:
  1. Nếu OpenAI cũng gặp lỗi hoặc hết hạn ngạch -> `LLMManager` bắt ngoại lệ cuối cùng.
  2. Trả về thông điệp lỗi hệ thống thân thiện dạng SSE: `"Xin lỗi, hiện tại toàn bộ các dịch vụ AI đều đang bận hoặc quá tải. Vui lòng thử lại sau ít phút."`.
  3. Không làm crash tiến trình Backend.

---

## 10. BP-SEC-001 [PROC-010]: Kiểm Soát Tần Suất Yêu Cầu 2 Tầng

### 10.1 Luồng Chính (Main Flow)
1. **Tiếp nhận kết nối**: Yêu cầu HTTP từ Client chạm vào Ingress Gateway (Nginx).
2. **Kiểm tra Tầng 1 (Ingress Layer)**:
   - Nginx kiểm tra định mức `limit_req_zone` theo Client IP (`D-SEC-01`).
   - Định mức: Tối đa 10 request/giây trên mỗi IP (`NFR-007`).
   - *Nếu vượt định mức*: Nginx chặn đứng và trả về ngay `HTTP 429 Too Many Requests`.
3. **Chuyển tiếp**: Nếu đạt yêu cầu Tầng 1, Ingress proxy yêu cầu tới Backend FastAPI.
4. **Kiểm tra Tầng 2 (Application Layer)**:
   - Middleware kiểm tra bộ đếm trượt (Sliding Window) trong bộ nhớ: Tối đa 60 request/phút trên mỗi Client IP (`D-SEC-02`).
   - *Nếu vượt định mức*: FastAPI nâng ngoại lệ `HTTPException(status_code=429)` kèm tiêu đề `Retry-After: 60`.
5. **Chấp thuận**: Nếu nằm trong định mức, yêu cầu được cấp phép đi tiếp vào Controller xử lý nghiệp vụ.

### 10.2 Điểm Quyết Định (Decision Points)
- **`D-SEC-01` (Yêu cầu vượt quá 10 req/s tại Ingress?)**:
  - *Nếu CÓ*: Chặn tại Gateway, trả về mã lỗi 429.
  - *Nếu KHÔNG*: Chuyển tiếp tới Backend.
- **`D-SEC-02` (Yêu cầu vượt quá 60 req/phút tại Backend?)**:
  - *Nếu CÓ*: Chặn tại Middleware, trả về mã lỗi 429.
  - *Nếu KHÔNG*: Cho phép thực thi nghiệp vụ.
