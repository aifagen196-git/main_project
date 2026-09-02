import axios from "axios";
import path from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizeKforce } from "./normalize/normalizeKforce.js";
import { isUsJob } from "./lib/isUsJob.js";

dotenv.config({ path: ".env" });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// =============================================
// CONFIG
// =============================================
// Kforce is a single staffing company, not a multi-tenant ATS platform --
// there is no config/kforceCompanies.js the way Greenhouse/Lever/etc. have,
// same situation as indeed.js and jsearch.collector.js.
//
// kforce.com's own "Search Jobs" page (https://www.kforce.com/find-work/
// search-jobs/) is a React SPA that queries Microsoft Azure AI Search
// directly from the browser:
//
//   POST https://kforcewebeast.search.windows.net
//        /indexes/kforcewebjobentity/docs/search?api-version=2016-09-01
//   headers: { "api-key": "<query key>" }
//
// The api-key shipped to every page load is an Azure Search QUERY key, not
// an admin key -- Azure Search deliberately splits the two so a read-only,
// search-only key can be safely embedded client-side (the same category of
// "public by design" credential as Comeet's careers-page token in comeet.js
// or Pinpoint's postings.json feed). It cannot write, delete, or read data
// outside this one index. Confirmed live 2026-08-06 by intercepting the
// page's own fetch() call, then replaying it from a plain server-side
// request (no browser, no special headers) -- it works identically, because
// search.windows.net is Microsoft's own domain and isn't behind kforce.com's
// Incapsula/WAF, which only guards the kforce.com domain itself.
const SEARCH_ENDPOINT =
  process.env.KFORCE_SEARCH_ENDPOINT ||
  "https://kforcewebeast.search.windows.net/indexes/kforcewebjobentity/docs/search?api-version=2016-09-01";
const SEARCH_API_KEY =
  process.env.KFORCE_SEARCH_API_KEY || "1603E4DC4C87A8E41D6BBDE4EEA4EFB7";

const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);
// Azure Search hard-caps $top at 1000 regardless of what's requested --
// confirmed live (asking for 1000 returns exactly 1000, never more).
const PAGE_SIZE = 1000;

const SELECT_FIELDS =
  "Industry, Title, Id, PostDate, Responsibilities, Skills, City, State, Zip, SalaryMin, SalaryMax, SalaryText, ReferenceCode, TypeCode, VisaSponsorshipJob, ApplyUrl";

// =============================================
// STATS
// =============================================

const stats = {
  fetched: 0,
  skipped: 0,
  processed: 0,
  saved: 0,
  failed: 0,
  nonUs: 0,
};

// =============================================
// SAVE JOB
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
// FETCH JOBS
// =============================================

/**
 * Every result already carries the full Responsibilities + Skills text, so
 * (unlike Greenhouse/Workday/Oracle) there is no separate per-job detail
 * call -- one paginated loop over the search index is the whole fetch.
 */
async function fetchPage(skip) {
  const { data } = await axios.post(
    SEARCH_ENDPOINT,
    {
      count: true,
      select: SELECT_FIELDS,
      filter: "",
      queryType: "simple",
      search: "",
      searchFields: "Industry, Title, Responsibilities, Skills, City, State, Zip",
      searchMode: "any",
      skip,
      top: PAGE_SIZE,
    },
    {
      timeout: 20000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "api-key": SEARCH_API_KEY,
      },
    },
  );

  return {
    docs: data?.value || [],
    total: Number(data?.["@odata.count"]) || 0,
  };
}

async function fetchAllJobs() {
  const all = [];
  let skip = 0;

  while (true) {
    const { docs, total } = await fetchPage(skip);
    if (!docs.length) break;

    all.push(...docs);

    skip += docs.length;
    if (all.length >= total || docs.length < PAGE_SIZE) break;
  }

  return all;
}

// =============================================
// MAIN
// =============================================

async function run() {
  console.log("\n==========================================");
  console.log("🚀 Kforce Collector Started");
  console.log("==========================================\n");

  const cutoff = new Date(Date.now() - SCRAPE_LAST_HOURS * 60 * 60 * 1000);

  try {
    const docs = await fetchAllJobs();
    stats.fetched = docs.length;

    console.log(`🏢 KFORCE (${docs.length} jobs)`);

    const normalized = [];
    for (const doc of docs) {
      // The index only ever lists currently-open postings, so this cutoff
      // is informational, not a correctness requirement -- kept for parity
      // with greenhouse.js's pattern since PostDate is reliably populated
      // here (unlike most collectors in this repo where it's often absent).
      if (doc.PostDate && new Date(doc.PostDate) < cutoff) {
        stats.skipped++;
      }

      const normalizedJob = await normalizeKforce(doc);
      if (!isUsJob(normalizedJob)) {
        stats.nonUs++;
        continue;
      }
      normalized.push(normalizedJob);
      stats.processed++;
    }

    await saveJobs(normalized);
    if (normalized.length) console.log(`   💾 saved ${normalized.length}`);
  } catch (err) {
    console.error("\n❌ Kforce fetch failed");
    console.error(err.message);
  }

  // =============================================
  // DEACTIVATE STALE JOBS
  // =============================================

  const staleCutoff = new Date(
    Date.now() - SCRAPE_LAST_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const { error: deErr, count } = await supabase
    .from("jobs")
    .update({ is_active: false })
    .lt("last_seen", staleCutoff)
    .eq("source", "kforce")
    .eq("is_active", true)
    .select("id", { count: "exact", head: true });

  if (deErr) {
    console.error(`⚠ Deactivation failed: ${deErr.message}`);
  } else {
    console.log(`🗑 Deactivated ${count ?? 0} stale jobs`);
  }

  console.log("\n==========================================");
  console.log("✅ Kforce Collector Finished");
  console.log("==========================================");

  console.table(stats);

  console.log("==========================================\n");
}

// CLI-only guard — this file used to call run() unconditionally at
// import time, which meant `import()`-ing it for any reason (a test
// harness, a future registry, etc.) triggered a real scrape/save run as a
// side effect. Only run when invoked directly (node collectors/kforce.js),
// matching every other collector in this repo (see runtime.js).
const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(path.resolve(entrypoint)).href) {
  run();
}
