import httpClient from "../utils/httpClient.js";
import { runCollector } from "./runtime.js";
import { saveJobs, deactivateStale } from "../processors/saveJobs.js";

import linkedinSearches from "../config/linkedinSearches.js";
import normalizeLinkedIn from "../processors/normalizeLinkedIn.js";
import parseLinkedInJob from "../processors/parseLinkedInJob.js";
import extractJobProfile from "../processors/extractJobProfile.js";
import normalizeCompany from "../processors/companyNormalizer.js";
import parseLocation from "../processors/locationParser.js";
import extractEmploymentType from "../processors/employmentTypeExtractor.js";
import extractRoleFamily from "../processors/roleFamilyExtractor.js";
import { planSearches, RateLimitTracker } from "../processors/searchPlanner.js";
import locations from "../config/locations.js";
import { normalizeCountry, normalizeEmploymentType } from "../processors/canonicalFields.js";
import relativeToISO from "../processors/relativeDate.js";

const BASE_URL =
  "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search";

// Lightweight per-job fragment (~26KB, CSS-class HTML) — NOT the 332KB public
// job page. parseLinkedInJob parses this fragment.
const DETAIL_URL = (id) =>
  `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${id}`;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";

// Tunables. LinkedIn's guest endpoint blocks (429) after ~10 page requests
// from one IP, TOTAL — not per keyword. The full 59-keyword x 46-location
// matrix (8,142 requests) would get rate-limited almost immediately, so a
// single run only samples a bounded, rotating slice of it (searchPlanner.js
// persists the rotation offset across runs) and hard-caps total requests.
const PAGE_SIZE = 25; // guest endpoint returns 25 cards per page
const MAX_PAGES = Number(process.env.LINKEDIN_MAX_PAGES || 2);
const SEARCH_PAIR_BUDGET = Number(process.env.LINKEDIN_SEARCH_PAIRS || 4);
const MAX_TOTAL_SEARCH_REQUESTS = Number(
  process.env.LINKEDIN_MAX_SEARCH_REQUESTS || 8,
);
const SEARCH_DELAY_MS = Number(process.env.LINKEDIN_SEARCH_DELAY_MS || 1500);
const DETAIL_DELAY_MS = Number(process.env.LINKEDIN_DETAIL_DELAY_MS || 800);

const stats = {
  searches: 0,
  searchRequests: 0,
  rateLimitStopped: false,
  rawCards: 0,
  unique: 0,
  detailed: 0,
  saved: 0,
  skipped: 0,
  failed: 0,
};

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// LinkedIn's guest fragment gives a RELATIVE date ("3 weeks ago", "2 days ago",
// "yesterday"), not a timestamp — inserting it straight into the timestamptz
// `posted_date` column throws. relativeToISO (processors/relativeDate.js)
// converts to an approximate ISO date, else null.

const US_LOCATION =
  /\b(united states|usa|u\.s\.|remote)\b|,\s*(al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy)\b/i;

// =============================================
// FETCH FULL JOB DETAILS (per job page)
// =============================================
async function fetchJobDetails(job) {
  try {
    const res = await httpClient.get(DETAIL_URL(job.source_job_id), {
      headers: { "User-Agent": USER_AGENT },
      timeout: 30000,
    });
    return parseLinkedInJob(res.data); // { description, employmentType, ... } | null
  } catch (err) {
    console.error(`   ❌ details ${job.source_job_id}: ${err.message}`);
    return null;
  }
}

// =============================================
// MAP a detailed LinkedIn job -> jobs-table row
// (same shape the ATS normalizers produce)
// =============================================
async function toRow(job, parsed) {
  const description = parsed?.description || "";
  const profile = await extractJobProfile(description);
  const location = parsed?.location || job.location || "";
  const loc = parseLocation(location);
  const company = parsed?.company || job.company;

  return {
    title: parsed?.title || job.title,
    company: normalizeCompany(company) || company,
    location,
    employment_type: normalizeEmploymentType(
      parsed?.employmentType || extractEmploymentType(description),
    ),
    salary: parsed?.salary ? String(parsed.salary) : null,
    description,
    source: "linkedin",
    source_job_id: String(job.source_job_id),
    apply_url: parsed?.applyUrl || job.url,
    posted_date: relativeToISO(parsed?.postedAt),
    skills: profile.skills_required,
    skills_required: profile.skills_required,
    skills_preferred: profile.skills_preferred,
    // Prefer the role family inferred from the search keyword that surfaced
    // this job — it's a known-good signal, unlike the blind description-text
    // heuristic, which falls back to "other" whenever nothing matches.
    role_family:
      job.searchRoleFamily && job.searchRoleFamily !== "other"
        ? job.searchRoleFamily
        : profile.role_family,
    min_years: profile.min_years,
    country: normalizeCountry(loc.country || profile.country),
    state: loc.state || profile.state,
    is_remote_us:
      profile.is_remote_us || (loc.remote && loc.country === "United States"),
    profile,
    match_score: 0,
    is_active: true,
    last_seen: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

// =============================================
// SAVE (batched upsert)
// =============================================
// saveJobs/deactivateStale now live in ../processors/saveJobs.js — see the
// import above. Six collectors each had their own copy and they had drifted.

// =============================================
// MAIN
// =============================================
export default async function collectLinkedInJobs() {
  console.log("\n==========================================");
  console.log("🔵 LinkedIn Collector Started");
  console.log("==========================================");

  // 1) Search a bounded, rotating slice of the keyword x location matrix —
  // NOT the full 59 x 46 matrix, which guarantees an early 429 and silently
  // "completes" having covered almost nothing. Rotation offset persists
  // across runs (searchPlanner.js) so successive runs sweep the whole matrix.
  const { pairs, total, offset } = planSearches(
    linkedinSearches,
    locations,
    SEARCH_PAIR_BUDGET,
    ".linkedin-search-state.json",
  );
  console.log(
    `\n🧭 Sampling ${pairs.length}/${total} keyword×location pairs (offset ${offset})`,
  );

  const cards = [];
  const rateLimit = new RateLimitTracker(3);

  outer: for (const { keyword, location } of pairs) {
    stats.searches++;
    console.log(`\n🔍 ${keyword} — ${location}`);
    for (let page = 0; page < MAX_PAGES; page++) {
      if (stats.searchRequests >= MAX_TOTAL_SEARCH_REQUESTS) {
        console.log(
          `   🛑 hit global request cap (${MAX_TOTAL_SEARCH_REQUESTS}), stopping search phase`,
        );
        break outer;
      }
      stats.searchRequests++;
      try {
        const res = await httpClient.get(BASE_URL, {
          params: {
            keywords: keyword,
            location,
            start: page * PAGE_SIZE,
          },
        });
        rateLimit.recordSuccess();
        const found = normalizeLinkedIn(res.data).filter(
          (j) => j.source_job_id,
        );
        stats.rawCards += found.length;
        console.log(`   📄 page ${page + 1}: ${found.length} jobs`);
        if (!found.length) break;
        // Stamp the search keyword's role family onto every card it found —
        // a known-good signal, far more reliable than inferring role_family
        // from a blind description-text heuristic later.
        cards.push(...found.map((c) => ({ ...c, searchRoleFamily: extractRoleFamily(keyword) })));
        await delay(SEARCH_DELAY_MS);
      } catch (err) {
        const status = err.response?.status;
        rateLimit.recordFailure(status);
        console.error(`   ⏭️ ${keyword}/${location} page ${page + 1}: ${status || err.message}`);
        if (rateLimit.shouldStop) {
          console.log(
            `   🛑 ${rateLimit.consecutive429s} consecutive 429s — aborting search phase`,
          );
          stats.rateLimitStopped = true;
          break outer;
        }
        break; // stop paging this pair, try the next one
      }
    }
  }

  // 2) De-duplicate across searches.
  const unique = [...new Map(cards.map((c) => [c.source_job_id, c])).values()];
  stats.unique = unique.length;
  console.log(`\n📦 ${cards.length} cards -> ${unique.length} unique`);

  // 3) Fetch details, normalize, save in batches as we go.
  let batch = [];
  let n = 0;
  for (const job of unique) {
    n++;
    const parsed = await fetchJobDetails(job);
    if (!parsed) {
      stats.failed++;
      await delay(DETAIL_DELAY_MS);
      continue;
    }
    stats.detailed++;

    const loc = parsed.location || job.location || "";
    if (loc && !US_LOCATION.test(loc)) {
      stats.skipped++;
      await delay(DETAIL_DELAY_MS);
      continue;
    }

    batch.push(await toRow(job, parsed));
    if (n % 25 === 0) console.log(`   ...${n}/${unique.length} detailed`);
    if (batch.length >= 100) {
      await saveJobs(batch, stats);
      batch = [];
    }
    await delay(DETAIL_DELAY_MS);
  }
  await saveJobs(batch, stats);

  // 4) Deactivate stale LinkedIn postings not seen recently.
  await deactivateStale("linkedin", 30 * 24);

  console.log("\n==========================================");
  console.log("✅ LinkedIn Collector Finished");
  console.log("==========================================");
  console.table(stats);
  console.log("==========================================\n");

  return stats;
}

runCollector(import.meta.url, collectLinkedInJobs);
