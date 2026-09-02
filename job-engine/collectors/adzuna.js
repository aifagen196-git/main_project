import axios from "axios";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizeAdzuna } from "./normalize/normalizeAdzuna.js";
import searches from "./config/adzunaSearches.js";
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
// Adzuna Jobs API — general aggregator, genuinely free developer tier
// (unlike JSearch's paid-plan quota this repo is currently blocked on).
// Registration: https://developer.adzuna.com/ (instant, app_id + app_key
// issued immediately on signup).
//
// This repo cannot register that account for you (see ADZUNA_SETUP.md) —
// set ADZUNA_APP_ID and ADZUNA_APP_KEY in .env once you have them.

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;
const ADZUNA_COUNTRY = "us";

const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);
const RESULTS_PER_PAGE = 50; // Adzuna's documented max
const MAX_PAGES_PER_SEARCH = Number(process.env.ADZUNA_MAX_PAGES || 4);
const REQUEST_DELAY_MS = Number(process.env.ADZUNA_REQUEST_DELAY_MS || 500);
// Adzuna's free tier is commonly capped around 250 calls/month — cap the
// whole run the same way jsearch.collector.js caps JSearch, so a
// misconfigured search list can't blow through a small monthly quota.
const MAX_REQUESTS_PER_RUN = Number(process.env.ADZUNA_MAX_REQUESTS_PER_RUN || 30);

// Optional comma-separated substring allowlist over configured `what`
// terms, for testing a single new search without spending the whole run's
// request budget on the ones ahead of it. Unset means "all".
const ONLY_QUERIES = (process.env.ONLY_QUERIES || "")
  .split(",")
  .map((q) => q.trim().toLowerCase())
  .filter(Boolean);

const selectedSearches = ONLY_QUERIES.length
  ? searches.filter(({ what }) => ONLY_QUERIES.some((q) => what.toLowerCase().includes(q)))
  : searches;

// Optional hard cap on total postings collected this run, for a small test
// slice before a full pass — mirrors MAX_LISTINGS_PER_COMPANY in workday.js.
const MAX_RESULTS_TOTAL = Number(process.env.ADZUNA_MAX_RESULTS || 0);

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

async function fetchPage(what, category, page) {
  const { data } = await axios.get(
    `https://api.adzuna.com/v1/api/jobs/${ADZUNA_COUNTRY}/search/${page}`,
    {
      timeout: 20000,
      params: {
        app_id: ADZUNA_APP_ID,
        app_key: ADZUNA_APP_KEY,
        what,
        category: category || undefined,
        results_per_page: RESULTS_PER_PAGE,
        "content-type": "application/json",
      },
    },
  );

  return {
    results: data?.results || [],
    count: Number(data?.count) || 0,
  };
}

// =============================================
// MAIN
// =============================================

async function run() {
  console.log("\n==========================================");
  console.log("🚀 Adzuna Collector Started");
  console.log("==========================================\n");

  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
    console.error("❌ Missing ADZUNA_APP_ID / ADZUNA_APP_KEY in .env — aborting");
    console.error("   Register at https://developer.adzuna.com/ (free, instant).");
    return;
  }

  if (ONLY_QUERIES.length) {
    console.log(`⚙ ONLY_QUERIES active — ${selectedSearches.length} of ${searches.length} searches\n`);
  }

  const seen = new Set();
  const normalized = [];

  outer: for (const { what, category } of selectedSearches) {
    stats.searches++;
    console.log(`\n🔎 "${what}"${category ? ` [${category}]` : ""}`);

    for (let page = 1; page <= MAX_PAGES_PER_SEARCH; page++) {
      if (stats.requestsUsed >= MAX_REQUESTS_PER_RUN) {
        console.log(`\n⏸ Hit the ${MAX_REQUESTS_PER_RUN}-request budget for this run (ADZUNA_MAX_REQUESTS_PER_RUN) — stopping here to protect quota.`);
        break outer;
      }

      let result;
      try {
        stats.requestsUsed++;
        result = await fetchPage(what, category, page);
      } catch (err) {
        const status = err.response?.status;
        if (status === 429) {
          console.error("🚫 Rate limited by Adzuna — quota likely exhausted for this key. Stopping.");
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

        const normalizedJob = await normalizeAdzuna(job);
        if (!isUsJob(normalizedJob)) {
          stats.nonUs++;
          continue;
        }
        normalized.push(normalizedJob);
        stats.processed++;

        if (MAX_RESULTS_TOTAL && normalized.length >= MAX_RESULTS_TOTAL) {
          console.log(`\n⏸ Hit ADZUNA_MAX_RESULTS (${MAX_RESULTS_TOTAL}) — stopping here.`);
          break outer;
        }
      }

      if (result.results.length < RESULTS_PER_PAGE) break; // last page
      await sleep(REQUEST_DELAY_MS);
    }
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
      .eq("source", "adzuna")
      .eq("is_active", true)
      .select("id", { count: "exact", head: true });
    if (deErr) console.error(`⚠ Deactivation pass failed: ${deErr.message}`);
    else console.log(`🗑 Deactivated ${count ?? 0} stale jobs`);
  }

  console.log("\n==========================================");
  console.log("✅ Adzuna Collector Finished");
  console.log("==========================================");
  console.table(stats);
  console.log("==========================================\n");
}

run();
