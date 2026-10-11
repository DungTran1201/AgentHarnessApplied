# 06. TRẢI NGHIỆM NGƯỜI DÙNG & KIẾN TRÚC THÔNG TIN (UX, IA & USER FLOWS)
## Phân Hệ: Quản Lý System Prompt (System Prompt Management MVP)
### Nền Tảng: AI-Chan Virtual Assistant Platform

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `DOC-SPM-06` |
| **Trạng Thái** | `PROPOSED (Chờ Duyệt Từ UX/System Designer)` |
| **Vai Trò Phụ Trách** | Senior UX Designer & Frontend Architect |
| **Phiên Bản** | `1.0.0-MVP` |
| **Ngày Lập** | `2026-10-11` |

---

## 1. Kiến Trúc Thông Tin & Điều Hướng (Information Architecture & Navigation)

Hệ thống bổ sung một không gian quản lý chuyên biệt tại đường dẫn `/prompts`, được tích hợp hài hòa vào cấu trúc điều hướng hiện hữu của AI-Chan:

```
                                  ┌───────────────────────────────┐
                                  │    Trang Chủ / Landing Page   │
                                  │             (/)               │
                                  └───────────────┬───────────────┘
                                                  │
                                                  ▼
                                  ┌───────────────────────────────┐
                     ┌───────────►│    Trang Chat AI Trực Tuyến   │◄───────────┐
                     │            │           (/chat)             │            │
                     │            └───────────────┬───────────────┘            │
                     │                            │                            │
                     │   ┌────────────────────────┼────────────────────────┐   │
                     │   ▼                        ▼                        ▼   │
        ┌─────────────────────────┐  ┌─────────────────────────┐  ┌──────────┴──────────────┐
        │ Visual Canvas Projects  │  │   Tài Nguyên & Quota    │  │  THƯ VIỆN SYSTEM PROMPT │
        │       (/projects)       │  │       (/dashboard)      │  │        (/prompts)        │
        └─────────────────────────┘  └─────────────────────────┘  └──────────┬──────────────┘
                                                                             │
                                              ┌──────────────────────────────┼──────────────────────────────┐
                                              ▼                              ▼                              ▼
                                 ┌─────────────────────────┐    ┌─────────────────────────┐    ┌─────────────────────────┐
                                 │   Danh Sách Prompts     │    │   Tạo Mới Prompt        │    │  Xem & Sửa Prompt       │
                                 │       (/prompts)        │───►│      (/prompts/new)     │    │ (/prompts/[id]/edit)    │
                                 └─────────────────────────┘    └─────────────────────────┘    └─────────────────────────┘
```

### Các Điểm Chạm Điều Hướng (Navigation Entry Points):
1. **Sidebar Footer Icon (Chat Page):** Biểu tượng cuộn giấy `📜` đặt cạnh icon Projects (`🧩`), Bot Discord (`🤖`), Dashboard (`📊`) và Settings (`⚙️`).
2. **Top Navigation Header (Chat & Landing Page):** Nút liên kết `"System Prompts"` trên thanh menu đầu trang.
3. **Internal Breadcrumbs:** Trên màn hình Chi tiết và Soạn thảo, luôn có thanh điều hướng breadcrumb `System Prompts / [Tên Prompt]` kèm nút quay lại (←) giúp người dùng dễ dàng định vị.

---

## 2. Thiết Kế Màn Hình & Trạng Thái Giao Diện (Screen Layouts & UI States)

### 2.1. Màn Hình Danh Sách System Prompt (`/prompts`)

#### Bố cục tổng thể (Wireframe Concept):
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  AI-Chan   [🧩 Projects]  [📜 System Prompts]  [📊 Dashboard]            [User Profile]│
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│  Thư Viện System Prompt                                      [+ Tạo System Prompt Mới] │
│  Quản lý các chỉ dẫn hệ thống định hình nhân cách và nguyên tắc phản hồi của AI        │
│                                                                                        │
│  ┌─────────────────────────────────────────────────────────┐  ┌──────────────────────┐ │
│  │ 🔍 Tìm kiếm theo tên hoặc mô tả prompt...              │  │ Sắp xếp: Mới nhất ▼  │ │
│  └─────────────────────────────────────────────────────────┘  └──────────────────────┘ │
│                                                                                        │
│  ┌──────────────────────────────┐ ┌──────────────────────────────┐ ┌─────────────────┐ │
│  │ Senior Python Architect  ⋮   │ │ Lead Business Analyst   ⋮   │ │ Content Writer  ⋮ │ │
│  │                              │ │                              │ │                 │ │
│  │ Hỗ trợ viết code chuẩn mực,  │ │ Phân tích yêu cầu, bóc tách  │ │ Soạn thảo nội   │ │
│  │ PEP 8, Type Hinting và O(n)  │ │ SRS, User Stories và BPMN    │ │ dung blog, SEO  │ │
│  │                              │ │                              │ │                 │ │
│  │ 🏷️ 1.845 ký tự               │ │ 🏷️ 920 ký tự                 │ │ 🏷️ 650 ký tự    │ │
│  │ 🕒 Cập nhật 15 phút trước    │ │ 🕒 Cập nhật 2 giờ trước      │ │ 🕒 1 ngày trước │ │
│  └──────────────────────────────┘ └──────────────────────────────┘ └─────────────────┘ │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Xử lý 6 Trạng Thái Giao Diện:
1. **Đang Tải (Loading State):** Hiển thị 6 thẻ khung xương (Skeleton Cards) với hiệu ứng sóng sáng (Shimmer pulse). Giữ nguyên kích thước thẻ để tránh hiện tượng giật cục giao diện (CLS = 0).
2. **Có Dữ Liệu (Populated State):**
   - Lưới hiển thị dạng Grid linh hoạt: 3 cột trên Desktop lớn (> 1280px), 2 cột trên Laptop/Tablet (768px - 1024px), 1 cột trên Mobile (< 768px).
   - Thẻ sử dụng nền kính mờ `background: rgba(15, 23, 42, 0.65); border: 1px solid var(--border-subtle); backdrop-filter: blur(12px)`.
   - Khi hover vào thẻ: Viền sáng đổi sang màu tím `rgba(99, 102, 241, 0.4)`, thẻ hơi nổi nhẹ `transform: translateY(-2px); transition: all 0.2s ease`.
   - Nút menu ba chấm (⋮) hoặc cụm nút hành động gồm: Xem/Sửa (✏️) và Xóa (🗑️).
3. **Danh Sách Rỗng (Empty State):**
   - Xuất hiện khi người dùng chưa có prompt nào trong tài khoản.
   - Minh họa: Biểu tượng cuộn giấy phát sáng tinh tế `📜✨`.
   - Tiêu đề: *"Thư viện System Prompt của bạn đang trống"*.
   - Mô tả: *"Tạo System Prompt đầu tiên để tùy biến phong cách, vai trò và nguyên tắc phản hồi của AI-Chan."*
   - Nút bấm: Nút lớn có gradient tím rực rỡ `+ Tạo System Prompt Đầu Tiên`.
4. **Không Có Kết Quả Tìm Kiếm (No-Results State):**
   - Xuất hiện khi từ khóa tìm kiếm không khớp với bất kỳ bản ghi nào.
   - Minh họa: Biểu tượng kính lúp rỗng `🔍`.
   - Tiêu đề: *"Không tìm thấy kết quả"*
   - Mô tả: *"Không có System Prompt nào khớp với từ khóa '[từ khóa]'. Hãy thử kiểm tra lại chính tả hoặc xóa bộ lọc."*
   - Nút bấm: *"Xóa tìm kiếm"*.
5. **Lỗi Tải Dữ Liệu (Error State):**
   - Hiển thị banner màu đỏ mờ `background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3)`.
   - Thông điệp: *"Không thể tải danh sách System Prompt do lỗi kết nối. Vui lòng kiểm tra lại mạng."*
   - Nút bấm: *"Thử lại (Retry)"*.
6. **Lỗi Quyền Truy Cập (Unauthorized State):**
   - Hiển thị thông báo yêu cầu đăng nhập và nút chuyển hướng đến trang `/login`.

---

### 2.2. Màn Hình Soạn Thảo / Tạo Mới / Chỉnh Sửa (`/prompts/new` & `/prompts/[id]/edit`)

#### Bố cục tổng thể (Editor Layout):
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  ← Quay lại Danh Sách         Tạo System Prompt Mới                 [Hủy] [Lưu Prompt] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│  Tên System Prompt *                                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   42 / 100       │
│  │ Chuyên Gia Phân Tích Nghiệp Vụ BA                               │                  │
│  └─────────────────────────────────────────────────────────────────┘                  │
│                                                                                        │
│  Mô Tả Mục Đích (Tùy chọn)                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐   95 / 500       │
│  │ Hỗ trợ khảo sát, bóc tách yêu cầu nghiệp vụ, viết tài liệu SRS  │                  │
│  │ và ma trận truy vết theo chuẩn phần mềm.                        │                  │
│  └─────────────────────────────────────────────────────────────────┘                  │
│                                                                                        │
│  Nội Dung Chỉ Dẫn Hệ Thống (System Instruction) *                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ 1.450 / 10.000   │
│  │ Bạn là Senior Business Analyst với hơn 10 năm kinh nghiệm...   │                  │
│  │                                                                 │ [📋 Sao chép]    │
│  │ Khi nhận một yêu cầu thay đổi, bạn phải tuân thủ nghiêm ngặt    │                  │
│  │ các nguyên tắc sau:                                             │                  │
│  │ 1. Luôn phân loại rõ: FACT, ASSUMPTION, DECISION, OPEN QUESTION │                  │
│  │ 2. Giữ vững tính ổn định của các mã định danh.                  │                  │
│  │ 3. Mô tả Acceptance Criteria có thể kiểm thử được.              │                  │
│  │                                                                 │                  │
│  │                                                                 │                  │
│  └─────────────────────────────────────────────────────────────────┘                  │
│  💡 Mẹo: Nội dung này sẽ định hướng toàn bộ hành vi, kiến thức và giọng điệu của AI.   │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Các Đặc Điểm Tương Tác Cốt Lõi:
1. **Trường Tên (`name`):**
   - Ô nhập đơn dòng, autofocus khi vào trang tạo mới.
   - Bộ đếm ký tự bên góc phải: `42/100`.
   - Khi bị trùng tên (HTTP 409): Viền chuyển màu đỏ, xuất hiện dòng thông báo nhỏ: *"Tên prompt này đã tồn tại trong tài khoản của bạn. Vui lòng chọn tên khác."*.
2. **Trường Mô Tả (`description`):**
   - Textarea 2 dòng gọn gàng, bộ đếm `95/500`.
3. **Trường Nội Dung (`content`):**
   - Textarea lớn, chiều cao tối thiểu 360px (khoảng 16 dòng), cho phép người dùng kéo giãn theo chiều dọc (`resize: vertical`).
   - Sử dụng font chữ Monospace chuẩn (`JetBrains Mono`, `Fira Code`, `Consolas`, `monospace`) với kích thước `13.5px`, khoảng cách dòng `line-height: 1.6` giúp người dùng đọc và chỉnh sửa code/JSON/Markdown cực kỳ dễ chịu.
   - Bộ đếm ký tự: `1.450 / 10.000 ký tự`.
   - Nút tiện ích "Sao chép toàn bộ" (📋 Copy) ở góc trên bên phải khung soạn thảo.
4. **Cảnh Báo Thay Đổi Chưa Lưu (Dirty Form Confirmation Modal):**
   - Khi người dùng đã thay đổi dữ liệu mà bấm nút "Hủy", bấm logo hoặc chuyển trang, modal cảnh báo xuất hiện:
     - *"Dữ liệu chưa được lưu! Bạn có các thay đổi chưa lưu trên biểu mẫu này. Nếu rời đi ngay bây giờ, mọi thay đổi sẽ bị mất."*
     - Hai nút: `[Tiếp tục chỉnh sửa]` (màu chính) và `[Rời đi mà không lưu]` (màu xám nguy hiểm).

---

### 2.3. Hộp Thoại Xác Nhận Xóa Vĩnh Viễn (Delete Confirmation Modal)

```
┌────────────────────────────────────────────────────────┐
│  ⚠️ Xác Nhận Xóa System Prompt                         │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Bạn có chắc chắn muốn xóa vĩnh viễn System Prompt:    │
│                                                        │
│       "Senior Python Architect"                        │
│                                                        │
│  Hành động này sẽ xóa dữ liệu khỏi hệ thống và         │
│  không thể hoàn tác.                                   │
│                                                        │
├────────────────────────────────────────────────────────┤
│                       [Hủy Bỏ]    [🗑️ Xóa Vĩnh Viễn]   │
└────────────────────────────────────────────────────────┘
```
- Phím tắt: Bấm `Esc` để hủy và đóng modal. Phím `Enter` khi focus vào nút Xóa để thực thi.
- Nút "Xóa Vĩnh Viễn" có hiệu ứng loading (Spinner) trong lúc chờ API phản hồi để ngăn chặn double-click.

---

## 3. Luồng Người Dùng Chi Tiết (User Flows)

### Flow 1: Luồng Xem & Tìm Kiếm Danh Sách
```
[User nhấp /prompts]
        │
        ▼
[Tải danh sách GET API] ──(Lỗi mạng)──► [Hiển thị Error State & Nút Thử lại]
        │
        ├─(0 items)──────────────────► [Hiển thị Empty State & Nút Tạo mới]
        │
        ▼ (Có dữ liệu)
[Render Cards Grid]
        │
        ▼ (User gõ từ khóa vào ô tìm kiếm)
[Lọc client-side]
        │
        ├─(Khớp >= 1 items)──────────► [Cập nhật danh sách thẻ khớp từ khóa]
        │
        └─(Khớp 0 items)─────────────► [Hiển thị No-Results State & Nút Xóa bộ lọc]
```

### Flow 2: Luồng Tạo Mới System Prompt
```
[Bấm nút "+ Tạo mới"]
        │
        ▼
[Mở form /prompts/new] (isDirty = false)
        │
        ▼ (User gõ dữ liệu)
(isDirty = true, Cập nhật bộ đếm ký tự)
        │
        ▼ (Bấm "Lưu Prompt")
[Client Validation] ──(Rỗng / Quá 10k ký tự)──► [Báo lỗi đỏ trực tiếp dưới ô nhập]
        │
        ▼ (Hợp lệ)
[Gửi POST API]
        │
        ├─(409 Conflict)─────────────► [Báo lỗi trùng tên, GIỮ NGUYÊN nội dung đã gõ]
        │
        ├─(500 Error)────────────────► [Hiển thị Toast lỗi, GIỮ NGUYÊN nội dung đã gõ]
        │
        ▼ (201 Created Thành công)
[isDirty = false]
        │
        ▼
[Hiển thị Toast Xanh thành công] ──► [Điều hướng về trang danh sách /prompts]
```

### Flow 3: Luồng Chỉnh Sửa & Xử Lý Dirty Form
```
[Bấm "Sửa" trên thẻ prompt]
        │
        ▼
[Nạp dữ liệu vào form /prompts/[id]/edit]
        │
        ▼ (User sửa nội dung)
(isDirty = true)
        │
        ├─(User bấm "Lưu")───────────► [Gửi PUT API] ──► [Lưu thành công & Toast]
        │
        └─(User bấm "Hủy" / Thoát)
                │
                ▼
        [Kiểm tra isDirty?]
                │
                ├─(isDirty === false)──► [Chuyển trang ngay lập tức]
                │
                ▼ (isDirty === true)
        [Mở Modal cảnh báo chưa lưu]
                │
                ├─(Bấm "Ở lại")────────► [Đóng modal, giữ nguyên form]
                │
                └─(Bấm "Rời đi")───────► [Hủy thay đổi, chuyển trang]
```
