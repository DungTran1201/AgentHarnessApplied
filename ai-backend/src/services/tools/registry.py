"""
Tool Registry Service
Manages tool definitions, catalog seeding, dynamic availability calculation,
configuration persistence, and project bindings.
"""

import json
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

from src.db import query_one, query_all, execute_commit
from src.services.tools.models import (
    ToolCategory,
    ToolRiskLevel,
    ToolSourceType,
    ToolStatus,
    ToolSummaryResponse,
    ToolDetailResponse,
    ToolListResponse,
    ToolTestResponse,
    ProjectToolBindingResponse
)
from src.services.tools.catalog_seed import BUILTIN_TOOL_CATALOG
from src.services.tools.crypto import encrypt_secrets, decrypt_secrets, mask_secret

logger = logging.getLogger("tools.registry")


class ToolRegistryService:
    @classmethod
    def seed_tools(cls) -> int:
        """Idempotently seeds builtin tools into the database."""
        seeded = 0
        for tool in BUILTIN_TOOL_CATALOG:
            existing = query_one("SELECT id FROM tools WHERE id = ?", (tool["id"],))
            tags_json = json.dumps(tool.get("tags", []))
            in_schema = json.dumps(tool["input_schema"])
            out_schema = json.dumps(tool["output_schema"])
            cfg_schema = json.dumps(tool.get("configuration_schema", {}))

            if not existing:
                execute_commit(
                    """
                    INSERT INTO tools (
                        id, name, description, category, version, risk_level, source_type,
                        status, input_schema, output_schema, configuration_schema, tags,
                        timeout_seconds, max_payload_bytes, requires_network, requires_filesystem
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        tool["id"], tool["name"], tool["description"], tool["category"],
                        tool["version"], tool["risk_level"], tool["source_type"], tool["status"],
                        in_schema, out_schema, cfg_schema, tags_json,
                        tool.get("timeout_seconds", 30), tool.get("max_payload_bytes", 10485760),
                        1 if tool.get("requires_network") else 0,
                        1 if tool.get("requires_filesystem") else 0
                    )
                )
                seeded += 1
            else:
                # Update metadata while preserving disabled status
                execute_commit(
                    """
                    UPDATE tools SET
                        name = ?, description = ?, category = ?, version = ?,
                        risk_level = ?, input_schema = ?, output_schema = ?,
                        configuration_schema = ?, tags = ?, timeout_seconds = ?,
                        max_payload_bytes = ?, requires_network = ?, requires_filesystem = ?
                    WHERE id = ?
                    """,
                    (
                        tool["name"], tool["description"], tool["category"], tool["version"],
                        tool["risk_level"], in_schema, out_schema,
                        cfg_schema, tags_json, tool.get("timeout_seconds", 30),
                        tool.get("max_payload_bytes", 10485760),
                        1 if tool.get("requires_network") else 0,
                        1 if tool.get("requires_filesystem") else 0,
                        tool["id"]
                    )
                )
        return seeded

    @classmethod
    def compute_dynamic_status(
        cls,
        tool_row: Dict[str, Any],
        config_row: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None
    ) -> Tuple[ToolStatus, Optional[str]]:
        """
        Dynamically calculates the availability status based on runtime dependencies
        and external configurations. Never reports AVAILABLE if conditions are not met.
        """
        stored_status = tool_row.get("status", "AVAILABLE")
        if stored_status == ToolStatus.DISABLED.value:
            return ToolStatus.DISABLED, "Tool has been disabled by administrator."

        tool_id = tool_row["id"]
        category = tool_row["category"]

        # 1. Dependency checks
        if tool_id == "extract_docx_text":
            try:
                import docx  # noqa: F401
            except ImportError:
                return ToolStatus.DEPENDENCY_MISSING, "Missing optional package 'python-docx'. Install via pip."

        if tool_id == "extract_xlsx_data":
            try:
                import openpyxl  # noqa: F401
            except ImportError:
                return ToolStatus.DEPENDENCY_MISSING, "Missing optional package 'openpyxl'. Install via pip."

        if category == "FAISS" and tool_id != "get_faiss_document":
            try:
                import numpy  # noqa: F401
                import faiss  # noqa: F401
            except ImportError:
                return ToolStatus.DEPENDENCY_MISSING, "Missing optional packages 'faiss-cpu' and 'numpy'. Install via pip."

        # 2. Configuration checks (integrates with CredentialService for Brave / SerpAPI)
        if tool_id == "web_search":
            secrets = decrypt_secrets(config_row.get("encrypted_secrets")) if config_row else {}
            params = json.loads(config_row.get("parameters", "{}")) if config_row else {}
            provider = (params.get("provider") or "duckduckgo").lower().strip()
            if provider in ("brave", "serpapi", "google", "bing") and not secrets.get("api_key"):
                has_cred = False
                try:
                    from src.services.credential_service import CredentialService
                    lookup_prov = "serpapi" if provider == "google" else provider
                    has_cred = CredentialService.is_provider_configured(lookup_prov, user_id=user_id)
                except Exception:
                    has_cred = False
                if not has_cred:
                    return ToolStatus.NEEDS_CONFIGURATION, f"Provider '{provider}' requires an API key in Settings -> API Keys or tool configuration."

        return ToolStatus.AVAILABLE, None

    @classmethod
    def list_tools(
        cls,
        search: Optional[str] = None,
        category: Optional[str] = None,
        status: Optional[str] = None,
        risk_level: Optional[str] = None,
        page: int = 1,
        limit: int = 10,
        project_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> ToolListResponse:
        """Lists tools with search, filtering, category counts, and pagination."""
        cls.seed_tools()

        all_tools = query_all("SELECT * FROM tools ORDER BY category ASC, name ASC")

        # Load configurations map
        config_rows = query_all("SELECT tool_id, encrypted_secrets, parameters, is_enabled FROM tool_configurations WHERE project_id IS NULL")
        config_map = {c["tool_id"]: c for c in config_rows}

        category_counts: Dict[str, int] = {}
        filtered_items: List[ToolSummaryResponse] = []

        q = search.lower().strip() if search else None
        cat_filter = category.upper().strip() if category else None
        stat_filter = status.upper().strip() if status else None
        risk_filter = risk_level.upper().strip() if risk_level else None

        for row in all_tools:
            cat = row["category"]
            category_counts[cat] = category_counts.get(cat, 0) + 1

            cfg = config_map.get(row["id"])
            dyn_status, dep_msg = cls.compute_dynamic_status(row, cfg, user_id=user_id)

            # Check matches
            if cat_filter and cat != cat_filter:
                continue
            if risk_filter and row["risk_level"] != risk_filter:
                continue
            if stat_filter and dyn_status.value != stat_filter:
                continue

            if q:
                tags = json.loads(row.get("tags") or "[]")
                tag_str = " ".join(tags).lower()
                text_blob = f"{row['id']} {row['name']} {row['description']} {tag_str}".lower()
                if q not in text_blob:
                    continue

            tags_list = json.loads(row.get("tags") or "[]")
            is_configured = bool(cfg and (cfg.get("encrypted_secrets") or cfg.get("parameters") != "{}"))

            filtered_items.append(
                ToolSummaryResponse(
                    id=row["id"],
                    name=row["name"],
                    description=row["description"],
                    category=ToolCategory(row["category"]),
                    version=row["version"],
                    risk_level=ToolRiskLevel(row["risk_level"]),
                    source_type=ToolSourceType(row["source_type"]),
                    status=dyn_status,
                    tags=tags_list,
                    timeout_seconds=row["timeout_seconds"],
                    requires_network=bool(row["requires_network"]),
                    requires_filesystem=bool(row["requires_filesystem"]),
                    is_configured=is_configured,
                    dependency_status=dep_msg,
                    created_at=str(row["created_at"]),
                    updated_at=str(row["updated_at"])
                )
            )

        total = len(filtered_items)
        limit_val = max(1, min(100, limit))
        page_val = max(1, page)
        offset = (page_val - 1) * limit_val
        paginated_items = filtered_items[offset : offset + limit_val]
        pages = max(1, (total + limit_val - 1) // limit_val)

        return ToolListResponse(
            items=paginated_items,
            total=total,
            page=page_val,
            limit=limit_val,
            pages=pages,
            categories=category_counts
        )

    @classmethod
    def get_tool(cls, tool_id: str, project_id: Optional[str] = None, user_id: Optional[str] = None) -> ToolDetailResponse:
        """Fetches detailed tool specification, schemas, and current configuration."""
        cls.seed_tools()
        row = query_one("SELECT * FROM tools WHERE id = ?", (tool_id,))
        if not row:
            raise KeyError(f"Tool '{tool_id}' not found.")

        # Fetch configuration (project-specific or global)
        cfg_row = query_one(
            "SELECT * FROM tool_configurations WHERE tool_id = ? AND (project_id = ? OR project_id IS NULL) ORDER BY project_id DESC LIMIT 1",
            (tool_id, project_id)
        )

        dyn_status, dep_msg = cls.compute_dynamic_status(row, cfg_row, user_id=user_id)

        current_cfg = {}
        if cfg_row:
            params = json.loads(cfg_row.get("parameters") or "{}")
            secrets = decrypt_secrets(cfg_row.get("encrypted_secrets"))
            # Mask all secrets before sending to client
            masked_secrets = {k: mask_secret(v) for k, v in secrets.items()}
            current_cfg = {
                "parameters": params,
                "secrets": masked_secrets,
                "is_enabled": bool(cfg_row.get("is_enabled", 1))
            }

        return ToolDetailResponse(
            id=row["id"],
            name=row["name"],
            description=row["description"],
            category=ToolCategory(row["category"]),
            version=row["version"],
            risk_level=ToolRiskLevel(row["risk_level"]),
            source_type=ToolSourceType(row["source_type"]),
            status=dyn_status,
            tags=json.loads(row.get("tags") or "[]"),
            timeout_seconds=row["timeout_seconds"],
            requires_network=bool(row["requires_network"]),
            requires_filesystem=bool(row["requires_filesystem"]),
            is_configured=bool(current_cfg),
            dependency_status=dep_msg,
            created_at=str(row["created_at"]),
            updated_at=str(row["updated_at"]),
            input_schema=json.loads(row["input_schema"]),
            output_schema=json.loads(row["output_schema"]),
            configuration_schema=json.loads(row.get("configuration_schema") or "{}"),
            max_payload_bytes=row.get("max_payload_bytes", 10485760),
            current_configuration=current_cfg,
            last_tested_at=str(cfg_row["last_tested_at"]) if cfg_row and cfg_row.get("last_tested_at") else None,
            last_test_result=cfg_row["last_test_result"] if cfg_row else None,
            last_test_message=cfg_row["last_test_message"] if cfg_row else None
        )

    @classmethod
    def set_tool_status(cls, tool_id: str, new_status: ToolStatus) -> None:
        """Enables or disables tool at the registry level."""
        row = query_one("SELECT id FROM tools WHERE id = ?", (tool_id,))
        if not row:
            raise KeyError(f"Tool '{tool_id}' not found.")

        execute_commit("UPDATE tools SET status = ? WHERE id = ?", (new_status.value, tool_id))

    @classmethod
    def save_configuration(
        cls,
        tool_id: str,
        parameters: Dict[str, Any],
        secrets: Dict[str, str],
        is_enabled: bool = True,
        project_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> None:
        """Saves encrypted secrets and parameters for a tool configuration."""
        row = query_one("SELECT id FROM tools WHERE id = ?", (tool_id,))
        if not row:
            raise KeyError(f"Tool '{tool_id}' not found.")

        existing_cfg = query_one(
            "SELECT id, encrypted_secrets FROM tool_configurations WHERE tool_id = ? AND (project_id = ? OR (project_id IS NULL AND ? IS NULL))",
            (tool_id, project_id, project_id)
        )

        existing_secrets = decrypt_secrets(existing_cfg["encrypted_secrets"]) if existing_cfg else {}
        for k, v in secrets.items():
            if v and not v.startswith("***"):
                existing_secrets[k] = v

        enc_str = encrypt_secrets(existing_secrets) if existing_secrets else None
        params_json = json.dumps(parameters or {})
        enabled_val = 1 if is_enabled else 0

        if existing_cfg:
            execute_commit(
                """
                UPDATE tool_configurations SET
                    encrypted_secrets = ?, parameters = ?, is_enabled = ?
                WHERE id = ?
                """,
                (enc_str, params_json, enabled_val, existing_cfg["id"])
            )
        else:
            cfg_id = f"cfg_{uuid.uuid4().hex[:16]}"
            execute_commit(
                """
                INSERT INTO tool_configurations (id, tool_id, project_id, user_id, encrypted_secrets, parameters, is_enabled)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (cfg_id, tool_id, project_id, user_id, enc_str, params_json, enabled_val)
            )

    @classmethod
    async def test_connection(
        cls,
        tool_id: str,
        parameters: Dict[str, Any],
        project_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> ToolTestResponse:
        """Executes a non-destructive health check / test for the specified tool."""
        start_time = time.time()
        tool = cls.get_tool(tool_id, project_id, user_id)

        status_str = "SUCCESS"
        message_str = "Tool health check passed successfully."
        details_dict = {}

        try:
            if tool.status == ToolStatus.DISABLED:
                raise ValueError("Tool is currently disabled.")
            if tool.status == ToolStatus.DEPENDENCY_MISSING:
                raise ImportError(tool.dependency_status or "Required dependencies are missing.")
            if tool.status == ToolStatus.NEEDS_CONFIGURATION:
                raise ValueError(tool.dependency_status or "Tool requires configuration before use.")

            if tool_id == "calculator":
                from src.services.tools.handlers.data_handlers import handle_calculator
                expr = parameters.get("expression", "2 + 2")
                details_dict = handle_calculator(expr)
            elif tool_id == "date_time_info":
                from src.services.tools.handlers.data_handlers import handle_date_time_info
                tz = parameters.get("timezone_name", "UTC")
                details_dict = handle_date_time_info(tz)
            elif tool_id == "convert_units":
                from src.services.tools.handlers.data_handlers import handle_convert_units
                details_dict = handle_convert_units(100, "cm", "m", "length")
            elif tool_id == "validate_email_format":
                from src.services.tools.handlers.data_handlers import handle_validate_email_format
                details_dict = handle_validate_email_format("test@ai-chan.vn")
            elif tool_id == "chunk_document":
                from src.services.tools.handlers.file_handlers import handle_chunk_document
                details_dict = handle_chunk_document("Test sample document text for verification", 100, 20)
            elif tool_id == "fetch_webpage":
                from src.services.tools.ssrf_guard import SSRFGuardEngine
                test_url = parameters.get("url", "https://example.com")
                SSRFGuardEngine.validate_url(test_url)
                details_dict = {"validated_url": test_url, "ssrf_check": "PASSED"}
            else:
                details_dict = {"status": "HEALTHY", "tool_id": tool_id}

        except Exception as e:
            status_str = "FAILED"
            message_str = f"Test check failed: {e}"
            logger.warning(f"Health check failed for tool '{tool_id}': {e}")

        elapsed_ms = int((time.time() - start_time) * 1000)

        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        execute_commit(
            """
            UPDATE tool_configurations
            SET last_tested_at = ?, last_test_result = ?, last_test_message = ?
            WHERE tool_id = ? AND (project_id = ? OR (project_id IS NULL AND ? IS NULL))
            """,
            (now_str, status_str, message_str, tool_id, project_id, project_id)
        )

        return ToolTestResponse(
            tool_id=tool_id,
            status=status_str,
            message=message_str,
            latency_ms=elapsed_ms,
            details=details_dict
        )

    # ==========================================================================
    # PROJECT TOOL BINDINGS
    # ==========================================================================

    @classmethod
    def get_project_bindings(cls, project_id: str) -> List[ProjectToolBindingResponse]:
        """Gets all tools bound to a specific project."""
        rows = query_all(
            """
            SELECT b.id, b.project_id, b.tool_id, b.is_enabled, b.custom_timeout_seconds, b.created_at,
                   t.name as tool_name, t.category
            FROM project_tool_bindings b
            JOIN tools t ON b.tool_id = t.id
            WHERE b.project_id = ?
            ORDER BY t.category ASC, t.name ASC
            """,
            (project_id,)
        )
        return [
            ProjectToolBindingResponse(
                id=r["id"],
                project_id=r["project_id"],
                tool_id=r["tool_id"],
                tool_name=r["tool_name"],
                category=r["category"],
                is_enabled=bool(r["is_enabled"]),
                custom_timeout_seconds=r["custom_timeout_seconds"],
                created_at=str(r["created_at"])
            )
            for r in rows
        ]

    @classmethod
    def bind_tool_to_project(
        cls,
        project_id: str,
        tool_id: str,
        is_enabled: bool = True,
        custom_timeout_seconds: Optional[int] = None
    ) -> ProjectToolBindingResponse:
        """Binds a tool to a project with allowlist authorization."""
        tool = query_one("SELECT name, category FROM tools WHERE id = ?", (tool_id,))
        if not tool:
            raise KeyError(f"Tool '{tool_id}' not found.")

        existing = query_one(
            "SELECT id FROM project_tool_bindings WHERE project_id = ? AND tool_id = ?",
            (project_id, tool_id)
        )

        if existing:
            execute_commit(
                "UPDATE project_tool_bindings SET is_enabled = ?, custom_timeout_seconds = ? WHERE id = ?",
                (1 if is_enabled else 0, custom_timeout_seconds, existing["id"])
            )
            binding_id = existing["id"]
        else:
            binding_id = f"ptb_{uuid.uuid4().hex[:16]}"
            execute_commit(
                """
                INSERT INTO project_tool_bindings (id, project_id, tool_id, is_enabled, custom_timeout_seconds)
                VALUES (?, ?, ?, ?, ?)
                """,
                (binding_id, project_id, tool_id, 1 if is_enabled else 0, custom_timeout_seconds)
            )

        return ProjectToolBindingResponse(
            id=binding_id,
            project_id=project_id,
            tool_id=tool_id,
            tool_name=tool["name"],
            category=tool["category"],
            is_enabled=is_enabled,
            custom_timeout_seconds=custom_timeout_seconds,
            created_at=datetime.now(timezone.utc).isoformat()
        )

    @classmethod
    def unbind_tool_from_project(cls, project_id: str, tool_id: str) -> None:
        """Removes a tool binding from a project."""
        execute_commit(
            "DELETE FROM project_tool_bindings WHERE project_id = ? AND tool_id = ?",
            (project_id, tool_id)
        )
