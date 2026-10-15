# Runtime Security Policy & Failure Taxonomy
## AI-Chan Development Orchestrator

> **Document ID:** SPEC-SEC-02  
> **Version:** 1.0.0  
> **Target Subsystem:** Agent Runner Security Supervisor  
> **Fact Classification:** `DECISION` (security limits, environment boundaries, retryability policy).

---

## 1. Runtime Configuration & Security Envelope

Each runtime adapter instance operates under a strictly enforced **Runtime Security Policy** loaded by the Runner daemon before spawning any process.

```python
@dataclass(frozen=True)
class RuntimeSecurityProfile:
    # 1. Binary & Version Constraints
    executable_path: str                 # Must be an absolute canonical path
    allowed_version_range: str = ">=1.2.0, <2.0.0"
    
    # 2. Filesystem Boundaries
    enforce_workspace_containment: bool = True
    allowed_workspace_roots: List[str] = field(default_factory=list)
    
    # 3. Execution Resource Limits
    max_turn_duration_seconds: int = 900 # 15 minutes hard turn timeout
    max_output_buffer_bytes: int = 50 * 1024 * 1024 # 50 MB max stdout buffer
    max_line_length_bytes: int = 2 * 1024 * 1024    # 2 MB max per NDJSON line
    concurrency_limit: int = 1           # 1 active task per runner host
    cancellation_grace_period_seconds: int = 10     # Grace window before SIGKILL
    
    # 4. Environment Variable Allowlist (Zero Secret Leaks)
    allowed_env_vars: List[str] = field(default_factory=lambda: [
        "PATH", "PATHEXT", "SYSTEMROOT", "WINDIR", "COMSPEC", # Windows base
        "HOME", "USERPROFILE", "HOMEPATH", "HOMEDRIVE",       # User home
        "LANG", "LC_ALL", "TERM",                             # Locale/terminal
        "TMP", "TEMP",                                        # Temp dirs
    ])
```

### 1.1 Filesystem Containment Verification (`CTRL-SEC-01`)
Before invoking any CLI runtime, the Runner validates that the target repository path is strictly bounded:
```python
def validate_workspace_containment(target_path: str, allowed_roots: List[str]) -> bool:
    canonical_target = os.path.realpath(os.path.abspath(target_path))
    for root in allowed_roots:
        canonical_root = os.path.realpath(os.path.abspath(root))
        # Ensure target is equal to or subpath of root
        if os.path.commonpath([canonical_target, canonical_root]) == canonical_root:
            return True
    return False
```

### 1.2 Environment Scrubbing (`CTRL-SEC-02`)
The Runner NEVER passes `os.environ` wholesale to the child process:
- All non-allowlisted environment variables (e.g. AWS credentials, SSH keys, private database connection strings) are stripped from child processes.
- LLM API keys needed by the CLI are injected only if explicitly declared in the task configuration or pre-authenticated by the host CLI profile.

---

## 2. Failure Taxonomy & Error Categorization

When a task fails or aborts, the adapter maps the underlying failure to one of the following standardized error categories:

| Error Category | Description | Root Cause / Trigger | Retryable? |
|---|---|---|---|
| `RUNTIME_NOT_INSTALLED` | Executable not found at declared path. | Missing CLI binary or broken PATH. | No (Configuration error) |
| `UNSUPPORTED_VERSION` | CLI version does not satisfy constraints. | Outdated or incompatible major CLI version. | No (Requires host upgrade) |
| `UNAUTHENTICATED` | CLI lacks credentials to call LLM. | Expired token or unlogged account. | No (Requires `agy login`) |
| `PERMISSION_DENIED` | OS rejects access to workspace directory. | File lock, read-only permissions, or UAC. | No (Host permissions) |
| `WORKSPACE_INVALID` | Directory missing or corrupted git repo. | Path moved, renamed, or deleted. | No (User path error) |
| `SPAWN_FAILED` | OS failed to create subprocess. | Resource exhaustion, invalid binary header. | Yes (Transient, 1 retry) |
| `STREAM_PARSE_ERROR` | Malformed stream unrecoverable. | Severe protocol drift or corrupt binary output. | No (Driver defect) |
| `RUNTIME_ERROR` | CLI exited with non-zero code. | Syntax error in prompt, agent crash. | See Retryability Matrix |
| `TIMEOUT` | Execution exceeded turn duration limit. | Long-running loop or stuck compilation. | No (Exceeded budget) |
| `CANCELLED` | User requested task cancellation. | Developer clicked "Abort Task" in UI. | No (User intent) |
| `INTERRUPTED` | Runner process restarted/shutdown. | Host reboot, runner SIGTERM, power failure. | See Retryability Matrix |
| `CRASHED` | Process died unexpectedly (SIGSEGV/OOM). | Out of memory or native binary crash. | No (Fatal host failure) |
| `OUTPUT_QUOTA_EXCEEDED`| Output exceeded 50 MB buffer limit. | Infinite printing loop in agent tool. | No (Resource guard) |
| `RESULT_MISSING` | Process exited 0 without `result` event. | Premature EOF on stdout. | No (Protocol defect) |
| `ARTIFACT_COLLECTION_FAILED`| Failed to read generated patch or diff. | Disk I/O failure or permission error. | Yes (Transient file lock) |

---

## 3. Retryability Policy Matrix

Automated retries can be hazardous in software engineering workflows. Repeating a non-idempotent code edit can corrupt source files or create duplicate commits.

```
                    [ Task Execution Failure ]
                                |
               Is failure category marked Retryable?
                                |
                     +----------+----------+
                     | No                  | Yes
                     v                     v
              [ DO NOT RETRY ]      Is task mode 'plan' (Read-Only)?
             (Mark Task FAILED)            |
                                   +-------+-------+
                                   | Yes           | No (Mutating / 'accept-edits')
                                   v               v
                           [ AUTO-RETRY ]   [ DO NOT AUTO-RETRY ]
                         (Max 2 attempts)   (Requires User Confirmation)
```

### 3.1 Strict Retry Rules:
1. **Read-Only Tasks (`mode: "plan"`):**
   - Transient failures (`SPAWN_FAILED`, `ARTIFACT_COLLECTION_FAILED`) may be automatically retried up to **2 times** using exponential backoff (2s, 6s).
2. **Mutating Tasks (`mode: "accept-edits"`):**
   - **ZERO automated retries.** Once a file write or terminal command has executed, the state of the workspace is unknown. The orchestrator must pause and prompt the user: *"Task failed midway. Revert changes or retry from last checkpoint?"*
3. **Idempotency Proof Required:**
   - Tasks may only be retried if the Runner verifies that `git status --porcelain` is clean or identical to the initial checkpoint.
