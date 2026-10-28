from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page(viewport={'width': 1366, 'height': 850})
    page.goto('http://localhost:5173/')
    page.wait_for_timeout(1000)
    btn = page.query_selector("button:has-text('See my plan')")
    if btn:
        btn.click()
        page.wait_for_timeout(500)
        page.query_selector("button:has-text('Start Day 1')").click()
        page.wait_for_timeout(2500)

    page.query_selector("nav button:has-text('Lexicon')").click()
    page.wait_for_timeout(1000)
    buttons = page.query_selector_all("button:has-text('M')")
    print('Buttons with M:', len(buttons))
    for b in buttons:
        print('Text:', repr(b.inner_text().strip()), 'Parent:', b.evaluate('el => el.parentElement.className'))
    browser.close()
