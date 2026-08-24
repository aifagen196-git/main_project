// collectors/dice.js
//
// Dice runs recruiter/job-feed PARTNER programs (a real, official path —
// reach out through their business/partnerships contact page), but that's
// manual, human-led approval, same as ZipRecruiter's, and Dice's guide gives
// no documented public endpoint the way ZipRecruiter's does — so there's
// nothing concrete to code against for that path yet. This collector
// implements the FALLBACK the guide describes instead: an Apify Actor for
// dice.com. Swap in the real partner API here once/if that access exists.
//
// RECOMMENDED ACTOR: unfenced-group/dice-scraper
// (https://apify.com/unfenced-group/dice-scraper) — verified with real
// throwaway test calls (2026-08-24), not just its docs page. Cheap: ~$0.57
// per 1,000 results. Its input takes ONE searchQuery string per call (unlike
// SimplyHired's batched `queries` array), so the per-(keyword, location)
// loop below is the right shape for this actor specifically.
//
// fetchDetails: true is REQUIRED below — confirmed live that description
// and skills are both empty without it (it makes the actor visit each job's
// detail page, so it's slower and costs more per result, but an empty
// description defeats the point of collecting the job at all).
//
// Needs an Apify account, a personal API token, and that Actor ID. Until
// both APIFY_TOKEN and APIFY_DICE_ACTOR_ID are set, this collector logs why
// it's skipping and exits cleanly.
//
// Field mapping verified against real responses — see normalizeDice.js's
// header for the three real data-quality issues found and handled there
// (URL-encoded company names, a contaminated state field, and postedDate
// holding badge text instead of an actual date).

import { runCollector } from "./runtime.js";
import { saveJobs, deactivateStale } from "../processors/saveJobs.js";
import normalizeDice from "../processors/normalizeDice.js";
import { apifyRun } from "./apifyClient.js";
import linkedinSearches from "../config/linkedinSearches.js";
import locations from "../config/locations.js";

const ACTOR_ID = process.env.APIFY_DICE_ACTOR_ID;
const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);

// Dice is tech-focused (per the guide) — every category in linkedinSearches
// already is too, so no extra filtering needed here, just the same
// "start narrow" keyword/location slice as the other new sources.
// linkedinSearches (config/linkedinSearches.js) exports a FLAT array of all
// ~59 keywords, not grouped by category — every 6th index approximates "one
// representative keyword per category" (~10 keywords) without needing to
// know the exact group boundaries.
const KEYWORDS = linkedinSearches.filter((_, i) => i % 6 === 0);
const SEARCH_LOCATIONS = locations.slice(0, 5);
const MAX_ITEMS_PER_SEARCH = Number(process.env.DICE_MAX_ITEMS || 100);

const stats = { searches: 0, fetched: 0, saved: 0, failed: 0, skipped: 0 };

export default async function collectDiceJobs() {
  if (!process.env.APIFY_TOKEN || !ACTOR_ID) {
    console.warn(
      "⏭  APIFY_TOKEN / APIFY_DICE_ACTOR_ID not set — skipping. " +
        "Requires an Apify account and that store listing's Actor ID " +
        "(or a Dice partner API key, once/if that's granted); " +
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
          searchQuery: search,
          location,
          maxResults: MAX_ITEMS_PER_SEARCH,
          fetchDetails: true,
        });
      } catch (err) {
        console.error(`❌ "${search}" @ "${location}" failed: ${err.message}`);
        stats.failed++;
        continue;
      }
      stats.fetched += rawJobs.length;

      const normalized = rawJobs
        .map(normalizeDice)
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

  await deactivateStale("dice", SCRAPE_LAST_HOURS);

  console.log("\n==========================================");
  console.log("✅ Dice Collector Finished");
  console.log("==========================================");
  console.table(stats);
  console.log("==========================================\n");
}

runCollector(import.meta.url, collectDiceJobs);
