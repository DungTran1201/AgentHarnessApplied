# Định Nghĩa Hoàn Thành (Definition of Done - DoD)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

Một giai đoạn tài liệu hoặc thay đổi kỹ thuật chỉ được xem là **HOÀN THÀNH (`DONE`)** khi đáp ứng đầy đủ 100% các tiêu chí kiểm tra dưới đây:

---

## 1. Tiêu Chí Tài Liệu & Phân Tích (Documentation & Analysis Gates)

- [x] **Xác định đúng Artifacts bắt buộc**: Lựa chọn chính xác danh mục tài liệu theo ma trận `.agents/config/artifact-matrix.yaml`.
- [x] **Khảo sát minh chứng hiện trạng**: Bám sát mã nguồn và cấu hình thực tế (`ai-infra/compose/docker-compose.yml`, các models).
- [x] **Phân tích tác động đầy đủ**: Xác định rõ phạm vi ảnh hưởng tới yêu cầu, kiến trúc, bảo mật, kiểm thử.
- [x] **Yêu cầu & Tiêu chí nghiệm thu rõ ràng**: Mọi FRS (`FR-001..014`) đều có mã định danh bất biến, tiêu chí `AC-001..005`.
- [x] **Đồng bộ hóa Canonical Models**: Thư mục `models/` định dạng YAML hợp lệ, phản ánh đúng dữ liệu nghiệp vụ.
- [x] **Hợp đồng & Sơ đồ chuẩn hóa**: OpenAPI 3.1.0, Sequence (`SEQ-001..004`), State (`STATE-001..003`), Threat Model (`THR-001..006`) đầy đủ.

---

## 2. Tiêu Chí An Ninh, Kiểm Thử & Vận Hành (Security, Testing & Ops Gates)

- [x] **Đặc tả kiểm soát an ninh**: 3 lớp phòng vệ (`CTRL-001..006`), phòng chống IDOR, XSS, CSRF, Brute-force.
- [x] **Kế hoạch & Ca kiểm thử toàn diện**: 15 Test Cases (`TC-001..015`) bao phủ 100% AC và P0 requirements.
- [x] **Minh chứng triển khai & vận hành**: Hướng dẫn triển khai Docker Compose (`DEP-001`), Runbook, Giám sát (`DEP-002`), phương án Rollback và Disaster Recovery rõ ràng.
- [x] **Không che giấu rủi ro**: Tất cả giả định (`ASSUMPTION`) và câu hỏi còn mở (`OPEN QUESTION`) đều được công khai minh bạch.
- [x] **Trạng thái phát triển mã nguồn**: Coding status được xác định rõ ràng là `NOT STARTED` cho đến khi toàn bộ hồ sơ kỹ thuật được phê duyệt.

---

## 3. Tiêu Chí Kiểm Tra Tự Động (Automated Validation Gate)

- [x] Lệnh `python tools/validators/run_all.py` thực thi thành công với:
  - `Failed checks: 0`
  - `Model validation: 0 error(s)`
  - `Documentation structure: 0 error(s)`
  - `Traceability review findings: 0`
