# 09. KẾ HOẠCH & BỘ KIỂM THỬ TOÀN DIỆN (TEST PLAN & TEST CASES)
## Phân Hệ: Quản Lý System Prompt (System Prompt Management MVP)
### Nền Tảng: AI-Chan Virtual Assistant Platform

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `DOC-SPM-09` |
| **Trạng Thái** | `PROPOSED (Chờ Duyệt Từ QA Lead)` |
| **Vai Trò Phụ Trách** | Senior QA Engineer & Test Lead |
| **Phiên Bản** | `1.0.0-MVP` |
| **Ngày Lập** | `2026-10-11` |

---

## 1. Chiến Lược Kiểm Thử (Test Strategy & Levels)

Chiến lược kiểm thử cho phân hệ Quản lý System Prompt bao gồm 3 cấp độ kiểm thử chính nhằm đảm bảo tính đúng đắn từ tầng dữ liệu, API đến trải nghiệm người dùng:

1. **Cấp độ 1: Unit & Integration Tests Backend (Python Unittest / Pytest):**
   - Kiểm tra các endpoint CRUD trong `src/api/v1/prompts.py` sử dụng `starlette.testclient.TestClient`.
   - Kiểm tra ràng buộc CSDL SQLite: khóa ngoại, khóa chính, trigger `updated_at`, ràng buộc duy nhất `UNIQUE(user_id, name)`.
   - Kiểm tra Anti-IDOR: thử dùng User B để đọc/sửa/xóa prompt của User A.
   - Kiểm tra Validation Pydantic: chuỗi rỗng, vượt quá 10.000 ký tự, ký tự Unicode.
2. **Cấp độ 2: Component & UI Integration Tests Frontend (Next.js / React Testing Library):**
   - Kiểm tra 6 trạng thái giao diện của trang `/prompts` (Loading, Populated, Empty, No-results, Error, Unauthorized).
   - Kiểm tra hành vi tìm kiếm tức thời trên client.
   - Kiểm tra Modal xác nhận xóa, phím Esc và nút Hủy.
   - Kiểm tra tính năng Dirty Form Guard (Cảnh báo khi rời trang có thay đổi chưa lưu).
3. **Cấp độ 3: End-to-End System Tests (E2E Workflow):**
   - Tạo mới prompt chứa tiếng Việt có dấu và code block -> Kiểm tra lưu vào CSDL -> Mở chi tiết -> Sửa đổi -> Xóa prompt -> Xác nhận CSDL sạch sẽ.

---

## 2. Bảng Phân Loại Mức Độ Ưu Tiên Kiểm Thử

- **P0 (Blocker / Critical):** Các tính năng cốt lõi bắt buộc phải vượt qua để tính năng có thể release (CRUD cơ bản, Anti-IDOR, Unicode preservation, ngăn ngừa XSS).
- **P1 (High):** Các luồng ngoại lệ và xác thực quan trọng (Kiểm tra trùng tên HTTP 409, Dirty form protection, Empty/No-results states, Modal confirm).
- **P2 (Medium):** Các tiện ích hỗ trợ và hiển thị (Bộ đếm ký tự, copy to clipboard, sort, accessibility).

---

## 3. Ma Trận Bộ Test Cases Chi Tiết (`SPM-TC-xxx`)

### 3.1. Nhóm 1: Quản Lý Danh Sách & Tìm Kiếm (SPM-TC-001 đến SPM-TC-006)

| Test Case ID | Tên Kịch Bản Kiểm Thử | Yêu Cầu Liên Quan | Priority | Tiền Điều Kiện (Preconditions) | Các Bước Thực Hiện (Test Steps) | Dữ Liệu Kiểm Thử (Test Data) | Kết Quả Mong Đợi (Expected Results) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SPM-TC-001** | Tải danh sách System Prompt thành công | SPM-FR-001 | **P0** | User A đã đăng nhập và sở hữu 3 prompt trong CSDL. | 1. Gửi request `GET /api/v1/system-prompts` với auth header của User A.<br>2. Kiểm tra status code và response body. | Token của User A | 1. Status: HTTP 200 OK.<br>2. Body trả về đúng 3 items, `total = 3`.<br>3. Mọi item có `id`, `name`, `description`, `content_length`, `created_at`, `updated_at`.<br>4. Không chứa trường `content` đầy đủ. |
| **SPM-TC-002** | Danh sách sắp xếp theo thời gian cập nhật mới nhất | SPM-FR-001 | **P1** | User A có 3 prompt tạo vào các thời điểm t1, t2, t3. Prompt 1 vừa được cập nhật tại t4 (t4 > t3). | 1. Gửi request `GET /api/v1/system-prompts`.<br>2. Đọc thứ tự các phần tử trong mảng `items`. | Token User A | Bản ghi vừa được cập nhật (t4) phải nằm ở vị trí đầu tiên (`items[0]`). |
| **SPM-TC-003** | Hiển thị giao diện khi danh sách rỗng (Empty State) | SPM-FR-002 | **P1** | User mới tạo chưa có bất kỳ prompt nào. | 1. Mở trang `/prompts`.<br>2. Quan sát giao diện render. | Tài khoản mới tinh | 1. Hiển thị thông điệp "Bạn chưa có System Prompt nào".<br>2. Hiển thị nút bấm lớn "+ Tạo System Prompt Đầu Tiên". |
| **SPM-TC-004** | Xử lý lỗi khi mất kết nối mạng (Error State) | SPM-FR-002 | **P1** | Máy chủ API đang tắt hoặc mạng bị ngắt. | 1. Mở trang `/prompts`.<br>2. Quan sát giao diện. | Ngắt kết nối mạng | 1. Hiển thị Error banner màu đỏ: "Không thể tải danh sách...".<br>2. Xuất hiện nút "Thử lại (Retry)". |
| **SPM-TC-005** | Tìm kiếm lọc theo tên có kết quả | SPM-FR-003 | **P0** | Danh sách có 3 prompt: "Python Expert", "SQL Tuner", "Writer". | 1. Gõ `python` vào ô tìm kiếm.<br>2. Kiểm tra số lượng thẻ hiển thị trên màn hình. | Query: `"python"` | 1. Chỉ hiển thị duy nhất thẻ "Python Expert".<br>2. Không có độ trễ giật lag (< 16ms). |
| **SPM-TC-006** | Tìm kiếm không có kết quả phù hợp (No-Results State) | SPM-FR-003 | **P1** | Danh sách có 3 prompt. | 1. Gõ `xyz_nonexistent` vào ô tìm kiếm.<br>2. Quan sát giao diện. | Query: `"xyz_nonexistent"` | 1. Ẩn toàn bộ thẻ prompt.<br>2. Hiển thị giao diện: "Không tìm thấy System Prompt nào khớp...".<br>3. Có nút "Xóa tìm kiếm". Bấm nút này danh sách khôi phục đủ 3 thẻ. |

---

### 3.2. Nhóm 2: Xem Chi Tiết & Bảo Toàn Nội Dung (SPM-TC-007 đến SPM-TC-008)

| Test Case ID | Tên Kịch Bản Kiểm Thử | Yêu Cầu Liên Quan | Priority | Tiền Điều Kiện | Các Bước Thực Hiện | Dữ Liệu Kiểm Thử | Kết Quả Mong Đợi |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SPM-TC-007** | Xem chi tiết prompt thành công với nội dung đầy đủ | SPM-FR-005 | **P0** | Bản ghi `sp_test_01` tồn tại trong CSDL thuộc User A. | 1. Gửi `GET /api/v1/system-prompts/sp_test_01`.<br>2. Kiểm tra dữ liệu trả về. | `id = "sp_test_01"` | 1. Status: HTTP 200 OK.<br>2. Trả về đầy đủ trường `content` nguyên vẹn của bản ghi. |
| **SPM-TC-008** | Xem chi tiết ID không tồn tại trả về HTTP 404 | SPM-FR-005 | **P1** | ID `sp_invalid_999` không tồn tại trong CSDL. | 1. Gửi `GET /api/v1/system-prompts/sp_invalid_999`. | ID không tồn tại | 1. Status: HTTP 404 Not Found.<br>2. Error code: `PROMPT_NOT_FOUND`. |

---

### 3.3. Nhóm 3: Tạo Mới & Validation (SPM-TC-009 đến SPM-TC-012)

| Test Case ID | Tên Kịch Bản Kiểm Thử | Yêu Cầu Liên Quan | Priority | Tiền Điều Kiện | Các Bước Thực Hiện | Dữ Liệu Kiểm Thử | Kết Quả Mong Đợi |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SPM-TC-009** | Tạo mới System Prompt thành công với dữ liệu hợp lệ | SPM-FR-006 | **P0** | User A đã đăng nhập. | 1. Gửi `POST /api/v1/system-prompts` với payload hợp lệ.<br>2. Truy vấn trực tiếp vào CSDL kiểm tra. | `{ "name": "Code Reviewer", "description": "Soát lỗi code", "content": "Bạn là chuyên gia soát lỗi..." }` | 1. Status: HTTP 201 Created.<br>2. Bản ghi được lưu chính xác vào SQLite.<br>3. `id` bắt đầu bằng `sp_`.<br>4. `created_at` và `updated_at` được gán thời gian hiện tại. |
| **SPM-TC-010** | Chặn tạo mới khi trường Tên hoặc Nội dung bị rỗng | SPM-FR-008 | **P0** | User A đã đăng nhập. | 1. Gửi POST với `name: "   "` (toàn khoảng trắng).<br>2. Gửi POST với `content: ""`. | Payload rỗng | 1. Status: HTTP 422 Unprocessable Content.<br>2. CSDL không phát sinh bản ghi mới nào. |
| **SPM-TC-011** | Chặn tạo mới khi Nội dung vượt quá 10.000 ký tự (Boundary Check) | SPM-FR-008 | **P0** | User A đã đăng nhập. | 1. Gửi POST với chuỗi `content` dài 10.001 ký tự. | String length = 10.001 | 1. Status: HTTP 422 Unprocessable Content.<br>2. Báo lỗi trường `content` vượt quá độ dài tối đa. |
| **SPM-TC-012** | Chấp nhận tạo mới khi Nội dung đúng 10.000 ký tự (Boundary Edge) | SPM-FR-008 | **P1** | User A đã đăng nhập. | 1. Gửi POST với chuỗi `content` dài đúng 10.000 ký tự. | String length = 10.000 | 1. Status: HTTP 201 Created.<br>2. Lưu thành công vào CSDL. |

---

### 3.4. Nhóm 4: Chỉnh Sửa, Cập Nhật & Xung Đột Trùng Tên (SPM-TC-013 đến SPM-TC-017)

| Test Case ID | Tên Kịch Bản Kiểm Thử | Yêu Cầu Liên Quan | Priority | Tiền Điều Kiện | Các Bước Thực Hiện | Dữ Liệu Kiểm Thử | Kết Quả Mong Đợi |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SPM-TC-013** | Cập nhật thành công tên, mô tả và nội dung prompt | SPM-FR-007 | **P0** | Prompt `sp_01` thuộc User A đang có sẵn trong CSDL. | 1. Gửi `PUT /api/v1/system-prompts/sp_01` với thông tin cập nhật.<br>2. Kiểm tra CSDL. | Payload cập nhật mới | 1. Status: HTTP 200 OK.<br>2. Dữ liệu trong CSDL được cập nhật chính xác.<br>3. `updated_at` mới hơn `created_at`. |
| **SPM-TC-014** | Chặn tạo mới trùng tên trong cùng một tài khoản (HTTP 409) | SPM-FR-009 | **P0** | User A đã có prompt mang tên "Python Pro". | 1. Gửi POST tạo mới prompt thứ hai với tên "python pro" (khác chữ hoa/thường). | `name: "python pro"` | 1. Status: HTTP 409 Conflict.<br>2. Error code: `PROMPT_NAME_CONFLICT`.<br>3. Không phát sinh bản ghi trùng lặp trong DB. |
| **SPM-TC-015** | Cho phép hai người dùng khác nhau đặt trùng tên prompt | SPM-FR-009 | **P1** | User A đã có prompt mang tên "Python Pro". | 1. User B gửi POST tạo mới prompt cũng mang tên "Python Pro". | Token User B, `name: "Python Pro"` | 1. Status: HTTP 201 Created.<br>2. Thành công vì tính duy nhất chỉ nằm trong phạm vi cùng `user_id`. |
| **SPM-TC-016** | Chặn cập nhật đổi tên thành tên đã tồn tại ở bản ghi khác (HTTP 409) | SPM-FR-009 | **P1** | User A có 2 prompt: "Prompt 1" và "Prompt 2". | 1. Gửi PUT sửa "Prompt 2" đổi tên thành "Prompt 1". | Đổi tên trùng bản ghi khác | 1. Status: HTTP 409 Conflict.<br>2. Bản ghi không bị sửa đổi. |
| **SPM-TC-017** | Cho phép lưu cập nhật khi giữ nguyên tên cũ | SPM-FR-009 | **P1** | User A có prompt "Prompt 1". | 1. Gửi PUT cập nhật nội dung cho "Prompt 1", giữ nguyên `name: "Prompt 1"`. | Giữ nguyên tên cũ | 1. Status: HTTP 200 OK.<br>2. Không bị báo lỗi 409 vì trùng với chính nó. |

---

### 3.5. Nhóm 5: Bảo Toàn Dữ Liệu Unicode & Safe Rendering (SPM-TC-018 đến SPM-TC-020)

| Test Case ID | Tên Kịch Bản Kiểm Thử | Yêu Cầu Liên Quan | Priority | Tiền Điều Kiện | Các Bước Thực Hiện | Dữ Liệu Kiểm Thử | Kết Quả Mong Đợi |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SPM-TC-018** | Bảo toàn 100% tiếng Việt có dấu, xuống dòng và ký tự code | SPM-FR-010 | **P0** | User A đã đăng nhập. | 1. Tạo prompt chứa: Tiếng Việt có dấu, nhiều dòng trống, tab thụt lề, emoji, ký tự code JSON/HTML.<br>2. Đọc lại bản ghi qua API.<br>3. So sánh chuỗi ban đầu và chuỗi nhận về. | Đoạn văn bản mẫu: Tiếng Việt, `\n\n`, `    indent`, `{"json": true}`, `<xml>` | Chuỗi nhận về từ API giống tuyệt đối từng byte với chuỗi gửi đi (`assert response_text == input_text`). |
| **SPM-TC-019** | Safe Rendering: Chống Stored XSS khi render nội dung độc hại | SPM-FR-011 | **P0** | Prompt chứa mã script độc hại đã được lưu trong CSDL. | 1. Mở trang xem chi tiết `/prompts/{id}` trên trình duyệt.<br>2. Kiểm tra DOM và console trình duyệt. | `content: "<script>window.xss_triggered=true;</script><img src=x onerror=alert(1)>"` | 1. Đoạn script hiển thị nguyên vẹn dưới dạng văn bản text.<br>2. Biến `window.xss_triggered` là `undefined`.<br>3. Không có popup alert nào kích hoạt. |
| **SPM-TC-020** | Modal cảnh báo rời trang khi form đang Dirty | SPM-FR-012 | **P1** | Đang mở form `/prompts/new` hoặc `/prompts/{id}/edit`. | 1. Gõ 1 ký tự vào ô nội dung.<br>2. Nhấp nút "Quay lại" hoặc liên kết điều hướng khác. | Form dirty | 1. Hiển thị Modal: "Bạn có thay đổi chưa lưu...".<br>2. Bấm "Ở lại" -> Không chuyển trang.<br>3. Bấm "Rời đi" -> Chuyển trang thành công. |

---

### 3.6. Nhóm 6: Xóa Bản Ghi & Kiểm Soát Bảo Mật Anti-IDOR (SPM-TC-021 đến SPM-TC-026)

| Test Case ID | Tên Kịch Bản Kiểm Thử | Yêu Cầu Liên Quan | Priority | Tiền Điều Kiện | Các Bước Thực Hiện | Dữ Liệu Kiểm Thử | Kết Quả Mong Đợi |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SPM-TC-021** | Xóa vĩnh viễn System Prompt thành công | SPM-FR-004 | **P0** | Prompt `sp_del_01` thuộc User A có sẵn trong DB. | 1. Gửi `DELETE /api/v1/system-prompts/sp_del_01` kèm token User A.<br>2. Truy vấn trực tiếp vào SQLite. | `id: "sp_del_01"` | 1. Status: HTTP 200 OK.<br>2. Bản ghi bị xóa hoàn toàn khỏi bảng `system_prompts`.<br>3. Gọi lại GET trả về HTTP 404. |
| **SPM-TC-022** | Chống IDOR: User B không thể đọc System Prompt của User A | SPM-FR-014 | **P0** | Prompt `sp_user_a` thuộc sở hữu của User A. | 1. Gửi `GET /api/v1/system-prompts/sp_user_a` với token của User B. | Token User B, ID User A | 1. Status: HTTP 404 Not Found.<br>2. User B hoàn toàn không đọc được dữ liệu của User A. |
| **SPM-TC-023** | Chống IDOR: User B không thể sửa System Prompt của User A | SPM-FR-014 | **P0** | Prompt `sp_user_a` thuộc sở hữu của User A. | 1. Gửi `PUT /api/v1/system-prompts/sp_user_a` với token của User B. | Token User B | 1. Status: HTTP 404 Not Found.<br>2. Dữ liệu trong CSDL giữ nguyên không bị thay đổi. |
| **SPM-TC-024** | Chống IDOR: User B không thể xóa System Prompt của User A | SPM-FR-014 | **P0** | Prompt `sp_user_a` thuộc sở hữu của User A. | 1. Gửi `DELETE /api/v1/system-prompts/sp_user_a` với token của User B. | Token User B | 1. Status: HTTP 404 Not Found.<br>2. Bản ghi của User A vẫn tồn tại an toàn trong CSDL. |
| **SPM-TC-025** | Tự động xóa xếp tầng khi tài khoản User bị xóa (Cascade Delete) | SPM-BR-001 | **P1** | User A có 5 System Prompt trong CSDL. | 1. Xóa tài khoản User A trong bảng `users`.<br>2. Đếm số lượng prompt của User A trong `system_prompts`. | Xóa User A | Số lượng prompt của User A trong `system_prompts` tự động về 0 (Cascade success). |
| **SPM-TC-026** | Nhật ký ứng dụng không để lộ nội dung prompt (Privacy Log Test) | SPM-FR-016 | **P0** | Tạo prompt chứa chuỗi bí mật đặc biệt. | 1. Gửi POST tạo prompt chứa bí mật: `"SUPER_SECRET_KEY_9999"`.<br>2. Kiểm tra log stream hoặc file log. | Secret string | 1. File log chỉ ghi `content_length = ...`.<br>2. Chuỗi bí mật `SUPER_SECRET_KEY_9999` KHÔNG xuất hiện trong bất kỳ dòng log nào. |
