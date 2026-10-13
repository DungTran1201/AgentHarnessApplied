# ĐỊNH NGHĨA HOÀN THÀNH DỰ ÁN (DEFINITION OF DONE - DoD)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `DOD-SPEC-001` |
| **Tiêu chuẩn căn cứ** | [AGENTS.md](file:///c:/Users/PC/Project/ai-chan/AGENTS.md), [.agents/rules/ponytail.md](file:///c:/Users/PC/Project/ai-chan/.agents/rules/ponytail.md), [.agents/rules/core.md](file:///c:/Users/PC/Project/ai-chan/.agents/rules/core.md) |
| **Mục đích** | Bản cam kết chất lượng kỹ thuật (Quality Contract) xác định điều kiện để một Gói Công Việc (Work Package), Phase hoặc toàn bộ dự án được công nhận là `DONE` |
| **Lưu ý** | Đây là tài liệu quy chuẩn kế hoạch, không phải yêu cầu lập trình ngay trong giai đoạn hiện tại |

---

## 1. Tiêu Chuẩn Hoàn Thành Cho Từng Gói Công Việc (Work Package DoD)

Một Work Package kỹ thuật chỉ được chuyển trạng thái sang **`DONE`** khi thỏa mãn đồng thời 8 điều kiện sau:

### 1.1 Khớp Hoàn Toàn Với Đặc Tả Thiết Kế (Design Conformance)
- [x] Mã nguồn thực thi tuân thủ 100% hợp đồng API trong `docs/08-api/openapi.yaml`.
- [x] Cấu trúc dữ liệu và trường lưu trữ khớp chính xác với lược đồ PostgreSQL đã phê duyệt trong `docs/05-domain/database-design.md`.

### 1.2 Vượt Qua Tiêu Chí Nghiệm Thu (Acceptance Criteria Satisfied)
- [x] Đáp ứng đầy đủ các tiêu chí chấp nhận tương ứng trong SRS (`AC-001` -> `AC-005`).
- [x] Kết quả kiểm thử thực tế khớp với hành vi mong đợi đã cam kết.

### 1.3 Xử Lý Toàn Diện Các Luồng Ngoại Lệ (Exception & Error Paths Handled)
- [x] Không chỉ cài đặt luồng thành công (Happy Path); toàn bộ các kịch bản lỗi (Token hết hạn, mất kết nối cơ sở dữ liệu, lỗi quota AI, nhập liệu vượt quá 4,000 ký tự) đều được bắt và xử lý êm thuận.
- [x] Trả về mã lỗi HTTP tiêu chuẩn (400, 401, 403, 404, 422, 429, 503) kèm thông điệp thân thiện với người dùng.

### 1.4 Thẩm Định An Ninh & Không Rò Rỉ Secret (Security Conformance)
- [x] Tuyệt đối không hardcode API Key, mật khẩu hoặc secret trong mã nguồn, file cấu hình tĩnh hay git commit.
- [x] Dữ liệu đầu vào người dùng và câu trả lời AI được khử khuẩn chống XSS và kiểm soát prompt injection.
- [x] Ràng buộc cách ly dữ liệu theo `user_id` hoạt động chuẩn xác, không có lỗ hổng IDOR.

### 1.5 Kiểm Thử Tự Động & Tự Chạy Kiểm Chứng (Automated Testing & Self-Check)
- [x] Tuân thủ quy tắc `ponytail`: Mọi logic nghiệp vụ không tầm thường (Non-trivial logic) phải để lại **tối thiểu một kiểm tra tự động chạy được (Runnable Self-Check/Test file)**.
- [x] Toàn bộ các bài kiểm thử đơn vị (Unit Tests) và kiểm thử tích hợp (Integration Tests) chạy thành công 100% (Green).

### 1.6 Đồng Bộ Hóa Mô Hình & Tài Liệu (Model & Doc Synchronization)
- [x] Nếu có thay đổi cấu trúc dữ liệu hoặc API, các mô hình chuẩn máy đọc trong `models/` và tài liệu người đọc trong `docs/` bắt buộc phải được cập nhật đồng bộ.
- [x] Không để tài liệu bị lạc hậu so với hiện trạng mã nguồn thực tế.

### 1.7 Toàn Vẹn Ma Trận Truy Vết (Traceability Validated)
- [x] Mã Work Package và các artifact sinh ra được cập nhật vào [requirement-traceability.md](file:///c:/Users/PC/Project/ai-chan/docs/01-planning/requirement-traceability.md).
- [x] Không tạo ra requirement hoặc mã nguồn mồ côi (No Orphan Code).

### 1.8 Vượt Qua Bộ Kiểm Tra Tự Động Của Dự Án (Validators Passed)
- [x] Chạy lệnh `python tools/validators/run_all.py` đạt kết quả: **Validation complete. Failed checks: 0**.

---

## 2. Tiêu Chuẩn Hoàn Thành Cho Từng Giai Đoạn (Phase DoD)

Một Phase phát triển được công nhận hoàn thành khi:
1. 100% các Work Packages thuộc Phase đó đã đạt trạng thái `DONE`.
2. Vượt qua **Quality Gate** tương ứng của Phase đó (từ G1 đến G6).
3. Đã có biên bản thẩm định hoặc chấp thuận nghiệm thu từ vai trò phụ trách (Reviewer Sign-off).
4. Không còn bất kỳ rủi ro mức độ Critical nào chưa có phương án xử lý.
