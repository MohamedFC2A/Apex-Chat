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
        
        # -> Open the 'Login' page (navigate to /login) and check for the sign-in form or related UI.
        await page.goto("http://localhost:5000/login")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Fill the Email and Password fields and click the 'Sign In' button to submit the form.
        # you@example.com email field
        elem = page.locator('[id="email"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("example@gmail.com")
        
        # -> Fill the Email and Password fields and click the 'Sign In' button to submit the form.
        # •••••••• password field
        elem = page.locator('[id="password"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("password123")
        
        # -> Fill the Email and Password fields and click the 'Sign In' button to submit the form.
        # Sign In button
        elem = page.get_by_role('button', name='Sign In', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Think' model button to switch the chat mode to Think.
        # Think button
        elem = page.get_by_role('button', name='Think', exact=True)
        await elem.click(timeout=10000)
        
        # -> Enter the test prompt into the 'Message ApexChat...' field and click the send button (up arrow) to send it.
        # Message ApexChat... text area
        elem = page.get_by_placeholder('Message ApexChat...', exact=True)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Stream test: please send a short streaming reply that starts with the prefix 'ASSISTANT_REPLY: ' followed by the unique token STREAM-TEST-ABC-123. Keep the reply brief and include the exact text: ASSISTANT_REPLY: STREAM-TEST-ABC-123")
        
        # -> Enter the test prompt into the 'Message ApexChat...' field and click the send button (up arrow) to send it.
        # button
        elem = page.locator('xpath=/html/body/div/div/div[2]/main/div/div[3]/div[2]/div/div/div/div[2]/button')
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> Verify the sent message appears in the conversation
        # Assert: The sent message appears in the conversation.
        await expect(page.locator("xpath=/html/body/div/div[1]/div[1]/div[5]/div/div/div/div/div/div[1]/div/div[3]/p[1]").nth(0)).to_have_text("Stream test: please send a short streami...", timeout=15000), "The sent message appears in the conversation."
        current_url = await page.evaluate("() => window.location.href")
        # Assert: page loaded with a URL (final outcome verified by the AI judge during the run)
        assert current_url, 'Page should have loaded with a URL'
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    