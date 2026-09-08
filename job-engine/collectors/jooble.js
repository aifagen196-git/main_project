import axios from "axios";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizeJooble } from "./normalize/normalizeJooble.js";
import searches from "./config/joobleSearches.js";
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
// Jooble Jobs API — general aggregator pulling from thousands of source
// sites worldwide, genuinely free developer key (unlike JSearch's
// paid-plan quota this repo is currently blocked on). Registration:
// https://jooble.org/api/about (instant, key emailed on signup).
//
// This repo cannot register that account for you — set JOOBLE_API_KEY in
// .env once you have one. Unlike Adzuna's GET + querystring, Jooble is a
// POST with a JSON body and the key embedded in the URL path, not as a
// query param.

const JOOBLE_API_KEY = process.env.JOOBLE_API_KEY;
const JOOBLE_LOCATION = process.env.JOOBLE_LOCATION || "United States";

const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);
const MAX_PAGES_PER_SEARCH = Number(process.env.JOOBLE_MAX_PAGES || 4);
const REQUEST_DELAY_MS = Number(process.env.JOOBLE_REQUEST_DELAY_MS || 500);
// Jooble's free tier is commonly capped around 500 calls/day — cap the
// whole run the same way adzuna.js caps its own quota, so a misconfigured
// search list can't blow through a small daily allowance.
const MAX_REQUESTS_PER_RUN = Number(process.env.JOOBLE_MAX_REQUESTS_PER_RUN || 40);

// Optional comma-separated substring allowlist over configured `keywords`
// terms, for testing a single new search without spending the whole run's
// request budget on the ones ahead of it. Unset means "all".
const ONLY_QUERIES = (process.env.ONLY_QUERIES || "")
  .split(",")
  .map((q) => q.trim().toLowerCase())
  .filter(Boolean);

const selectedSearches = ONLY_QUERIES.length
  ? searches.filter(({ keywords }) => ONLY_QUERIES.some((q) => keywords.toLowerCase().includes(q)))
  : searches;

// Optional hard cap on total postings collected this run, for a small test
// slice before a full pass — mirrors MAX_LISTINGS_PER_COMPANY in workday.js.
const MAX_RESULTS_TOTAL = Number(process.env.JOOBLE_MAX_RESULTS || 0);

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

async function fetchPage(keywords, page) {
  const { data } = await axios.post(
    `https://jooble.org/api/${JOOBLE_API_KEY}`,
    {
      keywords,
      location: JOOBLE_LOCATION,
      page: String(page),
    },
    { timeout: 20000 },
  );

  return {
    jobs: data?.jobs || [],
    totalCount: Number(data?.totalCount) || 0,
  };
}

// =============================================
// MAIN
// =============================================

async function run() {
  console.log("\n==========================================");
  console.log("🚀 Jooble Collector Started");
  console.log("==========================================\n");

  if (!JOOBLE_API_KEY) {
    console.error("❌ Missing JOOBLE_API_KEY in .env — aborting");
    console.error("   Register at https://jooble.org/api/about (free, instant).");
    return;
  }

  if (ONLY_QUERIES.length) {
    console.log(`⚙ ONLY_QUERIES active — ${selectedSearches.length} of ${searches.length} searches\n`);
  }

  const seen = new Set();
  const normalized = [];

  outer: for (const { keywords } of selectedSearches) {
    stats.searches++;
    console.log(`\n🔎 "${keywords}"`);

    for (let page = 1; page <= MAX_PAGES_PER_SEARCH; page++) {
      if (stats.requestsUsed >= MAX_REQUESTS_PER_RUN) {
        console.log(`\n⏸ Hit the ${MAX_REQUESTS_PER_RUN}-request budget for this run (JOOBLE_MAX_REQUESTS_PER_RUN) — stopping here to protect quota.`);
        break outer;
      }

      let result;
      try {
        stats.requestsUsed++;
        result = await fetchPage(keywords, page);
      } catch (err) {
        const status = err.response?.status;
        if (status === 429 || status === 403) {
          console.error("🚫 Rate limited / forbidden by Jooble — quota likely exhausted for this key. Stopping.");
          break outer;
        }
        console.error(`❌ Page ${page} failed: ${status || err.message}`);
        break;
      }

      stats.fetched += result.jobs.length;
      console.log(`   page ${page}: ${result.jobs.length} results (of ${result.totalCount} total)`);

      for (const job of result.jobs) {
        const id = String(job.id);
        if (seen.has(id)) {
          stats.skippedDuplicate++;
          continue;
        }
        seen.add(id);

        const normalizedJob = await normalizeJooble(job);
        if (!isUsJob(normalizedJob)) {
          stats.nonUs++;
          continue;
        }
        normalized.push(normalizedJob);
        stats.processed++;

        if (MAX_RESULTS_TOTAL && normalized.length >= MAX_RESULTS_TOTAL) {
          console.log(`\n⏸ Hit JOOBLE_MAX_RESULTS (${MAX_RESULTS_TOTAL}) — stopping here.`);
          break outer;
        }
      }

      if (!result.jobs.length) break; // last page
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
      .eq("source", "jooble")
      .eq("is_active", true)
      .select("id", { count: "exact", head: true });
    if (deErr) console.error(`⚠ Deactivation pass failed: ${deErr.message}`);
    else console.log(`🗑 Deactivated ${count ?? 0} stale jobs`);
  }

  console.log("\n==========================================");
  console.log("✅ Jooble Collector Finished");
  console.log("==========================================");
  console.table(stats);
  console.log("==========================================\n");
}

run();
