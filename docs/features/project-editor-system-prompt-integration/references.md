# 15. TÀI LIỆU THAM KHẢO & ĐÁNH GIÁ PHÁP LÝ (VERIFIED TECHNICAL REFERENCES)
## Phân Hệ: Tích Hợp Thư Viện System Prompt Vào Visual Project Editor & Chat Runtime
### Nền Tảng: AI-Chan Virtual Assistant Platform

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã Tài Liệu** | `DOC-SPN-REF-01` |
| **Trạng Thái** | `PROPOSED` |
| **Phiên Bản** | `1.0.0-MVP` |
| **Ngày Lập** | `2026-10-11` |

---

## 1. Nguồn Tham Khảo Kỹ Thuật Đã Được Xác Minh (Verified Sources)

Tất cả các nguồn tài liệu và repository dưới đây đều được khảo sát thực tế nhằm đưa ra các khuyến nghị có căn cứ kỹ thuật vững chắc:

### 1.1. React Flow / xyflow
- **Đường dẫn (URL):** [https://reactflow.dev/](https://reactflow.dev/) và [https://github.com/xyflow/xyflow](https://github.com/xyflow/xyflow)
- **Nội dung đã khảo sát:** Tài liệu về Custom Nodes, Multiple Handles per node (`<Handle type="target" position={Position.Left} id="instruction_in" />`), Custom Edge styling (stroke, strokeDasharray) và quy tắc thẩm định kết nối (`isValidConnection`).
- **Kết luận áp dụng:**
  - Áp dụng kỹ thuật Custom Multi-Handle để bổ sung cổng `Instruction In` độc lập trên Model Node.
  - Sử dụng CSS nét đứt màu vàng cam `#f59e0b` để biểu diễn trực quan cạnh kết nối chỉ dẫn, phân biệt rõ với cạnh dữ liệu `#a855f7`.
- **Giới hạn:** Canvas hiện tại của AI-Chan đang dùng custom SVG layer nhẹ; có thể nâng cấp lên `@xyflow/react` ở giai đoạn sau nếu cần mở rộng.
- **Ngày khảo sát:** 2026-10-11.
- **Giấy phép (License):** MIT License (Cho phép tự do thương mại hóa và tùy biến).

---

### 1.2. n8n Workflow Automation Docs
- **Đường dẫn (URL):** [https://docs.n8n.io/build/understand-workflows/workflow-components/connect-nodes-together/](https://docs.n8n.io/build/understand-workflows/workflow-components/connect-nodes-together/)
- **Nội dung đã khảo sát:** Khái niệm kết nối có kiểu giữa các node (Data Flow vs Configuration / Credential Flow), cơ chế validation chặn nối vòng lặp vô tận.
- **Kết luận áp dụng:**
  - Định nghĩa rõ ràng ngữ nghĩa cạnh nối: Cạnh từ `System Prompt → Model` mang bản chất **Configuration Flow (Instruction)** chứ không phải **Data Flow (User Input)**.
  - Chặn đứng mọi liên kết cố tình đưa prompt vào node xuất kết quả.
- **Ngày khảo sát:** 2026-10-11.
- **Bản quyền:** Thiết kế trải nghiệm của AI-Chan hoàn toàn độc lập, không sao chép giao diện hay mã nguồn bản quyền của n8n (Fair Use / Clean-room design).

---

### 1.3. Langflow & Flowise AI
- **Đường dẫn (URL):** [https://docs.langflow.org/](https://docs.langflow.org/) và [https://docs.flowiseai.com/](https://docs.flowiseai.com/)
- **Nội dung đã khảo sát:** Mô hình trực quan hóa LLM Chain: Tách biệt Node định nghĩa Prompt Template (hoặc System Message) với Model Node, truyền prompt vào cổng system của LLM component.
- **Kết luận áp dụng:**
  - Giữ Model Node làm trung tâm xử lý suy luận.
  - System Prompt Node đóng vai trò cung cấp ngữ cảnh tiền xử lý.
- **Ngày khảo sát:** 2026-10-11.
- **Giấy phép:** MIT License.

---

### 1.4. Google Gemini API Documentation
- **Đường dẫn (URL):** [https://ai.google.dev/gemini-api/docs/system-instructions](https://ai.google.dev/gemini-api/docs/system-instructions)
- **Nội dung đã khảo sát:** Cơ chế truyền System Instructions trong Gemini 1.5, 2.5 và 3.8 Flash qua tham số `system_instruction` của `GenerateContentConfig`.
- **Kết luận áp dụng:**
  - Không ghép prompt vào chuỗi tin nhắn của user.
  - Sử dụng cấu hình `system_instruction={"parts": [{"text": prompt_content}]}` để định hình hành vi mô hình ngay từ tầng nền tảng.
- **Ngày khảo sát:** 2026-10-11.

---

### 1.5. OpenAI API Documentation
- **Đường dẫn (URL):** [https://platform.openai.com/docs/guides/text-generation](https://platform.openai.com/docs/guides/text-generation)
- **Nội dung đã khảo sát:** Cấu trúc message array với vai trò `role: "system"` và `role: "developer"` (dành cho mô hình o1/o3-mini).
- **Kết luận áp dụng:**
  - Nạp nội dung prompt vào message đầu tiên với role `"system"`.
  - Giữ nguyên tin nhắn của user ở `role: "user"`.
- **Ngày khảo sát:** 2026-10-11.

---

### 1.6. OWASP Top 10 for Large Language Model Applications
- **Đường dẫn (URL):** [https://genai.owasp.org/llm-top-10/](https://genai.owasp.org/llm-top-10/)
- **Nội dung đã khảo sát:**
  - **LLM01: Prompt Injection:** Kẻ tấn công lạm dụng đầu vào của user để ghi đè chỉ dẫn hệ thống.
  - **LLM02: Sensitive Information Disclosure:** Rò rỉ dữ liệu nhạy cảm hoặc secret thông qua phản hồi hoặc log hệ thống.
- **Kết luận áp dụng:**
  - Cưỡng chế cơ chế phân tách vai trò (Role Separation) để giảm thiểu tối đa rủi ro Prompt Injection.
  - Thiết lập chính sách cấm log nội dung prompt thô vào nhật ký hệ thống.
- **Ngày khảo sát:** 2026-10-11.

---

### 1.7. OWASP Cheat Sheet Series
- **Đường dẫn (URL):** [https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- **Nội dung đã khảo sát:** Hướng dẫn phòng chống Insecure Direct Object Reference (Anti-IDOR) và kiểm soát truy cập phân tầng.
- **Kết luận áp dụng:**
  - Thẩm định quyền sở hữu `user_id` trên mọi truy vấn phân giải System Prompt trước khi nạp vào LLM.
- **Ngày khảo sát:** 2026-10-11.
