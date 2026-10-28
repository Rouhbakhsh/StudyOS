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

    # 1. Lexicon: add idiom card
    page.query_selector("nav button:has-text('Lexicon')").click()
    page.wait_for_timeout(1000)
    inp = page.query_selector("input[placeholder*='Search words']")
    inp.fill("mistake")
    page.wait_for_timeout(800)
    item = page.wait_for_selector("div[id^='word-item-']:has-text('mistake')", timeout=6000)
    item.click()
    page.wait_for_timeout(1000)

    idm_btn = page.query_selector("button[title='Add idiom to flashcards']")
    idm_btn.click()
    page.wait_for_timeout(800)
    print('Added idiom flashcard!')

    # 2. Go to Cards tab
    page.query_selector("nav button:has-text('Cards')").click()
    page.wait_for_timeout(1000)

    cards = page.query_selector_all("[data-card-item='true']")
    print('Card items rendered:', len(cards))

    # Click card to flip
    if cards:
        cards[0].click()
        page.wait_for_timeout(500)
        flipped = page.query_selector(".rotate-y-180")
        print('Flipped 3D card:', bool(flipped))
        cards[0].click()
        page.wait_for_timeout(500)

    # 3. Test Start Review
    rev_btn = page.query_selector("button:has-text('Start Review')")
    print('Review button text:', rev_btn.inner_text().strip() if rev_btn else None)
    if rev_btn:
        rev_btn.click()
        page.wait_for_timeout(1000)
        dialog = page.query_selector("[role='dialog']")
        print('Review modal opened:', bool(dialog))
        if dialog:
            # Click Persian Hint bulb
            hint_btn = page.query_selector("button[title*='هینت']") or page.query_selector("button:has(svg.lucide-lightbulb)")
            print('Hint button found:', bool(hint_btn))
            if hint_btn:
                hint_btn.click()
                page.wait_for_timeout(400)
                print('Hint clicked!')
            
            # Show Answer
            show_btn = page.query_selector("button:has-text('Show Answer')")
            print('Show Answer found:', bool(show_btn))
            if show_btn:
                show_btn.click()
                page.wait_for_timeout(600)
                good_btn = page.query_selector("button:has-text('Good')")
                print('Good button found:', bool(good_btn))
                if good_btn:
                    good_btn.click()
                    page.wait_for_timeout(800)
                    print('Good button clicked (FSRS scheduled)!')

    browser.close()
