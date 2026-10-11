# MA TRẬN TRUY VẾT HÀNH VI HỆ THỐNG (BEHAVIOR TRACEABILITY MATRIX)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `BEH-TRACE-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Thiết lập ma trận truy vết từ Yêu cầu chức năng -> Sơ đồ tuần tự -> Máy trạng thái |

---

## 1. Ma Trận Truy Vết Sơ Đồ Tuần Tự & Trạng Thái

| Mã Yêu Cầu | Ca Sử Dụng (Use Case) | Sơ Đồ Tuần Tự (Sequence) | Máy Trạng Thái (State Machine) | Quy Tắc Nghiệp Vụ Áp Dụng |
| :--- | :--- | :--- | :--- | :--- |
| **`FR-001`** | `UC-AUTH-001 [UC-001]` | **`SEQ-001`** (Registration & Bcrypt) | - | `SEC-002`, `BR-001` |
| **`FR-002`** | `UC-AUTH-002 [UC-002]` | **`SEQ-002`** (Login & Cookie Set) | **`STATE-003`** (Session Lifecycle) | `SEC-004`, `BR-001` |
| **`FR-003`** | `UC-AUTH-003 [UC-003]` | `SEQ-002` (Revocation branch) | **`STATE-003`** (Revoked transition) | `BR-001` |
| **`FR-004`** | `UC-CONV-001 [UC-004]` | - | **`STATE-001`** (New conversation) | `BR-001`, `BR-004` |
| **`FR-006`** | `UC-CONV-003 [UC-006]` | - | **`STATE-001`** (Active state) | `BR-004` |
| **`FR-007`** | `UC-CONV-004 [UC-007]` | - | **`STATE-001`** (Deleted state) | `BR-002` |
| **`FR-008`** | `UC-CHAT-001 [UC-008]` | **`SEQ-003`** (Chat Streaming) | **`STATE-002`** (Message Delivery) | `BR-003` |
| **`FR-009`** | `UC-CHAT-001 [UC-008]` | **`SEQ-003`** (Chunk SSE Loop) | **`STATE-002`** (Streaming state) | `NFR-003` |
| **`FR-010`** | `UC-CHAT-001 [UC-008]` | **`SEQ-003`** (Gemini Primary Call) | **`STATE-002`** | `BR-005` |
| **`FR-011`** | `UC-CHAT-001 [UC-008]` | **`SEQ-004`** (LLM Failover Flow) | **`STATE-002`** (Failover branch) | `BR-005`, `NFR-008` |
| **`FR-012`** | `UC-CHAT-001 [UC-008]` | **`SEQ-003`** (Assistant DB Persistence)| **`STATE-002`** (Completed state) | `BR-002` |

---

## 2. Kết Quả Thẩm Định Chất Lượng Phase 09
- **Quality Gate**: **`READY_FOR_NEXT_PHASE`**
- Toàn bộ các luồng tương tác và trạng thái vận hành đã được mô hình hóa chuẩn xác với các mã định danh ổn định `SEQ-001..004` và `STATE-001..003`.
