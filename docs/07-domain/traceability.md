# MA TRẬN TRUY VẾT MÔ HÌNH MIỀN (DOMAIN TRACEABILITY MATRIX)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `DOM-TRACE-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Thiết lập ma trận truy vết từ Yêu cầu chức năng / Quy tắc nghiệp vụ -> Thực thể -> Cụm kết hợp -> Bất biến miền |

---

## 1. Ma Trận Truy Vết Phần Tử Miền

| Mã Yêu Cầu | Quy Tắc Nghiệp Vụ | Thực Thể / Đối Tượng Giá Trị | Cụm Kết Hợp (Aggregate) | Bất Biến Miền (Invariant) |
| :--- | :--- | :--- | :--- | :--- |
| **`FR-001`** | `BR-001`, `BR-006` | `User`, `EmailAddress`, `HashedPassword` | `User Aggregate` | `INV-04` (Password Hash Invariant) |
| **`FR-002`** | `BR-001`, `SEC-004`| `User`, `HashedPassword` | `User Aggregate` | `INV-04` |
| **`FR-003`** | `BR-001` | `User` | `User Aggregate` | - |
| **`FR-004`** | `BR-001`, `BR-004`| `Conversation`, `ConversationTitle` | `Conversation Aggregate` | `INV-03` (Auto-Title Invariant) |
| **`FR-005`** | `BR-002`, `NFR-018`| `Conversation`, `user_id` | `Conversation Aggregate` | `INV-01` (Ownership Invariant) |
| **`FR-006`** | `BR-002`, `BR-004`| `Conversation`, `ConversationTitle` | `Conversation Aggregate` | `INV-01`, `INV-03` |
| **`FR-007`** | `BR-002`, `NFR-018`| `Conversation`, `Message` (Cascade Delete) | `Conversation Aggregate` | `INV-01` |
| **`FR-008`** | `BR-003` | `Message`, `MessageContent` | `Conversation Aggregate` | `INV-02` (Message Length Invariant) |
| **`FR-009`** | `BR-005` | `Message`, `ModelIdentifier` | `Conversation Aggregate` | - |
| **`FR-010`** | `BR-005` | `Message`, `ModelIdentifier` (`gemini-*`) | `Conversation Aggregate` | - |
| **`FR-011`** | `BR-005` | `Message`, `ModelIdentifier` (`gpt-*`) | `Conversation Aggregate` | - |
| **`FR-012`** | `BR-002` | `Message`, `Conversation` | `Conversation Aggregate` | `INV-01` |
| **`FR-014`** | `BR-005` | `ModelIdentifier` | `Conversation Aggregate` | - |

---

## 2. Kết Quả Thẩm Định Chất Lượng Phase 07
- **Quality Gate**: **`READY_FOR_NEXT_PHASE`**
- Tất cả các quy tắc nghiệp vụ `BR-001..006` đã được mô hình hóa thành các Invariants hướng miền bền vững.
