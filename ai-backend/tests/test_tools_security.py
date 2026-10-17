"""
Security and Vulnerability Tests for Tool Management System
Covers SSRF Defense, Path Traversal, AST Anti-Eval, and ReDoS Mitigation
"""

import sys
from pathlib import Path
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.services.tools.ssrf_guard import SSRFGuardEngine, SSRFValidationError
from src.services.tools.sandbox import StorageSandbox, StorageSandboxError
from src.services.tools.handlers.data_handlers import handle_calculator, handle_regex_extract


class TestSSRFDefenseEngine:
    def test_block_loopback_ip_and_localhost(self):
        """Chặn loopback 127.0.0.1 và localhost."""
        with pytest.raises(SSRFValidationError):
            SSRFGuardEngine.validate_url("http://127.0.0.1:8000/api/v1/tools")

        with pytest.raises(SSRFValidationError):
            SSRFGuardEngine.validate_url("http://localhost:3000/")

        with pytest.raises(SSRFValidationError):
            SSRFGuardEngine.validate_url("http://127.127.127.127/")

    def test_block_private_rfc1918_networks(self):
        """Chặn toàn bộ dải IP mạng riêng 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16."""
        with pytest.raises(SSRFValidationError):
            SSRFGuardEngine.validate_url("http://192.168.1.1/admin")

        with pytest.raises(SSRFValidationError):
            SSRFGuardEngine.validate_url("http://10.0.0.5:8080/internal")

        with pytest.raises(SSRFValidationError):
            SSRFGuardEngine.validate_url("http://172.16.0.1/")

    def test_block_cloud_metadata_endpoints(self):
        """Chặn endpoint cloud metadata 169.254.169.254 (AWS, GCP, Azure)."""
        with pytest.raises(SSRFValidationError):
            SSRFGuardEngine.validate_url("http://169.254.169.254/latest/meta-data/")

    def test_block_non_http_schemes(self):
        """Chặn các scheme nguy hiểm: file://, gopher://, dict://."""
        with pytest.raises(SSRFValidationError):
            SSRFGuardEngine.validate_url("file:///etc/passwd")

        with pytest.raises(SSRFValidationError):
            SSRFGuardEngine.validate_url("gopher://127.0.0.1:70/")


class TestStorageSandboxPathTraversal:
    def test_block_parent_directory_traversal(self):
        """Chặn đường dẫn chứa ../ thoát khỏi sandbox."""
        with pytest.raises(StorageSandboxError):
            StorageSandbox.resolve_safe_path("../../../../windows/system32/calc.exe")

        with pytest.raises(StorageSandboxError):
            StorageSandbox.resolve_safe_path("..\\..\\database\\app.db")

    def test_block_null_byte_injection(self):
        """Chặn tiêm ký tự null byte trong đường dẫn file."""
        with pytest.raises(StorageSandboxError):
            StorageSandbox.resolve_safe_path("test.txt\0.jpg")


class TestSafeCalculatorAntiEval:
    def test_block_code_execution_in_calculator(self):
        """Chặn tiêm mã lệnh Python vào calculator (chống RCE)."""
        malicious_inputs = [
            "__import__('os').system('dir')",
            "eval('1 + 1')",
            "exec('x = 5')",
            "print('hello')",
            "[x for x in range(10)]",
            "open('app.db', 'r')"
        ]
        for payload in malicious_inputs:
            with pytest.raises(ValueError) as exc:
                handle_calculator(payload)
            assert "Security error" in str(exc.value) or "syntax" in str(exc.value)

    def test_block_overflow_powers(self):
        """Chặn biểu thức lũy thừa khổng lồ làm treo CPU (DoS)."""
        with pytest.raises(OverflowError):
            handle_calculator("999999 ^ 999999")


class TestReDoSProtection:
    def test_block_oversized_regex_pattern(self):
        """Chặn pattern regex quá dài."""
        huge_pattern = "a" * 300
        with pytest.raises(ValueError):
            handle_regex_extract(huge_pattern, "sample text")
