// collectors/simplyhired.js
//
// SimplyHired has no self-serve API for outside developers — this runs an
// Apify Actor (a ready-made scraper someone else already built and
// published to the Apify Store) instead. Needs an Apify account, a personal
// API token, and the exact Actor ID for their SimplyHired scraper (search
// "SimplyHired" in the Apify Store, copy the ID off the Actor's page — it
// looks like "owner-name~simplyhired-scraper"). Until both APIFY_TOKEN and
// APIFY_SIMPLYHIRED_ACTOR_ID are set, this collector logs why it's skipping
// and exits cleanly.
//
// NOT verified against a live response yet — see normalizeSimplyHired.js's
// header. Run `npm run simplyhired` once configured and sanity-check a
// handful of saved rows before trusting this at scale.

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
const MAX_ITEMS_PER_SEARCH = Number(process.env.SIMPLYHIRED_MAX_ITEMS || 100);

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

  for (const search of KEYWORDS) {
    for (const location of SEARCH_LOCATIONS) {
      stats.searches++;
      let rawJobs;
      try {
        rawJobs = await apifyRun(ACTOR_ID, {
          search,
          location,
          maxItems: MAX_ITEMS_PER_SEARCH,
        });
      } catch (err) {
        console.error(`❌ "${search}" @ "${location}" failed: ${err.message}`);
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
      if (r.attempted) console.log(`   💾 "${search}" @ "${location}": saved ${r.saved}/${r.attempted}`);
    }
  }

  await deactivateStale("simplyhired", SCRAPE_LAST_HOURS);

  console.log("\n==========================================");
  console.log("✅ SimplyHired Collector Finished");
  console.log("==========================================");
  console.table(stats);
  console.log("==========================================\n");
}

runCollector(import.meta.url, collectSimplyHiredJobs);
