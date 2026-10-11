# Sơ Đồ Kiến Trúc Triển Khai (Deployment Topology Diagram)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Sơ Đồ | Chi Tiết |
| :--- | :--- |
| **Mã Sơ Đồ** | `DIAG-DEP-001` |
| **Mã Triển Khai** | `DEP-001` |
| **Nguồn Sự Thật Thượng Nguồn** | [docs/06-architecture/deployment-concept.md](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/deployment-concept.md), [docs/13-operations/deployment-guide.md](file:///c:/Users/PC/Project/ai-chan/docs/13-operations/deployment-guide.md), [ai-infra/compose/docker-compose.yml](file:///c:/Users/PC/Project/ai-chan/ai-infra/compose/docker-compose.yml) |
| **Mục Đích** | Trực quan hóa cấu trúc triển khai container hóa bằng Docker Compose, ranh giới mạng nội bộ và các cổng dịch vụ |

---

## 1. Biểu Đồ Cấu Trúc Triển Khai Container (DEP-001)

```mermaid
flowchart TD
    PublicUsers["NGƯỜI DÙNG INTERNET (CLIENT BROWSERS)"]
    
    subgraph HostServer ["MÁY CHỦ VẬN HÀNH (UBUNTU 22.04 LTS HOST)"]
        subgraph DockerNetwork ["MẠNG NỘI BỘ DOCKER BRIDGE: ai-chan-network"]
            NginxService["Container: nginx-gateway<br/>Image: nginx:1.27-alpine<br/>Ports Mở Ra Ngoài: 80 (HTTP), 443 (HTTPS)<br/>Chức năng: SSL Termination & Ingress Rate Limiting"]
            
            FrontendService["Container: ai-frontend<br/>Node.js 20 / Next.js 14 App Router<br/>Port Nội Bộ: 3000<br/>Chức năng: Server-Side Rendering & Giao diện"]
            
            BackendService["Container: ai-backend<br/>Python 3.11 / FastAPI / Uvicorn<br/>Port Nội Bộ: 8000<br/>Chức năng: API Nghiệp Vụ, SSE Streaming & Điều Phối AI"]
            
            DBService["Container: postgres<br/>Image: postgres:16-alpine<br/>Port Nội Bộ: 5432<br/>Chức năng: CSDL Quan Hệ Lưu Users, Conversations, Messages"]
            
            RedisService["Container: redis<br/>Image: redis:7-alpine<br/>Port Nội Bộ: 6379<br/>Chức năng: In-Memory Cache & Token Rate Limiting"]
        end

        subgraph PersistentVolumes ["LƯU TRỮ BỀN VỮNG TRÊN Ổ ĐĨA HOST"]
            PGData[("Volume: postgres_data<br/>Mount: /var/lib/postgresql/data")]
            RedisData[("Volume: redis_data<br/>Mount: /data")]
        end
    end

    subgraph ExternalAPIs ["DỊCH VỤ NGOÀI ĐÁM MÂY (CLOUD LLMS)"]
        GeminiAPI["Google Gemini 2.5 Flash API<br/>[Primary Provider]"]
        OpenAIAPI["OpenAI GPT-4o-mini API<br/>[Fallback Provider]"]
    end

    %% Luồng Inbound
    PublicUsers -->|"HTTPS :443 (TLS 1.3) / HTTP :80"| NginxService
    NginxService -->|"HTTP :3000 (Proxy Web)"| FrontendService
    NginxService -->|"HTTP/SSE :8000 (Proxy API)"| BackendService

    %% Giao tiếp nội bộ
    BackendService -->|"TCP :5432 (Postgres Protocol)"| DBService
    BackendService -->|"TCP :6379 (Redis Protocol)"| RedisService
    DBService --- PGData
    RedisService --- RedisData

    %% Outbound AI
    BackendService -->|"Outbound HTTPS:443"| GeminiAPI
    BackendService -.->|"Outbound HTTPS:443 Failover"| OpenAIAPI

    style HostServer fill:#f8fafc,stroke:#334155,stroke-width:2px
    style DockerNetwork fill:#eff6ff,stroke:#2563eb,stroke-dasharray: 5 5
    style NginxService fill:#dbeafe,stroke:#1d4ed8
    style FrontendService fill:#dbeafe,stroke:#1d4ed8
    style BackendService fill:#dbeafe,stroke:#1d4ed8
    style DBService fill:#dcfce7,stroke:#15803d
    style RedisService fill:#dcfce7,stroke:#15803d
    style PersistentVolumes fill:#fef9c3,stroke:#a16207
    style ExternalAPIs fill:#fdf2f8,stroke:#db2777
```

---

## 2. Thuyết Minh Ranh Giới Mạng & An Ninh Cổng

1. **Ranh giới cô lập (Network Isolation)**: Chỉ có 2 cổng `80` và `443` của Nginx Gateway được mở ra môi trường Internet.
2. **Bảo vệ CSDL & Cache**: PostgreSQL (cổng `5432`) và Redis (cổng `6379`) nằm hoàn toàn trong mạng nội bộ Docker Bridge, tuyệt đối không mở cổng ra ngoài máy chủ Host, ngăn chặn hoàn toàn nguy cơ quét cổng hoặc tấn công từ bên ngoài.
3. **Tính bền vững dữ liệu**: Các volume `postgres_data` và `redis_data` tách biệt khỏi vòng đời của container, đảm bảo dữ liệu không bị xóa khi nâng cấp hoặc khởi động lại container.
