# TIÊU CHÍ CHẤP NHẬN CA SỬ DỤNG (USE CASE ACCEPTANCE CRITERIA)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `UC-AC-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Đặc tả chi tiết các tiêu chí kiểm chứng (Acceptance Criteria) theo định dạng Given-When-Then cho từng Ca sử dụng của hệ thống, làm căn cứ nghiệm thu và thiết kế ca kiểm thử (Test Cases ở Phase 12) |

---

## 1. Tiêu Chí Chấp Nhận Phân Hệ Xác Thực & Định Danh (Authentication)

---

### 1.1 UC-AUTH-001 [UC-001]: Đăng Ký Tài Khoản Mới (AC-001)

#### Kịch bản 1.1A: Đăng ký thành công với thông tin hợp lệ
- **Given**: Khách vãng lai (`ACT-01`) đang ở trang `/register` và địa chỉ email `"user@example.com"` chưa từng tồn tại trong hệ thống.
- **When**: Người dùng nhập đầy đủ họ tên, email `"user@example.com"` và mật khẩu `"SecurePass123!"` (độ dài >= 6) rồi nhấn nút "Đăng ký".
- **Then**: Hệ thống tạo bản ghi người dùng mới với mật khẩu được băm bằng thuật toán `bcrypt` (`SEC-002`), hiển thị thông báo "Đăng ký thành công!" và tự động chuyển hướng người dùng sang trang `/login`.

#### Kịch bản 1.1B: Báo lỗi khi email đã được sử dụng
- **Given**: Khách vãng lai đang ở trang `/register` và email `"existing@example.com"` đã được đăng ký trước đó.
- **When**: Người dùng nhập email `"existing@example.com"` và gửi form đăng ký.
- **Then**: Hệ thống từ chối tạo tài khoản, không làm thay đổi CSDL, và hiển thị thông báo lỗi rõ ràng: "Email đã được đăng ký trong hệ thống."

#### Kịch bản 1.1C: Báo lỗi khi mật khẩu không đủ độ dài tối thiểu
- **Given**: Khách vãng lai đang ở trang `/register`.
- **When**: Người dùng nhập mật khẩu dưới 6 ký tự (ví dụ: `"12345"`) và bấm Đăng ký.
- **Then**: Hệ thống chặn yêu cầu ngay tại giao diện và hiển thị thông báo lỗi: "Mật khẩu phải chứa ít nhất 6 ký tự."

---

### 1.2 UC-AUTH-002 [UC-002]: Đăng Nhập Hệ Thống (AC-002)

#### Kịch bản 1.2A: Đăng nhập thành công và thiết lập Cookie phiên an toàn
- **Given**: Người dùng đã có tài khoản hợp lệ với email `"user@example.com"` và mật khẩu `"SecurePass123!"`, tài khoản ở trạng thái `ACTIVE`.
- **When**: Người dùng nhập chính xác email và mật khẩu tại trang `/login` rồi nhấn nút "Đăng nhập".
- **Then**: Hệ thống xác thực thành công, phát hành JWT Access Token có thời hạn 7 ngày, đóng gói token vào Cookie phản hồi với các cờ `HttpOnly`, `SameSite=Lax`, `Secure` (`SEC-004`), và chuyển hướng người dùng vào giao diện `/chat`.

#### Kịch bản 1.2B: Từ chối đăng nhập khi sai thông tin xác thực
- **Given**: Người dùng ở trang `/login`.
- **When**: Người dùng nhập sai email hoặc sai mật khẩu rồi nhấn nút "Đăng nhập".
- **Then**: Hệ thống từ chối đăng nhập với mã `HTTP 401 Unauthorized`, không cấp phát Cookie phiên, và hiển thị thông điệp trung tính: "Email hoặc mật khẩu không chính xác."

#### Kịch bản 1.2C: Từ chối đăng nhập khi tài khoản bị khóa
- **Given**: Tài khoản người dùng có trạng thái `DISABLED`.
- **When**: Người dùng nhập đúng email và mật khẩu rồi nhấn nút "Đăng nhập".
- **Then**: Hệ thống từ chối với mã `HTTP 403 Forbidden` và hiển thị thông báo: "Tài khoản hiện đang bị tạm khóa. Vui lòng liên hệ quản trị viên."

---

### 1.3 UC-AUTH-003 [UC-003]: Đăng Xuất Khỏi Hệ Thống (AC-002)

#### Kịch bản 1.3A: Đăng xuất thành công và thu hồi phiên làm việc
- **Given**: Người dùng (`ACT-02`) đang đăng nhập hợp lệ và ở giao diện `/chat`.
- **When**: Người dùng nhấn nút "Đăng xuất" trên menu.
- **Then**: Hệ thống gửi lệnh xóa Cookie phiên (`Max-Age=0`), giải phóng trạng thái người dùng tại trình duyệt, và chuyển hướng người dùng về trang `/login`. Mọi yêu cầu API bảo mật tiếp theo sẽ bị từ chối với lỗi `HTTP 401`.

---

## 2. Tiêu Chí Chấp Nhận Phân Hệ Quản Lý Cuộc Trò Chuyện (Conversation)

---

### 2.1 UC-CONV-001 [UC-004]: Khởi Tạo Cuộc Trò Chuyện Mới (AC-003)

#### Kịch bản 2.1A: Tạo cuộc trò chuyện mới với tiêu đề mặc định
- **Given**: Người dùng (`ACT-02`) đã đăng nhập hợp lệ và đang mở giao diện chat.
- **When**: Người dùng nhấn nút "+ Đoạn chat mới" trên thanh Sidebar.
- **Then**: Hệ thống tạo một bản ghi cuộc trò chuyện mới gắn liền với `user_id` của người dùng, đặt tiêu đề mặc định là `"Cuộc trò chuyện mới"` (`BR-004`), cập nhật cuộc trò chuyện lên đầu danh sách Sidebar và làm mới khung chat sẵn sàng nhận tin nhắn.

---

### 2.2 UC-CONV-002 [UC-005]: Xem Lịch Sử Hội Thoại (AC-003)

#### Kịch bản 2.2A: Hiển thị danh sách cuộc trò chuyện theo thứ tự thời gian
- **Given**: Người dùng đã đăng nhập và đã tạo nhiều cuộc trò chuyện trước đây.
- **When**: Người dùng truy cập trang `/chat`.
- **Then**: Sidebar hiển thị danh sách các cuộc trò chuyện của chính người dùng, sắp xếp giảm dần theo thời gian cập nhật gần nhất (`updated_at DESC`), không hiển thị cuộc trò chuyện của người khác (`BR-002`).

#### Kịch bản 2.2B: Chống rò rỉ dữ liệu truy cập trái phép (Anti-IDOR)
- **Given**: Người dùng A đang đăng nhập hợp lệ. Cuộc trò chuyện `conv_xyz` thuộc quyền sở hữu của Người dùng B.
- **When**: Người dùng A cố tình gửi yêu cầu đọc tin nhắn của `conv_xyz`.
- **Then**: Hệ thống từ chối yêu cầu với mã `HTTP 404 Not Found` hoặc `HTTP 403 Forbidden` (`BR-002`), không trả về bất kỳ tin nhắn nào và ghi nhận cảnh báo an ninh vào hệ thống log.

---

### 2.3 UC-CONV-003 [UC-006]: Đổi Tên Cuộc Trò Chuyện (AC-003)

#### Kịch bản 2.3A: Đổi tên tự động sau tin nhắn đầu tiên (BR-004)
- **Given**: Cuộc trò chuyện mới được tạo và đang mang tiêu đề mặc định `"Cuộc trò chuyện mới"`.
- **When**: Người dùng gửi tin nhắn đầu tiên có nội dung: `"Hướng dẫn cách nấu món phở bò truyền thống ngon tại nhà"`.
- **Then**: Sau khi tin nhắn được gửi thành công, hệ thống tự động trích xuất 30 ký tự đầu tiên (`"Hướng dẫn cách nấu món phở bò "`) và cập nhật thành tiêu đề hiển thị mới trên Sidebar.

#### Kịch bản 2.3B: Đổi tên thủ công bởi người dùng
- **Given**: Người dùng đang mở cuộc trò chuyện trên Sidebar.
- **When**: Người dùng bấm nút "Sửa tên", nhập tiêu đề `"Dự án Trợ Lý Ảo AI"` rồi bấm Lưu.
- **Then**: Hệ thống cập nhật tiêu đề mới vào CSDL và Sidebar cập nhật hiển thị ngay lập tức. Sau đó, quy tắc đổi tên tự động sẽ không bao giờ ghi đè lên tiêu đề này nữa.

---

### 2.4 UC-CONV-004 [UC-007]: Xóa Cuộc Trò Chuyện (AC-003)

#### Kịch bản 2.4A: Xóa thành công sau khi xác nhận
- **Given**: Người dùng có một cuộc trò chuyện không còn sử dụng trên Sidebar.
- **When**: Người dùng bấm biểu tượng "Xóa", hộp thoại xác nhận xuất hiện và người dùng bấm "Xác nhận xóa".
- **Then**: Hệ thống xóa vĩnh viễn cuộc trò chuyện và các tin nhắn liên quan khỏi CSDL, xóa mục đó khỏi Sidebar, và chuyển khung chat về trạng thái cuộc trò chuyện gần nhất hoặc khung chat trống.

#### Kịch bản 2.4B: Hủy bỏ thao tác xóa
- **Given**: Hộp thoại xác nhận xóa đang hiển thị.
- **When**: Người dùng bấm "Hủy bỏ".
- **Then**: Hộp thoại đóng lại; cuộc trò chuyện và dữ liệu tin nhắn vẫn được giữ nguyên vẹn.

---

## 3. Tiêu Chí Chấp Nhận Phân Hệ Đàm Thoại & Trí Tuệ Nhân Tạo (Chat & AI)

---

### 3.1 UC-CHAT-001 [UC-008]: Gửi Tin Nhắn & Tương Tác AI (AC-004)

#### Kịch bản 3.1A: Gửi tin nhắn hợp lệ và nhận luồng phản hồi SSE hoàn chỉnh
- **Given**: Người dùng đã đăng nhập và đang mở một cuộc trò chuyện hợp lệ.
- **When**: Người dùng nhập câu hỏi `"Xin chào, bạn có thể giúp tôi làm gì?"` (độ dài <= 4000 ký tự) và nhấn phím Enter.
- **Then**: Tin nhắn người dùng xuất hiện ngay trong khung chat; hệ thống mở kết nối Server-Sent Events (SSE); câu trả lời của Trợ lý ảo được stream từng từ/ký tự hiển thị mượt mà trên giao diện (`NFR-003`); khi kết thúc stream, nội dung được render định dạng Markdown chuẩn có syntax highlighting cho mã nguồn (`FR-013`), và toàn bộ tin nhắn được lưu trữ bền vững trong CSDL (`FR-012`).

#### Kịch bản 3.1B: Từ chối tin nhắn vượt quá 4,000 ký tự (BR-003)
- **Given**: Người dùng đang ở khung nhập liệu chat.
- **When**: Người dùng dán một đoạn văn bản dài 4,500 ký tự và nhấn Gửi.
- **Then**: Giao diện hiển thị cảnh báo đỏ đếm ký tự và khóa nút gửi. Nếu cố tình gọi API trực tiếp, Backend lập tức từ chối với mã lỗi `HTTP 422 Unprocessable Entity` và không chuyển tiếp xuống tầng AI.

#### Kịch bản 3.1C: Tự động chuyển vùng dự phòng khi nhà cung cấp chính quá tải (BR-005)
- **Given**: Hệ thống đang ưu tiên gọi Google Gemini API (`Primary`), nhưng tài khoản Gemini bị chạm trần hạn ngạch (mã lỗi HTTP 429) hoặc quá thời gian chờ 30 giây (`NFR-008`).
- **When**: Người dùng gửi một câu hỏi hợp lệ.
- **Then**: Bộ điều phối `LLMManager` tự động bắt ngoại lệ từ Gemini và chuyển tiếp yêu cầu sang `OpenAI API` (`Fallback`); người dùng vẫn nhận được câu trả lời bình thường mà không bị ngắt quãng hoặc nhận thông báo lỗi.

#### Kịch bản 3.1D: Dừng sinh phản hồi giữa chừng (Client Stop Generation)
- **Given**: Trợ lý ảo đang trong quá trình stream câu trả lời dài trên màn hình.
- **When**: Người dùng nhấn nút "Dừng tạo phản hồi" (Stop Generation).
- **Then**: Hệ thống lập tức ngắt luồng stream SSE, hủy tác vụ suy luận của AI, lưu phần nội dung đã tạo được tính đến thời điểm dừng vào CSDL, và mở lại nút gửi cho câu hỏi tiếp theo.

---

### 3.2 UC-CHAT-002 [UC-009]: Lựa Chọn Mô Hình AI (AC-004)

#### Kịch bản 3.2A: Người dùng chủ động chọn mô hình cụ thể
- **Given**: Người dùng đang ở giao diện khung chat.
- **When**: Người dùng mở menu lựa chọn mô hình và chọn `"Gemini 1.5 Pro"` thay vì mặc định.
- **Then**: Giao diện cập nhật chỉ báo model đang hoạt động; lượt gửi tin nhắn tiếp theo sẽ được điều hướng chỉ định tới mô hình Gemini 1.5 Pro đã chọn (`FR-014`).
