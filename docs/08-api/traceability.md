# MA TRẬN TRUY VẾT GIAO DIỆN LẬP TRÌNH API (API TRACEABILITY MATRIX)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `API-TRACE-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Thiết lập ma trận truy vết từ Yêu cầu chức năng / Ca sử dụng -> Điểm cuối API -> Mã thao tác trong OpenAPI |

---

## 1. Ma Trận Truy Vết Điểm Cuối API (API Endpoints Traceability)

| Mã Yêu Cầu | Ca Sử Dụng (Use Case) | Phương Thức & Đường Dẫn API | Operation ID (OpenAPI) | Quy Tắc Nghiệp Vụ Áp Dụng |
| :--- | :--- | :--- | :--- | :--- |
| **`FR-001`** | `UC-AUTH-001 [UC-001]` | `POST /api/v1/auth/register` | `registerUser` | `BR-001`, `BR-006` |
| **`FR-002`** | `UC-AUTH-002 [UC-002]` | `POST /api/v1/auth/login` | `loginUser` | `BR-001`, `SEC-004`, `BR-006` |
| **`FR-003`** | `UC-AUTH-003 [UC-003]` | `POST /api/v1/auth/logout` | `logoutUser` | `BR-001` |
| - | - | `GET /api/v1/auth/me` | `getCurrentUser` | `BR-001` |
| **`FR-004`** | `UC-CONV-001 [UC-004]` | `POST /api/v1/conversations` | `createConversation` | `BR-001`, `BR-004` |
| **`FR-005`** | `UC-CONV-002 [UC-005]` | `GET /api/v1/conversations` | `listConversations` | `BR-001`, `BR-002` |
| **`FR-006`** | `UC-CONV-003 [UC-006]` | `PATCH /api/v1/conversations/{id}` | `renameConversation` | `BR-002`, `BR-004` |
| **`FR-007`** | `UC-CONV-004 [UC-007]` | `DELETE /api/v1/conversations/{id}`| `deleteConversation` | `BR-001`, `BR-002` |
| **`FR-012`** | `UC-CONV-002 [UC-005]` | `GET /api/v1/conversations/{id}/messages` | `getMessages` | `BR-001`, `BR-002` |
| **`FR-008`..`FR-014`** | `UC-CHAT-001..002` | `POST /api/v1/chat/conversations/{id}/stream` | `streamChat` | `BR-003`, `BR-005`, `BR-006` |
| - | - | `GET /api/v1/health` | `healthCheck` | - |

---

## 2. Kết Quả Thẩm Định Chất Lượng Phase 08
- **Quality Gate**: **`READY_FOR_NEXT_PHASE`**
- Hợp đồng API hoàn toàn sẵn sàng và đồng bộ với cả tài liệu phân tích kỹ thuật lẫn tệp chuẩn máy đọc `openapi.yaml`.
