import axios from "axios";
import * as cheerio from "cheerio";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizePostjobfree } from "./normalize/normalizePostjobfree.js";
import searches from "./config/postjobfreeSearches.js";
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
// PostJobFree (postjobfree.com) — a free job board where employers/
// individuals post directly. No key, no auth, plain server-rendered HTML
// (each result is a `.snippetPadding` div with title/company/location/
// snippet/date all inline) — same shape as builtin.js, just parsing a
// different card layout.
//
// robots.txt (checked 2026-08-25) only disallows /a/, /n/, /api/,
// /apply-for-job/, /login?, and a few account/unsubscribe paths — the
// `/jobs?q=...&l=...` search path used here is open.
const BASE_URL = "https://www.postjobfree.com/jobs";
const LOCATION = process.env.POSTJOBFREE_LOCATION || "United States";

const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);
const MAX_PAGES_PER_SEARCH = Number(process.env.POSTJOBFREE_MAX_PAGES || 20);
const REQUEST_DELAY_MS = Number(process.env.POSTJOBFREE_REQUEST_DELAY_MS || 500);
const MAX_RESULTS_TOTAL = Number(process.env.POSTJOBFREE_MAX_RESULTS || 0);

const ONLY_QUERIES = (process.env.ONLY_QUERIES || "")
  .split(",")
  .map((q) => q.trim().toLowerCase())
  .filter(Boolean);

const selectedSearches = ONLY_QUERIES.length
  ? searches.filter(({ keywords }) => ONLY_QUERIES.some((q) => keywords.toLowerCase().includes(q)))
  : searches;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

// =============================================
// STATS
// =============================================

const stats = {
  searches: 0,
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
// nothing loss — 200 real jobs vanished in one run when a single chunk
// timed out and the error was just logged. On a timeout specifically (not
// any other error — a bad-data error would just fail again identically),
// halve the batch and retry each half, down to a floor, before giving up on
// whatever's left. Same fix as processors/saveJobs.js's upsertWithSplit.
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

// Listing dates are rendered as "Aug 25" (no year). Assume the current
// year; if that lands in the future (e.g. run in early January parsing a
// December posting), roll back a year.
function parsePostedDate(text) {
  const trimmed = (text || "").trim();
  if (!trimmed) return new Date().toISOString();

  const now = new Date();
  let candidate = new Date(`${trimmed} ${now.getFullYear()}`);
  if (Number.isNaN(candidate.getTime())) return new Date().toISOString();
  if (candidate.getTime() > now.getTime() + 24 * 60 * 60 * 1000) {
    candidate = new Date(`${trimmed} ${now.getFullYear() - 1}`);
  }
  return candidate.toISOString();
}

async function fetchPage(keywords, page) {
  const { data: html } = await axios.get(BASE_URL, {
    timeout: 25000,
    params: {
      q: keywords,
      l: LOCATION,
      ...(page > 1 ? { p: page } : {}),
    },
    headers: { "User-Agent": UA, Accept: "text/html" },
  });

  const $ = cheerio.load(html);
  const cards = $("div.snippetPadding");

  const jobs = [];
  cards.each((_, el) => {
    const card = $(el);
    const link = card.find('a[href*="/job/"]').first();
    const href = link.attr("href") || "";
    if (!href) return;

    const idMatch = href.match(/\/job\/([a-zA-Z0-9]+)\//);
    const id = idMatch ? idMatch[1] : href;

    const title = link.text().trim();
    const company = card.find(".colorCompany").first().text().trim();
    const location = card.find(".colorLocation").first().text().trim();
    const snippet = card.find(".jdSnippet").first().text().trim();
    const dateText = card.find(".colorDate").first().text().trim();

    if (!title) return;

    jobs.push({
      id,
      title,
      company,
      location,
      snippet,
      applyUrl: href.startsWith("http") ? href : `https://www.postjobfree.com${href}`,
      postedDate: parsePostedDate(dateText),
    });
  });

  return jobs;
}

// =============================================
// MAIN
// =============================================

async function run() {
  console.log("\n==========================================");
  console.log("🚀 PostJobFree Collector Started");
  console.log("==========================================\n");

  if (ONLY_QUERIES.length) {
    console.log(`⚙ ONLY_QUERIES active — ${selectedSearches.length} of ${searches.length} searches\n`);
  }

  const seen = new Set();
  const normalized = [];

  outer: for (const { keywords } of selectedSearches) {
    stats.searches++;
    console.log(`\n🔎 "${keywords}"`);

    for (let page = 1; page <= MAX_PAGES_PER_SEARCH; page++) {
      let raws = [];
      try {
        raws = await fetchPage(keywords, page);
        stats.pagesFetched++;
      } catch (err) {
        console.error(`❌ Page ${page} failed: ${err.response?.status || err.message}`);
        break;
      }

      stats.fetched += raws.length;
      console.log(`   page ${page}: ${raws.length} results`);

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

        const normalizedJob = await normalizePostjobfree(raw);
        if (!isUsJob(normalizedJob)) {
          stats.nonUs++;
          continue;
        }
        normalized.push(normalizedJob);
        stats.processed++;

        if (MAX_RESULTS_TOTAL && normalized.length >= MAX_RESULTS_TOTAL) {
          console.log(`\n⏸ Hit POSTJOBFREE_MAX_RESULTS (${MAX_RESULTS_TOTAL}) — stopping here.`);
          break outer;
        }
      }

      if (!sawNew) break; // pagination looped back to earlier content
      await sleep(REQUEST_DELAY_MS);
    }
  }

  await saveJobs(normalized);
  console.log(`\n💾 saved ${stats.saved} / ${normalized.length}`);

  // =============================================
  // DEACTIVATE STALE JOBS
  // =============================================

  if (ONLY_QUERIES.length || MAX_RESULTS_TOTAL) {
    console.log("⏭ Skipping deactivation pass (partial run — rows carry no per-query column to scope it safely)");
  } else {
    const staleCutoff = new Date(Date.now() - SCRAPE_LAST_HOURS * 60 * 60 * 1000).toISOString();
    const { error: deErr, count } = await supabase
      .from("jobs")
      .update({ is_active: false })
      .lt("last_seen", staleCutoff)
      .eq("source", "postjobfree")
      .eq("is_active", true)
      .select("id", { count: "exact", head: true });
    if (deErr) console.error(`⚠ Deactivation pass failed: ${deErr.message}`);
    else console.log(`🗑 Deactivated ${count ?? 0} stale jobs`);
  }

  console.log("\n==========================================");
  console.log("✅ PostJobFree Collector Finished");
  console.log("==========================================");
  console.table(stats);
  console.log("==========================================\n");
}

run();
