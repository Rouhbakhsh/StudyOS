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

    # Click Lexicon
    page.query_selector("nav button:has-text('Lexicon')").click()
    page.wait_for_timeout(1000)

    # Click exact M button in the alphabet jump bar
    letter_m = page.query_selector("div.border-b button:text-is('M')")
    print('Letter M button:', letter_m is not None)
    if letter_m:
        letter_m.click()
        page.wait_for_timeout(1000)

    inp = page.query_selector("input[placeholder*='Search words']")
    print('Search input found:', inp is not None)
    if inp:
        print('Search input visible:', inp.is_visible())
        print('Bounding box:', inp.bounding_box())
        print('Outer HTML:', inp.evaluate('el => el.outerHTML'))
        print('Parent display:', inp.evaluate('el => window.getComputedStyle(el.parentElement).display'))
        print('Grandparent display:', inp.evaluate('el => window.getComputedStyle(el.parentElement.parentElement).display'))

    browser.close()
