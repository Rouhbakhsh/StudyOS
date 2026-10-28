import sqlite3
import sys
sys.stdout.reconfigure(encoding='utf-8')

conn = sqlite3.connect(r"C:\Users\Roh\oxford_scraper\oxford5000.db")
cur = conn.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cur.fetchall()
print("Tables:", tables)

for (t,) in tables:
    cur.execute(f"PRAGMA table_info({t})")
    cols = [col[1] for col in cur.fetchall()]
    cur.execute(f"SELECT count(*) FROM {t}")
    cnt = cur.fetchone()[0]
    print(f"Table '{t}' ({cnt} rows): cols={cols}")

conn.close()
