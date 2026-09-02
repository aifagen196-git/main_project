import axios from "axios";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as cheerio from "cheerio";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizeBuiltinJob } from "./normalize/normalizeBuiltin.js";
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
// BuiltIn (builtin.com) — no key, no registration, no JSON API. It's a
// US-only tech/startup jobs board with plain server-rendered HTML (Drupal,
// not a JS SPA), so a GET + cheerio pass is enough — same shape as
// weworkremotely.js's RSS scrape, just parsing HTML cards instead of an XML
// feed.
//
// robots.txt (checked 2026-08-21) disallows `/jobs*?search=` and several
// city/industry filter suffixes on `/jobs`, but leaves the plain paginated
// feed (`/jobs?page=N`) and job detail pages (`/job/*`) open — so this
// collector only walks that plain feed rather than querying by keyword.
const BASE_URL = "https://builtin.com/jobs";

const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);
// The plain feed holds up well past page 1000 (still returning cards, just
// thinner ones as pagination drifts) — 200 pages is a bulk-volume default.
// Override via BUILTIN_MAX_PAGES for a smaller/larger run.
const MAX_PAGES = Number(process.env.BUILTIN_MAX_PAGES || 200);
const REQUEST_DELAY_MS = Number(process.env.BUILTIN_REQUEST_DELAY_MS || 500);
const MAX_RESULTS_TOTAL = Number(process.env.BUILTIN_MAX_RESULTS || 0);

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

// =============================================
// STATS
// =============================================

const stats = {
  pagesFetched: 0,
  fetched: 0,
  skippedDuplicate: 0,
  processed: 0,
  saved: 0,
  failed: 0,
  nonUs: 0,
  offDomain: 0,
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
// FETCH + PARSE
// =============================================

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function textAfterIcon($, card, iconClass) {
  const icon = card.find(`i.${iconClass}`).first();
  if (!icon.length) return "";
  return icon.closest("div").next("span, div").text().trim();
}

async function fetchPage(page) {
  const { data: html } = await axios.get(BASE_URL, {
    timeout: 25000,
    params: page > 1 ? { page } : undefined,
    headers: { "User-Agent": UA, Accept: "text/html" },
  });

  const $ = cheerio.load(html);
  const cards = $('div[data-id="job-card"]');

  const jobs = [];
  cards.each((_, el) => {
    const card = $(el);
    const idAttr = card.attr("id") || "";
    const id = idAttr.replace("job-card-", "");
    if (!id) return;

    const titleEl = card.find('[data-id="job-card-title"]').first();
    const title = titleEl.text().trim();
    const href = titleEl.attr("data-alias") || titleEl.attr("href") || "";

    const company = card.find('[data-id="company-title"] span').first().text().trim();

    const workplaceType = textAfterIcon($, card, "fa-house-building");
    const location = textAfterIcon($, card, "fa-location-dot");
    const salary = textAfterIcon($, card, "fa-sack-dollar");
    const seniority = textAfterIcon($, card, "fa-trophy");

    const dropData = $(`#drop-data-${id}`);
    const category = dropData.find(".mb-md.fs-xs.fw-bold").first().text().trim();
    const summary = dropData.find(".fs-sm.fw-regular.mb-md.text-gray-04").first().text().trim();
    const skills = dropData
      .find("span.fs-xs.text-gray-04.mx-sm")
      .map((__, s) => $(s).text().trim())
      .get()
      .filter(Boolean);

    if (!title || !href) return;

    jobs.push({
      id,
      title,
      company,
      applyUrl: href.startsWith("http") ? href : `https://builtin.com${href}`,
      workplaceType,
      location,
      salary: /\d/.test(salary) ? salary : null,
      seniority,
      category,
      summary,
      skills,
    });
  });

  return jobs;
}

// =============================================
// MAIN
// =============================================

async function run() {
  console.log("\n==========================================");
  console.log("🚀 BuiltIn Collector Started");
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

      const normalizedJob = await normalizeBuiltinJob(raw);
      if (!isUsJob(normalizedJob)) {
        stats.nonUs++;
        continue;
      }
      normalized.push(normalizedJob);
      stats.processed++;

      if (MAX_RESULTS_TOTAL && normalized.length >= MAX_RESULTS_TOTAL) {
        console.log(`\n⏸ Hit BUILTIN_MAX_RESULTS (${MAX_RESULTS_TOTAL}) — stopping here.`);
        break outer;
      }
    }

    if (!sawNew) break; // pagination looped back to page 1's content
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
      .eq("source", "builtin")
      .eq("is_active", true)
      .select("id", { count: "exact", head: true });
    if (deErr) console.error(`⚠ Deactivation pass failed: ${deErr.message}`);
    else console.log(`🗑 Deactivated ${count ?? 0} stale jobs`);
  }

  console.log("\n==========================================");
  console.log("✅ BuiltIn Collector Finished");
  console.log("==========================================");
  console.table(stats);
  console.log("==========================================\n");
}

// CLI-only guard — this file used to call run() unconditionally at
// import time, which meant `import()`-ing it for any reason (a test
// harness, a future registry, etc.) triggered a real scrape/save run as a
// side effect. Only run when invoked directly (node collectors/builtin.js),
// matching every other collector in this repo (see runtime.js).
const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(path.resolve(entrypoint)).href) {
  run();
}
