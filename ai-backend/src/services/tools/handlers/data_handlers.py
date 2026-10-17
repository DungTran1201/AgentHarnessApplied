"""
Data & Utility Tool Handlers
Includes safe AST math evaluator (strictly NO eval), date/time info, unit conversion,
JSON schema validation, transformation, email format, diff, and safe regex extract.
"""

import ast
import operator
import re
from datetime import datetime, timezone
import zoneinfo
import difflib
from typing import Dict, Any, List, Optional


# ==============================================================================
# 1. CALCULATOR (SAFE AST EVALUATOR)
# ==============================================================================

_SAFE_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.BitXor: operator.pow,  # Support ^ as exponentiation in calculator expressions
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}


def _eval_ast_node(node: ast.AST) -> float | int:
    if isinstance(node, ast.Constant):
        if isinstance(node.value, (int, float)):
            return node.value
        raise ValueError(f"Unsupported constant type: {type(node.value).__name__}")

    if isinstance(node, ast.BinOp):
        op_type = type(node.op)
        if op_type not in _SAFE_OPERATORS:
            raise ValueError(f"Unsupported operator: {op_type.__name__}")
        left = _eval_ast_node(node.left)
        right = _eval_ast_node(node.right)
        if op_type in (ast.Div, ast.FloorDiv, ast.Mod) and right == 0:
            raise ZeroDivisionError("Division by zero is not permitted.")
        if op_type in (ast.Pow, ast.BitXor) and (abs(right) > 1000 or abs(left) > 10000):
            raise OverflowError("Exponent values too large to evaluate safely.")
        return _SAFE_OPERATORS[op_type](left, right)

    if isinstance(node, ast.UnaryOp):
        op_type = type(node.op)
        if op_type not in _SAFE_OPERATORS:
            raise ValueError(f"Unsupported unary operator: {op_type.__name__}")
        operand = _eval_ast_node(node.operand)
        return _SAFE_OPERATORS[op_type](operand)

    raise ValueError(f"Security error: AST node '{type(node).__name__}' is forbidden in safe calculator.")


def handle_calculator(expression: str) -> Dict[str, Any]:
    """Evaluates mathematical expression safely using AST parser without eval()."""
    if not expression or not isinstance(expression, str):
        raise ValueError("Expression must be a non-empty string.")

    cleaned = expression.strip().replace("^", "**")
    if len(cleaned) > 500:
        raise ValueError("Expression length exceeds maximum allowed limit of 500 characters.")

    try:
        parsed = ast.parse(cleaned, mode="eval")
    except SyntaxError as e:
        raise ValueError(f"Invalid mathematical expression syntax: {e}") from e

    result = _eval_ast_node(parsed.body)
    return {
        "expression": cleaned,
        "result": result,
        "is_integer": isinstance(result, int) or (isinstance(result, float) and result.is_integer())
    }


# ==============================================================================
# 2. DATE TIME INFO
# ==============================================================================

def handle_date_time_info(timezone_name: str = "UTC", format_str: Optional[str] = None) -> Dict[str, Any]:
    """Returns current runtime date/time in the specified timezone with Windows fallback."""
    tz_str = (timezone_name or "UTC").strip()
    if tz_str.upper() in ("UTC", "Z", "GMT"):
        tz = timezone.utc
    else:
        try:
            tz = zoneinfo.ZoneInfo(tz_str)
        except Exception:
            # Fallback for Windows environment without external tzdata package
            tz = timezone.utc
            tz_str = "UTC"

    now = datetime.now(tz)
    default_format = format_str or "%Y-%m-%d %H:%M:%S %Z"
    try:
        formatted = now.strftime(default_format)
    except Exception as e:
        raise ValueError(f"Invalid date format string: {e}") from e

    return {
        "iso": now.isoformat(),
        "timestamp": int(now.timestamp()),
        "timezone": tz_str,
        "formatted": formatted,
        "year": now.year,
        "month": now.month,
        "day": now.day,
        "hour": now.hour,
        "minute": now.minute,
        "second": now.second,
        "day_of_week": now.strftime("%A")
    }


# ==============================================================================
# 3. CONVERT UNITS
# ==============================================================================

_UNIT_FACTORS = {
    "length": {
        "m": 1.0, "km": 1000.0, "cm": 0.01, "mm": 0.001,
        "in": 0.0254, "ft": 0.3048, "yd": 0.9144, "mi": 1609.344
    },
    "mass": {
        "kg": 1.0, "g": 0.001, "mg": 0.000001,
        "lb": 0.45359237, "oz": 0.028349523125
    },
    "digital_storage": {
        "b": 1.0, "kb": 1024.0, "mb": 1024.0**2, "gb": 1024.0**3, "tb": 1024.0**4
    }
}


def handle_convert_units(value: float, from_unit: str, to_unit: str, unit_type: str = "length") -> Dict[str, Any]:
    """Converts values between supported measurement units."""
    unit_type_clean = unit_type.lower().strip()
    from_clean = from_unit.lower().strip()
    to_clean = to_unit.lower().strip()

    if unit_type_clean == "temperature":
        # Handle temperature specifically
        celsius = value
        if from_clean == "f":
            celsius = (value - 32) * 5 / 9
        elif from_clean == "k":
            celsius = value - 273.15
        elif from_clean != "c":
            raise ValueError(f"Unsupported from_unit for temperature: {from_unit}. Supported: 'C', 'F', 'K'")

        result = celsius
        if to_clean == "f":
            result = (celsius * 9 / 5) + 32
        elif to_clean == "k":
            result = celsius + 273.15
        elif to_clean != "c":
            raise ValueError(f"Unsupported to_unit for temperature: {to_unit}. Supported: 'C', 'F', 'K'")

        return {
            "value": value,
            "from_unit": from_unit,
            "to_unit": to_unit,
            "result": round(result, 6),
            "unit_type": "temperature"
        }

    if unit_type_clean not in _UNIT_FACTORS:
        raise ValueError(f"Unsupported unit_type: '{unit_type}'. Supported: length, mass, digital_storage, temperature")

    table = _UNIT_FACTORS[unit_type_clean]
    if from_clean not in table:
        raise ValueError(f"Unknown from_unit '{from_unit}'. Supported: {list(table.keys())}")
    if to_clean not in table:
        raise ValueError(f"Unknown to_unit '{to_unit}'. Supported: {list(table.keys())}")

    base_val = value * table[from_clean]
    res_val = base_val / table[to_clean]

    return {
        "value": value,
        "from_unit": from_unit,
        "to_unit": to_unit,
        "result": round(res_val, 8),
        "unit_type": unit_type_clean
    }


# ==============================================================================
# 4. VALIDATE JSON SCHEMA
# ==============================================================================

def handle_validate_json_schema(data: Any, schema: Dict[str, Any]) -> Dict[str, Any]:
    """Validates arbitrary JSON data against a JSON Schema."""
    if not isinstance(schema, dict):
        raise ValueError("Schema must be a valid JSON object dictionary.")

    try:
        import jsonschema
        validator = jsonschema.Draft7Validator(schema)
        errors = [err.message for err in validator.iter_errors(data)]
        return {
            "is_valid": len(errors) == 0,
            "error_count": len(errors),
            "errors": errors[:20]  # Cap error list
        }
    except ImportError:
        # Fallback basic schema validation if jsonschema not installed
        req = schema.get("required", [])
        missing = [f for f in req if isinstance(data, dict) and f not in data]
        return {
            "is_valid": len(missing) == 0,
            "error_count": len(missing),
            "errors": [f"Missing required property: {m}" for m in missing]
        }


# ==============================================================================
# 5. TRANSFORM JSON
# ==============================================================================

def handle_transform_json(
    data: Dict[str, Any],
    field_mapping: Optional[Dict[str, str]] = None,
    select_fields: Optional[List[str]] = None
) -> Dict[str, Any]:
    """Selects and renames fields from a JSON dictionary."""
    if not isinstance(data, dict):
        raise ValueError("Input data must be a JSON object dictionary.")

    transformed = {}
    mapping = field_mapping or {}

    # Extract selected fields or all fields
    keys_to_process = select_fields if select_fields is not None else list(data.keys())

    for k in keys_to_process:
        if k in data:
            target_key = mapping.get(k, k)
            transformed[target_key] = data[k]

    return {
        "transformed_data": transformed,
        "field_count": len(transformed)
    }


# ==============================================================================
# 6. VALIDATE EMAIL FORMAT
# ==============================================================================

_EMAIL_REGEX = re.compile(
    r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
)


def handle_validate_email_format(email: str) -> Dict[str, Any]:
    """Validates email address syntax (does NOT verify domain existence or mailbox)."""
    if not email or not isinstance(email, str):
        return {"email": str(email), "is_valid": False, "reason": "Email must be a non-empty string."}

    cleaned = email.strip()
    if len(cleaned) > 254:
        return {"email": cleaned, "is_valid": False, "reason": "Email length exceeds maximum 254 characters."}

    match = _EMAIL_REGEX.match(cleaned)
    if not match:
        return {"email": cleaned, "is_valid": False, "reason": "Syntax does not match standard RFC 5322 format."}

    parts = cleaned.split("@")
    return {
        "email": cleaned,
        "is_valid": True,
        "user_part": parts[0],
        "domain_part": parts[1]
    }


# ==============================================================================
# 7. TEXT DIFF
# ==============================================================================

def handle_text_diff(text_a: str, text_b: str, context_lines: int = 3) -> Dict[str, Any]:
    """Generates unified diff between two text strings and reports statistics."""
    lines_a = text_a.splitlines(keepends=True) if text_a else []
    lines_b = text_b.splitlines(keepends=True) if text_b else []

    diff = list(difflib.unified_diff(
        lines_a, lines_b,
        fromfile="original", tofile="modified",
        n=max(0, min(10, context_lines))
    ))

    additions = sum(1 for line in diff if line.startswith("+") and not line.startswith("+++"))
    deletions = sum(1 for line in diff if line.startswith("-") and not line.startswith("---"))

    return {
        "diff_text": "".join(diff),
        "additions": additions,
        "deletions": deletions,
        "is_identical": len(diff) == 0
    }


# ==============================================================================
# 8. REGEX EXTRACT
# ==============================================================================

def handle_regex_extract(pattern: str, text: str, max_matches: int = 100) -> Dict[str, Any]:
    """Safely extracts matching substrings with regex size limits to mitigate ReDoS."""
    if not pattern or not isinstance(pattern, str):
        raise ValueError("Pattern must be a non-empty string.")
    if len(pattern) > 200:
        raise ValueError("Regex pattern exceeds maximum length of 200 characters.")
    if len(text) > 500000:
        raise ValueError("Input text exceeds maximum length of 500,000 characters.")

    try:
        compiled = re.compile(pattern)
    except re.error as e:
        raise ValueError(f"Invalid regex pattern: {e}") from e

    matches = []
    for match in compiled.finditer(text):
        matches.append({
            "match": match.group(0),
            "groups": match.groups(),
            "start": match.start(),
            "end": match.end()
        })
        if len(matches) >= max(1, min(500, max_matches)):
            break

    return {
        "pattern": pattern,
        "match_count": len(matches),
        "matches": matches
    }
