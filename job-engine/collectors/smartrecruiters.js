import axios from "axios";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizeSmartRecruiters } from "./normalize/normalizeSmartRecruiters.js";
import companies from "./config/smartrecruitersCompanies.js";
import { isUsJob } from "./lib/isUsJob.js";

dotenv.config({ path: ".env" });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);
// =============================================
// STATS
// =============================================

const stats = {
  companies: 0,
  fetched: 0,
  inserted: 0,
  updated: 0,
  failed: 0,
  skipped: 0,
};
// =============================================
// TEST COMPANY
// =============================================
// Companies come from config/smartrecruitersCompanies.js (single source of
// truth, generated from verify/smartrecruiters.json).

// =============================================
// FETCH JOBS
// =============================================

async function fetchCompanyJobs(company) {
  try {
    

    console.log(`Fetching jobs for ${company}...`);
    let allJobs = [];
let offset = 0;
const limit = 100;

   while (true) {

  const url =
    `https://api.smartrecruiters.com/v1/companies/${company}/postings?limit=${limit}&offset=${offset}`;

  console.log(`Fetching page starting at ${offset}...`);

  const response = await axios.get(url);

  const jobs = response.data.content || [];

  allJobs.push(...jobs);

  if (jobs.length < limit) {
    break;
  }

  offset += limit;

}

return {
  content: allJobs,
};

  } catch (err) {
    console.log(err.response?.status);
    console.log(err.response?.data || err.message);
    return null;
}
}
async function fetchJobDetails(job) {
  try {
    const response = await axios.get(job.ref);
    return response.data;
  } catch (err) {
    console.error(`❌ Failed to fetch details for ${job.name}`);
    return null;
  }
}

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



async function run() {
  for (const company of companies) {
    stats.companies++;
    const jobs = await fetchCompanyJobs(company);

    if (!jobs) continue;

    const jobList = jobs.content || [];
    stats.fetched += jobList.length;
console.log(`Found ${jobList.length} jobs`);

const normalized = [];
for (const job of jobList) {
    const details = await fetchJobDetails(job);

    if (!details) continue;

   const normalizedJob = await normalizeSmartRecruiters(details);

// (No publish-date cutoff: the API only ever lists currently-open
// postings.)

// Skip non-US jobs
if (!isUsJob(normalizedJob)) {
    stats.skipped++;
    console.log(`⏭️ Skipped: ${normalizedJob.title}`);
    continue;
}

normalized.push(normalizedJob);
stats.processed++;

}

    await saveJobs(normalized);
    if (normalized.length) console.log(`   💾 saved ${normalized.length}`);
  }

console.log("\n==========================================");
console.log("✅ SmartRecruiters Collector Finished");
console.log("==========================================");

console.table(stats);

console.log("==========================================\n");

}

run();