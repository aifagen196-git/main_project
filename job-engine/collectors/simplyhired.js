// collectors/simplyhired.js
//
// Direct scrape, no third-party service, no per-result cost — this replaces
// an earlier Apify-actor-based version (still in git history) after finding
// live that SimplyHired doesn't actually need a paid scraper:
//
//   - A plain HTTP GET (same approach every free collector here uses) gets a
//     Cloudflare "Just a moment..." challenge page — verified live.
//   - A REAL BROWSER (Playwright) gets through that challenge automatically
//     and lands on a normal page with a clean, structured __NEXT_DATA__
//     JSON blob containing the actual search results — verified live, same
//     general pattern collectors/indeed.js already uses for Indeed's own
//     embedded JSON (see mosaicData.js), just under a different script tag
//     name and reached by a different unlock mechanism (browser vs. the
//     click-through trick Indeed needs).
//
// SimplyHired is owned by Indeed's parent company and is built on Indeed's
// own job index — its data fields are literally Indeed's schema
// (jobKey/dateOnIndeed/indeedApply). See normalizeSimplyHiredDirect.js's
// header for why that's a real, verified fact, not the "looks copied from a
// worse scraper" read an earlier pass gave the same field pattern.
//
// Cursor-based pagination and per-job detail-page fetching (for a full
// description instead of the SERP snippet) are both real, visible
// capabilities of this site that this first pass does not implement —
// page 1 only, snippet-length description. Flagged, not silently dropped:
// widen this once the basic shape is confirmed working end-to-end.

import { chromium } from "playwright";
import { runCollector } from "./runtime.js";
import { saveJobs, deactivateStale } from "../processors/saveJobs.js";
import normalizeSimplyHiredDirect from "../processors/normalizeSimplyHiredDirect.js";
import targetDomains from "../config/targetDomains.js";

const BASE_URL = "https://www.simplyhired.com/search";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";

const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);
const SEARCH_DELAY_MS = Number(process.env.SIMPLYHIRED_SEARCH_DELAY_MS || 2000);
// "USA" and "last 24 hours" are the actual product requirement — search
// every target domain against the whole country rather than sweeping
// individual states/cities the way the LinkedIn/Indeed collectors do.
const SEARCH_LOCATION = "United States";

// `&t=1` is SimplyHired's own "Date Added: 24 hours" filter — found live via
// the site's own filter UI, not guessed (the obvious `sb=date` / `sortBy=date`
// URL params do nothing on their own; found by clicking the real "Anytime"
// dropdown and reading the URL it produced). Server-applies at the source,
// which matters here: with NO date filter, this endpoint defaults to
// relevance-sorted results, and a relevance-sorted page 1 for a broad
// country-wide search is mostly old, popular postings — a client-side-only
// cutoff filter on top of that would have thrown away ~99% of every result
// (confirmed: an unfiltered first run kept 1 of 277 unique jobs). This DOES
// require a full navigation, not a client-side filter click — verified live
// that clicking the UI control updates the URL and the visible result count,
// but leaves the __NEXT_DATA__ script tag showing the ORIGINAL unfiltered
// payload; only a fresh page load actually re-renders it server-side.
const DATE_ADDED_PARAM = "t=1";

const stats = { searches: 0, rawCards: 0, unique: 0, processed: 0, saved: 0, failed: 0, skipped: 0, deduped: 0, blocked: 0 };

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function looksBlocked(title) {
  return /just a moment|checking your browser|attention required/i.test(title || "");
}

// Fresh context per search — Indeed's collector found this Cloudflare-class
// challenge to be a per-session/cookie signal, not IP/timing (two searches
// in one context: the second gets challenged even with a delay; the same
// two searches each in their own context both succeed). Applying the same
// isolation here rather than re-discovering that the hard way.
async function searchOnce(browser, keyword) {
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    userAgent: USER_AGENT,
  });
  try {
    const page = await context.newPage();
    const url = `${BASE_URL}?q=${encodeURIComponent(keyword)}&l=${encodeURIComponent(SEARCH_LOCATION)}&${DATE_ADDED_PARAM}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(2500);

    const title = await page.title();
    if (looksBlocked(title)) return { blocked: true, jobs: [] };

    const jobs = await page.evaluate(() => {
      const el = document.getElementById("__NEXT_DATA__");
      if (!el) return null;
      try {
        const data = JSON.parse(el.textContent);
        return data?.props?.pageProps?.jobs || null;
      } catch {
        return null;
      }
    });

    if (!Array.isArray(jobs)) return { blocked: false, jobs: [], noData: true };
    return { blocked: false, jobs };
  } finally {
    await context.close();
  }
}

export default async function collectSimplyHiredJobs() {
  const cutoff = new Date(Date.now() - SCRAPE_LAST_HOURS * 60 * 60 * 1000);
  const browser = await chromium.launch({ headless: true });

  const allRaw = [];

  for (const keyword of targetDomains) {
    stats.searches++;
    console.log(`\n🔍 SimplyHired: "${keyword}" — ${SEARCH_LOCATION}`);
    try {
      const { blocked, jobs, noData } = await searchOnce(browser, keyword);
      if (blocked) {
        stats.blocked++;
        console.log(`   🛑 blocked (challenge page)`);
        continue;
      }
      if (noData) {
        console.log(`   ⚠ page loaded but __NEXT_DATA__ jobs were not found — site markup may have changed`);
        continue;
      }
      console.log(`   📄 ${jobs.length} jobs`);
      stats.rawCards += jobs.length;
      allRaw.push(...jobs);
    } catch (err) {
      console.error(`   ❌ "${keyword}" failed: ${err.message}`);
      stats.failed++;
    }
    await delay(SEARCH_DELAY_MS);
  }

  await browser.close();

  // Same job can surface under more than one of the 13 domain searches.
  const unique = [...new Map(allRaw.map((j) => [j.jobKey, j])).values()];
  stats.unique = unique.length;
  console.log(`\n📦 ${allRaw.length} cards -> ${unique.length} unique`);

  const normalized = unique
    .map(normalizeSimplyHiredDirect)
    .filter((job) => job.source_job_id && job.title)
    .filter((job) => {
      if (!job.posted_date) return true; // no date signal — keep it
      if (new Date(job.posted_date) < cutoff) {
        stats.skipped++;
        return false;
      }
      return true;
    });
  stats.processed = normalized.length;

  const r = await saveJobs(normalized, stats);
  if (r.deduped) console.log(`   🧹 ${r.deduped} duplicate(s) collapsed`);
  console.log(`   💾 saved ${r.saved}/${r.attempted}`);

  await deactivateStale("simplyhired", SCRAPE_LAST_HOURS);

  console.log("\n==========================================");
  console.log("✅ SimplyHired Collector Finished");
  console.log("==========================================");
  console.table(stats);
  console.log("==========================================\n");
}

runCollector(import.meta.url, collectSimplyHiredJobs);
