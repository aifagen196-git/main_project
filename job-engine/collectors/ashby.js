import httpClient from "../utils/httpClient.js";
import { getSupabase, runCollector } from "./runtime.js";
import { normalizeAshby } from "../processors/normalizeAshby.js";
import companies from "../config/ashbyCompanies.js";
import withRetry from "../processors/retry.js";
import { saveJobs, deactivateStale } from "../processors/saveJobs.js";

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

// =============================================
// FETCH COMPANY JOBS
// =============================================
// Unlike Greenhouse, Ashby's job-board endpoint returns the FULL posting
// (description included) in one call — no per-job details fetch needed.

async function fetchCompanyJobs(company) {
  try {
    const url = `https://api.ashbyhq.com/posting-api/job-board/${company}`;

    const response = await withRetry(() => httpClient.get(url));

    return response.data.jobs || [];
  } catch (err) {
    console.error(`❌ Failed to fetch ${company}`);
    return [];
  }
}

// =============================================
// US FILTER
// =============================================
// Ashby boards are global and postings carry no reliable country field, so
// filter here at collect time (Greenhouse boards are already US-scoped).

const BLOCKED_TITLE_REGIONS = [
  "apac",
  "emea",
  "anz",
  "australia",
  "singapore",
  "india",
  "japan",
  "tokyo",
  "korea",
  "china",
  "taiwan",
  "hong kong",
  "vietnam",
  "thailand",
  "malaysia",
  "philippines",
  "canada",
  "mexico",
  "brazil",
  "argentina",
  "uk",
  "united kingdom",
  "london",
  "france",
  "germany",
  "netherlands",
  "spain",
  "italy",
  "ireland",
  "europe",
];

const US_LOCATION_HINTS = [
  "united states",
  "usa",
  "us remote",
  "remote us",
  "remote (us)",
  "remote - us",
  "north america",
  "san francisco",
  "new york",
  "california",
  "texas",
  "florida",
  "virginia",
  "north carolina",
  "new jersey",
  "colorado",
  "seattle",
  "austin",
  "boston",
  "los angeles",
  "chicago",
  "washington",
];

function isUSJob(job) {
  const title = (job.title || "").toLowerCase();
  if (BLOCKED_TITLE_REGIONS.some((region) => title.includes(region))) {
    return false;
  }

  // If Ashby provides the country, trust it.
  const country =
    job.address?.postalAddress?.addressCountry?.toLowerCase() || "";
  if (country) {
    return country === "united states" || country === "us" || country === "usa";
  }

  // Fallback for companies that don't provide addressCountry.
  const location = (job.location || job.locationName || "").toLowerCase();
  return US_LOCATION_HINTS.some((hint) => location.includes(hint));
}

// =============================================
// MAIN
// =============================================

export default async function collectAshbyJobs() {
  console.log("\n==========================================");
  console.log("🚀 Ashby Collector Started");
  console.log("==========================================\n");

  const cutoff = new Date(Date.now() - SCRAPE_LAST_HOURS * 60 * 60 * 1000);

  for (const company of companies) {
    try {
      stats.companies++;

      const jobs = await fetchCompanyJobs(company);

      stats.fetched += jobs.length;

      console.log(`\n🏢 ${company.toUpperCase()} (${jobs.length} jobs)`);

      const normalized = [];
      for (const job of jobs) {
        const postedDate = new Date(
          job.publishedAt || job.postedAt || job.createdAt || job.updatedAt,
        );

        // Skip old jobs BEFORE normalizing
        if (!isNaN(postedDate) && postedDate < cutoff) {
          stats.skipped++;
          continue;
        }

        if (!isUSJob(job)) {
          stats.skipped++;
          continue;
        }

        normalized.push(await normalizeAshby(job, company));
        stats.processed++;
      }

      const r = await saveJobs(normalized, stats);
      if (r.deduped) console.log(`   🧹 ${r.deduped} duplicate(s) collapsed`);
      if (r.attempted) console.log(`   💾 saved ${r.saved}/${r.attempted}`);
    } catch (err) {
      console.error(`\n❌ Company failed: ${company}`);

      console.error(err.message);
    }
  }

  await deactivateStale("ashby", SCRAPE_LAST_HOURS);

  console.log("\n==========================================");
  console.log("✅ Ashby Collector Finished");
  console.log("==========================================");

  console.table(stats);

  console.log("==========================================\n");
}

runCollector(import.meta.url, collectAshbyJobs);
