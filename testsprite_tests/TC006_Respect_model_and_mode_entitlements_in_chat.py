import asyncio
import re
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        # Wider default timeout to match the agent's DOM-stability budget;
        # auto-waiting Playwright APIs (expect, locator.wait_for) inherit this.
        context.set_default_timeout(15000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> navigate
        await page.goto("http://localhost:5000")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Open the Login page (Login) by navigating to /login so the login form can be used.
        await page.goto("http://localhost:5000/login")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Fill the Email field with example@gmail.com, fill the Password field with password123, then click the 'Sign In' button.
        # you@example.com email field
        elem = page.locator('[id="email"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("example@gmail.com")
        
        # -> Fill the Email field with example@gmail.com, fill the Password field with password123, then click the 'Sign In' button.
        # •••••••• password field
        elem = page.locator('[id="password"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("password123")
        
        # -> Fill the Email field with example@gmail.com, fill the Password field with password123, then click the 'Sign In' button.
        # Sign In
        elem = page.locator('xpath=/html/body/div/div/div/main/div/div/div/form/div[3]')
        await elem.click(timeout=10000)
        
        # -> Click the 'DeepSearch' mode button to enable DeepSearch mode.
        # DeepSearch button
        elem = page.get_by_role('button', name='DeepSearch', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'DeepSearch' mode button to enable DeepSearch mode.
        # Think button
        elem = page.get_by_role('button', name='Think', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'DeepSearch' mode button to enable DeepSearch mode.
        # Message ApexChat... text area
        elem = page.get_by_placeholder('Message ApexChat...', exact=True)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Test: enabling Think and DeepSearch modes and verifying assistant reply.")
        
        # -> Click the 'Send' button to submit the message and await the assistant reply.
        # button
        elem = page.locator('xpath=/html/body/div/div/div[2]/main/div/div[3]/div[2]/div/div/div/div[2]/button')
        await elem.click(timeout=10000)
        
        # -> Click the 'Send' button to submit the chat message and verify the assistant's reply appears in the conversation.
        # button
        elem = page.locator('xpath=/html/body/div/div/div[2]/main/div/div[3]/div[2]/div/div/div/div[2]/button')
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> Verify the enabled advanced modes are reflected in the conversation state
        # Assert: The conversation displays the Think reasoning label, showing Think mode output.
        await expect(page.locator("xpath=/html/body/div/div[1]/div[2]/main/div/div[2]/div/div[2]/div/div/div[3]/div/ol/li[1]/strong[2]").nth(0)).to_have_text("Think", timeout=15000), "The conversation displays the Think reasoning label, showing Think mode output."
        # Assert: A DeepSearch result row is present in the conversation, indicating DeepSearch output.
        await expect(page.locator("xpath=/html/body/div/div[1]/div[2]/main/div/div[2]/div/div[2]/div/div/div[3]/div/div/table/tbody/tr[1]/td[2]").nth(0)).to_have_text("Wimbledon 2026: Mens Semifinals Set After Dramatic Quarterfi", timeout=15000), "A DeepSearch result row is present in the conversation, indicating DeepSearch output."
        # Assert: The Show Reasoning control is visible, confirming reasoning mode content is available in the conversation.
        await expect(page.locator("xpath=/html/body/div/div[1]/div[2]/main/div/div[2]/div/div[2]/div/div/div[2]/button").nth(0)).to_have_text("Show Reasoning", timeout=15000), "The Show Reasoning control is visible, confirming reasoning mode content is available in the conversation."
        
        # --> Verify the assistant reply is displayed
        # Assert: The assistant reply shows the Think reasoning trace heading.
        await expect(page.locator("xpath=/html/body/div/div[1]/div[2]/main/div/div[2]/div/div[2]/div/div/div[3]/div/ol/li[1]/strong[2]").nth(0)).to_have_text("Think", timeout=15000), "The assistant reply shows the Think reasoning trace heading."
        # Assert: The assistant reply includes DeepSearch results (news row about Wimbledon 2026).
        await expect(page.locator("xpath=/html/body/div/div[1]/div[2]/main/div/div[2]/div/div[2]/div/div/div[3]/div/div/table/tbody/tr[1]").nth(0)).to_contain_text("Wimbledon 2026: Mens Semifinals Set After Dramatic Quarter", timeout=15000), "The assistant reply includes DeepSearch results (news row about Wimbledon 2026)."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    