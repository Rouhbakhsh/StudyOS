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

    # Search mistake
    inp = page.query_selector("input[placeholder*='Search words']")
    inp.fill("mistake")
    page.wait_for_timeout(1000)

    # Click mistake item
    item = page.wait_for_selector("div[id^='word-item-']:has-text('mistake')", timeout=6000)
    print('Found mistake item:', item is not None)
    item.click()
    page.wait_for_timeout(1200)

    # Check header
    header = page.query_selector("h2:has-text('mistake')")
    print('Word header:', header.inner_text() if header else None)

    # Check SYN badge
    syn_badges = page.query_selector_all("span:has-text('SYN:')")
    print('SYN badges count:', len(syn_badges))

    # Check Idioms section
    idioms_h4 = page.query_selector("h4:has-text('Idioms')")
    print('Idioms heading:', idioms_h4.inner_text() if idioms_h4 else None)

    idm_phrases = page.query_selector_all("*:has-text('by mistake')")
    print('Found by mistake:', len(idm_phrases) > 0)

    # Test idiom add to flashcard
    idm_btn = page.query_selector("button[title='Add idiom to flashcards']")
    print('Add idiom to flashcards button found:', idm_btn is not None)
    if idm_btn:
        idm_btn.click()
        page.wait_for_timeout(600)
        print('Clicked Add idiom button!')

    browser.close()
