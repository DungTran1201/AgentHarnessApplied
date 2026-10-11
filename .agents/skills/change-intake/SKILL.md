---
name: change-intake
description: Classifies a natural-language change request, assigns a risk tier, discovers impact signals, and selects only the required artifacts for the change.
---
# Change Intake

1. Restate desired outcome.
2. Classify change using `.agents/config/change-types.yaml`.
3. Detect domain signals.
4. Assign R0-R4 risk using `.agents/config/artifact-matrix.yaml`.
5. Inspect current state.
6. Create a work item.
7. Select required/conditional artifacts.
8. Define the human approval gate.

Hard rule: never generate every document by default.
