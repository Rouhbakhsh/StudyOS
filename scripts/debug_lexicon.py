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
        if s_btn:
            s_btn.click()
            page.wait_for_timeout(1500)
    page.wait_for_selector("nav button:has-text('Lexicon')").click()
    page.wait_for_timeout(1500)
    inp = page.query_selector("input[placeholder*='Search words']")
    print('Found search input:', inp is not None)
    if inp:
        inp.fill('mistake')
        page.wait_for_timeout(1000)
        items = page.query_selector_all("div[id^='word-item-']")
        print('Found word items count:', len(items))
        for it in items[:5]:
            print('  item text:', it.inner_text().replace('\n', ' '))
    page.screenshot(path='scripts/screenshots/debug_search_mistake.png')
    browser.close()
