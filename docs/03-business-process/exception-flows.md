# ĐẶC TẢ CÁC LUỒNG XỬ LÝ NGOẠI LỆ & SỰ CỐ (EXCEPTION FLOWS SPECIFICATION)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `BP-EXCEPTION-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Phân tích toàn diện các tình huống sự cố, lỗi hạ tầng và hành vi bất thường trong quá trình vận hành quy trình nghiệp vụ; xác định rõ điểm phát hiện, hành vi hệ thống, thông điệp người dùng và cơ chế tự phục hồi |

---

## 1. Bảng Tổng Hợp Danh Mục Ngoại Lệ Nghiệp Vụ (Exception Matrix)

| Mã Ngoại Lệ | Tên Ngoại Lệ / Sự Cố | Quy Trình Bị Ảnh Hưởng | Điểm Phát Hiện | Phản Hồi Người Dùng | Cơ Chế Phục Hồi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`EXC-AI-01`** | Quá Thời Gian Chờ AI (AI Provider Timeout > 30s) | `BP-AI-001`, `BP-CHAT-001` | `LLMManager` (Timeout monitor) | Chuyển vùng trong suốt hoặc báo lỗi bận | Tự động kích hoạt Failover sang OpenAI (`BR-005`) |
| **`EXC-AI-02`** | Quá Hạn Mức / Lỗi Nhà Cung Cấp Chính (Gemini 429/5xx) | `BP-AI-001`, `BP-CHAT-001` | `LLMManager` (Exception handler) | Không làm gián đoạn; người dùng vẫn nhận câu trả lời | Chuyển vùng trong suốt sang OpenAI Provider |
| **`EXC-AI-03`** | Cả Hai Nhà Cung Cấp AI Đều Thất Bại (Total AI Outage) | `BP-AI-001`, `BP-CHAT-001` | `LLMManager` (Final catch block) | Báo lỗi thân thiện kèm nút "Thử lại" | Không crash máy chủ; lưu tin nhắn lỗi |
| **`EXC-NET-01`** | Người Dùng Đột Ngột Ngắt Kết Nối Giữa Chừng (SSE Client Abort) | `BP-CHAT-001` | Controller Streaming loop | Người dùng không thấy do đã đóng trình duyệt | Đóng generator, lưu phần token đã sinh ra |
| **`EXC-SEC-01`** | Vi Phạm Quyền Sở Hữu Hội Thoại (IDOR Access Attempt) | `BP-CONV-002`, `BP-CONV-003`, `BP-CONV-004` | Service layer check `user_id` | Lỗi 404/403: Không tìm thấy hội thoại | Ghi log cảnh báo an ninh; chặn đứng truy cập (`BR-002`) |
| **`EXC-SEC-02`** | Phiên Làm Việc Hết Hạn / Cookie Bị Thay Đổi | Mọi quy trình yêu cầu đăng nhập | Middleware / `get_current_user` | Lỗi 401; điều hướng về `/login` | Xóa Cookie hỏng; yêu cầu đăng nhập lại |
| **`EXC-SEC-03`** | Vi Phạm Ngưỡng Tần Suất Yêu Cầu (Rate Limit Tripped) | `BP-SEC-001`, mọi quy trình | Ingress Nginx / Backend Limiter | Lỗi 429: "Quá nhiều yêu cầu" | Trả header `Retry-After`; tự động phục hồi sau 60s |
| **`EXC-DB-01`** | Mất Kết Nối Cơ Sở Dữ Liệu PostgreSQL | Mọi quy trình ghi/đọc dữ liệu | SQLAlchemy connection pool | Lỗi 500: "Hệ thống tạm thời gặp sự cố" | Tự động reconnect; rollback transaction |

---

## 2. Đặc Tả Chi Tiết Từng Luồng Ngoại Lệ

---

### EXC-AI-01: Quá Thời Gian Chờ AI (AI Provider Timeout > 30s)
- **Tình Huống Kích Hoạt**: Mô hình chính (Google Gemini) xử lý quá chậm hoặc đường truyền mạng quốc tế bị nghẽn khiến quá 30 giây mà không trả về gói dữ liệu (token) nào (`NFR-008`).
- **Điểm Phát Hiện**: Bộ đếm thời gian `asyncio.wait_for(timeout=30.0)` trong `LLMManager`.
- **Hành Vi Hệ Thống**:
  1. Hủy bỏ tác vụ kết nối đang treo với Gemini.
  2. Ghi nhận nhật ký cảnh báo: `[WARN] Gemini API timed out after 30 seconds. Switching to OpenAI fallback.`.
  3. Ngay lập tức khởi tạo yêu cầu mới tới OpenAI API với cùng nội dung câu hỏi và ngữ cảnh.
- **Phản Hồi Người Dùng**: Người dùng chỉ nhận thấy độ trễ ban đầu hơi lâu hơn thông thường vài giây; sau đó câu trả lời bắt đầu hiển thị bình thường.
- **Trạng Thái Kết Thúc**: Yêu cầu được hoàn tất thành công thông qua nhà cung cấp phụ OpenAI.

---

### EXC-AI-02: Quá Hạn Mức / Lỗi Nhà Cung Cấp Chính (Gemini HTTP 429 / 5xx)
- **Tình Huống Kích Hoạt**: Tài khoản Google Gemini API bị chạm trần hạn ngạch (Rate Limit/Quota Exhaustion - mã 429) hoặc máy chủ Google trả về lỗi nội bộ 500/503.
- **Điểm Phát Hiện**: Khối `try ... except` bao quanh cuộc gọi SDK Gemini trong `LLMManager`.
- **Hành Vi Hệ Thống**:
  1. Bắt ngoại lệ `GoogleAPICallError` hoặc kiểm tra mã trạng thái HTTP 429/5xx.
  2. Ghi log chi tiết mã lỗi từ Google.
  3. Tự động kích hoạt phương thức `stream_chat` của `OpenAIProvider` (`BR-005`).
- **Phản Hồi Người Dùng**: Liền mạch, người dùng không nhận thấy thông báo lỗi nào trên giao diện.
- **Trạng Thái Kết Thúc**: Dữ liệu phản hồi được cung cấp từ OpenAI; lưu cờ `provider = openai` vào bản ghi tin nhắn.

---

### EXC-AI-03: Cả Hai Nhà Cung Cấp AI Đều Thất Bại (Total AI Outage)
- **Tình Huống Kích Hoạt**: Cả Gemini và OpenAI đều bị lỗi đồng thời (mất mạng toàn cục, cả hai tài khoản đều cạn kiệt số dư, hoặc sự cố diện rộng của cả 2 nhà cung cấp).
- **Điểm Phát Hiện**: Khối `except Exception` bao bọc bên ngoài cả hai lần thử gọi AI.
- **Hành Vi Hệ Thống**:
  1. Ghi log mức độ nghiêm trọng: `[CRITICAL] Both Gemini and OpenAI failed to respond.`.
  2. Gửi một event SSE đặc biệt chứa thông báo lỗi có cấu trúc:
     ```text
     event: error
     data: {"code": "AI_UNAVAILABLE", "message": "Dịch vụ trợ lý ảo hiện đang quá tải hoặc gặp sự cố kết nối. Vui lòng thử lại sau ít phút."}
     ```
  3. Backend đóng kết nối SSE an toàn, không để tiến trình bị crash.
  4. Lưu một tin nhắn hệ thống thông báo lỗi vào CSDL để người dùng xem lại.
- **Phản Hồi Người Dùng**: Trên giao diện xuất hiện khung thông báo lỗi màu đỏ kèm nút bấm **"Thử lại" (Retry)**.
- **Trạng Thái Kết Thúc**: Cuộc trò chuyện vẫn giữ nguyên ngữ cảnh trước đó; người dùng có thể bấm Thử lại khi dịch vụ hồi phục.

---

### EXC-NET-01: Người Dùng Đột Ngột Ngắt Kết Nối Giữa Chừng (SSE Client Abort)
- **Tình Huống Kích Hoạt**: Người dùng đóng tab trình duyệt, chuyển trang, hoặc nhấn nút "Dừng tạo phản hồi" khi AI đang stream câu trả lời.
- **Điểm Phát Hiện**: Ngoại lệ `ClientDisconnect` hoặc kiểm tra `request.is_disconnected()` trong vòng lặp stream của FastAPI.
- **Hành Vi Hệ Thống**:
  1. Backend lập tức ngắt generator gọi mô hình AI để tránh lãng phí token.
  2. Lưu trữ phần văn bản câu trả lời đã thu thập được tính đến thời điểm ngắt kết nối vào bảng `messages` (đính kèm ghi chú bị ngắt quãng).
  3. Giải phóng tài nguyên kết nối socket.
- **Trạng Thái Kết Thúc**: Dữ liệu không bị rác hoặc mất đồng bộ; cơ sở dữ liệu lưu trữ trạng thái nhất quán.

---

### EXC-SEC-01: Vi Phạm Quyền Sở Hữu Hội Thoại (IDOR Access Attempt)
- **Tình Huống Kích Hoạt**: Người dùng `ACT-02` cố tình gửi yêu cầu đọc, sửa hoặc xóa một `conversation_id` thuộc quyền sở hữu của người dùng khác.
- **Điểm Phát Hiện**: Tầng Service/Repository kiểm tra điều kiện:
  ```python
  if conversation.user_id != current_user.id:
      raise HTTPException(status_code=404, detail="Conversation not found")
  ```
- **Hành Vi Hệ Thống**:
  1. Trả về mã lỗi `HTTP 404 Not Found` (để tránh rò rỉ sự tồn tại của ID đối tượng cho kẻ tấn công) hoặc `HTTP 403 Forbidden`.
  2. Ghi nhật ký cảnh báo an ninh kèm thông tin `user_id` kẻ vi phạm, `target_conv_id`, và địa chỉ IP.
  3. Chặn đứng hoàn toàn việc thực thi câu lệnh SQL tiếp theo (`BR-002`).
- **Phản Hồi Người Dùng**: Giao diện thông báo không tìm thấy cuộc trò chuyện hoặc không có quyền truy cập.

---

### EXC-SEC-02: Phiên Làm Việc Hết Hạn Hoặc Cookie Bị Thay Đổi
- **Tình Huống Kích Hoạt**: Cookie `access_token` bị quá hạn 7 ngày, hoặc bị chỉnh sửa giá trị chữ ký bất hợp pháp.
- **Điểm Phát Hiện**: Tầng giải mã JWT trong FastAPI Dependency `get_current_user`:
  - Ngoại lệ `jwt.ExpiredSignatureError`.
  - Ngoại lệ `jwt.InvalidTokenError`.
- **Hành Vi Hệ Thống**:
  1. Từ chối yêu cầu với mã trạng thái `HTTP 401 Unauthorized`.
  2. Xóa Cookie hỏng bằng cách thiết lập tiêu đề phản hồi `Set-Cookie: access_token=; Max-Age=0`.
- **Phản Hồi Người Dùng**: Frontend tự động xóa phiên nội bộ và chuyển hướng người dùng về trang Đăng nhập (`/login`) kèm thông điệp: `"Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại."`.

---

### EXC-SEC-03: Vi Phạm Ngưỡng Tần Suất Yêu Cầu (Rate Limit Tripped)
- **Tình Huống Kích Hoạt**: Một Client IP gửi hơn 10 req/s tới Ingress hoặc gửi hơn 60 req/phút tới Backend API (`NFR-007`, `BR-006`).
- **Điểm Phát Hiện**:
  - Tại Ingress: Nginx directive `limit_req`.
  - Tại Backend: Middleware `RateLimiter` kiểm tra trần số lượng trong khung thời gian 60 giây.
- **Hành Vi Hệ Thống**:
  1. Chặn đứng yêu cầu ngay lập tức trước khi chạm vào các tầng xử lý nặng (Database, AI).
  2. Trả về mã lỗi `HTTP 429 Too Many Requests` kèm tiêu đề `Retry-After: 60`.
- **Phản Hồi Người Dùng**: Giao diện hiển thị cảnh báo: `"Bạn đang gửi yêu cầu quá nhanh. Vui lòng đợi trong giây lát trước khi thử lại."` kèm bộ đếm ngược.
