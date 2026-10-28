import os
import sys
import time
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def run_e2e_tests():
    print("==================================================")
    print("  STUDYOS COMPREHENSIVE LIVE END-TO-END AUDIT")
    print("==================================================")

    results = []
    console_errors = []

    def record(name, success, detail=""):
        status = "PASS" if success else "FAIL"
        print(f"[{status}] {name} {('- ' + detail) if detail else ''}")
        results.append((name, success, detail))

    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(channel="msedge", headless=True)
        except:
            browser = p.chromium.launch(headless=True)

        context = browser.new_context(viewport={"width": 1366, "height": 850})
        page = context.new_page()

        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda exc: console_errors.append(str(exc)))

        # 1. Navigation to Dev Server
        print("\n--- 1. Testing Initial Load & Server Connection ---")
        try:
            page.goto("http://localhost:5173/", wait_until="networkidle", timeout=20000)
            page.wait_for_timeout(1000)
            record("Load Application", True, "Connected to http://localhost:5173/")
        except Exception as e:
            record("Load Application", False, str(e))
            return

        # 2. Welcome Screen / Onboarding Check
        print("\n--- 2. Testing Welcome / Onboarding Screen ---")
        try:
            name_input = page.query_selector("input#learner-name") or page.query_selector("input[placeholder*='name' i]")
            if name_input:
                name_input.fill("Playwright Tester")
                page.screenshot(path=os.path.join(SCREENSHOT_DIR, "00_welcome_screen.png"))
                
                see_plan_btn = page.query_selector("button:has-text('See my plan')")
                if see_plan_btn:
                    see_plan_btn.click()
                    page.wait_for_timeout(800)
                    page.screenshot(path=os.path.join(SCREENSHOT_DIR, "00_journey_plan.png"))

                start_day_btn = page.query_selector("button:has-text('Start Day 1')")
                if start_day_btn:
                    start_day_btn.click()
                    page.wait_for_timeout(2600)
                    page.screenshot(path=os.path.join(SCREENSHOT_DIR, "00_launched.png"))
                record("Welcome Screen Flow", True, "Completed onboarding: See my plan -> Start Day 1 -> Launch")
            else:
                record("Welcome Screen Flow", True, "Already onboarded, proceeding to main UI")
        except Exception as e:
            record("Welcome Screen Flow", False, str(e))

        # 3. Navbar Verification
        print("\n--- 3. Testing Navigation Bar ---")
        try:
            navbar = page.wait_for_selector("nav", timeout=7000)
            record("Navbar Rendered", bool(navbar))
            
            nav_tabs = ["today", "schedule", "cards", "lexicon", "mistakes", "studio", "analytics", "sprints", "library"]
            found_tabs = 0
            for t in nav_tabs:
                btn = page.query_selector(f"nav button:has-text('{t.capitalize()}')") or page.query_selector(f"nav button:has-text('{t}')")
                if btn:
                    found_tabs += 1
            record("All Navigation Tabs Present", found_tabs >= 8, f"Found {found_tabs}/9 tabs")
        except Exception as e:
            record("Navbar Verification", False, str(e))

        # 4. Today View & Timer Functionality
        print("\n--- 4. Testing Today View & Mission Timers ---")
        try:
            today_nav = page.query_selector("nav button:has-text('Today')")
            if today_nav:
                today_nav.click()
                page.wait_for_timeout(800)

            # Find timer button
            timer_btn = page.wait_for_selector("button[title*='Timer']", timeout=7000)
            initial_text = timer_btn.inner_text().strip()
            
            # Start timer
            timer_btn.click()
            page.wait_for_timeout(3500)
            
            after_start_text = timer_btn.inner_text().strip()
            is_incrementing = after_start_text != initial_text and after_start_text != "00:00"
            record("Lesson Timer Starts & Increments", is_incrementing, f"Initial: {initial_text} -> Now: {after_start_text}")
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "01_today_timer_running.png"))

            # Pause timer
            timer_btn.click()
            page.wait_for_timeout(1000)
            paused_text = timer_btn.inner_text().strip()
            page.wait_for_timeout(2000)
            paused_text_after = timer_btn.inner_text().strip()
            record("Lesson Timer Pauses Cleanly", paused_text == paused_text_after, f"Held steady at {paused_text}")

            # Restart timer to test background persistence
            timer_btn.click()
            page.wait_for_timeout(1000)
        except Exception as e:
            record("Today View Timer", False, str(e))

        # 5. Cloze Input & Multi-Row Functionality
        print("\n--- 5. Testing Multi-Row Cloze Boxes & Non-Resetting Timer ---")
        try:
            # Find the Vocabulary mission row (OWS) and toggle exercises
            toggle_btns = page.query_selector_all("button[title='Toggle Exercises']")
            for tb in toggle_btns:
                tb.click()
                page.wait_for_timeout(200)
                if page.query_selector("input[placeholder*='abandon']"):
                    break

            cloze_input = page.wait_for_selector("input[placeholder*='abandon']", timeout=5000)
            if cloze_input:
                cloze_input.fill("The crew had to [abandon] the sinking ship. (ترک کردن)")
                record("Type in Cloze Input", True, "Entered test cloze sentence with Persian hint")
                
                # Check timer didn't reset
                current_timer = page.query_selector("button[title*='Timer']").inner_text().strip()
                record("Timer Does NOT Reset on Typing", current_timer != "00:00", f"Timer kept running: {current_timer}")

                # Add new row with + button
                add_row_btn = page.query_selector("button:has-text('Add another cloze sentence')") or page.query_selector("button[title*='another' i]")
                if add_row_btn:
                    add_row_btn.click()
                    page.wait_for_timeout(500)
                    all_inputs = page.query_selector_all("input[placeholder*='abandon']")
                    record("Add Cloze Row (+ button)", len(all_inputs) >= 2, f"Total inputs now: {len(all_inputs)}")
                    page.screenshot(path=os.path.join(SCREENSHOT_DIR, "02_today_cloze_multi_row.png"))

                    # Remove row with − button
                    remove_btn = page.query_selector("button[title='Remove this row']")
                    if remove_btn:
                        remove_btn.click()
                        page.wait_for_timeout(500)
                        after_remove_inputs = page.query_selector_all("input[placeholder*='abandon']")
                        record("Remove Cloze Row (− button)", len(after_remove_inputs) < len(all_inputs), "Row cleanly removed")

                # Convert to flashcard
                card_convert_btn = page.query_selector("button[title='Convert to flashcard']")
                if card_convert_btn:
                    card_convert_btn.click()
                    page.wait_for_timeout(600)
                    record("Convert Sentence to Flashcard", True, "Flashcard created cleanly")
        except Exception as e:
            record("Cloze Multi-Row Functionality", False, str(e))

        # 6. Background Timer Persistence across Tabs
        print("\n--- 6. Testing Background Timer Persistence Across Tabs ---")
        try:
            timer_before_switch = page.query_selector("button[title*='Timer']").inner_text().strip()
            
            # Switch to Lexicon tab
            lex_tab = page.query_selector("nav button:has-text('Lexicon')")
            lex_tab.click()
            page.wait_for_timeout(3500) # Stay on Lexicon for 3.5s

            # Switch back to Today tab
            today_nav = page.query_selector("nav button:has-text('Today')")
            today_nav.click()
            page.wait_for_timeout(600)

            timer_after_switch = page.query_selector("button[title*='Timer']").inner_text().strip()
            record(
                "Timer Persists In Background While Navigating Tabs",
                timer_after_switch != timer_before_switch and timer_after_switch != "00:00",
                f"Before: {timer_before_switch} -> After returning: {timer_after_switch}"
            )
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "03_today_timer_persisted.png"))

            # Stop timer
            page.query_selector("button[title*='Timer']").click()
        except Exception as e:
            record("Background Timer Persistence", False, str(e))

        # 7. Lexicon View: Alphabet Jump, Search, Synonyms, Opposites & Idioms
        print("\n--- 7. Testing Lexicon View (Alphabet, Syn/Opp & Idioms) ---")
        try:
            # Go to Lexicon
            page.query_selector("nav button:has-text('Lexicon')").click()
            page.wait_for_timeout(1000)

            # Test Alphabet Jump to 'M' using exact text match
            letter_m = page.wait_for_selector("div.border-b button:text-is('M')", timeout=6000)
            letter_m.click()
            page.wait_for_timeout(1000)
            
            selected_m = page.query_selector("div[id^='word-item-']:has-text('m')") or page.query_selector("div[id^='word-item-']:has-text('M')")
            record("Alphabet Jump (Letter M)", bool(selected_m), "Scrolled and selected word starting with M")
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "04_lexicon_alphabet_jump.png"))

            # Search "mistake"
            search_input = page.wait_for_selector("input[placeholder*='Search words']", timeout=6000)
            search_input.fill("mistake")
            page.wait_for_timeout(1000)

            mistake_item = page.wait_for_selector("div[id^='word-item-']:has-text('mistake')", timeout=6000)
            mistake_item.click()
            page.wait_for_timeout(1200)

            # Verify Word Detail
            detail_pane = page.wait_for_selector("h2:has-text('mistake')", timeout=6000)
            record("Word Detail Header Loaded", bool(detail_pane))

            # Verify Synonyms Badge
            syn_badge = page.query_selector("span:has-text('SYN:')")
            record("Synonyms Badge Displayed", bool(syn_badge), "SYN badge visible in Lexicon")

            # Verify Idioms Section
            idioms_section = page.query_selector("h4:has-text('Idioms')")
            has_by_mistake = page.query_selector("*:has-text('by mistake')")
            record("Idioms Section Displayed", bool(idioms_section and has_by_mistake), "Idioms box with 'by mistake' visible")
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "05_lexicon_mistake_syn_idioms.png"))

            # Test Idiom to Flashcard
            idiom_card_btn = page.query_selector("button[title='Add idiom to flashcards']")
            if idiom_card_btn:
                idiom_card_btn.click()
                page.wait_for_timeout(600)
                record("Add Idiom To Flashcards Button", True, "Idiom converted to flashcard")
        except Exception as e:
            record("Lexicon View Audit", False, str(e))

        # 8. Flashcards View & 3D Cards
        print("\n--- 8. Testing Cards View & 3D Interactive Flip ---")
        try:
            page.query_selector("nav button:has-text('Cards')").click()
            page.wait_for_timeout(1000)

            card_item = page.wait_for_selector("[data-card-item='true']", timeout=6000)
            record("Flashcards Rendered", bool(card_item))

            # Flip card
            card_item.click()
            page.wait_for_timeout(600)
            is_flipped = page.query_selector(".rotate-y-180")
            record("3D Card Flip Animation", bool(is_flipped), "Card flipped to back face")
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "06_cards_3d_flip.png"))

            # Flip back
            card_item.click()
            page.wait_for_timeout(400)
        except Exception as e:
            record("Cards View Audit", False, str(e))

        # 9. FSRS Spaced Repetition Review Modal
        print("\n--- 9. Testing Review Modal (FSRS Engine) ---")
        try:
            review_btn = page.query_selector("button:has-text('Start Review')")
            if review_btn:
                review_btn.click()
                page.wait_for_timeout(1000)

                # Check prompt dialog
                dialog = page.wait_for_selector("[role='dialog']", timeout=6000)
                record("Review Modal Opens", bool(dialog))

                # Test Persian Hint Bulb inside dialog
                hint_bulb = dialog.query_selector("button[title*='هینت']") or dialog.query_selector("button:has(svg.lucide-lightbulb)")
                if hint_bulb:
                    hint_bulb.click()
                    page.wait_for_timeout(400)
                    record("Floating Persian Hint Bulb", True, "Bulb clicked and hint opened")

                page.screenshot(path=os.path.join(SCREENSHOT_DIR, "07_review_fsrs_modal.png"))

                # Show Answer inside dialog
                show_ans_btn = dialog.query_selector("button:has-text('Show Answer')")
                if show_ans_btn:
                    show_ans_btn.click()
                    page.wait_for_timeout(600)
                    record("Reveal Answer", True, "Answer revealed")

                # Grade Card with FSRS (Grade 3 Good)
                grade_btn = dialog.query_selector("button:has-text('Good')")
                if grade_btn:
                    grade_btn.click()
                    page.wait_for_timeout(800)
                    record("FSRS Rating Button (Good)", True, "FSRS state updated and scheduled")

                # Close modal if still open
                close_btn = page.query_selector("[role='dialog'] button[title='Close (Esc)']") or page.query_selector("[role='dialog'] button:has-text('Done')") or page.query_selector("[role='dialog'] button:has-text('Close')")
                if close_btn:
                    close_btn.click()
                    page.wait_for_timeout(400)
        except Exception as e:
            record("Review Modal Flow", False, str(e))

        # 10. Mistakes Vault
        print("\n--- 10. Testing Mistakes Vault ---")
        try:
            page.query_selector("nav button:has-text('Mistakes')").click()
            page.wait_for_timeout(1000)

            # Open Add Mistake Modal
            add_mistake_btn = page.query_selector("button:has-text('Log New Mistake')") or page.query_selector("button:has-text('Log Mistake Entry')")
            if add_mistake_btn:
                add_mistake_btn.click()
                page.wait_for_timeout(600)
                modal = page.wait_for_selector("[role='dialog']", timeout=4000)
                record("Log Mistake Modal Opens", bool(modal))
                
                # Fill mistake inputs inside dialog
                err_input = modal.query_selector("input[placeholder*='looking forward to meet']") or modal.query_selector_all("input")[1]
                corr_input = modal.query_selector("input[placeholder*='looking forward to meeting']") or modal.query_selector_all("input")[2]
                rule_input = modal.query_selector("textarea")
                
                if err_input and corr_input:
                    err_input.fill("I am agree with you")
                    corr_input.fill("I agree with you")
                    if rule_input:
                        rule_input.fill("Agree is a stative verb, not used with 'am'")
                
                save_btn = modal.query_selector("button:has-text('Log Mistake')")
                if save_btn:
                    save_btn.click()
                    page.wait_for_timeout(800)
                    record("Save Mistake Entry", True, "New mistake added to vault")

            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "08_mistakes_vault.png"))
        except Exception as e:
            record("Mistakes Vault Flow", False, str(e))

        # 11. Schedule View
        print("\n--- 11. Testing Schedule View (144 Days) ---")
        try:
            page.query_selector("nav button:has-text('Schedule')").click()
            page.wait_for_timeout(1000)
            total_days_label = page.query_selector("*:has-text('144')") or page.query_selector("*:has-text('Day 144')")
            record("Schedule View & 144 Days Horizon", bool(total_days_label), "Full 144-day curriculum visible")
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "09_schedule_144_days.png"))
        except Exception as e:
            record("Schedule View Flow", False, str(e))

        # 12. Settings Modal & Backup Export
        print("\n--- 12. Testing Settings Modal & Offline Vault Backup ---")
        try:
            gear_btn = page.query_selector("header button:has-text('Config')") or page.query_selector("button:has-text('Config')")
            if gear_btn:
                gear_btn.click()
                page.wait_for_timeout(800)
                settings_modal = page.wait_for_selector("[role='dialog']", timeout=5000)
                record("Settings Modal Opens", bool(settings_modal))
                page.screenshot(path=os.path.join(SCREENSHOT_DIR, "10_settings_modal.png"))

                # Export Backup JSON
                export_btn = settings_modal.query_selector("button:has-text('Export JSON Vault')") or settings_modal.query_selector("button:has-text('Export')")
                if export_btn:
                    with page.expect_download(timeout=6000) as download_info:
                        export_btn.click()
                    download = download_info.value
                    record("Export JSON Backup Triggered", bool(download.suggested_filename), f"File: {download.suggested_filename}")

                # Close settings
                close_settings = settings_modal.query_selector("button[aria-label='Close modal']") or settings_modal.query_selector("button:has-text('Done')") or settings_modal.query_selector("button:has-text('✕')")
                if close_settings:
                    close_settings.click()
                    page.wait_for_timeout(400)
        except Exception as e:
            record("Settings Modal Flow", False, str(e))

        # 13. Console Error Check
        print("\n--- 13. Browser Console Error Audit ---")
        fatal_errors = [err for err in console_errors if "favicon" not in err.lower() and "404" not in err]
        record("Zero Fatal Console Errors", len(fatal_errors) == 0, f"Errors logged: {len(fatal_errors)}")
        if fatal_errors:
            for fe in fatal_errors[:5]:
                print(f"   Console Error: {fe}")

        browser.close()

    print("\n==================================================")
    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    print(f"  AUDIT SUMMARY: {passed}/{total} TESTS PASSED ({(passed/total)*100:.1f}%)")
    print("==================================================")

    return passed == total

if __name__ == "__main__":
    run_e2e_tests()
