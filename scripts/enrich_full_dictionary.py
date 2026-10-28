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
CHECKPOINT_PATH = os.path.join(os.path.dirname(__file__), "enrich_checkpoint_v2.json")
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

def load_checkpoint():
    if os.path.exists(CHECKPOINT_PATH):
        try:
            with open(CHECKPOINT_PATH, "r", encoding="utf-8") as f:
                return set(json.load(f))
        except:
            return set()
    return set()

def save_checkpoint(done_set):
    tmp = CHECKPOINT_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(list(done_set), f)
    os.replace(tmp, CHECKPOINT_PATH)

def main():
    done_ids = load_checkpoint()

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        words = json.load(f)
    words_by_id = {w["id"]: w for w in words}

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT id, word, url FROM words_queue ORDER BY LOWER(word) ASC")
    all_queue = cur.fetchall()
    conn.close()

    # Determine which words need enrichment
    # A word needs enrichment if it hasn't been processed in done_ids AND
    # (word_origin is None OR collocations_grouped is None)
    candidates = []
    for row in all_queue:
        w_id, w_word, w_url = row[0], row[1], row[2]
        if w_id in done_ids:
            continue
        entry = words_by_id.get(w_id)
        if not entry:
            continue
        # Check if already fully rich
        has_origin = bool(entry.get("word_origin"))
        has_cg = any(bool(s.get("collocations_grouped")) for s in entry.get("senses", []))
        if has_origin and has_cg:
            done_ids.add(w_id)
            continue
        candidates.append((w_id, w_word, w_url))

    save_checkpoint(done_ids)
    print(f"Total words in DB: {len(all_queue)}")
    print(f"Already enriched: {len(done_ids)}")
    print(f"Candidates to enrich: {len(candidates)}")

    limit = None
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        limit = int(sys.argv[1])
        candidates = candidates[:limit]
        print(f"Enriching batch of {limit} words...")

    enriched_in_session = 0

    for idx, (w_id, word, url) in enumerate(candidates, 1):
        if not url.startswith("http"):
            full_url = "https://www.oxfordlearnersdictionaries.com" + url
        else:
            full_url = url

        req = urllib.request.Request(full_url, headers={"User-Agent": USER_AGENT})
        try:
            time.sleep(random.uniform(0.2, 0.35))
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

                    done_ids.add(w_id)
                    enriched_in_session += 1
                    
                    has_syn = bool(entry.get("synonym_study"))
                    has_origin = bool(entry.get("word_origin"))
                    cg_count = sum(1 for s in entry.get("senses", []) if s.get("collocations_grouped"))
                    print(f"[{idx}/{len(candidates)}] [id:{w_id}] {word}: syn_study={has_syn}, origin={has_origin}, cg_senses={cg_count}")
        except Exception as e:
            print(f"[-] [{idx}/{len(candidates)}] [id:{w_id}] {word} failed: {e}")

        # Save checkpoint and JSON every 25 words or at end
        if idx % 25 == 0 or idx == len(candidates):
            tmp_json = JSON_PATH + ".tmp"
            with open(tmp_json, "w", encoding="utf-8") as f:
                json.dump(words, f, ensure_ascii=False)
            os.replace(tmp_json, JSON_PATH)
            save_checkpoint(done_ids)
            print(f"--- [Checkpoint saved at word {idx}: {enriched_in_session} enriched] ---")

    print(f"\n[✓] Done session! Enriched {enriched_in_session} words.")

if __name__ == "__main__":
    main()
