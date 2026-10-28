import json
import os
import sys
import re
import urllib.request
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8')

JSON_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "data", "oxford5000_offline.min.json")
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

# Import parser function from test_full_parser
from test_full_parser import parse_full_oxford_entry

with open(JSON_PATH, "r", encoding="utf-8") as f:
    words = json.load(f)

words_by_id = {w["id"]: w for w in words}

# Enrich mistake (3345), abandon (2), hand (2436), mind (3319), heart (2482), time (5404)
TARGETS = [
    (3345, "mistake", "https://www.oxfordlearnersdictionaries.com/definition/english/mistake_1"),
    (2, "abandon", "https://www.oxfordlearnersdictionaries.com/definition/english/abandon_1"),
    (2436, "hand", "https://www.oxfordlearnersdictionaries.com/definition/english/hand_1"),
    (3319, "mind", "https://www.oxfordlearnersdictionaries.com/definition/english/mind_1"),
    (2482, "heart", "https://www.oxfordlearnersdictionaries.com/definition/english/heart_1"),
    (5404, "time", "https://www.oxfordlearnersdictionaries.com/definition/english/time_1")
]

for w_id, word, url in TARGETS:
    print(f"Fetching full entry for {word} ({w_id})...")
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        html = urllib.request.urlopen(req, timeout=18).read().decode("utf-8")
        parsed = parse_full_oxford_entry(html, word)
        if parsed:
            entry = words_by_id.get(w_id)
            if entry:
                entry["word_origin"] = parsed.get("word_origin")
                entry["synonym_study"] = parsed.get("synonym_study")
                if parsed.get("synonyms"):
                    entry["synonyms"] = parsed["synonyms"]
                if parsed.get("idioms"):
                    entry["idioms"] = parsed["idioms"]
                
                # Merge senses
                if parsed.get("senses"):
                    entry["senses"] = parsed["senses"]
                print(f"  [+] Enriched {word}: origin={bool(entry.get('word_origin'))}, syn_study={bool(entry.get('synonym_study'))}, idioms={len(entry.get('idioms', []))}, senses={len(entry.get('senses', []))}")
    except Exception as e:
        print(f"  [-] Failed for {word}: {e}")

tmp_json = JSON_PATH + ".tmp"
with open(tmp_json, "w", encoding="utf-8") as f:
    json.dump(words, f, ensure_ascii=False)
os.replace(tmp_json, JSON_PATH)
print("Updated offline json with full accordions!")
