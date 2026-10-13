---
trigger: model_decision
description: Apply when changing requirements, process models, architecture, API specifications, security artifacts, test artifacts, or diagrams.
---

# Traceability Rules

Use relationships such as:

FR-001 -> UC-001
FR-001 -> BPMN-001
FR-001 -> API-001
API-001 -> SEQ-001
BR-001 -> STATE-001
SEC-001 -> TC-001

When an upstream artifact changes:
1. identify downstream artifacts;
2. classify impact as NONE / REVIEW / UPDATE;
3. update only after validating evidence.
