import axios from "axios";
import * as cheerio from "cheerio";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizeWeWorkRemotelyJob, splitTitle } from "./normalize/normalizeWeworkremotely.js";
import { isUsJob } from "./lib/isUsJob.js";
import { isGigListing } from "./lib/isGigListing.js";
import allowedCompanies from "./config/weworkremotelyCompanies.js";

dotenv.config({ path: ".env" });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// =============================================
// CONFIG
// =============================================

const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);
const FEED_URL = "https://weworkremotely.com/remote-jobs.rss";

// =============================================
// STATS
// =============================================

const stats = {
  fetched: 0,
  processed: 0,
  saved: 0,
  failed: 0,
  nonUs: 0,
  offAllowlist: 0,
};

// Empty allowlist = no filtering (default). Case-insensitive exact match on
// the company name parsed out of the RSS <title> ("Company: Job Title").
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
// FETCH FEED
// =============================================

/**
 * WWR only publishes an official RSS feed (no JSON API), covering the
 * newest listings site-wide across all categories.
 */
async function fetchFeedItems() {
  const { data } = await axios.get(FEED_URL, {
    timeout: 15000,
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; AIFAGenBot/1.0)",
      Accept: "application/rss+xml, application/xml, text/xml",
    },
  });

  const $ = cheerio.load(data, { xmlMode: true });

  const items = [];
  $("item").each((_, el) => {
    const $el = $(el);
    items.push({
      title: $el.find("title").first().text(),
      link: $el.find("link").first().text(),
      guid: $el.find("guid").first().text(),
      region: $el.find("region").first().text(),
      country: $el.find("country").first().text(),
      state: $el.find("state").first().text(),
      skills: $el.find("skills").first().text(),
      category: $el.find("category").first().text(),
      type: $el.find("type").first().text(),
      description: $el.find("description").first().text(),
      pubDate: $el.find("pubDate").first().text(),
    });
  });

  return items;
}

// =============================================
// MAIN
// =============================================

async function run() {
  console.log("\n==========================================");
  console.log("🚀 We Work Remotely Collector Started");
  console.log("==========================================\n");

  let items = [];
  try {
    items = await fetchFeedItems();
  } catch (err) {
    console.error(`❌ Failed to fetch WWR feed: ${err.message}`);
  }

  stats.fetched = items.length;
  console.log(`📥 ${items.length} jobs fetched`);

  const normalized = [];
  for (const item of items) {
    if (ALLOWED_COMPANIES.size) {
      const { company } = splitTitle(item.title);
      if (!ALLOWED_COMPANIES.has(company.trim().toLowerCase())) {
        stats.offAllowlist++;
        continue;
      }
    }

    console.log(`➡ ${item.title}`);

    const normalizedJob = await normalizeWeWorkRemotelyJob(item);
    if (isGigListing(normalizedJob)) {
      stats.gigListing = (stats.gigListing || 0) + 1;
      continue;
    }
    if (!isUsJob(normalizedJob)) {
      stats.nonUs++;
      continue;
    }
    normalized.push(normalizedJob);
    stats.processed++;
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
    .eq("source", "weworkremotely")
    .eq("is_active", true)
    .select("id", { count: "exact", head: true });

  if (deErr) {
    console.error(`⚠ Deactivation failed: ${deErr.message}`);
  } else {
    console.log(`🗑 Deactivated ${count ?? 0} stale jobs`);
  }

  console.log("\n==========================================");
  console.log("✅ We Work Remotely Collector Finished");
  console.log("==========================================");

  console.table(stats);

  console.log("==========================================\n");
}

run();
