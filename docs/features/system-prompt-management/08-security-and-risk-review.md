# 08. ĐÁNH GIÁ BẢO MẬT & QUẢN TRỊ RỦI RO (SECURITY & RISK REVIEW)
## Phân Hệ: Quản Lý System Prompt (System Prompt Management MVP)
### Nền Tảng: AI-Chan Virtual Assistant Platform

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `DOC-SPM-08` |
| **Trạng Thái** | `PROPOSED (Chờ Duyệt Từ Application Security Reviewer)` |
| **Vai Trò Phụ Trách** | Application Security Reviewer & Solution Architect |
| **Phiên Bản** | `1.0.0-MVP` |
| **Ngày Lập** | `2026-10-11` |

---

## 1. Phân Tích Tài Sản & Bề Mặt Tấn Công (Assets & Attack Surface)

### 1.1. Bảng Kiểm Kê Tài Sản Cần Bảo Vệ (Protected Assets)
1. **Nội Dung System Prompt (`content`):** Có thể chứa tri thức độc quyền, quy tắc kinh doanh nội bộ, logic bảo mật prompt (Guardrails), prompt engineering bí mật của người dùng.
2. **Metadata của Prompt (`name`, `description`):** Tên và mô tả định danh dự án hoặc khách hàng của người dùng.
3. **Tính Toàn Vẹn Của Cơ Sở Dữ Liệu (`app.db`):** Ngăn chặn việc ghi đè, xóa trộm hoặc chèn mã độc vào bảng `system_prompts`.
4. **Tài Nguyên Hệ Thống (Memory & CPU):** Ngăn chặn việc gửi các payload khổng lồ gây cạn kiệt bộ nhớ (Denial of Service - DoS).

### 1.2. Ranh Giới An Toàn Quan Trọng: Storage vs Runtime Execution
> [!IMPORTANT]
> **Nguyên tắc phân định rủi ro cốt lõi:**
> - **Trong phạm vi phân hệ này (Storage Layer):** Hệ thống đối xử nội dung prompt là **Dữ liệu Văn bản Bị Động (Passive Text Data)**. Nó KHÔNG được thông dịch như mã thực thi (Code execution) hay HTML markup. Rủi ro trọng tâm ở đây là **IDOR (Truy cập trái phép)**, **Stored XSS (Chèn script)**, **DoS (Quá tải dung lượng)** và **Rò rỉ qua Log**.
> - **Rủi ro Prompt Injection (Runtime Layer):** Rủi ro Jailbreak hoặc Prompt Injection chỉ xảy ra khi prompt này được nạp vào một LLM trong tương lai để sinh phản hồi. Đó là bài toán của Runtime Execution Layer (sẽ được kiểm soát bằng các guardrail độc lập), **không phải là cam kết kiểm soát của phân hệ lưu trữ prompt MVP này**.

---

## 2. Bảng Đăng Ký Rủi Ro & Đe Dọa (Threat & Risk Register)

Phân tích theo mô hình đe dọa OWASP Top 10 và STRIDE:

| Mã Rủi Ro (Risk ID) | Danh Mục Nguy Cơ (Threat Category) | Vector Tấn Công & Kịch Bản Đe Dọa (Attack Vector) | Mức Độ Tác Động (Impact) | Khả Năng Xảy Ra (Likelihood) | Mức Rủi Ro Ban Đầu (Inherent Risk) | Biện Pháp Kiểm Soát & Khắc Phục (Mitigations) | Rủi Ro Còn Lại (Residual Risk) | Trạng Thái Kiểm Soát (Status) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **THR-SPM-01** | **BOLA / IDOR (Broken Object Level Authorization)** | Kẻ tấn công thay đổi tham số `id` trên URL (`/api/v1/system-prompts/{victim_id}`) để đọc trộm, chỉnh sửa hoặc xóa System Prompt của người dùng khác. | **Cao** (Lộ bí mật nghiệp vụ, mất dữ liệu) | **Cao** (Dễ đoán nếu dùng ID tuần tự hoặc UUID lộ) | **CRITICAL** | **CTRL-001 (Anti-IDOR):** Bắt buộc chèn điều kiện `WHERE id = :id AND user_id = :current_user_id` vào 100% các câu truy vấn backend. Trả về HTTP 404 (thay vì 403) để che giấu sự tồn tại của ID. | **Thấp** | **Confirmed** |
| **THR-SPM-02** | **Stored XSS (Cross-Site Scripting)** | Người dùng chèn thẻ mã độc `<script>fetch('/steal?c='+document.cookie)</script>` hoặc `<img src=x onerror=...>` vào ô Content nhằm chiếm session của người dùng khác khi xem prompt. | **Cao** (Chiếm phiên đăng nhập, tấn công trình duyệt) | **Trung bình** | **HIGH** | **CTRL-002 (Safe Plain-Text Rendering):** Tuyệt đối không dùng `dangerouslySetInnerHTML`. Khi hiển thị, đặt trong `<textarea readOnly>` hoặc `<div>` có `white-space: pre-wrap;` qua text interpolation chuẩn của React. Trình duyệt tự động mã hóa ký tự đặc biệt. | **Rất thấp** | **Confirmed** |
| **THR-SPM-03** | **Denial of Service (DoS Payload Size)** | Kẻ tấn công gửi HTTP POST với trường `content` dung lượng 50MB nhằm làm nghẽn băng thông, tràn bộ nhớ RAM của FastAPI và làm phình to file CSDL SQLite. | **Trung bình** (Gây chậm hoặc sập service) | **Trung bình** | **MEDIUM** | **CTRL-003 (Size Limitation):** Ràng buộc Pydantic v2 `max_length=10000` (~10KB). FastAPI từ chối ngay lập tức các request vượt ngưỡng với HTTP 422. Phía client chặn gõ vượt quá giới hạn. | **Thấp** | **Confirmed** |
| **THR-SPM-04** | **Log Leakage (Rò Rỉ Dữ Liệu Qua Nhật Ký)** | Nội dung prompt chứa thông tin định danh hoặc bí mật nghiệp vụ bị in ra toàn bộ vào file `app.log` hoặc console khi server ghi log request/response. | **Trung bình** (Lộ dữ liệu qua log analyzer hoặc nhân sự vận hành) | **Cao** | **HIGH** | **CTRL-004 (Logging Redaction):** Tuyệt đối không log trường `content`. Logger chỉ ghi nhận metadata: `endpoint`, `user_id`, `id`, `content_length` (ví dụ: `Prompt created id=sp_123, length=1250`). | **Thấp** | **Confirmed** |
| **THR-SPM-05** | **SQL Injection** | Kẻ tấn công cố tình chèn chuỗi `' OR '1'='1` vào tên prompt hoặc từ khóa tìm kiếm để khai thác CSDL. | **Rất cao** (Thoát dữ liệu, phá hủy DB) | **Thấp** (Do dùng ORM/Query helpers) | **HIGH** | **CTRL-005 (Parameterized Queries):** 100% các câu lệnh SQL trong `src/db.py` sử dụng tham số hóa SQLite (`?`). Tuyệt đối cấm ghép chuỗi SQL dạng f-string. | **Rất thấp** | **Confirmed** |
| **THR-SPM-06** | **Unintended Data Loss (Mất Dữ Liệu Do Lỡ Tay)** | Người dùng đang viết một prompt dài 5.000 ký tự thì vô tình bấm nút Back hoặc F5, toàn bộ dữ liệu chưa lưu bị xóa sạch. | **Trung bình** (Gây ức chế trải nghiệm người dùng) | **Cao** | **MEDIUM** | **CTRL-006 (Dirty Form Guard):** Lắng nghe sự kiện `beforeunload` và hook chuyển trang của Next.js; hiển thị modal cảnh báo xác nhận khi `isDirty === true`. | **Thấp** | **Confirmed** |
| **THR-SPM-07** | **Accidental Deletion (Xóa Nhầm Bản Ghi)** | Người dùng bấm nhầm icon thùng rác và bản ghi bị xóa ngay lập tức không kịp cứu vãn. | **Trung bình** (Mất dữ liệu vĩnh viễn) | **Cao** | **MEDIUM** | **CTRL-007 (Delete Confirmation Modal):** Bắt buộc phải có bước xác nhận Modal với 2 nút "Hủy" và "Xóa vĩnh viễn". Không có cơ chế xóa ngầm (Silent delete). | **Thấp** | **Confirmed** |

---

## 3. Các Biện Pháp Kiểm Soát Bảo Mật Chi Tiết (Detailed Security Controls)

### 3.1. CTRL-001: Cưỡng Chế Kiểm Soát Truy Cập Chống BOLA/IDOR
- **Triết lý:** "Không bao giờ tin tưởng ID gửi lên từ Client".
- **Triển khai:**
  ```python
  # Mẫu truy vấn an toàn tại Controller:
  user_id = current_user["id"] # Lấy từ Token đã qua xác thực
  prompt = query_one(
      "SELECT * FROM system_prompts WHERE id = ? AND user_id = ?",
      (prompt_id, user_id)
  )
  if not prompt:
      # Luôn trả về 404 thay vì 403 để kẻ tấn công không biết ID đó có tồn tại hay không
      raise HTTPException(
          status_code=status.HTTP_404_NOT_FOUND, 
          detail={"error_code": "PROMPT_NOT_FOUND", "message": "System Prompt không tồn tại"}
      )
  ```

### 3.2. CTRL-002: Kiểm Soát Safe Rendering Chống Stored XSS
- **Triển khai Frontend:**
  ```tsx
  // ✅ ĐÚNG: Xem nội dung là Plain Text Data an toàn tuyệt đối
  <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace' }}>
    {prompt.content}
  </div>

  // Hoặc dùng Textarea ở chế độ chỉ đọc:
  <textarea readOnly value={prompt.content} />

  // ❌ TUYỆT ĐỐI CẤM: Không sử dụng dangerouslySetInnerHTML
  // <div dangerouslySetInnerHTML={{ __html: prompt.content }} />
  ```

### 3.3. CTRL-003: Giới Hạn Kích Thước Request & Validation Phía Máy Chủ
- **Triển khai Pydantic v2:**
  ```python
  class SystemPromptCreateRequest(BaseModel):
      name: str = Field(..., min_length=1, max_length=100)
      description: Optional[str] = Field(default=None, max_length=500)
      content: str = Field(..., min_length=1, max_length=10000)
      
      model_config = ConfigDict(
          str_strip_whitespace=False, # Giữ nguyên thụt lề cho content
          extra="forbid"               # Chống Mass Assignment (tấn công thêm trường lạ)
      )
  ```

### 3.4. CTRL-004: Chính Sách Nhật Ký An Toàn (Safe Privacy Logging)
- **Triển khai:**
  ```python
  # ✅ ĐÚNG: Chỉ ghi log metadata
  logger.info(
      "System prompt created successfully", 
      extra={"prompt_id": new_id, "user_id": user_id, "content_length": len(payload.content)}
  )

  # ❌ TUYỆT ĐỐI CẤM: In toàn bộ payload.content ra logs
  # logger.info(f"Created prompt: {payload.content}")
  ```

---

## 4. Đánh Giá Khả Năng Chịu Lỗi & Rủi Ro Tồn Đọng (Residual Risk Assessment)

Sau khi áp dụng toàn bộ các biện pháp kiểm soát `CTRL-001` đến `CTRL-007`:
- Rủi ro IDOR giảm từ **CRITICAL** xuống **LOW**.
- Rủi ro Stored XSS giảm từ **HIGH** xuống **VERY LOW** nhờ cơ chế auto-escaping tự nhiên của React.
- Rủi ro DoS giảm xuống **LOW** nhờ chặn trần 10.000 ký tự ở Pydantic.
- **Rủi ro tồn đọng duy nhất cần lưu ý cho tương lai:** Khi phân hệ này được tích hợp vào Project Builder hoặc Chat Runtime, nội dung của System Prompt có thể bị người dùng cố tình cấu hình để thực hiện Prompt Injection với mô hình bên ngoài. Rủi ro này sẽ được giải quyết triệt để tại pha tích hợp thông qua bộ lọc Guardrail độc lập.
