import axios from "axios";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizeJobvite } from "./normalize/normalizeJobvite.js";
import companies from "./config/jobviteCompanies.js";
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
// FETCH COMPANY JOB LIST
// =============================================

/**
 * Jobvite boards at https://jobs.jobvite.com/{company} are server-rendered
 * (Angular directives sit in the markup, but the job list is already
 * present in the initial HTML response -- no headless browser needed).
 * Open roles are anchor tags shaped <a href="/{company}/job/{id}">Title</a>.
 */
async function fetchCompanyJobIds(company) {
  try {
    const url = `https://jobs.jobvite.com/${company}`;

    const { data } = await axios.get(url, {
      timeout: 15000,
      headers: { "User-Agent": UA },
    });

    const ids = new Set();
    const re = new RegExp(`href="/${company}/job/([a-zA-Z0-9]+)"`, "g");
    let m;
    while ((m = re.exec(data))) ids.add(m[1]);

    return [...ids];
  } catch (err) {
    console.error(`❌ Failed to fetch ${company}: ${err.message}`);
    return [];
  }
}

// =============================================
// FETCH JOB DETAILS
// =============================================

/**
 * Each job detail page embeds a full schema.org JobPosting as JSON-LD in a
 * <script type="application/ld+json"> tag -- parsed directly instead of
 * scraping the visible HTML.
 */
async function fetchJobDetail(company, jobId) {
  try {
    const url = `https://jobs.jobvite.com/${company}/job/${jobId}`;

    const { data } = await axios.get(url, {
      timeout: 15000,
      headers: { "User-Agent": UA },
    });

    const match = data.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    );
    if (!match) return null;

    const ld = JSON.parse(match[1]);
    return { ld, applyUrl: url };
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
  console.log("🚀 Jobvite Collector Started");
  console.log("==========================================\n");

  for (const company of companies) {
    try {
      stats.companies++;

      const jobIds = await fetchCompanyJobIds(company);

      stats.fetched += jobIds.length;

      console.log(`\n🏢 ${company.toUpperCase()} (${jobIds.length} jobs)`);

      const normalized = [];
      let idx = 0;
      await Promise.all(
        Array.from({ length: Math.min(DETAIL_CONCURRENCY, jobIds.length) }, async () => {
          while (idx < jobIds.length) {
            const jobId = jobIds[idx++];
            const details = await fetchJobDetail(company, jobId);
            if (!details) {
              stats.failed++;
              continue;
            }
            const normalizedJob = await normalizeJobvite(
              details.ld,
              company,
              details.applyUrl,
            );
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
    .eq("source", "jobvite")
    .eq("is_active", true)
    .select("id", { count: "exact", head: true });

  if (deErr) {
    console.error(`⚠ Deactivation failed: ${deErr.message}`);
  } else {
    console.log(`🗑 Deactivated ${count ?? 0} stale jobs`);
  }

  console.log("\n==========================================");
  console.log("✅ Jobvite Collector Finished");
  console.log("==========================================");

  console.table(stats);

  console.log("==========================================\n");
}

run();
