# PHÂN TÍCH LỖ HỔNG & ĐIỂM KHUYẾT QUY TRÌNH (GAP ANALYSIS)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `BP-GAP-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Phân tích phát hiện các khoảng trống logic, thiếu sót quy trình hoặc điểm chưa hoàn thiện giữa Requirements Baseline và quá trình vận hành thực tế trước khi bước vào thiết kế Ca sử dụng (Use Cases) và Kiến trúc |

---

## 1. Bảng Tổng Hợp Các Lỗ Hổng Quy Trình Phát Hiện Được (Gap Catalog)

| Mã Lỗ Hổng | Lĩnh Vực Ảnh Hưởng | Mô Tả Khoảng Trống Nghiệp Vụ | Mức Độ Rủi Ro | Khuyến Nghị Xử Lý Cho Giai Đoạn Kế Tiếp | Trạng Thái |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`GAP-BP-01`** | `Domain_Auth` | **Thiếu quy trình Quên mật khẩu / Khôi phục mật khẩu (Forgot Password Flow)**: Hiện tại chỉ có Đăng ký, Đăng nhập, Đăng xuất. Nếu người dùng quên mật khẩu, không có luồng tự phục hồi qua email. | Trung bình (Medium) | Ghi nhận thành tính năng dự kiến cho Giai đoạn 2 (Phase 2). Tại MVP, người dùng cần liên hệ hỗ trợ hoặc tạo tài khoản mới. | `RECORDED` |
| **`GAP-BP-02`** | `Domain_Conv` | **Cơ chế Xóa Cuộc trò chuyện: Xóa mềm (Soft Delete) hay Xóa cứng (Hard Delete)?**: Schema CSDL hiện tại chưa có trường `deleted_at`. Nếu xóa cứng thì không thể phục hồi dữ liệu khi người dùng bấm nhầm. | Thấp (Low) | Tại MVP áp dụng Xóa cứng (Hard Delete) kèm hộp thoại xác nhận chặt chẽ; xem xét bổ sung `deleted_at` ở Phase 05/06 Data Design. | `RECORDED` |
| **`GAP-BP-03`** | `Domain_Chat` | **Trải nghiệm Khách vãng lai dùng thử (Guest Chat Trial)**: Hiện tại `BR-001` cấm hoàn toàn khách vãng lai gửi tin nhắn. Người dùng buộc phải đăng ký tài khoản trước khi được thử nghiệm năng lực của chatbot. | Trung bình (Medium) | Giữ nguyên quy định `BR-001` ở MVP để chống bot spam; có thể nghiên cứu cơ chế Session Chat tạm thời ở các phiên bản sau. | `DECIDED_FOR_MVP` |
| **`GAP-BP-04`** | `Domain_Sec` | **Kiểm soát hạn mức Token theo từng tài khoản (Per-User Token Quota)**: Hiện tại hệ thống mới chỉ kiểm soát tần suất request theo IP (`BP-SEC-001`), chưa có trần giới hạn số lượng token mà 1 tài khoản được phép tiêu thụ trong ngày. | Trung bình (Medium) | Bổ sung theo dõi tiêu thụ token trong nhật ký kiểm toán (Audit Log) ở Phase 06; triển khai tính năng quota chi tiết ở Phase sau. | `RECORDED` |
| **`GAP-BP-05`** | `Domain_Chat` | **Quản lý ngữ cảnh khi cuộc trò chuyện quá dài (Context Window Overflow)**: Khi cuộc trò chuyện đạt hàng trăm tin nhắn, nếu gửi toàn bộ lịch sử sẽ vượt quá context limit của AI hoặc gây tốn chi phí token. | Cao (High) | Cần quy định cơ chế cắt tỉa ngữ cảnh (Sliding Window Context): Chỉ nạp tối đa 10 - 20 tin nhắn gần nhất vào prompt gửi AI. | `RECOMMENDED_FOR_DESIGN` |

---

## 2. Phân Tích Chi Tiết & Kế Hoạch Xử Lý

### 2.1 GAP-BP-05: Cắt Tỉa Ngữ Cảnh Hội Thoại (Context Truncation Policy)
- **Vấn đề**: Khi người dùng trao đổi liên tục trong cùng một cuộc trò chuyện, kích thước văn bản tích lũy sẽ tăng dần. Nếu đưa toàn bộ hàng chục nghìn ký tự lịch sử vào mỗi lần gọi AI:
  - Tốn kém chi phí token không cần thiết.
  - Tăng độ trễ phản hồi (`NFR-003`).
  - Có nguy cơ chạm ngưỡng tối đa (Context Window Limit) của model.
- **Khuyến nghị cho Phase 04 / Phase 05**:
  - Tại quy trình `BP-CHAT-001` và `BP-AI-001`, tầng Backend sẽ chỉ nạp tối đa **10 cặp tin nhắn (20 messages) gần nhất** để làm ngữ cảnh trao đổi cho AI.

### 2.2 GAP-BP-01: Quy Trình Quên Mật Khẩu (Password Recovery)
- **Vấn đề**: Hiện hệ thống chưa có cấu hình SMTP Mail Server để gửi link kích hoạt hoặc OTP khôi phục mật khẩu.
- **Giải pháp cho MVP**:
  - Giữ nguyên phạm vi MVP gọn gàng (theo nguyên tắc lazy senior dev: YAGNI & MVP Focus).
  - Đưa yêu cầu này vào Backlog giai đoạn vận hành sau khi phát hành phiên bản 1.0.
