import json
import re

STOP_WORDS = {
    'a', 'an', 'the', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'against', 'between',
    'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down',
    'of', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
    'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
    'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't',
    'can', 'will', 'just', 'don', 'should', 'now', 'be', 'have', 'has', 'had', 'do', 'does',
    'did', 'that', 'this', 'these', 'those', 'is', 'am', 'are', 'was', 'were', 'being', 'been',
    'feel', 'make', 'contain', 'possible', 'where'
}

with open("public/data/oxford5000_offline.min.json", "r", encoding="utf-8") as f:
    data = json.load(f)

cleaned_count = 0
for w in data:
    word_text = w.get("word", "").lower()
    if "synonyms" in w and isinstance(w["synonyms"], list):
        orig = w["synonyms"]
        cleaned = [
            s.strip().lower() for s in orig 
            if s.strip().lower() not in STOP_WORDS 
            and s.strip().lower() != word_text
            and len(s.strip()) >= 2
            and not re.search(r"[^a-zA-Z\-]", s.strip())
        ]
        if cleaned != orig:
            w["synonyms"] = sorted(list(set(cleaned)))
            cleaned_count += 1

    if "opposites" in w and isinstance(w["opposites"], list):
        orig = w["opposites"]
        cleaned = [
            o.strip().lower() for o in orig 
            if o.strip().lower() not in STOP_WORDS 
            and o.strip().lower() != word_text
            and len(o.strip()) >= 2
            and not re.search(r"[^a-zA-Z\-]", o.strip())
        ]
        if cleaned != orig:
            w["opposites"] = sorted(list(set(cleaned)))
            cleaned_count += 1

print(f"Cleaned stop-words from {cleaned_count} words.")
with open("public/data/oxford5000_offline.min.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False)
print("Updated public/data/oxford5000_offline.min.json")
