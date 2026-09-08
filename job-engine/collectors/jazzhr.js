import axios from "axios";
import { withRunLog } from "./runLog.js";
import path from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";
import { normalizeJazzhr } from "./normalize/normalizeJazzhr.js";
import companies from "./config/jazzhrCompanies.js";
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
const REQUEST_DELAY_MS = Number(process.env.JAZZHR_REQUEST_DELAY_MS || 500);

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// =============================================
// STATS
// =============================================

const stats = {
  companies: 0,
  fetched: 0,
  processed: 0,
  saved: 0,
  failed: 0,
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
// FETCH COMPANY JOB LIST
// =============================================

/**
 * JazzHR has no public per-company JSON API (the REST API and XML feed
 * both need a private per-account key), but every account's job list is
 * public, unauthenticated HTML at /apply/jobs/ — the same page a
 * candidate sees. We scrape that instead. Row ids look like
 * row_job_{YYYYMMDDHHMMSS}_{jobId} — that timestamp is the job's actual
 * creation date, so we parse it out rather than stamping "now".
 */
async function fetchCompanyJobs(company) {
  try {
    const { data: html } = await axios.get(
      `https://${company}.applytojob.com/apply/jobs/`,
      { timeout: 15000, headers: HEADERS },
    );

    const $ = cheerio.load(html);
    const jobs = [];

    $("tr[id^='row_job_']").each((_, el) => {
      const row = $(el);
      const rowId = row.attr("id") || "";
      const m = rowId.match(/^row_job_(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})_(.+)$/);

      const link = row.find("a.job_title_link");
      const href = link.attr("href");
      if (!href) return;

      const title = link.text().trim();
      const location = row.find("td").eq(1).text().trim();

      let postedDate = null;
      if (m) {
        const [, y, mo, d, h, mi, s] = m;
        postedDate = new Date(
          Date.UTC(+y, +mo - 1, +d, +h, +mi, +s),
        ).toISOString();
      }

      jobs.push({
        jobId: m ? m[7] : href,
        title,
        location,
        postedDate,
        applyUrl: new URL(href, `https://${company}.applytojob.com/`).toString(),
      });
    });

    return jobs;
  } catch (err) {
    console.error(`❌ Failed to fetch ${company}: ${err.message}`);
    return [];
  }
}

async function fetchJobDescription(applyUrl) {
  try {
    const { data: html } = await axios.get(applyUrl, {
      timeout: 15000,
      headers: HEADERS,
    });
    const $ = cheerio.load(html);
    return $(".job_description").first().html() || "";
  } catch (err) {
    console.error(`❌ Failed description for ${applyUrl}: ${err.message}`);
    return "";
  }
}

// =============================================
// MAIN
// =============================================

async function run() {
  console.log("\n==========================================");
  console.log("🚀 JazzHR Collector Started");
  console.log("==========================================\n");

  for (const company of companies) {
    try {
      stats.companies++;

      const jobs = await fetchCompanyJobs(company);

      stats.fetched += jobs.length;

      console.log(`\n🏢 ${company.toUpperCase()} (${jobs.length} jobs)`);

      const normalized = [];
      for (const job of jobs) {
        // JazzHR's board is mostly small US businesses, but check location
        // before spending a request on the description page — it's the
        // same field the final isUsJob() check below would use anyway.
        if (!isUsJob({ location: job.location })) {
          stats.nonUs = (stats.nonUs || 0) + 1;
          continue;
        }

        console.log(`➡ ${job.title}`);

        const descriptionHtml = await fetchJobDescription(job.applyUrl);
        await sleep(REQUEST_DELAY_MS);

        const normalizedJob = await normalizeJazzhr(job, company, descriptionHtml);
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
    .eq("source", "jazzhr")
    .eq("is_active", true)
    .select("id", { count: "exact", head: true });

  if (deErr) {
    console.error(`⚠ Deactivation failed: ${deErr.message}`);
  } else {
    console.log(`🗑 Deactivated ${count ?? 0} stale jobs`);
  }

  console.log("\n==========================================");
  console.log("✅ JazzHR Collector Finished");
  console.log("==========================================");

  console.table(stats);

  console.log("==========================================\n");
}

// CLI-only guard — this file used to call run() unconditionally at
// import time, which meant `import()`-ing it for any reason (a test
// harness, a future registry, etc.) triggered a real scrape/save run as a
// side effect. Only run when invoked directly (node collectors/jazzhr.js),
// matching every other collector in this repo (see runtime.js).
const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(path.resolve(entrypoint)).href) {
  withRunLog("jazzhr", run);
}
