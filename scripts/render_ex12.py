from playwright.sync_api import sync_playwright
import os

ARTIFACTS_DIR = r"C:\Users\Roh\.gemini\antigravity\brain\37edc265-f5aa-41ac-8f2d-d676d65f6616"

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 950})
    page.goto('http://localhost:5173/')
    page.wait_for_timeout(1000)
    
    # Bypass onboarding
    btn = page.query_selector("button:has-text('See my plan')")
    if btn:
        btn.click()
        page.wait_for_timeout(600)
        s_btn = page.query_selector("button:has-text('Start Day 1')")
        if s_btn:
            s_btn.click()
            page.wait_for_timeout(3200)

    # Open OWS-EL Unit 1
    page.evaluate("window.dispatchEvent(new CustomEvent('open-unit', { detail: { bookId: 'ows-el', unit: '1' } }))")
    page.wait_for_timeout(1500)

    # Scroll down to Exercise 1.2
    ex12 = page.query_selector("h2:has-text('Exercise 1.2'), h3:has-text('1.2'), span:has-text('1.2')")
    if ex12:
        ex12.scroll_into_view_if_needed()
        page.wait_for_timeout(800)

    page.screenshot(path=os.path.join(ARTIFACTS_DIR, "ows_el_unit_1_exercise_1_2.png"))
    print("Saved ows_el_unit_1_exercise_1_2.png")
    browser.close()
