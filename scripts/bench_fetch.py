import time
import random
import urllib.request
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

test_urls = [
    "https://www.oxfordlearnersdictionaries.com/definition/english/mistake_1",
    "https://www.oxfordlearnersdictionaries.com/definition/english/abandon_1",
    "https://www.oxfordlearnersdictionaries.com/definition/english/take_1",
    "https://www.oxfordlearnersdictionaries.com/definition/english/make_1",
    "https://www.oxfordlearnersdictionaries.com/definition/english/give_1",
    "https://www.oxfordlearnersdictionaries.com/definition/english/heart_1",
    "https://www.oxfordlearnersdictionaries.com/definition/english/hand_1",
    "https://www.oxfordlearnersdictionaries.com/definition/english/head_1",
    "https://www.oxfordlearnersdictionaries.com/definition/english/eye_1",
    "https://www.oxfordlearnersdictionaries.com/definition/english/face_1",
]

def fetch_one(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    t0 = time.time()
    try:
        html = urllib.request.urlopen(req, timeout=15).read().decode("utf-8")
        soup = BeautifulSoup(html, "html.parser")
        idms = [i.get_text(strip=True) for i in soup.select(".idm")]
        return len(idms), time.time() - t0
    except Exception as e:
        return str(e), time.time() - t0

t_start = time.time()
with ThreadPoolExecutor(max_workers=5) as ex:
    results = list(ex.map(fetch_one, test_urls))

elapsed = time.time() - t_start
print(f"Fetched 10 pages in {elapsed:.2f}s ({10/elapsed:.2f} pages/sec)")
for url, (res, t) in zip(test_urls, results):
    w = url.split('/')[-1]
    print(f"  {w:<12}: {res} idioms (in {t:.2f}s)")
