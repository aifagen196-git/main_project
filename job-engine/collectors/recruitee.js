import axios from "axios";
import path from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizeRecruiteeJob } from "./normalize/normalizeRecruitee.js";
import companies from "./config/recruiteeCompanies.js";
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

/**
 * Recruitee exposes a public, unauthenticated JSON API for published
 * offers at https://{company}.recruitee.com/api/offers/ — no headless
 * browser required.
 */
async function fetchCompanyJobs(company) {
  try {
    const url = `https://${company}.recruitee.com/api/offers/`;

    const { data } = await axios.get(url, {
      timeout: 15000,
      headers: {
        Accept: "application/json",
      },
    });

    return data?.offers || [];
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
  console.log("🚀 Recruitee Collector Started");
  console.log("==========================================\n");

  for (const company of companies) {
    try {
      stats.companies++;

      const jobs = await fetchCompanyJobs(company);

      stats.fetched += jobs.length;

      console.log(`\n🏢 ${company.toUpperCase()} (${jobs.length} jobs)`);

      const normalized = [];
      for (const job of jobs) {
        // Only keep published offers — Recruitee's API can also return
        // drafts/closed offers depending on board settings.
        if (job.status && job.status !== "published") {
          stats.skipped++;
          continue;
        }

        // /api/offers/ only lists currently-open offers, so every
        // published job here is live right now regardless of publish
        // date — no cutoff needed. Staleness is handled by the
        // last_seen deactivation pass below.
        console.log(`➡ ${job.title}`);

        const normalizedJob = await normalizeRecruiteeJob(job, company);
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
    .eq("source", "recruitee")
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
  console.log("✅ Recruitee Collector Finished");
  console.log("==========================================");

  console.table(stats);

  console.log("==========================================\n");
}

// CLI-only guard — this file used to call run() unconditionally at
// import time, which meant `import()`-ing it for any reason (a test
// harness, a future registry, etc.) triggered a real scrape/save run as a
// side effect. Only run when invoked directly (node collectors/recruitee.js),
// matching every other collector in this repo (see runtime.js).
const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(path.resolve(entrypoint)).href) {
  run();
}
