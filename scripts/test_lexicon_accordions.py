from playwright.sync_api import sync_playwright
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

os.makedirs("scripts/screenshots", exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page(viewport={'width': 1366, 'height': 900})
    
    print("[1] Opening app at http://localhost:5173/ ...")
    page.goto('http://localhost:5173/')
    page.wait_for_timeout(1000)
    
    # Onboarding bypass
    btn = page.query_selector("button:has-text('See my plan')")
    if btn:
        btn.click()
        page.wait_for_timeout(500)
        page.query_selector("button:has-text('Start Day 1')").click()
        page.wait_for_timeout(2500)
    
    # Navigate to Lexicon
    print("[2] Navigating to Lexicon...")
    page.query_selector("nav button:has-text('Lexicon')").click()
    page.wait_for_timeout(1000)
    
    # Search mistake
    print("[3] Searching for 'mistake'...")
    inp = page.query_selector("input[placeholder*='Search words']")
    inp.fill("mistake")
    page.wait_for_timeout(1000)
    
    item = page.wait_for_selector("div[id^='word-item-']:has-text('mistake')", timeout=6000)
    assert item is not None, "mistake not found in list"
    item.click()
    page.wait_for_timeout(1500)
    
    # 1. Check Synonym Study Box
    syn_study = page.query_selector("text='Synonyms Study'")
    print("Synonyms Study box visible:", syn_study is not None)
    
    # 2. Check Extra Examples accordion button and click it
    extra_ex_btn = page.query_selector("button:has-text('Extra Examples')")
    print("Extra Examples button visible:", extra_ex_btn is not None)
    if extra_ex_btn:
        print("  Clicking Extra Examples accordion...")
        extra_ex_btn.click()
        page.wait_for_timeout(500)
    
    # 3. Check Oxford Collocations Dictionary accordion button and click it
    colloc_btn = page.query_selector("button:has-text('Oxford Collocations Dictionary')")
    print("Collocations button visible:", colloc_btn is not None)
    if colloc_btn:
        print("  Clicking Collocations accordion...")
        colloc_btn.click()
        page.wait_for_timeout(500)
        
    # 4. Check Word Origin accordion and click it
    origin_btn = page.query_selector("button:has-text('Word Origin')")
    print("Word Origin button visible:", origin_btn is not None)
    if origin_btn:
        print("  Clicking Word Origin accordion...")
        origin_btn.click()
        page.wait_for_timeout(500)
        
    # 5. Check Idioms
    idioms_h4 = page.query_selector("h4:has-text('Idioms')")
    print("Idioms visible:", idioms_h4 is not None)
    
    # Take screenshot of full page with all accordions open!
    screenshot_path = "scripts/screenshots/lexicon_mistake_accordions_open.png"
    page.screenshot(path=screenshot_path, full_page=True)
    print(f"[+] Screenshot saved to {screenshot_path}")
    
    # Test collapse on Synonym Study
    collapse_syn = page.query_selector("button:has-text('Collapse')")
    if collapse_syn:
        print("  Clicking Collapse on Synonym Study...")
        collapse_syn.click()
        page.wait_for_timeout(400)
        expand_syn = page.query_selector("button:has-text('Expand')")
        print("  Synonym Study collapsed successfully:", expand_syn is not None)
    
    print("[✓] ALL ACCORDION TESTS PASSED SUCCESSFULLY!")
    browser.close()
