# ÁNH XẠ QUY TẮC NGHIỆP VỤ VÀO CA SỬ DỤNG (BUSINESS RULES MAPPING)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `UC-BR-MAP-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Đối chiếu chi tiết từng quy tắc nghiệp vụ (`BR-001` đến `BR-006`) vào các thành phần cụ thể của Ca sử dụng (Điều kiện tiên quyết, Các bước trong kịch bản chính, Kịch bản thay thế và Kịch bản ngoại lệ) |

---

## 1. Ma Trận Ánh Xạ Quy Tắc Nghiệp Vụ Vào Ca Sử Dụng

| Mã Quy Tắc | Tên Quy Tắc Nghiệp Vụ | Ca Sử Dụng Áp Dụng | Vị Trí Ràng Buộc Trong Use Case | Hành Vi Xử Lý Khi Vi Phạm |
| :--- | :--- | :--- | :--- | :--- |
| **`BR-001`** | Bắt Buộc Xác Thực Để Lưu Trữ Phiên Hội Thoại | `UC-CONV-001..004`, `UC-CHAT-001..002` | **Preconditions (Điều kiện tiên quyết)**: Người dùng phải mang phiên đăng nhập hợp lệ | Chặn truy cập; chuyển hướng về `UC-AUTH-002` (Login) kèm thông báo lỗi 401 |
| **`BR-002`** | Cách Ly Quyền Sở Hữu Cuộc Trò Chuyện (Anti-IDOR) | `UC-CONV-002`, `UC-CONV-003`, `UC-CONV-004`, `UC-CHAT-001` | **Main Scenario Step & Decision**: Xác thực `conversation.user_id == current_user.id` | Rẽ nhánh Alternative Flow: Báo lỗi "Không tìm thấy cuộc trò chuyện" (404/403) |
| **`BR-003`** | Giới Hạn Chiều Dài Tin Nhắn Đầu Vào (<= 4,000 ký tự) | `UC-CHAT-001 [UC-008]` | **Step 5 (Validation)** trong Main Success Scenario | Khóa nút gửi tại Client; Backend từ chối với lỗi 422 Unprocessable Entity |
| **`BR-004`** | Quy Ước Đặt Tiêu Đề Cuộc Trò Chuyện Tự Động | `UC-CHAT-001`, `UC-CONV-003` | **Step 7 (Post-action)** sau khi gửi tin nhắn đầu tiên | Tự động gọi `UC-CONV-003` trích xuất 30 ký tự đầu của prompt làm tiêu đề |
| **`BR-005`** | Thứ Tự Ưu Tiên Điều Phối Nhà Cung Cấp AI (Gemini -> OpenAI) | `UC-CHAT-001`, `UC-CHAT-002` | **Step 8 (AI Invocation)** và Exception Flow | Nếu Gemini lỗi (429/5xx/timeout 30s) -> Kích hoạt OpenAI Fallback trong suốt |
| **`BR-006`** | Xử Lý Khi Vượt Quá Tần Suất Cho Phép (Rate Limiting) | Toàn bộ 9 Ca sử dụng (Đặc biệt: `UC-AUTH-001`, `UC-AUTH-002`, `UC-CHAT-001`) | **Global Constraint & Exception Flow**: Áp dụng trước mọi bước xử lý | Chặn đứng yêu cầu; trả về mã lỗi 429 kèm thông báo chờ và bộ đếm ngược |

---

## 2. Chi Tiết Thực Thi Quy Tắc Nghiệp Vụ Tại Từng Ca Sử Dụng

### 2.1 Ràng Buộc Xác Thực (`BR-001`)
- **Bảo Vệ**: Đảm bảo không người dùng ẩn danh nào có thể tiêu tốn tài nguyên lưu trữ của máy chủ.
- **Thực Hiện Trong Use Case**:
  - Tại `UC-CONV-001` (Tạo chat): Người dùng phải có phiên đăng nhập trước khi bấm nút tạo mới.
  - Tại `UC-CHAT-001` (Gửi tin nhắn): Tin nhắn chỉ được chấp nhận khi gắn với một tài khoản người dùng xác định.

### 2.2 Cách Ly Sở Hữu Dữ Liệu (`BR-002`)
- **Bảo Vệ**: Triệt tiêu lỗ hổng IDOR, bảo vệ quyền riêng tư cá nhân theo chuẩn an ninh `SEC-004`.
- **Thực Hiện Trong Use Case**:
  - Tại `UC-CONV-002` (Xem lịch sử): Người dùng chỉ nhìn thấy danh sách các cuộc trò chuyện của chính mình trên Sidebar.
  - Tại `UC-CONV-003` (Đổi tên) và `UC-CONV-004` (Xóa chat): Hệ thống kiểm tra quyền sở hữu trước khi cho phép sửa đổi hoặc xóa dữ liệu.

### 2.3 Kiểm Soát Độ Dài Văn Bản (`BR-003`)
- **Bảo Vệ**: Tránh lãng phí chi phí token AI và ngăn ngừa tấn công tràn bộ nhớ.
- **Thực Hiện Trong Use Case**:
  - Tại `UC-CHAT-001`: Ô nhập liệu có bộ đếm ký tự trực quan. Khi văn bản vượt quá 4,000 ký tự, giao diện đổi màu cảnh báo và vô hiệu hóa nút bấm gửi.

### 2.4 Tự Động Hóa Nhãn Hội Thoại (`BR-004`)
- **Bảo Vệ**: Cải thiện trải nghiệm người dùng, giúp người dùng dễ dàng định vị các chủ đề đàm thoại cũ.
- **Thực Hiện Trong Use Case**:
  - Tích hợp liền mạch trong `UC-CHAT-001`: Chỉ kích hoạt 1 lần duy nhất cho tin nhắn đầu tiên khi tiêu đề vẫn là tiêu đề mặc định.

### 2.5 Độ Sẵn Sàng Cao Đa Nhà Cung Cấp (`BR-005`)
- **Bảo Vệ**: Đảm bảo SLA sẵn sàng dịch vụ không bị gián đoạn khi nhà cung cấp chính gặp sự cố mạng hoặc hết hạn ngạch.
- **Thực Hiện Trong Use Case**:
  - Tích hợp tại Exception Flow của `UC-CHAT-001`: Toàn bộ quá trình chuyển vùng sang OpenAI diễn ra hoàn toàn tự động, người dùng không cần phải bấm nút thử lại thủ công.
