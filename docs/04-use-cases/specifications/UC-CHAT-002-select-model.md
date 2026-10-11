# UC-CHAT-002 [UC-009] — Lựa Chọn Mô Hình AI (Select AI Model)

---

## 1. Overview
Ca sử dụng này cho phép người dùng chủ động lựa chọn một mô hình AI cụ thể từ danh sách các mô hình được hệ thống hỗ trợ (Google Gemini 1.5 Flash, Gemini 1.5 Pro, hoặc OpenAI GPT-4o-mini) thay vì để hệ thống tự động chọn mặc định, nhằm tối ưu hóa chất lượng câu trả lời cho các tác vụ phức tạp.

---

## 2. Goal
Chỉ định mô hình trí tuệ nhân tạo cụ thể để xử lý câu hỏi trong cuộc trò chuyện hiện tại.

---

## 3. Scope
Hệ thống Website Chatbot Trợ Lý Ảo AI-Chan (Phân hệ Đàm thoại & Điều phối AI).

---

## 4. Primary Actor
`ACT-02: User (Người dùng đã xác thực)`.

---

## 5. Supporting Actors
- `ai-frontend`: Hiển thị danh sách chọn mô hình (Dropdown selector) và lưu trạng thái lựa chọn.

---

## 6. Trigger
Người dùng nhấn vào thanh chọn mô hình (Model Selector) tại góc trên của khung chat.

---

## 7. Preconditions
- Người dùng đang mở một cuộc trò chuyện hợp lệ trong hệ thống.

---

## 8. Postconditions

### 8.1 Success Postconditions
- Mô hình được chọn được lưu vào trạng thái của cuộc trò chuyện hiện tại.
- Thanh tiêu đề hiển thị tên mô hình mới (ví dụ: *"Gemini 1.5 Pro"*).
- Các lượt gửi tin nhắn tiếp theo trong `UC-CHAT-001` sẽ ưu tiên gọi trực tiếp mô hình này (`FR-014`).

### 8.2 Failure Postconditions
- Giữ nguyên mô hình mặc định của hệ thống.

---

## 9. Main Success Scenario (Kịch Bản Thành Công Chính)

1. Người dùng quan sát thấy thanh chọn mô hình tại phía trên khung chat (hiển thị model hiện tại, mặc định: *"Tự động / Gemini Flash"*).
2. Người dùng nhấn vào menu chọn mô hình.
3. Hệ thống hiển thị danh sách các mô hình sẵn có:
   - *Gemini 1.5 Flash* (Tốc độ cao, tối ưu câu hỏi thông thường).
   - *Gemini 1.5 Pro* (Suy luận sâu, ngữ cảnh lớn).
   - *OpenAI GPT-4o-mini* (Mô hình bổ sung).
4. Người dùng nhấn chọn mô hình mong muốn (ví dụ: *"Gemini 1.5 Pro"*).
5. Menu đóng lại, giao diện cập nhật biểu tượng và nhãn hiển thị của mô hình vừa chọn.
6. Khi người dùng thực hiện gửi tin nhắn trong `UC-CHAT-001`, thông tin mô hình chỉ định được đính kèm vào yêu cầu gọi API.

---

## 10. Alternative Flows (Các Luồng Rẽ Nhánh Thay Thế)

- **A1 — Đổi Về Chế Độ Mặc Định (Auto Mode)**:
  - Tại bước 4, người dùng chọn lại tùy chọn *"Tự động (Mặc định)"*.
  - Hệ thống khôi phục cơ chế điều phối tự động theo quy tắc ưu tiên `BR-005`.

---

## 11. Exception Flows (Các Luồng Xử Lý Ngoại Lệ)
- Không có lỗi nghiêm trọng phát sinh trong ca sử dụng này vì danh sách mô hình được cung cấp sẵn từ giao diện.

---

## 12. Business Rules (Quy Tắc Nghiệp Vụ Áp Dụng)
- `BR-005`: Nếu người dùng chỉ định rõ model qua `UC-CHAT-002`, hệ thống ưu tiên gọi model đó trước; nếu model đó gặp sự cố vẫn áp dụng cơ chế chuyển vùng dự phòng bảo toàn phiên chat.

---

## 13. Requirements (Yêu Cầu Nghiệp Vụ Đáp Ứng)
- `FR-014`: Hệ thống cho phép người dùng tùy chọn hoặc chuyển đổi giữa các mô hình AI khác nhau.

---

## 14. Acceptance Criteria (Tiêu Chí Chấp Nhận)
- Đáp ứng kịch bản kiểm thử trong `AC-004` (Kịch bản 3.2A tại [acceptance-criteria.md](file:///c:/Users/PC/Project/ai-chan/docs/04-use-cases/acceptance-criteria.md)).

---

## 15. Dependencies (Phụ Thuộc Nghiệp Vụ)
- Là ca sử dụng mở rộng (`<<extend>>`) cho `UC-CHAT-001 [UC-008]`.

---

## 16. Assumptions (Giả Định)
- Lựa chọn mô hình được lưu trữ gắn với ngữ cảnh của cuộc trò chuyện hiện tại (`GAP-UC-02`).

---

## 17. Open Questions (Vấn Đề Chờ Quyết Định)
- Không có câu hỏi tồn đọng cho Release 1.0.

---

## 18. Notes
- Người dùng không cần cấu hình API Key cá nhân; toàn bộ việc gọi các mô hình AI đều sử dụng API Key phía máy chủ của hệ thống.
