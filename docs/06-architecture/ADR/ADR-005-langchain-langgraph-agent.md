# ADR-005 — Kiến Trúc Chat Agent Đa Nhà Cung Cấp Với LangChain & LangGraph Tải Từ Cấu Hình .env

Status: APPROVED

## Context
Hệ thống hiện tại xử lý tương tác AI thông qua module tùy biến `LLMManager` với hai SDK riêng lẻ (Google GenAI và OpenAI) theo `ADR-003`. 
Khi hệ thống mở rộng cần hỗ trợ nhiều nhà cung cấp (Google Gemini, OpenAI, Anthropic, Groq, Ollama như đã quy hoạch trong `.env.example`), việc viết thủ công từng wrapper và logic bắt lỗi chuyển vùng trở nên phức tạp, khó kiểm thử trạng thái hội thoại và hạn chế khả năng bổ sung công cụ (Tools/Function Calling) trong tương lai.

## Decision
Chuyển đổi và nâng cấp kiến trúc điều phối Agent trong phân hệ `ai-backend/llm` sang framework **LangChain** và **LangGraph**:

1. **Tải Nhà Cung Cấp Động Từ `.env` (Dynamic Provider Loader)**:
   - Hệ thống tự động đọc các biến môi trường khóa API trong `.env` (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, `OLLAMA_BASE_URL`).
   - Sử dụng các lớp adapter chuẩn hóa của LangChain (`ChatGoogleGenerativeAI`, `ChatOpenAI`, `ChatAnthropic`, `ChatGroq`, `ChatOllama`). Chỉ các mô hình có cấu hình khóa API hợp lệ trong `.env` mới được đưa vào danh sách khả dụng của Agent.

2. **Mô Hình Đồ Thị Trạng Thái LangGraph (StateGraph Orchestrator)**:
   - Xây dựng đồ thị thực thi có trạng thái `AgentState` bao gồm:
     - `messages`: Danh sách tin nhắn dạng chuẩn LangChain (`SystemMessage`, `HumanMessage`, `AIMessage`).
     - `current_provider`: Nhà cung cấp đang được điều phối.
     - `retry_count`: Số lần thử lại trên từng nhà cung cấp.
     - `error`: Lỗi ghi nhận (nếu có).
   - **Các nút (Nodes) trong đồ thị**:
     - `ContextNode`: Đảm bảo cửa sổ trượt tối đa 20 tin nhắn gần nhất (`INV-04`).
     - `PrimaryModelNode`: Thực thi mô hình ưu tiên (mặc định Google Gemini theo `BR-005`).
     - `FallbackModelNode`: Thực thi mô hình dự phòng (OpenAI / Anthropic) khi nút chính thất bại.
     - `StreamOutputNode`: Truyền luồng các token chunks về tầng API SSE (`ADR-004`).
   - **Cạnh điều kiện (Conditional Edges)**:
     - Đánh giá mã lỗi phản hồi từ `PrimaryModelNode`: Nếu gặp HTTP 429 Quota Exceeded, lỗi server 5xx hoặc Timeout > 30s -> Tự động chuyển tiếp trạng thái sang `FallbackModelNode`.
     - Nếu không có lỗi -> Chuyển thẳng sang `StreamOutputNode` và kết thúc (`END`).

## Alternatives
1. *Tiếp tục duy trì custom wrapper độc lập*: Tiết kiệm dung lượng thư viện cài đặt ban đầu, nhưng tốn chi phí bảo trì cao, khó mở rộng tool calling và không chuẩn hóa được quản lý state phức tạp.
2. *Sử dụng AutoGen hoặc CrewAI*: Quá phức tạp và dư thừa tài nguyên (Over-engineering) cho bài toán trợ lý đàm thoại đơn Agent (YAGNI - `ponytail.md`).
3. *Sử dụng LlamaIndex*: Chuyên sâu cho RAG/Indexing dữ liệu, không tối ưu bằng LangGraph cho việc quản lý đồ thị luồng đàm thoại và failover nhiều nhánh.

## Rationale
- LangChain chuẩn hóa giao tiếp đa mô hình, giảm thiểu mã nguồn lặp lại.
- LangGraph cung cấp đồ thị trạng thái tường minh, dễ gỡ lỗi, hỗ trợ stream từng token tự nhiên và hoàn toàn tương thích với cơ chế kiểm soát lỗi `BR-005`.
- Việc tải từ `.env` tuân thủ nguyên tắc 12-Factor App và bảo mật thông tin xác thực (`SEC-001`).

## Consequences
- Bổ sung các thư viện `langchain`, `langchain-core`, `langgraph`, và adapter nhà cung cấp tương ứng vào tài liệu kiến trúc.
- Format tin nhắn giữa SQLite/Postgres và LangChain được chuẩn hóa thông qua mapper chuyên dụng.

## Traceability & Related Requirements
`FR-008`, `FR-009`, `FR-010`, `FR-011`, `FR-013`, `BR-005`, `INV-04`, `ADR-003`, `ADR-004`, `AC-004`.
