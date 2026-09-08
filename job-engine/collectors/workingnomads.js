import axios from "axios";
import { withRunLog } from "./runLog.js";
import path from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizeWorkingnomads } from "./normalize/normalizeWorkingnomads.js";
import { isUsJob } from "./lib/isUsJob.js";

dotenv.config({ path: ".env" });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// =============================================
// CONFIG
// =============================================
//
// Working Nomads exposed-jobs feed — no key, no auth, single GET.
// Confirmed live 2026-08-20: https://www.workingnomads.com/api/exposed_jobs/
// returns a flat JSON array (~50 remote postings, rolling window — this is
// their "currently live" feed, not a paginated archive, so a run just
// fetches once and takes whatever's there, same shape as remoteok.js).
// Most listings are remote-anywhere/global rather than US-specific, same
// caveat as Arbeitnow/Himalayas — isUsJob below is what keeps this useful.

const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);

// =============================================
// STATS
// =============================================

const stats = {
  fetched: 0,
  processed: 0,
  saved: 0,
  failed: 0,
  nonUs: 0,
};

// =============================================
// SAVE JOBS
// =============================================

async function saveJobs(jobs) {
  if (!jobs.length) return;
  const CHUNK = Number(process.env.SAVE_CHUNK || 200);
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
// FETCH
// =============================================

async function fetchJobs() {
  const { data } = await axios.get("https://www.workingnomads.com/api/exposed_jobs/", {
    timeout: 15000,
  });
  return Array.isArray(data) ? data : [];
}

// =============================================
// MAIN
// =============================================

async function run() {
  console.log("\n==========================================");
  console.log("🚀 Working Nomads Collector Started");
  console.log("==========================================\n");

  let jobs = [];
  try {
    jobs = await fetchJobs();
  } catch (err) {
    console.error(`❌ Failed to fetch Working Nomads jobs: ${err.message}`);
  }

  stats.fetched = jobs.length;
  console.log(`📥 ${jobs.length} jobs fetched`);

  const normalized = [];
  for (const job of jobs) {
    console.log(`➡ ${job.title} @ ${job.company_name}`);

    const normalizedJob = await normalizeWorkingnomads(job);
    if (!isUsJob(normalizedJob)) {
      stats.nonUs++;
      continue;
    }
    normalized.push(normalizedJob);
    stats.processed++;
  }

  await saveJobs(normalized);
  if (normalized.length) console.log(`   💾 saved ${normalized.length}`);

  // =============================================
  // DEACTIVATE STALE JOBS
  // =============================================

  const staleCutoff = new Date(Date.now() - SCRAPE_LAST_HOURS * 60 * 60 * 1000).toISOString();
  const { error: deErr, count } = await supabase
    .from("jobs")
    .update({ is_active: false })
    .lt("last_seen", staleCutoff)
    .eq("source", "workingnomads")
    .eq("is_active", true)
    .select("id", { count: "exact", head: true });

  if (deErr) console.error(`⚠ Deactivation failed: ${deErr.message}`);
  else console.log(`🗑 Deactivated ${count ?? 0} stale jobs`);

  console.log("\n==========================================");
  console.log("✅ Working Nomads Collector Finished");
  console.log("==========================================");
  console.table(stats);
  console.log("==========================================\n");
}

// CLI-only guard — this file used to call run() unconditionally at
// import time, which meant `import()`-ing it for any reason (a test
// harness, a future registry, etc.) triggered a real scrape/save run as a
// side effect. Only run when invoked directly (node collectors/workingnomads.js),
// matching every other collector in this repo (see runtime.js).
const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(path.resolve(entrypoint)).href) {
  withRunLog("workingnomads", run);
}
