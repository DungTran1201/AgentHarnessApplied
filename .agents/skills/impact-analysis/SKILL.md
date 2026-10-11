---
name: impact-analysis
description: Determines which requirements, models, diagrams, APIs, security artifacts, tests, UX and operational artifacts are affected by a proposed or actual change.
---
# Impact Analysis

1. Identify changed source/intent.
2. Build upstream/downstream dependency paths.
3. Classify each artifact NONE / REVIEW / UPDATE.
4. Identify risk escalation.
5. Record result in `work-items/<id>/impact-analysis.md`.

Do not update every dependent document automatically; update only after confirming the actual change.
