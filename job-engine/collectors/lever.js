import axios from "axios";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizeLever } from "./normalize/normalizeLever.js";
import companies from "./config/leverCompanies.js";
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

// =============================================
// STATS
// =============================================

const stats = {
  companies: 0,
  fetched: 0,
  skipped: 0,
  processed: 0,
  inserted: 0,
  updated: 0,
  failed: 0,
};

// =============================================
// SAVE JOB
// =============================================

/**
 * Save many jobs in ONE upsert. The per-job SELECT+UPSERT pattern this
 * replaces made two network round trips for every posting, which is what made
 * full runs take hours. Postgres resolves insert-vs-update itself via the
 * (source, source_job_id) conflict target.
 */
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
      console.error("batch of " + batch.length + " failed: " + error.message);
      continue;
    }
    stats.saved = (stats.saved || 0) + batch.length;
  }
}

// =============================================
// FETCH COMPANY JOBS
// =============================================

async function fetchCompanyJobs(company) {
  try {
    const url = `https://api.lever.co/v0/postings/${company}`;

    const { data } = await axios.get(url, {
      timeout: 15000,
      params: {
        mode: "json",
      },
    });

    return data || [];
  } catch (err) {
    console.error(`❌ Failed to fetch ${company}`);

    return [];
  }
}

// =============================================
// MAIN
// =============================================

async function run() {
  console.log("\n==========================================");
  console.log("🚀 Lever Collector Started");
  console.log("==========================================\n");

  for (const company of companies) {
    try {
      stats.companies++;

      const jobs = await fetchCompanyJobs(company);

      stats.fetched += jobs.length;

      console.log(`\n🏢 ${company.toUpperCase()} (${jobs.length} jobs)`);

      const normalized = [];
      for (const job of jobs) {
        // Lever's postings API only ever lists currently-open postings, so
        // every job here is live right now regardless of createdAt — no
        // cutoff needed. Staleness is handled by the last_seen
        // deactivation pass below.
        const normalizedJob = await normalizeLever(job, company);
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
    .update({
      is_active: false,
    })
    .lt("last_seen", staleCutoff)
    .eq("source", "lever")
    .eq("is_active", true)
    .select("id", {
      count: "exact",
      head: true,
    });

  if (deErr) {
    console.error(`⚠ Deactivation failed: ${deErr.message}`);
  } else {
    console.log(`🗑 Deactivated ${count ?? 0} stale jobs`);
  }

  console.log("\n==========================================");
  console.log("✅ Lever Collector Finished");
  console.log("==========================================");

  console.table(stats);

  console.log("==========================================\n");
}

run();
