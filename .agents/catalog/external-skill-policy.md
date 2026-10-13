# External Skill Import Policy

Do not place third-party skills directly in `.agents/skills/` until:
1. all referenced files exist;
2. scripts/templates/references are bundled;
3. frontmatter is valid;
4. tool/agent dependencies are available;
5. the skill has been reviewed for prompt conflicts and project assumptions.

Candidates removed from active discovery in v3:
- design-system
- userflow
- writing-plans
- spec-driven-development
- qa-manual-istqb
- qa-methodology

These were removed because the current bundle had missing dependencies, duplicate/incorrect identity, or overlap with native Antigravity `/plan` and the new project lifecycle skills.
