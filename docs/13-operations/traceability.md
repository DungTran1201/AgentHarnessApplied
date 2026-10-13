# Ma Trận Truy Vết Vận Hành & Triển Khai (Operations Traceability Matrix)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã tài liệu** | `OPS-TRC-001` |
| **Giai đoạn** | **Phase 13 — Operations & Deployment** |
| **Trạng thái** | **BASELINED** |

---

## 1. Ma Trận Ánh Xạ Yêu Cầu Vận Hành với Kiến Trúc, An Ninh & Yêu Cầu Phi Chức Năng

| Mã Vận Hành / Triển Khai | Tên Thành Phần / Chính Sách | Tệp Tài Liệu Vận Hành | Yêu Cầu Thượng Nguồn | Khối Kiến Trúc / Quyết Định | Biện Pháp Kiểm Chứng Thực Tế |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `DEP-001` | Docker Compose Multi-Tier Production Topology | `deployment-guide.md`, `runbook.md` | `NFR-001`, `NFR-010`, `NFR-011` | `sad.md`, `ADR-001`, `deployment-concept.md` | Kiểm tra lệnh `docker compose ps` hoạt động ổn định 5 container (`nginx-gateway`, `ai-frontend`, `ai-backend`, `postgres`, `redis`). |
| `DEP-002` | Operational Health, Observability & Self-Healing | `monitoring.md`, `runbook.md` | `NFR-012`, `NFR-013`, `SEC-004` | `ADR-003`, `CTRL-004` | Endpoint `/api/v1/health` trả về HTTP 200 kèm tình trạng DB/Redis/LLM; cơ chế auto-restart hoạt động khi container crash. |

---

## 2. Kiểm Tra Tính Khép Kín & Bàn Giao Vận Hành (Operational Readiness)

- **Bảo mật hạ tầng**: Cổng Postgres (5432) và Redis (6379) không bao giờ mở ra Internet công cộng; chỉ Nginx (80, 443) được expose bên ngoài.
- **Dự phòng dữ liệu**: Có kịch bản sao lưu DB hàng ngày và quy trình khôi phục nhanh (RTO < 30 phút, RPO < 24 giờ).
- **Tính tự phục hồi**: Áp dụng triệt để chính sách `restart: unless-stopped` và Circuit Breaker chuyển đổi nhà cung cấp AI khi có sự cố.
