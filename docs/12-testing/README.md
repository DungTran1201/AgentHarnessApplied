# Giai Đoạn 12: Kiểm Thử & Đảm Bảo Chất Lượng (Testing & Quality Engineering)
## Hệ Thống Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Tổng Quan | Chi Tiết |
| :--- | :--- |
| **Giai đoạn** | **Phase 12 — Testing & Quality Engineering** |
| **Canonical Model** | `models/testing/testing.yaml` |
| **Trạng thái Giai đoạn** | **`READY_FOR_NEXT_PHASE`** |
| **Phụ thuộc Thượng nguồn** | `02-requirements`, `04-use-cases`, `08-api`, `10-security`, `11-ux` |
| **Đầu ra Bàn giao** | `13-operations` |

---

## 1. Mục Tiêu Giai Đoạn

Giai đoạn Testing xây dựng chiến lược, kế hoạch và danh mục các ca kiểm thử chi tiết đa tầng nhằm xác minh tính đúng đắn về chức năng (`FR-001` - `FR-014`), chất lượng phi chức năng (`NFR-001` - `NFR-019`), khả năng phòng thủ an ninh (`SEC-001` - `SEC-005`), và sự thông suốt của cơ chế Multi-Provider Failover (`ADR-003`).

---

## 2. Danh Mục Tài Liệu Giai Đoạn 12

| Tệp Tài Liệu | Mã Định Danh | Nội Dung Chính |
| :--- | :--- | :--- |
| [test-strategy.md](file:///c:/Users/PC/Project/ai-chan/docs/12-testing/test-strategy.md) | `TST-STRAT-001` | Chiến lược kiểm thử đa tầng theo Testing Pyramid (Unit, Integration, E2E), chính sách Mock LLM Gateway, quản lý dữ liệu kiểm thử. |
| [test-plan.md](file:///c:/Users/PC/Project/ai-chan/docs/12-testing/test-plan.md) | `TST-PLAN-001` | Tiêu chí vào/ra (Entry/Exit Criteria), 5 giai đoạn thực thi kiểm thử, quản lý rủi ro quota và cách ly database. |
| [test-cases.md](file:///c:/Users/PC/Project/ai-chan/docs/12-testing/test-cases.md) | `TST-CASES-001` | Đặc tả 15 ca kiểm thử chi tiết (`TC-001` đến `TC-015`) với tiền điều kiện, các bước thực hiện và kết quả mong đợi. |
| [traceability.md](file:///c:/Users/PC/Project/ai-chan/docs/12-testing/traceability.md) | `TST-TRC-001` | Ma trận truy vết kiểm thử 2 chiều kết nối `TC-001` - `TC-015` với FRS, AC, Use Cases và Security Controls. |

---

## 3. Cổng Chất Lượng & Trạng Thái Giai Đoạn (Quality Gate)

- **Độ bao phủ**: 100% các tiêu chí nghiệm thu (`AC-001` - `AC-005`) và kiểm soát an ninh (`CTRL-001` - `CTRL-004`) đều được bảo chứng bằng ít nhất 1 ca kiểm thử tương ứng (`TC-001` đến `TC-015`).
- **Trạng thái cổng chất lượng**: **`READY_FOR_NEXT_PHASE`** (Tiến hành Phase 13: Operations).
