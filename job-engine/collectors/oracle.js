import axios from "axios";
import path from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizeOracle } from "./normalize/normalizeOracle.js";
import companies from "./config/oracleCompanies.js";
import { isUsJob } from "./lib/isUsJob.js";

dotenv.config({ path: ".env" });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// =============================================
// CONFIG
// =============================================
// Oracle Recruiting Cloud (Fusion HCM) has no multi-tenant discovery, same
// situation as Workday: every customer runs its own pod (a random 4-letter
// subdomain like "eklm") + region shard (us2, em2, us6, ...) + a `siteNumber`
// naming their specific career site ("CX", "CX_1", ...). None of that is
// derivable from the company name, so config/oracleCompanies.js is a
// hand-verified list, not a slug list.

const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);
const PAGE_SIZE = 100;
const DETAIL_CONCURRENCY = Number(process.env.DETAIL_CONCURRENCY || 8);

// Optional comma-separated allowlist, so a newly-added tenant can be scraped
// on its own instead of re-running every tenant. Unset means "all". Mirrors
// the same flag in workday.js, including its effect on the deactivation pass
// below: a filtered run must not retire jobs it never looked at.
const ONLY_COMPANIES = (process.env.ONLY_COMPANIES || "")
  .split(",")
  .map((c) => c.trim().toLowerCase())
  .filter(Boolean);

const selectedCompanies = ONLY_COMPANIES.length
  ? companies.filter((c) => ONLY_COMPANIES.includes(c.company.toLowerCase()))
  : companies;

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
  // Oracle descriptions run long (full HTML postings, same as Workday) —
  // smaller chunks to stay clear of Postgres's statement timeout. 100 is
  // still too large for some tenants: Dell's postings are long enough that a
  // 100-row upsert reliably fails with "canceling statement due to statement
  // timeout", losing the whole batch. Tune down per-tenant via SAVE_CHUNK.
  const CHUNK = Number(process.env.SAVE_CHUNK || 100);
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
 * Oracle's Candidate Experience REST API. Listings come from
 * `recruitingCEJobRequisitions` with a `findReqs` finder (siteNumber + an
 * offset/limit page); each row already carries a short description
 * (`ShortDescriptionStr`) and `PrimaryLocationCountry`, but the full posting
 * needs a second call per job to `recruitingCEJobRequisitionDetails` with
 * finder `ById;Id="...",siteNumber="..."` (note: NOT `ByRequisitionId` --
 * that name looks right but 400s; confirmed via the resource's own
 * `/describe` endpoint, which only lists `ById` and `ByIdNoCache`).
 */
async function fetchListingsPage(tenantBase, siteNumber, offset) {
  const finder = `findReqs;siteNumber=${siteNumber},limit=${PAGE_SIZE},offset=${offset},sortBy=POSTING_DATES_DESC`;

  const { data } = await axios.get(
    `${tenantBase}/hcmRestApi/resources/latest/recruitingCEJobRequisitions`,
    {
      timeout: 20000,
      params: {
        onlyData: true,
        expand: "requisitionList.secondaryLocations",
        finder,
      },
      headers: { Accept: "application/json", "User-Agent": UA },
    },
  );

  const item = data?.items?.[0] || {};
  return {
    listings: item.requisitionList || [],
    total: Number(item.TotalJobsCount) || 0,
  };
}

async function fetchAllListings(tenantBase, siteNumber) {
  const all = [];
  let offset = 0;

  while (true) {
    const { listings, total } = await fetchListingsPage(
      tenantBase,
      siteNumber,
      offset,
    );
    if (!listings.length) break;

    all.push(...listings);

    offset += PAGE_SIZE;
    if (all.length >= total || listings.length < PAGE_SIZE) break;
  }

  return all;
}

// =============================================
// FETCH JOB DETAILS
// =============================================

async function fetchJobDetails(tenantBase, siteNumber, id) {
  try {
    const finder = `ById;Id="${id}",siteNumber="${siteNumber}"`;

    const { data } = await axios.get(
      `${tenantBase}/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails`,
      {
        timeout: 20000,
        params: { onlyData: true, expand: "all", finder },
        headers: { Accept: "application/json", "User-Agent": UA },
      },
    );

    return data?.items?.[0] || null;
  } catch (err) {
    console.error(`❌ Failed details for req ${id}`);
    return null;
  }
}

// =============================================
// MAIN
// =============================================

async function run() {
  console.log("\n==========================================");
  console.log("🚀 Oracle Recruiting Cloud Collector Started");
  console.log("==========================================\n");

  if (ONLY_COMPANIES.length) {
    console.log(`⚙ ONLY_COMPANIES active — ${selectedCompanies.length} of ${companies.length} tenants\n`);
  }

  for (const { company, pod, region, siteNumber, host } of selectedCompanies) {
    try {
      stats.companies++;

      // Most tenants are reachable at their raw pod host. Some customers put
      // the Candidate Experience app behind their own domain instead (Dell
      // serves it from enterpriseplatform.dell.com) and the pod host is then
      // unroutable from outside — an optional `host` overrides the derived
      // one. The REST paths underneath are identical either way.
      const tenantBase = host
        ? `https://${host}`
        : `https://${pod}.fa.${region}.oraclecloud.com`;
      const applyBase = `${tenantBase}/hcmUI/CandidateExperience/en/sites/${siteNumber}/job`;

      const listings = await fetchAllListings(tenantBase, siteNumber);
      stats.fetched += listings.length;

      console.log(`\n🏢 ${company.toUpperCase()} (${listings.length} jobs)`);

      // The requisitions list only returns currently-posted reqs, so no
      // freshness pre-filter is needed -- same convention as Workday.
      const normalized = [];
      let idx = 0;
      await Promise.all(
        Array.from({ length: Math.min(DETAIL_CONCURRENCY, listings.length) }, async () => {
          while (idx < listings.length) {
            const listing = listings[idx++];

            // Country is already reliable on the list row -- skip the
            // detail fetch entirely for obviously non-US reqs rather than
            // paying for it and then discarding the result.
            const listCountry = (listing.PrimaryLocationCountry || "").toUpperCase();
            if (listCountry && listCountry !== "US") {
              stats.nonUs++;
              continue;
            }

            const detail = await fetchJobDetails(tenantBase, siteNumber, listing.Id);
            if (!detail) {
              stats.failed++;
              continue;
            }

            const applyUrl = `${applyBase}/${listing.Id}`;
            const normalizedJob = await normalizeOracle(listing, detail, company, applyUrl);
            if (!isUsJob(normalizedJob)) {
              stats.nonUs++;
              continue;
            }
            normalized.push(normalizedJob);
            stats.processed++;
          }
        }),
      );

      const savedBefore = stats.saved;
      await saveJobs(normalized);
      console.log(`   💾 saved ${stats.saved - savedBefore} / ${normalized.length}`);
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

  let deactivation = supabase
    .from("jobs")
    .update({ is_active: false })
    .lt("last_seen", staleCutoff)
    .eq("source", "oracle")
    .eq("is_active", true);

  if (ONLY_COMPANIES.length) {
    deactivation = deactivation.in(
      "company",
      selectedCompanies.map((c) => c.company),
    );
  }

  const { error: deErr, count } = await deactivation.select("id", {
    count: "exact",
    head: true,
  });

  if (deErr) {
    console.error(`⚠ Deactivation failed: ${deErr.message}`);
  } else {
    console.log(`🗑 Deactivated ${count ?? 0} stale jobs`);
  }

  console.log("\n==========================================");
  console.log("✅ Oracle Recruiting Cloud Collector Finished");
  console.log("==========================================");

  console.table(stats);

  console.log("==========================================\n");
}

// CLI-only guard — this file used to call run() unconditionally at
// import time, which meant `import()`-ing it for any reason (a test
// harness, a future registry, etc.) triggered a real scrape/save run as a
// side effect. Only run when invoked directly (node collectors/oracle.js),
// matching every other collector in this repo (see runtime.js).
const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(path.resolve(entrypoint)).href) {
  run();
}
