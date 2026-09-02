import axios from "axios";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as cheerio from "cheerio";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizeWeb3career } from "./normalize/normalizeWeb3career.js";
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
// web3.career — a crypto/blockchain/web3 jobs board, no key/auth. Plain
// server-rendered HTML (each listing is a `<tr>` with a `.job-title-mobile`
// cell) walked via `?page=N`. robots.txt (checked 2026-08-26) only
// disallows /metrics* — the homepage/paginated feed is open.
//
// Most listings here are remote-anywhere/global (crypto industry skews
// distributed), same caveat as workingnomads.js/arbeitnow.js — isUsJob is
// what keeps this useful, and a bare "Remote" location with no country
// qualifier is deliberately left un-flagged as US in the normalizer rather
// than guessed.
const BASE_URL = "https://web3.career/";

const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);
const MAX_PAGES = Number(process.env.WEB3CAREER_MAX_PAGES || 40);
const REQUEST_DELAY_MS = Number(process.env.WEB3CAREER_REQUEST_DELAY_MS || 500);
const MAX_RESULTS_TOTAL = Number(process.env.WEB3CAREER_MAX_RESULTS || 0);

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
  const rows = $("tr").filter((_, el) => $(el).find(".job-title-mobile").length > 0);

  const jobs = [];
  rows.each((_, el) => {
    const row = $(el);
    const link = row.find("a[href]").first();
    const href = link.attr("href") || "";
    if (!href) return;

    const idMatch = href.match(/\/(\d+)$/);
    const id = idMatch ? idMatch[1] : href;

    const title = row.find("h2").first().text().trim();
    const company = row.find("h3").first().text().trim();
    const location = row
      .find(".job-location-mobile")
      .text()
      .replace(/📍/g, "")
      .trim();
    const salary = row.find(".cell-salary").text().trim() || null;
    const tags = row
      .find(".my-badge a")
      .map((__, t) => $(t).text().trim())
      .get()
      .filter(Boolean);
    const postedIso = row.find("time[datetime]").attr("datetime") || "";

    if (!title) return;

    jobs.push({
      id,
      title,
      company,
      location,
      salary,
      tags,
      postedDate: postedIso ? new Date(postedIso).toISOString() : null,
      applyUrl: href.startsWith("http") ? href : `https://web3.career${href}`,
    });
  });

  return jobs;
}

// =============================================
// MAIN
// =============================================

async function run() {
  console.log("\n==========================================");
  console.log("🚀 Web3.career Collector Started");
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

      const normalizedJob = await normalizeWeb3career(raw);
      if (!isUsJob(normalizedJob)) {
        stats.nonUs++;
        continue;
      }
      normalized.push(normalizedJob);
      stats.processed++;

      if (MAX_RESULTS_TOTAL && normalized.length >= MAX_RESULTS_TOTAL) {
        console.log(`\n⏸ Hit WEB3CAREER_MAX_RESULTS (${MAX_RESULTS_TOTAL}) — stopping here.`);
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
      .eq("source", "web3career")
      .eq("is_active", true)
      .select("id", { count: "exact", head: true });
    if (deErr) console.error(`⚠ Deactivation pass failed: ${deErr.message}`);
    else console.log(`🗑 Deactivated ${count ?? 0} stale jobs`);
  }

  console.log("\n==========================================");
  console.log("✅ Web3.career Collector Finished");
  console.log("==========================================");
  console.table(stats);
  console.log("==========================================\n");
}

// CLI-only guard — this file used to call run() unconditionally at
// import time, which meant `import()`-ing it for any reason (a test
// harness, a future registry, etc.) triggered a real scrape/save run as a
// side effect. Only run when invoked directly (node collectors/web3career.js),
// matching every other collector in this repo (see runtime.js).
const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(path.resolve(entrypoint)).href) {
  run();
}
