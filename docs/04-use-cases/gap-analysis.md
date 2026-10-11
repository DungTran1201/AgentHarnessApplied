# PHÂN TÍCH LỖ HỔNG CA SỬ DỤNG (USE CASE GAP ANALYSIS)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `UC-GAP-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Rà soát và nhận diện các điểm khuyết thiếu hoặc chưa đồng nhất trong mô hình tương tác Ca sử dụng, đề xuất giải pháp xử lý trước khi bước vào giai đoạn Phân tích Hệ thống (System Analysis) |

---

## 1. Bảng Danh Mục Các Lỗ Hổng Ca Sử Dụng (Gap Matrix)

| Mã Lỗ Hổng | Ca Sử Dụng Ảnh Hưởng | Nội Dung Điểm Khuyết Thiếu | Mức Độ Rủi Ro | Đề Xuất Giải Pháp Cho MVP / Giai Đoạn Sau | Trạng Thái |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`GAP-UC-01`** | `UC-CHAT-001` | **Chưa có Ca sử dụng "Tạo lại câu trả lời" (Regenerate Response)**: Khi AI trả lời chưa đúng ý, người dùng phải copy lại prompt để hỏi lại thay vì có nút bấm tạo lại nhanh. | Thấp (Low) | Tại MVP Release 1.0: Người dùng gửi lại câu hỏi mới. Bổ sung nút "Tạo lại câu trả lời" (Regenerate) vào Backlog của Phase 2. | `RECORDED` |
| **`GAP-UC-02`** | `UC-CHAT-002` | **Phạm vi lưu trữ lựa chọn Model (Per-conversation vs Per-session)**: Khi người dùng đổi model sang OpenAI, lựa chọn này có được lưu riêng cho cuộc trò chuyện đó hay áp dụng chung cho toàn bộ phiên làm việc? | Trung bình (Medium) | Tại MVP Release 1.0: Áp dụng lựa chọn model **theo từng cuộc trò chuyện** (lưu trường `model_override` trong bản ghi Conversation hoặc Client State của phiên đó). | `DECIDED_FOR_MVP` |
| **`GAP-UC-03`** | `UC-CHAT-001` | **Hành vi lưu trữ khi Dừng tạo phản hồi (Stop Generation)**: Khi người dùng bấm Stop, tin nhắn trả lời dở dang được lưu như thế nào để người dùng phân biệt được là câu trả lời bị ngắt quãng? | Thấp (Low) | Hệ thống lưu phần văn bản đã stream được tính đến thời điểm bấm Stop và đính kèm cờ hiển thị ghi chú `(Đã dừng tạo phản hồi)`. | `ACCEPTED_FOR_DESIGN` |
| **`GAP-UC-04`** | `UC-AUTH-001..002` | **Trải nghiệm điều hướng mặc định của Khách vãng lai (`ACT-01`)**: Khi khách truy cập vào trang chủ `/`, hệ thống tự động điều hướng sang `/login` hay hiển thị màn hình giới thiệu (Landing Page)? | Thấp (Low) | Tại MVP Release 1.0: Điều hướng thẳng sang `/login` nếu chưa có Cookie phiên; nếu đã có Cookie hợp lệ -> tự động điều hướng vào `/chat`. | `DECIDED_FOR_MVP` |

---

## 2. Kế Hoạch Xử Lý & Khuyến Nghị

1. **Khuyến nghị cho Phase 05 (System Analysis)**:
   - Làm rõ trạng thái `is_aborted: boolean` trong cấu trúc dữ liệu của thực thể `Message` để phản ánh trung thực kết quả của thao tác "Dừng tạo phản hồi" trong `UC-CHAT-001`.
2. **Khuyến nghị cho Phase 11 (UX Design)**:
   - Bổ sung nút icon sao chép nhanh (Quick Copy) bên cạnh các khối mã nguồn (Code Blocks) khi render Markdown để tối ưu hóa trải nghiệm lập trình viên.
