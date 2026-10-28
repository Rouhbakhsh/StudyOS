import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open("public/data/oxford5000_offline.min.json", "r", encoding="utf-8") as f:
    data = json.load(f)

print(f"Total words: {len(data)}")

has_syn = 0
has_opp = 0
has_idioms = 0
has_colloc = 0

for w in data:
    if w.get("synonyms"):
        has_syn += 1
    if w.get("opposites"):
        has_opp += 1
    if w.get("idioms"):
        has_idioms += 1
    for s in w.get("senses", []):
        if s.get("collocations"):
            has_colloc += 1
            break

print(f"Words with synonyms: {has_syn}")
print(f"Words with opposites: {has_opp}")
print(f"Words with idioms: {has_idioms}")
print(f"Words with collocations: {has_colloc}")
