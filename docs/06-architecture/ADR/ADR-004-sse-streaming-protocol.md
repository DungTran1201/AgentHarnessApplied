# ADR-004 — Lựa Chọn Giao Thức Server-Sent Events (SSE) Cho Phản Hồi Trực Tuyến

Status: APPROVED

## Context
Người dùng tương tác với Chatbot đòi hỏi thấy từng ký tự câu trả lời xuất hiện ngay tức thì (dưới 2 giây - `NFR-003`) thay vì phải chờ đợi 10-20 giây để nhận toàn bộ khối văn bản hoàn chỉnh.

## Decision
Sử dụng chuẩn giao thức **Server-Sent Events (SSE)** truyền qua HTTP POST streaming endpoint (`/api/v1/chat/conversations/{conv_id}/stream`) với `Content-Type: text/event-stream`.

## Alternatives
1. *WebSocket Protocol*: Đòi hỏi duy trì kết nối hai chiều toàn thời gian (Full-duplex), quản lý trạng thái ping/pong phức tạp, và dễ gặp vấn đề kết nối đứt đoạn khi đi qua các Nginx proxy hoặc CDN.
2. *HTTP Short-polling / Long-polling*: Gây nghẽn mạng do liên tục mở đóng socket HTTP, độ trễ cao và tiêu hao tài nguyên CPU của máy chủ.

## Rationale
- Luồng sinh câu trả lời của AI có bản chất đơn hướng: Người dùng gửi một câu hỏi và máy chủ đẩy một luồng các token trả về.
- SSE tương thích tuyệt đối với hạ tầng HTTP tiêu chuẩn, đi qua Ingress Nginx một cách trong suốt với cấu hình `proxy_buffering off;`.

## Consequences
- Nginx bắt buộc phải cấu hình `proxy_buffering off;` và `proxy_read_timeout 300s;` cho đường dẫn streaming để tránh làm chậm gói tin.
- Frontend sử dụng `ReadableStream` hoặc `fetch-event-source` để đọc stream.

## Risks / Follow-up
- Cần lắng nghe sự kiện client đóng tab (`ClientDisconnect`) để ngắt sớm generator phía máy chủ nhằm tiết kiệm chi phí token.

## Related Requirements
`FR-008`, `FR-009`, `NFR-003`, `AC-004`.
