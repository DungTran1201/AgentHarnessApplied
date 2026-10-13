from pathlib import Path
import re
from collections import defaultdict

ID_RE = re.compile(r"\b(?:FR|NFR|BR|SEC|UX|UC|PROC|DOM|ARCH|API|SEQ|STATE|THR|CTRL|TC|ADR|DEP)-\d{3,}\b")
occ = defaultdict(set)
for p in Path("docs").rglob("*.md"):
    text = p.read_text(encoding="utf-8")
    for item in ID_RE.findall(text):
        occ[item].add(str(p))
review = 0
for item, paths in sorted(occ.items()):
    if item.startswith(("FR-", "NFR-", "BR-", "SEC-", "UX-")) and len(paths) < 2:
        print(f"[REVIEW] {item}: appears in only one doc; check traceability.")
        review += 1
print(f"Traceability review findings: {review}")
