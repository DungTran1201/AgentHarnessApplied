---
name: feature-lifecycle
description: Orchestrates a reusable change workflow from a natural-language prompt through classification, discovery, impact analysis, selected requirements/models/diagrams, reviewable implementation planning, coding, verification, synchronization, and release readiness.
---
# Feature Lifecycle

## Principle
Do not treat every request as a full-project documentation exercise. The work item selects the minimum artifact set needed for the change and risk.

## 1. Intake
Run `change-intake`.
Classify the request and assign risk.

## 2. Discovery
Run `project-discovery` and inspect the current implementation/evidence.

## 3. Impact
Run `impact-analysis`. Build the affected-artifact map.

## 4. Artifact selection
Use `.agents/config/artifact-matrix.yaml` and the detected change signals. Create only the selected artifacts.

## 5. Requirement alignment
When behavior/product scope changes, update requirements, acceptance criteria and use cases as applicable.

## 6. Canonical modeling
Load only applicable domain skills. Canonical structured models live under `models/`.

## 7. Views and contracts
Derive BPMN, Swimlane, Context, Component, Sequence, State, Deployment, OpenAPI and Markdown views from canonical models/evidence where applicable.

## 8. Validation
Run deterministic validators. Use traceability and documentation/security/QA reviewers based on risk.

## 9. Implementation planning
Use Antigravity native `/plan`. The plan should conform to `docs/01-planning/plan-output-spec.md` and incorporate the selected artifact set plus impact findings.

## 10. Human approval
- R0/R1: normal review
- R2: implementation-plan review
- R3: plan + relevant domain/security/data/integration review
- R4: explicit human approval before execution

## 11. Implementation
Implement only the approved scope. Keep changes tied to the active work item.

## 12. Verification
Run relevant tests, validators, and independent review agents.

## 13. Synchronization
Update affected canonical models, documentation and diagrams after implementation.

## 14. Release readiness
Check security, migration/rollback, observability, tests, documentation, and unresolved blockers.

## Completion state
The work item may be marked `READY_FOR_STOP` only when the Definition of Done is satisfied.
