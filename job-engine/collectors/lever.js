import httpClient from "../utils/httpClient.js";
import { getSupabase, runCollector } from "./runtime.js";
import { normalizeLever } from "../processors/normalizeLever.js";
import companies from "../config/leverCompanies.js";
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
// FETCH COMPANY JOBS
// =============================================

async function fetchCompanyJobs(company) {
  try {
    const url = `https://api.lever.co/v0/postings/${company}`;

    const { data } = await withRetry(() =>
      httpClient.get(url, {
        timeout: 15000,
        params: {
          mode: "json",
        },
      }),
    );

    return data || [];
  } catch (err) {
    console.error(`❌ Failed to fetch ${company}`);

    return [];
  }
}

// =============================================
// MAIN
// =============================================

export default async function collectLeverJobs() {
  console.log("\n==========================================");
  console.log("🚀 Lever Collector Started");
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
        const updatedAt = job.createdAt ? new Date(job.createdAt) : new Date();

        if (updatedAt < cutoff) {
          stats.skipped++;
          continue;
        }

        normalized.push(await normalizeLever(job, company));
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

  // =============================================
  // DEACTIVATE STALE JOBS
  // =============================================

  await deactivateStale("lever", SCRAPE_LAST_HOURS);

  console.log("\n==========================================");
  console.log("✅ Lever Collector Finished");
  console.log("==========================================");

  console.table(stats);

  console.log("==========================================\n");
}

runCollector(import.meta.url, collectLeverJobs);
