# PHẦN 07: BẢN GHI CHÚ KIẾN TRÚC & TÍCH HỢP RUNTIME (ARCHITECTURE & RUNTIME INTEGRATION NOTE)
## Phân Hệ: Quản Lý Quy Tắc (Rules Management — Rules Library & Rule Editor)
### Dự Án: Nền Tảng Trợ Lý Ảo AI-Chan (AI-Chan Assistant Platform)

---

| Thông Tin Quản Trị | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `RUL-DOC-07` |
| **Nhánh Tính Năng** | **Rules Management (Rules Library & Rule Editor)** |
| **Trạng Thái Quản Trị** | **`PROPOSED (Chờ Duyệt Từ Architecture Board & Product Owner)`** |
| **Phiên Bản** | `1.0.0-PROPOSAL` |
| **Ngày Ban Hành** | `2026-10-18` |
| **Tác Giả / Vai Trò** | Senior Solution Architect & AI Runtime Specialist |

---

## 1. Phân Tách Tuyệt Đối Giữa Quản Lý (CRUD) Và Thực Thi (Runtime Activation)

Một trong những yêu cầu kiến trúc quan trọng nhất được đặt ra trong hồ sơ này là **sự phân định ranh giới rạch ròi** giữa hai chu trình hoạt động:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   CHU TRÌNH 1: QUẢN LÝ DỮ LIỆU (CRUD & REGISTRY)        │
│   - Tác nhân: Người dùng tương tác qua Web UI / RESTful API            │
│   - Hoạt động: Tạo mới, Xem chi tiết, Soạn thảo Markdown, Lưu trữ,     │
│                Nhân bản, Xóa mềm, Gán liên kết với Project.            │
│   - Phạm vi: ĐƯỢC ĐẶC TẢ VÀ TRIỂN KHAI TRONG PHẠM VI MVP NÀY.         │
│   - Trạng thái hiện thực: Đề xuất sẵn sàng (Design Ready / Proposed).   │
└────────────────────────────────────────────────────────────────────────┘
                                     ≠
┌────────────────────────────────────────────────────────────────────────┐
│                   CHU TRÌNH 2: NẠP & THỰC THI (RUNTIME RESOLUTION)     │
│   - Tác nhân: Engine sinh hội thoại (Chat Runner / LLM Orchestrator)   │
│   - Hoạt động: Quét các Rule khả dụng, đối chiếu điều kiện kích hoạt,  │
│                giải quyết mâu thuẫn, nạp lũy tiến và nhúng vào prompt. │
│   - Phạm vi: CHƯA TRIỂN KHAI TRONG BACKEND HIỆN HÀNH (FUTURE PHASE).   │
│   - Trạng thái hiện thực: ĐỀ XUẤT KIẾN TRÚC TƯƠNG LAI (PROPOSED DESIGN).│
└────────────────────────────────────────────────────────────────────────┘
```

> [!WARNING]
> **Tuyên Bố Hiện Trạng**: Trong phiên bản hiện hành của repository `ai-chan`, tầng backend (`ai-backend/app/services/chat_service.py`) **CHƯA CÓ** cơ chế tự động nạp các bản ghi từ bảng `rules` vào context prompt gửi tới LLM. Tài liệu này đặc tả cơ chế phân giải quy tắc dưới góc độ **Quyết Định Kiến Trúc / Tích Hợp Tương Lai (Design Decision / Future Integration)** nhằm chuẩn bị sẵn sàng cho giai đoạn phát triển tiếp theo, không ngụy tạo như thể hệ thống đã chạy tính năng này.

---

## 2. Bốn Trụ Cột Khái Niệm Trong Hệ Thống Quy Tắc (The Four Pillars of Rules)

Để tránh nhầm lẫn giữa nơi lưu trữ, đối tượng áp dụng và cách thức hoạt động, hệ thống phân định rõ 4 khái niệm độc lập:

### 2.1. Phạm Vi Lưu Trữ (Storage Scope)
- **Định nghĩa**: Nơi bản ghi Rule được lưu trữ vật lý và ai là người có quyền quản trị, sở hữu.
- **Các cấp độ trong AI-Chan**:
  1. `system`: Lưu trữ trong bảng `rules` với `scope = 'system'`, thuộc quyền quản trị tối cao của Admin hệ thống. Mọi người dùng đều có thể đọc nhưng không ai được sửa/xóa trực tiếp.
  2. `user`: Lưu trữ trong bảng `rules` với `scope = 'user'`, thuộc quyền sở hữu riêng của một tài khoản (`user_id`). Người dùng có toàn quyền CRUD.
  3. `project`: Lưu trữ trong bảng `rules` nhưng được gán chặt chẽ vào một Project cụ thể (`project_id`).

### 2.2. Phạm Vi Áp Dụng (Application Scope)
- **Định nghĩa**: Ngữ cảnh thực tế mà Rule có hiệu lực định hướng cho Agent khi thực thi tác vụ.
- **Các cấp độ áp dụng**:
  1. **Global Application (Toàn Hệ Thống)**: Chỉ áp dụng đối với các System Rule bắt buộc (Mandatory Safety Rules). Mọi phiên chat trên nền tảng đều phải tuân thủ.
  2. **Project Application (Trong Một Dự Án)**: Rule được gán vào một Project thông qua bảng `project_rules`. Toàn bộ các phiên chat diễn ra bên trong Project này sẽ nạp Rule đó.
  3. **File / Path Application (Trong Một Tệp Tin / Thư Mục)**: Rule chỉ có hiệu lực khi Agent đang thao tác hoặc đọc/ghi vào các tệp tin khớp với mẫu đường dẫn (`glob_patterns`).
  4. **Task / Intent Application (Theo Ý Định Người Dùng)**: Rule chỉ có hiệu lực khi Agent nhận thấy yêu cầu của người dùng khớp với mô tả của Rule (`model_decision`).

### 2.3. Chế Độ Kích Hoạt (Activation Modes)
Dựa trên chuẩn mực công nghệ của Google Antigravity Rules (`https://antigravity.google/docs/rules/`), AI-Chan áp dụng 4 chế độ kích hoạt tiêu chuẩn:

| Chế Độ Kích Hoạt | Cú Pháp / Thuộc Tính | Cơ Chế Hoạt Động Của Trình Phân Giải (Resolver) | Trường Hợp Sử Dụng Điển Hình |
| :--- | :--- | :--- | :--- |
| **`always_on`** | `activation_mode: always_on` | Luôn luôn được nạp đầy đủ vào ngữ cảnh prompt mỗi khi phiên làm việc của Project được khởi tạo. | Quy ước an toàn, định dạng ngôn ngữ, phong cách lập trình cốt lõi của dự án. |
| **`model_decision`** | `activation_mode: model_decision`<br>`description: <Mô tả điều kiện>` | **Khai phá lũy tiến (Progressive Disclosure)**: Ban đầu chỉ nạp tiêu đề và mô tả tóm tắt của Rule vào bảng tra cứu (Rule Registry Index). Khi LLM nhận thấy câu hỏi của người dùng chạm đến chủ đề này, LLM sẽ tự động kích hoạt nạp toàn văn nội dung Rule. | Hướng dẫn xử lý migration cơ sở dữ liệu, quy tắc tích hợp cổng thanh toán, hướng dẫn viết unit test phức tạp. |
| **`glob`** | `activation_mode: glob`<br>`glob_patterns: ["*.ts", "src/**"]` | Chỉ được kích hoạt khi Agent đang thực hiện đọc, sửa, tạo hoặc thảo luận về một tệp tin khớp với một trong các mẫu glob quy định. | Quy chuẩn giao diện React, tiêu chuẩn viết CSS Tailwind, quy tắc tối ưu hóa truy vấn SQL. |
| **`manual`** | `activation_mode: manual` | Không tự động kích hoạt; chỉ có hiệu lực khi người dùng hoặc người điều phối gắn thẻ trực tiếp (Explicitly mentioned / Toggled). | Quy trình kiểm thử tải đặc biệt, quy trình phát hành phiên bản (Release runbook). |

### 2.4. Chính Sách Ưu Tiên & Giải Quyết Xung Đột (Priority & Conflict Policy)
Khi hai hoặc nhiều Rule cùng được kích hoạt nhưng đưa ra những chỉ dẫn có tính mâu thuẫn (ví dụ: Rule A yêu cầu "Viết code ngắn gọn không dùng type annotation", trong khi Rule B yêu cầu "Bắt buộc khai báo kiểu dữ liệu tường minh"):

1. **Nguyên tắc Ưu tiên Trọng số (Explicit Priority Precedence)**:
   - Mỗi Rule có một trường `priority` từ 0 đến 100.
   - Trình phân giải sắp xếp các Rule theo thứ tự `priority DESC`. Rule có điểm ưu tiên cao hơn sẽ xuất hiện sau trong prompt (nguyên lý Recency Effect của LLM: chỉ dẫn xuất hiện gần cuối sẽ có sức nặng chi phối cao hơn).
2. **Nguyên tắc Phân Tầng Phạm Vi (Scope Hierarchy Precedence)**:
   - Nếu hai Rule có cùng mức điểm `priority`:
     $$\text{Project Rule} > \text{User Rule} > \text{System Rule}$$
   - Chỉ dẫn cụ thể của Dự án luôn ghi đè chỉ dẫn chung của Cá nhân; chỉ dẫn của Cá nhân luôn ghi đè chỉ dẫn mặc định của Toàn hệ thống (ngoại trừ các System Mandatory Safety Rules không thể bị ghi đè).
3. **Cơ chế Token Budgeting (Hạn Ngạch Bộ Nhớ)**:
   - Trình phân giải giới hạn tổng số token dành cho khối Rules (ví dụ: tối đa 2.000 tokens). Nếu tổng dung lượng các Rule vượt quá ngân sách, các Rule có `priority` thấp hơn sẽ tự động bị cắt tỉa hoặc chỉ nạp bản tóm tắt.

---

## 3. Kiến Trúc Đề Xuất Tích Hợp Runtime Tương Lai (Proposed Runtime Engine)

Dưới đây là mô hình giải thuật mà AI-Chan Chat Service sẽ hiện thực hóa trong các pha tiếp theo để nạp Rules vào LLM Context:

```
[ Bắt Đầu Lượt Chat Của Người Dùng ]
                 │
                 ▼
[ Bước 1: Thu Thập Rules Tiềm Năng ]
  - Lấy System Mandatory Rules (deleted_at IS NULL, scope = 'system')
  - Lấy các Rules được gán cho Project hiện tại (project_rules WHERE is_enabled = true)
                 │
                 ▼
[ Bước 2: Lọc Điều Kiện Kích Hoạt (Activation Filter) ]
  ├── Mode = 'always_on' ───> [ Giữ lại trong danh sách nạp đầy đủ ]
  ├── Mode = 'glob' ────────> [ Kiểm tra tệp tin đang mở/được nhắc tới. Nếu khớp -> Giữ lại ]
  ├── Mode = 'model_decision'> [ Chỉ đưa Tên + Mô tả vào bảng tra cứu Index ]
  └── Mode = 'manual' ──────> [ Bỏ qua nếu không được gọi tên ]
                 │
                 ▼
[ Bước 3: Sắp Xếp & Giải Quyết Xung Đột (Ordering & Conflict Resolution) ]
  - Sắp xếp theo: priority ASC (để rule quan trọng nhất nằm dưới cùng)
  - Cắt tỉa nếu vượt quá giới hạn Token Budget (ví dụ: > 2.000 tokens)
                 │
                 ▼
[ Bước 4: Đóng Gói Prompt Khối "Active Guidelines" ]
  Format:
  <active_rules>
    <rule id="RUL-001" name="Clean Code" priority="80">
      [Nội dung Markdown Rule 1]
    </rule>
    <rule id="RUL-002" name="TypeScript Strict" priority="90">
      [Nội dung Markdown Rule 2]
    </rule>
  </active_rules>
                 │
                 ▼
[ Gửi Payload Tổng Hợp (System Prompt + Active Rules + Chat History) Tới LLM ]
```

---

## 4. Điểm Chốt Kiến Trúc (Architecture Sign-Off)

1. **Phạm vi hoàn thành của lượt này**: Toàn bộ nghiệp vụ quản lý thư viện, lưu trữ, lọc, tìm kiếm, soạn thảo, kiểm tra toàn vẹn, bảo vệ biểu mẫu và phân quyền người dùng đối với Rules đã được thiết kế đầy đủ và độc lập.
2. **Khẳng định tính tương thích**: Mô hình dữ liệu và API đề xuất trong tài liệu này hoàn toàn tương thích và sẵn sàng kết nối trực tiếp với Runtime Engine khi đội ngũ kỹ sư tiến hành nâng cấp `chat_service.py`.
