import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const SEARCH_URL =
  "https://www.indeed.com/jobs?q=software+engineer&l=United+States";

const SAMPLE_DIR = path.resolve("samples");
const SAMPLE_FILE = path.join(SAMPLE_DIR, "indeed-search.html");

async function main() {
  console.log("🚀 Launching browser...");

  const browser = await chromium.launch({
    headless: false,
  });

  const context = await browser.newContext({
    viewport: {
      width: 1400,
      height: 900,
    },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138 Safari/537.36",
  });

  const page = await context.newPage();

  console.log("🌐 Opening Indeed...");

  await page.goto(SEARCH_URL, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  console.log("⏳ Waiting 8 seconds...");
  await page.waitForTimeout(8000);

  const html = await page.content();

  fs.mkdirSync(SAMPLE_DIR, { recursive: true });
  fs.writeFileSync(SAMPLE_FILE, html);

  console.log("\n✅ Saved HTML:");
  console.log(SAMPLE_FILE);

  console.log("\nPage title:");
  console.log(await page.title());

  console.log("\nCurrent URL:");
  console.log(page.url());

  await browser.close();
}

main().catch(console.error);
