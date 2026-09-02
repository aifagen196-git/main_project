import axios from "axios";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizeUsajobs } from "./normalize/normalizeUsajobs.js";
import searches from "./config/usajobsSearches.js";
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
// USAJOBS.gov Search API — official, free, no quota beyond fair-use rate
// limiting. Registration: https://developer.usajobs.gov/apirequest/
// (instant, just an email + name). The API requires BOTH the issued key AND
// the registered email echoed back as the User-Agent on every request —
// requests without a matching User-Agent are rejected even with a valid key.
//
// This repo cannot register that account for you (see USAJOBS_SETUP.md) —
// set USAJOBS_API_KEY and USAJOBS_USER_AGENT in .env once you have them.

const USAJOBS_API_KEY = process.env.USAJOBS_API_KEY;
const USAJOBS_USER_AGENT = process.env.USAJOBS_USER_AGENT; // the email you registered with

const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);
const RESULTS_PER_PAGE = 250; // USAJOBS' documented max
const MAX_PAGES_PER_SEARCH = Number(process.env.USAJOBS_MAX_PAGES || 4);
const REQUEST_DELAY_MS = Number(process.env.USAJOBS_REQUEST_DELAY_MS || 500);

// Optional comma-separated substring allowlist over configured keywords, so
// a newly-added search (or a small test run) doesn't have to pull every
// configured keyword. Unset means "all".
const ONLY_KEYWORDS = (process.env.ONLY_KEYWORDS || "")
  .split(",")
  .map((k) => k.trim().toLowerCase())
  .filter(Boolean);

const selectedSearches = ONLY_KEYWORDS.length
  ? searches.filter(({ keyword }) => ONLY_KEYWORDS.some((k) => keyword.toLowerCase().includes(k)))
  : searches;

// Optional hard cap on total postings collected this run, for trying the
// integration on a small slice before a full pass — same idea as
// MAX_LISTINGS_PER_COMPANY in workday.js. 0/unset means "no cap".
const MAX_RESULTS_TOTAL = Number(process.env.USAJOBS_MAX_RESULTS || 0);

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

async function fetchPage(keyword, page) {
  const { data } = await axios.get("https://data.usajobs.gov/api/search", {
    timeout: 20000,
    params: {
      Keyword: keyword,
      ResultsPerPage: RESULTS_PER_PAGE,
      Page: page,
      // WhoMayApply=public excludes postings restricted to current/former
      // federal employees, which this collector has no way to act on anyway.
      WhoMayApply: "public",
    },
    headers: {
      Host: "data.usajobs.gov",
      "User-Agent": USAJOBS_USER_AGENT,
      "Authorization-Key": USAJOBS_API_KEY,
    },
  });

  return {
    items: data?.SearchResult?.SearchResultItems || [],
    totalCount: Number(data?.SearchResult?.SearchResultCountAll) || 0,
  };
}

// =============================================
// MAIN
// =============================================

async function run() {
  console.log("\n==========================================");
  console.log("🚀 USAJOBS Collector Started");
  console.log("==========================================\n");

  if (!USAJOBS_API_KEY || !USAJOBS_USER_AGENT) {
    console.error("❌ Missing USAJOBS_API_KEY / USAJOBS_USER_AGENT in .env — aborting");
    console.error("   Register at https://developer.usajobs.gov/apirequest/ (free, instant).");
    return;
  }

  if (ONLY_KEYWORDS.length) {
    console.log(`⚙ ONLY_KEYWORDS active — ${selectedSearches.length} of ${searches.length} searches\n`);
  }

  const seen = new Set();
  const normalized = [];

  outer: for (const { keyword } of selectedSearches) {
    stats.searches++;
    console.log(`\n🔎 "${keyword}"`);

    for (let page = 1; page <= MAX_PAGES_PER_SEARCH; page++) {
      let result;
      try {
        result = await fetchPage(keyword, page);
      } catch (err) {
        console.error(`❌ Page ${page} failed: ${err.response?.status || err.message}`);
        break;
      }

      stats.fetched += result.items.length;
      console.log(`   page ${page}: ${result.items.length} results (of ${result.totalCount} total)`);

      for (const item of result.items) {
        const id = String(item.MatchedObjectId);
        if (seen.has(id)) {
          stats.skippedDuplicate++;
          continue;
        }
        seen.add(id);

        const normalizedJob = await normalizeUsajobs(item);
        if (!isUsJob(normalizedJob)) {
          stats.nonUs++;
          continue;
        }
        normalized.push(normalizedJob);
        stats.processed++;

        if (MAX_RESULTS_TOTAL && normalized.length >= MAX_RESULTS_TOTAL) {
          console.log(`\n⏸ Hit USAJOBS_MAX_RESULTS (${MAX_RESULTS_TOTAL}) — stopping here.`);
          break outer;
        }
      }

      if (result.items.length < RESULTS_PER_PAGE) break; // last page
      await sleep(REQUEST_DELAY_MS);
    }
  }

  await saveJobs(normalized);
  console.log(`\n💾 saved ${stats.saved} / ${normalized.length}`);

  // =============================================
  // DEACTIVATE STALE JOBS
  // =============================================

  if (ONLY_KEYWORDS.length || MAX_RESULTS_TOTAL) {
    console.log("⏭ Skipping deactivation pass (partial run — rows carry no per-keyword column to scope it safely)");
  } else {
    const staleCutoff = new Date(Date.now() - SCRAPE_LAST_HOURS * 60 * 60 * 1000).toISOString();
    const { error: deErr, count } = await supabase
      .from("jobs")
      .update({ is_active: false })
      .lt("last_seen", staleCutoff)
      .eq("source", "usajobs")
      .eq("is_active", true)
      .select("id", { count: "exact", head: true });
    if (deErr) console.error(`⚠ Deactivation pass failed: ${deErr.message}`);
    else console.log(`🗑 Deactivated ${count ?? 0} stale jobs`);
  }

  console.log("\n==========================================");
  console.log("✅ USAJOBS Collector Finished");
  console.log("==========================================");
  console.table(stats);
  console.log("==========================================\n");
}

run();
