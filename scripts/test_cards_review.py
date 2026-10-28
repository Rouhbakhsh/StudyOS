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

    # Click Cards tab
    cards_nav = page.wait_for_selector("nav button:has-text('Cards')", timeout=5000)
    cards_nav.click()
    page.wait_for_timeout(1000)

    card_items = page.query_selector_all("[data-card-item='true']")
    print('Found card items:', len(card_items))
    if card_items:
        print('First card visible:', card_items[0].is_visible())
        # Click to flip
        card_items[0].click()
        page.wait_for_timeout(500)
        flipped = page.query_selector(".rotate-y-180")
        print('Flipped element found:', bool(flipped))

    # Test Review button
    rev_btn = page.query_selector("button:has-text('Start Review')")
    print('Start Review button found:', bool(rev_btn))
    if rev_btn:
        print('Clicking Start Review...')
        rev_btn.click()
        page.wait_for_timeout(1000)
        dialog = page.query_selector("[role='dialog']")
        print('Dialog found:', bool(dialog))
        if dialog:
            # Check Persian Hint bulb
            hint_btn = page.query_selector("button:has(svg.lucide-lightbulb)") or page.query_selector("button[title*='هینت']")
            print('Hint button found:', bool(hint_btn))
            if hint_btn:
                hint_btn.click()
                page.wait_for_timeout(500)
                print('Hint clicked!')
            
            # Show Answer
            show_btn = page.query_selector("button:has-text('Show Answer')")
            print('Show Answer button found:', bool(show_btn))
            if show_btn:
                show_btn.click()
                page.wait_for_timeout(500)
                good_btn = page.query_selector("button:has-text('Good')")
                print('Good button found:', bool(good_btn))
                if good_btn:
                    good_btn.click()
                    page.wait_for_timeout(800)
                    print('Good button clicked!')

    browser.close()
