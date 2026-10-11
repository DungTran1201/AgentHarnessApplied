# MA TRẬN PHỦ SÓNG TÁC NHÂN & CA SỬ DỤNG (USE CASE COVERAGE MATRIX)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `UC-MATRIX-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Kiểm tra độ phủ sóng toàn diện giữa Tác nhân, Mục tiêu nghiệp vụ, Ca sử dụng, Yêu cầu và Quy trình nghiệp vụ, bảo đảm không có tác nhân hoặc mục tiêu nào bị bỏ sót |

---

## 1. Ma Trận Đối Chiếu Tác Nhân & Ca Sử Dụng

| Tác Nhân | Mục Tiêu Nghiệp Vụ Của Actor | Mã Use Case | Mã Truy Vết | Độ Ưu Tiên | Yêu Cầu Liên Quan | Quy Trình Tương Ứng | Tiêu Chí Chấp Nhận |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`ACT-01` (Guest)** | Mở tài khoản thành viên mới | `UC-AUTH-001` | `UC-001` | `MUST` | `FR-001`, `SEC-002` | `BP-AUTH-001 [PROC-001]` | `AC-001` |
| **`ACT-01` (Guest)** | Đăng nhập tài khoản | `UC-AUTH-002` | `UC-002` | `MUST` | `FR-002`, `SEC-004` | `BP-AUTH-002 [PROC-002]` | `AC-002` |
| **`ACT-02` (User)** | Xác thực & vào giao diện chat | `UC-AUTH-002` | `UC-002` | `MUST` | `FR-002`, `SEC-004` | `BP-AUTH-002 [PROC-002]` | `AC-002` |
| **`ACT-02` (User)** | Thoát phiên làm việc bảo mật | `UC-AUTH-003` | `UC-003` | `MUST` | `FR-003`, `SEC-004` | `BP-AUTH-003 [PROC-003]` | `AC-002` |
| **`ACT-02` (User)** | Mở cuộc trò chuyện mới | `UC-CONV-001` | `UC-004` | `MUST` | `FR-004`, `BR-001` | `BP-CONV-001 [PROC-004]` | `AC-003` |
| **`ACT-02` (User)** | Xem lịch sử và chọn cuộc chat | `UC-CONV-002` | `UC-005` | `MUST` | `FR-005`, `FR-012`, `BR-002` | `BP-CONV-002 [PROC-005]` | `AC-003` |
| **`ACT-02` (User)** | Đặt lại tiêu đề gợi nhớ | `UC-CONV-003` | `UC-006` | `SHOULD` | `FR-006`, `BR-004` | `BP-CONV-003 [PROC-006]` | `AC-003` |
| **`ACT-02` (User)** | Xóa cuộc trò chuyện cũ | `UC-CONV-004` | `UC-007` | `MUST` | `FR-007`, `BR-002` | `BP-CONV-004 [PROC-007]` | `AC-003` |
| **`ACT-02` (User)** | Đặt câu hỏi và nhận trả lời AI | `UC-CHAT-001` | `UC-008` | `MUST` | `FR-008..013`, `BR-003..005` | `BP-CHAT-001 [PROC-008]` | `AC-004` |
| **`ACT-02` (User)** | Lựa chọn model AI phù hợp | `UC-CHAT-002` | `UC-009` | `SHOULD` | `FR-014`, `BR-005` | `BP-AI-001 [PROC-009]` | `AC-004` |

---

## 2. Đánh Giá Độ Toàn Vẹn Phủ Sóng (Coverage Audit)

1. **Độ Phủ Của Tác Nhân (`Actor Coverage`)**:
   - `ACT-01` (Guest): Có 2 mục tiêu nghiệp vụ rõ ràng (Đăng ký, Đăng nhập) -> Đã phủ sóng 100%.
   - `ACT-02` (User): Có 8 mục tiêu nghiệp vụ tương ứng với 8 Ca sử dụng -> Đã phủ sóng 100%.
   - Không có tác nhân nào không có Use Case (`0 Orphan Actors`).
2. **Độ Phủ Của Năng Lực Nghiệp Vụ (`Capability Coverage`)**:
   - 100% năng lực nghiệp vụ từ `CAP-AUTH-01..03`, `CAP-CONV-01..04`, `CAP-CHAT-01..04`, `CAP-AI-01..03` đều được chuyển hóa thành các Ca sử dụng thực tiễn.
3. **Phân Định Trách Nhiệm Quyền Hạn (`Authorization Alignment`)**:
   - Toàn bộ các thao tác trên tài nguyên cuộc trò chuyện (`UC-CONV-001..004`) và đàm thoại (`UC-CHAT-001..002`) đều ràng buộc chặt chẽ với vai trò `ACT-02` đã xác thực (`BR-001`, `BR-002`).
