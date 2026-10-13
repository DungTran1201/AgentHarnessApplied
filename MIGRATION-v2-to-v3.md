# Migration / Change Log — Antigravity BA Engineering Starter v3

## Goal
Convert the starter from a collection of documentation/AI skills into a change-driven BA + system-modeling workspace.

## 1. Removed from active discovery
The following directories were removed from `.agents/skills/`:

- `design-system` — incorrect identity in the supplied package; its content behaved like a user-flow dispatcher rather than a design-system skill.
- `userflow` — referenced `flow-*` skills that were not bundled in the supplied package.
- `writing-plans` — overlaps with Antigravity native `/plan` and contained external Superpowers dependencies not bundled here.
- `spec-driven-development` — referenced missing `references/` and external Superpowers skills.
- `qa-manual-istqb` — retained only as a quarantined candidate until its referenced supporting assets are bundled and audited.
- `qa-methodology` — retained only as a quarantined candidate until its referenced supporting assets are bundled and audited.
- `traceability-review` — replaced by the clearer `traceability-audit` role.

## 2. Preserved for reference
The six third-party candidates above are copied to:

`.agents/catalog/quarantined/`

They are intentionally outside `.agents/skills/` so they are not active Antigravity skills.

## 3. Renamed / consolidated active concepts
The active skill set now uses one canonical name for each major workflow:

project-discovery
change-intake
requirements-engineering
use-case-modeling
process-modeling
domain-modeling
system-context
architecture-modeling
api-contract
interaction-modeling
state-modeling
security-threat-modeling
test-modeling
deployment-operations
ux-modeling
impact-analysis
traceability-audit
documentation-review
feature-lifecycle
srs-generation
api-design-patterns
api-documentation

## 4. New project-level control layer
Added:
- `.agents/config/artifact-matrix.yaml`
- `.agents/config/change-types.yaml`
- `.agents/config/document-map.yaml`
- `.agents/config/phase-gates.yaml`
- `.agents/skill-registry.yaml`

These files define change classification, risk tiers, artifact selection, phase gates and the active skill inventory.

## 5. Work-item model
Added:

`work-items/_template/`

A work item stores the reasoning/approval lifecycle for one requested change without duplicating final documents.

## 6. Canonical models
Expanded `models/` to:
- requirements
- domain
- process
- context
- architecture
- api
- interaction
- state
- security
- testing
- deployment
- ux

## 7. Hooks
Replaced the mixed/custom hook configuration with the current Antigravity `hooks.json` event structure.

Active:
- destructive command review — `PreToolUse`
- sensitive file review — `PreToolUse`
- documentation post-write check — `PostToolUse`
- canonical model post-write check — `PostToolUse`

Optional but disabled:
- stop-readiness check — `Stop`

## 8. Validators
Added deterministic checks for:
- hooks schema shape
- skill registry consistency
- artifact matrix shape
- YAML model syntax
- document structure
- traceability

Run:

`python tools/validators/run_all.py`

## 9. Demo isolation
Authentication demo diagrams were moved out of production `diagrams/` and placed under `examples/authentication/`.

## 10. Environment template
Replaced the unrelated authentication-demo `.env.example` with a generic middleware-safe template for Discord, AI providers, GitHub integration and application security variables. It contains no real credentials.

## 11. Planning integration
Added:
- `docs/01-planning/feature-lifecycle.md`
- `docs/01-planning/plan-output-spec.md`
- `docs/01-planning/implementation-plan.template.md`
- `docs/01-planning/verification-plan.template.md`

The project workflow uses Antigravity native `/plan` for the implementation-plan artifact rather than maintaining a competing external plan engine.

## Validation
The v3 workspace passed:
- Python syntax compilation for hooks/validators
- Hook configuration structural validation
- Skill registry validation
- Artifact matrix validation
- Model YAML validation
- Documentation structure validation
- Traceability validation
- active skill/frontmatter consistency checks
