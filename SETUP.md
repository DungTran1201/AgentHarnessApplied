# Hướng Dẫn Cài Đặt & Vận Hành AI-Chan Từ A Đến Z

Tài liệu hướng dẫn toàn diện từ A -> Z để thiết lập môi trường, cấu hình dịch vụ, kết nối Discord Bot và vận hành hệ thống AI-Chan Fullstack (FastAPI Backend, Next.js Frontend, AI Project Graph Engine và Discord Gateway).

---

## Mục Lục
1. [Yêu Cầu Tiền Quyết (Prerequisites)](#1-yêu-cầu-tiền-quyết-prerequisites)
2. [Cách 1: Khởi Động Nhanh 1-Click (`run-demo.bat`)](#2-cách-1-khởi-động-nhanh-1-click-run-demobat)
3. [Cách 2: Cài Đặt & Chạy Thủ Công Từng Thành Phần](#3-cách-2-cài-đặt--chạy-thủ-công-từng-thành-phần)
   - [3.1. Cấu hình & Khởi chạy Backend (`ai-backend`)](#31-cấu-hình--khởi-chạy-backend-ai-backend)
   - [3.2. Cấu hình & Khởi chạy Frontend (`ai-frontend`)](#32-cấu-hình--khởi-chạy-frontend-ai-frontend)
   - [3.3. Cấu hình & Khởi chạy Discord Bot](#33-cấu-hình--khởi-chạy-discord-bot)
4. [Cách 3: Triển Khai Bằng Docker Compose (`ai-infra`)](#4-cách-3-triển-khai-bằng-docker-compose-ai-infra)
5. [Hướng Dẫn Cấu Hình Discord Developer Portal](#5-hướng-dẫn-cấu-hình-discord-developer-portal)
6. [Quy Trình Tạo Pipeline & Nối Bot Vào Project Graph](#6-quy-trình-tạo-pipeline--nối-bot-vào-project-graph)
7. [Kiểm Thử & Đảm Bảo Chất Lượng (Quality Verification)](#7-kiểm-thử--đảm-bảo-chất-lượng-quality-verification)
8. [Xử Lý Sự Cố Thường Gặp (Troubleshooting FAQ)](#8-xử-lý-sự-cố-thường-gặp-troubleshooting-faq)

---

## 1. Yêu Cầu Tiền Quyết (Prerequisites)

Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt các công cụ sau:

| Công cụ | Phiên bản khuyến nghị | Mục đích sử dụng |
| :--- | :--- | :--- |
| **Python** | `3.11.x` hoặc `3.12.x` | Runtime cho FastAPI Backend, LangChain & Discord Bot |
| **Node.js** | `v18.x`, `v20.x` hoặc mới hơn | Runtime cho Next.js Frontend Portal |
| **npm** | `v9.x` hoặc mới hơn | Quản lý thư viện giao diện frontend |
| **Git** | Bản mới nhất | Quản lý mã nguồn |
| **Google Gemini API Key** | Miễn phí từ [Google AI Studio](https://aistudio.google.com/) | Gọi mô hình AI thực tế (hoặc dùng OpenAI API Key) |
| **Discord Bot Token** | Tạo tại [Discord Developer Portal](https://discord.com/developers/applications) | Cho phép Bot trực tiếp nhận và trả lời tin nhắn trên Discord |
| *(Tùy chọn)* **Docker Desktop** | Bản mới nhất | Khi muốn chạy cụm hạ tầng khép kín (PostgreSQL, Redis, Nginx HTTPS) |

---

## 2. Cách 1: Khởi Động Nhanh 1-Click (`run-demo.bat`)

Đây là phương pháp **nhanh nhất** và **tiện lợi nhất** dành cho môi trường Windows để khởi động toàn bộ hệ sinh thái chỉ với 1 cú nhấp chuột.

### Các bước thực hiện:

1. **Chuẩn bị file cấu hình môi trường**:
   - Trong thư mục `ai-backend`, đảm bảo bạn đã tạo file `.env` (Xem chi tiết mục [3.1](#31-cấu-hình--khởi-chạy-backend-ai-backend)).
   - Trong thư mục `ai-frontend`, đảm bảo bạn đã tạo file `.env.local`.

2. **Chạy file kịch bản**:
   - Mở cửa sổ dòng lệnh tại thư mục gốc `ai-chan` và chạy:
     ```cmd
     run-demo.bat
     ```
   - Hoặc nhấp đúp chuột trực tiếp vào file **`run-demo.bat`** trên File Explorer.

3. **Hệ thống sẽ tự động mở 3 cửa sổ Terminal song song**:
   - `[1/3] AI-Chan Backend (FastAPI)`: Lắng nghe tại `http://127.0.0.1:8000`
   - `[2/3] AI-Chan Frontend (Next.js)`: Lắng nghe tại `http://localhost:3000`
   - `[3/3] AI-Chan Discord Bot`: Kết nối Gateway Discord bằng Token trong `.env`

> [!TIP]
> Khi muốn tắt hệ thống, bạn chỉ cần đóng 3 cửa sổ Terminal này hoặc nhấn `Ctrl + C` tại cửa sổ chính.

---

## 3. Cách 2: Cài Đặt & Chạy Thủ Công Từng Thành Phần

Khuyên dùng khi bạn muốn phát triển tính năng (Development), kiểm tra log chi tiết hoặc chạy trên Linux / macOS.

### 3.1. Cấu hình & Khởi chạy Backend (`ai-backend`)

Mở Terminal thứ nhất và thực hiện:

```powershell
# 1. Di chuyển vào thư mục backend
cd ai-backend

# 2. Tạo môi trường ảo Python (.venv)
python -m venv .venv

# 3. Kích hoạt môi trường ảo
# Trên Windows PowerShell:
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
# (Trên macOS/Linux: source .venv/bin/activate)

# 4. Cài đặt toàn bộ thư viện dependencies
pip install -r requirements.txt

# 5. Tạo file cấu hình biến môi trường
Copy-Item .env.example .env
```

#### Thiết lập các biến môi trường quan trọng trong `ai-backend/.env`:
Mở file `.env` bằng trình soạn thảo và điền thông tin của bạn:

```ini
# Core Backend Settings
APP_ENV=development
PORT=8000
DEBUG=true

# LLM Providers (Bắt buộc ít nhất một key để gọi AI thực)
GEMINI_API_KEY=AIzaSy...              # Lấy từ https://aistudio.google.com/
DEFAULT_LLM_PROVIDER=gemini
DEFAULT_LLM_MODEL=gemini-3.5-flash-lite # Khuyên dùng: tốc độ cao, hạn ngạch dồi dào, ổn định
MAX_TOKENS_PER_REQUEST=4096

# Cấu hình Discord Bot (Bắt buộc nếu chạy Bot)
DISCORD_CLIENT_ID=1548888415951519744
DISCORD_BOT_TOKEN=MTU0ODg4...         # Token từ Discord Developer Portal
DISCORD_GUILD_ID=1548889260118114364  # Server ID Discord chính của bạn
DISCORD_BOT_API_BASE_URL=http://localhost:8000
```

#### Khởi chạy Backend:
```powershell
.\.venv\Scripts\python.exe -m uvicorn src.main:app --port 8000 --reload
```

- **Swagger API Docs tương tác**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

### 3.2. Cấu hình & Khởi chạy Frontend (`ai-frontend`)

Mở Terminal thứ hai và thực hiện:

```powershell
# 1. Di chuyển vào thư mục frontend
cd ai-frontend

# 2. Tạo file biến môi trường giao diện
Copy-Item .env.example .env.local

# 3. Cài đặt các gói npm
npm install

# 4. Khởi chạy giao diện Next.js
npm run dev -- --port 3000
```

- **Giao diện Web AI-Chan**: [http://localhost:3000](http://localhost:3000)

---

### 3.3. Cấu hình & Khởi chạy Discord Bot

Mở Terminal thứ ba và khởi chạy tiến trình Discord Gateway:

```powershell
cd ai-backend
.\.venv\Scripts\python.exe -m src.discord_bot.main
```

Khi bot khởi động thành công, màn hình sẽ hiển thị:
```
[INFO] Logged in as Dororo#2058 (ID: 1548888415951519744)
[INFO] Loaded Cog: DiagnosticsCog
[INFO] Loaded Cog: AskCog (AI-Chan Integrated)
[INFO] Synced application slash commands (/ask, /status, /ping)
```

---

## 4. Cách 3: Triển Khai Bằng Docker Compose (`ai-infra`)

Phương án này đóng gói toàn bộ hệ sinh thái chạy độc lập trên Docker containers với Nginx Gateway có HTTPS/SSL cục bộ, PostgreSQL và Redis.

### 4.1. Chuẩn bị chứng chỉ SSL cục bộ:
```powershell
# Trên Windows PowerShell:
powershell.exe -ExecutionPolicy Bypass -File ai-infra/scripts/generate-ssl.ps1

# Trên Linux / macOS:
bash ai-infra/scripts/generate-ssl.sh
```

### 4.2. Khởi chạy Docker Compose:
```powershell
# Khởi tạo file biến môi trường infra
Copy-Item ai-infra\.env.example ai-infra\.env

# Khởi chạy cụm container chế độ nền (-d)
docker compose -f ai-infra/compose/docker-compose.yml up --build -d
```

### 4.3. Bảng định tuyến dịch vụ Docker:
| Dịch vụ | URL / Port | Vai trò |
| :--- | :--- | :--- |
| **HTTPS Ingress Gateway** | `https://localhost` *(Port 443)* | Cổng an toàn Nginx, tự động redirect từ HTTP port 80 |
| **Frontend Portal** | `https://localhost/` | Next.js Web Portal |
| **Backend API** | `https://localhost/api/` | FastAPI Engine & SSE Streaming |
| **PostgreSQL Database** | `localhost:5432` | User: `postgres`, Password: `postgres`, DB: `ai_chan_db` |
| **Redis Cache** | `localhost:6379` | Quota rate limiter & session cache |

---

## 5. Hướng Dẫn Cấu Hình Discord Developer Portal

Để Discord Bot có thể đọc tin nhắn và thực thi lệnh đầy đủ, bạn cần bật các quyền đặc quyền (Privileged Gateway Intents) theo đúng quy trình:

1. Truy cập [Discord Developer Portal](https://discord.com/developers/applications).
2. Chọn ứng dụng của bạn (hoặc nhấn **New Application** để tạo mới).
3. Tại menu bên trái, chọn **Bot**:
   - Nhấn **Reset Token** để lấy `DISCORD_BOT_TOKEN` và dán vào file `ai-backend/.env`.
   - **BẮT BUỘC:** Cuộn xuống phần **Privileged Gateway Intents** và gạt bật cả 3 mục:
     -  **Presence Intent**
     -  **Server Members Intent**
     -  **Message Content Intent** *(Cực kỳ quan trọng: cho phép bot đọc nội dung prompt)*.
   - Nhấn **Save Changes**.
4. Mời Bot vào Server của bạn:
   - Vào mục **OAuth2** -> **URL Generator**.
   - Mục **SCOPES**: Tích chọn `bot` và `applications.commands`.
   - Mục **BOT PERMISSIONS**: Tích chọn:
     - `Send Messages`
     - `Send Messages in Threads`
     - `Embed Links`
     - `Attach Files`
     - `Read Message History`
     - `Use Slash Commands`
   - Copy đường link được sinh ra ở dưới cùng, dán vào trình duyệt và chọn Server Discord bạn muốn mời Bot vào.

---

## 6. Quy Trình Tạo Pipeline & Nối Bot Vào Project Graph

AI-Chan áp dụng kiến trúc **Project Graph làm nguồn chân lý duy nhất (Single Source of Truth)**. Bot Discord sẽ tự động định tuyến theo mô hình và prompt mà bạn nối trên Canvas:

```
[Web Input] ──────┐
                  ▼
[System Prompt] ──► [Model LLM] ──► [Web Output]
(e.g., BA/Python)        │
                         ▼
                 [Dororo Discord Bot]
```

### Các bước kết nối trên giao diện Web:
1. Mở trình duyệt tại [http://localhost:3000](http://localhost:3000).
2. Vào mục **Projects** trên thanh menu trái -> Chọn dự án của bạn (hoặc tạo dự án mới) -> Nhấn **Open Graph Editor**.
3. Trong thanh **Node Catalog** bên trái:
   - Kéo node **Model LLM** vào canvas (mặc định chọn `Google Gemini 3.5 Flash Lite`).
   - Kéo node **System Prompt** (chọn persona bạn thích, ví dụ: *Senior Business Analyst* hoặc *Senior Python Architect*).
   - Nối cổng ra của node **System Prompt** vào cổng nhận `system_instruction` của node **Model LLM**.
   - Kéo node **Bot (Dororo Discord Bot)** vào canvas.
   - Nối cổng ra của node **Model LLM** vào cổng vào của node **Bot**.
4. Nhấn **Save Graph** (góc trên bên phải).
5. Nếu dự án đang ở trạng thái `PAUSED` hoặc `STOP`, nhấn nút **Activate Project** để chuyển sang `ACTIVE`.
6. Sang trang **Bot** trên menu trái:
   - Bạn sẽ thấy card **Project Graph & Model Resolution** tự động hiển thị:
     - Tên dự án đang liên kết (kèm badge `ACTIVE`).
     - Mô hình AI được định tuyến (`gemini-3.5-flash-lite`).
     - System Prompt đang kích hoạt.
7. Thử nghiệm trên Discord:
   - Nhắn tin trực tiếp (DM) cho bot hoặc gõ `@Dororo Xin chào, bạn là ai?`.
   - Bot sẽ lập tức trả lời nhập vai chính xác 100% theo System Prompt bạn đã thiết lập trên Canvas!

---

## 7. Kiểm Thử & Đảm Bảo Chất Lượng (Quality Verification)

Hệ thống được trang bị bộ kiểm thử tự động toàn diện theo chuẩn kỹ nghệ phần mềm:

### Chạy Unit Test & Integration Test Backend:
```powershell
cd ai-backend
.\.venv\Scripts\python.exe -m pytest tests/test_discord_bot_cogs.py tests/test_project_bot_skill_graph.py tests/test_discord_e2e_flow.py tests/test_models_api.py -v
```
*(Kết quả yêu cầu: `40/40 tests PASSED`)*.

### Kiểm tra tính toàn vẹn kiểu dữ liệu Frontend:
```powershell
cd ai-frontend
npx tsc --noEmit
```
*(Kết quả yêu cầu: `0 errors`)*.

### Chạy bộ System Validators của Antigravity:
```powershell
py tools/validators/run_all.py
```
*(Kiểm tra toàn bộ hooks, models, skill registry, artifact matrix và traceability)*.

---

## 8. Xử Lý Sự Cố Thường Gặp (Troubleshooting FAQ)

### Q1: Bot Discord đang online nhưng khi chat không thấy bot phản hồi?
- **Nguyên nhân**: Bạn chưa bật **Message Content Intent** trên Discord Developer Portal.
- **Khắc phục**: Vào [Discord Developer Portal](https://discord.com/developers/applications) -> Chọn Application của bạn -> Tab **Bot** -> Bật **Message Content Intent** -> Nhấn **Save Changes** và khởi động lại bot.

### Q2: Bot luôn trả về câu trả lời mẫu về LangChain & LangGraph thay vì nội dung theo prompt?
- **Nguyên nhân**: Mô hình AI cấu hình trong Project bị lỗi hạn ngạch 429 Quota Exceeded hoặc 503 Overload từ Google.
- **Khắc phục**: 
  1. Kiểm tra biến `DEFAULT_LLM_MODEL=gemini-3.5-flash-lite` trong `ai-backend/.env`.
  2. Mở Graph Editor trên Web, đảm bảo node Model đang chọn `gemini-3.5-flash-lite` hoặc để hệ thống tự động kích hoạt cơ chế Intra-Provider Failover.

### Q3: Báo lỗi "Failed to save graph" khi nối node Model với Bot?
- **Nguyên nhân**: Bot ID chưa đồng bộ với cơ sở dữ liệu.
- **Khắc phục**: Phiên bản mới nhất đã tự động xử lý cả Snowflake Discord ID lẫn Database UUID. Hãy đảm bảo Project của bạn đã được lưu với phiên bản code hiện tại.

### Q4: Lỗi "Script Execution Policy" khi chạy PowerShell trên Windows?
- **Khắc phục**: Chạy lệnh sau trong PowerShell với quyền Administrator:
  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
  ```

### Q5: Bị báo lỗi xung đột cổng Port 8000 hoặc Port 3000 đã được sử dụng?
- **Khắc phục**:
  - Tìm tiến trình đang chiếm cổng: `netstat -ano | findstr :8000`
  - Đóng tiến trình chiếm dụng: `taskkill /PID <PID_NUMBER> /F`
  - Hoặc khởi động lại bằng `run-demo.bat`.
