import axios from "axios";
import path from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizeRemotive } from "./normalize/normalizeRemotive.js";
import searches from "./config/remotiveSearches.js";
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
// Remotive public API (remotive.com/api/remote-jobs) — no key, no
// registration, no quota to manage. One request per search returns every
// match (no pagination in their API at all), so this collector is much
// simpler than the key-gated ones.

const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);
const REQUEST_DELAY_MS = Number(process.env.REMOTIVE_REQUEST_DELAY_MS || 500);

const ONLY_QUERIES = (process.env.ONLY_QUERIES || "")
  .split(",")
  .map((q) => q.trim().toLowerCase())
  .filter(Boolean);

const selectedSearches = ONLY_QUERIES.length
  ? searches.filter(({ search }) => ONLY_QUERIES.some((q) => search.toLowerCase().includes(q)))
  : searches;

// Optional cap on total postings collected this run, for a small test slice.
const MAX_RESULTS_TOTAL = Number(process.env.REMOTIVE_MAX_RESULTS || 0);

// =============================================
// STATS
// =============================================

const stats = {
  searches: 0,
  fetched: 0,
  skippedDuplicate: 0,
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

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSearch(search) {
  const { data } = await axios.get("https://remotive.com/api/remote-jobs", {
    timeout: 20000,
    params: { search },
    headers: { "User-Agent": "Mozilla/5.0 (compatible; AIFAGenBot/1.0)" },
  });
  return data?.jobs || [];
}

// =============================================
// MAIN
// =============================================

async function run() {
  console.log("\n==========================================");
  console.log("🚀 Remotive Collector Started");
  console.log("==========================================\n");

  if (ONLY_QUERIES.length) {
    console.log(`⚙ ONLY_QUERIES active — ${selectedSearches.length} of ${searches.length} searches\n`);
  }

  const seen = new Set();
  const normalized = [];

  outer: for (const { search } of selectedSearches) {
    stats.searches++;
    console.log(`\n🔎 "${search}"`);

    let jobs;
    try {
      jobs = await fetchSearch(search);
    } catch (err) {
      console.error(`❌ Search failed: ${err.response?.status || err.message}`);
      continue;
    }

    stats.fetched += jobs.length;
    console.log(`   ${jobs.length} results`);

    for (const job of jobs) {
      const id = String(job.id);
      if (seen.has(id)) {
        stats.skippedDuplicate++;
        continue;
      }
      seen.add(id);

      const normalizedJob = await normalizeRemotive(job);
      if (!isUsJob(normalizedJob)) {
        stats.nonUs++;
        continue;
      }
      normalized.push(normalizedJob);
      stats.processed++;

      if (MAX_RESULTS_TOTAL && normalized.length >= MAX_RESULTS_TOTAL) {
        console.log(`\n⏸ Hit REMOTIVE_MAX_RESULTS (${MAX_RESULTS_TOTAL}) — stopping here.`);
        break outer;
      }
    }

    await sleep(REQUEST_DELAY_MS);
  }

  await saveJobs(normalized);
  console.log(`\n💾 saved ${stats.saved} / ${normalized.length}`);

  // =============================================
  // DEACTIVATE STALE JOBS
  // =============================================

  if (ONLY_QUERIES.length || MAX_RESULTS_TOTAL) {
    console.log("⏭ Skipping deactivation pass (partial run — rows carry no per-query column to scope it safely)");
  } else {
    const staleCutoff = new Date(Date.now() - SCRAPE_LAST_HOURS * 60 * 60 * 1000).toISOString();
    const { error: deErr, count } = await supabase
      .from("jobs")
      .update({ is_active: false })
      .lt("last_seen", staleCutoff)
      .eq("source", "remotive")
      .eq("is_active", true)
      .select("id", { count: "exact", head: true });
    if (deErr) console.error(`⚠ Deactivation pass failed: ${deErr.message}`);
    else console.log(`🗑 Deactivated ${count ?? 0} stale jobs`);
  }

  console.log("\n==========================================");
  console.log("✅ Remotive Collector Finished");
  console.log("==========================================");
  console.table(stats);
  console.log("==========================================\n");
}

// CLI-only guard — this file used to call run() unconditionally at
// import time, which meant `import()`-ing it for any reason (a test
// harness, a future registry, etc.) triggered a real scrape/save run as a
// side effect. Only run when invoked directly (node collectors/remotive.js),
// matching every other collector in this repo (see runtime.js).
const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(path.resolve(entrypoint)).href) {
  run();
}
