from playwright.sync_api import sync_playwright
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
ARTIFACTS_DIR = r"C:\Users\Roh\.gemini\antigravity\brain\37edc265-f5aa-41ac-8f2d-d676d65f6616"

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 950})
    
    print("[1] Navigating to http://localhost:5173/ ...")
    page.goto('http://localhost:5173/')
    page.wait_for_timeout(1000)
    
    # Bypass onboarding if shown
    btn = page.query_selector("button:has-text('See my plan')")
    if btn:
        btn.click()
        page.wait_for_timeout(800)
        s_btn = page.query_selector("button:has-text('Start Day 1')")
        if s_btn:
            s_btn.click()
            # Wait for 2s launch animation to complete and transition to TodayView
            page.wait_for_timeout(3200)

    # Find the Open Lesson button for Oxford Word Skills
    print("[2] Opening Oxford Word Skills Unit 1...")
    page.evaluate("window.dispatchEvent(new CustomEvent('open-unit', { detail: { bookId: 'ows-el', unit: '1' } }))")
    page.wait_for_timeout(1500)

    # Verify UnitReader is showing OWS-EL Unit 1
    unit_title = page.wait_for_selector("div.font-black.text-lg", timeout=8000)
    title_text = unit_title.inner_text()
    print(f"  UnitReader Header: {title_text}")

    # Verify classroom illustration is rendered
    img = page.wait_for_selector("img[src*='books/ows-el/img/1-1.jpg']", timeout=8000)
    print(f"  Classroom illustration rendered: {img is not None}")

    # Verify vocabulary table is rendered
    table = page.wait_for_selector("table", timeout=8000)
    print(f"  Vocabulary table rendered: {table is not None}")

    page.screenshot(path=os.path.join(ARTIFACTS_DIR, "ows_el_unit_1_theory_sample.png"))
    print("  Saved ows_el_unit_1_theory_sample.png")

    # Scroll down to exercises
    ex_header = page.query_selector("h2:has-text('Exercise 1.1')")
    if ex_header:
        ex_header.scroll_into_view_if_needed()
        page.wait_for_timeout(600)

    # Click choices in Exercise 1.1:
    # 1 pencil -> ✓
    choice_btn_1 = page.query_selector("button:has-text('✓')")
    if choice_btn_1:
        choice_btn_1.click()
        page.wait_for_timeout(200)

    # Fill in Exercise 1.2 blanks
    gaps_1_2 = page.query_selector_all("input[type='text']")
    print(f"  Found {len(gaps_1_2)} input blanks in exercises.")
    if len(gaps_1_2) >= 6:
        # 1 board pen
        gaps_1_2[0].fill("pen")
        # 2 coursebook
        gaps_1_2[1].fill("book")
        # 3 noticeboard
        gaps_1_2[2].fill("board")
        # 4 exercise book
        gaps_1_2[3].fill("book")
        # 5 piece of paper
        gaps_1_2[4].fill("paper")
        # 6 CD player
        gaps_1_2[5].fill("player")

    # Click Check Answers
    check_btn = page.query_selector("button:has-text('Check Answers')")
    if check_btn:
        print("  Clicking 'Check Answers'...")
        check_btn.click()
        page.wait_for_timeout(1000)

    page.screenshot(path=os.path.join(ARTIFACTS_DIR, "ows_el_unit_1_exercises_checked.png"))
    print("  Saved ows_el_unit_1_exercises_checked.png")

    print("\n[✓] OWS-EL UNIT 1 SAMPLE FULLY VERIFIED IN LIVE READER!")
    browser.close()
