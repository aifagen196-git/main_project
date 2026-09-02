import axios from "axios";
import path from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";
import { normalizeSuccessfactors } from "./normalize/normalizeSuccessfactors.js";
import companies from "./config/successfactorsCompanies.js";
import { isUsJob } from "./lib/isUsJob.js";

dotenv.config({ path: ".env" });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// =============================================
// CONFIG
// =============================================
// SAP SuccessFactors Recruiting Career Site Builder (CSB) is self-hosted per
// customer with no shared discovery mechanism -- config entries are a base
// URL (e.g. https://jobs.sap.com) plus a `search` path, since some tenants
// use "/search/" and others customise it. Job listing pages are plain
// server-rendered HTML (no client-side JS needed), paginated via a
// `startrow` query param, 25 results per page on every CSB site observed.

const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);
// 25 results/page is confirmed for jobs.sap.com, but CSB's page size is a
// per-tenant site setting (same situation as Avature -- see avature.js),
// so fetchAllListingUrls advances `startrow` by the actual link count
// returned rather than trusting this to hold for every future tenant.
const MAX_PAGES = Number(process.env.SUCCESSFACTORS_MAX_PAGES || 200);
const DETAIL_CONCURRENCY = Number(process.env.DETAIL_CONCURRENCY || 6);

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// =============================================
// STATS
// =============================================

const stats = {
  companies: 0,
  fetched: 0,
  skipped: 0,
  processed: 0,
  saved: 0,
  failed: 0,
  nonUs: 0,
};

// =============================================
// SAVE JOB
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
// FETCH JOB LINKS
// =============================================

async function fetchListingsPage(baseUrl, startrow) {
  const { data: html } = await axios.get(`${baseUrl}/search/`, {
    timeout: 20000,
    params: { q: "", startrow },
    headers: { "User-Agent": UA },
  });

  const $ = cheerio.load(html);
  const links = new Set();

  $('a[href^="/job/"]').each((_, el) => {
    const href = $(el).attr("href");
    if (href) links.add(new URL(href, baseUrl).toString());
  });

  return [...links];
}

async function fetchAllListingUrls(baseUrl) {
  const seen = new Set();
  let startrow = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    const links = await fetchListingsPage(baseUrl, startrow);
    if (!links.length) break;

    let added = 0;
    for (const link of links) {
      if (!seen.has(link)) {
        seen.add(link);
        added++;
      }
    }
    // Same guard as icims.js: stop if a page adds nothing new instead of
    // relying on a total-count field this HTML doesn't reliably expose.
    if (!added) break;

    startrow += links.length;
  }

  return [...seen];
}

// =============================================
// FETCH JOB DETAIL (microdata)
// =============================================

/**
 * CSB detail pages don't use JSON-LD -- the JobPosting is marked up with
 * schema.org microdata directly in the HTML (itemprop attributes on <meta>
 * and <span> tags), so cheerio reads those instead of parsing embedded JSON.
 */
async function fetchJobDetail(url) {
  try {
    const { data: html } = await axios.get(url, {
      timeout: 20000,
      headers: { "User-Agent": UA },
    });

    const $ = cheerio.load(html);
    const meta = (sel) => {
      const el = $(sel).first();
      return el.attr("content") || el.text().trim();
    };

    const idMatch = url.match(/\/(\d+)\/?$/);

    return {
      title: meta("[itemprop=title]"),
      descriptionHtml: $("[itemprop=description]").first().html() || "",
      locality: meta("[itemprop=addressLocality]"),
      region: meta("[itemprop=addressRegion]"),
      country: meta("[itemprop=addressCountry]"),
      datePosted: meta("[itemprop=datePosted]"),
      jobId: idMatch ? idMatch[1] : url,
    };
  } catch (err) {
    console.error(`❌ Failed details for ${url}`);
    return null;
  }
}

// =============================================
// MAIN
// =============================================

async function run() {
  console.log("\n==========================================");
  console.log("🚀 SAP SuccessFactors Collector Started");
  console.log("==========================================\n");

  for (const { company, baseUrl } of companies) {
    try {
      stats.companies++;

      const urls = await fetchAllListingUrls(baseUrl);
      stats.fetched += urls.length;

      console.log(`\n🏢 ${company.toUpperCase()} (${urls.length} jobs)`);

      // CSB search results only ever list currently-open postings, so no
      // freshness pre-filter needed -- staleness handled below.
      const normalized = [];
      let idx = 0;
      await Promise.all(
        Array.from({ length: Math.min(DETAIL_CONCURRENCY, urls.length) }, async () => {
          while (idx < urls.length) {
            const url = urls[idx++];
            const detail = await fetchJobDetail(url);
            if (!detail) {
              stats.failed++;
              continue;
            }

            const normalizedJob = await normalizeSuccessfactors(detail, company, url);
            if (!isUsJob(normalizedJob)) {
              stats.nonUs++;
              continue;
            }
            normalized.push(normalizedJob);
            stats.processed++;
          }
        }),
      );

      await saveJobs(normalized);
      if (normalized.length) console.log(`   💾 saved ${normalized.length}`);
    } catch (err) {
      console.error(`\n❌ Company failed: ${company}`);
      console.error(err.message);
    }
  }

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
    .eq("source", "successfactors")
    .eq("is_active", true)
    .select("id", { count: "exact", head: true });

  if (deErr) {
    console.error(`⚠ Deactivation failed: ${deErr.message}`);
  } else {
    console.log(`🗑 Deactivated ${count ?? 0} stale jobs`);
  }

  console.log("\n==========================================");
  console.log("✅ SAP SuccessFactors Collector Finished");
  console.log("==========================================");

  console.table(stats);

  console.log("==========================================\n");
}

// CLI-only guard — this file used to call run() unconditionally at
// import time, which meant `import()`-ing it for any reason (a test
// harness, a future registry, etc.) triggered a real scrape/save run as a
// side effect. Only run when invoked directly (node collectors/successfactors.js),
// matching every other collector in this repo (see runtime.js).
const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(path.resolve(entrypoint)).href) {
  run();
}
