import axios from "axios";
import path from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizeFindwork } from "./normalize/normalizeFindwork.js";
import searches from "./config/findworkSearches.js";
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
// Findwork.dev API — smaller tech/remote-focused aggregator, free key
// after signup at https://findwork.dev. Auth is `Authorization: Token
// <key>` (confirmed live: an unauthenticated GET to
// https://findwork.dev/api/jobs/ returns 401
// {"detail":"Authentication credentials were not provided."}, standard
// Django REST Framework token-auth shape). The response *field names*
// below are from Findwork's public docs, not from a real authenticated
// response — findwork.dev's docs page requires a logged-in account, so
// this repo couldn't confirm them the way Careerjet's schema was
// confirmed. Run once with a real key and check the console output
// against normalizeFindwork.js before trusting a full pass.
//
// This repo cannot register that account for you — set FINDWORK_API_KEY
// in .env once you have one.

const FINDWORK_API_KEY = process.env.FINDWORK_API_KEY;

const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);
const REQUEST_DELAY_MS = Number(process.env.FINDWORK_REQUEST_DELAY_MS || 500);
const MAX_REQUESTS_PER_RUN = Number(process.env.FINDWORK_MAX_REQUESTS_PER_RUN || 40);

const ONLY_QUERIES = (process.env.ONLY_QUERIES || "")
  .split(",")
  .map((q) => q.trim().toLowerCase())
  .filter(Boolean);

const selectedSearches = ONLY_QUERIES.length
  ? searches.filter(({ search }) => ONLY_QUERIES.some((q) => search.toLowerCase().includes(q)))
  : searches;

const MAX_RESULTS_TOTAL = Number(process.env.FINDWORK_MAX_RESULTS || 0);

// =============================================
// STATS
// =============================================

const stats = {
  searches: 0,
  requestsUsed: 0,
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

async function fetchPage(search, url) {
  const { data } = await axios.get(url || "https://findwork.dev/api/jobs/", {
    timeout: 20000,
    headers: { Authorization: `Token ${FINDWORK_API_KEY}` },
    params: url ? undefined : { search, location: "United States" },
  });

  return {
    results: data?.results || [],
    count: Number(data?.count) || 0,
    next: data?.next || null,
  };
}

// =============================================
// MAIN
// =============================================

async function run() {
  console.log("\n==========================================");
  console.log("🚀 Findwork Collector Started");
  console.log("==========================================\n");

  if (!FINDWORK_API_KEY) {
    console.error("❌ Missing FINDWORK_API_KEY in .env — aborting");
    console.error("   Register at https://findwork.dev (free).");
    return;
  }

  if (ONLY_QUERIES.length) {
    console.log(`⚙ ONLY_QUERIES active — ${selectedSearches.length} of ${searches.length} searches\n`);
  }

  const seen = new Set();
  const normalized = [];

  outer: for (const { search } of selectedSearches) {
    stats.searches++;
    console.log(`\n🔎 "${search}"`);

    let nextUrl = null;
    let page = 0;
    do {
      page++;
      if (stats.requestsUsed >= MAX_REQUESTS_PER_RUN) {
        console.log(`\n⏸ Hit the ${MAX_REQUESTS_PER_RUN}-request budget for this run (FINDWORK_MAX_REQUESTS_PER_RUN) — stopping here to protect quota.`);
        break outer;
      }

      let result;
      try {
        stats.requestsUsed++;
        result = await fetchPage(search, nextUrl);
      } catch (err) {
        const status = err.response?.status;
        if (status === 401) {
          console.error("🚫 Findwork rejected the API key (401) — check FINDWORK_API_KEY. Stopping.");
          break outer;
        }
        if (status === 429) {
          console.error("🚫 Rate limited by Findwork — stopping.");
          break outer;
        }
        console.error(`❌ Page ${page} failed: ${status || err.message}`);
        break;
      }

      stats.fetched += result.results.length;
      console.log(`   page ${page}: ${result.results.length} results (of ${result.count} total)`);

      for (const job of result.results) {
        const id = String(job.id);
        if (seen.has(id)) {
          stats.skippedDuplicate++;
          continue;
        }
        seen.add(id);

        const normalizedJob = await normalizeFindwork(job);
        if (!isUsJob(normalizedJob)) {
          stats.nonUs++;
          continue;
        }
        normalized.push(normalizedJob);
        stats.processed++;

        if (MAX_RESULTS_TOTAL && normalized.length >= MAX_RESULTS_TOTAL) {
          console.log(`\n⏸ Hit FINDWORK_MAX_RESULTS (${MAX_RESULTS_TOTAL}) — stopping here.`);
          break outer;
        }
      }

      nextUrl = result.next;
      if (nextUrl) await sleep(REQUEST_DELAY_MS);
    } while (nextUrl);
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
      .eq("source", "findwork")
      .eq("is_active", true)
      .select("id", { count: "exact", head: true });
    if (deErr) console.error(`⚠ Deactivation pass failed: ${deErr.message}`);
    else console.log(`🗑 Deactivated ${count ?? 0} stale jobs`);
  }

  console.log("\n==========================================");
  console.log("✅ Findwork Collector Finished");
  console.log("==========================================");
  console.table(stats);
  console.log("==========================================\n");
}

// CLI-only guard — this file used to call run() unconditionally at
// import time, which meant `import()`-ing it for any reason (a test
// harness, a future registry, etc.) triggered a real scrape/save run as a
// side effect. Only run when invoked directly (node collectors/findwork.js),
// matching every other collector in this repo (see runtime.js).
const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(path.resolve(entrypoint)).href) {
  run();
}
