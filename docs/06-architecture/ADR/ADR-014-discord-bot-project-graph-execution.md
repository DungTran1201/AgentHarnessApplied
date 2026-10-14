# Bản Ghi Quyết Định Kiến Trúc (Architectural Decision Record)
## ADR-014: Kiến Trúc Xử Lý Thông Điệp Discord Đầu-Cuối Qua Đồ Thị Dự Án AI-Chan, Định Tuyến Xác Định & Điều Phối Mô Hình/Kỹ Năng

---

| Thông Tin Quản Trị | Chi Tiết |
| :--- | :--- |
| **Mã Quyết Định** | `ADR-014` |
| **Tiêu Đề** | End-to-End Discord Message Processing Through AI-Chan Project Graphs, Deterministic Routing & Model/Skill Orchestration |
| **Trạng Thái** | **APPROVED** |
| **Ngày Phê Duyệt** | 2026-10-14 |
| **Tác Giả** | Principal Fullstack Engineer, AI Orchestration Engineer, Discord Integration Engineer & Backend Architect |
| **Phạm Vi Kỹ Thuật** | Discord Bot Runtime, Project Graph Resolution, Active Verification, Model-Bot-Skill Cardinality, Multi-turn History Context, Markdown Code Fence Chunker, Multi-Project Isolation |
| **Truy Vết Yêu Cầu** | `FR-057`, `BR-036`, `BR-037`, `BR-038`, `BR-039`, `SEC-013`, `SEC-014`, `SEQ-012`, `ADR-012` |

---

## 1. Ngữ Cảnh & Vấn Đề Đặt Ra (Context & Problem Statement)

Sau khi tích hợp Discord Bot trực tiếp vào mã nguồn AI-Chan (`CR-011`, `ADR-012`), hệ thống cần vận hành luồng tương tác thực tế đầu-cuối: người dùng Discord gửi lệnh `/ask` đến Bot, AI-Chan nhận diện Bot, định tuyến đến Project tương ứng, kiểm tra trạng thái hoạt động (Active), trích xuất cấu hình Model và Skills gắn trên Đồ thị Dự án (Project Graph Canvas), gọi LLM thông qua tầng điều phối hiện hữu (`chat_agent.astream_agent`), và phản hồi câu trả lời về chính tương tác Discord ban đầu.

Các thách thức kỹ thuật trọng yếu được giải quyết:
1. **Định tuyến xác định (Deterministic Routing)**: Tránh suy đoán Project tùy tiện từ tên hiển thị hoặc thời gian cập nhật gần nhất. Yêu cầu ánh xạ tất định từ Bot / Guild ID đến duy nhất một Project hợp lệ. Nếu phát hiện xung đột hoặc lộ trình mơ hồ (>1 active project cho cùng bot), phải từ chối rõ ràng bằng mã HTTP 400.
2. **Kiểm tra trạng thái kích hoạt (Active Invariant)**: Dự án ở trạng thái `STOP` (không hoạt động) hoặc đồ thị bị lỗi/chưa cấu hình Model không được phép kích hoạt suy luận LLM lãng phí chi phí.
3. **Bảo toàn ràng buộc đồ thị (Graph Cardinality Invariant)**: Đảm bảo một Model chỉ kết nối tối đa 0..1 Bot, và kết nối với 0..N Kỹ năng (Skill) hợp lệ.
4. **Cô lập ngữ cảnh & Lịch sử hội thoại (Conversation Isolation & Contextual Memory)**: Hội thoại giữa các Project và các máy chủ khác nhau không được phép rò rỉ. Mỗi phiên hội thoại lưu trữ các lượt trao đổi vào CSDL và truyền lịch sử gần nhất vào Agent để hỗ trợ đàm thoại đa lượt (multi-turn).
5. **Đóng gói định dạng Markdown & Phân mảnh an toàn (Code-Block Fence Safe Chunking)**: Giới hạn độ dài tin nhắn/embed của Discord (2000-4000 ký tự) có thể cắt ngang các khối code markdown (```), gây vỡ giao diện trên Discord. Cần giải pháp tự động đóng fence ở chunk trước và mở lại fence ở chunk kế tiếp.

---

## 2. Các Quyết Định Kiến Trúc Then Chốt (Key Architectural Decisions)

### 2.1 Định Tuyến Xác Định Từ Discord Interaction Đến Project (`BR-038`)
Tại `ai-backend/src/api/v1/bot.py` (`execute_antigravity_prompt`):
- Hệ thống ưu tiên giải quyết theo `explicit_project_id` nếu được truyền trong request.
- Nếu không có `explicit_project_id`, hệ thống tra cứu bảng `discord_bot_configs` dựa theo `guild_id` và `bot_id`.
- Hệ thống lọc danh sách dự án của chủ sở hữu Bot có trạng thái `status != 'STOP'`.
- **Chốt chặn mơ hồ (Ambiguity Guard)**: Nếu tìm thấy nhiều hơn 1 Project đang active gán với cùng cấu hình Bot, API từ chối với HTTP 400 Bad Request yêu cầu chỉ định rõ `project_id`.

### 2.2 Ràng Buộc Trạng Thái Hoạt Động Của Dự Án (`BR-039`)
- Trước khi thực thi bất kỳ bước nào trên đồ thị, Backend kiểm tra cờ trạng thái `project.status`.
- Nếu `project.status == 'STOP'`, Backend từ chối ngay lập tức với HTTP 400:
  `"The assigned project is currently inactive (STOP). Please activate the project in AI-Chan before executing bot workflows."`
- Tuyệt đối không tự động kích hoạt (auto-activate) dự án chỉ vì có tin nhắn gửi tới từ Discord.

### 2.3 Giải Quyết Quan Hệ Đồ Thị Model - Bot - Skill (`BR-036`, `BR-037`)
- Backend tải snapshot cấu hình đồ thị `canvas_data` đã lưu trong `project.canvas_data`.
- Duyệt danh sách các cạnh (edges) để tìm Model kết nối với Bot (hỗ trợ cả chiều thuận `source=model, target=bot` lẫn chiều ngược `source=bot, target=model`).
- Kiểm tra tính hợp lệ:
  - Nếu Model kết nối nhiều hơn 1 Bot: từ chối do vi phạm quy tắc 0..1 Bot (`BR-036`).
  - Nếu đồ thị không có Model nào kết nối với Bot: từ chối với thông báo hướng dẫn cấu hình node.
  - Thu thập danh sách duy nhất các Skill nodes kết nối vào Model (`BR-037`).
- Trích xuất cấu hình provider, model identifier, system prompt và nhiệt độ (`temperature`) trực tiếp từ dữ liệu node Model để chuyển giao cho tầng điều phối.

### 2.4 Trí Nhớ Hội Thoại Đa Lượt & Cô Lập Ngữ Cảnh (`SEC-014`)
- Backend tạo hoặc lấy `conversation_id` duy nhất dựa theo bộ ba `(user_id, project_id, title)`.
- Trước khi gọi LLM, truy vấn tối đa 10 tin nhắn gần nhất từ bảng `messages` thuộc `conversation_id` này.
- Chuyển đổi thành cấu trúc `ChatMessage(role, content)` và truyền vào tham số `history` của `chat_agent.astream_agent`.
- Sau khi LLM sinh câu trả lời thành công, ghi nhận cả câu hỏi của người dùng và câu trả lời của trợ lý vào bảng `messages` để duy trì liên tục cho các lượt chat tiếp theo.

### 2.5 Phân Mảnh Markdown An Toàn Cho Discord Embed (`split_discord_message`)
Tại `ai-backend/src/discord_bot/utils.py` và `cogs/ask.py`:
- Thuật toán `split_discord_message(content, max_chunk_size=3900)` duyệt qua từng dòng văn bản:
  - Theo dõi trạng thái đang nằm trong khối mã (code block) bằng cách đếm dấu mở/đóng ` ``` `.
  - Khi kích thước chunk đạt ngưỡng an toàn (3900 ký tự để không vượt quá trần 4096 ký tự của Discord Embed Description), tiến hành cắt chunk tại vị trí kết thúc dòng hoặc khoảng trắng.
  - Nếu điểm cắt rơi vào giữa khối code, thuật toán tự động thêm ` ``` ` vào cuối chunk hiện tại và chèn ` ```<language> ` vào đầu chunk tiếp theo.
- Cog Discord (`cogs/ask.py`) gửi Chunk 1 qua phản hồi chính (`interaction.followup.send`) và các Chunk tiếp theo tuần tự dưới dạng Followup Embed với tiêu đề `Part X/Y`.

---

## 3. Hậu Quả & Đánh Giá (Consequences & Assessment)

### Điểm Tích Cực
- **Độ tin cậy cao**: Loại bỏ hoàn toàn hành vi đoán ngẫu nhiên dự án; kiểm tra nghiêm ngặt tính sẵn sàng trước khi thực thi.
- **Tiết kiệm tài nguyên**: Ngăn chặn gọi API LLM tốn phí đối với các dự án đang tạm dừng hoặc đồ thị không hợp lệ.
- **Trải nghiệm đàm thoại liền mạch**: Người dùng Discord có thể hỏi tiếp nối các câu hỏi trước nhờ cơ chế nạp lịch sử đa lượt tự động.
- **Giao diện Discord thẩm mỹ**: Các đoạn mã nguồn dài từ LLM được hiển thị hoàn chỉnh, không bị vỡ cú pháp highlight cú pháp trên Discord.

### Ràng Buộc & Lưu Ý
- Cơ chế phân mảnh yêu cầu xử lý bất đồng bộ tuần tự để đảm bảo thứ tự các Part hiển thị chính xác trên kênh Discord.
- Tương tác Discord cần được xác nhận bằng `defer(thinking=True)` trong vòng 3 giây để tránh bị Discord Gateway hủy tương tác (Interaction Token Timeout).
