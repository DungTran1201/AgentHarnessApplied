# Ma Trận Truy Vết Toàn Diện Vòng Đời Dự Án (End-to-End Governance Traceability)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã tài liệu** | `GOV-TRC-001` |
| **Giai đoạn** | **Phase 14 — Governance & Lifecycle Management** |
| **Trạng thái** | **BASELINED** |

---

## 1. Chuỗi Truy Vết Vòng Đời Kỹ Thuật (Traceability Chain)

Mọi thay đổi trong hệ thống AI-Chan đều được xâu chuỗi liên tục theo luồng:

```
Mục Tiêu Nghiệp Vụ (Business Goal)
        ↓
Năng Lực Hệ Thống (Capability: CAP-AUTH, CAP-CONV, CAP-CHAT, CAP-AI, CAP-SEC)
        ↓
Yêu Cầu (Requirements: FR-001..014, NFR-001..019, BR-001..006, SEC-001..005)
        ↓
Tiêu Chí Nghiệm Thu (Acceptance Criteria: AC-001..005)
        ↓
Quy Trình Nghiệp Vụ (Business Process: PROC-001..010)
        ↓
Trường Hợp Sử Dụng (Use Cases: UC-001..009)
        ↓
Phân Tích Hệ Thống (System Analysis & Boundary)
        ↓
Kiến Trúc & Quyết Định (Architecture: SAD C4, ADR-001..004)
        ↓
Mô Hình Miền (Domain: DOM-001..004, Invariants: INV-01..04)
        ↓
Hợp Đồng Giao Tiếp (API: API-001..008, OpenAPI 3.1.0)
        ↓
Hành Vi Động (Behavior: SEQ-001..004, STATE-001..003)
        ↓
An Ninh & Kiểm Soát (Security: STRIDE THR-001..006, Controls: CTRL-001..006)
        ↓
Trải Nghiệm Người Dùng (UX: UX-001..005, Screens: SCR-001..002)
        ↓
Kiểm Thử & Đảm Bảo Chất Lượng (Testing: TC-001..015)
        ↓
Vận Hành & Triển Khai (Operations: DEP-001..002, Runbook, Monitoring)
        ↓
Quản Trị Vòng Đời (Governance: ADR Index, Glossary, DoD)
```

---

## 2. Bảng Tổng Hợp Ánh Xạ Xuyên Suốt (Cross-Phase Traceability Summary)

| Phân Hệ Chức Năng | Năng Lực Cốt Lõi | FRS & AC | Use Cases | API Contract | Sơ Đồ Tuần Tự | Kiểm Soát An Ninh | Ca Kiểm Thử |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Xác thực & Tài khoản** | `CAP-AUTH`, `CAP-SEC` | `FR-001` - `FR-004`, `AC-001`, `AC-002` | `UC-001`, `UC-002`, `UC-003` | `API-001` - `API-004` | `SEQ-001` | `CTRL-001`, `CTRL-005` | `TC-001` - `TC-006` |
| **Quản lý Cuộc trò chuyện** | `CAP-CONV` | `FR-005`, `FR-006`, `AC-003` | `UC-004`, `UC-005`, `UC-006` | `API-005` - `API-008` | `SEQ-002` | `CTRL-002` (IDOR Guard) | `TC-007` - `TC-011` |
| **Chat Dòng Chảy & Failover** | `CAP-CHAT`, `CAP-AI` | `FR-007` - `FR-014`, `AC-004`, `AC-005` | `UC-007`, `UC-008`, `UC-009` | `API-009` (Stream SSE) | `SEQ-003`, `SEQ-004` | `CTRL-003`, `CTRL-004` | `TC-012` - `TC-015` |
