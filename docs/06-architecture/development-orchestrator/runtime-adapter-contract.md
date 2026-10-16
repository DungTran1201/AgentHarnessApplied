# Runtime Adapter Contract Specification
## AI-Chan Development Orchestrator

> **Document ID:** SPEC-RUN-01  
> **Version:** 1.0.0  
> **Status:** PROPOSED (Prompt 02 Baseline)  
> **Target Subsystem:** AI-Chan Agent Runner Core (`ai-runner`)  
> **Standard:** Language-Neutral & Python 3.12+ Async Contract  
> **Fact Classification:** `FACT` (verified codebase & CLI reality), `DECISION` (selected contract architecture).

---

## 1. Architectural Role & Design Goals

The **Runtime Adapter** provides a decoupled abstraction layer between the AI-Chan Control Plane and third-party AI coding agent CLIs (e.g., Antigravity CLI, Claude Code CLI).

### Core Design Goals
1. **Vendor Neutrality:** Business logic in AI-Chan backend, task state machines, and frontend UI MUST NOT depend on vendor-specific JSON schemas, command flags, or internal state models.
2. **Asynchronous & Non-Blocking:** All process execution, input streaming, and output draining MUST execute asynchronously on the Runner daemon without blocking the FastAPI event loop or runner heartbeat.
3. **Graceful Cancellation & Teardown:** Tasks must support cooperative and forced termination, ensuring zero orphan child processes on Windows or POSIX hosts.
4. **Resilient Parsing:** Output streams must tolerate partial chunks, malformed lines, unexpected diagnostics, and oversized outputs without crashing.

---

## 2. Common Runtime Contract (Python Specification)

The abstract interface below defines the complete lifecycle contract required for any runtime engine integrated into the AI-Chan Development Orchestrator.

```python
"""
ai-runner/src/adapters/base.py
Abstract Runtime Adapter Interface for AI-Chan Agent Runner.
"""

from abc import ABC, abstractmethod
from typing import AsyncIterator, Dict, Any, List, Optional
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum


class RuntimeAvailabilityStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    NOT_INSTALLED = "NOT_INSTALLED"
    VERSION_UNSUPPORTED = "VERSION_UNSUPPORTED"
    AUTH_REQUIRED = "AUTH_REQUIRED"
    UNHEALTHY = "UNHEALTHY"


class TaskExitStatus(str, Enum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    TIMEOUT = "TIMEOUT"
    CRASHED = "CRASHED"


@dataclass(frozen=True)
class RuntimeCapabilities:
    runtime_name: str                        # e.g., "antigravity", "claude_code"
    version: str                             # e.g., "1.2.16"
    executable_path: str                     # Resolved absolute path
    supported_modes: List[str]               # e.g., ["plan", "accept-edits"]
    supports_stream_json: bool               # e.g., True for NDJSON streaming
    supports_conversation_resume: bool       # e.g., True via --conversation
    supports_json_schema: bool               # Enforce structured output schema
    supports_sandbox: bool                   # Terminal restrictions
    detected_at: datetime = field(default_factory=datetime.utcnow)


@dataclass(frozen=True)
class ExecutionPolicy:
    timeout_seconds: int = 900               # 15 minutes default turn limit
    max_output_bytes: int = 50 * 1024 * 1024 # 50 MB max buffer before truncation
    grace_period_seconds: int = 10           # SIGTERM to SIGKILL window
    require_approval_for_tools: bool = True  # Approval gate before destructive tools
    allowed_workspace_roots: List[str] = field(default_factory=list)
    environment_allowlist: List[str] = field(default_factory=list)


@dataclass(frozen=True)
class TaskSpec:
    task_id: str
    workspace_id: str
    workspace_path: str
    prompt: str
    runtime_session_id: Optional[str] = None # Conversation ID for resume
    execution_mode: str = "plan"             # "plan" or "accept-edits"
    model_override: Optional[str] = None
    effort: Optional[str] = None             # "low" | "medium" | "high" | "max"
    custom_options: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TerminalResult:
    exit_status: TaskExitStatus
    exit_code: int
    duration_seconds: float
    total_tokens_in: Optional[int] = None
    total_tokens_out: Optional[int] = None
    total_cost_estimate: Optional[float] = None
    runtime_session_id: Optional[str] = None
    summary_text: str = ""
    error_message: Optional[str] = None
    error_category: Optional[str] = None
    artifacts_created: List[str] = field(default_factory=list)


class BaseRuntimeAdapter(ABC):
    """
    Abstract interface implemented by CLI drivers (Antigravity, Claude Code, etc.)
    """

    @abstractmethod
    async def check_health(self) -> RuntimeAvailabilityStatus:
        """
        Verifies executable existence, version compliance, and authentication status.
        Does NOT launch long-running agent tasks.
        """
        pass

    @abstractmethod
    async def get_capabilities(self) -> RuntimeCapabilities:
        """
        Returns verified features, supported flags, and version metadata.
        """
        pass

    @abstractmethod
    async def start_task(
        self,
        spec: TaskSpec,
        policy: ExecutionPolicy,
    ) -> str:
        """
        Prepares environment, validates workspace root, and spawns the child process.
        Returns unique execution run_id.
        """
        pass

    @abstractmethod
    async def stream_events(self, run_id: str) -> AsyncIterator[Dict[str, Any]]:
        """
        Yields normalized events (AI-Chan domain) parsed in real time from child stdout.
        Drains until process termination or cancellation.
        """
        pass

    @abstractmethod
    async def submit_approval(self, run_id: str, approved: bool, reason: Optional[str] = None) -> None:
        """
        Transmits user approval decision to awaiting process (via stdin stream or signal).
        """
        pass

    @abstractmethod
    async def cancel_task(self, run_id: str, reason: str = "User requested cancellation") -> None:
        """
        Initiates graceful termination (SIGINT/SIGTERM), waits grace_period_seconds,
        then forces termination (SIGKILL / taskkill).
        """
        pass

    @abstractmethod
    async def resume_task(
        self,
        previous_session_id: str,
        spec: TaskSpec,
        policy: ExecutionPolicy,
    ) -> str:
        """
        Spawns a new task turn attached to an existing conversation session ID.
        Raises NotImplementedError if runtime does not support session resume.
        """
        pass

    @abstractmethod
    async def collect_result(self, run_id: str) -> TerminalResult:
        """
        Collects aggregated exit status, token usage, and summary once stream finishes.
        """
        pass

    @abstractmethod
    async def terminate_and_cleanup(self, run_id: str) -> None:
        """
        Ensures process tree is dead, file descriptors closed, and scratch buffers reclaimed.
        """
        pass
```

---

## 3. Execution Lifecycle Contract

```
      [PENDING]
          |
     (start_task)
          v
      [SPAWNED] ----(Spawn Error)----> [FAILED]
          |
     (stream_events)
          v
      [STREAMING / RUNNING]
       |          ^
       |          | (submit_approval)
 (requires approval)
       v          |
  [WAITING_APPROVAL]
       |
       +--(User Cancel / Timeout)----> [CANCELLED / TIMEOUT]
       |
  (process exit 0) ------------------> [COMPLETED]
       |
  (process exit != 0 / crash) -------> [FAILED]
```

### Lifecycle Guarantees:
1. **Idempotent Cleanup:** `terminate_and_cleanup(run_id)` can be called multiple times safely at any lifecycle state.
2. **Process Tree Reclamation:** Termination MUST kill the child process and all child sub-processes (e.g. compilers, git commands, shell scripts spawned by the CLI).
3. **No Unbounded Memory:** Stream readers must yield deltas line-by-line; log buffers on the runner must enforce `ExecutionPolicy.max_output_bytes`.
