# ADR-001 — Lựa Chọn Ngăn Xếp Công Nghệ FastAPI & Next.js App Router

Status: APPROVED

## Context
Hệ thống Website Chatbot Trợ Lý Ảo yêu cầu thời gian phản hồi bắt đầu stream dưới 2 giây (`NFR-003`), hỗ trợ streaming dữ liệu bất đồng bộ liên tục, giao diện trực quan mượt mà và khả năng đóng gói triển khai nhẹ nhàng.

## Decision
Lựa chọn kiến trúc phân tách rõ ràng:
- **Backend API**: Python 3.11 với framework **FastAPI** và **Uvicorn** (Async Native).
- **Frontend Web**: **Next.js 14 App Router** kết hợp React và TailwindCSS.
- **Database**: **PostgreSQL 16** quản lý qua SQLAlchemy ORM.

## Alternatives
1. *Django + React SPA*: Quá nặng nề cho một API micro-service đàm thoại; overhead lớn; hỗ trợ streaming bất đồng bộ kém linh hoạt hơn FastAPI.
2. *Node.js (Express/NestJS) + React*: Thiếu hệ sinh thái thư viện AI/ML phong phú của Python (SDK chính thức của Google GenAI và OpenAI luôn ưu tiên Python).

## Rationale
- FastAPI có hiệu năng tương đương NodeJS/Go nhờ Starlette và Pydantic.
- Next.js 14 App Router tối ưu hóa việc phân tách Client/Server Components, mang lại trải nghiệm SPA hiện đại mà không hy sinh SEO.
- Hệ sinh thái Python là chuẩn mực vàng cho các ứng dụng tích hợp LLM.

## Consequences
- Đội ngũ phát triển cần nắm vững cả Python (Backend) và TypeScript/React (Frontend).
- Tách bạch rõ ranh giới mạng giữa Container Frontend và Container Backend qua Ingress Nginx.

## Risks / Follow-up
- Cần kiểm soát connection pool của cơ sở dữ liệu khi chạy async (`asyncpg`).

## Related Requirements
`FR-001` .. `FR-014`, `NFR-001`, `NFR-003`, `NFR-004`.
