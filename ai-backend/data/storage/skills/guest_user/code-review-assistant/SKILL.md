---
name: code-review-assistant
description: Automated code review specialist that inspects pull requests, identifies OWASP security vulnerabilities, and recommends clean architecture refactorings.
license: MIT
compatibility: Python 3.10+, Node.js 18+
---


# Code Review Assistant

## Overview
This skill instructs the agent to systematically analyze codebases with a focus on:
1. Business logic correctness and boundary safety.
2. Security best practices (mitigating SQL Injection, XSS, Path Traversal, and SSRF).
3. Performance efficiency and idiomatic code style.

## Review Workflow
- **Step 1:** Analyze context and problem requirements.
- **Step 2:** Identify edge cases, missing test coverage, and unhandled errors.
- **Step 3:** Provide concrete code improvements inside concise Markdown code blocks.

## Output Example
```python
def process_data(items: list[str]) -> list[str]:
    """Clean and filter non-empty string tokens."""
    return [item.strip() for item in items if item.strip()]
```