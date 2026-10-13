import json, re, sys
DANGEROUS = [
    r"\brm\s+-rf\b", r"\brm\s+-fr\b", r"\bdel\s+/[sSqQ]\b", r"\brmdir\s+/s\b",
    r"\bformat\s+[a-zA-Z]:", r"\bgit\s+reset\s+--hard\b", r"\bgit\s+clean\s+-[a-zA-Z]*f",
    r"\bgit\s+push\s+.*--force", r"\bdrop\s+(database|table)\b", r"\btruncate\s+table\b",
    r"\bterraform\s+destroy\b", r"\bkubectl\s+delete\s+(namespace|deployment|statefulset|daemonset)\b"
]

def main():
    try: payload = json.loads(sys.stdin.read() or "{}")
    except json.JSONDecodeError:
        print(json.dumps({"decision":"force_ask","reason":"Invalid hook payload."})); return
    tc = payload.get("toolCall", {})
    command = str(tc.get("args", {}).get("CommandLine", "")) if tc.get("name") == "run_command" else ""
    if any(re.search(p, command, re.I) for p in DANGEROUS):
        print(json.dumps({"decision":"force_ask","reason":"Potentially destructive command detected. Review before execution."}))
    else:
        print(json.dumps({"decision":"allow"}))
if __name__ == "__main__": main()
