# AI Engineering Workspace — BA + Fullstack + Antigravity

## Mission
Use Antigravity to turn a user change request into an evidence-based, reviewable engineering change: discover -> plan -> model -> design -> implement -> verify -> synchronize -> release.

## Operating principle
Human owns intent, business decisions, constraints, approvals, and material architecture/security decisions.
Agents own evidence discovery, decomposition, transformation between artifacts, repetitive updates, and deterministic validation.

## Source-of-truth hierarchy
1. Approved requirements and acceptance criteria.
2. Approved business rules and decisions.
3. Existing code/config/infrastructure as evidence of current behavior.
4. Approved ADRs.
5. External standards/reference material.
6. AI inference — only as `ASSUMPTION` until approved.

## Fact classification
Use:
- FACT
- ASSUMPTION
- DECISION
- OPEN QUESTION

Never silently convert an assumption into a fact.

## Change lifecycle
For every non-trivial request:
1. classify the change;
2. inspect current state;
3. perform impact analysis;
4. identify required artifacts from `.agents/config/artifact-matrix.yaml`;
5. update requirements/models/design;
6. generate diagrams/contracts;
7. validate;
8. create/review implementation plan;
9. obtain human approval for the required gate;
10. implement;
11. verify;
12. synchronize models/docs;
13. check release readiness.

Use `/plan` for Antigravity's native implementation-plan workflow. Do not bypass planning for cross-layer or high-risk changes.

## Canonical model policy
`models/` is the canonical machine/agent-readable model layer.
`docs/` is the human-readable documentation layer.
`diagrams/` contains rendered views.
A diagram must not become the only source of truth.

## Identifier policy
Use stable IDs such as:
FR-###, NFR-###, BR-###, SEC-###, UX-###,
UC-###, PROC-###, DOM-###, ARCH-###, API-###,
SEQ-###, STATE-###, THR-###, CTRL-###, TC-###,
ADR-###, DEP-###.

## Safety
Default to read/analyze before write.
Never place real credentials in prompts, docs, fixtures, logs, source control, or generated examples.
Prefer Request Review for terminal execution and sensitive writes.
Destructive command hooks must be allowed to require human approval.

## Definition of Done
A change is complete only when:
- required artifacts were selected for the change type/risk;
- requested implementation is complete;
- tests/verification are complete;
- affected models and documentation are synchronized;
- traceability is valid or remaining gaps are explicit;
- assumptions/open questions and unresolved blockers are visible;
- no unsupported project facts were introduced.
