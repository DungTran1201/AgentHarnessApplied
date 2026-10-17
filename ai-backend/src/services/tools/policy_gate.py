"""
Policy Gate Service — Security and Access Control Enforcement for Tool Invocations
Ensures only authorized, enabled tools with valid schemas and payload bounds execute.
"""

import json
from typing import Dict, Any, Optional

from src.db import query_one
from src.services.tools.models import ToolStatus, ToolExecutionStatus
from src.services.tools.registry import ToolRegistryService


class PolicyGateError(PermissionError):
    """Raised when policy verification fails."""
    pass


class PolicyGateService:
    @classmethod
    def verify_invocation(
        cls,
        tool_id: str,
        arguments: Dict[str, Any],
        project_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Verifies policy requirements:
        1. Tool exists and is active.
        2. Tool status is AVAILABLE (not DISABLED, not DEPENDENCY_MISSING, not NEEDS_CONFIGURATION).
        3. If project_id provided, project must have explicitly enabled the tool in project_tool_bindings.
        4. Arguments conform to input_schema.
        5. Payload size is within bounds.
        """
        tool = ToolRegistryService.get_tool(tool_id, project_id=project_id, user_id=user_id)

        if tool.status == ToolStatus.DISABLED:
            raise PolicyGateError(f"Tool '{tool_id}' is disabled by policy.")

        if tool.status == ToolStatus.DEPENDENCY_MISSING:
            raise PolicyGateError(
                f"Tool '{tool_id}' cannot execute: {tool.dependency_status or 'Required dependencies missing.'}"
            )

        if tool.status == ToolStatus.NEEDS_CONFIGURATION:
            raise PolicyGateError(
                f"Tool '{tool_id}' requires configuration (e.g. API Key) before it can be executed."
            )

        # Project Binding check
        if project_id:
            binding = query_one(
                "SELECT is_enabled, custom_timeout_seconds FROM project_tool_bindings WHERE project_id = ? AND tool_id = ?",
                (project_id, tool_id)
            )
            if not binding or not binding["is_enabled"]:
                raise PolicyGateError(
                    f"Tool '{tool_id}' is not authorized or enabled for Project '{project_id}'."
                )

        # Payload size validation
        arg_json = json.dumps(arguments or {})
        if len(arg_json.encode("utf-8")) > tool.max_payload_bytes:
            raise PolicyGateError(
                f"Payload size ({len(arg_json)} bytes) exceeds tool limit ({tool.max_payload_bytes} bytes)."
            )

        # Schema validation
        schema = tool.input_schema
        required_props = schema.get("required", [])
        for req in required_props:
            if req not in arguments:
                raise ValueError(f"Missing required argument '{req}' for tool '{tool_id}'.")

        try:
            import jsonschema
            validator = jsonschema.Draft7Validator(schema)
            errors = list(validator.iter_errors(arguments))
            if errors:
                err_msgs = [e.message for e in errors[:5]]
                raise ValueError(f"Input validation error for tool '{tool_id}': {'; '.join(err_msgs)}")
        except ImportError:
            pass  # Fallback to basic required props check

        return {
            "tool": tool,
            "timeout_seconds": tool.timeout_seconds
        }
