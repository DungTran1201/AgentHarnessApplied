# MA TRẬN TRUY VẾT AN NINH HỆ THỐNG (SECURITY TRACEABILITY MATRIX)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `SEC-TRACE-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Thiết lập ma trận truy vết từ Yêu cầu an ninh -> Mối đe dọa STRIDE -> Biện pháp kiểm soát kỹ thuật |

---

## 1. Ma Trận Đối Chiếu Mối Đe Dọa & Biện Pháp Kiểm Soát

| Mã Yêu Cầu | Mối Đe Dọa STRIDE | Mức Độ Rủi Ro | Biện Pháp Kiểm Soát Kỹ Thuật | Thành Phần Hiện Thực |
| :--- | :--- | :--- | :--- | :--- |
| **`SEC-001`** | **`THR-001`** (Nghe lén đường truyền) | Nghiêm trọng | **`CTRL-001`** (TLS 1.2/1.3 & HSTS) | `ai-infra` (Nginx Ingress) |
| **`SEC-002`** | `THR-001` (Rò rỉ cơ sở dữ liệu) | Nghiêm trọng | Băm mật khẩu bằng bcrypt | `ai-backend` (AuthService) |
| **`SEC-004`** | `THR-001` (Đánh cắp session qua XSS) | Nghiêm trọng | HttpOnly Secure Cookie | `ai-backend` (JWT Cookie Manager) |
| **`SEC-005`** | **`THR-002`** (L7 HTTP Flood & DDoS) | Cao | **`CTRL-002`** (Dual-Tier Rate Limiting) | `ai-infra` (Nginx) & `ai-backend` |
| **`NFR-007`** | **`THR-003`** (Cạn kiệt socket Slowloris)| Cao | **`CTRL-003`** (Connection Limits & Timeouts) | `ai-infra` (Nginx limit_conn) |
| **`BR-003`** | **`THR-004`** (Tràn RAM do payload lớn)| Trung bình | **`CTRL-004`** (Payload Caps <= 4000 chars) | `ai-infra` & `ai-backend` |
| - | **`THR-005`** (Clickjacking) | Trung bình | **`CTRL-005`** (Hardened Security Headers) | `ai-infra` (Nginx headers) |
| **`BR-002`**, **`NFR-018`** | **`THR-006`** (Truy cập trái phép IDOR) | Nghiêm trọng | **`CTRL-006`** (Mandatory User Scoping) | `ai-backend` (SQL WHERE user_id) |

---

## 2. Kết Quả Thẩm Định Chất Lượng Phase 10
- **Quality Gate**: **`READY_FOR_NEXT_PHASE`**
- 100% mối đe dọa STRIDE đã có biện pháp kiểm soát kỹ thuật tương ứng và được liên kết đầy đủ với các yêu cầu bảo mật.
