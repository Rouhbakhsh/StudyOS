import sqlite3
import json
import sys
sys.stdout.reconfigure(encoding='utf-8')

conn = sqlite3.connect(r"C:\Users\Roh\oxford_scraper\oxford5000.db")
cur = conn.cursor()
cur.execute("SELECT word, raw_json FROM word_entries WHERE word IN ('mistake', 'abandon', 'old')")
rows = cur.fetchall()
for word, raw in rows:
    data = json.loads(raw) if raw else {}
    print(f"Word: {word}, Keys in raw_json: {list(data.keys())}")
    for k in data:
        if k not in ('senses', 'verb_forms'):
            print(f"  {k}: {data[k]}")
conn.close()
