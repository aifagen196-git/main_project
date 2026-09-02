import axios from "axios";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizeCareerjet } from "./normalize/normalizeCareerjet.js";
import searches from "./config/careerjetSearches.js";
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
// Careerjet Partner API — general aggregator, free for publishers.
// Registration: https://www.careerjet.com/partners/api/ (issues an API
// key from your Publisher account; approval is manual, unlike Adzuna's
// instant signup).
//
// This repo cannot register that account for you — set CAREERJET_API_KEY
// in .env once you have one. Auth is HTTP Basic with the key as username
// and an empty password (per the live docs at the URL above, confirmed
// 2026-08-20), not a query-string key like Adzuna/Jooble.
//
// `user_ip` and `user_agent` are REQUIRED params — the API is built around
// "the IP/UA of the user whose action triggered this call", which doesn't
// map cleanly onto a background collector with no end user. Using a fixed
// placeholder IP and a descriptive bot user-agent, both overridable via env
// if Careerjet's abuse detection ever flags them.

const CAREERJET_API_KEY = process.env.CAREERJET_API_KEY;
const CAREERJET_LOCALE = process.env.CAREERJET_LOCALE || "en_US";
const CAREERJET_LOCATION = process.env.CAREERJET_LOCATION || "United States";
const CAREERJET_USER_IP = process.env.CAREERJET_USER_IP || "127.0.0.1";
const CAREERJET_USER_AGENT = process.env.CAREERJET_USER_AGENT || "aifagen-collector/1.0";

const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);
const PAGE_SIZE = Number(process.env.CAREERJET_PAGE_SIZE || 50); // API max is 100
const MAX_PAGES_PER_SEARCH = Number(process.env.CAREERJET_MAX_PAGES || 4); // API max is 10
const REQUEST_DELAY_MS = Number(process.env.CAREERJET_REQUEST_DELAY_MS || 500);
const MAX_REQUESTS_PER_RUN = Number(process.env.CAREERJET_MAX_REQUESTS_PER_RUN || 40);

const ONLY_QUERIES = (process.env.ONLY_QUERIES || "")
  .split(",")
  .map((q) => q.trim().toLowerCase())
  .filter(Boolean);

const selectedSearches = ONLY_QUERIES.length
  ? searches.filter(({ keywords }) => ONLY_QUERIES.some((q) => keywords.toLowerCase().includes(q)))
  : searches;

const MAX_RESULTS_TOTAL = Number(process.env.CAREERJET_MAX_RESULTS || 0);

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
  const { data } = await axios.get("https://search.api.careerjet.net/v4/query", {
    timeout: 20000,
    auth: { username: CAREERJET_API_KEY, password: "" },
    params: {
      locale_code: CAREERJET_LOCALE,
      keywords,
      location: CAREERJET_LOCATION,
      page,
      page_size: PAGE_SIZE,
      sort: "date",
      user_ip: CAREERJET_USER_IP,
      user_agent: CAREERJET_USER_AGENT,
    },
  });

  if (data?.type === "LOCATIONS") {
    return { jobs: [], hits: 0, locationIssue: data.message };
  }

  return {
    jobs: data?.jobs || [],
    hits: Number(data?.hits) || 0,
  };
}

// =============================================
// MAIN
// =============================================

async function run() {
  console.log("\n==========================================");
  console.log("🚀 Careerjet Collector Started");
  console.log("==========================================\n");

  if (!CAREERJET_API_KEY) {
    console.error("❌ Missing CAREERJET_API_KEY in .env — aborting");
    console.error("   Register at https://www.careerjet.com/partners/api/ (free, manual approval).");
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
        console.log(`\n⏸ Hit the ${MAX_REQUESTS_PER_RUN}-request budget for this run (CAREERJET_MAX_REQUESTS_PER_RUN) — stopping here to protect quota.`);
        break outer;
      }

      let result;
      try {
        stats.requestsUsed++;
        result = await fetchPage(keywords, page);
      } catch (err) {
        const status = err.response?.status;
        if (status === 403) {
          console.error(`🚫 Careerjet returned 403 (${err.response?.data?.message || "missing/invalid params"}) — stopping.`);
          break outer;
        }
        console.error(`❌ Page ${page} failed: ${status || err.message}`);
        break;
      }

      if (result.locationIssue) {
        console.log(`   ⚠ location issue: ${result.locationIssue} — skipping this search`);
        break;
      }

      stats.fetched += result.jobs.length;
      console.log(`   page ${page}: ${result.jobs.length} results (of ${result.hits} total)`);

      for (const job of result.jobs) {
        const id = job.url || `${job.title}-${job.company}-${job.date}`;
        if (seen.has(id)) {
          stats.skippedDuplicate++;
          continue;
        }
        seen.add(id);

        const normalizedJob = await normalizeCareerjet(job);
        if (!isUsJob(normalizedJob)) {
          stats.nonUs++;
          continue;
        }
        normalized.push(normalizedJob);
        stats.processed++;

        if (MAX_RESULTS_TOTAL && normalized.length >= MAX_RESULTS_TOTAL) {
          console.log(`\n⏸ Hit CAREERJET_MAX_RESULTS (${MAX_RESULTS_TOTAL}) — stopping here.`);
          break outer;
        }
      }

      if (result.jobs.length < PAGE_SIZE) break; // last page
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
      .eq("source", "careerjet")
      .eq("is_active", true)
      .select("id", { count: "exact", head: true });
    if (deErr) console.error(`⚠ Deactivation pass failed: ${deErr.message}`);
    else console.log(`🗑 Deactivated ${count ?? 0} stale jobs`);
  }

  console.log("\n==========================================");
  console.log("✅ Careerjet Collector Finished");
  console.log("==========================================");
  console.table(stats);
  console.log("==========================================\n");
}

run();
