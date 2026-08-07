import { chromium } from "playwright";
import detectATS from "./detectATS.js";

let browser;
let context;

async function getContext() {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
    });

    context = await browser.newContext({
      viewport: {
        width: 1400,
        height: 900,
      },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138 Safari/537.36",
    });
  }

  return context;
}

export default async function resolveJob(url) {
  const context = await getContext();
  const page = await context.newPage();

  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });

    // Wait briefly for JS redirects.
    try {
      await page.waitForLoadState("networkidle", {
        timeout: 5000,
      });
    } catch {
      // Ignore if network never becomes idle.
    }

    // Small buffer for delayed redirects.
    await page.waitForTimeout(1000);

    const finalUrl = page.url();

    return {
      originalUrl: url,
      finalUrl,
      ...detectATS(finalUrl),
    };
  } catch {
    return {
      originalUrl: url,
      finalUrl: url,
      ...detectATS(url),
    };
  } finally {
    await page.close();
  }
}
