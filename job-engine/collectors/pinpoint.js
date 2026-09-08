import axios from "axios";
import { withRunLog } from "./runLog.js";
import path from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizePinpoint } from "./normalize/normalizePinpoint.js";
import companies from "./config/pinpointCompanies.js";
import { isUsJob } from "./lib/isUsJob.js";

dotenv.config({ path: ".env" });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// =============================================
// CONFIG
// =============================================

const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// =============================================
// STATS
// =============================================

const stats = {
  companies: 0,
  fetched: 0,
  skipped: 0,
  processed: 0,
  saved: 0,
  failed: 0,
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
// FETCH COMPANY JOBS
// =============================================

/**
 * Pinpoint exposes a public, unauthenticated JSON feed of live postings at
 * https://{slug}.pinpointhq.com/postings.json, returning { data: [...] }.
 * Every posting arrives complete -- description, requirements, salary band
 * and apply URL are all in the list response, so there is no per-job detail
 * fetch (same one-call shape as Ashby).
 *
 * Note the tenant slug is the career-site subdomain the customer chose, NOT
 * their company name (Pinpoint's own board is "workwithus"), which is why
 * config entries carry an explicit `company` alongside `slug`.
 *
 * Pinpoint also serves /api/v1/* on the same host, but that is the
 * authenticated partner API and 401s without an X-API-KEY header.
 */
async function fetchCompanyJobs(slug) {
  try {
    const url = `https://${slug}.pinpointhq.com/postings.json`;

    const { data } = await axios.get(url, {
      timeout: 15000,
      headers: { Accept: "application/json", "User-Agent": UA },
    });

    return Array.isArray(data?.data) ? data.data : [];
  } catch (err) {
    console.error(`❌ Failed to fetch ${slug}: ${err.message}`);
    return [];
  }
}

// =============================================
// MAIN
// =============================================

async function run() {
  console.log("\n==========================================");
  console.log("🚀 Pinpoint Collector Started");
  console.log("==========================================\n");

  for (const { company, slug } of companies) {
    try {
      stats.companies++;

      const jobs = await fetchCompanyJobs(slug);

      stats.fetched += jobs.length;

      console.log(`\n🏢 ${company.toUpperCase()} (${jobs.length} jobs)`);

      const normalized = [];
      for (const job of jobs) {
        // postings.json only ever lists currently-open postings, so every
        // job here is live right now -- no publish-date cutoff needed (and
        // the feed carries no publish date anyway). Staleness is handled by
        // the last_seen deactivation pass below.
        const normalizedJob = await normalizePinpoint(job, company);
        if (!isUsJob(normalizedJob)) {
          stats.nonUs = (stats.nonUs || 0) + 1;
          continue;
        }
        normalized.push(normalizedJob);
        stats.processed++;
      }

      await saveJobs(normalized);
      if (normalized.length) console.log(`   💾 saved ${normalized.length}`);
    } catch (err) {
      console.error(`\n❌ Company failed: ${company}`);
      console.error(err.message);
    }
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
    .eq("source", "pinpoint")
    .eq("is_active", true)
    .select("id", { count: "exact", head: true });

  if (deErr) {
    console.error(`⚠ Deactivation failed: ${deErr.message}`);
  } else {
    console.log(`🗑 Deactivated ${count ?? 0} stale jobs`);
  }

  console.log("\n==========================================");
  console.log("✅ Pinpoint Collector Finished");
  console.log("==========================================");

  console.table(stats);

  console.log("==========================================\n");
}

// CLI-only guard — this file used to call run() unconditionally at
// import time, which meant `import()`-ing it for any reason (a test
// harness, a future registry, etc.) triggered a real scrape/save run as a
// side effect. Only run when invoked directly (node collectors/pinpoint.js),
// matching every other collector in this repo (see runtime.js).
const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(path.resolve(entrypoint)).href) {
  withRunLog("pinpoint", run);
}
