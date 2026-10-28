import json
import os
import sys
import time
import random
import urllib.request
import sqlite3

sys.path.append(os.path.dirname(__file__))
from test_full_parser import parse_full_oxford_entry

sys.stdout.reconfigure(encoding='utf-8')

JSON_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "data", "oxford5000_offline.min.json")
DB_PATH = r"C:\Users\Roh\oxford_scraper\oxford5000.db"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

COMMON_WORDS = [
    "happy", "rich", "poor", "small", "big", "fast", "start", "help", "make", "take",
    "good", "bad", "beautiful", "angry", "hard", "easy", "problem", "danger", "idea",
    "job", "friend", "fear", "peace", "war", "power", "rule", "change", "move", "stop",
    "run", "walk", "talk", "look", "feel", "think", "know", "learn", "work", "play",
    "live", "buy", "sell", "pay", "give", "get", "find", "lose", "keep", "hold",
    "bring", "lead", "meet", "follow", "show", "tell", "speak", "read", "write", "ask",
    "try", "use", "need", "want", "mean", "seem", "happen", "allow", "provide", "continue",
    "set", "put", "open", "close", "begin", "end", "agree", "stand", "leave", "fall",
    "grow", "rise", "send", "build", "stay", "cut", "kill", "pass", "decide", "explain",
    "hope", "break", "support", "produce", "eat", "cover", "catch", "choose"
]

def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    placeholders = ",".join(f"'{w}'" for w in COMMON_WORDS)
    cur.execute(f"SELECT id, word, url FROM words_queue WHERE word IN ({placeholders})")
    queue_map = {row[1]: (row[0], row[2]) for row in cur.fetchall()}
    conn.close()

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        words = json.load(f)
    words_by_id = {w["id"]: w for w in words}

    print(f"Targeting {len(queue_map)} high-frequency words for full accordion enrichment...")
    success_count = 0

    for word, (w_id, url) in queue_map.items():
        if not url.startswith("http"):
            full_url = "https://www.oxfordlearnersdictionaries.com" + url
        else:
            full_url = url

        req = urllib.request.Request(full_url, headers={"User-Agent": USER_AGENT})
        try:
            time.sleep(random.uniform(0.2, 0.4))
            html = urllib.request.urlopen(req, timeout=15).read().decode("utf-8")
            parsed = parse_full_oxford_entry(html, word)
            if parsed:
                entry = words_by_id.get(w_id)
                if entry:
                    if parsed.get("word_origin"):
                        entry["word_origin"] = parsed["word_origin"]
                    if parsed.get("synonym_study"):
                        entry["synonym_study"] = parsed["synonym_study"]
                    if parsed.get("idioms"):
                        entry["idioms"] = parsed["idioms"]
                    if parsed.get("synonyms"):
                        entry["synonyms"] = parsed["synonyms"]
                    if parsed.get("senses"):
                        entry["senses"] = parsed["senses"]

                    has_syn = bool(entry.get("synonym_study"))
                    has_origin = bool(entry.get("word_origin"))
                    idm_len = len(entry.get("idioms") or [])
                    print(f"[+] [{w_id}] {word}: syn_study={has_syn}, origin={has_origin}, idioms={idm_len}, senses={len(entry.get('senses', []))}")
                    success_count += 1
        except Exception as e:
            print(f"[-] [{w_id}] {word} failed: {e}")

    # Save to JSON
    tmp = JSON_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(words, f, ensure_ascii=False)
    os.replace(tmp, JSON_PATH)
    print(f"\n[✓] Successfully enriched {success_count} core Oxford words!")

if __name__ == "__main__":
    main()
