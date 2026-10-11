# Active Skills

Only directories under `.agents/skills/` with a valid `SKILL.md` are active and discoverable by Antigravity.

Design principles:
- One skill = one focused workflow.
- `feature-lifecycle` orchestrates; it does not duplicate every domain rule.
- Canonical models are under `models/`.
- Supporting references belong inside the skill bundle or `.agents/catalog/`.
- Third-party skills are not active until their dependencies are audited.
