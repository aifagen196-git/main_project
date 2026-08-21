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
// Needs an Apify account, a personal API token, and the exact Actor ID for
// their Dice scraper (search "Dice.com scraper" in the Apify Store). Until
// both APIFY_TOKEN and APIFY_DICE_ACTOR_ID are set, this collector logs why
// it's skipping and exits cleanly.
//
// NOT verified against a live response yet — see normalizeDice.js's header.
// Run `npm run dice` once configured and sanity-check a handful of saved
// rows before trusting this at scale.

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
const KEYWORDS = Object.values(linkedinSearches).map((group) => group[0]);
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
