from pathlib import Path
import sys

try:
    import yaml
except ImportError:
    print("PyYAML is required: python -m pip install -r requirements-dev.txt")
    raise SystemExit(2)

errors = 0
for p in Path("models").rglob("*.yaml"):
    try:
        data = yaml.safe_load(p.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            print(f"[ERROR] {p}: YAML root must be a mapping"); errors += 1
    except Exception as exc:
        print(f"[ERROR] {p}: {exc}"); errors += 1
print(f"Model validation: {errors} error(s)")
raise SystemExit(1 if errors else 0)
