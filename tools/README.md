# Tooling

Install validator dependency:

```powershell
python -m pip install -r requirements-dev.txt
```

Run all validators:

```powershell
python tools/validators/run_all.py
```

Hooks are intentionally conservative. They are not a replacement for deterministic validation or human review.
