import axios from "axios";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizeJob } from "./normalize/normalizeJobs.js";
import companies from "./config/greenhouseCompanies.js";
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
  failed: 0,
};

// =============================================
// SAVE JOB
// =============================================

/**
 * Save a whole company's jobs in ONE upsert.
 *
 * The previous version did a SELECT + an UPSERT per job — two round trips for
 * every posting. Across 432 boards (~10k jobs) that is ~20k sequential network
 * calls and takes hours. Postgres already resolves insert-vs-update via the
 * (source, source_job_id) conflict target, so the per-row SELECT existed only
 * to label the log line. Batching turns a company into a single call.
 */
async function saveJobs(jobs) {
  if (!jobs.length) return;
  const CHUNK = 500; // keep the request body well under limits
  for (let i = 0; i < jobs.length; i += CHUNK) {
    const batch = jobs.slice(i, i + CHUNK);
    const { error } = await supabase
      .from("jobs")
      .upsert(batch, { onConflict: "source,source_job_id" });
    if (error) {
      stats.failed += batch.length;
      console.error(`❌ batch of ${batch.length} failed: ${error.message}`);
      continue;
    }
    stats.saved += batch.length;
  }
}

// =============================================
// FETCH COMPANY JOBS
// =============================================

async function fetchCompanyJobs(company) {
  try {
    const url = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs`;

    const response = await axios.get(url);

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

    const response = await axios.get(url);

    return response.data;
  } catch (err) {
    console.error(`❌ Failed details ${company}/${jobId}`);
    return null;
  }
}

// =============================================
// MAIN
// =============================================

async function run() {
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

      console.log(
        `\n🏢 ${company.toUpperCase()} (${jobs.length} jobs, ${fresh.length} in window)`,
      );

      // Detail fetches are independent — run them with a bounded worker pool
      // instead of one-at-a-time (the old loop made ~10k sequential requests).
      const normalized = [];
      let idx = 0;
      await Promise.all(
        Array.from({ length: Math.min(DETAIL_CONCURRENCY, fresh.length) }, async () => {
          while (idx < fresh.length) {
            const job = fresh[idx++];
            const details = await fetchJobDetails(company, job.id);
            if (!details) {
              stats.failed++;
              continue;
            }
            const normalizedJob = await normalizeJob(job, company, details);
            if (!isUsJob(normalizedJob)) {
              stats.nonUs = (stats.nonUs || 0) + 1;
              continue;
            }
            normalized.push(normalizedJob);
            stats.processed++;
          }
        }),
      );

      await saveJobs(normalized);
      console.log(`   💾 saved ${normalized.length}`);
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
  console.log("✅ Greenhouse Collector Finished");
  console.log("==========================================");

  console.table(stats);

  console.log("==========================================\n");
}

run();
