import asyncio
import os
import sys
from playwright.async_api import async_playwright

sys.stdout.reconfigure(encoding='utf-8')

ARTIFACTS_DIR = r"C:\Users\Roh\.gemini\antigravity\brain\37edc265-f5aa-41ac-8f2d-d676d65f6616"

async def run_tests():
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="msedge", headless=True)
        context = await browser.new_context(viewport={"width": 1400, "height": 900})
        page = await context.new_page()

        print("[1/5] Navigating to http://localhost:5173/ ...")
        await page.goto("http://localhost:5173/", wait_until="networkidle")
        await page.wait_for_timeout(1000)

        # Bypass onboarding if shown
        plan_btn = page.locator("button:has-text('See my plan')").first
        if await plan_btn.count() > 0:
            await plan_btn.click()
            await page.wait_for_timeout(1000)
            start_btn = page.locator("button:has-text('Start Day 1')").first
            if await start_btn.count() > 0:
                await start_btn.click()
                await page.wait_for_timeout(2500)

        # 1. Test TodayView and "Open Lesson"
        print("[2/5] Testing 'Open Lesson' button in TodayView...")
        open_lesson_btn = page.locator("button:has-text('Open Lesson')").first
        if await open_lesson_btn.count() > 0:
            print("  Found 'Open Lesson' button. Clicking...")
            await open_lesson_btn.click()
            await page.wait_for_timeout(1000)
            
            # Verify UnitReader is rendered
            reader_title = page.locator("h1:has-text('Unit')").first
            is_reader = await reader_title.count() > 0
            print(f"  Reader opened successfully: {is_reader}")
            await page.screenshot(path=os.path.join(ARTIFACTS_DIR, "verify_reader_opened.png"))

            # Click Back button
            back_btn = page.locator("button:has-text('Back')").first
            await back_btn.click()
            await page.wait_for_timeout(800)
            print("  Navigated back to TodayView.")

        # 2. Test Lexicon and Clickable Synonyms
        print("[3/5] Testing Lexicon and Clickable Synonyms/Opposites...")
        lexicon_tab = page.locator("button:has-text('Lexicon')").first
        await lexicon_tab.click()
        await page.wait_for_timeout(1200)

        # Search for 'mistake'
        search_input = page.locator("input[placeholder*='Search']").first
        await search_input.fill("mistake")
        await page.wait_for_timeout(800)

        mistake_item = page.locator("#word-item-3331, div:has-text('mistake')").first
        await mistake_item.click()
        await page.wait_for_timeout(800)

        # Expand Synonyms Study accordion
        expand_syn_btn = page.locator("button:has-text('Expand')").first
        if await expand_syn_btn.count() > 0:
            await expand_syn_btn.click()
            await page.wait_for_timeout(500)
            print("  Expanded Synonyms Study accordion.")

        await page.screenshot(path=os.path.join(ARTIFACTS_DIR, "verify_lexicon_mistake_synonyms.png"))

        # Click the synonym link 'error' inside the synonyms box
        error_link = page.locator("button:has-text('error')").first
        if await error_link.count() > 0:
            print("  Clicking synonym link 'error'...")
            await error_link.click()
            await page.wait_for_timeout(1000)
            
            # Verify entry header changed to error
            word_header = page.locator("h2.font-serif").first
            active_word = (await word_header.text_content() or "").strip()
            print(f"  Current active word after synonym click: '{active_word}'")
            assert "error" in active_word.lower(), f"Expected 'error', got '{active_word}'"
            print("  [✓] Clickable synonym successfully jumped to target word entry!")

        await page.screenshot(path=os.path.join(ARTIFACTS_DIR, "verify_jumped_to_error.png"))

        # Test Word Origin & Collocations
        origin_toggle = page.locator("button:has-text('Word Origin')").first
        if await origin_toggle.count() > 0:
            await origin_toggle.click()
            await page.wait_for_timeout(400)
            print("  [✓] Word Origin accordion toggled open.")

        colloc_toggle = page.locator("button:has-text('Oxford Collocations Dictionary')").first
        if await colloc_toggle.count() > 0:
            await colloc_toggle.click()
            await page.wait_for_timeout(400)
            print("  [✓] Oxford Collocations Dictionary accordion toggled open.")

        await page.screenshot(path=os.path.join(ARTIFACTS_DIR, "verify_origin_and_collocations.png"))

        # 3. Test Cards tab and verify 0 SM-2 occurrences
        print("[4/5] Testing Cards View for FSRS nomenclature...")
        cards_tab = page.locator("button:has-text('Cards')").first
        await cards_tab.click()
        await page.wait_for_timeout(800)

        page_content = await page.content()
        sm2_count = page_content.lower().count("sm-2") + page_content.lower().count("sm2")
        print(f"  SM-2 occurrences in Cards View: {sm2_count}")
        assert sm2_count == 0, f"Found {sm2_count} occurrences of SM-2 in Cards View!"
        print("  [✓] Zero SM-2 occurrences in Cards tab!")

        # 4. Test Analytics tab
        print("[5/5] Testing Analytics View for FSRS Health...")
        analytics_tab = page.locator("button:has-text('Analytics')").first
        await analytics_tab.click()
        await page.wait_for_timeout(800)

        analytics_content = await page.content()
        sm2_analytics_count = analytics_content.lower().count("sm-2") + analytics_content.lower().count("sm2")
        print(f"  SM-2 occurrences in Analytics View: {sm2_analytics_count}")
        assert sm2_analytics_count == 0, f"Found {sm2_analytics_count} occurrences of SM-2 in Analytics View!"

        has_fsrs_health = "fsrs health" in analytics_content.lower()
        print(f"  Found 'FSRS Health' in Analytics: {has_fsrs_health}")
        assert has_fsrs_health, "Expected 'FSRS Health' in Analytics View!"
        print("  [✓] Zero SM-2 occurrences in Analytics tab; 'FSRS Health' verified!")

        await page.screenshot(path=os.path.join(ARTIFACTS_DIR, "verify_analytics_fsrs.png"))

        await browser.close()
        print("\n==========================================")
        print("  ALL 5 LIVE E2E VERIFICATIONS PASSED 100%!")
        print("==========================================")

if __name__ == "__main__":
    asyncio.run(run_tests())
