# ADR-006 — Kiến Trúc Quản Lý Vòng Đời & Danh Mục Mô Hình Agent Đa Nhà Cung Cấp Với Cơ Chế Kích Hoạt / Hủy Kích Hoạt

Status: APPROVED

## Context
Sau khi triển khai LangChain & LangGraph (`ADR-005`), hệ thống AI-Chan có khả năng tương tác với nhiều nhà cung cấp AI (Google Gemini, Anthropic Claude, OpenAI, Groq, Ollama). 

Tuy nhiên, hệ thống cần cơ chế quản trị tập trung danh mục các mô hình và agent:
1. Người dùng cần xem danh mục các mô hình được hỗ trợ, năng lực (context window, max tokens), trạng thái khả dụng và độ trễ phản hồi.
2. Cần cơ chế kiểm tra kết nối (Ping / Health Check) trực tiếp với nhà cung cấp bằng khóa API từ file `.env` trước khi sử dụng.
3. Cần kiểm soát việc kích hoạt (`activate`) và hủy kích hoạt (`deactivate`) các mô hình mà **không áp dụng thao tác xóa cứng (Physical Deletion)**. Điều này nhằm bảo toàn tính toàn vẹn tham chiếu của các tin nhắn lịch sử (`model_used`) và cho phép bật lại bất cứ lúc nào khi khóa API được gia hạn hoặc bổ sung.
4. Cần đảm bảo hệ thống luôn có ít nhất một mô hình ở trạng thái hoạt động làm mô hình mặc định.

## Decision
Xây dựng phân hệ **Multi-Provider Agent Model Manager** tại tầng Backend với các quyết định kiến trúc:

1. **Chính Sách Vòng Đời Quản Trị Bằng Trạng Thái (Soft State Lifecycle - Không Xóa Cứng)**:
   - Nghiêm cấm hoàn toàn thao tác xóa vật lý (Hard DELETE) đối với các thực thể mô hình trong danh mục (`BR-012`).
   - Mọi thao tác quản lý trạng thái được điều khiển thông qua hai hành động:
     - `activate`: Chuyển trạng thái mô hình sang `ACTIVE`, đưa vào danh sách hiển thị và chuỗi định tuyến đàm thoại.
     - `deactivate`: Chuyển trạng thái mô hình sang `INACTIVE`, ẩn khỏi giao diện chọn lựa của người dùng và loại khỏi chuỗi định tuyến.
   - Trạng thái `DEGRADED`: Tự động gán khi mô hình gặp lỗi kết nối hoặc cạn hạn ngạch (429/503) liên tiếp trong quá trình vận hành (`BR-015`).

2. **Cơ Chế Kiểm Tra Sức Khỏe Kết Nối (Connection Health Check & Latency Ping)**:
   - Điểm cuối `POST /api/v1/models/{model_id}/test` thực hiện gửi một prompt kiểm thử siêu nhẹ (ví dụ: token "ping" hoặc max_tokens=5) tới adapter tương ứng trong LangChain.
   - Đo lường và cập nhật chỉ số thời gian phản hồi `latency_ms` và thời điểm kiểm tra `last_checked_at`.
   - Trước khi thực hiện `activate` một mô hình, hệ thống bắt buộc kiểm tra xem khóa API tương ứng trong `.env` có tồn tại và hợp lệ không (`BR-014`).

3. **Bất Biến Mô Hình Mặc Định (Default Active Model Invariant)**:
   - Luôn duy trì trường `is_default = true` cho chính xác một mô hình đang ở trạng thái `ACTIVE` (`BR-013`).
   - Ngăn chặn thao tác `deactivate` đối với mô hình đang là mặc định, trừ khi người dùng đã chuyển đổi mô hình mặc định sang một mô hình `ACTIVE` khác.

4. **Tích Hợp Với LangGraph Orchestrator**:
   - Bộ điều phối `ChatAgentOrchestrator` chỉ nạp các mô hình có `status = ACTIVE` vào danh sách ứng viên định tuyến và chuỗi chuyển vùng dự phòng (Failover Precedence).

## Alternatives
1. *Cho phép xóa cứng (Hard Delete) mô hình khỏi database*: Gây lỗi toàn vẹn dữ liệu (Broken Foreign Key / Missing Reference) khi các tin nhắn cũ trong bảng `messages` truy vấn trường `model_used`.
2. *Chỉ đọc trực tiếp danh sách cứng từ file cấu hình tĩnh không có API quản trị*: Thiếu linh hoạt, người dùng không thể kiểm tra độ trễ thực tế, không thể chủ động bật/tắt các mô hình khi nhà cung cấp bảo trì.

## Rationale
- Quản trị qua trạng thái `ACTIVE`/`INACTIVE` loại bỏ hoàn toàn rủi ro mất mát dữ liệu lịch sử và tuân thủ nguyên tắc thiết kế bất biến.
- Kiểm tra sức khỏe kết nối trước khi kích hoạt giúp phát hiện sớm các sự cố sai khóa hoặc hết hạn ngạch mà không làm ảnh hưởng đến trải nghiệm người dùng trong luồng chat.
- Duy trì bất biến mô hình mặc định đảm bảo hệ thống không bao giờ rơi vào trạng thái "không có AI nào phục vụ".

## Consequences
- Bổ sung thực thể miền `AgentModel` vào mô hình dữ liệu (`models/domain/domain.yaml`).
- Bổ sung các điểm cuối API: `GET /models`, `GET /models/{id}`, `POST /models/{id}/test`, `PATCH /models/{id}/activate`, `PATCH /models/{id}/deactivate`, `PATCH /models/default`.
- Bổ sung máy trạng thái `STATE-004` và sơ đồ tương tác `SEQ-005`.

## Traceability & Related Requirements
`FR-021`, `FR-022`, `FR-023`, `FR-024`, `FR-025`, `FR-026`, `BR-012`, `BR-013`, `BR-014`, `BR-015`, `PROC-013`, `UC-016`, `UC-017`, `UC-018`, `UC-019`, `UC-020`, `STATE-004`, `SEQ-005`, `ADR-003`, `ADR-005`.
