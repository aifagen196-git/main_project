// collectors/jobright.js
//
// Direct HTTP, no browser, no paid service — the free-est source in this
// codebase. Verified live: a plain GET (same axios client every ATS
// collector already uses) returns the real page, no anti-bot wall
// whatsoever, robots.txt explicitly allows /jobs/*, and the job data is
// embedded directly in a __NEXT_DATA__ JSON blob — no Playwright needed at
// all, unlike SimplyHired/Dice/Monster.
//
// IMPORTANT SCOPE LIMIT — read before widening this:
// Jobright's real keyword search requires being logged in. Verified live:
// typing into the site's own search box and submitting fires ZERO network
// requests for an anonymous visitor — the box simply isn't wired up without
// a session. The public, curl-able page always serves a fixed default feed
// (its own internal placeholder query, literally the string "Search") with
// no keyword targeting available. So unlike every other collector in this
// codebase, THIS ONE DOES NOT SEARCH THE 13 TARGET DOMAINS — it pulls
// Jobright's default "freshest across everything" feed and lets this app's
// own downstream matching/scoring do the domain relevance work, the same
// way it already scores any job against a user's resume regardless of
// source. If Jobright ever exposes keyword search to anonymous requests,
// this should be revisited — a targeted collector would be strictly better.
//
// `daysAgo=1` IS a real, verified, working URL filter — confirmed live:
// applying it dropped a 1941-job unfiltered response to 110, matching real
// last-24h postings (publishTimeDesc values like "28 minutes ago",
// "1 hour ago" on every sampled row). Pagination beyond the first 20
// results was NOT confirmed working for anonymous requests (guessed
// page/pn/start/pageSize params either had no effect or produced
// inconsistent, seemingly re-ranked results rather than a clean next page)
// — this collector deliberately takes just the first page rather than
// build pagination logic against behavior that isn't actually confirmed.

import httpClient from "../utils/httpClient.js";
import { runCollector } from "./runtime.js";
import { saveJobs, deactivateStale } from "../processors/saveJobs.js";
import normalizeJobright from "../processors/normalizeJobright.js";

const URL = "https://jobright.ai/jobs/search?daysAgo=1";
const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);

const stats = { fetched: 0, saved: 0, failed: 0, skipped: 0, deduped: 0 };

function extractJobList(html) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    const data = JSON.parse(m[1]);
    return data?.props?.pageProps?.jobList || null;
  } catch {
    return null;
  }
}

export default async function collectJobrightJobs() {
  const cutoff = new Date(Date.now() - SCRAPE_LAST_HOURS * 60 * 60 * 1000);

  let html;
  try {
    const res = await httpClient.get(URL);
    html = res.data;
  } catch (err) {
    console.error(`❌ Jobright fetch failed: ${err.message}`);
    stats.failed++;
    console.table(stats);
    return;
  }

  const jobList = extractJobList(html);
  if (!Array.isArray(jobList)) {
    console.error("❌ __NEXT_DATA__ jobList not found — site markup may have changed");
    console.table(stats);
    return;
  }
  stats.fetched = jobList.length;
  console.log(`📄 ${jobList.length} jobs from Jobright's daysAgo=1 feed`);

  const normalized = jobList
    .map(normalizeJobright)
    .filter((job) => job.source_job_id && job.title && job.company)
    .filter((job) => {
      if (!job.posted_date) return true; // no date signal — keep it
      if (new Date(job.posted_date) < cutoff) {
        stats.skipped++;
        return false;
      }
      return true;
    });

  const r = await saveJobs(normalized, stats);
  if (r.deduped) console.log(`   🧹 ${r.deduped} duplicate(s) collapsed`);
  console.log(`   💾 saved ${r.saved}/${r.attempted}`);

  await deactivateStale("jobright", SCRAPE_LAST_HOURS);

  console.log("\n==========================================");
  console.log("✅ Jobright Collector Finished");
  console.log("==========================================");
  console.table(stats);
  console.log("==========================================\n");
}

runCollector(import.meta.url, collectJobrightJobs);
