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

    # Click Today tab
    page.query_selector("nav button:has-text('Today')").click()
    page.wait_for_timeout(1000)

    toggle_btns = page.query_selector_all("button[title='Toggle Exercises']")
    print('Toggle buttons count:', len(toggle_btns))
    for i, tb in enumerate(toggle_btns):
        print(f'Clicking toggle button {i}...')
        tb.click()
        page.wait_for_timeout(500)
        cloze_inps = page.query_selector_all("input[placeholder*='abandon']")
        print(f'  Found {len(cloze_inps)} cloze inputs after clicking button {i}')
        if cloze_inps:
            print('  Input visible:', cloze_inps[0].is_visible())
            print('  Placeholder:', cloze_inps[0].get_attribute('placeholder'))
            break

    browser.close()
