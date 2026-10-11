# 00. PHẠM VI, GIẢ ĐỊNH VÀ QUYẾT ĐỊNH KIẾN TRÚC (SCOPE, ASSUMPTIONS & DECISIONS)
## Phân Hệ: Quản Lý System Prompt (System Prompt Management MVP)
### Nền Tảng: AI-Chan Virtual Assistant Platform

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `DOC-SPM-00` |
| **Trạng Thái** | `PROPOSED (Chờ Duyệt Từ Product Owner & Architecture Board)` |
| **Vai Trò Phụ Trách** | Senior Business Analyst & Solution Architect |
| **Phiên Bản** | `1.0.0-MVP` |
| **Ngày Lập** | `2026-10-11` |

---

## 1. Mục Tiêu Dự Án & Tầm Nhìn Sản Phẩm

### 1.1. Bối Cảnh
AI-Chan là một nền tảng trợ lý ảo (harness) điều phối các mô hình ngôn ngữ lớn (LLM) từ nhiều nhà cung cấp (Google Gemini, OpenAI, Anthropic, Groq, Ollama) với cơ chế streaming thời gian thực (SSE), phân hệ quản lý Model, phân hệ đo lường tài nguyên/quota, kết nối Discord Bot và phân hệ kéo-thả Workflow Node-based (Project Management).

Trong quá trình tương tác với LLM, **System Prompt (Chỉ dẫn hệ thống)** đóng vai trò cốt lõi trong việc:
- Định hình nhân cách (Persona), giọng điệu (Tone), phong cách phản hồi của AI.
- Thiết lập các nguyên tắc an toàn, ràng buộc nghiệp vụ, quy chuẩn định dạng (Markdown, JSON, code convention).
- Đóng vai trò làm "khuôn mẫu chỉ thị" tái sử dụng được trên nhiều ngữ cảnh.

Hiện tại, người dùng chỉ có thể cấu hình System Prompt cố định nhúng trực tiếp trong cấu hình Discord Bot (`bot.py`, trường `system_prompt` max 2000 ký tự) hoặc gán mặc định trong mã nguồn backend (`chat.py`, `llm/agent.py`). Chưa có phân hệ nào cho phép người dùng **quản lý tập trung một thư viện các System Prompt cá nhân hóa**, lưu trữ, tra cứu, chỉnh sửa và chuẩn bị sẵn cho các tích hợp tiếp theo.

### 1.2. Mục Tiêu Cốt Lõi Phân Hệ MVP
Xây dựng phân hệ **Quản lý System Prompt (System Prompt Management MVP)** tập trung vào hai năng lực trọng tâm:
1. **Quản lý danh sách System Prompt**: Cho phép xem danh sách, tìm kiếm nhanh theo tên/mô tả, xem thông tin tổng quan, nhận biết trạng thái rỗng/lỗi, và kích hoạt các hành động tạo mới/xem/sửa/xóa.
2. **Quản lý từng System Prompt**: Cho phép tạo mới, xem chi tiết, chỉnh sửa tên, mô tả và nội dung prompt với độ dài linh hoạt (hỗ trợ đầy đủ Unicode tiếng Việt, xuống dòng, ký tự đặc biệt), lưu an toàn, cảnh báo khi rời trang có thay đổi chưa lưu, và xóa bỏ có xác nhận.

> [!IMPORTANT]
> **Ranh giới trọng tâm của nhiệm vụ:** Phân hệ này là **Quản lý tài nguyên cấu hình (Configuration Resource Management)**. MVP này **KHÔNG** bao gồm việc thực thi prompt, không tạo System Prompt Node trên Project Canvas, không chạy thử prompt (Playground) và không can thiệp vào luồng chat runtime hiện tại nếu chưa có yêu cầu xác nhận.

---

## 2. Ranh Giới Phạm Vi Sản Phẩm (Scope Boundaries)

### 2.1. Phạm Vi Trong MVP (In-Scope)

| Nhóm Năng Lực | Tính Năng MVP | Mô Tả Nghiệp Vụ & Kỹ Thuật |
| :--- | :--- | :--- |
| **Quản lý danh sách** | Xem danh sách System Prompt | Hiển thị danh sách các System Prompt thuộc sở hữu của người dùng hiện tại (hoặc tài khoản khách `guest_user` khi dùng thử). |
| | Các trạng thái giao diện | Xử lý đầy đủ 6 trạng thái: Đang tải (Loading), Danh sách có dữ liệu, Danh sách rỗng (Empty), Không có kết quả tìm kiếm (No-results), Lỗi tải dữ liệu (Error), và Lỗi xác thực/phân quyền (Unauthorized/Forbidden). |
| | Thẻ thông tin tóm tắt | Mỗi mục hiển thị: Tên prompt, Mô tả ngắn (hoặc trích đoạn nội dung nếu không có mô tả), Thời điểm cập nhật gần nhất, Số ký tự nội dung. |
| | Tìm kiếm tức thì | Tìm kiếm theo Tên (`name`) và Mô tả (`description`), không phân biệt chữ hoa/thường (Case-insensitive) và hỗ trợ tiếng Việt có dấu. |
| | Hành động nhanh | Nút Tạo mới (+), Nút Xem/Sửa, Nút Xóa (kèm modal xác nhận xóa vĩnh viễn). |
| **Quản lý chi tiết** | Xem chi tiết bản ghi | Hiển thị toàn bộ thông tin: Tên, Mô tả, Nội dung đầy đủ trong khung hiển thị an toàn (Plain text, bảo toàn định dạng dòng). |
| | Tạo mới System Prompt | Form nhập liệu: Tên (bắt buộc, 1-100 ký tự, duy nhất theo người dùng), Mô tả (tùy chọn, tối đa 500 ký tự), Nội dung prompt (bắt buộc, 1-10.000 ký tự). |
| | Chỉnh sửa System Prompt | Tải dữ liệu cũ vào form, cho phép sửa đổi và lưu đè (Last-write-wins). |
| | Lưu & Xử lý phản hồi | Validate dữ liệu 2 lớp (Client-side & Server-side Pydantic), hiển thị Toast thông báo thành công hoặc lỗi chi tiết theo từng trường. |
| | Bảo toàn văn bản | Bảo toàn tuyệt đối mọi ký tự xuống dòng (`\n`, `\r\n`), khoảng trắng thụt lề, ký tự Unicode tiếng Việt, emoji, ký tự code/JSON/Markdown mà không bị biến dạng. |
| | An toàn dữ liệu (Safe Rendering) | Nội dung prompt được đối xử là **Plain Text Data**, tuyệt đối không diễn giải (eval/execute) HTML/JavaScript nguy hiểm nhằm triệt tiêu nguy cơ Stored XSS. |
| | Cảnh báo Dirty Form | Khi form có dữ liệu đã thay đổi mà người dùng bấm quay lại hoặc chuyển trang, hiển thị modal/cảnh báo xác nhận để tránh mất dữ liệu vô tình. |
| | Xóa bản ghi (Hard Delete) | Xóa bản ghi khỏi CSDL khi người dùng xác nhận rõ ràng trong hộp thoại xác nhận. |

### 2.2. Phạm Vi Loại Trừ Khỏi MVP (Out-of-Scope / Future Considerations)

> [!CAUTION]
> Các tính năng sau **TUYỆT ĐỐI KHÔNG TRIỂN KHAI TRONG MVP**, chỉ được ghi nhận để chuẩn bị kiến trúc mở:
> - ❌ **System Prompt Node trên Project Canvas Builder**: Chưa tạo node `system_prompt` trên canvas kéo-thả, chưa nối dây graph từ System Prompt vào Model Node.
> - ❌ **Chat Playground / Test Run**: Chưa hỗ trợ nút "Chạy thử Prompt với Model" trực tiếp trong màn hình quản lý prompt.
> - ❌ **Skills / Tools / MCP / Function Calling Integration**: Không gắn tool hay schema ngoài vào System Prompt.
> - ❌ **Lịch sử phiên bản (Version History / Git-like Diff)**: Không lưu bảng versions riêng; chỉ lưu bản ghi hiện tại kèm `updated_at`.
> - ❌ **Marketplace / Public Community Gallery**: Chưa hỗ trợ chia sẻ công khai hay clone prompt giữa các người dùng.
> - ❌ **Import / Export hàng loạt (CSV, JSON, YAML)**: Chưa hỗ trợ import/export file hàng loạt.
> - ❌ **Phân quyền cộng tác nhiều cấp (Role-based Approval / Team Sharing)**: Mỗi prompt chỉ thuộc sở hữu của một User sở hữu.
> - ❌ **Tự động tối ưu / Đánh giá Prompt (Prompt Optimization, Scoring, Evaluation)**: Không tích hợp các thuật toán LLM-as-a-judge hay scoring.

---

## 3. Khảo Sát Hiện Trạng Codebase & Bảng Phân Tích Gap (Phase 1)

### 3.1. Bằng Chứng Thực Tế Đã Xác Nhận Trong Codebase (Evidence Register)

1. **Stack Công Nghệ:**
   - **Backend:** FastAPI (Python 3.12), SQLite (`database/app.db`), Pydantic v2 schemas, `PRAGMA foreign_keys = ON`, `query_one`, `query_all`, `execute_commit` helper functions trong `src/db.py`.
   - **Frontend:** Next.js 15.5 (App Router), React 19, CSS Variables (Dark theme chủ đạo trong `globals.css`), native `fetch` API.
2. **Xác Thực & Phân Quyền:**
   - Hệ thống hỗ trợ JWT Bearer Token qua header `Authorization: Bearer <token>` hoặc cookie `access_token` (`src/core/security.py`).
   - Hỗ trợ cơ chế `get_current_user` (bắt buộc) và `get_optional_current_user` (linh hoạt, fallback `guest_user` khi chưa đăng nhập, đã áp dụng thành công trong nhánh Project Management).
3. **Mô Hình Dữ Liệu & Quy Ước Bảng:**
   - Bảng `users`, `conversations`, `messages`, `models`, `projects`, `discord_bot_configs`.
   - Bảng `projects` sử dụng khóa chính dạng string `VARCHAR(36)` sinh bởi `uuid.uuid4().hex` với tiền tố `proj_...`.
   - Các trường thời gian luôn dùng `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`, `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP` kèm trigger tự động cập nhật khi update bản ghi.
4. **Quy Ước API:**
   - Định tuyến tập trung qua `src/api/v1/router.py`. Các router con có tiền tố riêng: `/auth`, `/conversations`, `/chat`, `/models`, `/resources`, `/bot`, `/projects`.
   - Mã phản hồi HTTP: `200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `422 Unprocessable Entity`.
   - Error shape: JSON chuẩn `{ "detail": str | { "error_code": str, "message": str } }`.
5. **Hiện Trạng System Prompt:**
   - Trong `src/api/v1/bot.py` và bảng `discord_bot_configs`: Trường `system_prompt TEXT` được nhúng trực tiếp làm cấu hình persona riêng cho Discord Bot, giới hạn tối đa 2000 ký tự.
   - Chưa tồn tại bảng hay API riêng cho tài nguyên System Prompt tổng quát của người dùng.

### 3.2. Bảng Phân Tích Gap (Gap Analysis Matrix)

| Khu Vực (Area) | Bằng Chứng Hiện Có (Existing Evidence) | Khoảng Trống (Gap) | Mức Độ Tác Động (Impact) | Khuyến Nghị Thiết Kế (Recommendation) | Độ Tin Cậy (Confidence) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Data Persistence** | Bảng `projects`, `discord_bot_configs` đã có pattern lưu text/JSON. | Chưa có bảng `system_prompts` trong CSDL SQLite. | Người dùng chưa thể lưu trữ danh mục prompt tái sử dụng. | Thiết kế bảng `system_prompts` (migration `009_system_prompt_management.sql`) có `id`, `user_id`, `name`, `description`, `content`, `created_at`, `updated_at`. | Cao (Confirmed) |
| **Backend API** | `projects_router` (`/projects`), `bot_router` (`/bot`) chuẩn RESTful. | Chưa có router `/system-prompts` hoặc `/prompts`. | Frontend không có endpoint CRUD để giao tiếp. | Đề xuất router `prompts_router` gắn tại `/system-prompts` trong `src/api/v1/router.py`. | Cao (Confirmed) |
| **Validation Rules** | Pydantic v2 `Field(min_length=..., max_length=...)` dùng phổ biến. | Chưa có schema ràng buộc độ dài, format tên, nội dung prompt. | Nguy cơ prompt quá dài làm tràn bộ nhớ hoặc rỗng gây lỗi model sau này. | Đặt giới hạn: Tên (1-100 ký tự), Mô tả (0-500 ký tự), Nội dung (1-10.000 ký tự). | Cao (Confirmed) |
| **Frontend UI** | Giao diện `/projects` (danh sách) và `/settings` (tabs) có sẵn design tokens. | Chưa có trang `/prompts` (hoặc `/system-prompts`) để quản lý prompt. | Người dùng không có màn hình tương tác. | Thiết kế trang `/prompts` với List View và Editor Drawer/Page tái sử dụng Glassmorphism design tokens của AI-Chan. | Cao (Confirmed) |
| **Authorization** | `get_optional_current_user` trong `projects.py` hỗ trợ cả user đã đăng nhập và guest. | Cần quyết định phân quyền cho prompt: Bắt buộc login hay hỗ trợ guest? | Quyết định trải nghiệm của người dùng vãng lai. | Áp dụng mô hình nhất quán với Project: Hỗ trợ cả đăng nhập (`user.id`) và khách (`guest_user`) có phân tách Anti-IDOR. | Cao (Confirmed) |

---

## 4. Bảng Thuật Ngữ & Khái Niệm Phổ Quát (Ubiquitous Language)

| Thuật Ngữ Tiếng Việt | Thuật Ngữ Tiếng Anh | Định Nghĩa Trong Hệ Thống AI-Chan |
| :--- | :--- | :--- |
| **System Prompt** | System Prompt / System Instruction | Chuỗi văn bản chỉ dẫn cấp cao được nạp vào mô hình AI để thiết lập nhân cách, nguyên tắc xử lý và định dạng phản hồi trước khi người dùng gửi tin nhắn. |
| **Prompt Library** | Prompt Library / Repository | Danh mục tập trung các System Prompt do người dùng tạo lập và quản lý trong tài khoản của mình. |
| **Content** | Prompt Content | Nội dung văn bản thuần túy của chỉ dẫn hệ thống, hỗ trợ nhiều dòng, Unicode, ký tự lập trình. |
| **Safe Rendering** | Safe Rendering | Cơ chế hiển thị nội dung prompt an toàn, xem chuỗi là dữ liệu văn bản (Plain Text Data) thay vì HTML/Script thực thi. |
| **Dirty Form** | Dirty Form State | Trạng thái biểu mẫu khi người dùng đã chỉnh sửa ít nhất một trường dữ liệu so với dữ liệu gốc ban đầu và chưa lưu vào hệ thống. |
| **Anti-IDOR** | Insecure Direct Object References Prevention | Cơ chế bảo mật bắt buộc kiểm tra quyền sở hữu (`WHERE user_id = :current_user_id`) ở tầng Backend trên mọi thao tác truy vấn/chỉnh sửa/xóa theo ID. |
| **Guest Mode** | Guest Mode | Chế độ cho phép người dùng chưa đăng nhập trải nghiệm tạo và quản lý System Prompt với phạm vi dữ liệu gắn định danh `guest_user`. |

---

## 5. Nhật Ký Quyết Định Nghiệp Vụ & Kiến Trúc (Decision Log)

| Decision ID | Vấn Đề Cần Quyết Định | Các Phương Án Xem Xét | Đề Xuất Lựa Chọn | Cơ Sở / Lý Do Kỹ Thuật | Tác Động / Rủi Ro | Trạng Thái |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DEC-SPM-01** | **Cấu trúc thực thể System Prompt** | **A**: Chỉ gồm `name` và `content`.<br>**B**: Thêm `description`, `created_at`, `updated_at`, `user_id`.<br>**C**: Thêm tags, category, version, temperature. | **Chọn Option B** | Đủ cho nhu cầu quản lý tóm tắt (tên, mô tả ngắn, thời gian) mà không làm phức tạp hóa MVP (YAGNI). | Cấu trúc dữ liệu gọn nhẹ, dễ mở rộng thêm tag sau này nếu cần. | `Confirmed` |
| **DEC-SPM-02** | **Tính duy nhất của Tên System Prompt** | **A**: Không cần duy nhất.<br>**B**: Duy nhất trên toàn hệ thống.<br>**C**: Duy nhất theo từng Người dùng (`UNIQUE(user_id, name)`). | **Chọn Option C** | Người dùng không bị trùng lặp tên trong thư viện riêng của mình, đồng thời không gây xung đột tên giữa các người dùng khác nhau. | Cần validate ràng buộc duy nhất ở backend và thông báo lỗi 409 Conflict rõ ràng khi trùng tên. | `Confirmed` |
| **DEC-SPM-03** | **Giới hạn độ dài nội dung Prompt** | **A**: Không giới hạn (TEXT vô hạn).<br>**B**: 2.000 ký tự (như bot discord).<br>**C**: 10.000 ký tự (~2.000-2.500 tokens).<br>**D**: 50.000 ký tự. | **Chọn Option C: 10.000 ký tự** | 10.000 ký tự (~2.500 từ) là độ dài tiêu chuẩn lý tưởng cho hầu hết System Prompt chuyên sâu (persona, coding rules, domain instructions) trên Gemini, GPT-4o, Claude; ngăn chặn DoS bộ nhớ. | Cần validate `max_length=10000` ở Pydantic và hiển thị bộ đếm ký tự trên UI. | `Confirmed` |
| **DEC-SPM-04** | **Phạm vi Tìm kiếm (Search Scope)** | **A**: Tìm theo Tên và Mô tả.<br>**B**: Tìm theo cả Tên, Mô tả và toàn bộ Nội dung Content.<br>**C**: Tích hợp Full-text search FTS5. | **Chọn Option A: Tìm theo `name` và `description`** | Đảm bảo hiệu năng truy vấn nhanh, bảo vệ quyền riêng tư, tránh quét qua văn bản dài 10.000 ký tự trong SQLite, phù hợp trải nghiệm tìm lướt qua thư viện. | Người dùng không tìm được từ khóa nằm sâu trong ruột prompt, nhưng tên và mô tả đủ để nhận diện. | `Confirmed` |
| **DEC-SPM-05** | **Chính sách Xóa trong MVP (Lifecycle)** | **A**: Xóa mềm (Soft Delete `is_deleted` hoặc `status='ARCHIVED'`).<br>**B**: Xóa vĩnh viễn (Hard Delete) kèm xác nhận.<br>**C**: Cả xóa mềm, lưu trữ và thùng rác khôi phục. | **Chọn Option B: Hard Delete kèm Hộp thoại Xác nhận** | Trong phạm vi MVP độc lập, prompt chưa bị ràng buộc khóa ngoại tới graph hay conversation nào; Hard Delete giúp CSDL tinh gọn, tránh dữ liệu rác tồn đọng. Khi sau này prompt được liên kết vào Project, sẽ nâng cấp lên chặn xóa nếu đang dùng. | Dữ liệu bị xóa không thể khôi phục lại, bắt buộc phải có bước xác nhận Modal trên UI. | `Confirmed` |
| **DEC-SPM-06** | **Xác thực và Quyền Truy Cập (Auth & IDOR)** | **A**: Bắt buộc đăng nhập (`get_current_user`).<br>**B**: Hỗ trợ cả Đăng nhập và Khách (`get_optional_current_user`). | **Chọn Option B: Hỗ trợ Đăng nhập + Guest Mode** | Nhất quán hoàn toàn với triết lý của nhánh Project Management (DEC-PRJ-06) đã được phê duyệt, giúp người dùng dùng thử ngay lập tức mà không gặp rào cản đăng ký. | Cần phân tách `user_id = 'guest_user'` rõ ràng, thực thi Anti-IDOR ở mọi query backend. | `Confirmed` |
| **DEC-SPM-07** | **Cơ chế Lưu (Save Mechanism) & Cảnh Báo Rời Trang** | **A**: Autosave theo từng phím gõ.<br>**B**: Nút Lưu thủ công + Cảnh báo Dirty Form khi thoát.<br>**C**: Optimistic Lock với version checking. | **Chọn Option B: Nút Lưu thủ công + Dirty Form Check** | Tránh việc gửi liên tục request lớn (nội dung tới 10.000 ký tự) lên server khi người dùng đang soạn thảo dở dang. Đảm bảo người dùng chủ động kiểm soát thời điểm lưu. | Cần lắng nghe sự kiện `beforeunload` và can thiệp router transition trên Next.js khi form dirty. | `Confirmed` |
| **DEC-SPM-08** | **Đường dẫn URL & Vị trí Điều Hướng** | **A**: Nằm trong một tab của `/settings`.<br>**B**: Trang riêng biệt tại `/prompts`.<br>**C**: Modal popup nổi trên trang `/chat`. | **Chọn Option B: Trang chuyên biệt `/prompts`** | Tương đương với `/projects`, `/dashboard`, tạo không gian soạn thảo rộng rãi, thoáng đãng cho việc viết prompt dài, có lối tắt truy cập từ Sidebar và Header. | Thêm route mới trên frontend (`/prompts`). | `Confirmed` |

---

## 6. Ranh Giới Với Các Phân Hệ Khác (System Boundaries)

```
┌────────────────────────────────────────────────────────────────────────┐
│                   AI-CHAN VIRTUAL ASSISTANT PLATFORM                   │
│                                                                        │
│   ┌─────────────────────────────┐        ┌─────────────────────────┐   │
│   │   System Prompt Management  │        │   Project Management    │   │
│   │         (PHÂN HỆ NÀY)       │        │      (Canvas Graph)     │   │
│   │  • Quản lý thư viện Prompt  │        │  • Web Input Node       │   │
│   │  • CRUD System Prompt       │   ✕    │  • Model Node           │   │
│   │  • An toàn hiển thị văn bản │ Không  │  • Output Node          │   │
│   │  • Độc lập cấu hình         │  gắn   │  • Active quota         │   │
│   └──────────────┬──────────────┘  trong └────────────┬────────────┘   │
│                  │                  MVP               │                │
│                  │ (Tương lai:                        │                │
│                  │  Liên kết ID)                      │                │
│                  ▼                                    ▼                │
│   ┌────────────────────────────────────────────────────────────┐       │
│   │            LLM Execution & Chat Runtime Engine             │       │
│   │        • Sliding context window (20 tin nhắn)              │       │
│   │        • Multi-provider streaming SSE (Gemini, OpenAI)     │       │
│   │        • Token Telemetry & Daily Quota Manager             │       │
│   └────────────────────────────────────────────────────────────┘       │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Với Project Management (Canvas Builder):**
   - Trong MVP, hai phân hệ hoàn toàn độc lập. Không có liên kết dữ liệu hay khóa ngoại giữa `projects` và `system_prompts`.
   - Không xuất hiện "System Prompt Node" trên canvas graph.
2. **Với Model Catalog (`/models`):**
   - System Prompt không bị gán cứng vào bất kỳ Model Provider nào. Nó là cấu hình văn bản trung lập, có thể dùng cho bất kỳ LLM nào khi được tích hợp sau này.
3. **Với Discord Bot (`/bot`):**
   - Cấu hình Discord Bot hiện tại tiếp tục dùng trường `system_prompt` riêng của bảng `discord_bot_configs`. Chưa tiến hành gộp vào thư viện System Prompt trong MVP để tránh ảnh hưởng hệ thống đang chạy.
