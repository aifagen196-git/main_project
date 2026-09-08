import axios from "axios";
import dotenv from "dotenv";
import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";
import { normalizeIndeed } from "./normalize/normalizeIndeed.js";
import searches from "./config/indeedSearches.js";
import { isUsJob } from "./lib/isUsJob.js";
import { isGigListing } from "./lib/isGigListing.js";

dotenv.config({ path: ".env" });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// =============================================
// CONFIG
// =============================================

const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);
// Indeed's public search results page shows 15 jobs per page and blocks
// aggressively past a handful of pages from one IP — keep this small and
// polite rather than fighting the block with proxies/evasion.
const MAX_PAGES_PER_SEARCH = Number(process.env.INDEED_MAX_PAGES || 3);
const RESULTS_PER_PAGE = 15;
// Delay between requests so we don't hammer Indeed from a single IP.
const REQUEST_DELAY_MS = Number(process.env.INDEED_REQUEST_DELAY_MS || 1500);
// Indeed returns a hard 403/429 from most datacenter IPs (confirmed
// 2026-08-03 — every request in this environment is blocked with a
// challenge/captcha page, status 403, even on the very first request).
// Retry a handful of times with exponential backoff + jitter before
// giving up on a search entirely, since a block is sometimes transient
// (a rotating proxy/IP or a brief cooldown clears it).
const MAX_BLOCK_RETRIES = Number(process.env.INDEED_MAX_BLOCK_RETRIES || 2);
const BLOCK_BACKOFF_BASE_MS = Number(
  process.env.INDEED_BLOCK_BACKOFF_BASE_MS || 5000,
);

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Indeed sometimes serves a 200 status but with a CAPTCHA/"verify you are
// human" interstitial instead of real results — a soft block that a bare
// status-code check would miss. Detect it by content rather than status.
function isBlockedResponse(status, html) {
  if (status === 403 || status === 429) return true;
  if (!html) return false;
  return /captcha|verify you are human|unusual traffic|are you a robot/i.test(
    html,
  );
}

function jitter(ms) {
  return ms + Math.floor(Math.random() * ms * 0.3);
}

// =============================================
// STATS
// =============================================

const stats = {
  searches: 0,
  fetched: 0,
  skipped: 0,
  processed: 0,
  saved: 0,
  failed: 0,
  blocked: 0,
  gigListing: 0,
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
// FETCH SEARCH RESULTS PAGE
// =============================================

async function fetchSearchPage(keywords, location, start) {
  for (let attempt = 0; attempt <= MAX_BLOCK_RETRIES; attempt++) {
    let status = null;
    let html = null;

    try {
      const res = await axios.get("https://www.indeed.com/jobs", {
        params: { q: keywords, l: location, start },
        headers: HEADERS,
        timeout: 15000,
        validateStatus: () => true, // inspect blocked responses ourselves
      });
      status = res.status;
      html = res.data;
    } catch (err) {
      status = err.response?.status ?? null;
      html = err.response?.data ?? null;
      if (!status) {
        console.error(`❌ Failed to fetch search page: ${err.message}`);
        return [];
      }
    }

    if (isBlockedResponse(status, html)) {
      stats.blocked++;
      if (attempt < MAX_BLOCK_RETRIES) {
        const delay = jitter(BLOCK_BACKOFF_BASE_MS * 2 ** attempt);
        console.error(
          `🚫 Blocked (status ${status}) — retrying in ${Math.round(delay / 1000)}s (attempt ${attempt + 1}/${MAX_BLOCK_RETRIES})`,
        );
        await sleep(delay);
        continue;
      }
      console.error(
        `🚫 Blocked (status ${status}) — giving up on this search after ${MAX_BLOCK_RETRIES} retries`,
      );
      return null;
    }

    if (status >= 400) {
      console.error(`❌ Search page returned status ${status}`);
      return [];
    }

    const $ = cheerio.load(html);
    const jobs = [];

    $(".job_seen_beacon, .jobsearch-SerpJobCard").each((_, el) => {
      const card = $(el);
      const jobKey =
        card.attr("data-jk") ||
        card.find("a[data-jk]").attr("data-jk") ||
        card.find("h2.jobTitle a").attr("id")?.replace("job_", "");

      if (!jobKey) return;

      const title = card
        .find("h2.jobTitle span")
        .last()
        .text()
        .trim();
      const company = card
        .find('[data-testid="company-name"]')
        .text()
        .trim();
      const jobLocation = card
        .find('[data-testid="text-location"]')
        .text()
        .trim();
      const snippet = card
        .find('[data-testid="jobsnippet_footer"], .job-snippet')
        .text()
        .trim();
      const salary = card
        .find('[data-testid="attribute_snippet_testid"]')
        .first()
        .text()
        .trim();

      jobs.push({
        jobKey,
        title,
        company,
        location: jobLocation,
        snippet,
        salary: salary || null,
      });
    });

    return jobs;
  }

  return [];
}

// =============================================
// FETCH JOB DETAILS
// =============================================

async function fetchJobDetails(jobKey) {
  for (let attempt = 0; attempt <= MAX_BLOCK_RETRIES; attempt++) {
    let status = null;
    let html = null;

    try {
      const res = await axios.get("https://www.indeed.com/viewjob", {
        params: { jk: jobKey },
        headers: HEADERS,
        timeout: 15000,
        validateStatus: () => true,
      });
      status = res.status;
      html = res.data;
    } catch (err) {
      console.error(`❌ Failed details for ${jobKey}: ${err.message}`);
      return null;
    }

    if (isBlockedResponse(status, html)) {
      stats.blocked++;
      if (attempt < MAX_BLOCK_RETRIES) {
        const delay = jitter(BLOCK_BACKOFF_BASE_MS * 2 ** attempt);
        console.error(
          `🚫 Blocked fetching details for ${jobKey} — retrying in ${Math.round(delay / 1000)}s`,
        );
        await sleep(delay);
        continue;
      }
      console.error(`🚫 Blocked fetching details for ${jobKey} — giving up`);
      return null;
    }

    if (status >= 400) {
      console.error(`❌ Details for ${jobKey} returned status ${status}`);
      return null;
    }

    const $ = cheerio.load(html);
    return $("#jobDescriptionText").html() || "";
  }

  return null;
}

// =============================================
// MAIN
// =============================================

async function run() {
  console.log("\n==========================================");
  console.log("🚀 Indeed Collector Started");
  console.log("==========================================\n");

  const cutoff = new Date(Date.now() - SCRAPE_LAST_HOURS * 60 * 60 * 1000);
  const seen = new Set();

  for (const { keywords, location } of searches) {
    stats.searches++;
    console.log(`\n🔎 "${keywords}" in "${location}"`);

    const normalized = [];

    for (let page = 0; page < MAX_PAGES_PER_SEARCH; page++) {
      const start = page * RESULTS_PER_PAGE;
      const jobs = await fetchSearchPage(keywords, location, start);

      if (jobs === null) break; // blocked — stop paginating this search
      if (!jobs.length) break; // no more results

      stats.fetched += jobs.length;

      for (const job of jobs) {
        if (seen.has(job.jobKey)) {
          stats.skipped++;
          continue;
        }
        seen.add(job.jobKey);

        await sleep(REQUEST_DELAY_MS);
        const descriptionHtml = await fetchJobDetails(job.jobKey);
        if (descriptionHtml === null) {
          stats.failed++;
          continue;
        }

        const normalizedJob = await normalizeIndeed(job, descriptionHtml);
        if (isGigListing(normalizedJob)) {
          stats.gigListing++;
          continue;
        }
        if (!isUsJob(normalizedJob)) {
          stats.nonUs = (stats.nonUs || 0) + 1;
          continue;
        }
        normalized.push(normalizedJob);
        stats.processed++;
      }

      await sleep(REQUEST_DELAY_MS);
    }

    await saveJobs(normalized);
    if (normalized.length) console.log(`   💾 saved ${normalized.length}`);
  }

  // Deactivate stale postings, same convention as the other collectors.
  const staleCutoff = new Date(
    Date.now() - SCRAPE_LAST_HOURS * 60 * 60 * 1000,
  ).toISOString();
  const { error: deErr, count } = await supabase
    .from("jobs")
    .update({ is_active: false })
    .lt("last_seen", staleCutoff)
    .eq("source", "indeed")
    .eq("is_active", true)
    .select("id", { count: "exact", head: true });
  if (deErr) console.error(`⚠ Deactivation pass failed: ${deErr.message}`);
  else console.log(`🗑 Deactivated ${count ?? 0} stale jobs`);

  console.log("\n==========================================");
  console.log("✅ Indeed Collector Finished");
  console.log("==========================================");

  console.table(stats);

  console.log("==========================================\n");
}

run();
