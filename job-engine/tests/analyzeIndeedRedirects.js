import { chromium } from "playwright";
import normalizeIndeed from "../processors/normalizeIndeed.js";
import fs from "fs";
import path from "path";

const SAMPLE_FILE = path.resolve("samples/indeed-search.html");

const MAX_JOBS = 20;

function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "INVALID_URL";
  }
}

async function main() {
  if (!fs.existsSync(SAMPLE_FILE)) {
    console.log("❌ Missing sample file:");
    console.log(SAMPLE_FILE);
    process.exit(1);
  }

  const html = fs.readFileSync(SAMPLE_FILE, "utf8");

  const jobs = normalizeIndeed(html).slice(0, MAX_JOBS);

  console.log(`Found ${jobs.length} jobs\n`);

  const browser = await chromium.launch({
    headless: true,
  });

  const page = await browser.newPage();

  const stats = {};

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];

    console.log(`\n[${i + 1}/${jobs.length}] ${job.title}`);

    try {
      await page.goto(job.url, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      await page.waitForTimeout(2000);

      const finalUrl = page.url();

      const domain = getDomain(finalUrl);

      stats[domain] = (stats[domain] || 0) + 1;

      console.log(`Indeed: ${job.url}`);
      console.log(`Final : ${finalUrl}`);
      console.log(`Domain: ${domain}`);
    } catch (err) {
      console.log("ERROR:", err.message);
    }
  }

  await browser.close();

  console.log("\n==============================");
  console.log("Redirect Summary");
  console.log("==============================\n");

  Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([domain, count]) => {
      console.log(`${domain.padEnd(35)} ${count}`);
    });
}

main();
