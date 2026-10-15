"""
AI-Chan Development Orchestrator — Runtime Adapter Base Contract
Path: ai-runner/adapters/base.py
Standard: SPEC-ADA-01, SPEC-EVT-01
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List, Callable
import time


@dataclass
class ExecutionSpec:
    task_id: str
    attempt_id: str
    workspace_path: str
    prompt: str
    attempt_number: int = 1
    git_branch: Optional[str] = None
    runtime: str = "antigravity"
    mode: str = "plan"  # "plan" | "accept-edits"
    title: str = ""
    runtime_session_id: Optional[str] = None
    model_override: Optional[str] = None
    effort: Optional[str] = None
    custom_options: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ExecutionPolicy:
    timeout_seconds: int = 900
    allow_network: bool = True
    sandbox: bool = True
    require_approval_for_tools: bool = True
    max_line_length_bytes: int = 2 * 1024 * 1024  # 2MB guard against runaway payloads


@dataclass
class NormalizedEvent:
    event_id: str
    sequence_number: int
    task_id: str
    attempt_id: str
    runtime: str
    timestamp: str
    event_type: str
    payload: Dict[str, Any]
    runner_id: Optional[str] = None
    severity: str = "INFO"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_id": self.event_id,
            "sequence_number": self.sequence_number,
            "task_id": self.task_id,
            "attempt_id": self.attempt_id,
            "runner_id": self.runner_id,
            "runtime": self.runtime,
            "timestamp": self.timestamp,
            "event_type": self.event_type,
            "severity": self.severity,
            "payload": self.payload
        }


@dataclass
class ExecutionResult:
    status: str  # "COMPLETED" | "FAILED" | "CANCELLED"
    exit_code: int = 0
    duration_seconds: float = 0.0
    tokens_in: Optional[int] = None
    tokens_out: Optional[int] = None
    cost_estimate: Optional[float] = None
    head_commit: Optional[str] = None
    summary: Optional[str] = None
    error_message: Optional[str] = None
    artifacts: List[Dict[str, Any]] = field(default_factory=list)


class RuntimeAdapter(ABC):
    """Abstract interface governing all local runtime engines."""

    @abstractmethod
    def check_prerequisites(self) -> Dict[str, Any]:
        """Validates binary existence, version, and credentials on the local host."""
        pass

    @abstractmethod
    def execute(
        self,
        spec: ExecutionSpec,
        policy: ExecutionPolicy,
        event_callback: Callable[[NormalizedEvent], None]
    ) -> ExecutionResult:
        """Executes a development turn, streaming normalized events to the callback."""
        pass

    @abstractmethod
    def cancel(self, attempt_id: str, reason: str = "User cancelled") -> bool:
        """Signals active turn to terminate immediately and cleans up child processes."""
        pass
