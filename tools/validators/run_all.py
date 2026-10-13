import subprocess, sys
checks = [
    "tools/validators/validate_hooks.py",
    "tools/validators/validate_skill_registry.py",
    "tools/validators/validate_artifact_matrix.py",
    "tools/validators/validate_models.py",
    "tools/validators/validate_docs.py",
    "tools/validators/validate_traceability.py",
]
failed = 0
for script in checks:
    print(f">>> {script}")
    r = subprocess.run([sys.executable, script])
    failed += r.returncode != 0
print(f"Validation complete. Failed checks: {failed}")
raise SystemExit(1 if failed else 0)
