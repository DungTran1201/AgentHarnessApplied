# ADR-015 — Development Workspace and Agent Runner Architecture

Status: ACCEPTED  
Date: 2026-10-15  
Implemented: Prompt 04 (Migration 011, Backend Router, Host Runner CLI, Frontend UI)
Author: Solution Architect & DevSecOps Lead  
Context: Prompt 01 — AI-Chan Development Orchestrator Baseline

---

## Context
AI-Chan currently models AI workflows as visual node-based graphs (`projects` table with `graph_data` JSON) designed for conversational Q&A and Discord bots. There is a requirement to introduce the **AI-Chan Development Orchestrator**, which enables AI coding agents (such as Antigravity CLI and Claude Code) to execute development tasks (read code, generate diffs, execute tests, run git operations) on physical software repositories.

A software repository lives on a developer workstation or build machine (`Host Filesystem`), which may be located behind private NATs, corporate firewalls, or dynamic IP addresses. Directly executing terminal commands on the central backend introduces Remote Code Execution (RCE) hazards. Furthermore, conflating visual project graphs with local directory paths violates single-responsibility principles and risks schema corruption.

## Decision
1. **Domain Boundary Decoupling:** Introduce two first-class domain models:
   - `Development Workspace`: Canonical entity representing a software repository (local host path and/or remote git reference, default branch, validation status, owner).
   - `Agent Runner`: Canonical entity representing a host-side execution agent installed on the developer workstation.
   - At MVP, an AI-Chan Project links **1:1** to a Development Workspace, while the underlying schema supports **1:N** for future multi-repository composition.
2. **Outbound Reverse Connection Pattern:** The Agent Runner initiates an **outbound** authenticated connection (HTTP long-polling with SSE event streaming) to the AI-Chan Backend. The backend and developer machine never open an inbound remote shell port.
3. **Challenge/Token-based Pairing:** Runners pair with the backend using a short-lived (15-minute TTL), single-use Pairing Token (`rpt_...`). Once paired, the backend issues an ed25519-signed or hashed Runner Secret Key (`rsk_...`) and registers a machine fingerprint.
4. **Validation Delegation:** Local filesystem paths cannot be validated by the centralized backend directly because the files exist only on the Runner's machine. The backend delegates workspace path validation to the associated Runner via an asynchronous or challenge-response validation contract.

## Alternatives Considered
- **Direct Backend Subprocess Execution:** Run CLI tools directly on the backend server.
  - *Rejected:* Fatal security hazard (arbitrary command injection/RCE) if backend is hosted publicly. Additionally, the backend server does not have access to the developer's local repositories.
- **Inbound SSH/PTY Daemon on Developer Host:** Backend connects into developer host via SSH/TCP port.
  - *Rejected:* Requires opening firewall ports, configuring dynamic DNS/port-forwarding, and managing host SSH keys. Unacceptable for enterprise or home network environments.
- **Storing Workspace Paths in `projects.graph_data`:** Overload existing project JSON.
  - *Rejected:* Causes schema clutter, confuses the visual canvas editor, and fails normalization.

## Rationale
- The Outbound Runner model provides enterprise-grade network security without requiring VPNs or NAT traversal workarounds.
- Delegating path and git validation to the Runner guarantees ground-truth verification on the actual filesystem.
- Decoupling Project from Workspace allows projects to be shared or templated without hardcoding developer-specific absolute paths.

## Consequences
- **Positive:**
  - Robust security: No RCE vulnerability on backend; developer host is protected behind firewall.
  - Full traceability: Every workspace and runner action is audited and owned by an authenticated user.
  - Seamless developer experience: Works across Windows, macOS, and Linux without firewall reconfiguration.
- **Negative:**
  - Requires developers to run a lightweight runner process (`ai-chan-runner` or embedded local worker) on their machine.
  - Introduces runner state synchronization overhead (heartbeats, offline detection).

## Risks / Follow-up
- Runner disconnection during active task execution: Task lifecycle must detect heartbeat timeout and transition tasks to `ABORTED` or `PAUSED`.
- Secret leakage in runner environment: Runners must filter environment variables before reporting system capabilities.

## Related Requirements
- `FR-WKR-001` to `FR-WKR-012` (Workspace Management)
- `FR-RUN-001` to `FR-RUN-014` (Runner Lifecycle & Pairing)
- `SEC-WKR-001` to `SEC-WKR-010` (Security & Tenant Isolation)
