# KHÁI NIỆM KIẾN TRÚC TRIỂN KHAI (DEPLOYMENT ARCHITECTURE CONCEPT)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `ARCH-DEP-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Mô tả cấu trúc triển khai container hóa (Docker Compose Topology), ranh giới mạng nội bộ và các nguyên tắc bảo mật cổng kết nối |

---

## 1. Sơ Đồ Cấu Trúc Triển Khai Container (Deployment Topology)

```mermaid
flowchart TD
    PublicInternet["INTERNET CÔNG CỘNG (CLIENT USERS)"]
    
    subgraph HostServer ["MÁY CHỦ TRIỂN KHAI (HOST ENVIRONMENT)"]
        subgraph DockerBridge ["MẠNG NỘI BỘ CONTAINER: ai-chan-network"]
            NginxService["Service: nginx (Ingress Gateway)<br/>Ports exposed: 80, 443<br/>SSL Termination, Rate Limit 10 r/s"]
            
            FrontendService["Service: frontend (Next.js App)<br/>Internal Port: 3000<br/>Node.js Container"]
            
            BackendService["Service: backend (FastAPI Core)<br/>Internal Port: 8000<br/>Python 3.11 Container"]
            
            DBService["Service: postgres (Database)<br/>Internal Port: 5432<br/>PostgreSQL 16 Alpine"]
            
            RedisService["Service: redis (Cache / Limiter)<br/>Internal Port: 6379<br/>Redis 7 Alpine"]
        end

        HostVolume[("Host Storage Volume:<br/>pgdata (Postgres Data Persistent)")]
    end

    subgraph CloudAPIs ["DỊCH VỤ NGOÀI (EXTERNAL INTERNET)"]
        GoogleGenAI["Google Gemini API"]
        OpenAICloud["OpenAI API"]
    end

    PublicInternet -->|HTTPS :443| NginxService
    NginxService -->|Proxy / :3000| FrontendService
    NginxService -->|Proxy /api/* :8000| BackendService

    BackendService -->|Internal :5432| DBService
    BackendService -->|Internal :6379| RedisService
    DBService --- HostVolume

    BackendService -->|Outbound HTTPS| GoogleGenAI
    BackendService -.->|Outbound HTTPS Failover| OpenAICloud

    style HostServer fill:#f8fafc,stroke:#334155,stroke-width:2px
    style DockerBridge fill:#eff6ff,stroke:#2563eb,stroke-dasharray: 5 5
    style NginxService fill:#dbeafe,stroke:#1d4ed8
    style FrontendService fill:#dbeafe,stroke:#1d4ed8
    style BackendService fill:#dbeafe,stroke:#1d4ed8
    style DBService fill:#dcfce7,stroke:#15803d
    style RedisService fill:#dcfce7,stroke:#15803d
    style HostVolume fill:#fef9c3,stroke:#a16207
```

---

## 2. Nguyên Tắc Bảo Vệ Ranh Giới Mạng & Cổng Kết Nối (Network Isolation)

1. **Phơi Bày Cổng Công Khai Tối Thiểu (Minimum Exposed Ports)**:
   - **Chỉ mở duy nhất Cổng 80 (HTTP) và 443 (HTTPS)** của Nginx ra môi trường Internet.
   - Các cổng dịch vụ nội bộ: Backend (`8000`), Frontend (`3000`), PostgreSQL (`5432`), và Redis (`6379`) **tuyệt đối không được mở trực tiếp ra Host**. Chúng chỉ giao tiếp qua mạng Docker Bridge cô lập (`ai-chan-network`).
2. **Lưu Trữ Bền Vững (Volume Persistence)**:
   - Thư mục dữ liệu `/var/lib/postgresql/data` của PostgreSQL được ánh xạ vào Docker Volume `pgdata` trên máy chủ Host nhằm bảo đảm dữ liệu không bị mất khi container khởi động lại.
3. **Cấu Hình Môi Trường Tập Trung (.env Configuration)**:
   - Toàn bộ bí mật (`POSTGRES_PASSWORD`, `SECRET_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`) được nạp qua tệp môi trường `.env` an toàn, không hardcode vào Dockerfile hay mã nguồn.
