from pathlib import Path

errors = 0
for p in Path("docs").rglob("*.md"):
    text = p.read_text(encoding="utf-8")
    if text.strip() and not text.lstrip().startswith("#"):
        print(f"[ERROR] {p}: missing Markdown title")
        errors += 1
print(f"Documentation structure: {errors} error(s)")
raise SystemExit(1 if errors else 0)
