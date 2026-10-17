"""
Tool Executor Service — Centralized Unified Runtime Executor for All Tools
Orchestrates: Policy Gate -> Timeout & Concurrency -> Handler Execution -> Audit Logging
"""

import asyncio
import inspect
import json
import logging
import time
import uuid
from typing import Dict, Any, Optional, Callable

from src.db import execute_commit, query_all
from src.services.tools.models import ToolExecutionStatus, ToolExecutionResponse
from src.services.tools.policy_gate import PolicyGateService, PolicyGateError

# Handlers
from src.services.tools.handlers.data_handlers import (
    handle_calculator,
    handle_date_time_info,
    handle_convert_units,
    handle_validate_json_schema,
    handle_transform_json,
    handle_validate_email_format,
    handle_text_diff,
    handle_regex_extract,
)
from src.services.tools.handlers.file_handlers import (
    handle_read_text_file,
    handle_parse_csv,
    handle_filter_csv_rows,
    handle_summarize_csv_statistics,
    handle_convert_csv_to_json,
    handle_parse_json_file,
    handle_extract_markdown_sections,
    handle_detect_file_metadata,
    handle_chunk_document,
    handle_extract_pdf_text,
    handle_extract_docx_text,
    handle_extract_xlsx_data,
)
from src.services.tools.handlers.web_handlers import (
    handle_fetch_webpage,
    handle_extract_web_content,
    handle_extract_web_metadata,
    handle_parse_sitemap,
    handle_search_project_documents,
    handle_web_search,
)
from src.services.tools.handlers.faiss_handlers import (
    handle_get_faiss_document,
    handle_create_faiss_index,
    handle_add_documents_to_faiss,
    handle_search_faiss_index,
    handle_delete_faiss_document,
    handle_rebuild_faiss_index,
)

logger = logging.getLogger("tools.executor")

# Registry of handlers mapping tool_id to implementation function
TOOL_HANDLER_MAP: Dict[str, Callable] = {
    # Data & Utilities (8)
    "calculator": handle_calculator,
    "date_time_info": handle_date_time_info,
    "convert_units": handle_convert_units,
    "validate_json_schema": handle_validate_json_schema,
    "transform_json": handle_transform_json,
    "validate_email_format": handle_validate_email_format,
    "text_diff": handle_text_diff,
    "regex_extract": handle_regex_extract,
    # File & Documents (12)
    "read_text_file": handle_read_text_file,
    "parse_csv": handle_parse_csv,
    "filter_csv_rows": handle_filter_csv_rows,
    "summarize_csv_statistics": handle_summarize_csv_statistics,
    "convert_csv_to_json": handle_convert_csv_to_json,
    "parse_json_file": handle_parse_json_file,
    "extract_markdown_sections": handle_extract_markdown_sections,
    "detect_file_metadata": handle_detect_file_metadata,
    "chunk_document": handle_chunk_document,
    "extract_pdf_text": handle_extract_pdf_text,
    "extract_docx_text": handle_extract_docx_text,
    "extract_xlsx_data": handle_extract_xlsx_data,
    # Web & Retrieval (6)
    "fetch_webpage": handle_fetch_webpage,
    "extract_web_content": handle_extract_web_content,
    "extract_web_metadata": handle_extract_web_metadata,
    "parse_sitemap": handle_parse_sitemap,
    "search_project_documents": handle_search_project_documents,
    "web_search": handle_web_search,
    # FAISS Knowledge Base (6)
    "get_faiss_document": handle_get_faiss_document,
    "create_faiss_index": handle_create_faiss_index,
    "add_documents_to_faiss": handle_add_documents_to_faiss,
    "search_faiss_index": handle_search_faiss_index,
    "delete_faiss_document": handle_delete_faiss_document,
    "rebuild_faiss_index": handle_rebuild_faiss_index,
}


class ToolExecutorService:
    @classmethod
    async def execute_tool(
        cls,
        tool_id: str,
        arguments: Dict[str, Any],
        project_id: Optional[str] = None,
        user_id: Optional[str] = None,
        conversation_id: Optional[str] = None
    ) -> ToolExecutionResponse:
        """
        Executes a registered tool within policy gate validation, timeout bounds,
        and audit logging.
        """
        exec_id = f"exec_{uuid.uuid4().hex[:16]}"
        start_time = time.time()
        input_sanitized = json.dumps(arguments or {})

        # Record initial status safely (fallback with NULL foreign keys if transient/mock context)
        try:
            execute_commit(
                """
                INSERT INTO tool_executions (id, tool_id, project_id, user_id, conversation_id, status, input_payload, execution_time_ms)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0)
                """,
                (exec_id, tool_id, project_id, user_id, conversation_id, ToolExecutionStatus.REQUESTED.value, input_sanitized)
            )
        except Exception:
            try:
                execute_commit(
                    """
                    INSERT INTO tool_executions (id, tool_id, project_id, user_id, conversation_id, status, input_payload, execution_time_ms)
                    VALUES (?, ?, NULL, NULL, NULL, ?, ?, 0)
                    """,
                    (exec_id, tool_id, ToolExecutionStatus.REQUESTED.value, input_sanitized)
                )
            except Exception as e:
                logger.warning(f"Failed to record tool execution audit log: {e}")

        handler = TOOL_HANDLER_MAP.get(tool_id)
        if not handler:
            err = f"No handler registered for tool '{tool_id}'."
            cls._update_execution(exec_id, ToolExecutionStatus.FAILED, None, err, 0)
            return ToolExecutionResponse(
                execution_id=exec_id,
                tool_id=tool_id,
                status=ToolExecutionStatus.FAILED,
                error=err
            )

        # 1. Policy Gate Check
        try:
            gate_result = PolicyGateService.verify_invocation(
                tool_id=tool_id,
                arguments=arguments,
                project_id=project_id,
                user_id=user_id
            )
            timeout_limit = gate_result.get("timeout_seconds", 30)
        except (PolicyGateError, PermissionError) as e:
            err = str(e)
            cls._update_execution(exec_id, ToolExecutionStatus.BLOCKED, None, err, int((time.time() - start_time) * 1000))
            return ToolExecutionResponse(
                execution_id=exec_id,
                tool_id=tool_id,
                status=ToolExecutionStatus.BLOCKED,
                error=err
            )
        except ValueError as e:
            err = str(e)
            cls._update_execution(exec_id, ToolExecutionStatus.FAILED, None, err, int((time.time() - start_time) * 1000))
            return ToolExecutionResponse(
                execution_id=exec_id,
                tool_id=tool_id,
                status=ToolExecutionStatus.FAILED,
                error=err
            )

        # 2. Execution with Timeout
        result = None
        error_msg = None
        final_status = ToolExecutionStatus.SUCCEEDED

        try:
            # Check if handler is coroutine
            if inspect.iscoroutinefunction(handler):
                result = await asyncio.wait_for(handler(**arguments), timeout=timeout_limit)
            else:
                loop = asyncio.get_running_loop()
                result = await asyncio.wait_for(loop.run_in_executor(None, lambda: handler(**arguments)), timeout=timeout_limit)
        except asyncio.TimeoutError:
            final_status = ToolExecutionStatus.TIMED_OUT
            error_msg = f"Tool execution timed out after {timeout_limit} seconds."
            logger.warning(f"Tool '{tool_id}' timed out ({exec_id})")
        except Exception as e:
            final_status = ToolExecutionStatus.FAILED
            error_msg = str(e)
            logger.error(f"Tool '{tool_id}' failed with exception: {e}")

        elapsed_ms = int((time.time() - start_time) * 1000)

        # 3. Update Audit Record
        output_str = json.dumps(result) if result is not None else None
        cls._update_execution(exec_id, final_status, output_str, error_msg, elapsed_ms)

        return ToolExecutionResponse(
            execution_id=exec_id,
            tool_id=tool_id,
            status=final_status,
            result=result,
            error=error_msg,
            execution_time_ms=elapsed_ms
        )

    @classmethod
    def _update_execution(
        cls,
        exec_id: str,
        status: ToolExecutionStatus,
        output_payload: Optional[str],
        error_message: Optional[str],
        duration_ms: int
    ) -> None:
        """Updates the execution record in database."""
        execute_commit(
            """
            UPDATE tool_executions
            SET status = ?, output_payload = ?, error_message = ?, execution_time_ms = ?
            WHERE id = ?
            """,
            (status.value, output_payload, error_message, duration_ms, exec_id)
        )

    @classmethod
    def get_recent_executions(
        cls,
        tool_id: Optional[str] = None,
        project_id: Optional[str] = None,
        limit: int = 20
    ) -> list:
        """Retrieves recent execution history for auditing."""
        query = "SELECT * FROM tool_executions WHERE 1=1"
        params = []
        if tool_id:
            query += " AND tool_id = ?"
            params.append(tool_id)
        if project_id:
            query += " AND project_id = ?"
            params.append(project_id)
        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(max(1, min(100, limit)))

        return query_all(query, tuple(params))
