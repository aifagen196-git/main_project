import axios from "axios";
import path from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizeBamboohr } from "./normalize/normalizeBamboohr.js";
import companies from "./config/bamboohrCompanies.js";
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
// Detail-page fetches are independent per job, same pattern as greenhouse.js.
const DETAIL_CONCURRENCY = Number(process.env.DETAIL_CONCURRENCY || 8);

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
 * BambooHR exposes a public, unauthenticated JSON feed for published career
 * postings at https://{company}.bamboohr.com/careers/list, returning
 * { meta: { totalCount }, result: [...] }. Boards with no open roles still
 * return 200 with an empty result array, so a network error (not an empty
 * array) is the real "board doesn't exist" signal.
 */
async function fetchCompanyJobs(company) {
  try {
    const url = `https://${company}.bamboohr.com/careers/list`;

    const { data } = await axios.get(url, {
      timeout: 15000,
      headers: { Accept: "application/json", "User-Agent": UA },
    });

    return Array.isArray(data?.result) ? data.result : [];
  } catch (err) {
    console.error(`❌ Failed to fetch ${company}: ${err.message}`);
    return [];
  }
}

// =============================================
// FETCH JOB DETAILS
// =============================================

async function fetchJobDetails(company, jobId) {
  try {
    const url = `https://${company}.bamboohr.com/careers/${jobId}/detail`;

    const { data } = await axios.get(url, {
      timeout: 15000,
      headers: { Accept: "application/json", "User-Agent": UA },
    });

    return data?.result?.jobOpening || null;
  } catch (err) {
    console.error(`❌ Failed details ${company}/${jobId}`);
    return null;
  }
}

// =============================================
// MAIN
// =============================================

async function run() {
  console.log("\n==========================================");
  console.log("🚀 BambooHR Collector Started");
  console.log("==========================================\n");

  for (const company of companies) {
    try {
      stats.companies++;

      const jobs = await fetchCompanyJobs(company);

      stats.fetched += jobs.length;

      console.log(`\n🏢 ${company.toUpperCase()} (${jobs.length} jobs)`);

      const normalized = [];
      let idx = 0;
      await Promise.all(
        Array.from({ length: Math.min(DETAIL_CONCURRENCY, jobs.length) }, async () => {
          while (idx < jobs.length) {
            const job = jobs[idx++];
            const detail = await fetchJobDetails(company, job.id);
            if (!detail) {
              stats.failed++;
              continue;
            }
            const normalizedJob = await normalizeBamboohr(job, company, detail);
            if (!isUsJob(normalizedJob)) {
              stats.nonUs = (stats.nonUs || 0) + 1;
              continue;
            }
            normalized.push(normalizedJob);
            stats.processed++;
          }
        }),
      );

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
    .eq("source", "bamboohr")
    .eq("is_active", true)
    .select("id", { count: "exact", head: true });

  if (deErr) {
    console.error(`⚠ Deactivation failed: ${deErr.message}`);
  } else {
    console.log(`🗑 Deactivated ${count ?? 0} stale jobs`);
  }

  console.log("\n==========================================");
  console.log("✅ BambooHR Collector Finished");
  console.log("==========================================");

  console.table(stats);

  console.log("==========================================\n");
}

// CLI-only guard — this file used to call run() unconditionally at
// import time, which meant `import()`-ing it for any reason (a test
// harness, a future registry, etc.) triggered a real scrape/save run as a
// side effect. Only run when invoked directly (node collectors/bamboohr.js),
// matching every other collector in this repo (see runtime.js).
const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(path.resolve(entrypoint)).href) {
  run();
}
