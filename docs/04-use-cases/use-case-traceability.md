# MA TRẬN TRUY VẾT CA SỬ DỤNG (USE CASE TRACEABILITY MATRIX)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `UC-TRACE-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Thiết lập ma trận liên kết truy vết hai chiều (Bidirectional Traceability) từ Yêu cầu chức năng/phi chức năng -> Năng lực hệ thống -> Quy trình nghiệp vụ -> Ca sử dụng -> Tiêu chí chấp nhận |

---

## 1. Ma Trận Truy Vết Toàn Diện Từ Yêu Cầu Đến Ca Sử Dụng

| Mã Yêu Cầu | Năng Lực (Capability) | Quy Trình Nghiệp Vụ | Ca Sử Dụng (Use Case) | Quy Tắc Nghiệp Vụ | Tiêu Chí Chấp Nhận (AC) | Trạng Thái Phủ Sóng |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`FR-001`** | `CAP-AUTH-01` | `BP-AUTH-001 [PROC-001]` | **`UC-AUTH-001 [UC-001]`** | `BR-001`, `BR-006` | **`AC-001`** | **100% COVERED** |
| **`FR-002`** | `CAP-AUTH-02` | `BP-AUTH-002 [PROC-002]` | **`UC-AUTH-002 [UC-002]`** | `BR-001`, `BR-006` | **`AC-002`** | **100% COVERED** |
| **`FR-003`** | `CAP-AUTH-03` | `BP-AUTH-003 [PROC-003]` | **`UC-AUTH-003 [UC-003]`** | `BR-001` | `AC-002` | **100% COVERED** |
| **`FR-004`** | `CAP-CONV-01` | `BP-CONV-001 [PROC-004]` | **`UC-CONV-001 [UC-004]`** | `BR-001`, `BR-002`, `BR-004`| **`AC-003`** | **100% COVERED** |
| **`FR-005`** | `CAP-CONV-02` | `BP-CONV-002 [PROC-005]` | **`UC-CONV-002 [UC-005]`** | `BR-001`, `BR-002` | **`AC-003`** | **100% COVERED** |
| **`FR-006`** | `CAP-CONV-03` | `BP-CONV-003 [PROC-006]` | **`UC-CONV-003 [UC-006]`** | `BR-002`, `BR-004` | **`AC-003`** | **100% COVERED** |
| **`FR-007`** | `CAP-CONV-04` | `BP-CONV-004 [PROC-007]` | **`UC-CONV-004 [UC-007]`** | `BR-001`, `BR-002` | **`AC-003`** | **100% COVERED** |
| **`FR-008`** | `CAP-CHAT-01` | `BP-CHAT-001 [PROC-008]` | **`UC-CHAT-001 [UC-008]`** | `BR-001`, `BR-002`, `BR-003`| **`AC-004`** | **100% COVERED** |
| **`FR-009`** | `CAP-CHAT-02` | `BP-CHAT-001 [PROC-008]` | **`UC-CHAT-001 [UC-008]`** | `BR-005` | **`AC-004`** | **100% COVERED** |
| **`FR-010`** | `CAP-AI-01` | `BP-AI-001 [PROC-009]` | **`UC-CHAT-001 [UC-008]`** | `BR-005` | **`AC-004`** | **100% COVERED** |
| **`FR-011`** | `CAP-AI-02` | `BP-AI-001 [PROC-009]` | **`UC-CHAT-001 [UC-008]`** | `BR-005` | **`AC-004`** | **100% COVERED** |
| **`FR-012`** | `CAP-CHAT-04` | `BP-CHAT-001`, `BP-CONV-002` | **`UC-CHAT-001`, `UC-CONV-002`** | `BR-001`, `BR-002` | **`AC-003`, `AC-004`**| **100% COVERED** |
| **`FR-013`** | `CAP-CHAT-03` | `BP-CHAT-001 [PROC-008]` | **`UC-CHAT-001 [UC-008]`** | - | **`AC-004`** | **100% COVERED** |
| **`FR-014`** | `CAP-AI-03` | `BP-AI-001 [PROC-009]` | **`UC-CHAT-002 [UC-009]`** | `BR-005` | **`AC-004`** | **100% COVERED** |
| **`NFR-003`** | Độ trễ SSE (< 2s) | `BP-CHAT-001 [PROC-008]` | **`UC-CHAT-001 [UC-008]`** | `BR-005` | `AC-004` | **100% COVERED** |
| **`NFR-007`** | Rate Limiting | `BP-SEC-001 [PROC-010]` | Toàn bộ các Use Cases | `BR-006` | **`AC-005`** | **100% COVERED** |
| **`NFR-008`** | Timeout AI (30s) | `BP-AI-001 [PROC-009]` | **`UC-CHAT-001 [UC-008]`** | `BR-005` | `AC-004` | **100% COVERED** |
| **`NFR-018`** | Cô lập dữ liệu & IDOR | `BP-CONV-002..004`, `BP-CHAT-001` | **`UC-CONV-002..004`, `UC-CHAT-001`** | `BR-002` | `AC-003` | **100% COVERED** |
| **`SEC-002`** | Băm mật khẩu bcrypt | `BP-AUTH-001 [PROC-001]` | **`UC-AUTH-001 [UC-001]`** | - | `AC-001` | **100% COVERED** |
| **`SEC-004`** | HttpOnly Cookie bảo vệ | `BP-AUTH-002 [PROC-002]` | **`UC-AUTH-002 [UC-002]`** | `BR-001` | `AC-002` | **100% COVERED** |
| **`SEC-005`** | Chống tấn công lạm dụng | `BP-SEC-001 [PROC-010]` | Toàn bộ các Use Cases | `BR-006` | `AC-005` | **100% COVERED** |

---

## 2. Kiểm Tra Tính Toàn Vẹn Của Truy Vết (Traceability Integrity Audit)

- [x] **Zero Orphan FRs**: Toàn bộ 14 Yêu cầu chức năng (`FR-001` đến `FR-014`) đều được hiện thực hóa qua các Ca sử dụng tương ứng.
- [x] **Zero Orphan BRs**: Toàn bộ 6 Quy tắc nghiệp vụ (`BR-001` đến `BR-006`) đều được kiểm soát trong các bước hoặc preconditions của Ca sử dụng.
- [x] **Zero Orphan Use Cases**: 9/9 Ca sử dụng từ `UC-AUTH-001 [UC-001]` đến `UC-CHAT-002 [UC-009]` đều truy vết ngược về các Yêu cầu chức năng và Quy trình nghiệp vụ có cơ sở pháp lý vững chắc.
- [x] **Acceptance Criteria Verification**: Mọi kịch bản thành công và ngoại lệ của Use Case đều sẵn sàng kiểm thử tự động hoặc kiểm thử thủ công qua bộ tiêu chí Given-When-Then (`AC-001` đến `AC-005`).
