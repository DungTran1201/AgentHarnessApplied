# PHẦN 06: BẢNG ĐỐI CHIẾU SO SÁNH 4 THÀNH PHẦN NHẬN THỨC (RULES VS SKILLS VS SYSTEM PROMPTS VS TOOLS)
## Phân Hệ: Quản Lý Quy Tắc (Rules Management — Rules Library & Rule Editor)
### Dự Án: Nền Tảng Trợ Lý Ảo AI-Chan (AI-Chan Assistant Platform)

---

| Thông Tin Quản Trị | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `RUL-DOC-06` |
| **Nhánh Tính Năng** | **Rules Management (Rules Library & Rule Editor)** |
| **Trạng Thái Quản Trị** | **`PROPOSED (Chờ Duyệt Từ Architecture Board & Product Owner)`** |
| **Phiên Bản** | `1.0.0-PROPOSAL` |
| **Ngày Ban Hành** | `2026-10-18` |
| **Tác Giả / Vai Trò** | Senior Solution Architect & AI System Designer |

---

## 1. Bối Cảnh Nghiệp Vụ & Sự Cần Thiết Của Việc Phân Định

Trong kiến trúc của một hệ thống Trợ Lý Ảo Đa Tác Nhân (Agentic AI System) như AI-Chan, các khái niệm nhận thức (Cognitive Assets) thường dễ bị nhầm lẫn hoặc sử dụng chồng chéo. Việc thiếu ranh giới rõ ràng sẽ dẫn đến các hệ quả tiêu cực:
1. **Ô nhiễm ngữ cảnh (Context Pollution)**: Nhồi nhét quá nhiều quy tắc vào mọi câu chat làm tràn cửa sổ ngữ cảnh (Context Window) và tăng chi phí token của LLM.
2. **Xung đột hành vi (Behavioral Collision)**: System Prompt nói một kiểu, Rule quy định một kiểu, và Skill thực thi một kiểu khác khiến mô hình bối rối (Hallucination hoặc Loop).
3. **Mất an toàn hệ thống (Security Vulnerability)**: Không thể kiểm soát quyền thực thi (Side Effects) nếu biến Rule thành nơi chứa mã script hoặc lệnh gọi Tool trái phép.

Tài liệu này xác lập ranh giới định nghĩa và bảng đối chiếu chuẩn mực giữa 4 trụ cột nhận thức của AI-Chan: **Rules**, **System Prompts**, **Skills**, và **Tools**.

---

## 2. Ma Trận Đối Chiếu Chi Tiết 10 Tiêu Chí Cốt Lõi

| Tiêu Chí So Sánh | Quy Tắc (Rule) | Chỉ Dẫn Hệ Thống (System Prompt) | Kỹ Năng (Skill) | Công Cụ (Tool) |
| :--- | :--- | :--- | :--- | :--- |
| **1. Mục Đích Cốt Lõi (Core Purpose)** | Đưa ra các **ràng buộc thụ động (Passive Constraints)**, tiêu chuẩn kiến trúc, quy ước đặt tên, giới hạn hành vi và chuẩn mực an ninh mà Agent **phải tuân thủ** trong quá trình suy luận. | Thiết lập **vai trò (Persona)**, giọng điệu giao tiếp (Tone of Voice), phong cách xưng hô và bối cảnh hoạt động tổng thể của Trợ lý ảo cho một cuộc hội thoại. | Cung cấp **năng lực quy trình chủ động (Procedural Capabilities)** gồm các bước thực hiện tuần tự để giải quyết một bài toán phức tạp (Workflow/Cheatsheet). | Cung cấp **khả năng hành động cụ thể (Execution Primitives)** tương tác trực tiếp với môi trường ngoài (Web search, File I/O, Database query, Sandbox). |
| **2. Hình Thức Lưu Trữ (Storage Format)** | Bảng CSDL `rules` (Metadata + Nội dung Markdown chuẩn). Tại Workspace Host: Tệp `.md` có YAML frontmatter (`.agents/rules/*.md`). | Bảng CSDL `system_prompts` (Văn bản thuần túy Plain Text hoặc Markdown ngắn gọn). | Thư mục chuyên biệt (`skills/<name>/`) chứa tệp chỉ dẫn `SKILL.md` kèm các thư mục con tài nguyên (`scripts/`, `references/`, `examples/`). | Bảng CSDL `tools` + Mã nguồn Python / Sandbox runner thực thi; định nghĩa Schema JSON Schema (Parameters & Returns). |
| **3. Cấu Trúc Nội Dung (Content Structure)** | Khối Markdown có cấu trúc quy chuẩn kết hợp metadata điều kiện kích hoạt: `trigger` (`always_on`, `model_decision`, `glob`, `manual`), `priority`, `globs`. | Đoạn văn bản định hướng tự do (Free-form text) mô tả tính cách, vai trò (ví dụ: "Bạn là chuyên gia lập trình Python..."). | Tài liệu hướng dẫn đa bước có YAML metadata (`name`, `description`), các kịch bản mẫu, hướng dẫn sử dụng công cụ và script hỗ trợ. | Hàm thực thi (Callable Python Function) kèm Docstrings chuẩn, tham số đầu vào có kiểu dữ liệu rõ ràng và mã trả về. |
| **4. Cách Chọn / Phạm Vi Áp Dụng (Selection & Scope)** | **Áp dụng có điều kiện (Conditional)**: Lọc theo Project binding, kích hoạt theo file glob pattern hoặc mô hình tự quyết định dựa trên độ tương đồng của prompt. | **Áp dụng đơn nhất (Singleton per Session)**: Một phiên hội thoại hoặc một Project Canvas thường chỉ gắn 1 System Prompt chủ đạo. | **Lựa chọn theo nhu cầu (On-Demand Discovery)**: Agent tự động đọc `SKILL.md` khi phát hiện bài toán của người dùng cần đến kỹ năng đó. | **Gọi hàm tự động (Function Calling)**: LLM quyết định phát sinh lời gọi tool dựa trên schema parameters khi cần thu thập thông tin hoặc hành động. |
| **5. Thời Điểm Nạp Vào Context (Context Ingestion Timing)** | Nạp lúc tiền xử lý prompt (Pre-prompt generation) trước khi gửi tới LLM. Có thể nạp toàn phần (Full) hoặc nạp lũy tiến (Progressive Disclosure - chỉ nạp summary trước). | Nạp cố định ngay từ token đầu tiên của khối System Message (`role: system`) trong toàn bộ vòng đời phiên chat. | Nạp động (Dynamic Just-in-Time): Chỉ khi Agent quyết định kích hoạt Skill thì nội dung `SKILL.md` mới được đọc vào bộ nhớ tạm thời. | Định nghĩa Schema của Tool được nạp vào payload API (khối `tools: [...]`); kết quả chạy Tool được nạp vào sau khi tool thực thi xong. |
| **6. Có Thực Thi Mã / Tác Động Phụ Không? (Side Effects & Code Execution)** | **HOÀN TOÀN KHÔNG**. Rule chỉ là văn bản định hướng tri thức (Declarative Guidelines). Không chứa mã chạy trực tiếp và không có side effect. | **HOÀN TOÀN KHÔNG**. Chỉ là văn bản tĩnh định hình tư duy mô hình. Không thể tự gọi script hay thay đổi hệ thống ngoài. | **CÓ THỂ CÓ**. Skill có thể chứa các script Python/Bash trong thư mục `scripts/` để Agent triệu hồi thực thi trong môi trường sandbox an toàn. | **LUÔN CÓ**. Bản chất của Tool là thực thi tác vụ: Ghi file, đọc file, gọi API web, chạy lệnh terminal, tương tác cơ sở dữ liệu. |
| **7. Cách Liên Kết Với Project (Project Association)** | Liên kết Nhiều - Nhiều (Many-to-Many) qua bảng quan hệ `project_rules`. Dự án có thể chọn bật/tắt từng Rule cụ thể. | Thường là Một - Nhiều (One-to-Many): Mỗi Project chọn 1 System Prompt node trên Canvas. | Nhiều - Nhiều: Dự án có thể cấp quyền truy cập vào một tập hợp Skills trong Catalog. | Nhiều - Nhiều: Dự án tick chọn danh sách các Tools được phép gọi thông qua PolicyGate. |
| **8. Vòng Đời & Kiểm Soát Quyền (Lifecycle & Permissions)** | Quản lý qua Thư viện (Rules Library). Có 3 scope: `system` (Global, Admin quản trị), `user` (Cá nhân), `project` (Dự án). | Quản lý qua Thư viện System Prompts. Người dùng toàn quyền CRUD prompt cá nhân của mình. | Thường gắn liền với Workspace filesystem hoặc Plugin Catalog; đòi hỏi kiểm duyệt an toàn mã nguồn nghiêm ngặt. | Đăng ký qua Tool Registry; cần cơ chế phê duyệt quyền (Permission Gate / PolicyGate) để chặn các hành vi phá hoại hệ thống. |
| **9. Cơ Chế Kiểm Tra Hợp Lệ (Validation Rules)** | Kiểm tra độ dài (<= 10.000 ký tự), hợp lệ glob pattern, chống Rule Poisoning và khử khuẩn Stored XSS. | Kiểm tra độ dài (<= 10.000 ký tự), tính duy nhất của tên trong tài khoản. | Kiểm tra cấu trúc thư mục, tệp `SKILL.md` bắt buộc, tính hợp lệ của YAML frontmatter. | Kiểm tra JSON Schema hợp lệ theo chuẩn OpenAPI 3.1, kiểm tra an toàn đường dẫn, SSRF whitelist. |
| **10. Cách Xử Lý Xung Đột (Conflict Resolution)** | Áp dụng chính sách ưu tiên phân tầng: Workspace Rule ghi đè Global Rule; Mức `priority` cao hơn ghi đè mức thấp hơn. | Không có xung đột đa tầng vì mỗi phiên chỉ có 1 System Prompt duy nhất được áp dụng. | Agent lựa chọn Skill phù hợp nhất dựa trên mức độ tương đồng của mục tiêu; không nạp đồng thời 2 skill trùng mục đích. | Agent tự điều phối thứ tự gọi Tools theo chuỗi lập luận (ReAct / Tool Loop). |

---

## 3. Nguyên Tắc Cốt Lõi: Ngăn Chặn Nhồi Nhét Toàn Cục (No Auto-Global Ingestion Policy)

Một nguyên tắc kiến trúc tối thượng được khẳng định trong tài liệu này nhằm đảm bảo tính ổn định của AI-Chan:

> [!CAUTION]
> **Quy Tắc Bất Biến**: Sự tồn tại của một Rule trong Thư Viện Cá Nhân (`user` scope) **KHÔNG BAO GIỜ** đồng nghĩa với việc Rule đó tự động được nhồi vào ngữ cảnh của tất cả các Project của người dùng.

### Lý Do Kỹ Thuật:
1. **Bảo tồn Hạn ngạch Token (Token Economy)**: Nếu một người dùng tạo 20 Rules khác nhau (mỗi rule dài 1.000 từ) và hệ thống tự động chèn tất cả vào mọi phiên chat, mô hình sẽ tiêu tốn ~20.000 tokens chỉ cho phần chỉ dẫn ban đầu, làm cạn kiệt Context Window và tăng vọt chi phí API.
2. **Ngăn chặn Xung đột Ngữ cảnh (Cross-Project Contamination)**: Người dùng có thể có một Project chuyên viết code C++ (yêu cầu quản lý bộ nhớ thủ công) và một Project viết code Python (yêu cầu không tối ưu hóa vi mô). Việc nhồi chung Rule sẽ khiến mô hình bị mâu thuẫn chỉ dẫn.
3. **Quy định Kích hoạt**: Rule chỉ được đưa vào ngữ cảnh của Project khi và chỉ khi:
   - Người dùng đã chủ động liên kết Rule đó vào Project thông qua bảng `project_rules`.
   - HOẶC Rule đó là một `System Rule` toàn cục được Quản trị viên đánh dấu là **Quy tắc An Toàn Bắt Buộc Toàn Hệ Thống** (Mandatory Global Safety Rule - ví dụ: Không tiết lộ bí mật, tuân thủ đạo đức AI).
