# Giám Sát, Cảnh Báo & Tự Phục Hồi (Monitoring & Observability)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã tài liệu** | `OPS-MON-001` |
| **Giai đoạn** | **Phase 13 — Operations & Deployment** |
| **Canonical Model** | `models/deployment/deployment.yaml` |
| **Kiến Trúc Triển Khai** | `DEP-001`, `DEP-002` |
| **Phụ thuộc Thượng nguồn** | `06-architecture`, `10-security` |
| **Trạng thái** | **BASELINED** |

---

## 1. Điểm Kiểm Tra Sức Khỏe Hệ Thống (Health Check Endpoints)

Endpoint kiểm tra tình trạng sống còn và khả năng sẵn sàng phục vụ của toàn bộ hệ sinh thái:

- **Đường dẫn**: `GET /api/v1/health`
- **Mã phản hồi khi bình thường**: `HTTP 200 OK`
- **Cấu trúc dữ liệu JSON**:
  ```json
  {
    "status": "healthy",
    "version": "1.0.0",
    "timestamp": "2026-10-07T22:30:00Z",
    "dependencies": {
      "database": {
        "status": "connected",
        "latency_ms": 2.4
      },
      "redis": {
        "status": "connected",
        "latency_ms": 0.8
      },
      "llm_gateway": {
        "primary_provider": "google_gemini",
        "status": "operational",
        "fallback_provider": "openai",
        "fallback_status": "operational"
      }
    }
  }
  ```
- **Mã phản hồi khi suy giảm (Degraded)**: `HTTP 503 Service Unavailable` nếu PostgreSQL hoặc Redis không thể kết nối.

---

## 2. Định Dạng Ghi Nhật Ký Hệ Thống (Structured JSON Logging)

Mọi log từ Backend được chuẩn hóa dưới định dạng JSON một dòng (Single-line JSON) để dễ dàng thu thập và phân tích:

```json
{
  "timestamp": "2026-10-07T22:30:15.123Z",
  "level": "INFO",
  "service": "ai-backend",
  "trace_id": "req-9b8a7c6d-1234-5678",
  "module": "chat_service",
  "event": "llm_stream_completed",
  "conversation_id": "conv-a1b2c3d4",
  "user_id": "usr-5e6f7g8h",
  "model_used": "gemini-2.5-flash",
  "tokens_prompt": 120,
  "tokens_completion": 450,
  "duration_ms": 1820
}
```

---

## 3. Các Chỉ Số Cần Giám Sát & Ngưỡng Cảnh Báo (Key Metrics & Alerting)

| Tên Chỉ Số | Mô Tả | Ngưỡng Cảnh Báo (Warning) | Ngưỡng Nghiêm Trọng (Critical) | Hành Động Phản Ứng |
| :--- | :--- | :--- | :--- | :--- |
| **HTTP Error Rate** | Tỷ lệ phản hồi lỗi 5xx trên tổng số request | > 1% trong 5 phút | > 5% trong 5 phút | Kiểm tra log lỗi Backend & kết nối Database. |
| **SSE First Token Latency** | Thời gian từ khi gửi prompt đến khi nhận token đầu tiên | > 2.0 giây | > 4.0 giây | Kiểm tra độ trễ mạng tới API Google/OpenAI. |
| **LLM Provider Failover Rate** | Tần suất chuyển đổi dự phòng từ Gemini sang OpenAI | > 5 lần / giờ | > 20 lần / giờ | Kiểm tra Quota hoặc sự cố API Google Gemini. |
| **Rate Limit Hits** | Số lượng request bị chặn HTTP 429 | > 50 hits / phút | > 200 hits / phút | Kiểm tra dấu hiệu dò quét brute-force hoặc tấn công từ chối dịch vụ. |
| **CPU / RAM Usage** | Mức tiêu thụ tài nguyên máy chủ | > 80% liên tục | > 90% liên tục | Cân nhắc mở rộng tài nguyên hoặc tối ưu pool kết nối DB. |

---

## 4. Chính Sách Tự Khắc Phục Lỗi Của Vận Hành (DEP-002: Self-Healing Policy)

1. **Docker Container Restart Policy**:
   - Tất cả các container (`nginx-gateway`, `ai-frontend`, `ai-backend`, `postgres`, `redis`) đều cấu hình `restart: unless-stopped`.
   - Nếu tiến trình uvicorn hoặc nextjs bị crash do out-of-memory, Docker Daemon tự động khởi động lại container trong vòng 3 giây.
2. **Database Connection Pool Recycling**:
   - SQLAlchemy cấu hình `pool_recycle: 1800` (tự động làm mới kết nối sau 30 phút) và `pool_pre_ping: true` (kiểm tra sống còn trước khi giao kết nối cho request) để loại bỏ hoàn toàn lỗi stale connection.
3. **LLM Circuit Breaker & Failover**:
   - Tự động ngắt kết nối với Gemini nếu gặp 3 lỗi liên tiếp trong 30 giây, chuyển toàn bộ lưu lượng sang OpenAI trong thời gian 5 phút trước khi thăm dò lại (`ADR-003`).
