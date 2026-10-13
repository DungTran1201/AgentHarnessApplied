# MA TRẬN TRUY VẾT QUY TRÌNH NGHIỆP VỤ (PROCESS TRACEABILITY MATRIX)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `BP-TRACE-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Thiết lập ma trận liên kết truy vết hai chiều (Bidirectional Traceability) từ Mục tiêu kinh doanh (`BO-###`) -> Yêu cầu chức năng/phi chức năng (`FR-###`/`NFR-###`) -> Quy tắc nghiệp vụ (`BR-###`) -> Quy trình nghiệp vụ (`BP-### [PROC-###]`) -> Tiêu chí chấp nhận (`AC-###`) |

---

## 1. Ma Trận Truy Vết Toàn Diện Từ Yêu Cầu Đến Quy Trình

| Mã Yêu Cầu | Năng Lực Nghiệp Vụ (Capability) | Quy Trình Nghiệp Vụ Tương Ứng | Quy Tắc Nghiệp Vụ | Tiêu Chí Chấp Nhận (AC) | Trạng Thái Phủ Sóng |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`FR-001`** | `CAP-AUTH-01` (Đăng ký tài khoản) | **`BP-AUTH-001 [PROC-001]`** | `BR-001`, `BR-006` | **`AC-001`** | **100% COVERED** |
| **`FR-002`** | `CAP-AUTH-02` (Đăng nhập tài khoản) | **`BP-AUTH-002 [PROC-002]`** | `BR-001`, `BR-006` | **`AC-002`** | **100% COVERED** |
| **`FR-003`** | `CAP-AUTH-03` (Đăng xuất tài khoản) | **`BP-AUTH-003 [PROC-003]`** | `BR-001` | `AC-002` | **100% COVERED** |
| **`FR-004`** | `CAP-CONV-01` (Tạo cuộc trò chuyện) | **`BP-CONV-001 [PROC-004]`** | `BR-001`, `BR-002`, `BR-004` | **`AC-003`** | **100% COVERED** |
| **`FR-005`** | `CAP-CONV-02` (Xem danh sách chat) | **`BP-CONV-002 [PROC-005]`** | `BR-001`, `BR-002` | **`AC-003`** | **100% COVERED** |
| **`FR-006`** | `CAP-CONV-03` (Đổi tên cuộc chat) | **`BP-CONV-003 [PROC-006]`** | `BR-002`, `BR-004` | **`AC-003`** | **100% COVERED** |
| **`FR-007`** | `CAP-CONV-04` (Xóa cuộc trò chuyện) | **`BP-CONV-004 [PROC-007]`** | `BR-001`, `BR-002` | **`AC-003`** | **100% COVERED** |
| **`FR-008`** | `CAP-CHAT-01` (Gửi tin nhắn đàm thoại) | **`BP-CHAT-001 [PROC-008]`** | `BR-001`, `BR-002`, `BR-003` | **`AC-004`** | **100% COVERED** |
| **`FR-009`** | `CAP-CHAT-02` (Stream phản hồi SSE) | **`BP-CHAT-001 [PROC-008]`** | `BR-005` | **`AC-004`** | **100% COVERED** |
| **`FR-010`** | `CAP-AI-01` (Tích hợp Google Gemini) | **`BP-AI-001 [PROC-009]`** | `BR-005` | **`AC-004`** | **100% COVERED** |
| **`FR-011`** | `CAP-AI-02` (Tự động chuyển vùng Failover) | **`BP-AI-001 [PROC-009]`** | `BR-005` | **`AC-004`** | **100% COVERED** |
| **`FR-012`** | `CAP-CHAT-04` (Lưu lịch sử tin nhắn) | **`BP-CHAT-001`, `BP-CONV-002`** | `BR-001`, `BR-002` | **`AC-003`, `AC-004`** | **100% COVERED** |
| **`FR-013`** | `CAP-CHAT-03` (Render Markdown & Code) | **`BP-CHAT-001 [PROC-008]`** | - | **`AC-004`** | **100% COVERED** |
| **`FR-014`** | `CAP-AI-03` (Chuyển đổi mô hình) | **`BP-AI-001 [PROC-009]`** | `BR-005` | **`AC-004`** | **100% COVERED** |
| **`NFR-003`** | Hiệu năng độ trễ phản hồi (< 2s) | `BP-CHAT-001 [PROC-008]` | `BR-005` | `AC-004` | **100% COVERED** |
| **`NFR-007`** | Giới hạn tần suất Ingress/Backend | **`BP-SEC-001 [PROC-010]`** | `BR-006` | **`AC-005`** | **100% COVERED** |
| **`NFR-008`** | Giới hạn thời gian chờ AI (30s) | `BP-AI-001 [PROC-009]` | `BR-005` | `AC-004` | **100% COVERED** |
| **`NFR-018`** | Cô lập dữ liệu cá nhân & IDOR | `BP-CONV-002..004`, `BP-CHAT-001` | `BR-002` | `AC-003` | **100% COVERED** |
| **`SEC-002`** | Mã hóa băm mật khẩu bcrypt | `BP-AUTH-001 [PROC-001]` | - | `AC-001` | **100% COVERED** |
| **`SEC-004`** | Bảo vệ phiên với HttpOnly Cookie | `BP-AUTH-002 [PROC-002]` | `BR-001` | `AC-002` | **100% COVERED** |
| **`SEC-005`** | Ngăn ngừa tấn công lạm dụng & DoS | `BP-SEC-001 [PROC-010]` | `BR-006` | `AC-005` | **100% COVERED** |

---

## 2. Kiểm Tra Tính Toàn Vẹn Của Truy Vết (Traceability Integrity Audit)

- [x] **Không có Yêu cầu chức năng mồ côi (Zero Orphan FRs)**: 14/14 yêu cầu chức năng từ `FR-001` đến `FR-014` đều được ánh xạ đầy đủ vào ít nhất một quy trình nghiệp vụ.
- [x] **Không có Quy tắc nghiệp vụ mồ côi (Zero Orphan BRs)**: 6/6 quy tắc nghiệp vụ từ `BR-001` đến `BR-006` đều được gán vị trí thực thi cụ thể trong các luồng quy trình.
- [x] **Không có Quy trình mồ côi (Zero Orphan Processes)**: 10/10 quy trình nghiệp vụ từ `BP-AUTH-001 [PROC-001]` đến `BP-SEC-001 [PROC-010]` đều bắt nguồn trực tiếp từ các yêu cầu chức năng hoặc phi chức năng của Requirements Baseline.
- [x] **Liên kết chặt chẽ với Tiêu chí chấp nhận (AC Alignment)**: Mọi quy trình cốt lõi đều có kịch bản Given-When-Then tương ứng từ `AC-001` đến `AC-005` để kiểm chứng khi kết thúc.
