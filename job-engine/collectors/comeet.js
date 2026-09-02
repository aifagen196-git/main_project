import axios from "axios";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizeComeet } from "./normalize/normalizeComeet.js";
import companies from "./config/comeetCompanies.js";
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

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

// =============================================
// STATS
// =============================================

const stats = {
  companies: 0,
  fetched: 0,
  processed: 0,
  saved: 0,
  failed: 0,
  noToken: 0,
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
// FETCH COMPANY JOBS
// =============================================

/**
 * Comeet's Careers API needs both a company `uid` and a public `token` on
 * every request. The token isn't secret — it's embedded in the company's
 * own public careers page HTML (https://www.comeet.com/jobs/{name}/{uid})
 * so the page's own JS can fetch and render jobs client-side — but it
 * isn't listed in config either, since it can rotate. So each run
 * re-derives it fresh from that HTML page before calling the API.
 */
async function fetchToken(name, uid) {
  try {
    const { data: html } = await axios.get(
      `https://www.comeet.com/jobs/${name}/${uid}`,
      { timeout: 15000, headers: HEADERS },
    );
    const match = html.match(/token["']?\s*[:=]\s*["']([a-zA-Z0-9_-]{20,})["']/i);
    return match ? match[1] : null;
  } catch (err) {
    console.error(`❌ Failed to load careers page for ${name}: ${err.message}`);
    return null;
  }
}

async function fetchCompanyJobs(name, uid) {
  const token = await fetchToken(name, uid);
  if (!token) {
    stats.noToken++;
    return [];
  }

  try {
    const { data } = await axios.get(
      `https://www.comeet.co/careers-api/2.0/company/${uid}/positions`,
      { timeout: 15000, params: { token, details: true } },
    );
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error(`❌ Failed to fetch ${name}: ${err.message}`);
    return [];
  }
}

// =============================================
// MAIN
// =============================================

async function run() {
  console.log("\n==========================================");
  console.log("🚀 Comeet Collector Started");
  console.log("==========================================\n");

  for (const { name, uid } of companies) {
    try {
      stats.companies++;

      const jobs = await fetchCompanyJobs(name, uid);

      stats.fetched += jobs.length;

      console.log(`\n🏢 ${name.toUpperCase()} (${jobs.length} jobs)`);

      const normalized = [];
      for (const job of jobs) {
        // Careers API only lists currently-open positions, so every job
        // returned here is live right now — no publish-date cutoff
        // needed. Staleness is handled by the last_seen deactivation
        // pass below.
        console.log(`➡ ${job.name}`);

        const normalizedJob = await normalizeComeet(job, name);
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
      console.error(`\n❌ Company failed: ${name}`);
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
    .eq("source", "comeet")
    .eq("is_active", true)
    .select("id", { count: "exact", head: true });

  if (deErr) {
    console.error(`⚠ Deactivation failed: ${deErr.message}`);
  } else {
    console.log(`🗑 Deactivated ${count ?? 0} stale jobs`);
  }

  console.log("\n==========================================");
  console.log("✅ Comeet Collector Finished");
  console.log("==========================================");

  console.table(stats);

  console.log("==========================================\n");
}

run();
