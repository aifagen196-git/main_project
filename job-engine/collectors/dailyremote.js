import axios from "axios";
import * as cheerio from "cheerio";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizeDailyremote } from "./normalize/normalizeDailyremote.js";
import { isUsJob } from "./lib/isUsJob.js";
import { isDomainJob } from "./lib/isDomainJob.js";

dotenv.config({ path: ".env" });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// =============================================
// CONFIG
// =============================================
//
// DailyRemote (dailyremote.com) — a remote-jobs board, no key/auth. Plain
// server-rendered HTML (`.lst-card__content` cards with title/company/
// location/tags all inline) walked via `?page=N` — same shape as
// builtin.js, just a different card layout. robots.txt (checked
// 2026-08-26) only disallows /apply/ — the `/remote-jobs` feed is open.
//
// Every listing here is remote-anywhere or remote-in-a-region by
// definition, most non-US (Worldwide/Canada/India/EU) — same caveat as
// workingnomads.js/arbeitnow.js: isUsJob (plus normalizeDailyremote's
// title-fallback for vague region pills) is what keeps this useful.
const BASE_URL = "https://dailyremote.com/remote-jobs";

const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);
const MAX_PAGES = Number(process.env.DAILYREMOTE_MAX_PAGES || 60);
const REQUEST_DELAY_MS = Number(process.env.DAILYREMOTE_REQUEST_DELAY_MS || 500);
const MAX_RESULTS_TOTAL = Number(process.env.DAILYREMOTE_MAX_RESULTS || 0);

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

// =============================================
// STATS
// =============================================

const stats = {
  pagesFetched: 0,
  fetched: 0,
  skippedDuplicate: 0,
  offDomain: 0,
  processed: 0,
  saved: 0,
  failed: 0,
  nonUs: 0,
};

// =============================================
// SAVE JOBS
// =============================================

// A batch that trips Postgres' statement_timeout used to be an all-or-
// nothing loss. On a timeout specifically (not any other error — a bad-data
// error would just fail again identically), halve the batch and retry each
// half, down to a floor, before giving up on whatever's left. Same fix as
// processors/saveJobs.js's upsertWithSplit.
const MIN_SPLIT_SIZE = Number(process.env.SAVE_MIN_SPLIT || 10);

function isStatementTimeout(error) {
  return /statement timeout/i.test(error?.message || "");
}

async function upsertWithSplit(batch) {
  const { error } = await supabase
    .from("jobs")
    .upsert(batch, { onConflict: "source,source_job_id" });

  if (!error) {
    stats.saved += batch.length;
    return;
  }

  if (isStatementTimeout(error) && batch.length > MIN_SPLIT_SIZE) {
    const mid = Math.ceil(batch.length / 2);
    console.log(`   ⏳ batch of ${batch.length} timed out — splitting into ${mid}/${batch.length - mid} and retrying`);
    await upsertWithSplit(batch.slice(0, mid));
    await upsertWithSplit(batch.slice(mid));
    return;
  }

  stats.failed += batch.length;
  console.error(`❌ batch of ${batch.length} failed: ${error.message}`);
}

async function saveJobs(jobs) {
  if (!jobs.length) return;
  const CHUNK = Number(process.env.SAVE_CHUNK || 200);
  for (let i = 0; i < jobs.length; i += CHUNK) {
    await upsertWithSplit(jobs.slice(i, i + CHUNK));
  }
}

// =============================================
// FETCH + PARSE
// =============================================

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(page) {
  const { data: html } = await axios.get(BASE_URL, {
    timeout: 25000,
    params: page > 1 ? { page } : undefined,
    headers: { "User-Agent": UA, Accept: "text/html" },
  });

  const $ = cheerio.load(html);
  const cards = $(".lst-card__content");

  const jobs = [];
  cards.each((_, el) => {
    const card = $(el);
    const link = card.find('a[href*="/remote-job/"]').first();
    const href = link.attr("href") || "";
    if (!href) return;

    const idMatch = href.match(/-(\d+)$/);
    const id = idMatch ? idMatch[1] : href;

    const title = link.text().trim();
    const company = card.find(".lst-card__company").first().text().trim();

    const pills = card
      .find(".lst-card__meta .lst-pill span")
      .map((__, s) => $(s).text().trim())
      .get()
      .filter(Boolean);
    const location = pills[0] || "";
    const salary = pills.find((p) => /\$|per year|per hour|k\s*-\s*\d/i.test(p)) || null;

    const bylineSpans = card
      .find(".lst-card__byline span")
      .map((__, s) => $(s).text().trim())
      .get()
      .filter((t) => t && t !== "·");
    const employmentType = bylineSpans.find((t) => /full time|part time|contract|freelance/i.test(t)) || "";

    const tags = card
      .find(".lst-card__tags a.lst-tag")
      .map((__, t) => $(t).text().trim())
      .get()
      .filter(Boolean);

    if (!title) return;

    jobs.push({
      id,
      title,
      company,
      location,
      salary,
      employmentType,
      tags,
      applyUrl: href.startsWith("http") ? href : `https://dailyremote.com${href}`,
    });
  });

  return jobs;
}

// =============================================
// MAIN
// =============================================

async function run() {
  console.log("\n==========================================");
  console.log("🚀 DailyRemote Collector Started");
  console.log("==========================================\n");

  const seen = new Set();
  const normalized = [];

  outer: for (let page = 1; page <= MAX_PAGES; page++) {
    let raws = [];
    try {
      raws = await fetchPage(page);
      stats.pagesFetched++;
    } catch (err) {
      console.error(`❌ Page ${page} failed: ${err.response?.status || err.message}`);
      break;
    }

    stats.fetched += raws.length;
    console.log(`   page ${page}: ${raws.length} cards`);

    if (!raws.length) break; // ran out of pages

    let sawNew = false;
    for (const raw of raws) {
      if (seen.has(raw.id)) {
        stats.skippedDuplicate++;
        continue;
      }
      seen.add(raw.id);
      sawNew = true;

      if (!isDomainJob(raw.title)) {
        stats.offDomain++;
        continue;
      }

      const normalizedJob = await normalizeDailyremote(raw);
      if (!isUsJob(normalizedJob)) {
        stats.nonUs++;
        continue;
      }
      normalized.push(normalizedJob);
      stats.processed++;

      if (MAX_RESULTS_TOTAL && normalized.length >= MAX_RESULTS_TOTAL) {
        console.log(`\n⏸ Hit DAILYREMOTE_MAX_RESULTS (${MAX_RESULTS_TOTAL}) — stopping here.`);
        break outer;
      }
    }

    if (!sawNew) break; // pagination looped back to earlier content
    await sleep(REQUEST_DELAY_MS);
  }

  await saveJobs(normalized);
  console.log(`\n💾 saved ${stats.saved} / ${normalized.length}`);

  // =============================================
  // DEACTIVATE STALE JOBS
  // =============================================

  if (MAX_RESULTS_TOTAL) {
    console.log("⏭ Skipping deactivation pass (partial run)");
  } else {
    const staleCutoff = new Date(Date.now() - SCRAPE_LAST_HOURS * 60 * 60 * 1000).toISOString();
    const { error: deErr, count } = await supabase
      .from("jobs")
      .update({ is_active: false })
      .lt("last_seen", staleCutoff)
      .eq("source", "dailyremote")
      .eq("is_active", true)
      .select("id", { count: "exact", head: true });
    if (deErr) console.error(`⚠ Deactivation pass failed: ${deErr.message}`);
    else console.log(`🗑 Deactivated ${count ?? 0} stale jobs`);
  }

  console.log("\n==========================================");
  console.log("✅ DailyRemote Collector Finished");
  console.log("==========================================");
  console.table(stats);
  console.log("==========================================\n");
}

run();
