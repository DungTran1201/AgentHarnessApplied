# PHẦN 00: KHẢO SÁT HIỆN TRẠNG & BẢNG ĐĂNG KÝ MINH CHỨNG (DISCOVERY & EVIDENCE REGISTER)
## Phân Hệ: Quản Lý Quy Tắc (Rules Management — Rules Library & Rule Editor)
### Dự Án: Nền Tảng Trợ Lý Ảo AI-Chan (AI-Chan Assistant Platform)

---

| Thông Tin Quản Trị | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `RUL-DOC-00` |
| **Nhánh Tính Năng** | **Rules Management (Rules Library & Rule Detail / Editor)** |
| **Trạng Thái Quản Trị** | **`PROPOSED (Chờ Duyệt Từ Architecture Board & Product Owner)`** |
| **Phiên Bản** | `1.0.0-PROPOSAL` |
| **Ngày Khảo Sát** | `2026-10-18` |
| **Tác Giả / Vai Trò** | Senior Business Analyst, Solution Architect, Technical Writer & QA Analyst |
| **Nguyên Tắc Bắt Buộc** | Tuân thủ `AGENTS.md`, `.agents/rules/core.md`, `.agents/rules/documentation.md`. Phân loại nghiêm ngặt: `FACT`, `ASSUMPTION`, `DECISION`, `OPEN QUESTION`. Không sửa code sản phẩm. |

---

## 1. Mục Đích & Phương Pháp Khảo Sát (Discovery Purpose & Methodology)

Nhiệm vụ của giai đoạn Khảo sát (Phase 0) là thực hiện rà soát tĩnh (Static Codebase Audit) độc lập, khách quan và dựa trên bằng chứng (evidence-based) trên toàn bộ kho mã nguồn `ai-chan` nhằm:
1. Xác định hiện trạng hỗ trợ đối với thực thể **Rules** trên cả 4 tầng: Frontend (`ai-frontend`), Backend (`ai-backend`), Cơ sở dữ liệu (`ai-backend/database`), và Môi trường Runtime Agent (`.agents/rules/`).
2. Xác minh các điểm giao tiếp hiện có giữa các khái niệm nhận thức (Cognitive Assets): **System Prompts**, **Skills**, **Tools**, và **Projects / Canvas Graph**.
3. Đối chiếu chuẩn mực công nghệ tham chiếu chính thức từ **Google Antigravity Rules** (`https://antigravity.google/docs/rules/`) để xác lập các nguyên lý thiết kế: Phạm vi lưu trữ (Storage Scope), Phạm vi áp dụng (Application Scope), Chế độ kích hoạt (Activation Mode), và Chính sách xử lý xung đột (Conflict Resolution).
4. Phân loại minh chứng theo 4 trạng thái tiêu chuẩn:
   - **`EXISTS`**: Đã tồn tại mã nguồn hoặc cơ sở dữ liệu hoạt động thực tế.
   - **`PARTIAL`**: Đã có cấu trúc khung, tài liệu hoặc thành phần tương tự nhưng chưa hoàn thiện cho Rules.
   - **`MISSING`**: Hoàn toàn chưa tồn tại trong codebase, cần đặc tả mới theo diện `PROPOSED`.
   - **`CONFLICT`**: Có sự mâu thuẫn giữa tài liệu và mã nguồn, hoặc giữa các quy ước kiến trúc.

---

## 2. Bảng Đăng Ký Minh Chứng Codebase (Evidence Register)

| ID | Nhận Định / Yêu Cầu (Claim) | Đường Dẫn Minh Chứng / Endpoint / Schema | Trạng Thái | Ảnh Hưởng Kiến Trúc & Nghiệp Vụ | Đề Xuất Hồ Sơ Tài Liệu |
| :---: | :--- | :--- | :---: | :--- | :--- |
| **EV-01** | Backend đã có endpoint quản lý System Prompts | `ai-backend/app/routers/prompts.py`<br>`ai-backend/app/services/prompt_service.py` | `EXISTS` | Đã có CRUD hoàn chỉnh cho `system_prompts` (Name, Description, Content, User isolation). | Tái sử dụng mẫu RESTful CRUD, Pydantic v2 validation và User isolation cho Rules API (`/api/v1/rules`). |
| **EV-02** | Backend đã có endpoint quản lý Skills | `ai-backend/app/routers/skills.py`<br>`ai-backend/app/services/skill_service.py` | `EXISTS` | Đã có quản lý danh mục kỹ năng, liên kết thư mục kỹ năng bên ngoài. | Phân định ranh giới: Skill là quy trình thực thi nhiều bước; Rule là ràng buộc/tiêu chuẩn hành vi. |
| **EV-03** | Backend đã có endpoint quản lý Tools | `ai-backend/app/routers/tools.py`<br>`ai-backend/app/services/tool_service.py` | `EXISTS` | Đã có Tool Registry, Tool PolicyGate, phân quyền tool execution. | Phân định ranh giới: Tool là khả năng hành động; Rule quy định khi nào/cách thức agent được dùng tool. |
| **EV-04** | Backend đã có router hoặc service cho Rules | `ai-backend/app/routers/rules.py`<br>`ai-backend/app/services/rule_service.py` | **`MISSING`** | Backend hiện chưa có bất kỳ route hay service nào xử lý thực thể Rules trong Web API. | Đánh dấu toàn bộ API `/api/v1/rules/*` là **`PROPOSED`** trong SRS, API Contract và Architecture. |
| **EV-05** | Database đã có bảng lưu trữ Rules | `ai-backend/database/migrations/`<br>(Migrations 001 đến 016) | **`MISSING`** | Migration gần nhất là `016_tool_management_system.sql`. Chưa có bảng `rules` hay `project_rules`. | Thiết kế schema migration mới `017_rules_management_system.sql` dưới dạng đề xuất chuẩn DDL. |
| **EV-06** | Frontend đã có trang Rules Library / Editor | `ai-frontend/src/pages/`<br>`ai-frontend/src/components/` | **`MISSING`** | Frontend chỉ có `PromptsPage.tsx`, `SkillsPage.tsx`, `ToolsPage.tsx`, `ProjectEditorPage.tsx`. Chưa có route `/rules`. | Đặc tả giao diện Rules Library (`/rules`) và Rule Detail/Editor (`/rules/:id`) tương thích chuẩn UI Design System. |
| **EV-07** | Workspace đã có quy tắc Agent Antigravity tĩnh | `.agents/rules/*.md`<br>(`core.md`, `ponytail.md`, `change-lifecycle.md`, `diagrams.md`, v.v.) | `EXISTS` | Host IDE/Antigravity Agent nạp và tuân thủ các quy tắc này khi làm việc trên repo AI-Chan. | Phân biệt rõ: `.agents/rules/` là quy tắc cho IDE Host Agent; Phân hệ Rules Management là tính năng ứng dụng của AI-Chan. |
| **EV-08** | Cú pháp Trigger Frontmatter trong `.agents/rules/` | `.agents/rules/change-lifecycle.md`<br>(`trigger: model_decision`, `description: ...`) | `EXISTS` | Minh chứng cơ chế kích hoạt điều kiện (Conditional Activation) dựa trên metadata YAML frontmatter. | Chuẩn hóa các chế độ kích hoạt cho Rule AI-Chan: `always_on`, `model_decision`, `glob`, `manual`. |
| **EV-09** | Project Canvas hỗ trợ liên kết Node | `ai-backend/database/migrations/008_project_management.sql`<br>`ai-frontend/src/pages/ProjectEditorPage.tsx` | `PARTIAL` | Graph Canvas hỗ trợ Node Input, Model, Output, System Prompt, Skill, Tool. Chưa có Node `Rule`. | Đánh dấu việc đưa Rule Node vào Canvas là tính năng **`PROPOSED / FUTURE INTEGRATION`** (không thuộc MVP quản lý thư viện). |
| **EV-10** | Cơ chế nạp Rule vào Context Runtime Chatbot | `ai-backend/app/services/chat_service.py`<br>`ai-backend/app/routers/chat.py` | **`MISSING`** | Luồng sinh chat hiện chỉ inject System Prompt và Tool schemas vào LLM Context; chưa có cơ chế tải Rule vào runtime. | Ghi rõ trong SAD: Runtime Resolution là **`PROPOSED / OUT OF SCOPE MVP`**; MVP tập trung vào Thư viện quản lý (Registry/CRUD). |
| **EV-11** | Chuẩn bảo mật Anti-IDOR và User Isolation | `ai-backend/app/routers/prompts.py`<br>(`current_user.id == prompt.user_id`) | `EXISTS` | Kiểm soát truy cập chặt chẽ theo `user_id` của JWT token đã đăng nhập. | Áp dụng triệt để nguyên tắc Anti-IDOR cho mọi endpoint Rules CRUD; hỗ trợ 3 cấp độ: System (Global Readonly), User, Project. |
| **EV-12** | Quy ước viết tài liệu và biểu đồ Mermaid | `docs/README.md`<br>`.agents/rules/documentation.md`<br>`.agents/rules/diagrams.md` | `EXISTS` | Bắt buộc chia tách models/docs, sử dụng ID ổn định, vẽ tối thiểu 16 biểu đồ Mermaid có cấu trúc chuẩn. | Tuân thủ 100% quy ước mã định danh `RUL-FR-###`, `RUL-UC-###`, `RUL-BR-###`, `RUL-API-###`, `RUL-TC-###`, `RUL-DIA-###`. |

---

## 3. Nhật Ký Nguồn Tham Khảo Chính Thức (Reference Log)

Nhằm đảm bảo thiết kế Rules Management của AI-Chan thừa hưởng những thực hành kiến trúc tiên tiến nhất của hệ sinh thái Agentic AI, tài liệu đã nghiên cứu và đối chiếu các nguồn tài liệu kỹ thuật chính thức sau:

| STT | Tên Tài Liệu / Nguồn Tham Khảo | URL Chính Thức | Ngày Truy Cập | Phát Hiện & Ý Nghĩa Đối Với Thiết Kế AI-Chan |
| :---: | :--- | :--- | :---: | :--- |
| **REF-01** | **Antigravity Rules Documentation** | `https://antigravity.google/docs/rules/` | `2026-10-18` | - **Cấu trúc lưu trữ đa tầng:** Phân tách rõ ràng giữa User Global Rules (`~/.gemini/config/rules/`) và Workspace Rules (`<project>/.agents/rules/`).<br>- **Định dạng chuẩn:** Markdown kết hợp YAML Frontmatter (`trigger`, `description`, `globs`).<br>- **Cơ chế nạp:** Flat scanning, deduplication theo canonical path, độ ưu tiên tích lũy (Cumulative precedence). |
| **REF-02** | **Antigravity Rules and Workflows** | `https://antigravity.google/docs/rules-workflows` | `2026-10-18` | - **Phân định ranh giới:** Rules là ràng buộc thụ động / định hướng hành vi (Declarative constraints); Workflows / Skills là quy trình chủ động có bước tuần tự.<br>- **Khai phá lũy tiến (Progressive Disclosure):** Với rule có `trigger: model_decision`, agent chỉ nạp metadata tóm tắt ban đầu, chỉ đọc toàn bộ nội dung khi ngữ cảnh hội thoại kích hoạt điều kiện. Giúp tiết kiệm context window tối ưu. |
| **REF-03** | **Antigravity Customization Architecture** | `builtin/skills/agy-customizations/SKILL.md` (Local IDE) | `2026-10-18` | - Xác nhận thứ tự nạp: Global Root (`~/.gemini/config`) -> Workspace Root (`.agents/`).<br>- Quy định chặt chẽ: Không đưa secret, API key hay mã độc vào rule; Rule phải có tính bất biến hoặc kiểm soát phiên bản rõ ràng. |
| **REF-04** | **AI-Chan System Prompt Management Spec** | `docs/features/system-prompt-management/` | `2026-10-18` | - Khung tài liệu chuẩn mực của repository AI-Chan: 11 tài liệu kỹ thuật, 12 biểu đồ Mermaid, ma trận truy vết khép kín.<br>- Ranh giới phân hệ: MVP tập trung CRUD thư viện tập trung; không làm thay đổi runtime chat cốt lõi. |
| **REF-05** | **AI-Chan Tool Management Spec** | `docs/features/tool-management/` | `2026-10-18` | - Kiến trúc Registry 3 lớp: Catalog/Library -> Binding -> Execution PolicyGate.<br>- Quy ước bảo mật STRIDE, kiểm soát tham chiếu khi xóa (Delete Guard). |

---

## 4. Phân Loại Dữ Kiện Dự Án (Fact Classification)

Theo chỉ dẫn tại `AGENTS.md`, mọi phát biểu và nhận định trong toàn bộ hồ sơ kỹ thuật được phân loại nghiêm ngặt:

### 4.1. FACT (Sự thật đã được xác minh qua mã nguồn và tài liệu có sẵn)
- **`FACT-01`**: Repository hiện có cấu trúc monorepo với `ai-backend` (FastAPI + SQLModel/PostgreSQL) và `ai-frontend` (React + TypeScript + Vite + TailwindCSS).
- **`FACT-02`**: Chưa hề có bất kỳ bảng cơ sở dữ liệu nào tên là `rules` hoặc liên quan đến Rules trong các migration từ `001` đến `016`.
- **`FACT-03`**: Chưa có router `/rules` hay service `rule_service.py` nào trong `ai-backend`.
- **`FACT-04`**: Chưa có giao diện người dùng nào cho Rules Library hay Rule Editor trong `ai-frontend`.
- **`FACT-05`**: Trong thư mục `.agents/rules/` của workspace, các file Markdown như `core.md`, `ponytail.md`, `change-lifecycle.md` đang hoạt động để hướng dẫn agent Antigravity, sử dụng cấu trúc YAML frontmatter.
- **`FACT-06`**: Luồng chat runtime hiện tại chỉ lấy dữ liệu từ `system_prompts`, `models`, `conversations`, `messages`, và `tools`. Chưa có logic truy vấn hay nhúng Rules vào context chat.

### 4.2. ASSUMPTION (Giả định kỹ thuật cần được hiện thực hóa trong đề xuất)
- **`ASSUMP-01`**: Người dùng AI-Chan cần một giao diện đồ họa Web (UI) để quản lý tập trung các quy tắc định hướng cho trợ lý ảo thay vì phải chỉnh sửa file Markdown thủ công trong hệ thống tệp tin.
- **`ASSUMP-02`**: Kiến trúc Rules của AI-Chan nên hỗ trợ 4 chế độ kích hoạt tương thích với tư duy Antigravity: `always_on` (luôn bật), `model_decision` (mô hình tự quyết định dựa trên mô tả), `glob` (kích hoạt theo mẫu tệp tin/chủ đề), và `manual` (bật/tắt thủ công theo dự án).
- **`ASSUMP-03`**: Mỗi người dùng sở hữu thư viện Rules riêng biệt (`scope = 'user'`), đồng thời hệ thống cung cấp sẵn một bộ Rules chuẩn hệ thống chỉ đọc (`scope = 'system'`). Sau này có thể mở rộng Rule gắn riêng theo Project (`scope = 'project'`).

### 4.3. DECISION (Quyết định thiết kế kiến trúc cho hồ sơ đặc tả)
- **`DEC-RUL-01`**: Phân chia ranh giới rõ ràng: Phân hệ **Rules Management (MVP)** tập trung vào việc xây dựng **Rules Library** (danh sách, tìm kiếm, lọc, phân loại) và **Rule Editor** (tạo mới, xem chi tiết, soạn thảo Markdown + Metadata, lưu trữ, xóa an toàn).
- **`DEC-RUL-02`**: Toàn bộ các cơ chế **Runtime Resolution & Prompt Injection** (nạp rules vào LLM prompt khi chat) và **Canvas Rule Node** được gắn nhãn là **`PROPOSED / FUTURE RUNTIME INTEGRATION`**, được thiết kế đầy đủ về mặt lý thuyết trong tài liệu kiến trúc nhưng không được mô tả như thể đã hoạt động trong hệ thống hiện hành.
- **`DEC-RUL-03`**: Schema cơ sở dữ liệu `rules` lưu trữ độc lập trong PostgreSQL qua Migration `017_rules_management_system.sql`, hỗ trợ đầy đủ các trường metadata, soft-delete, versioning và kiểm tra tham chiếu toàn vẹn dữ liệu.

### 4.4. OPEN QUESTION (Vấn đề còn mở cần Ban Quản Trị phê duyệt)
- **`OQ-RUL-01`**: Khi một Rule bị xóa (`soft_delete`), các Project đang liên kết với Rule đó sẽ bị vô hiệu hóa liên kết ngay lập tức (Cascade Detach) hay chuyển Rule sang trạng thái `Archived` để bảo toàn lịch sử prompt của các phiên chat cũ?
- **`OQ-RUL-02`**: Giới hạn độ dài tối đa của một Rule Content nên là bao nhiêu? Đề xuất kiến trúc: 10.000 ký tự cho văn bản quy tắc để tránh tràn context window của LLM.
- **`OQ-RUL-03`**: Có cho phép người dùng thông thường tạo Rule có phạm vi `system` (Global) không? Đề xuất: Chỉ tài khoản có vai trò `admin` mới được tạo hoặc sửa đổi `system` scope.

---

## 5. Kết Luận Khảo Sát & Hướng Triển Khai Tiếp Theo

1. Khảo sát khẳng định **Rules Management là một phân hệ mới hoàn toàn (100% Greenfield)** trên cả Frontend, Backend và Database của AI-Chan, nhưng có thể kế thừa hoàn hảo các mô hình thiết kế chuẩn mực từ phân hệ `system-prompt-management` và `tool-management`.
2. Toàn bộ hồ sơ kỹ thuật trong thư mục `docs/features/rules-management/` sẽ được soạn thảo với độ chi tiết tối đa, cung cấp đầy đủ 12 tài liệu đặc tả và 16 biểu đồ Mermaid chuẩn xác, phục vụ trực tiếp cho quá trình Review, Phê duyệt và Triển khai lập trình sau này mà không cần phỏng đoán.
