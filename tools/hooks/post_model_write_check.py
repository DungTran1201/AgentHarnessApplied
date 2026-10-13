import json, sys
from pathlib import Path

def main():
    try: payload = json.loads(sys.stdin.read() or "{}")
    except json.JSONDecodeError:
        print(json.dumps({})); return
    target = str(payload.get("toolCall", {}).get("args", {}).get("TargetFile", ""))
    if "/models/" not in target.replace('\\','/') and "\\models\\" not in target: print(json.dumps({})); return
    if Path(target).suffix.lower() not in {".yaml", ".yml", ".json"}:
        print(f"[MODEL-CHECK] {target}: canonical model should normally be YAML/YAML-like.", file=sys.stderr)
    print(json.dumps({}))
if __name__ == "__main__": main()
