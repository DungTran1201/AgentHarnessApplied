import json, re, sys
PATTERNS = [
    r"(^|/|\\)\.env($|\.)", r"\.pem$", r"\.key$", r"\.p12$", r"\.pfx$",
    r"credentials\.json$", r"(^|/|\\)secrets($|/|\\)", r"prod.*secret"
]

def main():
    try: payload = json.loads(sys.stdin.read() or "{}")
    except json.JSONDecodeError:
        print(json.dumps({"decision":"force_ask","reason":"Invalid hook payload."})); return
    target = str(payload.get("toolCall", {}).get("args", {}).get("TargetFile", ""))
    if any(re.search(p, target, re.I) for p in PATTERNS):
        print(json.dumps({"decision":"force_ask","reason":"Sensitive file write requires human review."}))
    else:
        print(json.dumps({"decision":"allow"}))
if __name__ == "__main__": main()
