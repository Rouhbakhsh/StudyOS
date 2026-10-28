import json
import os
import sys
import time
import random
import re
import urllib.request
import sqlite3
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed

# Ensure scripts dir in sys.path
sys.path.append(os.path.dirname(__file__))
from test_full_parser import parse_full_oxford_entry

sys.stdout.reconfigure(encoding='utf-8')

JSON_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "data", "oxford5000_offline.min.json")
DB_PATH = r"C:\Users\Roh\oxford_scraper\oxford5000.db"
CHECKPOINT_PATH = r"C:\Users\Roh\oxford_scraper\full_enrich_checkpoint.json"
PROGRESS_LOG = r"C:\Users\Roh\oxford_scraper\enrich_progress.log"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

def log(msg):
    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    formatted = f"[{ts}] {msg}"
    print(formatted, flush=True)
    try:
        with open(PROGRESS_LOG, "a", encoding="utf-8") as f:
            f.write(formatted + "\n")
    except:
        pass

def fetch_and_parse(w_id, word, url):
    if not url.startswith("http"):
        url = "https://www.oxfordlearnersdictionaries.com" + url
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(3):
        try:
            time.sleep(random.uniform(0.15, 0.35))
            html = urllib.request.urlopen(req, timeout=18).read().decode("utf-8")
            parsed = parse_full_oxford_entry(html, word)
            return w_id, word, parsed, None
        except Exception as e:
            if attempt == 2:
                return w_id, word, None, str(e)
            time.sleep(1.0 + attempt)
    return w_id, word, None, "Unknown error"

def main():
    log("=== Starting Oxford 5000 Full Enrichment Pipeline ===")
    
    if not os.path.exists(DB_PATH):
        log(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT id, word, url FROM words_queue ORDER BY id ASC")
    db_items = cur.fetchall()
    conn.close()

    log(f"Total entries in queue: {len(db_items)}")

    if not os.path.exists(JSON_PATH):
        log(f"Offline JSON not found at {JSON_PATH}")
        return

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        words = json.load(f)
    words_by_id = {w["id"]: w for w in words}

    checkpoint = set()
    if os.path.exists(CHECKPOINT_PATH):
        try:
            with open(CHECKPOINT_PATH, "r", encoding="utf-8") as f:
                checkpoint = set(json.load(f))
        except:
            checkpoint = set()

    # Pre-mark entries that already have full accordions (senses with collocations_grouped or extra_examples)
    for w in words:
        if w.get("word_origin") or w.get("synonym_study"):
            checkpoint.add(w["id"])
        elif any(s.get("collocations_grouped") or s.get("extra_examples") for s in w.get("senses", [])):
            checkpoint.add(w["id"])

    pending = [item for item in db_items if item[0] not in checkpoint]
    log(f"Total: {len(db_items)} | Already Enriched: {len(checkpoint)} | Pending to Enrich: {len(pending)}")

    batch_size = 20
    workers = 3
    processed_count = 0

    with ThreadPoolExecutor(max_workers=workers) as executor:
        for i in range(0, len(pending), batch_size):
            batch = pending[i : i + batch_size]
            futures = [executor.submit(fetch_and_parse, it[0], it[1], it[2]) for it in batch]

            for fut in as_completed(futures):
                w_id, word, parsed, err = fut.result()
                checkpoint.add(w_id)
                processed_count += 1

                if not parsed:
                    log(f"  [-] [{w_id}] {word} failed: {err}")
                    continue

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

                    origin_str = "✓" if entry.get("word_origin") else "✗"
                    syn_study_str = "✓" if entry.get("synonym_study") else "✗"
                    idm_count = len(entry.get("idioms") or [])
                    log(f"  [+] [{w_id}] {word}: origin={origin_str}, syn_study={syn_study_str}, idioms={idm_count}")

            # Save batch to checkpoint and offline json atomically
            try:
                with open(CHECKPOINT_PATH, "w", encoding="utf-8") as f:
                    json.dump(list(checkpoint), f)

                tmp_json = JSON_PATH + ".tmp"
                with open(tmp_json, "w", encoding="utf-8") as f:
                    json.dump(words, f, ensure_ascii=False)
                os.replace(tmp_json, JSON_PATH)
            except Exception as save_err:
                log(f"Save error: {save_err}")

            log(f"=== Progress: {processed_count}/{len(pending)} ({len(checkpoint)}/{len(db_items)} total) ===")

    log("=== Full Enrichment Pipeline Finished Successfully! ===")

if __name__ == "__main__":
    main()
