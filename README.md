# Antigravity BA Engineering Starter v3

A workspace-scoped framework for BA + Fullstack + AI-assisted system modeling.

## Target workflow
Natural-language change -> classification -> discovery -> impact -> selected artifacts -> canonical models -> documents/diagrams -> `/plan` -> human review -> implementation -> verification -> synchronization -> release.

## Key directories
- `.agents/skills/` active reusable workflows
- `.agents/rules/` constraints
- `.agents/agents/` specialized subagents
- `.agents/config/` change classification and artifact selection policy
- `.agents/hooks.json` lifecycle automation
- `work-items/` per-change reasoning/approval records
- `models/` canonical structured models
- `docs/` human-readable documentation
- `diagrams/` rendered views
- `tools/validators/` deterministic checks
- `.agents/catalog/` external skill candidates; not active discovery

## First commands in Antigravity
1. `/plan` for any non-trivial implementation task.
2. `/agents` to inspect custom agents.
3. `/hooks` in CLI surfaces that support hook inspection.
4. Run `python tools/validators/run_all.py` before declaring a documentation baseline complete.

## Quick Start Demo
To launch the full AI-Chan platform (FastAPI Backend, Next.js Frontend, Local Agent Runner daemon, and optional Discord Bot) with automatic preflights:
```cmd
run-demo.bat
```
Each service starts in its own named **Command Prompt (`cmd.exe`)** window with live log streaming:
- `AI-Chan | Backend API` (`http://127.0.0.1:8000`)
- `AI-Chan | Frontend` (`http://localhost:3000`)
- `AI-Chan | Agent Runner` (Local task daemon)
- `AI-Chan | Discord Bot` (Optional, if configured)

### Demo Management & Options
- **Diagnostics check only**: `run-demo.bat --check`
- **Stop all services cleanly**: `run-demo.bat --stop` (or double-click `stop-demo.bat`)
- **Single console background mode**: `run-demo.bat --single-console`
- **Skip browser launch**: `run-demo.bat --no-browser`
- **Skip runner daemon**: `run-demo.bat --no-runner`
- **Skip discord bot**: `run-demo.bat --no-discord`
- **Runtime log files**: `logs/backend.log`, `logs/frontend.log`, `logs/runner.log`, `logs/discord.log`, `logs/demo-supervisor.log`
- Full documentation: [docs/development-orchestrator/README.md](file:///c:/Users/PC/Project/ai-chan/docs/development-orchestrator/README.md)

## First task
Ask the agent to inspect the repository read-only and build an evidence register. Then use `/plan` only after requirements/design inputs are sufficiently understood.
