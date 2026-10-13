# Hệ Thống Sơ Đồ Trực Quan Kỹ Thuật (Master Diagram Index)
## Dự Án: Website Chatbot Trợ Lý Ảo (AI-Chan Assistant)

---

| Thông Tin Thư Mục | Chi Tiết |
| :--- | :--- |
| **Thư mục gốc** | `diagrams/` |
| **Vai Trò Kỹ Thuật** | **Rendered Views (Các hình chiếu trực quan phái sinh)** |
| **Nguồn Sự Thật (Source of Truth)** | [docs/](file:///c:/Users/PC/Project/ai-chan/docs/) (Tài liệu đặc tả) và [models/](file:///c:/Users/PC/Project/ai-chan/models/) (Mô hình canonical máy đọc) |
| **Quy Tắc Quản Trị** | Tuân thủ [.agents/rules/diagrams.md](file:///c:/Users/PC/Project/ai-chan/.agents/rules/diagrams.md): Sơ đồ KHÔNG BAO GIỜ là nguồn sự thật duy nhất; không tự ý bịa đặt actor/service/trạng thái; các nhánh rẽ phải có điều kiện rõ ràng |

---

## 1. Mục Lục Toàn Bộ Các Sơ Đồ Hệ Thống

| Thư Mục Con | Loại Sơ Đồ | Tệp Sơ Đồ Chi Tiết | Mã Sơ Đồ / Kịch Bản | Nguồn Sự Thật Thượng Nguồn |
| :--- | :--- | :--- | :--- | :--- |
| **`context/`** | System Context | [system-context.md](file:///c:/Users/PC/Project/ai-chan/diagrams/context/system-context.md) | `DIAG-CTX-001` | [docs/05-system-analysis/system-context.md](file:///c:/Users/PC/Project/ai-chan/docs/05-system-analysis/system-context.md) |
| **`component/`** | C4 Component | [component-architecture.md](file:///c:/Users/PC/Project/ai-chan/diagrams/component/component-architecture.md) | `DIAG-COMP-001` | [docs/06-architecture/sad.md](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/sad.md) |
| **`bpmn/`** | BPMN Process | [registration-bpmn.md](file:///c:/Users/PC/Project/ai-chan/diagrams/bpmn/registration-bpmn.md) | `DIAG-BPMN-001 [PROC-001]` | [docs/03-business-process/process-flows.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/process-flows.md) |
| **`bpmn/`** | BPMN Process | [login-bpmn.md](file:///c:/Users/PC/Project/ai-chan/diagrams/bpmn/login-bpmn.md) | `DIAG-BPMN-002 [PROC-002]` | [docs/03-business-process/process-flows.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/process-flows.md) |
| **`bpmn/`** | BPMN Process | [chat-bpmn.md](file:///c:/Users/PC/Project/ai-chan/diagrams/bpmn/chat-bpmn.md) | `DIAG-BPMN-003 [PROC-008]` | [docs/03-business-process/process-flows.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/process-flows.md) |
| **`bpmn/`** | BPMN Process | [ai-failover-bpmn.md](file:///c:/Users/PC/Project/ai-chan/diagrams/bpmn/ai-failover-bpmn.md) | `DIAG-BPMN-004 [PROC-009]` | [docs/06-architecture/ADR/ADR-003-multi-provider-llm-failover.md](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/ADR/ADR-003-multi-provider-llm-failover.md) |
| **`bpmn/`** | BPMN Process | [discord-auth-bpmn.md](file:///c:/Users/PC/Project/ai-chan/diagrams/bpmn/discord-auth-bpmn.md) | `DIAG-BPMN-008 [PROC-014]` | [docs/03-business-process/business-process-catalog.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/business-process-catalog.md) |
| **`bpmn/`** | BPMN Process | [resource-management-bpmn.md](file:///c:/Users/PC/Project/ai-chan/diagrams/bpmn/resource-management-bpmn.md) | `DIAG-BPMN-009 [PROC-015..016]` | [docs/03-business-process/business-process-catalog.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/business-process-catalog.md) |
| **`bpmn/`** | BPMN Process | [model-management-bpmn.md](file:///c:/Users/PC/Project/ai-chan/diagrams/bpmn/model-management-bpmn.md) | `DIAG-BPMN-010 [PROC-017..018]` | [docs/03-business-process/business-process-catalog.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/business-process-catalog.md) |
| **`bpmn/`** | BPMN Process | [discord-link-unlink-bpmn.md](file:///c:/Users/PC/Project/ai-chan/diagrams/bpmn/discord-link-unlink-bpmn.md) | `DIAG-BPMN-011 [PROC-019..020]` | [docs/03-business-process/business-process-catalog.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/business-process-catalog.md) |
| **`bpmn/`** | BPMN Process | [discord-bot-management-bpmn.md](file:///c:/Users/PC/Project/ai-chan/diagrams/bpmn/discord-bot-management-bpmn.md) | `DIAG-BPMN-013 [PROC-022..023]` | [docs/03-business-process/business-process-catalog.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/business-process-catalog.md) |
| **`swimlane/`** | Swimlane | [auth-swimlane.md](file:///c:/Users/PC/Project/ai-chan/diagrams/swimlane/auth-swimlane.md) | `DIAG-SWIM-001` | [docs/03-business-process/actor-interactions.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/actor-interactions.md) |
| **`swimlane/`** | Swimlane | [chat-stream-swimlane.md](file:///c:/Users/PC/Project/ai-chan/diagrams/swimlane/chat-stream-swimlane.md) | `DIAG-SWIM-002` | [docs/03-business-process/actor-interactions.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/actor-interactions.md) |
| **`swimlane/`** | Swimlane | [conversation-lifecycle-swimlane.md](file:///c:/Users/PC/Project/ai-chan/diagrams/swimlane/conversation-lifecycle-swimlane.md) | `DIAG-SWIM-003` | [docs/03-business-process/process-flows.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/process-flows.md) |
| **`swimlane/`** | Swimlane | [user-management-swimlane.md](file:///c:/Users/PC/Project/ai-chan/diagrams/swimlane/user-management-swimlane.md) | `DIAG-SWIM-004` | [docs/03-business-process/business-process-catalog.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/business-process-catalog.md) |
| **`swimlane/`** | Swimlane | [discord-oauth-swimlane.md](file:///c:/Users/PC/Project/ai-chan/diagrams/swimlane/discord-oauth-swimlane.md) | `DIAG-SWIM-005` | [docs/03-business-process/business-process-catalog.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/business-process-catalog.md) |
| **`swimlane/`** | Swimlane | [resource-management-swimlane.md](file:///c:/Users/PC/Project/ai-chan/diagrams/swimlane/resource-management-swimlane.md) | `DIAG-SWIM-006` | [docs/03-business-process/business-process-catalog.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/business-process-catalog.md) |
| **`swimlane/`** | Swimlane | [model-management-swimlane.md](file:///c:/Users/PC/Project/ai-chan/diagrams/swimlane/model-management-swimlane.md) | `DIAG-SWIM-007` | [docs/03-business-process/business-process-catalog.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/business-process-catalog.md) |
| **`swimlane/`** | Swimlane | [discord-link-unlink-swimlane.md](file:///c:/Users/PC/Project/ai-chan/diagrams/swimlane/discord-link-unlink-swimlane.md) | `DIAG-SWIM-008` | [docs/03-business-process/business-process-catalog.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/business-process-catalog.md) |
| **`swimlane/`** | Swimlane | [discord-bot-management-swimlane.md](file:///c:/Users/PC/Project/ai-chan/diagrams/swimlane/discord-bot-management-swimlane.md) | `DIAG-SWIM-010` | [docs/03-business-process/business-process-catalog.md](file:///c:/Users/PC/Project/ai-chan/docs/03-business-process/business-process-catalog.md) |
| **`sequence/`** | Sequence | [auth-sequence.md](file:///c:/Users/PC/Project/ai-chan/diagrams/sequence/auth-sequence.md) | `DIAG-SEQ-001 [SEQ-001..002]` | [docs/09-behavior/sequence-diagrams.md](file:///c:/Users/PC/Project/ai-chan/docs/09-behavior/sequence-diagrams.md) |
| **`sequence/`** | Sequence | [chat-stream-sequence.md](file:///c:/Users/PC/Project/ai-chan/diagrams/sequence/chat-stream-sequence.md) | `DIAG-SEQ-002 [SEQ-003]` | [docs/09-behavior/sequence-diagrams.md](file:///c:/Users/PC/Project/ai-chan/docs/09-behavior/sequence-diagrams.md) |
| **`sequence/`** | Sequence | [failover-sequence.md](file:///c:/Users/PC/Project/ai-chan/diagrams/sequence/failover-sequence.md) | `DIAG-SEQ-003 [SEQ-004]` | [docs/09-behavior/sequence-diagrams.md](file:///c:/Users/PC/Project/ai-chan/docs/09-behavior/sequence-diagrams.md) |
| **`sequence/`** | Sequence | [update-profile-sequence.md](file:///c:/Users/PC/Project/ai-chan/diagrams/sequence/update-profile-sequence.md) | `DIAG-SEQ-004` | [docs/09-behavior/sequence-diagrams.md](file:///c:/Users/PC/Project/ai-chan/docs/09-behavior/sequence-diagrams.md) |
| **`sequence/`** | Sequence | [change-email-sequence.md](file:///c:/Users/PC/Project/ai-chan/diagrams/sequence/change-email-sequence.md) | `DIAG-SEQ-004-E` | [docs/09-behavior/sequence-diagrams.md](file:///c:/Users/PC/Project/ai-chan/docs/09-behavior/sequence-diagrams.md) |
| **`sequence/`** | Sequence | [change-password-sequence.md](file:///c:/Users/PC/Project/ai-chan/diagrams/sequence/change-password-sequence.md) | `DIAG-SEQ-004-P` | [docs/09-behavior/sequence-diagrams.md](file:///c:/Users/PC/Project/ai-chan/docs/09-behavior/sequence-diagrams.md) |
| **`sequence/`** | Sequence | [agent-management-sequence.md](file:///c:/Users/PC/Project/ai-chan/diagrams/sequence/agent-management-sequence.md) | `DIAG-SEQ-005` | [docs/09-behavior/sequence-diagrams.md](file:///c:/Users/PC/Project/ai-chan/docs/09-behavior/sequence-diagrams.md) |
| **`sequence/`** | Sequence | [discord-oauth-sequence.md](file:///c:/Users/PC/Project/ai-chan/diagrams/sequence/discord-oauth-sequence.md) | `DIAG-SEQ-006` | [docs/09-behavior/sequence-diagrams.md](file:///c:/Users/PC/Project/ai-chan/docs/09-behavior/sequence-diagrams.md) |
| **`sequence/`** | Sequence | [resource-telemetry-sequence.md](file:///c:/Users/PC/Project/ai-chan/diagrams/sequence/resource-telemetry-sequence.md) | `DIAG-SEQ-007 [SEQ-007]` | [models/interaction/interactions.yaml](file:///c:/Users/PC/Project/ai-chan/models/interaction/interactions.yaml) |
| **`sequence/`** | Sequence | [model-mutation-sequence.md](file:///c:/Users/PC/Project/ai-chan/diagrams/sequence/model-mutation-sequence.md) | `DIAG-SEQ-008 [SEQ-008]` | [models/interaction/interactions.yaml](file:///c:/Users/PC/Project/ai-chan/models/interaction/interactions.yaml) |
| **`sequence/`** | Sequence | [discord-link-unlink-sequence.md](file:///c:/Users/PC/Project/ai-chan/diagrams/sequence/discord-link-unlink-sequence.md) | `DIAG-SEQ-009 [SEQ-009]` | [models/interaction/interactions.yaml](file:///c:/Users/PC/Project/ai-chan/models/interaction/interactions.yaml) |
| **`sequence/`** | Sequence | [discord-bot-management-sequence.md](file:///c:/Users/PC/Project/ai-chan/diagrams/sequence/discord-bot-management-sequence.md) | `DIAG-SEQ-011 [SEQ-011]` | [models/interaction/interactions.yaml](file:///c:/Users/PC/Project/ai-chan/models/interaction/interactions.yaml) |
| **`state/`** | State Machine | [conversation-state.md](file:///c:/Users/PC/Project/ai-chan/diagrams/state/conversation-state.md) | `DIAG-STATE-001 [STATE-001]` | [docs/09-behavior/state-machines.md](file:///c:/Users/PC/Project/ai-chan/docs/09-behavior/state-machines.md) |
| **`state/`** | State Machine | [message-state.md](file:///c:/Users/PC/Project/ai-chan/diagrams/state/message-state.md) | `DIAG-STATE-002 [STATE-002]` | [docs/09-behavior/state-machines.md](file:///c:/Users/PC/Project/ai-chan/docs/09-behavior/state-machines.md) |
| **`state/`** | State Machine | [session-state.md](file:///c:/Users/PC/Project/ai-chan/diagrams/state/session-state.md) | `DIAG-STATE-003 [STATE-003]` | [docs/09-behavior/state-machines.md](file:///c:/Users/PC/Project/ai-chan/docs/09-behavior/state-machines.md) |
| **`state/`** | State Machine | [user-account-state.md](file:///c:/Users/PC/Project/ai-chan/diagrams/state/user-account-state.md) | `DIAG-STATE-004 [STATE-004]` | [docs/09-behavior/state-machines.md](file:///c:/Users/PC/Project/ai-chan/docs/09-behavior/state-machines.md) |
| **`state/`** | State Machine | [quota-lifecycle-state.md](file:///c:/Users/PC/Project/ai-chan/diagrams/state/quota-lifecycle-state.md) | `DIAG-STATE-005 [STATE-005]` | [docs/09-behavior/state-machines.md](file:///c:/Users/PC/Project/ai-chan/docs/09-behavior/state-machines.md) |
| **`state/`** | State Machine | [model-lifecycle-extended-state.md](file:///c:/Users/PC/Project/ai-chan/diagrams/state/model-lifecycle-extended-state.md) | `DIAG-STATE-006 [STATE-004]` | [docs/09-behavior/state-machines.md](file:///c:/Users/PC/Project/ai-chan/docs/09-behavior/state-machines.md) |
| **`state/`** | State Machine | [discord-link-state.md](file:///c:/Users/PC/Project/ai-chan/diagrams/state/discord-link-state.md) | `DIAG-STATE-007 [STATE-006]` | [docs/09-behavior/state-machines.md](file:///c:/Users/PC/Project/ai-chan/docs/09-behavior/state-machines.md) |
| **`state/`** | State Machine | [discord-bot-config-state.md](file:///c:/Users/PC/Project/ai-chan/diagrams/state/discord-bot-config-state.md) | `DIAG-STATE-009 [STATE-007]` | [docs/09-behavior/state-machines.md](file:///c:/Users/PC/Project/ai-chan/docs/09-behavior/state-machines.md) |
| **`deployment/`**| Deployment | [deployment-topology.md](file:///c:/Users/PC/Project/ai-chan/diagrams/deployment/deployment-topology.md) | `DIAG-DEP-001 [DEP-001]` | [docs/06-architecture/deployment-concept.md](file:///c:/Users/PC/Project/ai-chan/docs/06-architecture/deployment-concept.md) |





---

## 2. Nguyên Tắc Quản Trị & Cập Nhật

1. Khi yêu cầu hoặc kiến trúc thay đổi, cập nhật `models/` và `docs/` trước; sau đó mới cập nhật lại các sơ đồ tương ứng tại đây.
2. Không thêm bất kỳ thành phần hư cấu nào (no invented components/actors/endpoints).
3. Mọi quyết định rẽ nhánh đều có điều kiện tường minh (`conditions`).
