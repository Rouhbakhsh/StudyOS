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

sys.stdout.reconfigure(encoding='utf-8')

JSON_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "data", "oxford5000_offline.min.json")
BACKUP_SCRAPER_JSON = r"C:\Users\Roh\oxford_scraper\oxford5000_offline.min.json"
CHECKPOINT_PATH = r"C:\Users\Roh\oxford_scraper\all_idioms_checkpoint.json"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

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

def parse_oxford_clean(html, word):
    soup = BeautifulSoup(html, "html.parser")
    synonyms = set()
    opposites = set()

    # 1. Inline xrefs
    for xref in soup.select("span.xrefs, div.xrefs"):
        xt = xref.get("xt", "")
        text = xref.get_text(separator=" ", strip=True).lower()
        xh_tags = [x.get_text(strip=True) for x in xref.select(".xh")]
        if not xh_tags and xref.find("a"):
            xh_tags = [xref.find("a").get_text(strip=True)]
        if xt == "syn" or "synonym" in text:
            for s in xh_tags:
                clean = re.sub(r"[^a-zA-Z\-]", "", s).strip().lower()
                if clean and clean != word.lower() and clean not in STOP_WORDS and len(clean) >= 2:
                    synonyms.add(clean)
        elif xt == "opp" or "opposite" in text:
            for o in xh_tags:
                clean = re.sub(r"[^a-zA-Z\-]", "", o).strip().lower()
                if clean and clean != word.lower() and clean not in STOP_WORDS and len(clean) >= 2:
                    opposites.add(clean)

    # 2. Synonym Study box - ONLY direct eb under defpara
    for box in soup.find_all(attrs={"unbox": ["synonyms", "synonym_study"]}):
        for para in box.select(".defpara"):
            direct_eb = para.find("span", class_="eb", recursive=False)
            if direct_eb:
                txt = direct_eb.get_text(strip=True)
                clean = re.sub(r"[^a-zA-Z\-]", "", txt).strip().lower()
                if clean and clean != word.lower() and clean not in STOP_WORDS and len(clean) >= 2:
                    synonyms.add(clean)

    # 3. Opposite study box - ONLY direct eb under defpara
    for box in soup.find_all(attrs={"unbox": ["opposites", "opposite_study"]}):
        for para in box.select(".defpara"):
            direct_eb = para.find("span", class_="eb", recursive=False)
            if direct_eb:
                txt = direct_eb.get_text(strip=True)
                clean = re.sub(r"[^a-zA-Z\-]", "", txt).strip().lower()
                if clean and clean != word.lower() and clean not in STOP_WORDS and len(clean) >= 2:
                    opposites.add(clean)

    # 4. Idioms (.idm-g)
    idioms = []
    for g in soup.select(".idm-g"):
        idm = g.select_one(".idm")
        df = g.select_one(".def")
        exs = [x.get_text(strip=True) for x in g.select("ul.examples li .x")]
        if idm:
            phrase = idm.get_text(strip=True)
            if phrase:
                idioms.append({
                    "phrase": phrase,
                    "definition": df.get_text(strip=True) if df else "",
                    "examples": exs
                })

    return {
        "synonyms": sorted(list(synonyms)),
        "opposites": sorted(list(opposites)),
        "idioms": idioms
    }

def fetch_one(url, word):
    if not url.startswith("http"):
        url = "https://www.oxfordlearnersdictionaries.com" + url
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(2):
        try:
            time.sleep(random.uniform(0.1, 0.25))
            html = urllib.request.urlopen(req, timeout=16).read().decode("utf-8")
            return parse_oxford_clean(html, word), None
        except Exception as e:
            if attempt == 1:
                return None, str(e)
            time.sleep(1.0)
    return None, "Error"

def main():
    conn = sqlite3.connect(r"C:\Users\Roh\oxford_scraper\oxford5000.db")
    cur = conn.cursor()
    cur.execute("SELECT id, word, url FROM words_queue ORDER BY id ASC")
    db_items = cur.fetchall()
    conn.close()

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

    # Words that already have idioms in words_by_id can also be skipped
    for w in words:
        if w.get("idioms") and len(w["idioms"]) > 0:
            checkpoint.add(w["id"])

    pending = [item for item in db_items if item[0] not in checkpoint]
    print(f"Total entries: {len(db_items)}, Already processed: {len(checkpoint)}, Pending: {len(pending)}")

    batch_size = 25
    with ThreadPoolExecutor(max_workers=3) as ex:
        for i in range(0, len(pending), batch_size):
            batch = pending[i : i + batch_size]
            futures = [ex.submit(fetch_one, it[2], it[1]) for it in batch]
            
            for (w_id, word, url), fut in zip(batch, futures):
                data, err = fut.result()
                checkpoint.add(w_id)
                if not data:
                    continue
                entry = words_by_id.get(w_id)
                if entry:
                    if data["synonyms"]:
                        entry["synonyms"] = data["synonyms"]
                    if data["opposites"]:
                        entry["opposites"] = data["opposites"]
                    if data["idioms"]:
                        entry["idioms"] = data["idioms"]
                        print(f"[+] [{w_id}] {word} -> {len(data['idioms'])} idioms")

            # Save checkpoint & JSON every batch
            with open(CHECKPOINT_PATH, "w", encoding="utf-8") as f:
                json.dump(list(checkpoint), f)

            tmp_json = JSON_PATH + ".tmp"
            with open(tmp_json, "w", encoding="utf-8") as f:
                json.dump(words, f, ensure_ascii=False)
            try:
                os.replace(tmp_json, JSON_PATH)
            except:
                pass

            if (i // batch_size) % 5 == 0:
                print(f"Progress: {i + len(batch)}/{len(pending)} processed")

    print("All Oxford entries processed successfully!")

if __name__ == "__main__":
    main()
