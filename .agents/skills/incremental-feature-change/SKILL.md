---
name: incremental-feature-change
description: Analyze and implement new features incrementally by updating only the documentation, design, and code context affected by the change.
---

# Incremental Feature Change

## Purpose

Use this skill when adding, modifying, or extending a feature in an existing project.

The goal is to avoid re-reading and regenerating the entire project documentation for every change.

> **Impact analysis first. Targeted context second. Minimal change third.**

The existing documentation baseline is the project's source of truth.

---

## Workflow

```text
Feature Request
      ↓
Change Analysis
      ↓
Impact Analysis
      ↓
Targeted Context Retrieval
      ↓
Documentation Delta
      ↓
Consistency Validation
      ↓
Implementation Readiness
      ↓
Implementation
      ↓
Validation
      ↓
Documentation Update
```

---

## 1. Analyze the Change

Identify:

- Change ID
- Feature name
- User goal
- Business goal
- Actors
- Expected behavior
- Acceptance criteria

Do not invent missing requirements.

Use these markers when information is incomplete:

```text
[TBD]
[OPEN QUESTION]
[ASSUMPTION]
```

---

## 2. Perform Impact Analysis

Before reading broadly, determine which artifacts may be affected.

Review these documentation domains as needed:

```text
Requirements
Business Process
Use Cases
System Analysis
Architecture
Domain
API
Behavior
Security
UX
Testing
Operations
Governance
```

Classify affected artifacts as:

```text
DIRECT
INDIRECT
NO_IMPACT
UNKNOWN
```

Do not assume that every domain is affected.

---

## 3. Retrieve Minimum Sufficient Context

Read only the documents required to understand the change and its dependencies.

Preferred retrieval order:

1. Requirement or capability directly related to the feature
2. Related business process
3. Related use case
4. Related domain artifacts
5. Related API contracts
6. Related behavior artifacts
7. Related security artifacts
8. Related UX artifacts
9. Related testing artifacts
10. Related operational artifacts

Use targeted search and targeted reading.

Avoid loading the entire `docs/` directory unless a broader review is necessary.

> **Minimum sufficient context > unnecessary full-project context.**

---

## 4. Update Documentation Incrementally

Do not regenerate complete documentation sets.

Use only the required change operations:

```text
ADD
UPDATE
EXTEND
DEPRECATE
```

Preserve existing:

- Artifact IDs
- Requirement IDs
- Use Case IDs
- Business Rule IDs
- Terminology
- Valid decisions
- Existing traceability

Create a new artifact only when the change cannot be represented correctly by updating an existing one.

Never create duplicate canonical documents.

---

## 5. Maintain Traceability

A significant feature change should remain traceable through the affected dependency chain:

```text
Change
  ↓
Requirement
  ↓
Capability
  ↓
Business Process
  ↓
Use Case
  ↓
System Analysis
  ↓
Architecture / Domain / API / Behavior
  ↓
Security / UX
  ↓
Testing
  ↓
Operations
```

Only update the affected portion of this graph.

If an expected relationship is missing, report it instead of inventing it.

---

## 6. Handle Conflicts Safely

Never silently resolve conflicting requirements or documents.

When a conflict is found:

```text
[CONFLICT]
```

Record:

- conflicting artifacts
- conflicting statements
- impact
- recommended resolution
- decision required
- current status

Do not overwrite one source with another without a justified decision.

---

## 7. Record the Change

For each meaningful feature change, create:

```text
docs/14-governance/change-history/CR-XXX.md
```

Use this structure:

```md
# Change Request

## Change
## Reason
## Scope

## Impacted Artifacts

| Phase | Artifact | Impact | Action |
|------|----------|--------|--------|

## Added Requirements
## Updated Requirements
## Added / Updated Use Cases
## Added / Updated Business Rules

## Architecture Impact
## Domain Impact
## API Impact
## Behavior Impact
## Security Impact
## UX Impact
## Testing Impact
## Operations Impact

## Risks
## Open Questions
## Decisions

## Final Status
```

---

## 8. Validate Consistency

Validate only the affected dependency graph:

```text
Requirements
↔ Business Process
↔ Use Case
↔ System Analysis
↔ Architecture
↔ Domain
↔ API
↔ Behavior
↔ Security
↔ UX
↔ Testing
↔ Operations
```

Check for:

- broken references
- conflicting behavior
- orphan requirements
- missing traceability
- inconsistent terminology
- outdated diagrams
- outdated acceptance criteria
- security gaps
- test coverage gaps

Do not run a full-project review unless the impact analysis shows that it is necessary.

---

## 9. Implementation Readiness

Before coding, verify:

- Requirements are clear
- Acceptance criteria exist
- Required design dependencies exist
- Security impact is understood
- API/domain dependencies are ready
- Testing scenarios are identifiable
- Open questions are resolved or explicitly accepted

Set the change status to:

```text
READY_FOR_IMPLEMENTATION
```

or:

```text
BLOCKED
```

If blocked, record the blocking reason.

---

## 10. Implementation

Only begin implementation after the change reaches:

```text
READY_FOR_IMPLEMENTATION
```

During implementation:

- modify only required source code
- follow existing project conventions
- preserve existing behavior unless the change requires modification
- avoid unrelated refactoring
- keep implementation traceable to the change request

---

## 11. Post-Implementation Validation

After implementation:

1. Validate acceptance criteria.
2. Run appropriate tests.
3. Check affected integration points.
4. Review security impact.
5. Confirm no unrelated behavior changed.
6. Update only affected documentation.

Update documentation with actual changes such as:

- implemented behavior
- API changes
- domain changes
- security changes
- UX changes
- test results
- operational impact

Do not regenerate unrelated documents.

---

## 12. Token Efficiency Rules

Prefer:

```text
Targeted Search
    ↓
Targeted Read
    ↓
Impact Analysis
    ↓
Minimal Documentation Update
    ↓
Targeted Validation
```

Avoid:

```text
Read Everything
    ↓
Re-analyze Everything
    ↓
Regenerate Everything
```

Do not load large documentation sets unless the impact graph requires them.

---

## 13. Safety Rules

### MUST

- Use the existing documentation baseline.
- Perform impact analysis before broad document retrieval.
- Preserve existing IDs and conventions.
- Maintain traceability.
- Record assumptions and open questions.
- Validate affected artifacts after the change.
- Record meaningful changes in change history.
- Keep changes scoped to the requested feature.

### MUST NOT

- Invent requirements silently.
- Resolve conflicts silently.
- Rebuild the entire documentation set for a small change.
- Read unrelated documents without a reason.
- Create duplicate canonical artifacts.
- Change unrelated source code.
- Delete documentation without verified migration.
- Implement before reaching `READY_FOR_IMPLEMENTATION`.

---

## 14. Completion Criteria

A feature change is complete when:

- The requested feature is clearly defined.
- Impacted artifacts have been identified.
- Only required documentation has been updated.
- Traceability remains intact.
- Affected documents are consistent.
- Acceptance criteria are satisfied.
- Required tests are completed.
- Security and operational impacts are addressed where applicable.
- Change history is recorded.
- No unrelated documentation or code was modified.

Final status:

```text
COMPLETED
```

or:

```text
BLOCKED
```

with the reason documented.
