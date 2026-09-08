import axios from "axios";
import { withRunLog } from "./runLog.js";
import path from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizeHackernews } from "./normalize/normalizeHackernews.js";
import searches from "./config/hackernewsSearches.js";
import { isUsJob } from "./lib/isUsJob.js";

dotenv.config({ path: ".env" });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// =============================================
// CONFIG
// =============================================
//
// "Ask HN: Who is hiring?" — a single monthly thread on news.ycombinator.com
// where employers post directly as top-level comments. No key, no query
// param search: fetched via the Algolia HN Search API
// (hn.algolia.com/api/v1), which is Y Combinator's own public read API built
// specifically for indexing HN — not the raw site being scraped.
//
// Compliance path, checked before writing any code:
//   - news.ycombinator.com/robots.txt disallows a handful of action
//     endpoints (/vote?, /reply?, /login, ...) but nothing under /item or
//     the monthly "who is hiring" thread itself, and this collector never
//     touches news.ycombinator.com directly anyway.
//   - hn.algolia.com serves no robots.txt at all (404), which is the
//     "nothing restricted" default, and it's YC's own documented public API
//     (https://hn.algolia.com/api), not a third party's endpoint being
//     used against its owner's wishes.
//   - hacker-news.firebaseio.com (the raw item API some tools use instead)
//     actually DOES restrict itself — `Disallow: /` with only `*.json`
//     paths allowed — so Algolia's search API is used instead of that raw
//     API to fetch the thread itself, since it returns the full comment
//     tree with text in one call rather than one request per comment id
//     (the shape the raw API would force).
//
// Every top-level comment (not deleted/dead/empty) in the current month's
// thread is a real, individually-attributable job posting with its own
// permanent id — this is genuine per-posting data, not a listing/index page.

const REQUEST_DELAY_MS = Number(process.env.HACKERNEWS_REQUEST_DELAY_MS || 300);
const MAX_RESULTS_TOTAL = Number(process.env.HACKERNEWS_MAX_RESULTS || 0);

// The thread only rotates once a month, so a 24h staleness window (the
// default every other collector uses) would deactivate every row between
// runs. Default to 40 days so a normal daily/weekly cron keeps the current
// month's postings alive across the whole time they're the "current" thread,
// and the next month's fresh fetch naturally supersedes/deactivates the old
// one instead of the deactivation pass racing it.
const SCRAPE_LAST_HOURS = Number(process.env.HACKERNEWS_SCRAPE_LAST_HOURS || 24 * 40);

const ONLY_QUERIES = (process.env.ONLY_QUERIES || "")
  .split(",")
  .map((q) => q.trim().toLowerCase())
  .filter(Boolean);

const selectedKeywords = ONLY_QUERIES.length
  ? searches.filter(({ keyword }) => ONLY_QUERIES.some((q) => keyword.toLowerCase().includes(q)))
  : searches;

// =============================================
// STATS
// =============================================

const stats = {
  threadFound: 0,
  comments: 0,
  skippedEmpty: 0,
  skippedDuplicate: 0,
  skippedNoKeywordMatch: 0,
  processed: 0,
  saved: 0,
  failed: 0,
  nonUs: 0,
};

// =============================================
// SAVE JOBS
// =============================================

async function saveJobs(jobs) {
  if (!jobs.length) return;
  const CHUNK = Number(process.env.SAVE_CHUNK || 200);
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
// FETCH
// =============================================

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchLatestThreadId() {
  const { data } = await axios.get("https://hn.algolia.com/api/v1/search_by_date", {
    timeout: 20000,
    params: { tags: "story,author_whoishiring", hitsPerPage: 10 },
    headers: { "User-Agent": "Mozilla/5.0 (compatible; AIFAGenBot/1.0)" },
  });
  const hit = (data?.hits || []).find((h) => /^ask hn: who is hiring\?/i.test(h.title || ""));
  return hit || null;
}

async function fetchThread(id) {
  const { data } = await axios.get(`https://hn.algolia.com/api/v1/items/${id}`, {
    timeout: 30000,
    headers: { "User-Agent": "Mozilla/5.0 (compatible; AIFAGenBot/1.0)" },
  });
  return data?.children || [];
}

// =============================================
// MAIN
// =============================================

async function run() {
  console.log("\n==========================================");
  console.log("🚀 Hacker News \"Who is hiring?\" Collector Started");
  console.log("==========================================\n");

  if (ONLY_QUERIES.length) {
    console.log(`⚙ ONLY_QUERIES active — ${selectedKeywords.length} of ${searches.length} keyword filters\n`);
  }

  const thread = await fetchLatestThreadId();
  if (!thread) {
    console.error("❌ Could not find the current \"Who is hiring?\" thread — aborting.");
    process.exit(0);
  }
  stats.threadFound = 1;
  console.log(`🧵 "${thread.title}" (id ${thread.objectID}, posted ${thread.created_at})`);

  let children;
  try {
    children = await fetchThread(thread.objectID);
  } catch (err) {
    console.error(`❌ Failed to fetch thread: ${err.response?.status || err.message}`);
    process.exit(0);
  }
  stats.comments = children.length;
  console.log(`   ${children.length} top-level comments`);

  await sleep(REQUEST_DELAY_MS);

  const seen = new Set();
  const normalized = [];

  outer: for (const comment of children) {
    if (!comment || comment.text == null || !String(comment.text).trim()) {
      stats.skippedEmpty++;
      continue;
    }

    const id = String(comment.id);
    if (seen.has(id)) {
      stats.skippedDuplicate++;
      continue;
    }
    seen.add(id);

    if (selectedKeywords.length) {
      const haystack = String(comment.text).toLowerCase();
      const matches = selectedKeywords.some(({ keyword }) => haystack.includes(keyword.toLowerCase()));
      if (!matches) {
        stats.skippedNoKeywordMatch++;
        continue;
      }
    }

    const normalizedJob = await normalizeHackernews(comment);
    if (!isUsJob(normalizedJob)) {
      stats.nonUs++;
      continue;
    }
    normalized.push(normalizedJob);
    stats.processed++;

    if (MAX_RESULTS_TOTAL && normalized.length >= MAX_RESULTS_TOTAL) {
      console.log(`\n⏸ Hit HACKERNEWS_MAX_RESULTS (${MAX_RESULTS_TOTAL}) — stopping here.`);
      break outer;
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
      .eq("source", "hackernews")
      .eq("is_active", true)
      .select("id", { count: "exact", head: true });
    if (deErr) console.error(`⚠ Deactivation pass failed: ${deErr.message}`);
    else console.log(`🗑 Deactivated ${count ?? 0} stale jobs`);
  }

  console.log("\n==========================================");
  console.log("✅ Hacker News Collector Finished");
  console.log("==========================================");
  console.table(stats);
  console.log("==========================================\n");
}

// CLI-only guard — this file used to call run() unconditionally at
// import time, which meant `import()`-ing it for any reason (a test
// harness, a future registry, etc.) triggered a real scrape/save run as a
// side effect. Only run when invoked directly (node collectors/hackernews.js),
// matching every other collector in this repo (see runtime.js).
const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(path.resolve(entrypoint)).href) {
  withRunLog("hackernews", run);
}
