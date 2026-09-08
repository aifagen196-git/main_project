import axios from "axios";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizeJobright } from "./normalize/normalizeJobright.js";
import categories from "./config/jobrightCategories.js";
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
// jobright.ai — no key, no auth. Its own query-string search (?position=,
// ?keyword=, ?location=) doesn't actually filter anything (confirmed
// 2026-08-26: three different param names all returned the identical
// generic "visitor" feed), so this instead walks the ~380 pre-built
// category landing pages listed in categories config (discovered via
// https://jobright.ai/sitemap-taxonomy*.xml). Each one server-renders its
// own real, correctly-scoped job list in __NEXT_DATA__ — no login wall,
// robots.txt explicitly allows `/jobs/*`.
//
// Two different NEXT_DATA shapes have been observed across category pages:
// some use props.pageProps.jobList directly, others (the /remote-jobs/*
// pages, not currently in this config) nest results one level deeper under
// props.pageProps.defaultData. This collector only walks the jobList shape,
// matching every URL actually listed in jobrightCategories.js.
const BASE_URL = "https://jobright.ai";

const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);
const REQUEST_DELAY_MS = Number(process.env.JOBRIGHT_REQUEST_DELAY_MS || 400);
const MAX_RESULTS_TOTAL = Number(process.env.JOBRIGHT_MAX_RESULTS || 0);
const MAX_CATEGORIES = Number(process.env.JOBRIGHT_MAX_CATEGORIES || 0);

const ONLY_QUERIES = (process.env.ONLY_QUERIES || "")
  .split(",")
  .map((q) => q.trim().toLowerCase())
  .filter(Boolean);

let selectedCategories = ONLY_QUERIES.length
  ? categories.filter(({ path }) => ONLY_QUERIES.some((q) => path.toLowerCase().includes(q)))
  : categories;
if (MAX_CATEGORIES) selectedCategories = selectedCategories.slice(0, MAX_CATEGORIES);

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

// =============================================
// STATS
// =============================================

const stats = {
  categoriesFetched: 0,
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

function extractNextData(html) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

async function fetchCategory(path) {
  const { data: html } = await axios.get(`${BASE_URL}${path}`, {
    timeout: 25000,
    headers: { "User-Agent": UA, Accept: "text/html" },
  });

  const nextData = extractNextData(html);
  const props = nextData?.props?.pageProps;

  // Two shapes observed: /jobs/* category pages expose pageProps.jobList
  // directly; /remote-jobs/* pages nest the same entries one level deeper
  // under pageProps.defaultData (an object keyed "0".."29", not an array).
  const entries = Array.isArray(props?.jobList)
    ? props.jobList
    : props?.defaultData && typeof props.defaultData === "object"
      ? Object.values(props.defaultData)
      : [];

  return entries.map((entry) => entry?.jobResult).filter(Boolean);
}

// =============================================
// MAIN
// =============================================

async function run() {
  console.log("\n==========================================");
  console.log("🚀 Jobright Collector Started");
  console.log("==========================================\n");

  if (ONLY_QUERIES.length) {
    console.log(`⚙ ONLY_QUERIES active — ${selectedCategories.length} of ${categories.length} categories\n`);
  }
  if (MAX_CATEGORIES) {
    console.log(`⚙ JOBRIGHT_MAX_CATEGORIES active — capped to ${selectedCategories.length} categories\n`);
  }

  const seen = new Set();
  const normalized = [];

  outer: for (const { path } of selectedCategories) {
    let raws = [];
    try {
      raws = await fetchCategory(path);
      stats.categoriesFetched++;
    } catch (err) {
      console.error(`❌ ${path} failed: ${err.response?.status || err.message}`);
      continue;
    }

    stats.fetched += raws.length;
    console.log(`   ${path}: ${raws.length} jobs`);

    for (const raw of raws) {
      if (!raw.jobId || seen.has(raw.jobId)) {
        stats.skippedDuplicate++;
        continue;
      }
      seen.add(raw.jobId);

      if (!isDomainJob(raw.jobTitle)) {
        stats.offDomain++;
        continue;
      }

      const normalizedJob = await normalizeJobright(raw);
      if (!isUsJob(normalizedJob)) {
        stats.nonUs++;
        continue;
      }
      normalized.push(normalizedJob);
      stats.processed++;

      if (MAX_RESULTS_TOTAL && normalized.length >= MAX_RESULTS_TOTAL) {
        console.log(`\n⏸ Hit JOBRIGHT_MAX_RESULTS (${MAX_RESULTS_TOTAL}) — stopping here.`);
        break outer;
      }
    }

    await sleep(REQUEST_DELAY_MS);
  }

  await saveJobs(normalized);
  console.log(`\n💾 saved ${stats.saved} / ${normalized.length}`);

  // =============================================
  // DEACTIVATE STALE JOBS
  // =============================================

  if (ONLY_QUERIES.length || MAX_RESULTS_TOTAL || MAX_CATEGORIES) {
    console.log("⏭ Skipping deactivation pass (partial run)");
  } else {
    const staleCutoff = new Date(Date.now() - SCRAPE_LAST_HOURS * 60 * 60 * 1000).toISOString();
    const { error: deErr, count } = await supabase
      .from("jobs")
      .update({ is_active: false })
      .lt("last_seen", staleCutoff)
      .eq("source", "jobright")
      .eq("is_active", true)
      .select("id", { count: "exact", head: true });
    if (deErr) console.error(`⚠ Deactivation pass failed: ${deErr.message}`);
    else console.log(`🗑 Deactivated ${count ?? 0} stale jobs`);
  }

  console.log("\n==========================================");
  console.log("✅ Jobright Collector Finished");
  console.log("==========================================");
  console.table(stats);
  console.log("==========================================\n");
}

run();
