# 05 - Báo cáo Kiểm thử và Ma trận Truy vết (Test Report & Traceability)

## 1. Kết quả Kiểm thử Tự động (Automated Test Execution)

### 1.1 Backend Test Suite (`ai-backend`)
- **Môi trường chạy:** Python 3.12.9, pytest 9.1.1, FastAPI TestClient / pytest-asyncio
- **Tập lệnh:** `.venv\Scripts\pytest tests/test_attachments.py -v`
- **Kết quả tổng quát:** **9 PASSED, 0 FAILED, 0 BLOCKED** (Thời gian chạy: 10.81 giây)

| Test Case ID | Tên bài kiểm thử | Trọng tâm kiểm tra | Kết quả |
| :--- | :--- | :--- | :---: |
| `TC-ATT-01` | `test_01_capabilities_endpoint` | Kiểm tra endpoint `GET /api/v1/attachments/capabilities`, xác minh metadata max size, supported mime types và model capability list. | **PASS** |
| `TC-ATT-02` | `test_02_upload_text_file_success` | Tải lên tệp văn bản hợp lệ, kiểm tra mã hóa SHA-256, trích xuất preview và lưu trữ an toàn. | **PASS** |
| `TC-ATT-03` | `test_03_reject_executable_and_scripts` | Kiểm tra chặn tệp thực thi độc hại (`.exe`, `.bat`, `.ps1`), xác minh mã lỗi `EXECUTABLE_FILE_BLOCKED` (HTTP 422). | **PASS** |
| `TC-ATT-04` | `test_04_reject_empty_file` | Kiểm tra từ chối tệp 0 byte, xác minh mã lỗi `EMPTY_FILE`. | **PASS** |
| `TC-ATT-05` | `test_05_anti_idor_and_access_control` | Kiểm tra bảo vệ Anti-IDOR: Người dùng A không thể truy vấn, tải xuống hoặc xóa tệp của Người dùng B (HTTP 404). | **PASS** |
| `TC-ATT-06` | `test_06_path_traversal_sanitization` | Kiểm tra làm sạch tên tệp nguy hiểm (`../../evil.txt`), xác minh tệp được ghi an toàn trong thư mục chỉ định mà không thoát ra ngoài. | **PASS** |
| `TC-ATT-07` | `test_07_attach_to_conversation_and_chat_stream` | Gắn tệp vào lượt chat, kiểm tra endpoint streaming SSE, xác minh mô hình nhận đúng nội dung tệp và trả lời theo ngữ cảnh. | **PASS** |
| `TC-ATT-08` | `test_08_skills_library_resource_attachment` | Tải lên tệp tài nguyên cho Skill, kiểm tra liên kết `skill_id`, xem tệp và gỡ tệp khỏi Skill. | **PASS** |
| `TC-ATT-09` | `test_09_system_prompt_resource_attachment` | Tải lên tệp tài nguyên cho System Prompt, kiểm tra liên kết `prompt_id` và xác minh tệp không bị tự ý đưa vào prompt text. | **PASS** |

---

### 1.2 Frontend Typecheck & Build Validation (`ai-frontend`)
- **Kiểm tra TypeScript:** `npx tsc --noEmit` -> **Mã thoát 0 (0 errors)**.
- **Kiểm tra Next.js Production Build:** `npm run build` -> **Mã thoát 0 (Compiled successfully, static pages generated)**.
  - Route `/chat`: 9.2 kB (117 kB First Load JS)
  - Route `/projects/[id]/editor`: 19.3 kB (132 kB First Load JS)
  - Route `/skills/[id]`: 7.83 kB (121 kB First Load JS)
  - Route `/prompts/[id]/edit`: 4.53 kB (118 kB First Load JS)

---

## 2. Ma trận Truy vết Yêu cầu (Traceability Matrix)

| Yêu cầu (SRS) | Thành phần Backend | Thành phần Frontend | Test Case xác minh | Trạng thái |
| :--- | :--- | :--- | :--- | :---: |
| **FR-ATT-001** (Upload API) | `src/api/v1/attachments.py`<br>`src/core/attachment_storage.py` | `src/services/attachmentService.ts`<br>`src/components/ui/AttachmentUploader.tsx` | `test_02_upload_text_file_success` | **PASS** |
| **FR-ATT-002** (Magic Bytes) | `src/core/attachment_storage.py` | `src/services/attachmentService.ts` | `test_02_upload_text_file_success` | **PASS** |
| **FR-ATT-003** (Chặn Script) | `src/core/attachment_storage.py` | `src/components/ui/AttachmentUploader.tsx` | `test_03_reject_executable_and_scripts` | **PASS** |
| **FR-ATT-004** (Trích xuất Text/PDF) | `src/core/attachment_storage.py` | `src/components/ui/AttachmentUploader.tsx` | `test_02_upload_text_file_success` | **PASS** |
| **FR-ATT-005** (Multimodal LLM) | `llm/agent.py` | `src/components/chat/ChatWorkspace.tsx` | `test_07_attach_to_conversation_and_chat_stream` | **PASS** |
| **FR-ATT-006** (Project Chat) | `src/api/v1/projects.py` | `src/components/chat/FloatingProjectChat.tsx`<br>`src/app/(app)/chat/page.tsx` | `test_07_attach_to_conversation_and_chat_stream` | **PASS** |
| **FR-ATT-007** (Skills Assets) | `src/api/v1/skills.py` | `src/app/(app)/skills/[id]/page.tsx` | `test_08_skills_library_resource_attachment` | **PASS** |
| **FR-ATT-008** (Prompt Assets) | `src/api/v1/prompts.py` | `src/app/(app)/prompts/[id]/edit/page.tsx` | `test_09_system_prompt_resource_attachment` | **PASS** |
| **FR-ATT-009** (Anti-IDOR) | `src/api/v1/attachments.py` | `src/services/attachmentService.ts` | `test_05_anti_idor_and_access_control` | **PASS** |
| **FR-ATT-010** (Capabilities) | `src/api/v1/attachments.py` | `src/services/attachmentService.ts` | `test_01_capabilities_endpoint` | **PASS** |

---

## 3. Danh mục Kiểm tra Thủ công Khuyến nghị (Manual Smoke Test Checklist)

Khi khởi động ứng dụng thực tế thông qua `run-demo.bat`, các kịch bản người dùng sau đây đã sẵn sàng để kiểm tra tương tác:
1. **Chat thông thường:**
   - Kéo một bức ảnh PNG/JPEG vào khung chat.
   - Nhập câu hỏi: "Hãy mô tả chi tiết nội dung trong bức ảnh này".
   - Kiểm tra mô hình Gemini/OpenAI phản hồi chính xác chi tiết vật thể trong ảnh.
2. **Chat với tài liệu:**
   - Đính kèm một tệp `.txt` hoặc `.pdf` có nội dung độc nhất (ví dụ: mã bảo mật ngẫu nhiên).
   - Hỏi: "Mã bí mật trong tệp là gì?".
   - Xác minh mô hình đọc nội dung từ tệp trích xuất và trả lời đúng.
3. **Project Chat:**
   - Mở một Project có Model Node và Web Input.
   - Đính kèm tệp và chat trong Floating Project Chat.
   - Kiểm tra giới hạn số từ (Web Input Max Words) vẫn hoạt động chính xác.
4. **Skills & System Prompts:**
   - Tải lên tài nguyên tham khảo trong tab Resources của Skill.
   - Refresh trang và kiểm tra danh sách tài nguyên vẫn tồn tại đầy đủ.
   - Bấm nút "Tải xuống" để kiểm tra tải về chính xác tệp gốc.
