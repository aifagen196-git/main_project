// collectors/simplyhired.js
//
// SimplyHired has no self-serve API for outside developers — this runs an
// Apify Actor (a ready-made scraper someone else already built and
// published to the Apify Store) instead. Needs an Apify account, a personal
// API token, and an Actor ID.
//
// RECOMMENDED ACTOR: thirdwatch/simplyhired-jobs-scraper
// (https://apify.com/thirdwatch/simplyhired-jobs-scraper) — checked live via
// its own /api docs page. This collector's request shape below
// (queries/location/maxResults) and normalizeSimplyHired.js's field mapping
// both target that actor specifically. A second candidate checked the same
// way (easyapi/simplyhired-job-scraper) takes pre-built search URLs instead
// of keyword+location and has output fields that look copied from an Indeed
// scraper (jobKey, dateOnIndeed) — a sign it isn't purpose-built for this
// site. If you use a different actor than thirdwatch's, its input/output
// shape may not match what's coded here at all — check its own /api page
// and adjust both this file and normalizeSimplyHired.js to match.
//
// Set APIFY_TOKEN and APIFY_SIMPLYHIRED_ACTOR_ID (job-engine/.env.example)
// to turn this on; until both are set, this collector logs why it's
// skipping and exits cleanly.
//
// Still NOT verified against an actual scrape response — this repo has no
// Apify token yet, so this is matched against the provider's documentation,
// not a real run. Run `npm run simplyhired` once configured and sanity-check
// a handful of saved rows before trusting this at scale.

import { runCollector } from "./runtime.js";
import { saveJobs, deactivateStale } from "../processors/saveJobs.js";
import normalizeSimplyHired from "../processors/normalizeSimplyHired.js";
import { apifyRun } from "./apifyClient.js";
import linkedinSearches from "../config/linkedinSearches.js";
import locations from "../config/locations.js";

const ACTOR_ID = process.env.APIFY_SIMPLYHIRED_ACTOR_ID;
const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);

// Same "start narrow" reasoning as the other new sources — Apify runs also
// cost real account credits.
// linkedinSearches (config/linkedinSearches.js) exports a FLAT array of all
// ~59 keywords, not grouped by category — every 6th index approximates "one
// representative keyword per category" (~10 keywords) without needing to
// know the exact group boundaries.
const KEYWORDS = linkedinSearches.filter((_, i) => i % 6 === 0);
const SEARCH_LOCATIONS = locations.slice(0, 5);
// thirdwatch's actor takes ALL queries in one call and caps total results
// across the whole batch — not per-keyword the way ZipRecruiter/Monster/Dice
// work here, so this is one run's total, not a per-search figure.
const MAX_RESULTS_PER_LOCATION = Number(process.env.SIMPLYHIRED_MAX_ITEMS || 100);

const stats = { searches: 0, fetched: 0, saved: 0, failed: 0, skipped: 0 };

export default async function collectSimplyHiredJobs() {
  if (!process.env.APIFY_TOKEN || !ACTOR_ID) {
    console.warn(
      "⏭  APIFY_TOKEN / APIFY_SIMPLYHIRED_ACTOR_ID not set — skipping. " +
        "Requires an Apify account and that store listing's Actor ID; " +
        "see job-engine/.env.example.",
    );
    return;
  }

  const cutoff = new Date(Date.now() - SCRAPE_LAST_HOURS * 60 * 60 * 1000);

  for (const location of SEARCH_LOCATIONS) {
    stats.searches++;
    let rawJobs;
    try {
      rawJobs = await apifyRun(ACTOR_ID, {
        queries: KEYWORDS,
        location,
        maxResults: MAX_RESULTS_PER_LOCATION,
      });
    } catch (err) {
      console.error(`❌ "${location}" failed: ${err.message}`);
      stats.failed++;
      continue;
    }
    stats.fetched += rawJobs.length;

    const normalized = rawJobs
      .map(normalizeSimplyHired)
      .filter((job) => job.source_job_id && job.title)
      .filter((job) => {
        if (!job.posted_date) return true;
        if (new Date(job.posted_date) < cutoff) {
          stats.skipped++;
          return false;
        }
        return true;
      });

    const r = await saveJobs(normalized, stats);
    if (r.attempted) console.log(`   💾 "${location}": saved ${r.saved}/${r.attempted}`);
  }

  await deactivateStale("simplyhired", SCRAPE_LAST_HOURS);

  console.log("\n==========================================");
  console.log("✅ SimplyHired Collector Finished");
  console.log("==========================================");
  console.table(stats);
  console.log("==========================================\n");
}

runCollector(import.meta.url, collectSimplyHiredJobs);
