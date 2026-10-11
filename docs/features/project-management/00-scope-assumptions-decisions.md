# 00. PHẠM VI, GIẢ ĐỊNH VÀ QUYẾT ĐỊNH KIẾN TRÚC (SCOPE, ASSUMPTIONS & DECISIONS)
## Nhánh Tính Năng: Quản Lý Project (Project Management MVP)
### Hệ Thống: AI-Chan Virtual Assistant Platform

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `DOC-PRJ-00` |
| **Trạng Thái** | `PROPOSED (Chờ Duyệt Từ Product Owner)` |
| **Vai Trò Phụ Trách** | Senior Business Analyst & Solution Architect |
| **Phiên Bản** | `1.0.0-MVP` |
| **Ngày Lập** | `2026-10-11` |

---

## 1. Mục Tiêu Dự Án & Tầm Nhìn Sản Phẩm

### 1.1. Mục Tiêu Cốt Lõi
Xây dựng phân hệ **Quản lý Project (Project Management)** cho nền tảng trợ lý ảo AI-Chan. Phân hệ này biến AI-Chan từ một ứng dụng chat đơn lẻ thành một **harness linh hoạt** cho phép người dùng:
1. **Xây dựng Project bằng giao diện Node-based trực quan**: Người dùng kéo-thả các khối thành phần (Node) vào Canvas, cấu hình tham số và kết nối chúng thành một luồng xử lý (Graph).
2. **Quản trị vòng đời Project**: Lưu trữ cấu hình graph, kiểm tra tính hợp lệ (Validation), quản lý trạng thái (`active`, `stop`, `deactive`) và kiểm soát hạn ngạch dự án hoạt động đồng thời (`MAX_ACTIVE_PROJECTS`).
3. **Thực thi Chat từ Trang Chủ**: Cho phép người dùng lựa chọn một Project đang `active` ngay tại Trang Chủ để tiến hành hội thoại thời gian thực. Nội dung chat sẽ được truyền qua chuỗi xử lý: **Web Input Node → Model Node → Output Node**.

---

## 2. Ranh Giới Phạm Vi Sản Phẩm (Scope Boundaries)

### 2.1. Phạm Vi Trong MVP (In-Scope)
| Phân Hệ | Tính Năng MVP | Mô Tả Chi Tiết |
| :--- | :--- | :--- |
| **Project CRUD** | Quản lý Project cơ bản | Tạo mới project (nhập Tên, Mô tả tùy chọn), xem danh sách project, xem chi tiết, chỉnh sửa thông tin và cấu hình graph. |
| **Visual Builder** | Canvas Kéo-Thả | Canvas tương tác (Pan, Zoom, Drag-and-drop node), danh sách Node khả dụng ở thanh công cụ bên trái, bảng cấu hình chi tiết (Config Drawer/Panel) khi chọn node. |
| **Cấu Trúc Graph Tuyến Tính** | Linear 3-Node Workflow | Hỗ trợ chính xác 3 loại node cơ bản: **Web Input Node**, **Model Node**, và **Output Node** kết nối theo thứ tự tuyến tính `Web Input → Model → Output`. |
| **Model Node Integration** | Tích hợp Danh mục Model | Chọn model từ danh mục Model đã được quản lý trong hệ thống (`/api/v1/models`), cấu hình các tham số hợp lệ (`temperature`, `max_tokens`), kiểm tra trạng thái khả dụng và API Key của Provider. |
| **Web Input Node** | Cấu hình đầu vào Web | Nhận văn bản người dùng nhập từ giao diện chat, cấu hình giới hạn số từ (`max_words`), cơ chế đếm từ hỗ trợ Unicode/Tiếng Việt. |
| **Output Node** | Tiếp nhận và hiển thị phản hồi | Tiếp nhận văn bản kết quả từ Model Node và chuẩn bị dòng dữ liệu hiển thị trên giao diện chat. |
| **Vòng Đời Trạng Thái** | 3 Trạng Thái Nghiệp Vụ | Quản lý chuyển đổi trạng thái giữa `stop` (mặc định sau khi tạo/lưu), `active` (sẵn sàng chat, chiếm quota), và `deactive` (vô hiệu hóa rõ ràng). |
| **Kiểm Soát Hạn Ngạch** | Giới Hạn Project Active | Thực thi cấu hình `MAX_ACTIVE_PROJECTS` ở backend, ngăn chặn Race Condition khi kích hoạt đồng thời. |
| **Thực Thi Chat Trang Chủ** | Execution Harness | Trang chủ chỉ hiển thị các project `active`; người dùng chọn project và gửi tin nhắn, hệ thống thực thi graph và trả kết quả streaming SSE. |

### 2.2. Phạm Vi Loại Trừ Khỏi MVP (Out-of-Scope / Future Considerations)
> [!IMPORTANT]
> Toàn bộ các thành phần sau **TUYỆT ĐỐI KHÔNG ĐƯỢC ĐƯA VÀO MVP**, nhưng kiến trúc dữ liệu và API phải được thiết kế mở (Extensible) để không gây vỡ cấu trúc khi nâng cấp:
- ❌ **Prompt Template / System Prompt Node độc lập**: Trong MVP, system prompt hoặc context cố định (nếu có) được tích hợp trong cấu hình Model Node, không tạo node canvas riêng.
- ❌ **Skills / Tools / Function Calling / MCP Node**: Chưa hỗ trợ gán tools hay Model Context Protocol trong MVP.
- ❌ **Memory / Long-term Memory Node riêng**: Sử dụng cơ chế ngữ cảnh mặc định của session hội thoại hiện có.
- ❌ **RAG, Vector Database, File Embedding, Knowledge Retrieval**: Không hỗ trợ tải tài liệu hoặc nhúng vector trong MVP.
- ❌ **Workflow rẽ nhánh phức tạp**: Không hỗ trợ Router, Condition (If/Else), Loop, Parallel Branches, Subflows, Multi-agent Orchestration.
- ❌ **Web Browsing / Crawler Node**: `Web Input Node` là ô nhập liệu văn bản từ trình duyệt chat, **không phải** công cụ cào web hay gọi URL ngoài.
- ❌ **Marketplace / Template Gallery / Chia sẻ Public**: Chưa hỗ trợ chia sẻ project giữa các người dùng hoặc thư viện template mẫu.

---

## 3. Bảng Thuật Ngữ & Khái Niệm Phổ Quát (Ubiquitous Language)

| Thuật Ngữ | Tên Tiếng Anh | Định Nghĩa Trong Hệ Thống AI-Chan |
| :--- | :--- | :--- |
| **Project** | Project | Đơn vị cấu hình cấp cao nhất, đại diện cho một trợ lý ảo hoặc quy trình xử lý AI do người dùng xây dựng, chứa metadata và cấu hình Graph. |
| **Workflow / Graph** | Workflow / Graph | Cấu trúc đồ thị có hướng (Directed Graph) bao gồm tập hợp các Node và Edge xác định luồng dữ liệu xử lý. |
| **Node** | Node | Một đơn vị tính toán hoặc tương tác trong canvas. Trong MVP có 3 loại: `web_input`, `model`, `output`. |
| **Edge / Connection** | Edge / Connection | Liên kết có hướng từ cổng xuất (`source handle`) của một Node sang cổng nhập (`target handle`) của Node tiếp theo. |
| **Web Input Node** | Web Input Node | Node đầu vào nhận văn bản người dùng gõ từ giao diện Web Chat. Quy định giới hạn `max_words`. |
| **Model Node** | Model Node | Node trung gian đại diện cho Mô hình AI (LLM), tham chiếu đến Model Catalog hiện có và chứa tham số runtime (`temperature`, `max_tokens`). |
| **Output Node** | Output Node | Node đầu ra kết thúc workflow, định dạng phản hồi trả về cho người dùng. |
| **Model Catalog** | Model Catalog | Danh mục các mô hình LLM từ các nhà cung cấp (Google, OpenAI, Anthropic, Groq, Ollama) đã được hệ thống cấu hình sẵn trong bảng `models`. |
| **Trạng Thái Active** | Active State | Trạng thái project hợp lệ, sẵn sàng nhận request và xuất hiện ở danh sách chọn trên Trang Chủ. Chiếm 1 slot trong `MAX_ACTIVE_PROJECTS`. |
| **Trạng Thái Stop** | Stop State | Trạng thái tạm dừng của project; không nhận request mới từ Trang Chủ; không chiếm slot active; sẵn sàng để người dùng chỉnh sửa hoặc bật lại. |
| **Trạng Thái Deactive** | Deactive State | Trạng thái vô hiệu hóa rõ ràng; không cho phép nhận request chat; không chiếm slot active; cần người dùng kích hoạt lại có kiểm tra điều kiện. |
| **Active Quota** | Active Quota | Số lượng tối đa các Project mà một người dùng có thể giữ ở trạng thái `active` tại cùng một thời điểm (`MAX_ACTIVE_PROJECTS`). |

---

## 4. Phân Loại Dữ Liệu & Sự Thật (Facts, Assumptions & Decisions)

### 4.1. Bằng Chứng Thực Tế Đã Xác Nhận (FACTS)
1. **FACT-01**: Hệ thống AI-Chan hiện tại sử dụng cơ sở dữ liệu SQLite (`app.db`), kích hoạt `PRAGMA foreign_keys = ON`.
2. **FACT-02**: Hệ thống đã có sẵn bảng `models` quản lý các mô hình LLM (Google Gemini, OpenAI GPT, Anthropic Claude, Groq Llama, Ollama Local).
3. **FACT-03**: Xác thực người dùng thông qua JWT Bearer Token; mỗi request được phân định danh tính qua `user_id` (`src/core/security.py`).
4. **FACT-04**: Cơ chế kiểm tra API Key hiện hữu (`src/api/v1/models.py`) kiểm tra sự tồn tại của Environment Variables trên server; API không bao giờ để lộ raw API key ra client.
5. **FACT-05**: Nhánh "pipeline" trước đây đã bị gỡ hoàn toàn khỏi codebase; chưa tồn tại bảng hay endpoint nào về `projects` hay `canvas`.

### 4.2. Các Giả Định Kiểm Soát (ASSUMPTIONS)
1. **ASSUMP-01 (Mặc định trạng thái khi tạo)**: Khi người dùng tạo và lưu một project mới, project sẽ mặc định ở trạng thái `stop` để đảm bảo an toàn, tránh tự động kích hoạt chiếm quota trước khi người dùng chủ động kiểm tra.
2. **ASSUMP-02 (Hạn ngạch Active Quota)**: Mặc định mỗi người dùng được phép có tối đa `MAX_ACTIVE_PROJECTS = 3` project ở trạng thái `active` đồng thời trong MVP (có thể cấu hình qua biến môi trường).
3. **ASSUMP-03 (Chỉnh sửa khi Active)**: Khi một project đang `active`, người dùng vẫn có thể chỉnh sửa cấu hình graph. Tuy nhiên, việc lưu thay đổi sẽ tự động validate lại graph; nếu graph không hợp lệ, hệ thống từ chối lưu hoặc hạ trạng thái về `stop` kèm cảnh báo.
4. **ASSUMP-04 (Xử lý request đang chạy khi project bị dừng)**: Khi một project chuyển từ `active` sang `stop` hoặc `deactive`, các request chat SSE đang streaming dở dang sẽ được phép hoàn tất tự nhiên (Drain in-flight requests), nhưng mọi request mới tiếp theo sẽ bị từ chối ngay lập tức (HTTP 409 Conflict hoặc 400 Bad Request).
5. **ASSUMP-05 (Quy tắc đếm từ tiếng Việt/Unicode)**: `max_words` được tính bằng cách tách chuỗi theo khoảng trắng Unicode (`\s+`), loại bỏ các ký tự điều khiển, phù hợp với tiếng Việt và tiếng Anh mà không cần thư viện NLP nặng nề.

### 4.3. Nhật Ký Quyết Định Nghiệp Vụ & Kiến Trúc (Decision Log)

| Decision ID | Vấn Đề Cần Quyết Định | Các Phương Án Xem Xét | Đề Xuất Lựa Chọn | Cơ Sở / Lý Do Kỹ Thuật | Tác Động / Rủi Ro | Trạng Thái |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DEC-PRJ-01** | Thư viện Canvas trên Frontend | **Option A**: Tự viết SVG/Canvas thuần.<br>**Option B**: Dùng `@xyflow/react` (React Flow v12).<br>**Option C**: Dùng thư viện diagram cồng kềnh (GoJS, JointJS). | **Chọn Option B: `@xyflow/react`** | Chuẩn công nghiệp, nhẹ, hỗ trợ TypeScript, React 19 / Next.js, license MIT, hỗ trợ custom node và handle validation mạnh mẽ. | Cần thêm 1 dependency frontend khi implement (`@xyflow/react`). | `PROPOSED` |
| **DEC-PRJ-02** | Cơ chế lưu trữ Graph trong Database | **Option A**: Chuẩn hóa thành nhiều bảng (`nodes`, `edges`, `ports`).<br>**Option B**: Lưu cấu trúc graph dạng JSON trong bảng `projects` + bảng metadata quan hệ.<br>**Option C**: Document database riêng. | **Chọn Option B: Bảng `projects` chứa cột `graph_data JSON`** | SQLite hỗ trợ JSON1 extension nguyên bản. Cấu trúc graph của MVP nhỏ (chỉ 3 node), lưu JSON giúp thao tác Save/Load nguyên khối (Atomic Save), tránh N+1 query và foreign key deadlock. | Cần JSON schema validation chặt chẽ ở backend trước khi lưu. | `PROPOSED` |
| **DEC-PRJ-03** | Cơ chế kiểm soát Active Quota khi Concurrent Requests | **Option A**: Đếm số lượng ở frontend.<br>**Option B**: Đếm thông thường ở backend (`SELECT COUNT(*) ...`).<br>**Option C**: Database Transaction với Exclusive Lock / Atomic Conditional Update. | **Chọn Option C: Atomic Check & Conditional State Update trong Transaction** | Tránh Race Condition khi người dùng mở 2 tab và kích hoạt 2 project cùng lúc khi chỉ còn 1 slot trống. | Cần dùng SQLite transaction `BEGIN IMMEDIATE` hoặc câu lệnh UPDATE có điều kiện `WHERE (SELECT COUNT(*) FROM projects WHERE user_id = :u AND status = 'ACTIVE') < :limit`. | `PROPOSED` |
| **DEC-PRJ-04** | Quyền Xóa Project trong MVP | **Option A**: Cho phép Xóa vĩnh viễn (Hard Delete).<br>**Option B**: Soft Delete (`is_deleted` hoặc trạng thái `ARCHIVED`).<br>**Option C**: Không cho xóa trong MVP. | **Chọn Option B: Cho phép Soft Delete / Trạng thái DELETED** | Người dùng cần dọn dẹp các project thử nghiệm để không bị rối mắt. Khi xóa, nếu project đang `active`, hệ thống tự động giải phóng slot quota. | Cần lọc bỏ các project đã xóa trong danh sách hiển thị. | `PROPOSED` |
| **DEC-PRJ-05** | Quan hệ giữa Project và Conversation/Chat | **Option A**: Mỗi Project sở hữu riêng danh sách Conversation.<br>**Option B**: Conversation hiện có lưu thêm `project_id` (nullable).<br>**Option C**: Không lưu lịch sử chat của Project trong MVP. | **Chọn Option B: Bổ sung `project_id` vào bảng `conversations`** | Tái sử dụng 100% hạ tầng hội thoại, streaming SSE và UI Chat hiện hữu của AI-Chan, chỉ cần liên kết thêm ngữ cảnh Project đang chạy. | Cần migration bổ sung cột `project_id` tham chiếu `projects(id)` khi triển khai. | `PROPOSED` |
| **DEC-PRJ-06** | Xác thực tài khoản khi tạo và trải nghiệm Project | **Option A**: Bắt buộc đăng nhập tài khoản trước (Strict Auth).<br>**Option B**: Cho phép tạo và trải nghiệm Project không cần đăng nhập (Guest Mode). | **Chọn Option B: Gỡ bỏ bắt buộc xác thực khi tạo project** | Tối ưu trải nghiệm cho khách vãng lai dùng thử demo sản phẩm trực tiếp. Tự động gán tài khoản khách `guest_user` nếu chưa đăng nhập, hoặc gắn vào tài khoản cá nhân nếu có token. | Cần cơ chế fallback `guest_user` an toàn trong DB và API. | `APPROVED` |

---

## 5. Ranh Giới Giữa Các Bounded Contexts

```mermaid
flowchart TD
    subgraph IdentityContext["Identity & Access Context"]
        User["User (Account)"]
        Auth["JWT Security & Ownership"]
    end

    subgraph ProjectContext["Project Management Context (MỚI)"]
        Project["Project (Aggregate Root)"]
        Graph["Workflow Graph (JSON Snapshot)"]
        NodeConfig["Node Configurations (Input/Model/Output)"]
        QuotaMgr["Active Quota Enforcement"]
    end

    subgraph CatalogContext["Model Catalog Context (Hiện Có)"]
        Model["Model Entity (id, provider, max_tokens)"]
        Provider["Provider Secrets & Key Health Check"]
    end

    subgraph ChatContext["Chat & Conversation Context (Hiện Có)"]
        Conversation["Conversation (Linked to Project)"]
        Message["Message Stream (SSE Execution)"]
    end

    User -->|Sở hữu 1..N| Project
    Auth -->|Kiểm tra quyền truy cập Anti-IDOR| Project
    Project *--|Chứa 1..1| Graph
    Graph *--|Bao gồm 3 Node| NodeConfig
    NodeConfig -->|Tham chiếu model_id| Model
    QuotaMgr -->|Giới hạn MAX_ACTIVE_PROJECTS| Project
    Project -->|Được chọn để thực thi| Conversation
    Conversation *--|Chứa 1..N| Message
```

---

## 6. Danh Sách Câu Hỏi Cần Product Owner / Stakeholder Xác Nhận

| Mã Câu Hỏi | Nội Dung Câu Hỏi | Đề Xuất Của Đội Ngũ Kỹ Thuật | Mức Độ Ảnh Hưởng |
| :--- | :--- | :--- | :--- |
| **Q-PRJ-01** | Giá trị mặc định của `MAX_ACTIVE_PROJECTS` trên mỗi tài khoản người dùng nên là bao nhiêu? | Đề xuất giá trị mặc định là **3**, cấu hình qua file `.env` (`MAX_ACTIVE_PROJECTS=3`). | Trung bình (Tài nguyên server & UX) |
| **Q-PRJ-02** | Khi người dùng xóa một Project đang có các cuộc trò chuyện (Conversations) cũ, nên giữ lại lịch sử chat hay xóa kèm (Cascade)? | Đề xuất: **Giữ lại lịch sử chat**, chỉ đánh dấu `project_id = NULL` hoặc ghi nhận project đã bị xóa, để người dùng vẫn đọc lại được tin nhắn đã trao đổi trước đó. | Thấp (Bảo toàn dữ liệu người dùng) |
| **Q-PRJ-03** | Có cho phép một Project `active` được chọn chat bởi người dùng khác không? | Trong MVP, **chỉ chủ sở hữu (Owner)** mới được thấy và chat với project của mình (Private Projects). Chưa hỗ trợ phân quyền cộng tác hoặc Public Marketplace. | Cao (Bảo mật & Quyền riêng tư) |
