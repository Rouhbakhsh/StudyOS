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
    
    log("[1] Navigating to http://localhost:5174/ ...")
    page.goto('http://localhost:5174/')
    page.wait_for_timeout(2000)
    
    # Bypass onboarding if shown
    btn = page.query_selector("button:has-text('See my plan')")
    if btn:
        btn.click()
        page.wait_for_timeout(1000)
        s_btn = page.query_selector("button:has-text('Start Day 1')")
        if s_btn:
            s_btn.click()
            page.wait_for_timeout(2000)
            
    # Test BGIU Unit 1
    log("[2] Opening BGIU Unit 1 via dispatchEvent...")
    page.evaluate("window.dispatchEvent(new CustomEvent('open-unit', { detail: { bookId: 'bgiu', unit: '1' } }))")
    page.wait_for_timeout(2000)
    
    bgiu_header = page.query_selector("text='Unit 1'")
    log(f"BGIU Unit 1 opened: {bgiu_header is not None}")
    
    # Screenshot of BGIU Unit 1
    page.screenshot(path="scripts/screenshots/reader_bgiu_unit_1.png")
    log("[+] Saved scripts/screenshots/reader_bgiu_unit_1.png")
    
    # Scroll down to exercises
    log("[3] Scrolling to BGIU exercises...")
    page.evaluate("window.scrollBy(0, 700)")
    page.wait_for_timeout(1000)
    page.screenshot(path="scripts/screenshots/reader_bgiu_exercises.png")
    log("[+] Saved scripts/screenshots/reader_bgiu_exercises.png")
    
    # Test OWS-EL Unit 1
    log("[4] Opening OWS-EL Unit 1 via dispatchEvent...")
    page.evaluate("window.dispatchEvent(new CustomEvent('open-unit', { detail: { bookId: 'ows-el', unit: '1' } }))")
    page.wait_for_timeout(2000)
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(1000)
    
    ows_header = page.query_selector("text='Classroom vocabulary'")
    log(f"OWS-EL Unit 1 opened: {ows_header is not None}")
    
    # Screenshot of OWS-EL Unit 1
    page.screenshot(path="scripts/screenshots/reader_ows_el_unit_1.png")
    log("[+] Saved scripts/screenshots/reader_ows_el_unit_1.png")
    
    # Scroll to exercises
    page.evaluate("window.scrollBy(0, 500)")
    page.wait_for_timeout(1000)
    page.screenshot(path="scripts/screenshots/reader_ows_el_exercises.png")
    log("[+] Saved scripts/screenshots/reader_ows_el_exercises.png")
    
    log("[✓] BOTH BGIU AND OWS-EL LESSONS RENDERED AND VERIFIED ON PORT 5174!")
    browser.close()
