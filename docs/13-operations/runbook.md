# Sổ Tay Vận Hành & Khắc Phục Sự Cố (Operational Runbook)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã tài liệu** | `OPS-RNBK-001` |
| **Giai đoạn** | **Phase 13 — Operations & Deployment** |
| **Canonical Model** | `models/deployment/deployment.yaml` |
| **Kiến Trúc Triển Khai** | `DEP-001`, `DEP-002` |
| **Phụ thuộc Thượng nguồn** | `06-architecture`, `10-security` |
| **Trạng thái** | **BASELINED** |

---

## 1. Quản Lý Trạng Thái Cụm Dịch Vụ (Service Lifecycle Management)

### 1.1. Khởi động lại dịch vụ cụ thể
Khi cần khởi động lại một dịch vụ đơn lẻ mà không làm gián đoạn toàn bộ hệ thống:
```bash
# Khởi động lại Backend API
docker compose restart ai-backend

# Khởi động lại Nginx Ingress Gateway sau khi cập nhật cấu hình SSL
docker compose restart nginx-gateway
```

### 1.2. Xem nhật ký hệ thống thời gian thực (Real-Time Logs)
```bash
# Xem log toàn bộ hệ thống
docker compose logs -f --tail=100

# Xem log riêng Backend để theo dõi kết nối LLM và SSE
docker compose logs -f ai-backend

# Xem log Nginx để phát hiện hành vi quét lỗ hổng hoặc DDOS
docker compose logs -f nginx-gateway
```

---

## 2. Quy Trình Sao Lưu & Khôi Phục Dữ Liệu (Backup & Restore Procedures)

### 2.1. Sao lưu cơ sở dữ liệu định kỳ (Automated Backup)
Thực hiện tự động qua cron job lúc 02:00 AM hàng ngày:
```bash
# Tạo bản dump nén gzip có gắn nhãn thời gian
BACKUP_DATE=$(date +"%Y%m%d_%H%M%S")
docker compose exec -T postgres pg_dump -U postgres ai_chan_db | gzip > "/var/backups/ai_chan_db_${BACKUP_DATE}.sql.gz"

# Xóa các bản sao lưu cũ hơn 30 ngày để tiết kiệm dung lượng
find /var/backups/ -name "ai_chan_db_*.sql.gz" -mtime +30 -delete
```

### 2.2. Khôi phục cơ sở dữ liệu từ bản sao lưu (Database Restore)
```bash
# 1. Dừng backend tạm thời để tránh xung đột ghi dữ liệu
docker compose stop ai-backend

# 2. Xả nén và nạp dữ liệu vào Postgres
gunzip < /var/backups/ai_chan_db_20261007_020000.sql.gz | docker compose exec -T postgres psql -U postgres -d ai_chan_db

# 3. Khởi động lại backend và xác minh tính toàn vẹn
docker compose start ai-backend
```

---

## 3. Quy Trình Đổi Khóa Bí Mật & API Keys (Secrets & Key Rotation)

### 3.1. Thay đổi API Key nhà cung cấp AI (Gemini / OpenAI)
Thực hiện khi nghi ngờ rò rỉ hoặc đổi sang quota tài khoản mới:
1. Tạo Key mới tại bảng điều khiển Google AI Studio hoặc OpenAI.
2. Cập nhật giá trị `GEMINI_API_KEY` hoặc `OPENAI_API_KEY` trong file `ai-backend/.env`.
3. Khởi động lại backend không gián đoạn:
   ```bash
   docker compose up -d --no-deps ai-backend
   ```
4. Kiểm tra gọi một đoạn chat thử nghiệm để đảm bảo Key mới có hiệu lực.
5. Vô hiệu hóa (Revoke) Key cũ trên bảng điều khiển nhà cung cấp.

### 3.2. Thay đổi JWT Secret Key
> [!WARNING]
> Việc đổi `JWT_SECRET_KEY` sẽ khiến toàn bộ token phiên làm việc hiện tại của tất cả người dùng bị vô hiệu lực, người dùng sẽ phải đăng nhập lại.

1. Sinh khóa bí mật mới: `openssl rand -hex 32`.
2. Cập nhật `JWT_SECRET_KEY` trong `ai-backend/.env`.
3. Restart backend: `docker compose restart ai-backend`.

---

## 4. Xử Lý Các Sự Cố Điển Hình (Incident Handling Playbooks)

### 4.1. Sự cố Cổng AI Trả Về Lỗi Liên Tục (LLM Providers Degraded)
- **Triệu chứng**: Người dùng phản ánh chat báo lỗi hoặc chậm; log backend xuất hiện nhiều thông báo Failover sang OpenAI (`ADR-003`).
- **Xác định nguyên nhân**:
  1. Kiểm tra trạng thái Gemini API và OpenAI API qua trang Status của nhà cung cấp.
  2. Kiểm tra log backend: `docker compose logs ai-backend | grep -i "provider error"`.
- **Hành động**:
  - Nếu Gemini bị nghẽn quota: Tăng hạn ngạch tài khoản hoặc đổi `GEMINI_API_KEY`.
  - Nếu cả hai nhà cung cấp đều sập diện rộng: Bật cờ phản hồi bảo trì thông báo cho người dùng.

### 4.2. Sự cố Đầy Bộ Nhớ Hoặc Tràn Ổ Đĩa (Disk Space Exhaustion)
- **Triệu chứng**: Container Postgres hoặc Redis bị tắt đột ngột (`Exit code 137`).
- **Hành động**:
  1. Dọn dẹp các Docker image và volume không sử dụng:
     ```bash
     docker system prune -af --volumes
     ```
  2. Dọn bớt các file log Nginx quá lớn trong `/var/log/nginx`.
  3. Khởi động lại cụm dịch vụ: `docker compose up -d`.
