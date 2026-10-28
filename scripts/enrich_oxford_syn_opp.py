import json
import os
import sys
import time
import random
import re
import sqlite3
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from bs4 import BeautifulSoup

if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except:
        pass

DB_PATH = r"C:\Users\Roh\oxford_scraper\oxford5000.db"
JSON_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "data", "oxford5000_offline.min.json")
BACKUP_SCRAPER_JSON = r"C:\Users\Roh\oxford_scraper\oxford5000_offline.min.json"
CHECKPOINT_PATH = r"C:\Users\Roh\oxford_scraper\syn_opp_checkpoint.json"

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

def get_word_urls():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT id, word, url FROM words_queue ORDER BY id ASC")
    rows = cur.fetchall()
    conn.close()
    return {row[0]: (row[1], row[2]) for row in rows}

def fetch_oxford_syn_opp_with_retry(url, word="", max_retries=3):
    if not url.startswith("http"):
        url = "https://www.oxfordlearnersdictionaries.com" + url

    for attempt in range(1, max_retries + 1):
        try:
            time.sleep(random.uniform(0.15, 0.35))
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            html = urllib.request.urlopen(req, timeout=22).read().decode("utf-8")
            return parse_oxford_page(html, word), None
        except Exception as e:
            if attempt == max_retries:
                return None, str(e)
            time.sleep(1.0 * attempt)

    return None, "Max retries reached"

def parse_oxford_page(html, word=""):
    soup = BeautifulSoup(html, "html.parser")
    word_synonyms = set()
    word_opposites = set()

    # 1. Inline xrefs (both word level and top level)
    for xref in soup.select("span.xrefs, div.xrefs"):
        xt = xref.get("xt", "")
        text = xref.get_text(separator=" ", strip=True).lower()
        xh_tags = [x.get_text(strip=True) for x in xref.select(".xh, .xr-g")]
        if not xh_tags and xref.find("a"):
            xh_tags = [xref.find("a").get_text(strip=True)]

        if xt == "syn" or "synonym" in text:
            for s in xh_tags:
                clean = re.sub(r"[^a-zA-Z\-\s]", "", s).strip()
                if clean and clean.lower() not in ["synonym", word.lower()]:
                    word_synonyms.add(clean.lower())
        elif xt == "opp" or "opposite" in text:
            for o in xh_tags:
                clean = re.sub(r"[^a-zA-Z\-\s]", "", o).strip()
                if clean and clean.lower() not in ["opposite", word.lower()]:
                    word_opposites.add(clean.lower())

    # 2. Synonym Study / Thesaurus boxes (+ Synonyms word)
    for box in soup.find_all(attrs={"unbox": ["synonyms", "synonym_study"]}):
        for eb in box.select(".eb"):
            txt = eb.get_text(strip=True)
            if "/" in txt or " " in txt:
                continue
            clean = re.sub(r"[^a-zA-Z\-]", "", txt).strip()
            if clean and len(clean) >= 2 and clean.lower() not in [word.lower(), "in", "make", "contain", "the", "a", "an", "do"]:
                word_synonyms.add(clean.lower())

    # 3. Opposite boxes (+ Opposites word)
    for box in soup.find_all(attrs={"unbox": ["opposites", "opposite_study"]}):
        for eb in box.select(".eb"):
            txt = eb.get_text(strip=True)
            if "/" in txt or " " in txt:
                continue
            clean = re.sub(r"[^a-zA-Z\-]", "", txt).strip()
            if clean and len(clean) >= 2 and clean.lower() not in [word.lower(), "in", "the", "a", "an"]:
                word_opposites.add(clean.lower())

    # 4. Sense-level xrefs
    senses_result = []
    for sense_li in soup.select("li.sense"):
        def_tag = sense_li.select_one(".def")
        if not def_tag:
            continue
        sense_syns = set()
        sense_opps = set()
        for xref in sense_li.select("span.xrefs, div.xrefs, .xr-g"):
            xt = xref.get("xt", "")
            text = xref.get_text(separator=" ", strip=True).lower()
            xh_tags = [x.get_text(strip=True) for x in xref.select(".xh")]
            if not xh_tags and xref.find("a"):
                xh_tags = [xref.find("a").get_text(strip=True)]
            if xt == "syn" or "synonym" in text:
                for s in xh_tags:
                    clean = re.sub(r"[^a-zA-Z\-\s]", "", s).strip()
                    if clean and clean.lower() not in ["synonym", word.lower()]:
                        sense_syns.add(clean.lower())
                        word_synonyms.add(clean.lower())
            elif xt == "opp" or "opposite" in text:
                for o in xh_tags:
                    clean = re.sub(r"[^a-zA-Z\-\s]", "", o).strip()
                    if clean and clean.lower() not in ["opposite", word.lower()]:
                        sense_opps.add(clean.lower())
                        word_opposites.add(clean.lower())

        senses_result.append({
            "synonyms": sorted(list(sense_syns)),
            "opposites": sorted(list(sense_opps))
        })

    # 5. Idioms extraction
    idioms_result = []
    for idm_g in soup.select(".idm-g"):
        idm_tag = idm_g.select_one(".idm")
        def_tag = idm_g.select_one(".def")
        exs = [x.get_text(strip=True) for x in idm_g.select("ul.examples li .x")]
        if idm_tag:
            phrase = idm_tag.get_text(strip=True)
            if phrase:
                idioms_result.append({
                    "phrase": phrase,
                    "definition": def_tag.get_text(strip=True) if def_tag else "",
                    "examples": exs
                })

    return {
        "synonyms": sorted(list(word_synonyms)),
        "opposites": sorted(list(word_opposites)),
        "idioms": idioms_result,
        "senses": senses_result
    }

def main():
    max_workers = 3
    batch_size = 30

    print("Loading data...")
    urls_map = get_word_urls()

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        words_data = json.load(f)

    checkpoint = {}
    if os.path.exists(CHECKPOINT_PATH):
        try:
            with open(CHECKPOINT_PATH, "r", encoding="utf-8") as f:
                checkpoint = json.load(f)
            print(f"Loaded checkpoint with {len(checkpoint)} valid words.")
        except:
            checkpoint = {}

    pending_items = []
    for entry in words_data:
        w_id = entry.get("id")
        if str(w_id) not in checkpoint and w_id in urls_map:
            pending_items.append((w_id, urls_map[w_id][0], urls_map[w_id][1]))

    print(f"Total words: {len(words_data)}, Pending retry/enrichment: {len(pending_items)}")

    if not pending_items:
        print("All words already processed!")
        return

    words_by_id = {entry["id"]: entry for entry in words_data}
    count_saved = 0

    def process_one(item):
        w_id, word, url = item
        res, err = fetch_oxford_syn_opp_with_retry(url, word)
        return w_id, word, res, err

    print(f"Starting extraction with {max_workers} polite concurrent workers...")

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        for i in range(0, len(pending_items), batch_size):
            batch = pending_items[i : i + batch_size]
            futures = [executor.submit(process_one, it) for it in batch]

            batch_checkpoint_updates = {}

            for fut in as_completed(futures):
                w_id, word, res, err = fut.result()
                if err:
                    print(f"[-] [{w_id}] {word}: failed ({err}) - will retry next run")
                    continue

                syns = res["synonyms"]
                opps = res["opposites"]
                senses_meta = res["senses"]

                entry = words_by_id.get(w_id)
                if entry:
                    if syns:
                        entry["synonyms"] = syns
                    if opps:
                        entry["opposites"] = opps
                    if res.get("idioms"):
                        entry["idioms"] = res["idioms"]

                    if "senses" in entry and isinstance(entry["senses"], list):
                        for s_idx, sense in enumerate(entry["senses"]):
                            if s_idx < len(senses_meta):
                                if senses_meta[s_idx]["synonyms"]:
                                    sense["synonyms"] = senses_meta[s_idx]["synonyms"]
                                if senses_meta[s_idx]["opposites"]:
                                    sense["opposites"] = senses_meta[s_idx]["opposites"]

                batch_checkpoint_updates[str(w_id)] = {
                    "synonyms": syns,
                    "opposites": opps,
                    "senses_count": len(senses_meta)
                }

                if syns or opps:
                    print(f"[+] [{w_id}] {word} -> Syn: {syns}, Opp: {opps}")

            checkpoint.update(batch_checkpoint_updates)
            count_saved += len(batch)
            print(f"Saving progress... ({count_saved}/{len(pending_items)})")

            with open(CHECKPOINT_PATH, "w", encoding="utf-8") as f:
                json.dump(checkpoint, f, ensure_ascii=False)

            tmp_json = JSON_PATH + ".tmp"
            with open(tmp_json, "w", encoding="utf-8") as f:
                json.dump(words_data, f, ensure_ascii=False)
            try:
                os.replace(tmp_json, JSON_PATH)
            except Exception:
                pass

            if os.path.exists(os.path.dirname(BACKUP_SCRAPER_JSON)):
                try:
                    tmp_backup = BACKUP_SCRAPER_JSON + ".tmp"
                    with open(tmp_backup, "w", encoding="utf-8") as f:
                        json.dump(words_data, f, ensure_ascii=False)
                    os.replace(tmp_backup, BACKUP_SCRAPER_JSON)
                except:
                    pass

            time.sleep(0.3)

    print("Extraction complete!")

if __name__ == "__main__":
    main()
