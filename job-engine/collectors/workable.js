import { getSupabase, runCollector } from "./runtime.js";
import { normalizeWorkableJob } from "../processors/normalizeWorkable.js";
import companies from "../config/workableCompanies.js";
import { chromium } from "playwright";
import runPool from "../processors/workerPool.js";
import { saveJobs, deactivateStale } from "../processors/saveJobs.js";

// =============================================
// CONFIG
// =============================================

const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);
// Each detail fetch opens its own browser page against the shared browser
// instance — keep this modest (unlike the plain-HTTP collectors) since pages
// are far heavier than a bare request.
const DETAIL_CONCURRENCY = Number(process.env.WORKABLE_DETAIL_CONCURRENCY || 3);


// =============================================
// STATS
// =============================================

const stats = {
  companies: 0,
  fetched: 0,
  skipped: 0,
  processed: 0,
  inserted: 0,
  updated: 0,
  failed: 0,
};

// =============================================
// FETCH COMPANY JOBS
// =============================================

async function fetchCompanyJobs(browser, slug){
 

  const page = await browser.newPage();

  let jobs = [];

  page.on("response", async (response) => {
    const url = response.url();

    if (
      url === `https://apply.workable.com/api/v3/accounts/${slug}/jobs`
    ) {
      try {
       const contentType = response.headers()["content-type"] || "";

if (!contentType.includes("application/json")) {
    return;
}

const json = await response.json();

jobs = json.results || [];
        
      } catch (err) {
        console.log(`❌ Failed to parse jobs for ${slug}`);
      }
    }
  });

  try {
    await page.goto(`https://apply.workable.com/${slug}/`, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    // Give the page time to call the API
    await page.waitForTimeout(3000);
  } catch (err) {
    console.log(`⏭️ ${slug} -> Timeout`);
  }

  await page.close();
  

  return jobs;
}
// =============================================
// FETCH JOB DETAILS
// =============================================
async function fetchJobDetails(browser, slug, shortcode) {
  const page = await browser.newPage();

  let details = null;

  page.on("response", async (response) => {
    const url = response.url();

    if (
      url ===
      `https://apply.workable.com/api/v2/accounts/${slug}/jobs/${shortcode}`
    ) {
      try {
        details = await response.json();
      } catch (err) {
        console.log(`❌ Failed to parse details for ${shortcode}`);
      }
    }
  });

  try {
    await page.goto(
      `https://apply.workable.com/${slug}/j/${shortcode}/`,
      {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      }
    );

    await page.waitForTimeout(2000);
  } catch (err) {
    console.log(`⏭️ ${slug}/${shortcode} -> Timeout`);
  }

  await page.close();

  return details;
}


// =============================================
// MAIN
// =============================================

export default async function collectWorkableJobs() {
  console.log("\n==========================================");
 console.log("🚀 Workable Collector Started");
  console.log("==========================================\n");
const browser = await chromium.launch({
  headless: true,
});
  const cutoff = new Date(Date.now() - SCRAPE_LAST_HOURS * 60 * 60 * 1000);

  for (const company of companies) {
    try {
      stats.companies++;

   const jobs = await fetchCompanyJobs(browser, company);

      stats.fetched += jobs.length;

    console.log(`🏢 ${company} (${jobs.length} jobs)`);

     const results = await runPool(
       jobs,
       async (job) => {
         // Temporarily disabling date filter while testing
         // const updatedAt = new Date(job.published);
         // if (updatedAt < cutoff) {
         //   stats.skipped++;
         //   return null;
         // }

         console.log(`➡ ${job.title}`);

         const details = await fetchJobDetails(browser, company, job.shortcode);

         if (!details) {
           console.log(`❌ Couldn't fetch details for ${job.title}`);
           return null;
         }
         const normalizedJob = await normalizeWorkableJob(details, company);

         // Skip jobs older than 24 hours
         const postedDate = new Date(normalizedJob.posted_date);
         if (!isNaN(postedDate) && postedDate < cutoff) {
           stats.skipped++;
           console.log(`⏭️ Old job: ${normalizedJob.title}`);
           return null;
         }

         stats.processed++;
         return normalizedJob;
       },
       DETAIL_CONCURRENCY,
     );
     const normalized = results.filter(Boolean);

     const r = await saveJobs(normalized, stats);
     if (r.deduped) console.log(`   🧹 ${r.deduped} duplicate(s) collapsed`);
     if (r.attempted) console.log(`   💾 saved ${r.saved}/${r.attempted}`);
 } catch (err) {
  console.error(`\n❌ Company failed: ${company}`);
  console.error(err.message);
}
  }

  // This collector previously never retired anything, so delisted Workable
  // postings stayed is_active = true forever.
  await deactivateStale("workable", SCRAPE_LAST_HOURS);

  console.log("\n==========================================");
  console.log("✅ Workable Collector Finished");
  console.log("==========================================");
await browser.close();
  console.table(stats);

  console.log("==========================================\n");
}

runCollector(import.meta.url, collectWorkableJobs);
