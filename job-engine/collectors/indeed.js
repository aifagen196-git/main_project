// collectors/indeed.js
//
// Indeed search results only render for a real browser — a plain HTTP GET
// with a Chrome UA (the same approach every other collector uses) gets an
// immediate 403 (verified live). Playwright is required for the search page.
//
// Per-job DETAIL fetching used to be a dead end: /viewjob navigated to
// directly (no referrer chain from a real search click) returns a Cloudflare
// challenge page ("Just a moment...") — verified live. The old collector's
// resolveJob() step navigated every result through /rc/clk hoping to reach
// the employer's own ATS; that link only ever forwards back to Indeed's own
// /viewjob, so it was one extra blockable page load per job for zero signal.
//
// What unlocks full descriptions safely: clicking a job title FROM WITHIN
// the already-loaded search page (same tab, same browser context) doesn't
// navigate at all — Indeed's SPA intercepts the click and fires an in-page
// XHR to `/viewjob?...&viewtype=embedded`, carrying the session's real
// referer/cookies. Verified live: 5 sequential clicks on one search page, 5x
// 200 OK, 5 full (not truncated) descriptions, zero blocks — versus a cold
// direct navigation to that same endpoint, which gets Cloudflare-challenged
// every time. So the rule isn't "never touch the detail page", it's "never
// touch it except as a click from the page that's already past the
// challenge." parseIndeedDetail.js parses the JSON that XHR returns.
//
// The search page's own embedded JSON (mosaicData.js) already gives exact
// salary, an absolute post timestamp, employment type, and remote flag for
// every result with no navigation at all — the click-through above is used
// ONLY to upgrade the short description snippet to the full posting, for a
// bounded number of jobs per search (DETAIL_FETCHES_PER_SEARCH).

import { chromium } from "playwright";
import normalizeIndeed from "../processors/normalizeIndeed.js";
import parseIndeedDetail from "../processors/parseIndeedDetail.js";
import { extractJobProfile } from "../processors/extractProfile.js";
import extractSalary from "../processors/salaryParser.js";
import extractRoleFamily from "../processors/roleFamilyExtractor.js";
import extractEmploymentType from "../processors/employmentTypeExtractor.js";
import normalizeCompany from "../processors/companyNormalizer.js";
import parseLocation from "../processors/locationParser.js";
import {
  normalizeCountry,
  normalizeEmploymentType,
  isUnitedStates,
} from "../processors/canonicalFields.js";
import { planSearches, RateLimitTracker } from "../processors/searchPlanner.js";
import {
  getThrottle,
  throttled,
  recordRunOutcome,
} from "../processors/adaptiveThrottle.js";
import {
  saveJobs,
  deactivateStale,
  retireExpired,
  fetchEnrichedJobIds,
  dropAlreadyStored,
} from "../processors/saveJobs.js";
import { runCollector } from "./runtime.js";
import indeedSearches from "../config/indeedSearches.js";
import locations from "../config/locations.js";

const BASE_URL = "https://www.indeed.com/jobs";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";

// Conservative by design: Indeed's own bot defense is confirmed active
// (plain HTTP -> 403, direct /viewjob -> Cloudflare challenge), and this run
// has no prior data on where its search-page rate limit actually sits.
// Better to undershoot and rotate across runs (searchPlanner.js persists the
// offset) than to find the limit by tripping it.
const PAGE_SIZE = 15; // Indeed returns ~15 cards per search page
const MAX_PAGES = Number(process.env.INDEED_MAX_PAGES || 1);
const SEARCH_PAIR_BUDGET = Number(process.env.INDEED_SEARCH_PAIRS || 3);
const SEARCH_DELAY_MS = Number(process.env.INDEED_SEARCH_DELAY_MS || 3000);
// Click-through detail fetches, per search page. Bounded: verified reliable
// at 5 in a row, but nothing this session tested a full 15-45 clicks on one
// page, and each click adds real wall-clock time (delay below). Undershoot
// until there's evidence the ceiling is actually higher.
const DETAIL_FETCHES_PER_SEARCH = Number(
  process.env.INDEED_DETAIL_FETCHES_PER_SEARCH || 8,
);
const DETAIL_CLICK_DELAY_MS = Number(
  process.env.INDEED_DETAIL_CLICK_DELAY_MS || 2500,
);

const stats = {
  searches: 0,
  rawCards: 0,
  unique: 0,
  alreadyEnriched: 0, // skipped a detail click: already stored with full text
  usFiltered: 0,
  enriched: 0,
  crossRunDupes: 0, // same posting already stored under a different id
  processed: 0,
  saved: 0,
  deduped: 0,
  failed: 0,
  blocked: 0,
  expiredRetired: 0,
  staleDeactivated: 0,
};

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// Narrow signature only — a live audit found the broader version of this
// check (matching a bare "captcha" anywhere in the page head) produced a
// false positive on every normal, job-filled Indeed page: Indeed itself
// preloads Google reCAPTCHA's script tag ("recaptcha/releases/.../
// recaptcha__en.js") on pages that have nothing to do with bot detection.
// `cdn-cgi/challenge` and `__cf_chl` are Cloudflare's own interstitial
// markers and were confirmed absent from every real result page tested.
function looksBlocked(title, html) {
  if (/just a moment|checking your browser|attention required/i.test(title)) {
    return true;
  }
  return /cdn-cgi\/challenge|__cf_chl/i.test(html.slice(0, 5000));
}

// A fresh BrowserContext per search, not a shared one. Verified live: two
// searches run as two tabs in the SAME context — even with a delay and a
// brand new tab — got the second one Cloudflare-challenged; the exact same
// two searches each in their OWN context both succeeded. This is a
// per-session/cookie signal, not an IP or timing one, so the fix is
// isolation, not slower pacing.
async function searchPage(browser, keyword, location, page, detailBudget) {
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    userAgent: USER_AGENT,
  });
  const url = `${BASE_URL}?q=${encodeURIComponent(keyword)}&l=${encodeURIComponent(location)}&start=${page * PAGE_SIZE}`;
  try {
    const tab = await context.newPage();

    // Capture each embedded detail response as it fires, keyed by jobkey,
    // so the click loop below can just wait a beat and read it back out.
    const detailBodies = new Map();
    tab.on("response", async (res) => {
      const u = res.url();
      if (!u.includes("/viewjob?") || !u.includes("viewtype=embedded")) return;
      const jk = u.match(/[?&]jk=([a-f0-9]+)/)?.[1];
      if (!jk) return;
      try {
        detailBodies.set(jk, await res.text());
      } catch {
        // response body unavailable (e.g. tab closed mid-flight) — that job
        // just keeps its search-page snippet, not a hard failure.
      }
    });

    await tab.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await tab.waitForTimeout(4000);
    const title = await tab.title();
    const html = await tab.content();
    if (looksBlocked(title, html)) return { blocked: true, jobs: [] };

    const jobs = normalizeIndeed(html);

    // Spend the scarce click budget only on jobs we do NOT already have
    // stored with a full description. Every click is a request against a
    // rate limit that has been observed serving challenge pages, so
    // re-fetching a description we already hold is pure waste — and on a
    // rotating keyword matrix, later runs re-surface plenty of known jobs.
    const alreadyEnriched = await fetchEnrichedJobIds(
      "indeed",
      jobs.map((j) => j.source_job_id),
    );
    const needsDetail = jobs.filter((j) => !alreadyEnriched.has(j.source_job_id));
    const skipped = jobs.length - needsDetail.length;
    stats.alreadyEnriched += skipped;

    // Click through a bounded number of results, same tab/context — this is
    // what makes /viewjob's data reachable at all (see file header). Each
    // click is intercepted client-side (no navigation, no new challenge);
    // it just fires the XHR the listener above is already collecting.
    let enrichedCount = 0;
    for (const job of needsDetail.slice(0, detailBudget)) {
      try {
        const link = await tab.$(`a.jcs-JobTitle[data-jk="${job.source_job_id}"]`);
        if (!link) continue;
        await link.click();
        await tab.waitForTimeout(DETAIL_CLICK_DELAY_MS);
        const body = detailBodies.get(job.source_job_id);
        if (!body) continue;
        const detail = parseIndeedDetail(body);
        if (detail?.description) {
          job.description = detail.description;
          job.fullDescription = true;
          enrichedCount++;
        }
      } catch (err) {
        // One job's click failing shouldn't sink the rest of the page —
        // it just keeps the short snippet already parsed from the SERP.
        console.log(`   ⚠ detail click failed for ${job.source_job_id}: ${err.message}`);
      }
    }

    return { blocked: false, jobs, enrichedCount, skipped };
  } finally {
    await context.close();
  }
}

async function toRow(job, searchRoleFamily) {
  const profile = await extractJobProfile(job.description);
  const loc = parseLocation(job.location);

  // Indeed's own dedicated salary text ("$85,000 - $145,000 a year") is far
  // more reliable than mining a number out of the short description snippet
  // the way the heuristic profile does — prefer it when present.
  const dedicatedSalary = extractSalary(job.salary);

  return {
    title: job.title,
    company: normalizeCompany(job.company) || job.company,
    location: job.location,
    employment_type: normalizeEmploymentType(
      job.employmentType || extractEmploymentType(job.description),
    ),
    salary: job.salary || null,
    description: job.description,
    source: "indeed",
    source_job_id: job.source_job_id,
    apply_url: job.url,
    posted_date: job.postedAt || null,
    skills: profile.skills_required,
    skills_required: profile.skills_required,
    skills_preferred: profile.skills_preferred,
    // Prefer the role family inferred from the search keyword that surfaced
    // this job — a known-good signal, unlike the blind description-text
    // heuristic (same pattern as the LinkedIn collector).
    role_family:
      searchRoleFamily && searchRoleFamily !== "other"
        ? searchRoleFamily
        : profile.role_family,
    min_years: profile.min_years,
    country: normalizeCountry(job.country || loc.country || profile.country),
    state: job.state || loc.state || profile.state,
    is_remote_us:
      job.workplaceType === "remote" &&
      isUnitedStates(job.country || loc.country) ||
      profile.is_remote_us,
    profile: { ...profile, salary_range: dedicatedSalary || profile.salary_range },
    match_score: 0,
    is_active: true,
    last_seen: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

export default async function collectIndeedJobs() {
  console.log("\n==========================================");
  console.log("🟦 Indeed Collector Started");
  console.log("==========================================");

  const STATE_FILE = ".indeed-search-state.json";

  // Respect a post-block cooldown BEFORE spending the rotation offset —
  // otherwise a run launched inside the cooldown burns a slice of the keyword
  // matrix on searches that are guaranteed to be challenged, and pushes the
  // throttle level higher for nothing.
  const throttle = getThrottle(STATE_FILE);
  if (throttle.cooling) {
    const mins = Math.ceil(throttle.cooldownRemainingMs / 60000);
    console.log(
      `\n🧊 Cooling down after a recent block — ${mins} min remaining. Skipping this run.`,
    );
    console.log(
      `   (override with COLLECTOR_BLOCK_COOLDOWN_MS=0 if you need to force a run)`,
    );
    return stats;
  }

  const pairBudget = throttled(SEARCH_PAIR_BUDGET, throttle.factor);
  const pageBudget = throttled(MAX_PAGES, throttle.factor);
  const detailBudget = throttled(DETAIL_FETCHES_PER_SEARCH, throttle.factor);

  if (throttle.level > 0) {
    console.log(
      `\n🐢 Throttle level ${throttle.level}: pairs ${SEARCH_PAIR_BUDGET}->${pairBudget}, pages ${MAX_PAGES}->${pageBudget}, detail clicks ${DETAIL_FETCHES_PER_SEARCH}->${detailBudget}`,
    );
  }

  const { pairs, total, offset } = planSearches(
    indeedSearches,
    locations,
    pairBudget,
    STATE_FILE,
  );
  console.log(
    `\n🧭 Sampling ${pairs.length}/${total} keyword×location pairs (offset ${offset})`,
  );

  const browser = await chromium.launch({ headless: true });

  const cards = [];
  const rateLimit = new RateLimitTracker(2);

  outer: for (const { keyword, location } of pairs) {
    stats.searches++;
    console.log(`\n🔍 ${keyword} — ${location}`);
    for (let page = 0; page < pageBudget; page++) {
      try {
        const { blocked, jobs, enrichedCount, skipped } = await searchPage(
          browser,
          keyword,
          location,
          page,
          detailBudget,
        );
        if (blocked) {
          stats.blocked++;
          rateLimit.recordFailure(429); // treat a challenge page as a 429-equivalent
          console.log(`   🛑 blocked (challenge page)`);
          if (rateLimit.shouldStop) {
            console.log(`   🛑 repeated blocks — aborting search phase`);
            break outer;
          }
          break;
        }
        rateLimit.recordSuccess();
        stats.rawCards += jobs.length;
        stats.enriched += enrichedCount || 0;
        console.log(
          `   📄 page ${page + 1}: ${jobs.length} jobs (${enrichedCount || 0} full descriptions` +
            `${skipped ? `, ${skipped} already stored` : ""})`,
        );
        if (!jobs.length) break;
        cards.push(...jobs.map((j) => ({ ...j, searchRoleFamily: extractRoleFamily(keyword) })));
        await delay(SEARCH_DELAY_MS);
      } catch (err) {
        console.error(`   ⏭️ ${keyword}/${location} page ${page + 1}: ${err.message}`);
        break;
      }
    }
  }

  await browser.close();

  // De-duplicate across searches (same job can surface under multiple
  // keywords/locations).
  const unique = [...new Map(cards.map((c) => [c.source_job_id, c])).values()];
  stats.unique = unique.length;
  console.log(`\n📦 ${cards.length} cards -> ${unique.length} unique`);

  const rows = [];
  for (const job of unique) {
    // Indeed's own country field is the authoritative US filter — cheaper
    // and more reliable than inferring it from free-text location.
    if (job.country && job.country !== "US") {
      stats.usFiltered++;
      continue;
    }
    rows.push(await toRow(job, job.searchRoleFamily));
    stats.processed++;
  }

  // Cross-run dedupe: drop postings already stored under a DIFFERENT id (an
  // employer re-post). saveJobs()'s own dedupe only sees within this batch,
  // and the DB's unique constraint is on (source, source_job_id), so this is
  // the only layer that catches a re-post collected on a later run.
  const { rows: fresh, removed: crossRun } = await dropAlreadyStored("indeed", rows);
  stats.crossRunDupes = crossRun;
  if (crossRun) {
    console.log(`   ♻️  ${crossRun} already stored under a different id — skipped`);
  }

  const r = await saveJobs(fresh, stats);
  if (r.deduped) console.log(`   🧹 ${r.deduped} duplicate(s) collapsed`);
  console.log(`   💾 saved ${r.saved}/${r.attempted}`);

  // Retire postings past their expires_at, then those we simply haven't seen
  // in a long time. Both are non-destructive (is_active = false) — hard
  // deletion belongs to the retention migration, not a collector run.
  stats.expiredRetired = await retireExpired("indeed");
  stats.staleDeactivated = await deactivateStale("indeed", 30 * 24);

  // Feed this run's outcome back into the throttle so the NEXT run adapts —
  // the collector previously had no memory of being blocked and would charge
  // back in on the next schedule tick with identical settings.
  recordRunOutcome(STATE_FILE, stats);

  console.log("\n==========================================");
  console.log("✅ Indeed Collector Finished");
  console.log("==========================================");
  console.table(stats);
  console.log("==========================================\n");

  return stats;
}

runCollector(import.meta.url, collectIndeedJobs);
