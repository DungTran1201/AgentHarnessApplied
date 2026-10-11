# Hướng Dẫn Triển Khai Hệ Thống (Deployment Guide)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã tài liệu** | `OPS-DEP-001` |
| **Giai đoạn** | **Phase 13 — Operations & Deployment** |
| **Canonical Model** | `models/deployment/deployment.yaml` |
| **Kiến Trúc Triển Khai** | `DEP-001` (Docker Compose Multi-Tier Architecture) |
| **Phụ thuộc Thượng nguồn** | `06-architecture`, `10-security` |
| **Trạng thái** | **BASELINED** |

---

## 1. Kiến Trúc Triển Khai Thực Tế (DEP-001)

Hệ thống được đóng gói thành các Docker Container chuẩn hóa và điều phối thông qua Docker Compose:

```
[Public Internet Users]
         │ (HTTPS 443 / HTTP 80)
         ▼
┌────────────────────────────────────────────────────────┐
│  nginx-gateway (Reverse Proxy, SSL Termination, DDOS) │
└────────┬──────────────────────────────────────┬────────┘
         │ (HTTP 3000)                          │ (HTTP/SSE 8000)
         ▼                                      ▼
┌─────────────────────────┐          ┌─────────────────────────┐
│   ai-frontend (Next.js) │          │   ai-backend (FastAPI)  │
└─────────────────────────┘          └─────┬──────────────┬────┘
                                           │              │
                                           ▼              ▼
                               ┌───────────────┐  ┌───────────────┐
                               │   postgres    │  │     redis     │
                               │  (Port 5432)  │  │  (Port 6379)  │
                               └───────────────┘  └───────────────┘
```

---

## 2. Yêu Cầu Tiên Quyết Phần Cứng & Phần Mềm (Prerequisites)

- **Hệ điều hành máy chủ**: Ubuntu 22.04 LTS hoặc Linux tương đương.
- **Phần cứng tối thiểu**: 2 CPU Cores, 4GB RAM, 40GB SSD.
- **Phần cứng khuyến nghị**: 4 CPU Cores, 8GB RAM, 80GB NVMe SSD.
- **Phần mềm cài đặt sẵn**:
  - `Docker Engine` >= 24.0.0
  - `Docker Compose` Plugin >= 2.20.0
  - `Git` >= 2.34.0
  - `OpenSSL` (dùng để sinh chứng chỉ SSL)

---

## 3. Quy Trình Các Bước Triển Khai (Step-by-Step Deployment Steps)

### Bước 1: Sao chép mã nguồn và chuẩn bị thư mục
```bash
git clone https://github.com/DungTran1201/ai-chan.git
cd ai-chan
```

### Bước 2: Cấu hình biến môi trường
Tạo file `.env` từ file mẫu trong thư mục `ai-infra/`:
```bash
cp ai-infra/.env.example ai-infra/.env
cp ai-backend/.env.example ai-backend/.env
```

Thiết lập các biến môi trường nhạy cảm bắt buộc:
- `JWT_SECRET_KEY`: Chuỗi ngẫu nhiên tối thiểu 32 ký tự (`openssl rand -hex 32`).
- `POSTGRES_PASSWORD`: Mật khẩu cơ sở dữ liệu mạnh.
- `GEMINI_API_KEY`: Khóa API chính từ Google AI Studio.
- `OPENAI_API_KEY`: Khóa API dự phòng từ OpenAI Platform.

### Bước 3: Chuẩn bị chứng chỉ SSL cho Nginx
Đặt chứng chỉ vào `ai-infra/docker/nginx/certs/`:
- `fullchain.pem`
- `privkey.pem`

### Bước 4: Khởi tạo và khởi động các dịch vụ
Di chuyển vào thư mục compose và chạy lệnh build:
```bash
cd ai-infra/compose
docker compose up -d --build
```

### Bước 5: Kiểm tra trạng thái triển khai (Verification)
Kiểm tra các container đang chạy và kiểm tra healthcheck:
```bash
docker compose ps
curl -f http://localhost:8000/api/v1/health
```
Kết quả trả về phải là HTTP 200 OK:
`{"status":"healthy","database":"connected","redis":"connected","timestamp":"..."}`

---

## 4. Kế Hoạch Quay Lui Khi Sự Cố (Rollback Plan)

Khi một bản cập nhật mới gây lỗi nghiêm trọng (Fatal Deployment Error):
1. **Dừng container phiên bản lỗi**:
   ```bash
   docker compose down
   ```
2. **Khôi phục mã nguồn hoặc Docker Tag về bản ổn định gần nhất**:
   ```bash
   git checkout <last-stable-commit-hash-or-tag>
   ```
3. **Khôi phục dữ liệu Database** (nếu migration phiên bản mới làm hỏng schema):
   ```bash
   docker compose run --rm postgres psql -U postgres -d ai_chan_db < backup_pre_deployment.sql
   ```
4. **Khởi động lại cụm dịch vụ phiên bản trước**:
   ```bash
   docker compose up -d
   ```
5. **Xác minh lại sức khỏe hệ thống** qua endpoint `/api/v1/health`.
