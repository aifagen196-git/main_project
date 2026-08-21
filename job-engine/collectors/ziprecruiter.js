// collectors/ziprecruiter.js
//
// ZipRecruiter Partner Jobs API — the one source in this batch with a real,
// documented, direct API (Bucket A per the implementation guide this was
// built from). Needs partner approval from ZipRecruiter first: email
// atsintegrations@ziprecruiter.com (or their partner sign-up form) — that's
// a manual, human-led approval step nobody can automate. Until
// ZIPRECRUITER_API_KEY is set, this collector logs why it's skipping and
// exits cleanly rather than failing a scheduled run.
//
// NOT verified against a live response yet — see normalizeZipRecruiter.js's
// header. Run `npm run ziprecruiter` once you have a key and sanity-check a
// handful of saved rows before trusting this at scale.

import httpClient from "../utils/httpClient.js";
import { runCollector } from "./runtime.js";
import { saveJobs, deactivateStale } from "../processors/saveJobs.js";
import normalizeZipRecruiter from "../processors/normalizeZipRecruiter.js";
import withRetry from "../processors/retry.js";
import linkedinSearches from "../config/linkedinSearches.js";
import locations from "../config/locations.js";

const API_KEY = process.env.ZIPRECRUITER_API_KEY;
const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);

// Deliberately small for a first, unverified run against a brand-new source
// — one keyword per category, a handful of locations, rather than the full
// LinkedIn-scale matrix. Widen this once real jobs are confirmed landing
// correctly (see the guide's Scale-Up Checklist: vary keywords/locations,
// paginate fully — the pattern is identical here, just start narrow).
const KEYWORDS = Object.values(linkedinSearches).map((group) => group[0]);
const SEARCH_LOCATIONS = locations.slice(0, 5); // "Remote", "United States", + 3

const JOBS_PER_PAGE = 100;
const MAX_PAGES = Number(process.env.ZIPRECRUITER_MAX_PAGES || 5);

const stats = { searches: 0, fetched: 0, saved: 0, failed: 0, skipped: 0 };

async function fetchSearch(search, location) {
  const jobs = [];
  let page = 1;

  while (page <= MAX_PAGES) {
    const res = await withRetry(() =>
      httpClient.get("https://api.ziprecruiter.com/jobs/v1", {
        params: { search, location, page, jobs_per_page: JOBS_PER_PAGE, api_key: API_KEY },
      }),
    );
    const pageJobs = res.data?.jobs || [];
    if (!pageJobs.length) break; // no more results — this is how you get the
    // maximum count instead of just the first page (guide's own tip)
    jobs.push(...pageJobs);
    page++;
  }

  return jobs;
}

export default async function collectZipRecruiterJobs() {
  if (!API_KEY) {
    console.warn(
      "⏭  ZIPRECRUITER_API_KEY not set — skipping. Requires ZipRecruiter partner " +
        "approval (email atsintegrations@ziprecruiter.com); see job-engine/.env.example.",
    );
    return;
  }

  const cutoff = new Date(Date.now() - SCRAPE_LAST_HOURS * 60 * 60 * 1000);

  for (const search of KEYWORDS) {
    for (const location of SEARCH_LOCATIONS) {
      stats.searches++;
      let rawJobs;
      try {
        rawJobs = await fetchSearch(search, location);
      } catch (err) {
        console.error(`❌ "${search}" @ "${location}" failed: ${err.message}`);
        continue;
      }
      stats.fetched += rawJobs.length;

      const normalized = rawJobs
        .map(normalizeZipRecruiter)
        .filter((job) => job.source_job_id && job.title)
        .filter((job) => {
          if (!job.posted_date) return true; // no date signal — keep it
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

  await deactivateStale("ziprecruiter", SCRAPE_LAST_HOURS);

  console.log("\n==========================================");
  console.log("✅ ZipRecruiter Collector Finished");
  console.log("==========================================");
  console.table(stats);
  console.log("==========================================\n");
}

runCollector(import.meta.url, collectZipRecruiterJobs);
