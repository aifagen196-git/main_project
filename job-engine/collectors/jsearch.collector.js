import axios from "axios";
import { withRunLog } from "./runLog.js";
import path from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizeJSearch } from "./normalize/normalizeJsearch.js";
import searches from "./config/jsearchSearches.js";
import { isUsJob } from "./lib/isUsJob.js";

dotenv.config({ path: ".env" });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// =============================================
// CONFIG
// =============================================

// OpenWeb Ninja's direct portal route avoids RapidAPI's data transfer caps,
// so we hit that host directly. Swap to the rapidapi.com host + headers
// below if you signed up via the RapidAPI marketplace instead.
const JSEARCH_HOST = process.env.JSEARCH_HOST || "api.openwebninja.com";
const JSEARCH_API_KEY = process.env.JSEARCH_API_KEY;
const USE_RAPIDAPI = process.env.JSEARCH_VIA_RAPIDAPI === "true";

const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);
const REQUEST_DELAY_MS = Number(process.env.JSEARCH_REQUEST_DELAY_MS || 1000);
// Free-tier JSearch plans (e.g. OpenWeb Ninja's) are commonly capped at
// ~200 requests/month total — pagination burns through that fast, so
// default to 1 page/search rather than fetching every page available.
const MAX_PAGES_PER_SEARCH = Number(process.env.JSEARCH_MAX_PAGES || 1);
// Hard ceiling on API requests for the whole run, regardless of how many
// searches are configured, so a misconfigured search list (or someone
// bumping JSEARCH_MAX_PAGES back up) can't silently blow through a small
// monthly quota in one go. Each fetchPage() call below counts as 1
// request whether it succeeds, fails, or gets rate-limited.
const MAX_REQUESTS_PER_RUN = Number(
  process.env.JSEARCH_MAX_REQUESTS_PER_RUN || 20,
);

// Optional comma-separated substring allowlist over the configured queries,
// so a newly-added search can be run on its own. Without it, reaching one new
// query at the end of the list costs a request for every query ahead of it —
// which, at 20 searches against a 20-request budget, is the entire run.
// Unset means "all". Matching is case-insensitive substring, so
// ONLY_QUERIES=Walmart selects "Walmart jobs in United States".
const ONLY_QUERIES = (process.env.ONLY_QUERIES || "")
  .split(",")
  .map((q) => q.trim().toLowerCase())
  .filter(Boolean);

const selectedSearches = ONLY_QUERIES.length
  ? searches.filter(({ query }) =>
      ONLY_QUERIES.some((q) => query.toLowerCase().includes(q)),
    )
  : searches;

// JSearch aggregates postings from many job portals (Indeed, LinkedIn,
// Glassdoor, ZipRecruiter, Monster, SimplyHired, CareerBuilder, etc.) —
// job_publisher on each result says which one it came from. By default we
// keep all of them; set JSEARCH_PUBLISHER_FILTER to a comma-separated
// allowlist (e.g. "Indeed,LinkedIn,Glassdoor") to narrow it down.
const PUBLISHER_FILTER = (process.env.JSEARCH_PUBLISHER_FILTER || "")
  .split(",")
  .map((p) => p.trim().toLowerCase())
  .filter(Boolean);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function buildRequestConfig(params) {
  if (USE_RAPIDAPI) {
    return {
      url: "https://jsearch.p.rapidapi.com/search-v2",
      headers: {
        "X-RapidAPI-Key": JSEARCH_API_KEY,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
      },
      params,
    };
  }
  return {
    url: `https://${JSEARCH_HOST}/jsearch/search-v2`,
    headers: {
      "X-API-Key": JSEARCH_API_KEY,
    },
    params,
  };
}

// =============================================
// STATS
// =============================================

const stats = {
  searches: 0,
  requestsUsed: 0,
  fetched: 0,
  keptAfterPublisherFilter: 0,
  skippedDuplicate: 0,
  saved: 0,
  failed: 0,
  rateLimited: 0,
};

// =============================================
// SAVE JOBS
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
// FETCH ONE PAGE
// =============================================

async function fetchPage(query, cursor) {
  const params = {
    query,
    num_pages: 1,
    country: "us",
    language: "en",
    ...(cursor ? { cursor } : {}),
  };

  const { url, headers, params: reqParams } = buildRequestConfig(params);

  try {
    const res = await axios.get(url, {
      headers,
      params: reqParams,
      timeout: 15000,
    });

    if (process.env.JSEARCH_DEBUG === "true") {
      console.log("🔍 RAW RESPONSE:", JSON.stringify(res.data, null, 2).slice(0, 2000));
    }

    return {
      results: res.data?.data?.jobs || [],
      nextCursor: res.data?.data?.cursor || res.data?.cursor || null,
    };
  } catch (err) {
    if (err.response?.status === 429) {
      stats.rateLimited++;
      const retryAfter = err.response.headers?.["retry-after"];
      return { results: [], nextCursor: null, rateLimited: true, retryAfter };
    }
    console.error(`❌ Failed to fetch "${query}": ${err.message}`);
    return { results: [], nextCursor: null };
  }
}

// =============================================
// MAIN
// =============================================

async function run() {
  console.log("\n==========================================");
  console.log("🚀 JSearch Collector Started");
  console.log(
    `   publisher filter: ${PUBLISHER_FILTER.length ? PUBLISHER_FILTER.join(", ") : "(none — keeping all portals)"}`,
  );
  console.log("==========================================\n");

  if (!JSEARCH_API_KEY) {
    console.error("❌ Missing JSEARCH_API_KEY in .env — aborting");
    return;
  }

  const seen = new Set();

  if (ONLY_QUERIES.length) {
    console.log(`⚙ ONLY_QUERIES active — ${selectedSearches.length} of ${searches.length} searches\n`);
  }

  outer: for (const { query } of selectedSearches) {
    stats.searches++;
    console.log(`\n🔎 "${query}"`);

    const normalized = [];
    let cursor = null;

    for (let page = 0; page < MAX_PAGES_PER_SEARCH; page++) {
      if (stats.requestsUsed >= MAX_REQUESTS_PER_RUN) {
        console.log(
          `\n⏸ Hit the ${MAX_REQUESTS_PER_RUN}-request budget for this run ` +
            `(JSEARCH_MAX_REQUESTS_PER_RUN) — stopping here to protect quota. ` +
            `Raise it in .env once you know your plan's real limit.`,
        );
        await saveJobs(normalized);
        if (normalized.length) console.log(`   💾 saved ${normalized.length}`);
        break outer;
      }
      stats.requestsUsed++;

      const { results, nextCursor, rateLimited, retryAfter } = await fetchPage(
        query,
        cursor,
      );

      if (rateLimited) {
        console.error(
          "\n🚫 Rate limited by JSearch — this is almost always an exhausted " +
            "API quota/plan on the OpenWeb Ninja account (api.openwebninja.com), " +
            "not a request-pacing issue: it happens even on the very first " +
            "request of a run. Check usage/plan at https://openwebninja.com " +
            "(or upgrade the plan) before retrying." +
            (retryAfter ? ` Retry-After: ${retryAfter}s.` : ""),
        );
        console.log("\n==========================================");
        console.log("⛔ JSearch Collector Aborted (rate limited)");
        console.log("==========================================");
        console.table(stats);
        return;
      }

      if (!results.length) break;

      stats.fetched += results.length;

      for (const job of results) {
        if (
          PUBLISHER_FILTER.length &&
          !PUBLISHER_FILTER.includes(job.job_publisher?.toLowerCase())
        ) {
          continue;
        }
        stats.keptAfterPublisherFilter++;

        const jobId = job.job_id;
        if (!jobId || seen.has(jobId)) {
          stats.skippedDuplicate++;
          continue;
        }
        seen.add(jobId);

        const normalizedJob = await normalizeJSearch(job);
        if (!isUsJob(normalizedJob)) {
          stats.nonUs = (stats.nonUs || 0) + 1;
          continue;
        }
        normalized.push(normalizedJob);
      }

      if (!nextCursor) break;
      cursor = nextCursor;
      await sleep(REQUEST_DELAY_MS);
    }
console.log("Jobs ready to save:", normalized.length);
    await saveJobs(normalized);
    if (normalized.length) console.log(`   💾 saved ${normalized.length}`);

    await sleep(REQUEST_DELAY_MS);
  }

  // Deactivate stale postings, same convention as the other collectors.
  const staleCutoff = new Date(
    Date.now() - SCRAPE_LAST_HOURS * 60 * 60 * 1000,
  ).toISOString();
  // Unlike workday/oracle, jsearch rows carry no column identifying which
  // configured query produced them, so a filtered run has no way to narrow
  // this to the queries it actually refreshed — it would retire every job
  // from every other search. Skip it rather than scope it wrong; the next
  // full run does the deactivation.
  if (ONLY_QUERIES.length) {
    console.log("⏭ Skipping deactivation pass (ONLY_QUERIES active — cannot scope it safely)");
  } else {
    const { error: deErr, count } = await supabase
      .from("jobs")
      .update({ is_active: false })
      .lt("last_seen", staleCutoff)
      .eq("source", "jsearch")
      .eq("is_active", true)
      .select("id", { count: "exact", head: true });
    if (deErr) console.error(`⚠ Deactivation pass failed: ${deErr.message}`);
    else console.log(`🗑 Deactivated ${count ?? 0} stale jobs`);
  }

  console.log("\n==========================================");
  console.log("✅ JSearch Collector Finished");
  console.log("==========================================");

  console.table(stats);

  console.log("==========================================\n");
}

// CLI-only guard — this file used to call run() unconditionally at
// import time, which meant `import()`-ing it for any reason (a test
// harness, a future registry, etc.) triggered a real scrape/save run as a
// side effect. Only run when invoked directly (node collectors/jsearch.collector.js),
// matching every other collector in this repo (see runtime.js).
const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(path.resolve(entrypoint)).href) {
  withRunLog("jsearch", run);
}
