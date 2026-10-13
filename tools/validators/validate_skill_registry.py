import json
from pathlib import Path

ROOT = Path(".")
manifest = json.loads((ROOT / ".agents/skills_manifest.json").read_text(encoding="utf-8"))
manifest_paths = {item["path"] for item in manifest["skills"]}
actual_paths = {str(p.relative_to(ROOT)).replace("\\", "/") for p in (ROOT / ".agents/skills").glob("*/SKILL.md")}

missing = sorted(manifest_paths - actual_paths)
extra = sorted(actual_paths - manifest_paths)
errors = 0
for p in missing:
    print(f"[ERROR] manifest references missing skill: {p}"); errors += 1
for p in extra:
    print(f"[ERROR] active skill missing from manifest: {p}"); errors += 1
print(f"Skill registry validation: {errors} error(s)")
raise SystemExit(1 if errors else 0)
