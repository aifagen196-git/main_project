import axios from "axios";
import { withRunLog } from "./runLog.js";
import path from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizeTeamtailor } from "./normalize/normalizeTeamtailor.js";
import companies from "./config/teamtailorCompanies.js";
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
  saved: 0,
  failed: 0,
};

// =============================================
// SAVE JOB
// =============================================

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
      console.error(`❌ batch of ${batch.length} failed: ${error.message}`);
      continue;
    }
    stats.saved += batch.length;
  }
}

// =============================================
// FETCH COMPANY JOBS
// =============================================

/**
 * Teamtailor exposes a public, unauthenticated JSON Feed for published
 * jobs at https://{company}.teamtailor.com/jobs.json — separate from
 * Teamtailor's authenticated Partner API, which needs a per-company token.
 */
async function fetchCompanyJobs(company) {
  try {
    const url = `https://${company}.teamtailor.com/jobs.json`;

    const { data } = await axios.get(url, {
      timeout: 15000,
      headers: {
        Accept: "application/json",
      },
    });

    return data?.items || [];
  } catch (err) {
    console.error(`❌ Failed to fetch ${company}: ${err.message}`);

    return [];
  }
}

// =============================================
// MAIN
// =============================================

async function run() {
  console.log("\n==========================================");
  console.log("🚀 Teamtailor Collector Started");
  console.log("==========================================\n");

  for (const company of companies) {
    try {
      stats.companies++;

      const jobs = await fetchCompanyJobs(company);

      stats.fetched += jobs.length;

      console.log(`\n🏢 ${company.toUpperCase()} (${jobs.length} jobs)`);

      const normalized = [];
      for (const job of jobs) {
        // jobs.json only ever lists currently-open postings, so every job
        // returned here is live right now regardless of publish date —
        // no cutoff needed. Staleness is handled by the last_seen
        // deactivation pass below.
        console.log(`➡ ${job.title}`);

        const normalizedJob = await normalizeTeamtailor(job, company);
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

  // =============================================
  // DEACTIVATE STALE JOBS
  // =============================================

  const staleCutoff = new Date(
    Date.now() - SCRAPE_LAST_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const { error: deErr, count } = await supabase
    .from("jobs")
    .update({
      is_active: false,
    })
    .lt("last_seen", staleCutoff)
    .eq("source", "teamtailor")
    .eq("is_active", true)
    .select("id", {
      count: "exact",
      head: true,
    });

  if (deErr) {
    console.error(`⚠ Deactivation failed: ${deErr.message}`);
  } else {
    console.log(`🗑 Deactivated ${count ?? 0} stale jobs`);
  }

  console.log("\n==========================================");
  console.log("✅ Teamtailor Collector Finished");
  console.log("==========================================");

  console.table(stats);

  console.log("==========================================\n");
}

// CLI-only guard — this file used to call run() unconditionally at
// import time, which meant `import()`-ing it for any reason (a test
// harness, a future registry, etc.) triggered a real scrape/save run as a
// side effect. Only run when invoked directly (node collectors/teamtailor.js),
// matching every other collector in this repo (see runtime.js).
const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(path.resolve(entrypoint)).href) {
  withRunLog("teamtailor", run);
}
