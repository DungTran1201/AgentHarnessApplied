# HỢP ĐỒNG TÍCH HỢP DỊCH VỤ NGOÀI (EXTERNAL INTEGRATION CONTRACTS)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Dự án** | Website Chatbot Trợ Lý Ảo (`ai-chan`) |
| **Mã tài liệu** | `API-INT-001` |
| **Trạng thái Baseline** | **BASELINED** |
| **Mục đích** | Đặc tả hợp đồng giao tiếp giữa ai-backend với các nhà cung cấp mô hình ngôn ngữ lớn bên ngoài: Google Gemini API và OpenAI API |

---

## 1. Hợp Đồng Tích Hợp Google Gemini API (Primary Provider)

- **Vai trò**: Nhà cung cấp mô hình AI chính (`BR-005`, `FR-010`).
- **Giao thức**: HTTPS Streaming API.
- **Xác thực**: Khóa API nạp qua biến môi trường máy chủ `GEMINI_API_KEY` (Header `x-goog-api-key` hoặc qua Google GenAI SDK).
- **Mô hình sử dụng**: `gemini-1.5-flash` (mặc định), `gemini-1.5-pro` (nâng cao).
- **Cấu trúc Yêu cầu (Request Format)**:
  ```json
  {
    "contents": [
      {
        "role": "user",
        "parts": [{ "text": "Câu hỏi của người dùng" }]
      }
    ],
    "generationConfig": {
      "temperature": 0.7,
      "maxOutputTokens": 2048
    }
  }
  ```
- **Xử lý Luồng phản hồi (Streaming Chunk)**:
  - Tiếp nhận các chunk text qua generator: `chunk.text`.
- **Ràng buộc SLA & Lỗi**:
  - Timeout: **30 giây** (`NFR-008`).
  - Nếu trả về mã HTTP `429` (Quota Exceeded) hoặc lỗi máy chủ `5xx` -> Bắt ngoại lệ và kích hoạt chuyển vùng dự phòng sang OpenAI.

---

## 2. Hợp Đồng Tích Hợp OpenAI API (Fallback Provider)

- **Vai trò**: Nhà cung cấp mô hình AI dự phòng tự động (`BR-005`, `FR-011`).
- **Giao thức**: HTTPS Streaming API.
- **Xác thực**: Khóa API nạp qua biến môi trường `OPENAI_API_KEY` (Header `Authorization: Bearer <key>`).
- **Mô hình sử dụng**: `gpt-4o-mini` (mặc định cho fallback), `gpt-4o`.
- **Cấu trúc Yêu cầu (Request Format)**:
  ```json
  {
    "model": "gpt-4o-mini",
    "messages": [
      { "role": "system", "content": "Bạn là AI-Chan, trợ lý ảo thông minh và thân thiện." },
      { "role": "user", "content": "Câu hỏi của người dùng" }
    ],
    "stream": true,
    "temperature": 0.7
  }
  ```
- **Xử lý Luồng phản hồi**:
  - Tiếp nhận từng delta token: `chunk.choices[0].delta.content`.
- **Điều kiện kích hoạt**:
  - Tự động kích hoạt khi Google Gemini gặp sự cố (`BR-005`) hoặc khi người dùng chủ động chỉ định model OpenAI (`FR-014`).
