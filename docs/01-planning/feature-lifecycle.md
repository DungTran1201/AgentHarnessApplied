# Reusable Feature Lifecycle

This is the project-wide workflow for implementing a user-requested change.

```text
Prompt
  -> Intake / Classification
  -> Current-State Discovery
  -> Impact Analysis
  -> Requirement + Acceptance
  -> Model / Design
  -> Diagram / Contract Views
  -> Validation
  -> /plan + Human Review
  -> Implementation
  -> Verification
  -> Model/Docs Synchronization
  -> Release Readiness
  -> Deploy / Observe
```

The exact documents are selected by change type, signals, and risk in `.agents/config/artifact-matrix.yaml`.
