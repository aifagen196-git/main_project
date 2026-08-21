// collectors/monster.js
//
// Monster has no public self-serve API anymore — this goes through Bright
// Data's Monster Jobs dataset instead (see brightDataClient.js's header for
// why that's new infrastructure in this codebase, not something reused from
// LinkedIn/Indeed). Needs a Bright Data account + that product's dataset_id
// (dashboard → Web Scraper products → search "Monster Jobs"). Until both
// BRIGHTDATA_API_KEY and BRIGHTDATA_MONSTER_DATASET_ID are set, this
// collector logs why it's skipping and exits cleanly.
//
// NOT verified against a live response yet — see normalizeMonster.js's
// header. Run `npm run monster` once configured and sanity-check a handful
// of saved rows before trusting this at scale.

import { runCollector } from "./runtime.js";
import { saveJobs, deactivateStale } from "../processors/saveJobs.js";
import normalizeMonster from "../processors/normalizeMonster.js";
import { brightDataScrape } from "./brightDataClient.js";
import linkedinSearches from "../config/linkedinSearches.js";
import locations from "../config/locations.js";

const DATASET_ID = process.env.BRIGHTDATA_MONSTER_DATASET_ID;
const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);

// Same "start narrow" reasoning as ziprecruiter.js — this also costs real
// Bright Data credits per URL scraped, unlike the free direct-HTTP
// collectors, so keeping the first runs small matters even more here.
// linkedinSearches (config/linkedinSearches.js) exports a FLAT array of all
// ~59 keywords, not grouped by category — every 6th index approximates "one
// representative keyword per category" (~10 keywords) without needing to
// know the exact group boundaries.
const KEYWORDS = linkedinSearches.filter((_, i) => i % 6 === 0);
const SEARCH_LOCATIONS = locations.slice(0, 5);
const PAGES_PER_SEARCH = 3;

// Bright Data's SYNC scrape endpoint caps batch size low (~20 URLs per call
// per the implementation guide) — chunk requests to stay under that rather
// than sending everything in one call and having it silently truncate.
const BATCH_SIZE = Number(process.env.BRIGHTDATA_BATCH_SIZE || 15);

const stats = { searches: 0, fetched: 0, saved: 0, failed: 0, skipped: 0 };

function monsterSearchUrl(keyword, location, page) {
  const q = encodeURIComponent(keyword.replace(/\s+/g, "-"));
  const where = encodeURIComponent(location);
  return `https://www.monster.com/jobs/search?q=${q}&where=${where}&page=${page}`;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default async function collectMonsterJobs() {
  if (!process.env.BRIGHTDATA_API_KEY || !DATASET_ID) {
    console.warn(
      "⏭  BRIGHTDATA_API_KEY / BRIGHTDATA_MONSTER_DATASET_ID not set — skipping. " +
        "Requires a Bright Data account and the Monster Jobs product's dataset_id; " +
        "see job-engine/.env.example.",
    );
    return;
  }

  const cutoff = new Date(Date.now() - SCRAPE_LAST_HOURS * 60 * 60 * 1000);

  const urls = [];
  for (const keyword of KEYWORDS) {
    for (const location of SEARCH_LOCATIONS) {
      for (let page = 1; page <= PAGES_PER_SEARCH; page++) {
        urls.push(monsterSearchUrl(keyword, location, page));
      }
    }
  }
  stats.searches = urls.length;

  for (const batch of chunk(urls, BATCH_SIZE)) {
    let rawJobs;
    try {
      rawJobs = await brightDataScrape(DATASET_ID, batch);
    } catch (err) {
      console.error(`❌ Bright Data batch failed: ${err.message}`);
      stats.failed += batch.length;
      continue;
    }
    stats.fetched += rawJobs.length;

    const normalized = rawJobs
      .map(normalizeMonster)
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
    if (r.attempted) console.log(`   💾 batch saved ${r.saved}/${r.attempted}`);
  }

  await deactivateStale("monster", SCRAPE_LAST_HOURS);

  console.log("\n==========================================");
  console.log("✅ Monster Collector Finished");
  console.log("==========================================");
  console.table(stats);
  console.log("==========================================\n");
}

runCollector(import.meta.url, collectMonsterJobs);
