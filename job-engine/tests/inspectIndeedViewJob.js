import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const URL =
  "https://www.indeed.com/viewjob?jk=79a0e226d9c1975c&from=serp&vjs=3";

const SAMPLE = path.resolve("samples", "indeed-viewjob.html");

async function main() {
  const browser = await chromium.launch({
    headless: false,
  });

  const page = await browser.newPage();

  await page.goto(URL, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await page.waitForTimeout(5000);

  const html = await page.content();

  fs.mkdirSync(path.dirname(SAMPLE), { recursive: true });
  fs.writeFileSync(SAMPLE, html);

  console.log("Saved:", SAMPLE);

  await browser.close();
}

main().catch(console.error);
