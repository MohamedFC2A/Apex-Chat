import asyncio
import sys
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        print("Navigating to http://localhost:5000/login...")
        await page.goto("http://localhost:5000/login")
        await page.wait_for_load_state("networkidle")
        
        # Click Guest login
        guest_btn = page.get_by_role("button", name="Try as Guest (Skip Registration)")
        await guest_btn.click()
        print("Clicked Guest login button.")
        
        await page.wait_for_url("**/chat", timeout=10000)
        print("Successfully signed in and navigated to chat:", page.url)
        
        # Locate the Quiz toggle button
        quiz_btn = page.get_by_role("button", name="Quiz")
        await quiz_btn.click()
        print("Clicked 'Quiz' mode button.")
        
        # Type topic and submit
        textarea = page.get_by_placeholder("Message ApexChat...")
        await textarea.fill("JavaScript")
        
        # Find and click the send button
        # In chat-input.tsx: the send button is the only button inside the text area container or has an icon like Send
        send_btn = page.locator("button").last
        await send_btn.click()
        print("Sent prompt 'JavaScript' in Quiz mode.")
        
        # Wait for quiz widget to render
        # Let's wait for a code block or the custom quiz widget element to appear
        print("Waiting for MCQ quiz response from server...")
        await page.wait_for_timeout(10000) # give it some time
        
        # Let's take a screenshot and check the page text
        content = await page.content()
        print("Page HTML content length:", len(content))
        
        # Check if quiz elements exist on the page
        visible_text = await page.evaluate("() => document.body.innerText")
        print("Visible text on chat page:")
        print(visible_text[:800])
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
