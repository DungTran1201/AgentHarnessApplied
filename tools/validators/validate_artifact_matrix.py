from pathlib import Path
try:
    import yaml
except ImportError:
    raise SystemExit("PyYAML is required")

path = Path(".agents/config/artifact-matrix.yaml")
data = yaml.safe_load(path.read_text(encoding="utf-8"))
required = ["common", "change_types", "risk_tiers"]
missing = [x for x in required if x not in data]
if missing:
    print("[ERROR] missing top-level keys:", ", ".join(missing))
    raise SystemExit(1)
print("Artifact matrix validation: OK")
