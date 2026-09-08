import { chromium } from "playwright";
import companies from "../collectors/config/workableCompanies.js";

async function run() {
  const browser = await chromium.launch({ headless: true });

  for (const slug of companies) {
    const page = await browser.newPage();

    let checked = false;

    page.on("response", async (response) => {
      const url = response.url();

      if (
        url === `https://apply.workable.com/api/v3/accounts/${slug}/jobs`
      ) {
        checked = true;

        try {
          const json = await response.json();

          if (json.total > 0) {
            console.log(`✅ ${slug} -> ${json.total} jobs`);
          } else {
            console.log(`❌ ${slug} -> 0 jobs`);
          }
        } catch (e) {
          console.log(`⚠️ ${slug} -> Couldn't parse response`);
        }
      }
    });

   try {
    await page.goto(
        `https://apply.workable.com/${slug}/`,
        {
            waitUntil: "domcontentloaded",
            timeout: 15000,
        }
    );
} catch (e) {
    console.log(`⏭️ ${slug} -> Timeout`);
    await page.close();
    continue;
}

    if (!checked) {
      console.log(`⚠️ ${slug} -> API not found`);
    }

    await page.close();
  }

  await browser.close();
}

run();