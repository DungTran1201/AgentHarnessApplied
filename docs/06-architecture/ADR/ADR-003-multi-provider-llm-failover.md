# ADR-003 — Điều Phối AI Đa Nhà Cung Cấp & Tự Động Chuyển Vùng Dự Phòng (Failover)

Status: APPROVED

## Context
Các dịch vụ API mô hình ngôn ngữ lớn (LLM) bên thứ ba thường xuyên gặp hiện tượng quá tải, chạm trần hạn ngạch (HTTP 429), thời gian phản hồi biến động hoặc lỗi máy chủ 5xx. Việc chỉ phụ thuộc vào duy nhất một nhà cung cấp sẽ khiến toàn bộ hệ thống bị tê liệt khi nhà cung cấp đó gặp sự cố.

## Decision
Thiết lập bộ điều phối `LLMManager` với chiến lược ưu tiên kép (Primary-Fallback Precedence - `BR-005`):
- **Nhà cung cấp chính (Primary)**: **Google Gemini API** (`gemini-1.5-flash` / `gemini-1.5-pro`) — tối ưu chi phí và tốc độ phản hồi.
- **Nhà cung cấp dự phòng (Fallback)**: **OpenAI API** (`gpt-4o-mini` / `gpt-4o`) — tự động kích hoạt khi Gemini gặp lỗi mã 429, 5xx hoặc quá 30 giây timeout (`NFR-008`).

## Alternatives
1. *Chỉ sử dụng duy nhất Google Gemini*: Rủi ro thời gian chết (Downtime) cao khi Google gặp sự cố mạng hoặc hết quota.
2. *Cân bằng tải ngẫu nhiên (Round-Robin)*: Chi phí vận hành OpenAI cao hơn đáng kể so với gói Gemini, gây lãng phí ngân sách không kiểm soát.

## Rationale
- Đảm bảo tính liên tục của dịch vụ theo tiêu chuẩn sẵn sàng cao (`BO-02`).
- Tối ưu hóa ngân sách vận hành bằng cách ưu tiên sử dụng hạn ngạch chi phí thấp của Gemini trước.

## Consequences
- Hệ thống cần cấu hình và quản lý đồng thời hai bộ khóa API (`GEMINI_API_KEY` và `OPENAI_API_KEY`).
- Cần chuẩn hóa format prompt và output generator chung giữa hai SDK khác nhau.

## Risks / Follow-up
- Theo dõi chặt chẽ log chuyển vùng để phát hiện sớm trường hợp hết hạn ngạch tài khoản.

## Related Requirements
`FR-010`, `FR-011`, `FR-014`, `BR-005`, `NFR-008`, `AC-004`.
