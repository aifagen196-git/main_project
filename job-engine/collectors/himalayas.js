import axios from "axios";
import path from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizeHimalayasJob } from "./normalize/normalizeHimalayas.js";
import { isUsJob } from "./lib/isUsJob.js";
import allowedCompanies from "./config/himalayasCompanies.js";

dotenv.config({ path: ".env" });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// =============================================
// CONFIG
// =============================================

const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);
const PAGE_LIMIT = 20; // Himalayas' documented max per page
const REQUEST_DELAY_MS = Number(process.env.HIMALAYAS_REQUEST_DELAY_MS || 500);
// Himalayas' feed spans 90k+ jobs across every country; we only care about
// recently-posted ones, so we walk the feed newest-ish and stop as soon as
// a page's oldest posting falls outside the scrape window instead of
// walking the entire feed. This cap is just a safety net in case that
// stopping condition never triggers (e.g. a bad response shape).
const MAX_PAGES = Number(process.env.HIMALAYAS_MAX_PAGES || 100);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// =============================================
// STATS
// =============================================

const stats = {
  pages: 0,
  fetched: 0,
  processed: 0,
  saved: 0,
  failed: 0,
  nonUs: 0,
  offAllowlist: 0,
};

// Empty allowlist = no filtering (default). Case-insensitive exact match on
// `companyName`.
const ALLOWED_COMPANIES = new Set(
  allowedCompanies.map((c) => c.trim().toLowerCase()),
);

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
// FETCH PAGE
// =============================================

/**
 * We use the plain /jobs/api browse endpoint, not /jobs/api/search:
 * search's `offset`/`limit` params are silently ignored server-side (every
 * offset returns the same first ~19 rows), which caused this collector to
 * loop over the same handful of jobs until it hit MAX_PAGES and then fail
 * the upsert on duplicate source_job_ids within one batch. The browse
 * endpoint paginates correctly, so we filter for US-eligible jobs
 * ourselves via isUsJob() below instead of relying on a country param.
 */
async function fetchPage(offset) {
  const { data } = await axios.get("https://himalayas.app/jobs/api", {
    timeout: 15000,
    headers: { Accept: "application/json" },
    params: {
      limit: PAGE_LIMIT,
      offset,
    },
  });

  return data?.jobs || [];
}

// =============================================
// MAIN
// =============================================

async function run() {
  console.log("\n==========================================");
  console.log("🚀 Himalayas Collector Started");
  console.log("==========================================\n");

  const cutoffSeconds = Math.floor(
    (Date.now() - SCRAPE_LAST_HOURS * 60 * 60 * 1000) / 1000,
  );

  const normalized = [];
  const seen = new Set();
  let offset = 0;
  let reachedCutoff = false;

  while (stats.pages < MAX_PAGES && !reachedCutoff) {
    stats.pages++;

    let jobs = [];
    try {
      jobs = await fetchPage(offset);
    } catch (err) {
      console.error(`❌ Failed to fetch page at offset ${offset}: ${err.message}`);
      break;
    }

    if (!jobs.length) break;

    stats.fetched += jobs.length;

    // `sort=recent` isn't strictly monotonic by pubDate (order jitters
    // within a page), so we don't stop on the first stale item — only
    // once an entire page comes back with nothing inside the window.
    let pageHasRecent = false;

    for (const job of jobs) {
      if (job.pubDate && job.pubDate < cutoffSeconds) continue;
      pageHasRecent = true;

      if (!job.guid || seen.has(job.guid)) continue;
      seen.add(job.guid);

      if (ALLOWED_COMPANIES.size && !ALLOWED_COMPANIES.has(String(job.companyName || "").trim().toLowerCase())) {
        stats.offAllowlist++;
        continue;
      }

      console.log(`➡ ${job.title} @ ${job.companyName}`);

      const normalizedJob = await normalizeHimalayasJob(job);
      if (!isUsJob(normalizedJob)) {
        stats.nonUs++;
        continue;
      }
      normalized.push(normalizedJob);
      stats.processed++;
    }

    if (!pageHasRecent) reachedCutoff = true;

    offset += PAGE_LIMIT;
    await sleep(REQUEST_DELAY_MS);
  }

  await saveJobs(normalized);
  if (normalized.length) console.log(`   💾 saved ${normalized.length}`);

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
    .eq("source", "himalayas")
    .eq("is_active", true)
    .select("id", { count: "exact", head: true });

  if (deErr) {
    console.error(`⚠ Deactivation failed: ${deErr.message}`);
  } else {
    console.log(`🗑 Deactivated ${count ?? 0} stale jobs`);
  }

  console.log("\n==========================================");
  console.log("✅ Himalayas Collector Finished");
  console.log("==========================================");

  console.table(stats);

  console.log("==========================================\n");
}

// CLI-only guard — this file used to call run() unconditionally at
// import time, which meant `import()`-ing it for any reason (a test
// harness, a future registry, etc.) triggered a real scrape/save run as a
// side effect. Only run when invoked directly (node collectors/himalayas.js),
// matching every other collector in this repo (see runtime.js).
const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(path.resolve(entrypoint)).href) {
  run();
}
