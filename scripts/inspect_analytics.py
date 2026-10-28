from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page(viewport={'width': 1366, 'height': 900})
    page.goto('http://localhost:5173/')
    page.wait_for_timeout(1000)
    btn = page.query_selector("button:has-text('See my plan')")
    if btn:
        btn.click()
        page.wait_for_timeout(500)
        s_btn = page.query_selector("button:has-text('Start Day 1')")
        if s_btn: s_btn.click()
        page.wait_for_timeout(1000)
    page.wait_for_selector("nav button:has-text('Analytics')").click()
    page.wait_for_timeout(1500)
    txt = page.inner_text('body')
    for line in txt.split('\n'):
        if any(w in line.lower() for w in ['retention', 'memory', 'health', 'fsrs', 'sm-2', 'sm2']):
            print('MATCH:', line)
    browser.close()
