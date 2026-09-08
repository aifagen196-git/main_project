// collectors/dice.js
//
// Direct scrape, no third-party service, no per-result cost — this replaces
// an earlier Apify-actor-based version (still in git history) after finding
// live that Dice.com doesn't need a paid scraper either:
//
//   - A plain HTTP GET actually succeeds here (200, real page — verified
//     live) — no Cloudflare wall the way SimplyHired/Indeed have. But the
//     job data isn't in the initial HTML: no __NEXT_DATA__ or similar JSON
//     blob was found (verified live — searched for it explicitly). Dice
//     renders results via Next.js Server Components, which stream as a
//     framework-internal wire format, not clean JSON — reverse-engineering
//     that would be fragile (tied to Next.js internals, likely to break on
//     any Dice deployment change) for no real benefit over just reading the
//     already-rendered DOM.
//   - So this uses Playwright (already a dependency here, for Indeed) to
//     load the page and read job cards straight out of the rendered DOM,
//     using stable data-testid/data-id attributes rather than CSS classes
//     (this site's classes are long, auto-generated Tailwind utilities —
//     not something to build a selector on; the data-testid attributes are
//     the intentionally-stable hooks).
//
// Official Dice partner/feed programs are real (see the Job Scraping
// Implementation Guide this was originally built from) but need a manual,
// human-led application with no documented public endpoint to code against
// yet — this direct-scrape path is the one that's actually running today.
//
// Known gap: job cards on the search page carry no description text, only
// title/company/location/employment-type badges — normalizeDiceDirect.js
// returns an empty description for now. A per-job detail-page fetch (like
// Indeed's collector does, from within an already-loaded page rather than a
// cold navigation) would fix this; not built this pass — flagged, not
// silently skipped.

import { chromium } from "playwright";
import { runCollector } from "./runtime.js";
import { saveJobs, deactivateStale } from "../processors/saveJobs.js";
import normalizeDiceDirect from "../processors/normalizeDiceDirect.js";
import targetDomains from "../config/targetDomains.js";

const BASE_URL = "https://www.dice.com/jobs";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";

const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);
const SEARCH_DELAY_MS = Number(process.env.DICE_SEARCH_DELAY_MS || 2000);
// "USA" and "last 24 hours" are the actual product requirement — search
// every target domain against the whole country, not a state-by-state sweep.
const SEARCH_LOCATION = "United States";

const stats = { searches: 0, rawCards: 0, unique: 0, processed: 0, saved: 0, failed: 0, skipped: 0, deduped: 0 };

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// Reads job cards straight out of the rendered DOM (see file header for why
// there's no JSON to parse here instead). Selectors are the site's own
// data-testid/data-id attributes — verified live against real search
// results, not guessed from source inspection.
async function extractCards(page) {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-testid="job-card"]')];
    return cards.map((card) => {
      const title = card.querySelector('[data-testid="job-search-job-detail-link"]')?.textContent?.trim() || "";
      const company = card.querySelector('[data-testid="job-card-company-name"]')?.textContent?.trim() || "";
      // The location+posted line is the plain <p> right after the company
      // link — no data-testid on it specifically, but its position relative
      // to the company link is stable (verified against multiple cards).
      const locLine =
        card.querySelector('a[href*="company-profile"] + p')?.textContent?.trim() || "";
      const [location, posted] = locLine.split("•").map((s) => s.trim());
      const badges = [...card.querySelectorAll(".box")]
        .map((b) => b.textContent.trim())
        .filter(Boolean);
      return {
        dataId: card.getAttribute("data-id") || "",
        dataGuid: card.getAttribute("data-job-guid") || "",
        title,
        company,
        location: location || "",
        posted: posted || "",
        badges,
      };
    });
  });
}

async function searchOnce(browser, keyword) {
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    userAgent: USER_AGENT,
  });
  try {
    const page = await context.newPage();
    const url = `${BASE_URL}?q=${encodeURIComponent(keyword)}&location=${encodeURIComponent(SEARCH_LOCATION)}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    // Job cards render client-side after the initial HTML — wait for at
    // least one to show up rather than a fixed delay guessing at it.
    try {
      await page.waitForSelector('[data-testid="job-card"]', { timeout: 15000 });
    } catch {
      return { jobs: [], noResults: true };
    }
    await page.waitForTimeout(1000); // let the rest of the list settle in
    const cards = await extractCards(page);
    return { jobs: cards };
  } finally {
    await context.close();
  }
}

export default async function collectDiceJobs() {
  const cutoff = new Date(Date.now() - SCRAPE_LAST_HOURS * 60 * 60 * 1000);
  const browser = await chromium.launch({ headless: true });

  const allRaw = [];

  for (const keyword of targetDomains) {
    stats.searches++;
    console.log(`\n🔍 Dice: "${keyword}" — ${SEARCH_LOCATION}`);
    try {
      const { jobs, noResults } = await searchOnce(browser, keyword);
      if (noResults) {
        console.log(`   ⚠ no job cards found — zero results, or site markup changed`);
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
  const unique = [...new Map(allRaw.map((c) => [c.dataId || c.dataGuid, c])).values()];
  stats.unique = unique.length;
  console.log(`\n📦 ${allRaw.length} cards -> ${unique.length} unique`);

  const normalized = unique
    .map(normalizeDiceDirect)
    // Real cards always have a company name too — a card with a title/id but
    // no company and no location doesn't match this site's real job-card
    // structure (verified live: ~7% of raw cards on a real run were exactly
    // this shape, most likely a different card type — a "related searches"
    // or similar sidebar widget — that the same selectors partially match).
    // Reject rather than save an almost-empty row.
    .filter((job) => job.source_job_id && job.title && job.company)
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

  await deactivateStale("dice", SCRAPE_LAST_HOURS);

  console.log("\n==========================================");
  console.log("✅ Dice Collector Finished");
  console.log("==========================================");
  console.table(stats);
  console.log("==========================================\n");
}

runCollector(import.meta.url, collectDiceJobs);
