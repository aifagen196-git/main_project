import axios from "axios";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizeMuse } from "./normalize/normalizeMuse.js";
import categories from "./config/museCategories.js";
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
// The Muse public API (themuse.com/api/public/jobs) — no key required.
// Unauthenticated requests are capped at 500/hr; this collector's pacing
// (one request per page per category, with a delay between them) stays well
// under that even across the full category list. Registering for an
// optional api_key raises the cap to 3600/hr, but isn't needed at current
// scale -- see MUSE_API_KEY below if that ever changes.

const MUSE_API_KEY = process.env.MUSE_API_KEY || "";
const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);
const REQUEST_DELAY_MS = Number(process.env.MUSE_REQUEST_DELAY_MS || 500);
// The API paginates 20 results/page; this caps how many pages this
// collector will walk per category so one huge category can't starve the
// rest of the list.
const MAX_PAGES_PER_CATEGORY = Number(process.env.MUSE_MAX_PAGES || 5);

const ONLY_QUERIES = (process.env.ONLY_QUERIES || "")
  .split(",")
  .map((q) => q.trim().toLowerCase())
  .filter(Boolean);

const selectedCategories = ONLY_QUERIES.length
  ? categories.filter(({ category }) =>
      ONLY_QUERIES.some((q) => category.toLowerCase().includes(q)),
    )
  : categories;

const MAX_RESULTS_TOTAL = Number(process.env.MUSE_MAX_RESULTS || 0);

// =============================================
// STATS
// =============================================

const stats = {
  categories: 0,
  fetched: 0,
  skippedDuplicate: 0,
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

async function fetchPage(category, page) {
  const params = { page, location: "United States", category };
  if (MUSE_API_KEY) params.api_key = MUSE_API_KEY;

  const { data } = await axios.get("https://www.themuse.com/api/public/jobs", {
    timeout: 20000,
    params,
    headers: { "User-Agent": "Mozilla/5.0 (compatible; AIFAGenBot/1.0)" },
  });
  return {
    results: data?.results || [],
    pageCount: Number(data?.page_count) || 1,
  };
}

// =============================================
// MAIN
// =============================================

async function run() {
  console.log("\n==========================================");
  console.log("🚀 The Muse Collector Started");
  console.log("==========================================\n");

  if (ONLY_QUERIES.length) {
    console.log(
      `⚙ ONLY_QUERIES active — ${selectedCategories.length} of ${categories.length} categories\n`,
    );
  }

  const seen = new Set();
  const normalized = [];

  outer: for (const { category } of selectedCategories) {
    stats.categories++;
    console.log(`\n🔎 category="${category}"`);

    for (let page = 0; page < MAX_PAGES_PER_CATEGORY; page++) {
      let results, pageCount;
      try {
        ({ results, pageCount } = await fetchPage(category, page));
      } catch (err) {
        console.error(`❌ Fetch failed: ${err.response?.status || err.message}`);
        break;
      }

      if (!results.length) break;
      stats.fetched += results.length;

      for (const job of results) {
        const id = String(job.id);
        if (seen.has(id)) {
          stats.skippedDuplicate++;
          continue;
        }
        seen.add(id);

        const normalizedJob = await normalizeMuse(job);
        if (!isUsJob(normalizedJob)) {
          stats.nonUs++;
          continue;
        }
        normalized.push(normalizedJob);
        stats.processed++;

        if (MAX_RESULTS_TOTAL && normalized.length >= MAX_RESULTS_TOTAL) {
          console.log(`\n⏸ Hit MUSE_MAX_RESULTS (${MAX_RESULTS_TOTAL}) — stopping here.`);
          break outer;
        }
      }

      console.log(`   page ${page + 1}/${pageCount}: ${results.length} results`);
      if (page + 1 >= pageCount) break;
      await sleep(REQUEST_DELAY_MS);
    }

    await sleep(REQUEST_DELAY_MS);
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
      .eq("source", "muse")
      .eq("is_active", true)
      .select("id", { count: "exact", head: true });
    if (deErr) console.error(`⚠ Deactivation pass failed: ${deErr.message}`);
    else console.log(`🗑 Deactivated ${count ?? 0} stale jobs`);
  }

  console.log("\n==========================================");
  console.log("✅ The Muse Collector Finished");
  console.log("==========================================");
  console.table(stats);
  console.log("==========================================\n");
}

run();
