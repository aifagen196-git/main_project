import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const JOB_URL = "https://www.indeed.com/rc/clk?jk=79a0e226d9c1975c";

const SAMPLE_DIR = path.resolve("samples");
const SAMPLE_FILE = path.join(SAMPLE_DIR, "indeed-job.html");

async function main() {
  console.log("🚀 Launching Chromium...");

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

  console.log("🌐 Opening job...");

  await page.goto(JOB_URL, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await page.waitForTimeout(6000);

  const html = await page.content();

  fs.mkdirSync(SAMPLE_DIR, { recursive: true });
  fs.writeFileSync(SAMPLE_FILE, html);

  console.log("✅ Saved:");
  console.log(SAMPLE_FILE);

  console.log("Title:");
  console.log(await page.title());

  console.log("URL:");
  console.log(page.url());

  await browser.close();
}

main().catch(console.error);
