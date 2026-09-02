import axios from "axios";
import path from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizeIcims } from "./normalize/normalizeIcims.js";
import companies from "./config/icimsCompanies.js";
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
// /api/jobs caps out at 100 records per page (asking for more silently
// returns 100), and the biggest boards here run to ~3k postings, so a page
// size of 100 keeps a full board to ~30 requests instead of ~300.
const PAGE_SIZE = 100;
// Safety rail: stop paginating a single board after this many pages even if
// totalCount keeps claiming there are more, so a misbehaving tenant can't
// spin forever.
const MAX_PAGES = Number(process.env.ICIMS_MAX_PAGES || 60);

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
  // iCIMS postings carry description + responsibilities + qualifications
  // concatenated, so rows are large -- same reason workday.js uses 100.
  const CHUNK = 100;
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
 * iCIMS' current career-site platform renders its job list client-side from
 * a public, unauthenticated JSON endpoint on the career-site host itself:
 *
 *   GET https://{host}/api/jobs?page={n}&limit=100&internal=false
 *   -> { jobs: [{ data: {...} }], totalCount, ... }
 *
 * Every posting comes back complete -- title, description, responsibilities,
 * qualifications, country_code, posted_date and apply_url are all in the list
 * response -- so there is no per-job detail fetch.
 *
 * This is the NEW career-site platform only. Classic iCIMS boards
 * (careers-{company}.icims.com/jobs/search) 404 on /api/jobs and would need
 * an HTML scrape instead; none are in config for that reason.
 */
async function fetchPage(host, page) {
  const url = `https://${host}/api/jobs`;

  const { data } = await axios.get(url, {
    timeout: 20000,
    params: {
      page,
      limit: PAGE_SIZE,
      sortBy: "relevance",
      descending: false,
      internal: false,
    },
    headers: { Accept: "application/json", "User-Agent": UA },
  });

  return {
    jobs: (data?.jobs || []).map((entry) => entry.data).filter(Boolean),
    totalCount: Number(data?.totalCount) || 0,
  };
}

async function fetchCompanyJobs(host) {
  const all = [];
  const seen = new Set();

  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const { jobs, totalCount } = await fetchPage(host, page);

      if (!jobs.length) break;

      // Guard against a board that keeps serving the same page: if a whole
      // page adds nothing new, stop rather than looping to MAX_PAGES.
      let added = 0;
      for (const job of jobs) {
        const key = String(job.req_id || job.slug);
        if (seen.has(key)) continue;
        seen.add(key);
        all.push(job);
        added++;
      }
      if (!added) break;

      if (all.length >= totalCount) break;
    }
  } catch (err) {
    console.error(`❌ Failed to fetch ${host}: ${err.message}`);
  }

  return all;
}

// =============================================
// MAIN
// =============================================

async function run() {
  console.log("\n==========================================");
  console.log("🚀 iCIMS Collector Started");
  console.log("==========================================\n");

  for (const { company, host } of companies) {
    try {
      stats.companies++;

      const jobs = await fetchCompanyJobs(host);

      stats.fetched += jobs.length;

      console.log(`\n🏢 ${company.toUpperCase()} (${jobs.length} jobs)`);

      const normalized = [];
      for (const job of jobs) {
        // /api/jobs only lists currently-open postings, so no publish-date
        // cutoff is needed. Staleness is handled by the last_seen
        // deactivation pass below.
        //
        // country_code is authoritative here (unlike most ATS's in this
        // repo), so use it to skip non-US postings BEFORE paying for
        // extractJobProfile on a description we're going to throw away.
        // Blank country_code falls through to the full isUsJob() check.
        if (job.country_code && job.country_code.toUpperCase() !== "US") {
          stats.nonUs = (stats.nonUs || 0) + 1;
          continue;
        }

        const normalizedJob = await normalizeIcims(job, company, host);
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
    .eq("source", "icims")
    .eq("is_active", true)
    .select("id", { count: "exact", head: true });

  if (deErr) {
    console.error(`⚠ Deactivation failed: ${deErr.message}`);
  } else {
    console.log(`🗑 Deactivated ${count ?? 0} stale jobs`);
  }

  console.log("\n==========================================");
  console.log("✅ iCIMS Collector Finished");
  console.log("==========================================");

  console.table(stats);

  console.log("==========================================\n");
}

// CLI-only guard — this file used to call run() unconditionally at
// import time, which meant `import()`-ing it for any reason (a test
// harness, a future registry, etc.) triggered a real scrape/save run as a
// side effect. Only run when invoked directly (node collectors/icims.js),
// matching every other collector in this repo (see runtime.js).
const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(path.resolve(entrypoint)).href) {
  run();
}
