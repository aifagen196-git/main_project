import axios from "axios";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizeAshby } from "./normalize/normalizeAshby.js";
import companies from "./config/ashbyCompanies.js";

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
      console.error();
      continue;
    }
    stats.saved = (stats.saved || 0) + batch.length;
  }
}
// =============================================
// FETCH COMPANY JOBS
// =============================================
// Unlike Greenhouse, Ashby's job-board endpoint returns the FULL posting
// (description included) in one call — no per-job details fetch needed.

async function fetchCompanyJobs(company) {
  try {
    const url = `https://api.ashbyhq.com/posting-api/job-board/${company}`;

    const response = await axios.get(url);

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

async function run() {
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

      await saveJobs(normalized);
      if (normalized.length) console.log(`   💾 saved ${normalized.length}`);
    } catch (err) {
      console.error(`\n❌ Company failed: ${company}`);

      console.error(err.message);
    }
  }

  // Deactivate stale postings: anything not seen in this run's window and
  // past its expiry. Frontend queries should filter on is_active = true.
  const staleCutoff = new Date(
    Date.now() - SCRAPE_LAST_HOURS * 60 * 60 * 1000,
  ).toISOString();
  const { error: deErr, count } = await supabase
    .from("jobs")
    .update({ is_active: false })
    .lt("last_seen", staleCutoff)
    .eq("is_active", true)
    .select("id", { count: "exact", head: true });
  if (deErr) console.error(`⚠ Deactivation pass failed: ${deErr.message}`);
  else console.log(`🗑 Deactivated ${count ?? 0} stale jobs`);

  console.log("\n==========================================");
  console.log("✅ Ashby Collector Finished");
  console.log("==========================================");

  console.table(stats);

  console.log("==========================================\n");
}

run();
