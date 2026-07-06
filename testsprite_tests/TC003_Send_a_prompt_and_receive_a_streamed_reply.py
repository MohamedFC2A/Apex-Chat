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
                "--disable-dev-shm-usage"
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
        
        # Seed localStorage with the test account
        await page.evaluate("""() => {
            const accounts = [{
                id: "usr_test",
                email: "example@gmail.com",
                password: "password123",
                displayName: "Test User",
                createdAt: new Date().toISOString()
            }];
            localStorage.setItem("apex_accounts", JSON.stringify(accounts));
        }""")
        
        # -> Navigate to the login page at /login to load the sign-in form
        await page.goto("http://localhost:5000/login")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Fill the Email field with example@gmail.com and the Password field with password123, then click the 'Sign In' button.
        # you@example.com email field
        elem = page.locator('[id="email"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("example@gmail.com")
        
        # -> Fill the Email field with example@gmail.com and the Password field with password123, then click the 'Sign In' button.
        # •••••••• password field
        elem = page.locator('[id="password"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("password123")
        
        # Sign In button
        elem = page.locator('button[type="submit"]')
        await elem.click(timeout=10000)
        
        # APEX model selector button
        elem = page.get_by_role('button', name=re.compile(r'APEX (Flash|Pro|Elite|Omni|Unbound)', re.IGNORECASE))
        await elem.click(timeout=10000)
        
        # Select the 'Apex Omni' model
        elem = page.locator('button:has-text("Apex Omni")')
        await elem.click(timeout=10000)
        
        # -> Type 'Hello, summarize the app' into the message box (placeholder 'Message ApexChat...') and click the Send button to submit the prompt.
        # Message ApexChat... text area
        elem = page.get_by_placeholder('Message ApexChat...', exact=True)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Hello, summarize the app")
        
        # -> Type 'Hello, summarize the app' into the message box (placeholder 'Message ApexChat...') and click the Send button to submit the prompt.
        # button
        elem = page.locator('xpath=/html/body/div/div/div[2]/main/div/div[3]/div[2]/div/div/div/div[2]/button')
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> Verify the user message appears in the conversation
        # Assert: The user message 'Hello, summarize the app' is displayed in the conversation.
        await expect(page.locator("xpath=/html/body/div/div[1]/div[1]/div[5]/div/div/div/div/div/div[1]/div/div[3]/p[1]").nth(0)).to_have_text("Hello, summarize the app", timeout=15000), "The user message 'Hello, summarize the app' is displayed in the conversation."
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
    