# UC-CHAT-001 [UC-008] — Gửi Tin Nhắn & Tương Tác AI (Send Message & Chat Interaction)

---

## 1. Overview
Ca sử dụng cốt lõi này cho phép người dùng gửi câu hỏi hoặc yêu cầu bằng ngôn ngữ tự nhiên tới Trợ lý ảo AI, xem tin nhắn phản hồi xuất hiện tức thời theo thời gian thực dưới dạng luồng ký tự (Server-Sent Events streaming) và nhận kết quả trình bày đẹp mắt theo định dạng Markdown có tô màu mã nguồn.

---

## 2. Goal
Tương tác đàm thoại với Trợ lý ảo AI, nhận câu trả lời chính xác, mạch lạc và nhanh chóng cho câu hỏi của người dùng.

---

## 3. Scope
Hệ thống Website Chatbot Trợ Lý Ảo AI-Chan (Phân hệ Đàm thoại & Tích hợp Trí tuệ Nhân tạo).

---

## 4. Primary Actor
`ACT-02: User (Người dùng đã xác thực)`.

---

## 5. Supporting Actors
- `ai-frontend`: Tiếp nhận câu hỏi, render giao diện streaming thời gian thực và định dạng Markdown/Code.
- `ai-backend`: Xác thực dữ liệu (`BR-003`), lưu trữ tin nhắn, nạp ngữ cảnh và điều phối gọi mô hình AI.
- `PostgreSQL 16`: Lưu trữ bền vững các tin nhắn của người dùng và trợ lý ảo.
- `EXT-AI (Google Gemini & OpenAI)`: Dịch vụ đám mây thực hiện suy luận văn bản.

---

## 6. Trigger
Người dùng nhập nội dung vào ô nhập liệu và nhấn phím Enter (hoặc bấm nút "Gửi").

---

## 7. Preconditions
- Người dùng đang duy trì phiên đăng nhập hợp lệ (`UC-AUTH-002`).
- Người dùng đang mở một cuộc trò chuyện hợp lệ thuộc quyền sở hữu của mình (`UC-CONV-001` hoặc `UC-CONV-002`).
- Chưa vượt định mức giới hạn tần suất gửi tin nhắn (`BR-006`).

---

## 8. Postconditions

### 8.1 Success Postconditions
- Tin nhắn của người dùng được lưu trữ bền vững trong cơ sở dữ liệu (`role = user`).
- Toàn bộ nội dung câu trả lời của Trợ lý ảo được lưu trữ bền vững trong cơ sở dữ liệu (`role = assistant`).
- Giao diện người dùng hiển thị trọn vẹn câu trả lời với định dạng Markdown chuẩn và syntax highlighting mã nguồn (`FR-013`).
- Nếu đây là tin nhắn đầu tiên của cuộc trò chuyện, tiêu đề cuộc trò chuyện được cập nhật tự động (`BR-004`).

### 8.2 Failure Postconditions
- Người dùng nhận được thông báo lỗi rõ ràng kèm tùy chọn bấm "Thử lại"; trạng thái cuộc trò chuyện không bị hỏng hóc.

---

## 9. Main Success Scenario (Kịch Bản Thành Công Chính)

1. Người dùng nhập câu hỏi vào ô nhập liệu trên giao diện chat.
2. Người dùng nhấn phím Enter hoặc bấm nút "Gửi".
3. Hệ thống máy khách kiểm tra tính hợp lệ của tin nhắn: Không được rỗng và độ dài <= 4,000 ký tự (`BR-003`).
4. Hệ thống máy khách hiển thị ngay tin nhắn của người dùng lên khung chat (Optimistic UI) và vô hiệu hóa nút gửi.
5. Hệ thống máy khách gửi yêu cầu mở kết nối truyền luồng (Streaming POST) tới máy chủ.
6. Máy chủ xác thực JWT Cookie, quyền sở hữu cuộc trò chuyện và độ dài tin nhắn.
7. Máy chủ lưu trữ tin nhắn người dùng vào cơ sở dữ liệu (`role = user`).
8. **[Include UC-CONV-003]**: Nếu đây là tin nhắn đầu tiên và tiêu đề là mặc định, máy chủ tự động cập nhật tiêu đề thành 30 ký tự đầu của prompt (`BR-004`).
9. Máy chủ nạp danh sách 20 tin nhắn gần nhất của cuộc trò chuyện làm ngữ cảnh đàm thoại.
10. Máy chủ thiết lập tiêu đề phản hồi `Server-Sent Events (SSE)` và gửi yêu cầu suy luận tới nhà cung cấp AI chính (Google Gemini API).
11. Khi từng token từ mô hình AI được trả về, máy chủ đẩy ngay gói tin SSE tới máy khách.
12. Giao diện máy khách cập nhật từng ký tự câu trả lời lên màn hình theo thời gian thực (`NFR-003`).
13. Mô hình AI hoàn tất sinh văn bản; máy chủ gửi sự kiện kết thúc SSE (`status: done`).
14. Máy chủ gom toàn bộ nội dung phản hồi và lưu vào cơ sở dữ liệu (`role = assistant`).
15. Giao diện máy khách hoàn tất stream, render định dạng Markdown/mã nguồn đẹp mắt và mở lại nút gửi cho câu hỏi tiếp theo.

---

## 10. Alternative Flows (Các Luồng Rẽ Nhánh Thay Thế)

- **A1 — Người Dùng Dừng Tạo Phản Hồi (Client Stop Generation)**:
  - Khi trợ lý ảo đang stream câu trả lời, người dùng nhấn nút "Dừng tạo phản hồi" (Stop Generation).
  - Máy khách chủ động ngắt kết nối SSE.
  - Máy chủ bắt sự kiện ngắt kết nối, hủy tác vụ gọi mô hình AI để tiết kiệm token.
  - Máy chủ lưu lại phần văn bản đã stream được tính đến thời điểm ngắt kèm ghi chú `(Đã dừng tạo phản hồi)`.
  - Khung chat dừng hiển thị và mở lại nút gửi.
- **A2 — Tin Nhắn Vượt Quá 4,000 Ký Tự (BR-003)**:
  - Tại bước 3, người dùng nhập văn bản dài hơn 4,000 ký tự.
  - Giao diện đổi màu bộ đếm ký tự sang đỏ và khóa nút gửi.
  - Người dùng cần cắt bớt nội dung trước khi gửi.

---

## 11. Exception Flows (Các Luồng Xử Lý Ngoại Lệ)

- **E1 — Google Gemini Quá Tải (HTTP 429) / Lỗi Máy Chủ (HTTP 5xx) -> Tự Động Failover Sang OpenAI (BR-005)**:
  - Tại bước 10, Gemini phản hồi lỗi hạn ngạch 429 hoặc lỗi 5xx.
  - Bộ điều phối Backend tự động bắt ngoại lệ và chuyển tiếp yêu cầu sang nhà cung cấp phụ OpenAI API.
  - Phản hồi từ OpenAI được stream tiếp tục về cho người dùng một cách trong suốt; người dùng không nhận thấy lỗi.
- **E2 — Quá Thời Gian Chờ AI (Timeout > 30 giây - NFR-008) -> Failover Sang OpenAI**:
  - Tại bước 10, quá 30 giây mà Gemini không trả về dữ liệu.
  - Backend ngắt kết nối Gemini và kích hoạt OpenAI Fallback (`BR-005`).
- **E3 — Cả Hai Nhà Cung Cấp AI Đều Gặp Sự Cố (Total AI Outage)**:
  - Khi cả Gemini và OpenAI đều lỗi kết nối hoặc cạn kiệt số dư.
  - Máy chủ bắt ngoại lệ, gửi event lỗi có cấu trúc qua SSE.
  - Giao diện hiển thị bong bóng thông báo lỗi thân thiện: *"Dịch vụ trợ lý ảo hiện đang quá tải. Vui lòng thử lại sau ít phút."* kèm nút bấm "Thử lại".
- **E4 — Vượt Quá Tần Suất Gửi Tin Nhắn (Rate Limit Tripped - BR-006)**:
  - Người dùng gửi quá 60 request/phút.
  - Hệ thống từ chối yêu cầu với mã lỗi 429; hiển thị cảnh báo gửi quá nhanh và đếm ngược thời gian chờ.

---

## 12. Business Rules (Quy Tắc Nghiệp Vụ Áp Dụng)
- `BR-001`: Yêu cầu xác thực tài khoản để lưu trữ tin nhắn.
- `BR-002`: Cách ly dữ liệu hội thoại, không thể gửi tin nhắn vào cuộc trò chuyện của người khác.
- `BR-003`: Độ dài tin nhắn từ 1 đến tối đa 4,000 ký tự.
- `BR-004`: Quy tắc đặt tên tự động cho tin nhắn đầu tiên.
- `BR-005`: Thứ tự ưu tiên điều phối AI (Google Gemini chính, OpenAI dự phòng).
- `BR-006`: Giới hạn tần suất gọi API.

---

## 13. Requirements (Yêu Cầu Nghiệp Vụ Đáp Ứng)
- `FR-008`: Cho phép người dùng gửi tin nhắn trong cuộc trò chuyện.
- `FR-009`: Phản hồi thời gian thực qua Server-Sent Events (SSE).
- `FR-010`: Tích hợp Google Gemini API.
- `FR-011`: Tự động chuyển vùng dự phòng sang OpenAI API khi Gemini quá tải.
- `FR-012`: Lưu trữ đầy đủ lịch sử tin nhắn của cuộc trò chuyện.
- `FR-013`: Hỗ trợ hiển thị định dạng Markdown và syntax highlighting mã nguồn.
- `NFR-003`, `NFR-008`: Độ trễ stream dưới 2s và thời gian chờ tối đa 30s.

---

## 14. Acceptance Criteria (Tiêu Chí Chấp Nhận)
- Đáp ứng đầy đủ các kịch bản kiểm thử trong `AC-004` (Kịch bản 3.1A, 3.1B, 3.1C, 3.1D tại [acceptance-criteria.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/acceptance-criteria.md)).

---

## 15. Dependencies (Phụ Thuộc Nghiệp Vụ)
- Phụ thuộc vào `UC-AUTH-002 [UC-002]`, `UC-CONV-001 [UC-004]`.
- Bao hàm (`<<include>>`) `UC-CONV-003 [UC-006]` khi thỏa điều kiện `BR-004`.
- Được mở rộng (`<<extend>>`) bởi `UC-CHAT-002 [UC-009]`.

---

## 16. Assumptions (Giả Định)
- `ASM-BP-01`: Trình duyệt máy khách hỗ trợ chuẩn Server-Sent Events hoặc ReadableStream.

---

## 17. Open Questions (Vấn Đề Chờ Quyết Định)
- `OQ-UC-01`: Chưa hỗ trợ tính năng sửa tin nhắn đã gửi (Edit Message) trong MVP Release 1.0.

---

## 18. Notes
- Kết nối SSE là kết nối một chiều (Server to Client) truyền qua giao thức HTTP chuẩn, bảo đảm đi qua được hầu hết các tường lửa và Proxy doanh nghiệp.
