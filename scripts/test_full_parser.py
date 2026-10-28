import sys
import re
import urllib.request
import json
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8')

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

def parse_full_oxford_entry(html, word=""):
    soup = BeautifulSoup(html, "html.parser")
    entry_tag = soup.select_one(".entry")
    if not entry_tag:
        return None

    # 1. Headword & POS
    headword_tag = entry_tag.select_one(".headword")
    pos_tag = entry_tag.select_one(".pos")
    cefr_top_tag = entry_tag.select_one(".symbols")

    # 2. Phonetics & Audio
    phon_uk = entry_tag.select_one(".phons_br .phon")
    phon_us = entry_tag.select_one(".phons_n_am .phon")
    sound_uk = entry_tag.select_one(".phons_br .sound")
    sound_us = entry_tag.select_one(".phons_n_am .sound")

    # 3. Word Origin
    word_origin = ""
    origin_box = entry_tag.find(attrs={"unbox": "wordorigin"})
    if origin_box:
        body = origin_box.select_one(".body")
        word_origin = body.get_text(separator=" ", strip=True) if body else origin_box.get_text(separator=" ", strip=True)
        word_origin = re.sub(r"^Word Origin\s*", "", word_origin)

    # 4. Synonym Study Box (Which word? + Patterns)
    synonym_study = None
    syn_box = entry_tag.find(attrs={"unbox": "synonyms"})
    if syn_box:
        body = syn_box.select_one(".body") or syn_box
        overview_p = body.select_one("span.p, p")
        overview_text = overview_p.get_text(separator=" ", strip=True) if overview_p else ""
        
        # Words breakdown
        syn_items = []
        syn_words_list = []
        for defpara in body.select(".defpara"):
            eb = defpara.find("span", class_="eb", recursive=False)
            exs = [x.get_text(strip=True) for x in defpara.select("ul.examples li .unx, ul.examples li .x")]
            if not exs:
                exs = [li.get_text(strip=True) for li in defpara.select("ul.examples li")]
            if eb:
                w_str = eb.get_text(separator=" ", strip=True)
                clean_w = re.sub(r"[^a-zA-Z\-\s/]", "", w_str).strip()
                clean_w = re.sub(r"\s+", " ", clean_w)
                if clean_w:
                    syn_words_list.append(clean_w)
                    syn_items.append({
                        "word": clean_w,
                        "examples": exs
                    })

        # Which word? note
        which_word_text = ""
        ww_unbox = body.find(lambda tag: tag.name == "span" and "which word" in tag.get_text().lower() and "unbox" in tag.get("class", []))
        if ww_unbox:
            next_p = ww_unbox.find_next_sibling(lambda tag: tag.name in ["span", "p"] and "p" in tag.get("class", []))
            if next_p:
                which_word_text = next_p.get_text(separator=" ", strip=True)

        # Patterns
        patterns = []
        pat_box = body.select_one("span.patterns, div.patterns")
        if pat_box:
            patterns = [li.get_text(separator=" ", strip=True) for li in pat_box.select("ul.bullet li, li")]

        synonym_study = {
            "title": "Synonyms",
            "overview": overview_text,
            "words": syn_words_list,
            "items": syn_items,
            "which_word": which_word_text,
            "patterns": patterns
        }

    # 5. Idioms
    idioms = []
    for g in entry_tag.select(".idm-g"):
        idm = g.select_one(".idm")
        df = g.select_one(".def")
        exs = [x.get_text(strip=True) for x in g.select("ul.examples li .x")]
        if not exs:
            exs = [li.get_text(strip=True) for li in g.select("ul.examples li")]
        if idm:
            phrase = idm.get_text(strip=True)
            if phrase:
                idioms.append({
                    "phrase": phrase,
                    "definition": df.get_text(strip=True) if df else "",
                    "examples": exs
                })

    # 6. Senses
    senses = []
    for s_idx, sense_li in enumerate(entry_tag.select("li.sense")):
        def_tag = sense_li.select_one(".def")
        if not def_tag:
            continue

        cefr_tag = sense_li.select_one(".symbols")
        grammar_tag = sense_li.select_one(".grammar")

        # Examples
        examples = []
        for ex in sense_li.select("ul.examples li"):
            # skip if inside unbox / extra_examples
            if ex.find_parent(attrs={"unbox": True}):
                continue
            ex_txt = ex.select_one(".x") or ex.select_one(".unx")
            if ex_txt:
                examples.append(ex_txt.get_text(strip=True))

        # Patterns inside sense
        sense_patterns = [p.get_text(strip=True) for p in sense_li.select(".cf, .patterns .unx")]

        # Extra Examples box for this sense
        sense_extra_examples = []
        extra_box = sense_li.find(attrs={"unbox": "extra_examples"})
        if extra_box:
            for li in extra_box.select("ul.examples li"):
                txt = li.select_one(".unx") or li.select_one(".x") or li
                if txt:
                    sense_extra_examples.append(txt.get_text(strip=True))

        # Collocations Box for this sense (grouped)
        sense_collocations_grouped = []
        sense_collocations_flat = []
        colloc_box = sense_li.find(attrs={"unbox": "snippet"})
        if colloc_box:
            body = colloc_box.select_one(".body") or colloc_box
            current_category = "General"
            for el in body.children:
                if not el.name:
                    continue
                if "unbox" in el.get("class", []):
                    current_category = el.get_text(strip=True)
                elif el.name == "ul" and "collocs_list" in el.get("class", []):
                    items = [li.get_text(strip=True) for li in el.select("li.li") if li.get_text(strip=True) not in ["…", "..."]]
                    if items:
                        sense_collocations_grouped.append({
                            "category": current_category,
                            "items": items
                        })
                        sense_collocations_flat.extend(items)

        # Inline Synonyms & Opposites for this sense
        sense_syns = set()
        sense_opps = set()
        for xr in sense_li.select("span.xrefs, div.xrefs"):
            xt = xr.get("xt", "")
            xhs = [x.get_text(strip=True) for x in xr.select(".xh")]
            if not xhs and xr.find("a"):
                xhs = [xr.find("a").get_text(strip=True)]
            if xt == "syn":
                for s in xhs:
                    clean = re.sub(r"[^a-zA-Z\-\s/]", "", s).strip().lower()
                    clean = re.sub(r"\s+", " ", clean)
                    if clean:
                        sense_syns.add(clean)
            elif xt == "opp":
                for o in xhs:
                    clean = re.sub(r"[^a-zA-Z\-\s/]", "", o).strip().lower()
                    clean = re.sub(r"\s+", " ", clean)
                    if clean:
                        sense_opps.add(clean)

        senses.append({
            "definition": def_tag.get_text(strip=True),
            "cefr": cefr_tag.get_text(strip=True).upper() if cefr_tag else None,
            "grammar": grammar_tag.get_text(strip=True) if grammar_tag else None,
            "patterns": sense_patterns if sense_patterns else None,
            "examples": examples,
            "extra_examples": sense_extra_examples if sense_extra_examples else None,
            "collocations": sense_collocations_flat if sense_collocations_flat else None,
            "collocations_grouped": sense_collocations_grouped if sense_collocations_grouped else None,
            "synonyms": sorted(list(sense_syns)) if sense_syns else None,
            "opposites": sorted(list(sense_opps)) if sense_opps else None
        })

    # Word-level flat synonyms from study box or senses
    word_synonyms = set()
    if synonym_study:
        for w_s in synonym_study.get("words", []):
            if w_s.lower() != word.lower():
                word_synonyms.add(w_s.lower())
    for s in senses:
        if s.get("synonyms"):
            word_synonyms.update(s["synonyms"])

    return {
        "word": headword_tag.get_text(strip=True) if headword_tag else word,
        "pos": pos_tag.get_text(strip=True) if pos_tag else "",
        "cefr": cefr_top_tag.get_text(strip=True).upper() if cefr_top_tag else None,
        "phonetics": {
            "uk": phon_uk.get_text(strip=True) if phon_uk else None,
            "us": phon_us.get_text(strip=True) if phon_us else None
        },
        "audio": {
            "uk": sound_uk.get("data-src-mp3") if sound_uk else None,
            "us": sound_us.get("data-src-mp3") if sound_us else None
        },
        "word_origin": word_origin if word_origin else None,
        "synonym_study": synonym_study,
        "synonyms": sorted(list(word_synonyms)) if word_synonyms else None,
        "idioms": idioms if idioms else None,
        "senses": senses
    }

if __name__ == "__main__":
    url = "https://www.oxfordlearnersdictionaries.com/definition/english/mistake_1"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    html = urllib.request.urlopen(req, timeout=15).read().decode("utf-8")
    res = parse_full_oxford_entry(html, "mistake")
    print(json.dumps(res, indent=2, ensure_ascii=False))
