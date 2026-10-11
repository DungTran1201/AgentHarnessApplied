# Giai Đoạn 13: Vận Hành & Triển Khai Hệ Thống (Operations & Deployment)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tổng Quan | Chi Tiết |
| :--- | :--- |
| **Giai đoạn** | **Phase 13 — Operations & Deployment** |
| **Canonical Model** | `models/deployment/deployment.yaml` |
| **Trạng thái Giai đoạn** | **`READY_FOR_NEXT_PHASE`** |
| **Phụ thuộc Thượng nguồn** | `06-architecture`, `10-security`, `12-testing` |
| **Đầu ra Bàn giao** | `14-governance` |

---

## 1. Mục Tiêu Giai Đoạn

Giai đoạn Operations chuyển giao kiến trúc triển khai thực tế (`DEP-001`, `DEP-002`) dựa trên cấu hình Docker Compose thực có tại `ai-infra/compose/docker-compose.yml`, thiết lập hướng dẫn triển khai, quy trình vận hành bảo trì (Runbook), cơ chế giám sát (Monitoring), và kế hoạch ứng phó sự cố (Disaster Recovery).

---

## 2. Danh Mục Tài Liệu Giai Đoạn 13

| Tệp Tài Liệu | Mã Định Danh | Nội Dung Chính |
| :--- | :--- | :--- |
| [deployment-guide.md](file:///c:/Users/PC/Project/ai-chan/docs/13-operations/deployment-guide.md) | `OPS-DEP-001` | Hướng dẫn triển khai từng bước `DEP-001` (Docker Compose 5 services), cấu hình biến môi trường, chứng chỉ SSL và quy trình Rollback. |
| [runbook.md](file:///c:/Users/PC/Project/ai-chan/docs/13-operations/runbook.md) | `OPS-RNBK-001` | Sổ tay vận hành thực tế: khởi động dịch vụ, sao lưu/phục hồi DB hàng ngày, quy trình đổi API Keys và playbook xử lý sự cố. |
| [monitoring.md](file:///c:/Users/PC/Project/ai-chan/docs/13-operations/monitoring.md) | `OPS-MON-001` | Đặc tả giám sát `DEP-002`: Endpoint `/api/v1/health`, định dạng JSON Structured Logging, ngưỡng cảnh báo và cơ chế tự phục hồi. |
| [traceability.md](file:///c:/Users/PC/Project/ai-chan/docs/13-operations/traceability.md) | `OPS-TRC-001` | Ma trận truy vết vận hành liên kết `DEP-001`, `DEP-002` với NFR, SAD và Security Controls. |

---

## 3. Cổng Chất Lượng & Trạng Thái Giai Đoạn (Quality Gate)

- **Tính tương thích thực tế**: 100% tài liệu triển khai khớp với cấu hình thực tế trong `ai-infra/compose/docker-compose.yml`.
- **Trạng thái cổng chất lượng**: **`READY_FOR_NEXT_PHASE`** (Tiến hành Phase 14: Governance).
