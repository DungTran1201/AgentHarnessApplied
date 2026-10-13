# Ma Trận Truy Vết Trải Nghiệm Người Dùng (UX Traceability Matrix)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã tài liệu** | `UX-TRC-001` |
| **Giai đoạn** | **Phase 11 — User Experience & Interface Design** |
| **Trạng thái** | **BASELINED** |

---

## 1. Ma Trận Ánh Xạ Yêu Cầu UX với Yêu Cầu Chức Năng, Phi Chức Năng & Use Cases

| Mã Yêu Cầu UX | Tên Yêu Cầu Trải Nghiệm | Màn Hình / Luồng Liên Quan | Use Cases Thượng Nguồn | Yêu Cầu Thượng Nguồn | Biện Pháp Kiểm Chứng UX |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `UX-001` | Responsive Layout & Dual Theme | `SCR-001`, `SCR-002`, `FLOW-AUTH`, `FLOW-CONV-MANAGE` | `UC-001`, `UC-002`, `UC-004` | `FR-004`, `NFR-001`, `NFR-016` | Kiểm tra render layout trên Viewport Mobile 360px, iPad 768px, Desktop 1920px. |
| `UX-002` | Optimistic UI & Dynamic Auto-Scroll | `SCR-002-B`, `FLOW-CHAT-STREAM` | `UC-007`, `UC-008` | `FR-007`, `FR-008`, `FR-013`, `NFR-002` | Đảm bảo bong bóng tin nhắn hiển thị tức thì (<100ms) và màn hình tự bám đáy khi token về. |
| `UX-003` | Streaming Visual Feedback & Abort Control | `SCR-002-B`, `FLOW-CHAT-STREAM` | `UC-007`, `UC-009` | `FR-009`, `FR-013`, `NFR-003` | Kiểm tra nhấp nháy con trỏ và nút Stop dừng luồng tức thì, giữ lại nội dung đã sinh. |
| `UX-004` | Rich Markdown & Code Syntax Highlighting | `SCR-002-B`, `FLOW-CHAT-STREAM` | `UC-007` | `FR-010`, `NFR-004`, `SEC-003` | Kiểm tra render bảng, toán học, code block; kiểm tra nút Copy Code và khử độc HTML XSS. |
| `UX-005` | Composer UX & Context Bounds Indicator | `SCR-002-A`, `SCR-002-B`, `FLOW-CHAT-STREAM` | `UC-007` | `FR-007`, `FR-014`, `NFR-005` | Kiểm tra Textarea co giãn, phím Enter/Shift+Enter, cảnh báo giới hạn 4000 ký tự. |
| `UX-006` | Profile & Account Settings Canvas | `SCR-003`, `FLOW-USER-SETTINGS` | `UC-010` - `UC-015` | `FR-015` - `FR-020`, `BR-007` - `BR-011` | Kiểm tra điều hướng 3 tab, đổi theme tức thì, cập nhật hồ sơ và đổi email/mật khẩu an toàn. |

---

## 2. Kiểm Tra Tính Nhất Quán & Toàn Vẹn (Integrity Review)

- **Không phát sinh mâu thuẫn**: Toàn bộ luồng màn hình bám sát 100% các Use Case từ Phase 04 (`UC-001` đến `UC-009`) và các Endpoint API từ Phase 08 (`API-001` đến `API-008`).
- **An toàn giao diện**: Phối hợp chặt chẽ với kiểm soát an ninh `SEC-003` (chống XSS) và `CTRL-003` trong Phase 10 để bảo vệ người dùng khi hiển thị Markdown.
