from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
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

    inputs = page.query_selector_all("input[placeholder*='Search words']")
    print('Found search inputs:', len(inputs))
    for i, inp in enumerate(inputs):
        print(f'Input {i}: visible={inp.is_visible()}, box={inp.bounding_box()}')
        parent = inp.evaluate('el => el.parentElement.parentElement.className')
        print(f'  parent classes: {parent}')

    # Click Letter M
    letter_m = page.query_selector("button:has-text('M')")
    if letter_m:
        letter_m.click()
        page.wait_for_timeout(1000)
        print('After clicking M:')
        for i, inp in enumerate(inputs):
            print(f'Input {i}: visible={inp.is_visible()}, box={inp.bounding_box()}')
            parent = inp.evaluate('el => el.parentElement.parentElement.className')
            print(f'  parent classes: {parent}')

    browser.close()
