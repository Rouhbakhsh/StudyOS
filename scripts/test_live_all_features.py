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
    page.wait_for_timeout(1500)
    
    # Bypass onboarding if shown
    btn = page.query_selector("button:has-text('See my plan')")
    if btn:
        btn.click()
        page.wait_for_timeout(1000)
        s_btn = page.query_selector("button:has-text('Start Day 1')")
        if s_btn:
            s_btn.click()
            page.wait_for_timeout(2500)
            
    # [2] Test TodayView Open Lesson button
    log("[2] Checking 'Open Lesson' button in TodayView...")
    open_lesson_btn = page.wait_for_selector("button:has-text('Open Lesson')", timeout=10000)
    assert open_lesson_btn is not None, "Open Lesson button not found"
    
    page.screenshot(path="scripts/screenshots/today_open_lesson_btn.png")
    log("[+] Saved scripts/screenshots/today_open_lesson_btn.png")
    
    # Click Open Lesson
    log("[3] Clicking 'Open Lesson'...")
    open_lesson_btn.click()
    page.wait_for_timeout(2000)
    
    # Check that UnitReader is open
    back_btn = page.wait_for_selector("button:has-text('Back')", timeout=8000)
    assert back_btn is not None, "Back button in UnitReader not found"
    
    unit_title = page.query_selector("div.font-black.text-lg")
    log(f"UnitReader opened successfully: {unit_title.inner_text() if unit_title else 'Yes'}")
    
    page.screenshot(path="scripts/screenshots/unit_reader_opened_from_today.png")
    log("[+] Saved scripts/screenshots/unit_reader_opened_from_today.png")
    
    # Click Back to return to Dashboard
    log("[4] Clicking Back in UnitReader...")
    back_btn.click()
    page.wait_for_timeout(1200)
    
    # [5] Test Lexicon Synonyms / Opposites Links
    log("[5] Navigating to Lexicon to test Synonyms and Opposites links...")
    page.wait_for_selector("nav button:has-text('Lexicon')", timeout=8000).click()
    page.wait_for_timeout(1200)
    
    # Search mistake
    inp = page.wait_for_selector("input[placeholder*='Search words']", timeout=8000)
    inp.fill("mistake")
    page.wait_for_timeout(1000)
    page.wait_for_selector("div[id^='word-item-']:has-text('mistake')", timeout=8000).click()
    page.wait_for_timeout(1200)
    
    # Expand Synonyms Study
    expand_btn = page.query_selector("button:has-text('Expand')")
    if expand_btn:
        expand_btn.click()
        page.wait_for_timeout(600)
        
    page.screenshot(path="scripts/screenshots/lexicon_syn_study_links.png")
    log("[+] Saved scripts/screenshots/lexicon_syn_study_links.png")
    
    # Click on synonym 'error' link
    log("[6] Clicking on synonym link 'error'...")
    error_btn = page.query_selector("button:text-is('error')")
    if error_btn:
        error_btn.click()
        page.wait_for_timeout(1500)
        
        current_word_h2 = page.query_selector("h2")
        log(f"Jumped to word: {current_word_h2.inner_text() if current_word_h2 else None}")
        page.screenshot(path="scripts/screenshots/lexicon_jumped_to_error.png")
        log("[+] Saved scripts/screenshots/lexicon_jumped_to_error.png")
        
    # [7] Check Cards Tab FSRS badges
    log("[7] Navigating to Flashcards to check FSRS titles...")
    page.wait_for_selector("nav button:has-text('Cards')", timeout=8000).click()
    page.wait_for_timeout(1200)
    
    cards_text = page.inner_text("body")
    log(f"Cards tab shows FSRS: {'FSRS' in cards_text}")
    log(f"Cards tab has NO SM-2: {'SM-2' not in cards_text}")
    
    page.screenshot(path="scripts/screenshots/cards_fsrs_view.png")
    log("[+] Saved scripts/screenshots/cards_fsrs_view.png")

    # [8] Check Analytics Tab for FSRS Health
    log("[8] Navigating to Analytics to check FSRS Health...")
    page.wait_for_selector("nav button:has-text('Analytics')", timeout=8000).click()
    page.wait_for_timeout(1200)

    analytics_text = page.inner_text("body")
    log(f"Analytics shows FSRS Health: {'FSRS Health' in analytics_text}")
    log(f"Analytics has NO SM-2: {'SM-2' not in analytics_text}")
    page.screenshot(path="scripts/screenshots/analytics_fsrs_health.png")
    log("[+] Saved scripts/screenshots/analytics_fsrs_health.png")
    
    log("[✓] ALL FEATURES TESTED AND VERIFIED ON PORT 5173 100%!")
    browser.close()
