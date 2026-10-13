import json, sys
from pathlib import Path

def main():
    try: payload = json.loads(sys.stdin.read() or "{}")
    except json.JSONDecodeError:
        print(json.dumps({"decision":"allow"})); return
    roots = payload.get("workspacePaths") or ["."]
    marker = Path(roots[0]) / "work-items" / ".current"
    if not marker.exists(): print(json.dumps({"decision":"allow"})); return
    try: state = marker.read_text(encoding="utf-8").strip()
    except Exception: print(json.dumps({"decision":"allow"})); return
    if state and "READY_FOR_STOP" not in state:
        print(json.dumps({"decision":"continue","reason":"Current work item is not marked READY_FOR_STOP."}))
    else:
        print(json.dumps({"decision":"allow"}))
if __name__ == "__main__": main()
