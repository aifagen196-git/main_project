import axios from "axios";
import dotenv from "dotenv";
import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";
import { normalizeAvature } from "./normalize/normalizeAvature.js";
import companies from "./config/avatureCompanies.js";
import { isUsJob } from "./lib/isUsJob.js";

dotenv.config({ path: ".env" });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// =============================================
// CONFIG
// =============================================
// Avature has no shared discovery mechanism (every tenant is its own
// {slug}.avature.net site) AND, unlike every other ATS in this repo, no
// shared HTML template either -- each customer fully themes their portal,
// down to the class names on the job detail page. Koch's detail page uses
// a generic BEM framework (`article__content__view__field`); Trader Joe's
// uses bespoke classes (`jobDetailTable*`) that share nothing with Koch's.
// A single CSS-selector scraper can't cover both.
//
// So config entries carry a `template` key, and TEMPLATES below is a small
// registry of extractors, one per known layout. Adding a new tenant means
// first inspecting its JobDetail page and either matching it to an existing
// template or writing a new one -- there's no way to "just add a slug"
// here the way there is for Greenhouse/Lever/etc.

const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);
// Avature's per-page result count is a per-tenant site setting, not a fixed
// platform constant -- confirmed different between koch.avature.net (6/page)
// and traderjoes.avature.net (20/page). Advancing `jobOffset` by a hardcoded
// guess silently skips jobs whenever it doesn't match a tenant's real page
// size, so fetchAllListingUrls advances by however many links the current
// page actually returned instead.
const MAX_PAGES = Number(process.env.AVATURE_MAX_PAGES || 200);
const DETAIL_CONCURRENCY = Number(process.env.DETAIL_CONCURRENCY || 5);

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// =============================================
// DETAIL PAGE TEMPLATES
// =============================================

/**
 * "bem" -- Avature's own generic career-site framework. Confirmed on
 * koch.avature.net. The description is the last `.article__content__view__
 * field` block that has no `.article__content__view__field__label` child
 * (the labeled ones are the Location/Company/Job Number/etc. metadata rows
 * above it).
 */
function extractBem($) {
  const fields = $(".article__content__view__field");
  let location = "";
  let descriptionHtml = "";

  fields.each((_, el) => {
    const field = $(el);
    const label = field.find(".article__content__view__field__label").text().trim();
    const value = field.find(".article__content__view__field__value").text().trim();
    if (/location/i.test(label)) location = value;
    if (!label) descriptionHtml = field.html() || "";
  });

  return { location, descriptionHtml };
}

/**
 * "jobdetail-table" -- a bespoke table-based layout. Confirmed on
 * traderjoes.avature.net. Each field is its own `.jobDetailTable*` block
 * with the label baked into the text ("Location: ...").
 */
function extractJobDetailTable($) {
  const location = $(".jobDetailTableLocation")
    .text()
    .replace(/^\s*Location:?\s*/i, "")
    .trim();
  const descriptionHtml = $(".jobDetailDescription").html() || "";

  return { location, descriptionHtml };
}

const TEMPLATES = {
  bem: extractBem,
  "jobdetail-table": extractJobDetailTable,
};

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

async function fetchListingsPage(portalBase, jobOffset) {
  const { data: html } = await axios.get(`${portalBase}/SearchJobs`, {
    timeout: 20000,
    params: jobOffset ? { jobOffset } : {},
    headers: { "User-Agent": UA },
  });

  const $ = cheerio.load(html);
  const links = new Set();

  $('a[href*="/JobDetail/"]').each((_, el) => {
    const href = $(el).attr("href");
    // Avature also emits /JobDetail/ links inside share-button URLs
    // (LinkedIn/Facebook/mailto) -- only keep direct links to the page.
    if (href && !href.includes("shareUrl=") && !href.startsWith("mailto:")) {
      links.add(new URL(href, portalBase).toString());
    }
  });

  return [...links];
}

async function fetchAllListingUrls(portalBase) {
  const seen = new Set();
  let offset = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    const links = await fetchListingsPage(portalBase, offset);
    if (!links.length) break;

    let added = 0;
    for (const link of links) {
      if (!seen.has(link)) {
        seen.add(link);
        added++;
      }
    }
    if (!added) break;

    // Advance by however many links THIS page actually returned, not a
    // fixed guess -- the real per-tenant page size varies (see comment on
    // MAX_PAGES above).
    offset += links.length;
  }

  return [...seen];
}

// =============================================
// FETCH JOB DETAIL
// =============================================

async function fetchJobDetail(url, template) {
  try {
    const { data: html } = await axios.get(url, {
      timeout: 20000,
      headers: { "User-Agent": UA },
    });

    const $ = cheerio.load(html);
    const extract = TEMPLATES[template];
    if (!extract) {
      console.error(`❌ Unknown template "${template}" for ${url}`);
      return null;
    }

    const { location, descriptionHtml } = extract($);

    // og:title is emitted the same way on every Avature template observed
    // so far, unlike the in-page <h1> (Koch's is a generic site banner,
    // not the job title) -- prefer it over template-specific title markup.
    const title =
      $('meta[property="og:title"]').attr("content") || $("h1").first().text().trim();

    const idMatch = url.match(/\/(\d+)\/?(?:\?.*)?$/);

    return {
      title,
      location,
      descriptionHtml,
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
  console.log("🚀 Avature Collector Started");
  console.log("==========================================\n");

  for (const { company, portalBase, template } of companies) {
    try {
      stats.companies++;

      if (!TEMPLATES[template]) {
        console.error(
          `❌ ${company}: unknown template "${template}" -- skipping (add an extractor to TEMPLATES first)`,
        );
        continue;
      }

      const urls = await fetchAllListingUrls(portalBase);
      stats.fetched += urls.length;

      console.log(`\n🏢 ${company.toUpperCase()} (${urls.length} jobs)`);

      // SearchJobs only ever lists currently-open postings, so no
      // freshness pre-filter needed -- staleness handled below.
      const normalized = [];
      let idx = 0;
      await Promise.all(
        Array.from({ length: Math.min(DETAIL_CONCURRENCY, urls.length) }, async () => {
          while (idx < urls.length) {
            const url = urls[idx++];
            const detail = await fetchJobDetail(url, template);
            if (!detail) {
              stats.failed++;
              continue;
            }

            const normalizedJob = await normalizeAvature(detail, company, url);
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
    .eq("source", "avature")
    .eq("is_active", true)
    .select("id", { count: "exact", head: true });

  if (deErr) {
    console.error(`⚠ Deactivation failed: ${deErr.message}`);
  } else {
    console.log(`🗑 Deactivated ${count ?? 0} stale jobs`);
  }

  console.log("\n==========================================");
  console.log("✅ Avature Collector Finished");
  console.log("==========================================");

  console.table(stats);

  console.log("==========================================\n");
}

run();
