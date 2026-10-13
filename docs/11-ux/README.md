# Giai Đoạn 11: Trải Nghiệm Người Dùng & Giao Diện (User Experience & Interface Design)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tổng Quan | Chi Tiết |
| :--- | :--- |
| **Giai đoạn** | **Phase 11 — User Experience & Interface Design** |
| **Canonical Model** | `models/ux/ux.yaml` |
| **Trạng thái Giai đoạn** | **`READY_FOR_NEXT_PHASE`** |
| **Phụ thuộc Thượng nguồn** | `02-requirements`, `04-use-cases`, `08-api`, `09-behavior`, `10-security` |
| **Đầu ra Bàn giao** | `12-testing` |

---

## 1. Mục Tiêu Giai Đoạn

Giai đoạn UX chuyển hóa toàn bộ các kịch bản tương tác người dùng (`UC-001` - `UC-009`), hợp đồng API (`API-001` - `API-008`), và yêu cầu an ninh (`SEC-003`, `CTRL-003`) thành một hệ thống giao diện trực quan, tốc độ cao, hỗ trợ phản hồi dòng chảy thời gian thực và trải nghiệm mượt mà trên mọi thiết bị.

---

## 2. Danh Mục Tài Liệu Giai Đoạn 11

| Tệp Tài Liệu | Mã Định Danh | Nội Dung Chính |
| :--- | :--- | :--- |
| [information-architecture.md](file:///c:/Users/PC/Project/ai-chan/docs/11-ux/information-architecture.md) | `UX-IA-001` | Sitemap phân cấp, sơ đồ bố cục 3 vùng Workspace, danh mục màn hình (`SCR-001`, `SCR-002`). |
| [user-flows.md](file:///c:/Users/PC/Project/ai-chan/docs/11-ux/user-flows.md) | `UX-FLOW-001` | Sơ đồ Mermaid luồng xác thực (`FLOW-AUTH`), luồng streaming (`FLOW-CHAT-STREAM`), luồng quản lý hội thoại (`FLOW-CONV-MANAGE`). |
| [ui-interaction-specs.md](file:///c:/Users/PC/Project/ai-chan/docs/11-ux/ui-interaction-specs.md) | `UX-SPEC-001` | Đặc tả chi tiết 5 yêu cầu UX chính: `UX-001` (Responsive), `UX-002` (Auto-scroll), `UX-003` (Stop stream), `UX-004` (Markdown & Copy code), `UX-005` (Composer & 4000 char limit). |
| [traceability.md](file:///c:/Users/PC/Project/ai-chan/docs/11-ux/traceability.md) | `UX-TRC-001` | Ma trận ánh xạ 2 chiều giữa UX Requirements (`UX-001` - `UX-005`) với FRS, NFR và Use Cases. |

---

## 3. Cổng Chất Lượng & Trạng Thái Giai Đoạn (Quality Gate)

- **Audit mâu thuẫn & khoảng trống**: Không có mâu thuẫn giữa UX flows và API contracts. Toàn bộ các trạng thái lỗi API (401, 404, 409, 422, 429, 500) đều có tương ứng UI states (Toasts/Modals).
- **Trạng thái cổng chất lượng**: **`READY_FOR_NEXT_PHASE`** (Tiến hành Phase 12: Testing).
