import json
import os
import sys
import time
import random
import re
import urllib.request
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.stdout.reconfigure(encoding='utf-8')

JSON_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "data", "oxford5000_offline.min.json")
BACKUP_SCRAPER_JSON = r"C:\Users\Roh\oxford_scraper\oxford5000_offline.min.json"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

# Core high-impact words with prominent idioms & synonyms
CORE_WORDS = [
    "mistake", "abandon", "mind", "heart", "hand", "eye", "head", "face", "time", "day",
    "way", "make", "take", "give", "get", "go", "come", "look", "break", "call", "turn",
    "bring", "hold", "keep", "run", "fall", "stand", "leave", "point", "word", "order",
    "line", "back", "part", "place", "work", "life", "world", "case", "end", "state",
    "light", "side", "old", "poor", "good", "bad", "big", "little", "long", "short",
    "high", "low", "right", "wrong", "clear", "close", "hard", "fast", "slow", "free",
    "full", "sure", "true", "fine", "fair", "dark", "deep", "easy", "early", "late",
    "action", "advantage", "advice", "age", "air", "arm", "art", "back", "ball", "bank",
    "base", "bed", "blood", "body", "book", "box", "boy", "business", "car", "chance",
    "change", "child", "city", "class", "clothes", "cold", "corner", "country", "course",
    "danger", "death", "difference", "dinner", "direction", "distance", "door", "doubt",
    "ear", "earth", "edge", "effort", "end", "example", "fact", "family", "father",
    "fear", "feeling", "field", "fight", "figure", "fire", "fish", "floor", "foot",
    "force", "friend", "front", "game", "girl", "glass", "god", "ground", "group"
]

def fetch_oxford(url, word):
    if not url.startswith("http"):
        url = "https://www.oxfordlearnersdictionaries.com" + url
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        html = urllib.request.urlopen(req, timeout=18).read().decode("utf-8")
        return parse_oxford(html, word)
    except Exception as e:
        return None

def parse_oxford(html, word):
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
                if clean and clean != word.lower() and len(clean) >= 2:
                    synonyms.add(clean)
        elif xt == "opp" or "opposite" in text:
            for o in xh_tags:
                clean = re.sub(r"[^a-zA-Z\-]", "", o).strip().lower()
                if clean and clean != word.lower() and len(clean) >= 2:
                    opposites.add(clean)

    # 2. Synonym Study box - ONLY direct eb under defpara (exact headwords)
    for box in soup.find_all(attrs={"unbox": ["synonyms", "synonym_study"]}):
        for para in box.select(".defpara"):
            direct_eb = para.find("span", class_="eb", recursive=False)
            if direct_eb:
                txt = direct_eb.get_text(strip=True)
                clean = re.sub(r"[^a-zA-Z\-]", "", txt).strip().lower()
                if clean and clean != word.lower() and len(clean) >= 2:
                    synonyms.add(clean)

    # 3. Opposite study box - ONLY direct eb under defpara
    for box in soup.find_all(attrs={"unbox": ["opposites", "opposite_study"]}):
        for para in box.select(".defpara"):
            direct_eb = para.find("span", class_="eb", recursive=False)
            if direct_eb:
                txt = direct_eb.get_text(strip=True)
                clean = re.sub(r"[^a-zA-Z\-]", "", txt).strip().lower()
                if clean and clean != word.lower() and len(clean) >= 2:
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

def main():
    import sqlite3
    conn = sqlite3.connect(r"C:\Users\Roh\oxford_scraper\oxford5000.db")
    cur = conn.cursor()
    cur.execute("SELECT id, word, url FROM words_queue")
    db_map = {}
    for r in cur.fetchall():
        w_lower = r[1].lower()
        if w_lower not in db_map:
            db_map[w_lower] = []
        db_map[w_lower].append((r[0], r[1], r[2]))
    conn.close()

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        words = json.load(f)
    words_by_id = {w["id"]: w for w in words}

    targets = []
    for cw in set(CORE_WORDS):
        if cw in db_map:
            for item in db_map[cw]:
                targets.append(item)

    print(f"Enriching {len(targets)} core word entries with synonyms, opposites, and idioms...")

    def worker(item):
        w_id, word, url = item
        data = fetch_oxford(url, word)
        return w_id, word, data

    count_enriched = 0
    with ThreadPoolExecutor(max_workers=5) as ex:
        futures = [ex.submit(worker, t) for t in targets]
        for fut in as_completed(futures):
            w_id, word, data = fut.result()
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
                print(f"[+] [{w_id}] {word:<12} -> Syn: {len(data['synonyms'])}, Opp: {len(data['opposites'])}, Idioms: {len(data['idioms'])}")
                count_enriched += 1

    print(f"Successfully enriched {count_enriched} entries!")

    tmp_json = JSON_PATH + ".tmp"
    with open(tmp_json, "w", encoding="utf-8") as f:
        json.dump(words, f, ensure_ascii=False)
    os.replace(tmp_json, JSON_PATH)
    print("Saved to public/data/oxford5000_offline.min.json")

if __name__ == "__main__":
    main()
