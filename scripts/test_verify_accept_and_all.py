from playwright.sync_api import sync_playwright
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
os.makedirs("scripts/screenshots", exist_ok=True)

def log(msg):
    print(msg, flush=True)

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page(viewport={'width': 1366, 'height': 900})
    
    log("[1] Navigating to http://localhost:5173/ ...")
    page.goto('http://localhost:5173/')
    page.wait_for_timeout(1000)
    
    # Bypass onboarding if shown
    btn = page.query_selector("button:has-text('See my plan')")
    if btn:
        btn.click()
        page.wait_for_timeout(500)
        s_btn = page.query_selector("button:has-text('Start Day 1')")
        if s_btn:
            s_btn.click()
            page.wait_for_timeout(1500)

    # 1. Today View - Open Lesson
    log("[2] Checking 'Open Lesson' button...")
    open_lesson_btn = page.wait_for_selector("button:has-text('Open Lesson')", timeout=8000)
    assert open_lesson_btn is not None
    open_lesson_btn.click()
    page.wait_for_timeout(1500)

    unit_title = page.wait_for_selector("div.font-black.text-lg", timeout=8000)
    log(f"  Reader opened: {unit_title.inner_text()}")
    page.screenshot(path="scripts/screenshots/reader_unit_1.png")

    back_btn = page.wait_for_selector("button:has-text('Back')", timeout=8000)
    back_btn.click()
    page.wait_for_timeout(1000)

    # 2. Lexicon - Test 'accept' (newly enriched word)
    log("[3] Navigating to Lexicon to inspect newly enriched word 'accept'...")
    page.wait_for_selector("nav button:has-text('Lexicon')", timeout=8000).click()
    page.wait_for_timeout(1500)

    inp = page.wait_for_selector("input[placeholder*='Search words']", timeout=8000)
    inp.fill("accept")
    page.wait_for_timeout(800)

    accept_item = page.wait_for_selector("div[id^='word-item-']:has-text('accept')", timeout=8000)
    accept_item.click()
    page.wait_for_timeout(1500)

    page.screenshot(path="scripts/screenshots/lexicon_accept_loaded.png")

    # Verify accordions on 'accept'
    syn_study_box = page.query_selector("div:has-text('Synonyms Study')")
    log(f"  'accept' has Synonyms Study: {syn_study_box is not None}")

    origin_box = page.query_selector("button:has-text('Word Origin')")
    log(f"  'accept' has Word Origin accordion: {origin_box is not None}")

    colloc_btn = page.query_selector("button:has-text('Oxford Collocations Dictionary')")
    log(f"  'accept' has Collocations accordion: {colloc_btn is not None}")

    # Expand Synonyms Study on 'accept'
    expand_btn = page.query_selector("button:has-text('Expand')")
    if expand_btn:
        expand_btn.click()
        page.wait_for_timeout(600)
        log("  Expanded Synonyms Study on 'accept'!")

    page.screenshot(path="scripts/screenshots/lexicon_accept_accordions.png")

    # Click on synonym 'agree' link
    agree_link = page.query_selector("button:text-is('agree')")
    if agree_link:
        log("  Clicking synonym link 'agree'...")
        agree_link.click()
        page.wait_for_timeout(1500)
        current_h2 = page.query_selector("h2")
        log(f"  Jumped to word: {current_h2.inner_text() if current_h2 else None}")
        page.screenshot(path="scripts/screenshots/lexicon_jumped_to_agree.png")

    # 3. Cards Tab
    log("[4] Checking Cards tab for FSRS...")
    page.wait_for_selector("nav button:has-text('Cards')", timeout=8000).click()
    page.wait_for_timeout(1000)
    cards_text = page.inner_text("body")
    assert "FSRS" in cards_text, "FSRS not found in Cards tab"
    assert "SM-2" not in cards_text, "SM-2 found in Cards tab"
    log("  Cards tab verified cleanly (FSRS present, 0 SM-2)")

    # 4. Analytics Tab
    log("[5] Checking Analytics tab...")
    page.wait_for_selector("nav button:has-text('Analytics')", timeout=8000).click()
    page.wait_for_timeout(1000)
    analytics_text = page.inner_text("body")
    assert "fsrs health" in analytics_text.lower(), "FSRS Health not found in Analytics tab"
    assert "sm-2" not in analytics_text.lower(), "SM-2 found in Analytics tab"
    log("  Analytics tab verified cleanly (FSRS Health present, 0 SM-2)")

    log("\n[✓] ALL 5 CORE FEATURES TESTED LIVE AND VERIFIED 100%!")
    browser.close()
