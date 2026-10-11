# ADR-008 — Kiến Trúc Thu Thập Tài Nguyên, Phát Luồng Telemetry & Dashboard Thời Gian Thực (Real-Time Resource Telemetry & Dashboard Architecture)

Status: APPROVED

## Context
Hệ thống AI-Chan tích hợp nhiều mô hình ngôn ngữ lớn (LLM) và cung cấp khả năng đàm thoại dạng luồng (Streaming). Việc sử dụng các mô hình này phát sinh chi phí tính toán theo token, chịu ảnh hưởng bởi độ trễ mạng và thời gian phản hồi của nhà cung cấp AI bên ngoài, cũng như nguy cơ cạn kiệt tài nguyên nếu người dùng lạm dụng gửi yêu cầu dồn dập.
Để duy trì độ tin cậy và minh bạch, hệ thống cần:
1. Thu thập tự động các chỉ số đo lường hiệu năng: Độ trễ toàn trình (`latency_ms`), thời gian nhận token đầu tiên (`ttft_ms`), số lượng token (Prompt, Completion, Total) và mã trạng thái HTTP (`status_code`).
2. Quản lý hạn ngạch người dùng (User Quota) hằng ngày, phát cảnh báo khi gần hết và áp dụng cơ chế điều tiết lưu lượng (Rate limiting / Throttling).
3. Trực quan hóa toàn bộ số liệu này trên màn hình Dashboard thời gian thực mà không gây quá tải cho máy chủ hay làm tăng độ trễ của luồng trò chuyện chính.

## Decision
Áp dụng kiến trúc **Non-blocking Telemetry Interception Middleware kết hợp In-Memory Ring Buffer và Server-Sent Events (SSE) Stream**:

1. **Tầng Thu thập & Đo lường (Telemetry Middleware & Streaming Hook)**:
   - Một Middleware chuyên trách tại FastAPI chặn bắt mọi HTTP request để đo lường thời gian xử lý toàn trình với độ trễ overhead cực thấp (< 5ms, `NFR-020`).
   - Đối với các yêu cầu chat streaming (`/chat/conversations/{conv_id}/stream`), bộ xử lý streaming hook ghi nhận thời điểm chunk đầu tiên được sinh ra để tính toán chính xác `ttft_ms`, đồng thời tích lũy token tiêu thụ từ LangGraph/LLM metadata.
   - Bản ghi đo lường được lưu trữ vào bảng `api_metric_logs` trong cơ sở dữ liệu (`FR-029`, `FR-030`, `FR-031`, `BR-019`).

2. **Tầng Kiểm soát Hạn ngạch (Quota Evaluator & Rate Guard)**:
   - Mỗi người dùng được quản lý hạn ngạch hằng ngày trong bảng `user_quotas`.
   - Trước khi gửi yêu cầu tới LLM, hệ thống kiểm tra số token khả dụng. Nếu chạm 80%, hệ thống chuyển trạng thái cảnh báo `WARNING_80`. Nếu vượt 100%, hệ thống từ chối thực thi và trả về mã HTTP `429 Too Many Requests` (`FR-032`, `BR-020`, `CTRL-008`).

3. **Tầng Phát sóng Dữ liệu Thời gian thực (SSE Telemetry Broadcaster)**:
   - Thay vì client phải liên tục gửi request thăm dò (polling), Backend mở kết nối Server-Sent Events tại `GET /api/v1/resources/stream` (`FR-033`, `SEC-009`).
   - Sử dụng cấu trúc In-Memory Ring Buffer (giữ tối đa 100 sự kiện gần nhất) làm bus sự kiện nội bộ để đẩy các nhịp đập chỉ số (metric ticks) mỗi 1 giây tới các client đang theo dõi Dashboard.

4. **Tầng Trực quan hóa Giao diện (Interactive Dashboard UI)**:
   - Xây dựng màn hình `/dashboard` trên Next.js sử dụng các thành phần đồ họa nhẹ: biểu đồ Sparkline cập nhật độ trễ thời gian thực, đồng hồ tròn đo mức sử dụng hạn ngạch Quota, biểu đồ phân bổ token theo nhà cung cấp và bảng luồng yêu cầu trực tiếp (`FR-034`, `UX-007`).
   - Phân quyền dữ liệu rõ ràng: Người dùng thông thường chỉ xem được số liệu và hạn ngạch của chính mình; Quản trị viên hệ thống có quyền xem số liệu tổng hợp toàn hệ thống (`BR-021`).

## Alternatives
1. *WebSocket Full-Duplex*: WebSocket cung cấp kênh hai chiều nhưng phức tạp hơn trong việc quản lý heartbeat, reconnect và proxy qua Nginx/Cloudflare so với SSE chỉ cần truyền một chiều từ Server về Client.
2. *Short Polling (Gọi GET mỗi 2 giây)*: Tạo ra hàng nghìn HTTP request dư thừa khi có nhiều tab mở, gây lãng phí CPU và băng thông máy chủ.
3. *Sử dụng công cụ bên ngoài (Prometheus + Grafana)*: Yêu cầu cài đặt thêm hạ tầng container phức tạp, tách rời khỏi giao diện người dùng ứng dụng và khó cung cấp hạn ngạch quota cá nhân hóa theo từng tài khoản.

## Rationale
- Server-Sent Events (SSE) tương thích hoàn hảo với kiến trúc streaming hiện có của AI-Chan, tận dụng lại kết nối HTTP chuẩn và hoạt động ổn định qua mọi Reverse Proxy.
- Ring Buffer nội bộ đảm bảo tiêu tốn bộ nhớ cố định (Bounded Memory O(1)), không rò rỉ RAM máy chủ ngay cả khi lưu lượng tăng đột biến.
- Phân tách đo lường bất đồng bộ đảm bảo việc lưu log số liệu không làm chậm thời gian phản hồi câu trả lời AI của người dùng.

## Consequences
- Bổ sung 2 bảng mới trong cơ sở dữ liệu SQLite: `api_metric_logs` và `user_quotas`.
- Thêm route router mới `resources.py` phụ trách 4 endpoints (`OP-018` .. `OP-021`).
- Mở rộng giao diện điều hướng Sidebar / Header của frontend để bổ sung liên kết đến trang `/dashboard`.

## Risks / Follow-up
- Bảng `api_metric_logs` có thể tăng kích thước nhanh theo thời gian nếu lưu lượng lớn. Cần lên lịch định kỳ (Cron / Background worker) tổng hợp số liệu theo giờ/ngày và dọn dẹp log chi tiết cũ quá 30 ngày.

## Related Requirements
`FR-029`, `FR-030`, `FR-031`, `FR-032`, `FR-033`, `FR-034`, `NFR-020`, `NFR-021`, `BR-019`, `BR-020`, `BR-021`, `SEC-009`, `CTRL-008`, `UX-007`, `COMP-001`, `COMP-002`, `ADR-002`.
