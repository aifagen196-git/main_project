import axios from "axios";
import path from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizeHiringcafeJob } from "./normalize/normalizeHiringcafe.js";
import { isUsJob } from "./lib/isUsJob.js";
import { isDomainJob } from "./lib/isDomainJob.js";
import searches from "./config/hiringcafeSearches.js";

dotenv.config({ path: ".env" });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// =============================================
// CONFIG
// =============================================
//
// HiringCafe (hiringcafe.com, formerly hiring.cafe) — no key, no
// registration. It's a job *aggregator* that scrapes ~46 different ATS
// platforms itself and re-serves them enriched (structured comp/seniority/
// location fields, deduped across sources), so this one collector covers
// thousands of companies rather than a per-company slug list.
//
// There's no documented public JSON API — the site's own /api/search-jobs
// POST endpoint 405s for any caller outside its own Next.js server actions,
// even same-origin fetch()es from a real browser tab. What *does* work,
// same as every other page-load, is a plain GET of the search results page:
// the server renders the first page of hits into a `__NEXT_DATA__` script
// tag (`props.pageProps.ssrHits` / `ssrTotalCount` / `ssrIsLastPage`), which
// is exactly what this collector parses. No cookies, no auth, no headless
// browser required — just a GET + a regex pull of that one script tag.
const BASE_URL = "https://hiringcafe.com/";

const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);
// Each query's pool runs into the thousands (e.g. "software engineer" alone
// is ~62k total across the US), and pagination holds up reliably through
// roughly page 200-250 before HiringCafe's backend starts silently
// returning empty/errored pages — 60 is a bulk-volume default well short of
// that cliff. Override via HIRINGCAFE_MAX_PAGES for a smaller/larger run.
const MAX_PAGES_PER_SEARCH = Number(process.env.HIRINGCAFE_MAX_PAGES || 60);
const REQUEST_DELAY_MS = Number(process.env.HIRINGCAFE_REQUEST_DELAY_MS || 500);
const MAX_RESULTS_TOTAL = Number(process.env.HIRINGCAFE_MAX_RESULTS || 0);

const ONLY_QUERIES = (process.env.ONLY_QUERIES || "")
  .split(",")
  .map((q) => q.trim().toLowerCase())
  .filter(Boolean);

const selectedSearches = ONLY_QUERIES.length
  ? searches.filter(({ search }) => ONLY_QUERIES.some((q) => search.toLowerCase().includes(q)))
  : searches;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

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
  offDomain: 0,
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

function buildSearchState(query) {
  return {
    locations: [{
      formatted_address: "United States",
      types: ["country"],
      geometry: { location: { lat: "39.8283", lon: "-98.5795" } },
      id: "user_country",
      address_components: [{ long_name: "United States", short_name: "US", types: ["country"] }],
      options: { flexible_regions: ["anywhere_in_continent", "anywhere_in_world"] },
    }],
    workplaceTypes: ["Remote", "Hybrid", "Onsite"],
    defaultToUserLocation: false,
    userLocation: null,
    searchQuery: query,
    sortBy: "default",
  };
}

const NEXT_DATA_RE = /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s;

async function fetchPage(query, page) {
  const url = `${BASE_URL}?searchState=${encodeURIComponent(JSON.stringify(buildSearchState(query)))}&page=${page}`;
  const { data: html } = await axios.get(url, {
    timeout: 25000,
    headers: {
      "User-Agent": UA,
      Accept: "text/html",
    },
  });

  const match = NEXT_DATA_RE.exec(html);
  if (!match) return { hits: [], isLastPage: true, total: 0 };

  const json = JSON.parse(match[1]);
  const props = json?.props?.pageProps || {};
  if (props.ssrError) return { hits: [], isLastPage: true, total: 0 };

  return {
    hits: props.ssrHits || [],
    isLastPage: !!props.ssrIsLastPage,
    total: Number(props.ssrTotalCount) || 0,
  };
}

// =============================================
// MAIN
// =============================================

async function run() {
  console.log("\n==========================================");
  console.log("🚀 HiringCafe Collector Started");
  console.log("==========================================\n");

  if (ONLY_QUERIES.length) {
    console.log(`⚙ ONLY_QUERIES active — ${selectedSearches.length} of ${searches.length} searches\n`);
  }

  const seen = new Set();
  const normalized = [];

  outer: for (const { search } of selectedSearches) {
    stats.searches++;
    console.log(`\n🔎 "${search}"`);

    for (let page = 0; page < MAX_PAGES_PER_SEARCH; page++) {
      let result;
      try {
        stats.requestsUsed++;
        result = await fetchPage(search, page);
      } catch (err) {
        console.error(`❌ Page ${page} failed: ${err.response?.status || err.message}`);
        break;
      }

      stats.fetched += result.hits.length;
      console.log(`   page ${page}: ${result.hits.length} hits (of ${result.total} total)`);

      for (const hit of result.hits) {
        const id = String(hit.id);
        if (seen.has(id)) {
          stats.skippedDuplicate++;
          continue;
        }
        seen.add(id);

        const rawTitle = hit.v5_processed_job_data?.core_job_title
          || hit.job_information?.title
          || hit.job_information?.job_title_raw
          || "";
        if (!isDomainJob(rawTitle)) {
          stats.offDomain++;
          continue;
        }

        const normalizedJob = await normalizeHiringcafeJob(hit);
        if (!isUsJob(normalizedJob)) {
          stats.nonUs++;
          continue;
        }
        normalized.push(normalizedJob);
        stats.processed++;

        if (MAX_RESULTS_TOTAL && normalized.length >= MAX_RESULTS_TOTAL) {
          console.log(`\n⏸ Hit HIRINGCAFE_MAX_RESULTS (${MAX_RESULTS_TOTAL}) — stopping here.`);
          break outer;
        }
      }

      if (result.isLastPage || !result.hits.length) break;
      await sleep(REQUEST_DELAY_MS);
    }
  }

  await saveJobs(normalized);
  console.log(`\n💾 saved ${stats.saved} / ${normalized.length}`);

  // =============================================
  // DEACTIVATE STALE JOBS
  // =============================================

  if (ONLY_QUERIES.length || MAX_RESULTS_TOTAL) {
    console.log("⏭ Skipping deactivation pass (partial run)");
  } else {
    const staleCutoff = new Date(Date.now() - SCRAPE_LAST_HOURS * 60 * 60 * 1000).toISOString();
    const { error: deErr, count } = await supabase
      .from("jobs")
      .update({ is_active: false })
      .lt("last_seen", staleCutoff)
      .eq("source", "hiringcafe")
      .eq("is_active", true)
      .select("id", { count: "exact", head: true });
    if (deErr) console.error(`⚠ Deactivation pass failed: ${deErr.message}`);
    else console.log(`🗑 Deactivated ${count ?? 0} stale jobs`);
  }

  console.log("\n==========================================");
  console.log("✅ HiringCafe Collector Finished");
  console.log("==========================================");
  console.table(stats);
  console.log("==========================================\n");
}

// CLI-only guard — this file used to call run() unconditionally at
// import time, which meant `import()`-ing it for any reason (a test
// harness, a future registry, etc.) triggered a real scrape/save run as a
// side effect. Only run when invoked directly (node collectors/hiringcafe.js),
// matching every other collector in this repo (see runtime.js).
const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(path.resolve(entrypoint)).href) {
  run();
}
