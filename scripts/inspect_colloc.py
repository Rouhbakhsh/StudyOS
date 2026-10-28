import json
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open("public/data/oxford5000_offline.min.json", "r", encoding="utf-8") as f:
    data = json.load(f)

for w in data:
    for s in w.get("senses", []):
        if s.get("collocations"):
            print(f"Word: {w['word']}, Collocations: {s['collocations'][:3]}")
            break
    if w.get("collocations"):
        break
