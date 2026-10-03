import { chromium } from "playwright";

(async () => {
  console.log("Starting Playwright...");

  const browser = await chromium.launch({
    channel: "chrome",
    headless: true
  });

  const page = await browser.newPage();

  await page.goto("https://example.com", {
    waitUntil: "domcontentloaded"
  });

  console.log("Page title:", await page.title());
  console.log("URL:", page.url());

  await browser.close();

  console.log("Playwright + Chrome working successfully.");
})();
