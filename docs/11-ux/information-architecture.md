# Thông Tin Kiến Trúc & Cấu Trúc Điều Hướng (Information Architecture)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã tài liệu** | `UX-IA-001` |
| **Giai đoạn** | **Phase 11 — User Experience & Interface Design** |
| **Canonical Model** | `models/ux/ux.yaml` |
| **Phụ thuộc Thượng nguồn** | `UC-001` - `UC-009`, `FR-001` - `FR-014`, `NFR-001`, `NFR-016` |
| **Trạng thái** | **BASELINED** |

---

## 1. Bản Đồ Điều Hướng Trang (Sitemap & Hierarchy)

Hệ thống AI-Chan được thiết kế với cấu trúc phân cấp tinh gọn (shallow hierarchy) để người dùng có thể bắt đầu hội thoại với AI trong vòng dưới 2 thao tác chạm:

```
[Khách vãng lai / Public Area]
  ├── /login          (Đăng nhập tài khoản)
  └── /register       (Đăng ký tài khoản mới)

[Khu vực Người dùng Xác thực / Authenticated Workspace]
  └── /chat           (Giao diện làm việc chính)
        ├── /chat                 (Màn hình cuộc trò chuyện mới - New Chat / Empty State)
        └── /chat/[id]            (Màn hình cuộc trò chuyện cụ thể với lịch sử tin nhắn)
```

---

## 2. Bố Cục Màn Hình Chính (Workspace Layout Structure)

Giao diện `/chat` được tổ chức thành 3 khu vực chức năng chính theo mô hình Split-View chuẩn:

```
+-----------------------------------------------------------------------------------+
|  [Logo AI-Chan]  |  Tiêu đề: "Giải đáp thắc mắc Python"       | [User Menu / Đăng xuất] |
+------------------+--------------------------------------------+-----------------------+
|  [+ Cuộc trò     |                                                                   |
|     chuyện mới]  |  [User]: Viết cho tôi hàm kiểm tra số nguyên tố bằng Python.       |
|                  |                                                                   |
|  - Dự án AI-Chan |  [AI-Chan]: Dưới đây là hàm kiểm tra số nguyên tố tối ưu O(√n):    |
|  - Học Python    |  ```python                                                        |
|  - Giải đáp luật |  def is_prime(n: int) -> bool:                                     |
|  - Du lịch Đà Nẵng|      ...                                                         |
|                  |  ```                                                              |
|                  |                                                                   |
|                  |-------------------------------------------------------------------|
|                  |  [Nhập tin nhắn cho AI-Chan... (Shift+Enter để xuống dòng)] [Gửi] |
+------------------+-------------------------------------------------------------------+
```

### 2.1. Khung Điều Hướng Bên Trái (Left Sidebar)
- **Nút Hành Động Đầu Tiên**: `[+ Cuộc trò chuyện mới]` (Tạo thread mới và reset về Empty State).
- **Danh Sách Lịch Sử Hội Thoại**: Sắp xếp theo thứ tự cập nhật gần nhất (`updated_at` giảm dần).
- **Mỗi Thẻ Hội Thoại (Conversation Item)**:
  - Hiển thị tiêu đề (tối đa 40 ký tự, phần thừa hiển thị dấu ba chấm `...`).
  - Nút biểu tượng chỉnh sửa (Rename) dạng Popover hoặc Inline Edit.
  - Nút biểu tượng xóa (Delete) kèm Modal xác nhận an toàn.
  - Highlight trạng thái Active cho cuộc trò chuyện hiện thời.
- **Responsive Drawer**: Tự động thu gọn thành nút Menu hamburger trên màn hình điện thoại (< 768px).

### 2.2. Thanh Tiêu Đề Trên Cùng (Top Header Bar)
- **Nút Toggle Sidebar**: Mở/đóng Sidebar trên Mobile hoặc mở rộng không gian đọc trên Desktop.
- **Tiêu Đề Hội Thoại**: Hiển thị tiêu đề đầy đủ của cuộc trò chuyện hiện hành.
- **User Profile & Logout**: Avatar người dùng, email, và nút `Đăng xuất` (`UC-003`).

### 2.3. Khung Nội Dung Tin Nhắn (Chat Feed Canvas)
- **Empty State**: Khi chưa có tin nhắn, hiển thị Avatar AI-Chan chào mừng và 4 gợi ý mẫu (Prompt Suggestion Chips):
  - *"Giải thích thuật toán Dijkstra bằng ví dụ đơn giản"*
  - *"Viết script Python crawl dữ liệu web"*
  - *"So sánh REST API và gRPC"*
  - *"Tóm tắt các nguyên tắc thiết kế SOLID"*
- **Message List**: Dòng chảy tin nhắn xen kẽ giữa User (căn phải) và AI-Chan (căn trái).
- **Auto-Scroll Behavior**: Tự động bám đáy khi token SSE đang truyền về (`UX-002`).

### 2.4. Khung Nhập Liệu Đầu Vào (Composer Bar)
- **Textarea Co Giãn Tự Động**: Tự động tăng chiều cao từ 1 dòng lên tối đa 6 dòng trước khi xuất hiện thanh cuộn.
- **Bộ Đếm Ký Tự**: Cảnh báo giới hạn ký tự (0 / 4000 ký tự) (`UX-005`).
- **Nút Điều Khiển Kép**:
  - Khi rảnh rỗi: Nút `[Gửi]` (biểu tượng Send, disabled khi ô nhập trống).
  - Khi AI đang sinh văn bản: Chuyển thành nút `[Dừng phản hồi]` (Stop Generation - màu đỏ, `UX-003`).

---

## 3. Danh Mục Màn Hình & Trạng Thái Giao Diện (Screen Inventory & UI States)

| Mã Màn Hình | Tên Màn Hình | Tuyến Đường (Route) | Các Trạng Thái Giao Diện (UI States) |
| :--- | :--- | :--- | :--- |
| `SCR-001-A` | Màn hình Đăng Nhập | `/login` | Default, Submitting (Spinner), Validation Error, Network Error |
| `SCR-001-B` | Màn hình Đăng Ký | `/register` | Default, Submitting, Password Strength Warning, Success Redirect |
| `SCR-002-A` | Khung Chat Mới (Empty) | `/chat` | Empty State with Prompt Chips, Focused Input |
| `SCR-002-B` | Khung Chat Hoạt Động | `/chat/[id]` | Loading History (Skeleton), Idle Message Thread, Streaming SSE Active, Aborted, Error Toast |
| `SCR-002-C` | Hộp Thoại Xác Nhận Xóa | Modal Trigger | Confirm Delete Modal (Backdrop, Cancel, Confirm Danger Button) |

---

## 4. Đặc Tả Trải Nghiệm Responsive (UX-001)

- **Mobile Viewport (360px - 767px)**:
  - Sidebar ẩn hoàn toàn mặc định, mở ra dưới dạng Off-canvas Drawer khi bấm Menu icon.
  - Khung Composer dính chặt đáy màn hình (Sticky Bottom) tránh che khuất bởi bàn phím ảo.
- **Tablet & Laptop (768px - 1199px)**:
  - Sidebar hiển thị dạng Collapsible Icon-only hoặc 260px Fixed.
- **Desktop (1200px - 1920px)**:
  - Sidebar cố định 280px, Chat Feed tối đa 800px căn giữa màn hình để đảm bảo chiều dài dòng đọc tối ưu (Optimal Reading Measure).
