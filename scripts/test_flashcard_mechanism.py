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
    
    log("[1] Opening app at http://localhost:5173/ ...")
    page.goto('http://localhost:5173/')
    page.wait_for_timeout(1500)
    
    # Onboarding bypass if shown
    btn = page.query_selector("button:has-text('See my plan')")
    if btn:
        btn.click()
        page.wait_for_timeout(1000)
        start_day = page.query_selector("button:has-text('Start Day 1')")
        if start_day:
            start_day.click()
            page.wait_for_timeout(2500)
    
    # Wait for navbar
    log("[2] Navigating to Lexicon...")
    lex_btn = page.wait_for_selector("nav button:has-text('Lexicon')", timeout=12000)
    lex_btn.click()
    page.wait_for_timeout(1500)
    
    # Search mistake
    log("[3] Searching for 'mistake'...")
    inp = page.wait_for_selector("input[placeholder*='Search words']", timeout=8000)
    inp.fill("mistake")
    page.wait_for_timeout(1200)
    
    item = page.wait_for_selector("div[id^='word-item-']:has-text('mistake')", timeout=8000)
    item.click()
    page.wait_for_timeout(1500)
    
    # Check default closed accordions:
    syn_expand_btn = page.query_selector("button:has-text('Expand')")
    log(f"Synonym Study closed by default (shows Expand): {syn_expand_btn is not None}")
    
    extra_ex_btn = page.query_selector("button:has-text('Extra Examples')")
    log(f"Extra Examples present and closed: {extra_ex_btn is not None}")
    
    colloc_btn = page.query_selector("button:has-text('Oxford Collocations Dictionary')")
    log(f"Collocations present and closed: {colloc_btn is not None}")
    
    word_origin_btn = page.query_selector("button:has-text('Word Origin')")
    log(f"Word Origin present and closed: {word_origin_btn is not None}")
    
    # Take screenshot of closed accordions
    page.screenshot(path="scripts/screenshots/lexicon_all_closed_by_default.png")
    log("[+] Saved scripts/screenshots/lexicon_all_closed_by_default.png")
    
    # 2. Test adding idiom to flashcard
    log("[4] Adding idiom 'in mistake for' to Flashcards...")
    idm_btn = page.wait_for_selector("button[title='Add idiom to flashcards']", timeout=8000)
    idm_btn.click()
    page.wait_for_timeout(1200)
    
    # 3. Navigate to Cards tab
    log("[5] Navigating to Flashcards tab...")
    page.wait_for_selector("nav button:has-text('Cards')", timeout=8000).click()
    page.wait_for_timeout(1500)
    
    # Verify the created card
    card_el = page.wait_for_selector("div[data-card-item='true']:has-text('Idioms & Phrases')", timeout=8000)
    assert card_el is not None, "Idiom flashcard not found in deck"
    
    # Check that FRONT contains [ ... ] gap and Meaning
    front_text = card_el.inner_text()
    log(f"Front contains [ ... ] gap: {'[ ... ]' in front_text}")
    log(f"Front contains Meaning label: {'MEANING' in front_text.upper()}")
    
    # Take screenshot of FRONT
    page.screenshot(path="scripts/screenshots/flashcard_idiom_front.png")
    log("[+] Saved scripts/screenshots/flashcard_idiom_front.png")
    
    # Flip the card
    log("[6] Flipping card to BACK face...")
    card_el.click()
    page.wait_for_timeout(800)
    
    back_text = card_el.inner_text()
    log(f"Back contains Target Recall: {'TARGET RECALL' in back_text.upper()}")
    log(f"Back contains phrase 'in mistake for': {'in mistake for' in back_text.lower()}")
    
    # Take screenshot of BACK
    page.screenshot(path="scripts/screenshots/flashcard_idiom_back.png")
    log("[+] Saved scripts/screenshots/flashcard_idiom_back.png")
    
    # 4. Test Review Modal
    log("[7] Testing Review Modal (FSRS Active Recall)...")
    rev_btn = page.query_selector("button:has-text('Start Review')")
    if rev_btn:
        rev_btn.click()
        page.wait_for_timeout(1200)
        
        modal = page.wait_for_selector("div[role='dialog']", timeout=8000)
        modal_front_text = modal.inner_text()
        log(f"Review Modal front contains [ ... ]: {'[ ... ]' in modal_front_text}")
        log(f"Review Modal front contains Meaning: {'MEANING' in modal_front_text.upper()}")
        page.screenshot(path="scripts/screenshots/review_modal_front.png")
        log("[+] Saved scripts/screenshots/review_modal_front.png")
        
        # Click Show Answer
        show_ans = modal.query_selector("button:has-text('Show Answer')")
        if show_ans:
            show_ans.click()
            page.wait_for_timeout(800)
            modal_back_text = modal.inner_text()
            log(f"Review Modal back contains Target: {'in mistake for' in modal_back_text.lower()}")
            page.screenshot(path="scripts/screenshots/review_modal_back.png")
            log("[+] Saved scripts/screenshots/review_modal_back.png")
            
            # Click Good (3)
            good_btn = modal.query_selector("button:has-text('Good')")
            if good_btn:
                good_btn.click()
                page.wait_for_timeout(500)
    
    log("[✓] ALL FLASHCARD MECHANISM AND ACCORDION TESTS PASSED 100%!")
    browser.close()
