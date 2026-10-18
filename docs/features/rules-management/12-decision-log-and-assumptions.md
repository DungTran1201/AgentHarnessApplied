# PHẦN 12: NHẬT KÝ QUYẾT ĐỊNH, GIẢ ĐỊNH & CÂU HỎI MỞ (DECISION LOG, ASSUMPTIONS & OPEN QUESTIONS)
## Phân Hệ: Quản Lý Quy Tắc (Rules Management — Rules Library & Rule Editor)
### Dự Án: Nền Tảng Trợ Lý Ảo AI-Chan (AI-Chan Assistant Platform)

---

| Thông Tin Quản Trị | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `RUL-DOC-12` |
| **Nhánh Tính Năng** | **Rules Management (Rules Library & Rule Editor)** |
| **Trạng Thái Quản Trị** | **`PROPOSED (Chờ Duyệt Từ Architecture Board & Product Owner)`** |
| **Phiên Bản** | `1.0.0-PROPOSAL` |
| **Ngày Ban Hành** | `2026-10-18` |
| **Tác Giả / Vai Trò** | Senior Solution Architect & Business Analyst |

---

## 1. Nhật Ký Quyết Định Kiến Trúc (Architecture Decision Log — `DEC-RUL-###`)

| Mã Quyết Định | Tên Vấn Đề Quyết Định | Các Phương Án Cân Nhắc | Phương Án Được Chọn | Cơ Sở & Lý Lẽ Nghiệp Vụ / Kỹ Thuật (Rationale) | Đánh Đổi & Hệ Quả (Trade-offs) | Trạng Thái |
| :---: | :--- | :--- | :---: | :--- | :--- | :---: |
| **DEC-RUL-001** | **Ranh giới phân hệ: Tách rời CRUD Thư viện và Runtime Chat Engine** | **Option A**: Triển khai đồng thời cả Thư viện UI và sửa đổi luồng Chat Runner trong `chat_service.py`.<br>**Option B**: Chỉ tập trung đặc tả & xây dựng Thư viện Quản lý (Rules Library & Editor), để ngỏ module Runtime cho giai đoạn tiếp theo. | **Option B** | Phân rã theo ranh giới an toàn: Luồng Chat Runtime hiện tại đang có tính ổn định cao và phức tạp. Việc triển khai Thư viện trước giúp người dùng có nơi tích lũy dữ liệu quy tắc chuẩn hóa, đồng thời không gây rủi ro hồi quy (Regression) làm gián đoạn tính năng Chatbot cốt lõi. | Người dùng chưa thấy quy tắc tác động trực tiếp ngay vào câu trả lời của Chatbot cho đến khi Runtime Resolver hoàn tất. | `Approved by Architect` |
| **DEC-RUL-002** | **Cơ chế lưu trữ: Cơ sở dữ liệu quan hệ (PostgreSQL) vs Hệ thống tệp tin (.md files)** | **Option A**: Đọc và ghi trực tiếp các tệp `.md` trong thư mục `.agents/rules/` của server.<br>**Option B**: Lưu trữ hoàn toàn trong bảng CSDL `rules` (PostgreSQL) kèm metadata cấu trúc.<br>**Option C**: Hybrid (Đồng bộ 2 chiều CSDL và File). | **Option B** | AI-Chan là ứng dụng Web đa người dùng (Multi-tenant SaaS architecture). Lưu trữ tệp tin dễ dẫn đến xung đột ghi đồng thời, lỗ hổng Path Traversal, khó khăn trong việc phân quyền người dùng và không thể truy vấn/phân trang hiệu quả với hàng ngàn bản ghi. Bảng PostgreSQL với JSONB metadata là giải pháp chuẩn mực. | Chưa hỗ trợ tự động sửa file trên ổ đĩa; cần thêm tính năng Export nếu muốn xuất ra file `.md`. | `Approved by Architect` |
| **DEC-RUL-003** | **Chính sách xóa: Xóa mềm (Soft Delete) vs Xóa vĩnh viễn (Hard Delete)** | **Option A**: Xóa cứng khỏi CSDL (`DELETE FROM rules`).<br>**Option B**: Xóa mềm (`deleted_at = NOW()`, `status = 'archived'`). | **Option B** | Rule thường được liên kết với nhiều Project lịch sử. Xóa cứng sẽ làm gãy các ràng buộc khóa ngoại hoặc mất dấu vết kiểm toán của các phiên chat đã diễn ra trong quá khứ. Xóa mềm bảo toàn tính toàn vẹn lịch sử 100%. | Dung lượng CSDL tích lũy theo thời gian; cần có cơ chế dọn dẹp định kỳ (Vacuum/Purge) sau 90 ngày nếu người dùng yêu cầu. | `Approved by Architect` |
| **DEC-RUL-004** | **Giới hạn độ dài nội dung quy tắc (Content Length Limit)** | **Option A**: Không giới hạn (TEXT vô tận).<br>**Option B**: 2.000 ký tự.<br>**Option C**: 10.000 ký tự (~2.500 từ).<br>**Option D**: 50.000 ký tự. | **Option C (10.000 ký tự)** | 10.000 ký tự là độ dài lý tưởng để chứa các bộ quy ước lập trình hoặc tài liệu kiến trúc chuyên sâu mà không làm cạn kiệt cửa sổ ngữ cảnh (Context Window) của các mô hình LLM hiện đại. Đồng thời ngăn chặn tấn công DoS tràn bộ nhớ. | Cần có bộ đếm ký tự hiển thị trực quan theo thời gian thực trên UI. | `Approved by Architect` |
| **DEC-RUL-005** | **Chính sách kiểm soát xung đột ghi đè đồng thời** | **Option A**: Last-write-wins (Ghi đè không kiểm tra).<br>**Option B**: Optimistic Concurrency Control (Kiểm tra version).<br>**Option C**: Pessimistic Locking (Khóa dòng trong CSDL). | **Option B** | Giao diện Web có thể được mở trên nhiều tab hoặc nhiều thiết bị cùng lúc. Optimistic Concurrency qua trường `version` là giải pháp nhẹ nhàng, không gây nghẽn database connections và cảnh báo kịp thời cho người dùng khi có nguy cơ mất mát dữ liệu. | Client phải gửi kèm `version` trong payload `PUT`. | `Approved by Architect` |
| **DEC-RUL-006** | **Ngăn chặn nhồi nhét tự động vào mọi Project (No Auto-Global Ingestion)** | **Option A**: Mọi Rule trong thư viện cá nhân tự động được chèn vào mọi Project của người dùng đó.<br>**Option B**: Rule chỉ được áp dụng khi được liên kết tường minh qua bảng `project_rules` (hoặc là System Mandatory Rule). | **Option B** | Tránh ô nhiễm ngữ cảnh (Context Pollution), bảo vệ hạn ngạch token và ngăn chặn các xung đột hành vi ngoài ý muốn giữa các dự án khác nhau (ví dụ: dự án Python và dự án C++). | Người dùng phải thực hiện thêm 1 thao tác tick chọn Rule khi cấu hình Project. | `Approved by Architect` |
| **DEC-RUL-007** | **Quyền quản trị đối với System Rules** | **Option A**: Cho phép người dùng bình thường chỉnh sửa trực tiếp System Rules.<br>**Option B**: System Rules là tài nguyên CHỈ ĐỌC (Read-Only) đối với người dùng thông thường; chỉ Quản trị viên (Admin) mới có quyền sửa/xóa. Người dùng muốn sửa phải sử dụng tính năng "Nhân bản" (Clone). | **Option B** | Bảo vệ các tiêu chuẩn cốt lõi của nền tảng; ngăn chặn việc một người dùng làm hỏng quy tắc chung của toàn bộ hệ sinh thái. | Người dùng phải clone ra bản sao cá nhân nếu muốn điều chỉnh theo ý mình. | `Approved by Architect` |
| **DEC-RUL-008** | **Chuẩn hóa chế độ kích hoạt theo tiêu chuẩn Antigravity** | **Option A**: Chỉ hỗ trợ bật/tắt đơn giản (`always_on`).<br>**Option B**: Kế thừa 4 chế độ chuẩn của Google Antigravity: `always_on`, `model_decision`, `glob`, `manual`. | **Option B** | Đảm bảo tính tương thích và khả năng mở rộng tối đa cho các công cụ AI tương lai; hỗ trợ tối ưu hóa chi phí token qua cơ chế Khai phá lũy tiến (Progressive Disclosure). | Schema cần thêm trường `glob_patterns` dạng JSONB và validate logic phức tạp hơn. | `Approved by Architect` |

---

## 2. Bảng Phân Định Sự Thật & Giả Định (Fact vs Assumption Register)

| Nhóm | Mã Định Danh | Nội Dung Dữ Kiện | Cơ Sở Xác Minh |
| :---: | :---: | :--- | :--- |
| **FACT** | `FACT-RUL-01` | Repository hiện tại hoàn toàn chưa có router `/rules`, bảng CSDL `rules` hay giao diện thư viện Rules. | Kiểm tra cây thư mục `ai-backend`, `ai-frontend` và migrations từ 001 đến 016. |
| **FACT** | `FACT-RUL-02` | Thư mục `.agents/rules/*.md` đang hoạt động tốt cho Agent Antigravity host IDE, sử dụng cấu trúc YAML frontmatter. | Đọc trực tiếp các tệp `core.md`, `change-lifecycle.md`, `ponytail.md`. |
| **FACT** | `FACT-RUL-03` | Luồng Chatbot hiện tại chỉ nạp System Prompts và Tools vào prompt; chưa có module nạp Rules. | Rà soát `ai-backend/app/services/chat_service.py`. |
| **ASSUMPTION** | `ASSUMP-RUL-01` | Người dùng AI-Chan mong muốn một giao diện Web trực quan để quản lý các quy tắc thay vì phải viết file Markdown thủ công. | Nhu cầu người dùng được mô tả trong Prompt đặc tả tính năng. |
| **ASSUMPTION** | `ASSUMP-RUL-02` | Các dự án trong AI-Chan có nhu cầu áp dụng các tập hợp quy tắc khác nhau tùy theo ngôn ngữ và mục đích. | Phù hợp với kiến trúc Project-based của AI-Chan. |

---

## 3. Danh Mục Câu Hỏi Mở Cần Xác Nhận (Open Questions — `OQ-RUL-###`)

| Mã Câu Hỏi | Nội Dung Vấn Đề Cần Ban Quản Trị / PO Xác Nhận | Đề Xuất Của Solution Architect | Quyết Định / Ý Kiến Của PO |
| :---: | :--- | :--- | :---: |
| **OQ-RUL-01** | Khi xóa mềm một Rule đang có Project sử dụng, hệ thống nên gỡ liên kết tự động (Cascade Detach) hay chuyển Rule sang trạng thái `Archived` và vẫn cho phép Project cũ đọc bản chụp lịch sử? | **Đề xuất**: Chuyển Rule sang `archived` và cập nhật `is_enabled = false` trong `project_rules`. Khi mở Project, hiển thị cảnh báo nhỏ: *"Quy tắc [Tên] đã bị lưu trữ"*. | `Chờ PO phê duyệt` |
| **OQ-RUL-02** | Có nên bổ sung nút "Import từ thư mục `.agents/rules/`" ngay trong trang Thư viện để nạp nhanh các quy tắc có sẵn của workspace vào database không? | **Đề xuất**: Đưa vào phạm vi Giai đoạn 2 (Post-MVP) để giữ cho phạm vi MVP tinh gọn, tập trung hoàn thiện giao diện CRUD và API chuẩn. | `Đồng thuận` |
| **OQ-RUL-03** | Có giới hạn số lượng Rules tối đa mà một người dùng thông thường được tạo không? | **Đề xuất**: Giới hạn tối đa **100 Rules** cho mỗi tài khoản thông thường để tránh lạm dụng CSDL; tài khoản Pro/Enterprise không giới hạn. | `Chờ PO phê duyệt` |
| **OQ-RUL-04** | Khi hiển thị danh sách Rules, có nên hỗ trợ xem trước nội dung Markdown dạng popover khi hover chuột vào thẻ không? | **Đề xuất**: Có, hỗ trợ tooltip/popover hiển thị 200 ký tự đầu tiên để người dùng nắm nhanh nội dung mà không cần mở trang chi tiết. | `Đồng thuận` |

---

## 4. Bảng Tra Cứu Tài Liệu Tham Khảo (Reference Log)

| STT | Tài Liệu Tham Khảo | URL / Vị Trí | Ngày Truy Cập | Ý Nghĩa Thiết Kế Đối Với AI-Chan |
| :---: | :--- | :--- | :---: | :--- |
| **1** | Google Antigravity Rules Guide | `https://antigravity.google/docs/rules/` | `2026-10-18` | Cung cấp chuẩn kích hoạt (`always_on`, `model_decision`, `glob`, `manual`) và nguyên lý Khai phá lũy tiến (Progressive Disclosure). |
| **2** | Antigravity Rules & Workflows | `https://antigravity.google/docs/rules-workflows` | `2026-10-18` | Cơ sở phân định ranh giới giữa Rules (Passive Constraints) và Workflows/Skills (Active Procedures). |
| **3** | AI-Chan Documentation Governance | `docs/14-governance/documentation-governance.md` | `2026-10-18` | Cưỡng chế quy chuẩn tài liệu kỹ thuật, phân tách Model/Docs, mã định danh ổn định và tiêu chuẩn nghiệm thu. |
| **4** | AI-Chan System Prompt Feature | `docs/features/system-prompt-management/` | `2026-10-18` | Cung cấp mẫu thiết kế CRUD, xử lý 6 trạng thái UI, Dirty Form Guard và bảo vệ Anti-IDOR. |
| **5** | AI-Chan Tool Management Feature | `docs/features/tool-management/` | `2026-10-18` | Cung cấp mô hình Registry, PolicyGate và bảo vệ toàn vẹn tham chiếu (Delete Guard). |
