# 14. MA TRẬN TRUY VẾT YÊU CẦU & THIẾT KẾ (TRACEABILITY MATRIX)
## Phân Hệ: Tích Hợp Thư Viện System Prompt Vào Visual Project Editor & Chat Runtime
### Nền Tảng: AI-Chan Virtual Assistant Platform

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `DOC-SPN-TRC-01` |
| **Trạng Thái** | `PROPOSED` |
| **Phiên Bản** | `1.0.0-MVP` |
| **Ngày Lập** | `2026-10-11` |

---

## 1. Bảng Truy Vết Yêu Cầu Xuyên Suốt (End-to-End Traceability Matrix)

Bảng dưới đây thiết lập chuỗi truy vết liên tục từ Yêu cầu Nghiệp vụ (`FR` / `NFR`) qua Quy tắc & Kiến trúc, Biểu đồ Mermaid, Hợp đồng API tới Tiêu chí Nghiệm thu (`AC`) và Bộ Ca Kiểm Thử (`TC`):

| Mã Yêu Cầu (Requirement ID) | Tên Yêu Cầu & Nội Dung Chính | Quy Tắc Liên Quan (Business Rule) | Biểu Đồ Minh Họa (Mermaid Diagram) | Điểm Cuối API / Dữ Liệu (API / DB) | Tiêu Chí Nghiệm Thu (Acceptance Criteria) | Mã Ca Kiểm Thử (Test Case ID) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`FR-SPN-001`** | 4 Nhóm Node Catalog cố định (Input, SP, Model, Output) | `BR-SPN-001` | `DIAG-SPN-IA-001` | Frontend Component `NodeCatalog` | `AC-CAT-01` | `TC-CAT-01` |
| **`FR-SPN-002`** | Thu gọn / Mở rộng Accordion độc lập | `BR-SPN-001` | `DIAG-SPN-IA-001` | Frontend Component `AccordionGroup` | `AC-CAT-02` | `TC-CAT-02` |
| **`FR-SPN-003`** | Thanh tìm kiếm Node & Prompt (Debounced) | `DEC-SPN-05` | `DIAG-SPN-ACT-001` | Client-side filter | `AC-CAT-03` | `TC-CAT-03`, `TC-CAT-04`, `TC-CAT-06`, `TC-CAT-08` |
| **`FR-SPN-004`** | Bộ lọc danh mục (5 Category Pills) | `DEC-SPN-06` | `DIAG-SPN-ACT-001` | Client-side filter | `AC-CAT-04` | `TC-CAT-05` |
| **`FR-SPN-005`** | Nạp động danh sách Prompt khả dụng | `BR-SPN-002` | `DIAG-SPN-SEQ-001` | `GET /api/v1/system-prompts` | `AC-CAT-01` | `TC-CAT-07` |
| **`FR-SPN-006`** | Tạo System Prompt Node trên Canvas | `DEC-SPN-01` | `DIAG-SPN-SEQ-001` | `GraphNode (type: system_prompt)` | `AC-CANVAS-01` | `TC-CANVAS-01`, `TC-CANVAS-05` |
| **`FR-SPN-007`** | Cổng kết nối đa kiểu trên Model Node | `BR-SPN-003` | `DIAG-SPN-GRAPH-001` | Model Custom Handles | `AC-CANVAS-02` | `TC-CANVAS-02` |
| **`FR-SPN-008`** | Giới hạn 1 System Prompt / Model (MVP) | `BR-SPN-004`, `DEC-SPN-02` | `DIAG-SPN-GRAPH-001` | Frontend & Backend Validator | `AC-CANVAS-03` | `TC-CANVAS-03`, `TC-CANVAS-04` |
| **`FR-SPN-009`** | Graph Validation 2 chế độ (Legacy & Extended) | `BR-SPN-005`, `DEC-SPN-07` | `DIAG-SPN-STATE-001` | `PUT /api/v1/projects/{id}/graph` | `AC-CANVAS-04` | `TC-VAL-01`, `TC-VAL-02`, `TC-VAL-03` |
| **`FR-SPN-010`** | Lưu graph dạng tham chiếu `prompt_id` | `DEC-SPN-01` | `DIAG-SPN-SEQ-002` | `projects.graph_data` JSON | `AC-CANVAS-04` | `TC-VAL-04` |
| **`FR-SPN-011`** | Phân giải prompt tại Backend khi Chat | `BR-SPN-006`, `DEC-SPN-03` | `DIAG-SPN-SEQ-003` | `POST /projects/{id}/chat`, `system_prompts` | `AC-RUN-01` | `TC-RUN-01`, `TC-RUN-04` |
| **`FR-SPN-012`** | Nạp Prompt vào Provider System Instruction | `BR-SPN-007` | `DIAG-SPN-ARCH-001` | LangChain `SystemMessage` | `AC-RUN-01` | `TC-RUN-01`, `TC-SEC-02` |
| **`FR-SPN-013`** | Xử lý khi Prompt liên kết bị xóa | `DEC-SPN-04` | `DIAG-SPN-STATE-001` | `HTTP 422 PROMPT_UNAVAILABLE` | `AC-RUN-02` | `TC-RUN-03` |
| **`FR-SPN-014`** | Bảo toàn tương thích ngược Project cũ 3 node | `DEC-SPN-07`, `DEC-SPN-08` | `DIAG-SPN-GRAPH-001` | Fallback default instruction | `AC-RUN-03` | `TC-RUN-02` |
| **`NFR-SPN-003`** | Bảo mật quyền riêng tư (Không log prompt raw) | `RISK-SPN-03` | `DIAG-SPN-SEC-001` | Server Logging Engine | Toàn vẹn bảo mật | `TC-SEC-03` |
| **`NFR-SPN-004`** | Bảo toàn định dạng văn bản & Unicode | `RISK-SPN-05` | `DIAG-SPN-SEQ-003` | UTF-8 Database & JSON Stream | Toàn vẹn dữ liệu | `TC-RUN-05` |
| **`NFR-SPN-005`** | Cảnh báo Unsaved Changes Guard | UX Rule | `DIAG-SPN-UF-001` | Navigation Modal Interceptor | Trải nghiệm người dùng | `TC-CANVAS-06` |
| **`RISK-SPN-01`** | Chống IDOR khi lưu graph và chat | `SEC-001` | `DIAG-SPN-SEC-001` | Query Guard `user_id = :uid` | Bảo mật kiểm soát truy cập | `TC-SEC-01` |

---

## 2. Kết Quả Rà Soát Tính Nhất Quán (Consistency Audit Summary)

1. **Về danh mục Node:** 100% các tài liệu (`srs.md`, `ux-flows.md`, `diagrams.md`, `test-plan.md`) đều thống nhất tuyệt đối về cấu trúc 4 nhóm cố định: `Input`, `System Prompt`, `Model`, `Output`.
2. **Về hạn ngạch kết nối Prompt:** 100% các tài liệu tuân thủ quy tắc `DEC-SPN-02`: mỗi Model Node chỉ nhận tối đa 1 System Prompt Node trong phạm vi MVP.
3. **Về cơ chế lưu trữ:** 100% các tài liệu xác nhận cơ chế **Reference ID** (`prompt_id`), không sao chép chuỗi văn bản vào JSON đồ thị.
4. **Về tính tương thích ngược:** 100% các tài liệu bảo đảm Project cũ 3 node `Web Input → Model → Output` vẫn được công nhận là hợp lệ hoàn toàn và chạy chat bình thường.
