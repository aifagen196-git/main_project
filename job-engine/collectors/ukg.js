import axios from "axios";
import { withRunLog } from "./runLog.js";
import path from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizeUkg } from "./normalize/normalizeUkg.js";
import companies from "./config/ukgCompanies.js";
import { isUsJob } from "./lib/isUsJob.js";

dotenv.config({ path: ".env" });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// =============================================
// CONFIG
// =============================================
// UKG Pro Recruiting (formerly UltiPro) has no multi-tenant discovery --
// every customer's board lives at recruiting.ultipro.com/{CompanyCode}/
// JobBoard/{boardGuid}, where CompanyCode is an internal UKG account code
// (not derivable from the company name) and boardGuid is a random GUID.
// config/ukgCompanies.js is hand-verified, same situation as Workday/Oracle.

const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);
const PAGE_SIZE = 50;
const DETAIL_CONCURRENCY = Number(process.env.DETAIL_CONCURRENCY || 5);

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// =============================================
// STATS
// =============================================

const stats = {
  companies: 0,
  fetched: 0,
  skipped: 0,
  processed: 0,
  saved: 0,
  failed: 0,
  nonUs: 0,
};

// =============================================
// SAVE JOB
// =============================================

async function saveJobs(jobs) {
  if (!jobs.length) return;
  const CHUNK = 500;
  for (let i = 0; i < jobs.length; i += CHUNK) {
    const batch = jobs.slice(i, i + CHUNK);
    const { error } = await supabase
      .from("jobs")
      .upsert(batch, { onConflict: "source,source_job_id" });
    if (error) {
      stats.failed += batch.length;
      console.error(`❌ batch of ${batch.length} failed: ${error.message}`);
      continue;
    }
    stats.saved += batch.length;
  }
}

// =============================================
// FETCH LISTINGS
// =============================================

/**
 * UKG's board renders its list via a POST to LoadSearchResults, which
 * returns { opportunities: [...], totalCount }. Each row already has
 * Title/Locations/PostedDate but only a truncated BriefDescription -- the
 * full posting needs the detail page.
 */
async function fetchListingsPage(boardBase, top, skip) {
  const { data } = await axios.post(
    `${boardBase}/JobBoardView/LoadSearchResults`,
    {
      opportunitySearch: {
        Top: top,
        Skip: skip,
        QueryString: "",
        OrderBy: [
          {
            Value: "postedDateDesc",
            PropertyName: "PostedDate",
            Ascending: false,
          },
        ],
        Filters: [],
      },
      matchCriteria: {
        PreferredJobs: [],
        Educations: [],
        LicenseAndCertifications: [],
        Skills: [],
        hasNoLicenses: false,
        SkippedSkills: [],
      },
    },
    {
      timeout: 20000,
      headers: { "Content-Type": "application/json", "User-Agent": UA },
    },
  );

  return {
    opportunities: data?.opportunities || [],
    totalCount: Number(data?.totalCount) || 0,
  };
}

async function fetchAllListings(boardBase) {
  const all = [];
  let skip = 0;

  while (true) {
    const { opportunities, totalCount } = await fetchListingsPage(
      boardBase,
      PAGE_SIZE,
      skip,
    );
    if (!opportunities.length) break;

    all.push(...opportunities);

    skip += PAGE_SIZE;
    if (all.length >= totalCount || opportunities.length < PAGE_SIZE) break;
  }

  return all;
}

// =============================================
// FETCH JOB DETAILS
// =============================================

/**
 * The full posting (rich-text Description included) isn't in any JSON API --
 * it's bootstrapped straight into the OpportunityDetail HTML page as
 * `new US.Opportunity.CandidateOpportunityDetail({...})`. A brace-depth scan
 * (rather than a regex) pulls that object out, since the JSON itself
 * contains `{` and `}` inside the HTML description field.
 */
function extractBootstrapJson(html) {
  const anchor = "US.Opportunity.CandidateOpportunityDetail(";
  const start = html.indexOf(anchor);
  if (start === -1) return null;

  let i = start + anchor.length;
  let depth = 0;
  let inString = false;
  let escaped = false;
  const jsonStart = i;

  for (; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
    }
  }

  try {
    return JSON.parse(html.slice(jsonStart, i));
  } catch {
    return null;
  }
}

async function fetchOpportunityDetail(boardBase, opportunityId) {
  try {
    const { data: html } = await axios.get(
      `${boardBase}/OpportunityDetail`,
      {
        params: { opportunityId },
        timeout: 20000,
        headers: { "User-Agent": UA },
      },
    );

    return extractBootstrapJson(html);
  } catch (err) {
    console.error(`❌ Failed details for ${opportunityId}`);
    return null;
  }
}

// =============================================
// MAIN
// =============================================

async function run() {
  console.log("\n==========================================");
  console.log("🚀 UKG Collector Started");
  console.log("==========================================\n");

  for (const { company, companyCode, boardGuid } of companies) {
    try {
      stats.companies++;

      const boardBase = `https://recruiting.ultipro.com/${companyCode}/JobBoard/${boardGuid}`;

      const listings = await fetchAllListings(boardBase);
      stats.fetched += listings.length;

      console.log(`\n🏢 ${company.toUpperCase()} (${listings.length} jobs)`);

      // LoadSearchResults only ever returns currently-posted opportunities,
      // so no freshness pre-filter is needed -- staleness handled below.
      const normalized = [];
      let idx = 0;
      await Promise.all(
        Array.from({ length: Math.min(DETAIL_CONCURRENCY, listings.length) }, async () => {
          while (idx < listings.length) {
            const listing = listings[idx++];

            const opportunity = await fetchOpportunityDetail(boardBase, listing.Id);
            if (!opportunity) {
              stats.failed++;
              continue;
            }

            const applyUrl = `${boardBase}/OpportunityDetail?opportunityId=${listing.Id}`;
            const normalizedJob = await normalizeUkg(opportunity, company, applyUrl);
            if (!isUsJob(normalizedJob)) {
              stats.nonUs++;
              continue;
            }
            normalized.push(normalizedJob);
            stats.processed++;
          }
        }),
      );

      await saveJobs(normalized);
      if (normalized.length) console.log(`   💾 saved ${normalized.length}`);
    } catch (err) {
      console.error(`\n❌ Company failed: ${company}`);
      console.error(err.message);
    }
  }

  // =============================================
  // DEACTIVATE STALE JOBS
  // =============================================

  const staleCutoff = new Date(
    Date.now() - SCRAPE_LAST_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const { error: deErr, count } = await supabase
    .from("jobs")
    .update({ is_active: false })
    .lt("last_seen", staleCutoff)
    .eq("source", "ukg")
    .eq("is_active", true)
    .select("id", { count: "exact", head: true });

  if (deErr) {
    console.error(`⚠ Deactivation failed: ${deErr.message}`);
  } else {
    console.log(`🗑 Deactivated ${count ?? 0} stale jobs`);
  }

  console.log("\n==========================================");
  console.log("✅ UKG Collector Finished");
  console.log("==========================================");

  console.table(stats);

  console.log("==========================================\n");
}

// CLI-only guard — this file used to call run() unconditionally at
// import time, which meant `import()`-ing it for any reason (a test
// harness, a future registry, etc.) triggered a real scrape/save run as a
// side effect. Only run when invoked directly (node collectors/ukg.js),
// matching every other collector in this repo (see runtime.js).
const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(path.resolve(entrypoint)).href) {
  withRunLog("ukg", run);
}
