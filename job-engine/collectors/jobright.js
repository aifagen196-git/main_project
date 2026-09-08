// collectors/jobright.js
//
// Direct HTTP, no browser, no paid service — the free-est source in this
// codebase. Verified live: a plain GET (same axios client every ATS
// collector already uses) returns the real page, no anti-bot wall
// whatsoever, robots.txt explicitly allows /jobs/*, and the job data is
// embedded directly in a __NEXT_DATA__ JSON blob — no Playwright needed at
// all, unlike SimplyHired/Dice/Monster.
//
// CORRECTION to an earlier pass of this file (see git history): it
// concluded keyword search "requires login" because typing into the site's
// own search box fires zero network requests for an anonymous visitor. That
// part is true, but the conclusion was wrong — that's the CLIENT-SIDE box
// being broken/gated for anonymous users, not the underlying page. The
// server-side URL param that actually drives the search is `value` (not the
// `q` guessed originally) — verified live: `?value=Data+Analyst` correctly
// reflects into the response's own `query.value` field, drops `totalJobs`
// from ~1900 to ~1000 matching titles, and returns genuinely relevant
// results ("Data Analyst", "Staff Data Analyst", "Junior Data Analyst" for
// that query; "Senior Network Engineer", "Sr Security/Network Engineer" for
// a completely different one). Combined with `daysAgo=1`, both filters are
// honored together (confirmed via the echoed `query` object) and results
// were as fresh as "1 minute ago". So this DOES now search the 13 target
// domains for real, the same way SimplyHired/Dice do.
//
// `daysAgo=1` is the same verified freshness filter as before. Pagination
// beyond the first 20 results per search was NOT confirmed working
// (guessed page/pn/start/pageSize params either had no effect or produced
// inconsistent, seemingly re-ranked results) — takes the first page per
// domain rather than build logic against behavior that isn't confirmed.

import httpClient from "../utils/httpClient.js";
import { runCollector } from "./runtime.js";
import { saveJobs, deactivateStale } from "../processors/saveJobs.js";
import normalizeJobright from "../processors/normalizeJobright.js";
import targetDomains from "../config/targetDomains.js";

const BASE_URL = "https://jobright.ai/jobs/search";
const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);
const SEARCH_DELAY_MS = Number(process.env.JOBRIGHT_SEARCH_DELAY_MS || 1500);

const stats = { searches: 0, fetched: 0, saved: 0, failed: 0, skipped: 0, deduped: 0 };

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

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
  const allRaw = [];

  for (const keyword of targetDomains) {
    stats.searches++;
    console.log(`\n🔍 Jobright: "${keyword}"`);

    let html;
    try {
      const res = await httpClient.get(BASE_URL, {
        params: { value: keyword, daysAgo: 1 },
      });
      html = res.data;
    } catch (err) {
      console.error(`   ❌ failed: ${err.message}`);
      stats.failed++;
      await delay(SEARCH_DELAY_MS);
      continue;
    }

    const jobList = extractJobList(html);
    if (!Array.isArray(jobList)) {
      console.error("   ⚠ __NEXT_DATA__ jobList not found — site markup may have changed");
      await delay(SEARCH_DELAY_MS);
      continue;
    }
    console.log(`   📄 ${jobList.length} jobs`);
    stats.fetched += jobList.length;
    allRaw.push(...jobList);

    await delay(SEARCH_DELAY_MS);
  }

  // Same job can surface under more than one of the 13 domain searches.
  const unique = [...new Map(allRaw.map((e) => [e.jobResult?.jobId, e])).values()];
  console.log(`\n📦 ${allRaw.length} cards -> ${unique.length} unique`);

  const normalized = unique
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
