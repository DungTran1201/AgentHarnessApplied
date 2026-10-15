# Security Specification & Threat Model
## Capability: Development Workspace & Agent Runner

> **Document ID:** SEC-ORCH-01  
> **Version:** 1.0.0  
> **Methodology:** STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege)  
> **Target Boundaries:** Browser <-> Backend Control Plane <-> Agent Runner <-> Host Filesystem  
> **Fact Classification:** `FACT` (existing security audit), `DECISION` (security controls and policy).

---

## 1. Asset Inventory & Trust Boundaries

### 1.1 Critical Assets
1. **Developer Source Code & Git History:** Intellectual property located on developer workstation.
2. **Runner Secret Keys (`rsk_...`):** Bearer credentials authorizing runners to receive tasks and submit logs.
3. **Task Instructions & Environment Secrets:** Prompts, diffs, and developer configurations.
4. **Backend Database (`app.db`):** User accounts, workspace configurations, and task history.

### 1.2 Trust Boundaries

```
[ Developer Browser ]
       |
       |  Trust Boundary 1: Public Internet / TLS (User JWT / Session Cookie)
       v
[ AI-Chan Central Backend ]
       |
       |  Trust Boundary 2: Outbound Reverse Tunnel (Runner Secret Key - Bearer)
       v
[ Local Agent Runner Daemon ]
       |
       |  Trust Boundary 3: OS Process & Filesystem Security Boundary
       v
[ Host Filesystem / CLI Tools / Git Repo ]
```

---

## 2. Comprehensive Threat Analysis (STRIDE)

| Threat ID | Threat Category | Threat Description & Attack Vector | Impact | Security Control & Countermeasure | Control ID | Status |
|---|---|---|---|---|---|---|
| **THR-01** | Elevation of Privilege | **Arbitrary Command Execution (RCE) on Backend:** Attacker passes shell metacharacters in workspace path or name to trigger commands on the backend server. | Critical | Backend does **not** execute any subprocesses. Path strings are validated as literals and delegated strictly to the isolated Runner. Backend never uses `shell=True` or passes unescaped inputs. | **CTRL-01** | Enforced by Architecture |
| **THR-02** | Tampering / Info Disclosure | **Path Traversal on Host:** Attacker specifies `../../Windows/System32` or `/etc/shadow` as workspace path to inspect or overwrite system files. | Critical | Runner validates that `local_path` is an absolute canonical path using `os.path.realpath`. All subsequent task edits and file reads are bounded inside `workspace.root_path` using path prefix checks (`commonpath`). | **CTRL-02** | Mandatory in Runner |
| **THR-03** | Elevation of Privilege | **Cross-Tenant Access / IDOR:** Attacker swaps `workspace_id` or `runner_id` in API requests to dispatch tasks to another user's machine or inspect their repo. | High | Every database query enforces tenant isolation: `WHERE id = :id AND user_id = :current_user_id`. Mismatched requests return `404 Not Found` to prevent entity enumeration. | **CTRL-03** | Enforced in API Layer |
| **THR-04** | Spoofing | **Runner Impersonation:** Attacker spoofs an Agent Runner by guessing IDs to steal tasks or inject malicious validation results. | High | Permanent runner credentials use cryptographically random 256-bit entropy (`rsk_...`). The backend stores only salted SHA-256 hashes. Requests without valid bearer headers fail authentication. | **CTRL-04** | Enforced in Auth Filter |
| **THR-05** | Information Disclosure | **Log & Telemetry Secret Leakage:** Agent terminal output contains API keys, passwords, or tokens printed by build scripts or tests. | High | Runner applies a regex redaction pipeline before streaming stdout/stderr (masks patterns like `sk-...`, `Bearer ...`, `ghp_...`, passwords). Environment variables are excluded from capability scans. | **CTRL-05** | Mandatory in Runner |
| **THR-06** | Tampering | **Replay Attack on Pairing Token:** Attacker intercepts a one-time pairing token and uses it to pair a rogue runner. | Medium | Pairing tokens have a strict 15-minute TTL, are cryptographically single-use, and are atomically marked `is_used = 1` inside a database transaction during initial handshake. | **CTRL-06** | Enforced in Database DDL |
| **THR-07** | Information Disclosure | **SSRF via Git Remote URL:** Attacker provides an internal loopback URL (e.g. `http://169.254.169.254/latest/meta-data/`) as `git_remote_url` to trigger internal cloud metadata exfiltration. | High | Git remote URLs are validated by regex for allowed schemes (`https://`, `ssh://`, `git@`). The backend never executes `git fetch` or `git clone` against remote URLs directly. | **CTRL-07** | Enforced in API Validator |
| **THR-08** | Denial of Service | **Runner Heartbeat / Queue Flooding:** Malicious or malfunctioning runner spams heartbeat or log endpoints, causing database lock contention. | Medium | API rate-limiting per runner token (max 120 req/min). Heartbeats only update memory cache or execute lightweight `UPDATE agent_runners SET last_heartbeat_at = NOW()` if delta > 10s. | **CTRL-08** | Enforced in Middleware |
| **THR-09** | Tampering | **Malicious Repository Instructions:** A cloned repo contains malicious scripts (e.g. `post-install` hooks, `.git/hooks`) designed to exploit the runner process. | High | Runner runs CLI engines in non-interactive/automation mode. Git commands executed by the runner explicitly disable automatic hook execution (`-c core.hooksPath=/dev/null`). | **CTRL-09** | Enforced in Runner Git Engine |
| **THR-10** | Repudiation | **Unauthorized Task Dispatch / Audit Blindness:** Dispatched tasks run without an audit trail of which user requested the operation. | Medium | All workspace creations, runner revocations, task dispatches, and approval decisions log structured audit records containing `user_id`, `client_ip`, `user_agent`, and `timestamp`. | **CTRL-10** | Enforced in Audit Logger |

---

## 3. Residual Risk Assessment

1. **Compromised Developer Host Machine:**
   - *Risk:* If the developer's laptop itself is already compromised by malware, the malware could read `~/.ai-chan/runner.json` and impersonate the runner.
   - *Mitigation:* File permissions restricted to `0600` (read/write by owner only). Users can instantly revoke any runner from the web UI (`POST /api/v1/orchestrator/runners/{id}/revoke`).
2. **Dangerous Commands Generated by LLM:**
   - *Risk:* An agent could propose running `rm -rf /` or deleting files outside the project.
   - *Mitigation:* Policy and approval gates (`Prompt 02`) require human confirmation of all shell commands and unified diffs before disk writes occur.
