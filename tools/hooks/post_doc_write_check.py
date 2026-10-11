import json, re, sys
from pathlib import Path
ID_RE = re.compile(r"\b(?:FR|NFR|BR|SEC|UX|UC|PROC|DOM|ARCH|API|SEQ|STATE|THR|CTRL|TC|ADR|DEP)-\d{3,}\b")

def main():
    try: payload = json.loads(sys.stdin.read() or "{}")
    except json.JSONDecodeError:
        print(json.dumps({})); return
    target = payload.get("toolCall", {}).get("args", {}).get("TargetFile")
    if not target or Path(target).suffix.lower() != ".md": print(json.dumps({})); return
    p = Path(target)
    if not p.exists(): print(json.dumps({})); return
    try: content = p.read_text(encoding="utf-8")
    except Exception: print(json.dumps({})); return
    ids = ID_RE.findall(content)
    repeats = sorted({x for x in ids if ids.count(x) > 1})
    if repeats: print(f"[DOC-CHECK] Repeated IDs in one document: {', '.join(repeats)}", file=sys.stderr)
    upper = content.upper()
    if "ASSUMPTION" in upper and "OPEN QUESTION" not in upper:
        print(f"[DOC-CHECK] {p}: assumptions exist without an OPEN QUESTION section.", file=sys.stderr)
    if "TODO" in upper or "TBD" in upper:
        print(f"[DOC-CHECK] {p}: TODO/TBD remains.", file=sys.stderr)
    print(json.dumps({}))
if __name__ == "__main__": main()
