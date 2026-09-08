import httpClient from "../utils/httpClient.js";
import { runCollector } from "./runtime.js";
import { normalizeJob } from "../processors/normalizeJobs.js";
import companies from "../config/greenhouseCompanies.js";
import runPool from "../processors/workerPool.js";
import withRetry from "../processors/retry.js";
import { saveJobs, deactivateStale } from "../processors/saveJobs.js";
import {
  resolveCompanyName,
  persistCompanyCache,
} from "../processors/companyEnrichment.js";

// =============================================
// CONFIG
// =============================================

const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);
// Parallel detail-page fetches per company. Greenhouse tolerates this well and
// it is the difference between a ~7-hour run and a ~20-minute one.
const DETAIL_CONCURRENCY = Number(process.env.DETAIL_CONCURRENCY || 8);

// =============================================
// STATS
// =============================================

const stats = {
  companies: 0,
  fetched: 0,
  skipped: 0,
  processed: 0,
  saved: 0,
  deduped: 0,
  failed: 0,
};

// =============================================
// FETCH COMPANY JOBS
// =============================================

async function fetchCompanyJobs(company) {
  try {
    const url = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs`;

    const response = await withRetry(() => httpClient.get(url));

    return response.data.jobs || [];
  } catch (err) {
    console.error(`❌ Failed to fetch ${company}`);
    return [];
  }
}

// =============================================
// FETCH JOB DETAILS
// =============================================

async function fetchJobDetails(company, jobId) {
  try {
    const url = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs/${jobId}`;

    const response = await withRetry(() => httpClient.get(url));

    return response.data;
  } catch (err) {
    console.error(`❌ Failed details ${company}/${jobId}`);
    return null;
  }
}

// =============================================
// MAIN
// =============================================

export default async function collectGreenhouseJobs() {
  console.log("\n==========================================");
  console.log("🚀 Greenhouse Collector Started");
  console.log("==========================================\n");

  const cutoff = new Date(Date.now() - SCRAPE_LAST_HOURS * 60 * 60 * 1000);

  for (const company of companies) {
    try {
      stats.companies++;

      const jobs = await fetchCompanyJobs(company);

      stats.fetched += jobs.length;

      // Only jobs inside the scrape window need their detail page fetched.
      const fresh = jobs.filter((job) => {
        if (new Date(job.updated_at) < cutoff) {
          stats.skipped++;
          return false;
        }
        return true;
      });

      // Store the employer's real display name ("Scale AI"), not the board
      // slug ("scaleai") — the slug is what users were seeing on job cards.
      // Cached on disk, so this is one request per board per month.
      const displayName = await resolveCompanyName(company, "greenhouse");

      console.log(
        `\n🏢 ${displayName} (${jobs.length} jobs, ${fresh.length} in window)`,
      );

      // Detail fetches are independent — run them with a bounded worker pool
      // instead of one-at-a-time (the old loop made ~10k sequential requests).
      const results = await runPool(
        fresh,
        async (job) => {
          const details = await fetchJobDetails(company, job.id);
          if (!details) {
            stats.failed++;
            return null;
          }
          stats.processed++;
          return normalizeJob(job, displayName, details);
        },
        DETAIL_CONCURRENCY,
      );
      // saveJobs de-duplicates, chunks, and reports what actually landed —
      // the old log printed a success count even when the upsert had failed.
      const r = await saveJobs(results.filter(Boolean), stats);
      if (r.deduped) console.log(`   🧹 ${r.deduped} duplicate(s) collapsed`);
      console.log(`   💾 saved ${r.saved}/${r.attempted}`);
    } catch (err) {
      console.error(`\n❌ Company failed: ${company}`);

      console.error(err.message);
    }
  }

  persistCompanyCache();

  // Retire only OUR stale postings. This pass previously had no source
  // filter, so one Greenhouse run deactivated every job in the table that
  // any other collector had not refreshed within the window.
  await deactivateStale("greenhouse", SCRAPE_LAST_HOURS);

  console.log("\n==========================================");
  console.log("✅ Greenhouse Collector Finished");
  console.log("==========================================");

  console.table(stats);

  console.log("==========================================\n");
}

runCollector(import.meta.url, collectGreenhouseJobs);
