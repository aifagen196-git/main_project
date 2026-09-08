import axios from "axios";
import { withRunLog } from "./runLog.js";
import path from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizeJobvertise } from "./normalize/normalizeJobvertise.js";
import searches from "./config/jobvertiseSearches.js";
import US_STATES from "./config/usStates.js";
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
// Jobvertise (jobvertise.com) — a huge, old-school free job board ("Search
// over 1 Million jobs", ~78k added per week as of 2026-08-27). No key, no
// auth: /jobs/rss?query=... returns a plain RSS 2.0 feed per keyword search
// — far cleaner than scraping their table-based HTML. robots.txt (checked
// 2026-08-27) only disallows /rd — the RSS endpoint is open.
//
// The feed is US/Canada, and per-item country isn't broken out separately.
// Every item's title ends in "Job in {City}" (reliable, 100% of a live
// sample); the description SOMETIMES also repeats "({City}, {ST})" —
// that state, when present, is trusted directly. When it's absent, this
// defaults the location to "{City}, United States" UNLESS the description
// names Canada or a Canadian province, since the site's own branding
// ("USA and Canada Job Search") and a live sample skewed heavily US-side.
// This trades a handful of misclassified Canadian postings for not
// wrongly rejecting the ~50% of true US postings whose description never
// repeats the state.
const BASE_URL = "https://www.jobvertise.com/jobs/rss";

const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);
const REQUEST_DELAY_MS = Number(process.env.JOBVERTISE_REQUEST_DELAY_MS || 350);
const MAX_RESULTS_TOTAL = Number(process.env.JOBVERTISE_MAX_RESULTS || 0);
// The feed has no pagination param — the only way to pull more than the
// fixed ~15 items per keyword is to also vary Jobvertise's own `state=`
// filter, which returns a genuinely different, non-overlapping result set
// per state (confirmed live 2026-08-27). Off by default (opt-in via env)
// since it multiplies request volume by up to 51x — a full run across all
// keywords x all states is meant for a deliberate deep pull, not every
// scheduled run.
const USE_STATES = process.env.JOBVERTISE_BY_STATE === "1";

const ONLY_QUERIES = (process.env.ONLY_QUERIES || "")
  .split(",")
  .map((q) => q.trim().toLowerCase())
  .filter(Boolean);

const selectedSearches = ONLY_QUERIES.length
  ? searches.filter(({ keywords }) => ONLY_QUERIES.some((q) => keywords.toLowerCase().includes(q)))
  : searches;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

const CANADA_RE = /\bcanada\b|\b(ontario|quebec|british columbia|alberta|manitoba|saskatchewan|nova scotia|new brunswick)\b/i;
const CA_PROVINCE_ABBR_RE = /,\s*(ON|QC|BC|AB|MB|SK|NS|NB|NL|PE|YT|NT|NU)\b/;

// =============================================
// STATS
// =============================================

const stats = {
  searches: 0,
  fetched: 0,
  skippedDuplicate: 0,
  offDomain: 0,
  processed: 0,
  saved: 0,
  failed: 0,
  nonUs: 0,
};

// =============================================
// SAVE JOBS (with statement-timeout split/retry — see postjobfree.js)
// =============================================

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

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

function extractCompany(desc) {
  let m;
  if ((m = desc.match(/\bwith\s+([A-Z][A-Za-z0-9&,.'\s]{2,50}?)\s+in\s+[A-Z]/))) return m[1].trim();
  if ((m = desc.match(/;\s*([A-Z][A-Za-z0-9&,.'\s]{2,50}?)\s*;/))) return m[1].trim();
  if ((m = desc.match(/^[^-]{2,80}?-\s*([A-Z][A-Za-z0-9&,.'\s]{2,50}?)\.\s/))) return m[1].trim();
  return "";
}

function parseRssItems(xml) {
  const blocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
  return blocks.map((block) => {
    const get = (tag) => {
      const m = block.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`));
      return m ? m[1] : "";
    };
    const rawTitle = decodeEntities(get("title"));
    const link = get("link");
    let desc = decodeEntities(decodeEntities(get("description")))
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const pubDate = get("pubDate");

    const cityMatch = rawTitle.match(/^(.*)\s+Job in (.+)$/);
    const title = cityMatch ? cityMatch[1].trim() : rawTitle.trim();
    const city = cityMatch ? cityMatch[2].trim() : "";

    let location = "";
    if (city) {
      const stateRe = new RegExp(`${city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")},\\s*([A-Z]{2})\\b`);
      const stateMatch = desc.match(stateRe);
      if (stateMatch) {
        location = `${city}, ${stateMatch[1]}`;
      } else if (CANADA_RE.test(desc) || CA_PROVINCE_ABBR_RE.test(desc)) {
        location = `${city}, Canada`;
      } else {
        location = `${city}, United States`;
      }
    }

    const idMatch = link.match(/\/job\/(\d+)\.html/);
    const id = idMatch ? idMatch[1] : link;

    return {
      id,
      title,
      company: extractCompany(desc),
      location,
      description: desc,
      applyUrl: link,
      postedDate: pubDate ? new Date(pubDate).toISOString() : null,
    };
  });
}

async function fetchFeed(keywords, state = "") {
  const { data: xml } = await axios.get(BASE_URL, {
    timeout: 25000,
    params: { city: "", radius: "", query: keywords, state },
    headers: { "User-Agent": UA, Accept: "application/rss+xml,text/xml" },
  });

  return parseRssItems(String(xml));
}

// =============================================
// MAIN
// =============================================

async function run() {
  console.log("\n==========================================");
  console.log("🚀 Jobvertise Collector Started");
  console.log("==========================================\n");

  if (ONLY_QUERIES.length) {
    console.log(`⚙ ONLY_QUERIES active — ${selectedSearches.length} of ${searches.length} searches\n`);
  }
  if (USE_STATES) {
    console.log(`⚙ JOBVERTISE_BY_STATE=1 — fanning each keyword out across all ${US_STATES.length} states (up to ${selectedSearches.length * (US_STATES.length + 1)} requests)\n`);
  }

  const seen = new Set();
  const normalized = [];
  // "" (no state filter) plus every US state when fanning out — the
  // unfiltered feed is its own distinct result set, not a superset of the
  // per-state ones, so it's always included.
  const stateSweep = USE_STATES ? ["", ...US_STATES] : [""];

  outer: for (const { keywords } of selectedSearches) {
    stats.searches++;
    let keywordTotal = 0;

    for (const state of stateSweep) {
      let raws = [];
      try {
        raws = await fetchFeed(keywords, state);
      } catch (err) {
        console.error(`❌ "${keywords}"${state ? ` [${state}]` : ""} failed: ${err.response?.status || err.message}`);
        continue;
      }

      stats.fetched += raws.length;
      keywordTotal += raws.length;

      for (const raw of raws) {
        if (!raw.id || seen.has(raw.id)) {
          stats.skippedDuplicate++;
          continue;
        }
        seen.add(raw.id);

        if (!isDomainJob(raw.title)) {
          stats.offDomain++;
          continue;
        }

        const normalizedJob = await normalizeJobvertise(raw);
        if (!isUsJob(normalizedJob)) {
          stats.nonUs++;
          continue;
        }
        normalized.push(normalizedJob);
        stats.processed++;

        if (MAX_RESULTS_TOTAL && normalized.length >= MAX_RESULTS_TOTAL) {
          console.log(`\n⏸ Hit JOBVERTISE_MAX_RESULTS (${MAX_RESULTS_TOTAL}) — stopping here.`);
          break outer;
        }
      }

      await sleep(REQUEST_DELAY_MS);
    }

    console.log(`🔎 "${keywords}": ${keywordTotal} items across ${stateSweep.length} feed${stateSweep.length > 1 ? "s" : ""}`);
  }

  await saveJobs(normalized);
  console.log(`\n💾 saved ${stats.saved} / ${normalized.length}`);

  // =============================================
  // DEACTIVATE STALE JOBS
  // =============================================

  if (ONLY_QUERIES.length || MAX_RESULTS_TOTAL) {
    console.log("⏭ Skipping deactivation pass (partial run)");
  } else {
    const staleCutoff = new Date(Date.now() - SCRAPE_LAST_HOURS * 60 * 60 * 1000).toISOString();
    const { error: deErr, count } = await supabase
      .from("jobs")
      .update({ is_active: false })
      .lt("last_seen", staleCutoff)
      .eq("source", "jobvertise")
      .eq("is_active", true)
      .select("id", { count: "exact", head: true });
    if (deErr) console.error(`⚠ Deactivation pass failed: ${deErr.message}`);
    else console.log(`🗑 Deactivated ${count ?? 0} stale jobs`);
  }

  console.log("\n==========================================");
  console.log("✅ Jobvertise Collector Finished");
  console.log("==========================================");
  console.table(stats);
  console.log("==========================================\n");
}

// CLI-only guard — this file used to call run() unconditionally at
// import time, which meant `import()`-ing it for any reason (a test
// harness, a future registry, etc.) triggered a real scrape/save run as a
// side effect. Only run when invoked directly (node collectors/jobvertise.js),
// matching every other collector in this repo (see runtime.js).
const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(path.resolve(entrypoint)).href) {
  withRunLog("jobvertise", run);
}
