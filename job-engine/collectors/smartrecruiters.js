import httpClient from "../utils/httpClient.js";
import { getSupabase, runCollector } from "./runtime.js";
import { normalizeSmartRecruiters } from "../processors/normalizeSmartRecruiters.js";
import companies from "../config/smartrecruitersCompanies.js";
import runPool from "../processors/workerPool.js";
import withRetry from "../processors/retry.js";
import { isUnitedStates } from "../processors/canonicalFields.js";
import { saveJobs, deactivateStale } from "../processors/saveJobs.js";

const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);
// Detail fetches are independent, one per posting — same win as Greenhouse's
// pool (sequential was the only mode this collector had before).
const DETAIL_CONCURRENCY = Number(process.env.DETAIL_CONCURRENCY || 8);
// =============================================
// STATS
// =============================================

const stats = {
  companies: 0,
  fetched: 0,
  inserted: 0,
  updated: 0,
  failed: 0,
  skipped: 0,
};
// =============================================
// TEST COMPANY
// =============================================
// Companies come from config/smartrecruitersCompanies.js (single source of
// truth, generated from verify/smartrecruiters.json).

// =============================================
// FETCH JOBS
// =============================================

async function fetchCompanyJobs(company) {
  try {
    console.log(`Fetching jobs for ${company}...`);
    let allJobs = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const url = `https://api.smartrecruiters.com/v1/companies/${company}/postings?limit=${limit}&offset=${offset}`;

      console.log(`Fetching page starting at ${offset}...`);

      const response = await withRetry(() => httpClient.get(url));

      const jobs = response.data.content || [];

      allJobs.push(...jobs);

      if (jobs.length < limit) {
        break;
      }

      offset += limit;
    }

    return {
      content: allJobs,
    };
  } catch (err) {
    console.log(err.response?.status);
    console.log(err.response?.data || err.message);
    return null;
  }
}
async function fetchJobDetails(job) {
  try {
    const response = await withRetry(() => httpClient.get(job.ref));
    return response.data;
  } catch (err) {
    console.error(`❌ Failed to fetch details for ${job.name}`);
    return null;
  }
}

export default async function collectSmartRecruitersJobs() {
  const cutoff = new Date(Date.now() - SCRAPE_LAST_HOURS * 60 * 60 * 1000);
  for (const company of companies) {
    stats.companies++;
    const jobs = await fetchCompanyJobs(company);

    if (!jobs) continue;

    const jobList = jobs.content || [];
    stats.fetched += jobList.length;
    console.log(`Found ${jobList.length} jobs`);

    const results = await runPool(
      jobList,
      async (job) => {
        const details = await fetchJobDetails(job);
        if (!details) return null;

        const normalizedJob = await normalizeSmartRecruiters(details);

        // Skip jobs older than 24 hours
        const postedDate = new Date(normalizedJob.posted_date);
        if (!isNaN(postedDate) && postedDate < cutoff) {
          stats.skipped++;
          console.log(`⏭️ Old job: ${normalizedJob.title}`);
          return null;
        }

        // Skip non-US jobs
        // Compare via isUnitedStates, not `!== "USA"`: country is now
        // canonicalized to "United States", so a literal string check here
        // would reject every US job.
        if (!isUnitedStates(normalizedJob.country) && !normalizedJob.is_remote_us) {
          stats.skipped++;
          console.log(`⏭️ Skipped: ${normalizedJob.title}`);
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
  }

  // This collector previously never retired anything, so delisted
  // SmartRecruiters postings stayed is_active = true forever.
  await deactivateStale("smartrecruiters", SCRAPE_LAST_HOURS);

  console.log("\n==========================================");
  console.log("✅ SmartRecruiters Collector Finished");
  console.log("==========================================");

  console.table(stats);

  console.log("==========================================\n");
}

runCollector(import.meta.url, collectSmartRecruitersJobs);
