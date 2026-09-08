import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizeWorkableJob } from "./normalize/normalizeWorkable.js";
import companies from "./config/workableCompanies.js";
import { chromium } from "playwright";
import { isUsJob } from "./lib/isUsJob.js";

dotenv.config({ path: ".env" });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// =============================================
// CONFIG
// =============================================

const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);


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
// SAVE JOB
// =============================================

/**
 * Save many jobs in ONE upsert. The per-job SELECT+UPSERT pattern this
 * replaces made two network round trips for every posting, which is what made
 * full runs take hours. Postgres resolves insert-vs-update itself via the
 * (source, source_job_id) conflict target.
 */
async function saveJobs(jobs) {
  if (!jobs.length) return;
  const CHUNK = 500;
  for (let i = 0; i < jobs.length; i += CHUNK) {
    const batch = jobs.slice(i, i + CHUNK);
    const { error } = await supabase
      .from("jobs")
      .upsert(batch, { onConflict: "source,source_job_id" });
    if (error) {
      stats.failed += batch.length;
      console.error("batch of " + batch.length + " failed: " + error.message);
      continue;
    }
    stats.saved = (stats.saved || 0) + batch.length;
  }
}

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

async function run() {
  console.log("\n==========================================");
 console.log("🚀 Workable Collector Started");
  console.log("==========================================\n");
const browser = await chromium.launch({
  headless: true,
});
  for (const company of companies) {
    try {
      stats.companies++;

   const jobs = await fetchCompanyJobs(browser, company);

      stats.fetched += jobs.length;

    console.log(`🏢 ${company} (${jobs.length} jobs)`);

     const normalized = [];
     for (const job of jobs) {
    // (No publish-date cutoff: the board API only ever lists
    // currently-open postings.)
    // }

    console.log(`➡ ${job.title}`);

   

       const details = await fetchJobDetails(
  browser,
  company,
  job.shortcode
);

if (!details) {
  console.log(`❌ Couldn't fetch details for ${job.title}`);
  continue;
} 
const normalizedJob = await normalizeWorkableJob(details, company);

// Workable's board API only ever lists currently-open postings, so
// every job here is live right now regardless of posted_date — no
// cutoff needed. Staleness is handled by the last_seen deactivation
// pass below.

if (!isUsJob(normalizedJob)) {
  stats.nonUs = (stats.nonUs || 0) + 1;
  continue;
}

normalized.push(normalizedJob);

stats.processed++;
     }

     await saveJobs(normalized);
     if (normalized.length) console.log(`   💾 saved ${normalized.length}`);
 } catch (err) {
  console.error(`\n❌ Company failed: ${company}`);
  console.error(err.message);
}
  }

  console.log("\n==========================================");
  console.log("✅ Workable Collector Finished");
  console.log("==========================================");
await browser.close();
  console.table(stats);

  console.log("==========================================\n");
}

run();
