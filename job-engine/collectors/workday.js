import axios from "axios";
import { withRunLog } from "./runLog.js";
import path from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { normalizeWorkday } from "./normalize/normalizeWorkday.js";
import companies from "./config/workdayCompanies.js";
import { isUsJob } from "./lib/isUsJob.js";

dotenv.config({ path: ".env" });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// =============================================
// CONFIG
// =============================================
// Workday has no public multi-tenant discovery API like Greenhouse — every
// company is its own walled-off instance (own host shard + arbitrary siteId).
// This collector loops the same per-tenant cxs API logic over a hand-verified
// list in config/workdayCompanies.js rather than crawling for tenants.

const SCRAPE_LAST_HOURS = Number(process.env.SCRAPE_LAST_HOURS || 24);
const PAGE_SIZE = 20;
const DETAIL_CONCURRENCY = Number(process.env.DETAIL_CONCURRENCY || 8);
// How many facets deep to keep splitting a query that hits the tenant's
// offset cap. Each extra level only costs requests on the branches that are
// still clamped after the previous split — most tenants never recurse this
// deep at all. Verified against Target (2026-08-12): splitting by state alone
// (depth 1) got to 12,040/~12,063 possible postings, with one state+category
// intersection still clamped at depth 2 — depth 3 is the margin for that kind
// of rare double-clamp rather than the common case.
const MAX_PARTITION_DEPTH = Number(process.env.MAX_PARTITION_DEPTH || 3);

// Optional comma-separated allowlist, for scraping a newly-added tenant
// without re-running the whole list (a full pass is dominated by the largest
// tenants — CVS alone is ~19k detail requests). Unset means "all".
//
// This also narrows the stale-deactivation pass at the end of the run: with a
// filter active, only the selected companies are considered, so a partial run
// can't mark every other tenant's jobs inactive just because they weren't
// touched.
const ONLY_COMPANIES = (process.env.ONLY_COMPANIES || "")
  .split(",")
  .map((c) => c.trim().toLowerCase())
  .filter(Boolean);

const selectedCompanies = ONLY_COMPANIES.length
  ? companies.filter((c) => ONLY_COMPANIES.includes(c.company.toLowerCase()))
  : companies;

// Optional cap on how many listings to collect per company, for trying a
// large or newly-added tenant (CVS's ~19k reqs) on a small slice before
// committing to a full pass. 0/unset means "no cap". This only shortens
// pagination — it doesn't skip the clamp-detection/facet-split path, so a
// capped run against a clamped tenant like Target still exercises that logic
// correctly, just against a smaller slice.
const MAX_LISTINGS_PER_COMPANY = Number(process.env.MAX_LISTINGS_PER_COMPANY || 0);

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
  // Smaller than the other collectors' 500-row CHUNK: Workday descriptions
  // run much longer (full HTML job postings), and 500-row batches of those
  // were hitting Postgres's statement timeout during testing. Tenants with
  // especially long descriptions (CVS averages ~23k chars) can still time out
  // at 100 — drop SAVE_CHUNK for those rather than losing whole batches.
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

async function fetchListingsPage(tenantBase, appliedFacets, offset, attempt = 1) {
  try {
    const response = await axios.post(`${tenantBase}/jobs`, {
      appliedFacets,
      limit: PAGE_SIZE,
      offset,
      searchText: "",
    });
    return {
      postings: response.data?.jobPostings || [],
      total: response.data?.total,
      facets: response.data?.facets || [],
    };
  } catch (err) {
    // Transient resets happen mid-pagination on the larger tenants (NVIDIA's
    // ~3k listings take enough requests that one connection reset is
    // expected) — one retry recovers most of these instead of truncating
    // the whole company's listing set.
    if (attempt < 3) {
      return fetchListingsPage(tenantBase, appliedFacets, offset, attempt + 1);
    }
    console.error(`❌ Failed to fetch listings page at offset ${offset}: ${err.message}`);
    return null;
  }
}

/**
 * Paginate one facet selection to exhaustion.
 *
 * Returns `{ clamped, facets }`. `clamped` means the tenant stopped advancing
 * the offset while still serving full pages — the caller then has to split the
 * query up to reach the rest (see collectListings).
 */
async function paginateSelection(tenantBase, appliedFacets, seen) {
  let offset = 0;
  let facets = [];
  let previousPageKey = null;

  while (true) {
    const page = await fetchListingsPage(tenantBase, appliedFacets, offset);
    if (page === null) return { clamped: false, facets };
    if (offset === 0) facets = page.facets;

    // Workday's offset pagination can return overlapping postings across
    // pages on tenants with thousands of listings (the underlying result set
    // shifts slightly mid-scrape) — dedupe by externalPath so the same job
    // isn't fetched/normalized/upserted multiple times in one run (which was
    // also causing "ON CONFLICT DO UPDATE... affect row a second time"
    // errors when duplicates landed in the same save batch).
    for (const posting of page.postings) {
      if (posting.externalPath) seen.set(posting.externalPath, posting);
    }

    if (MAX_LISTINGS_PER_COMPANY && seen.size >= MAX_LISTINGS_PER_COMPANY) {
      console.log(`   ⚙ MAX_LISTINGS_PER_COMPANY reached (${seen.size}) — stopping this slice early`);
      return { clamped: false, facets };
    }

    // Workday's `total` field is only reliable on the first page — it
    // comes back as 0 on subsequent pages even though real postings are
    // still returned, so a short/empty page (not `total`) is what
    // actually signals the last page.
    offset += PAGE_SIZE;
    if (page.postings.length < PAGE_SIZE) return { clamped: false, facets };

    // ...except on tenants that cap how deep the offset will go. Target stops
    // advancing at offset 2000 and re-serves that same full page forever
    // (confirmed: offsets 2000, 2020, 3000 and 5000 return identical
    // postings), so the short-page check never fires.
    //
    // Detect that by comparing consecutive pages, NOT by asking whether the
    // page added anything new to `seen`. `seen` is shared across every facet
    // slice, so a slice whose postings were already collected by an earlier
    // pass adds nothing on its very first page and would look clamped
    // immediately — which silently truncated the split to 3,674 of Target's
    // ~12,000 postings before this was caught. Two identical consecutive
    // pages is the actual signature of the cap.
    const pageKey = page.postings.map((p) => p.externalPath).join("|");
    if (pageKey === previousPageKey) return { clamped: true, facets };
    previousPageKey = pageKey;

    // Backstop: no tenant in config has six figures of postings, so an offset
    // this deep means a pagination pattern we haven't seen rather than real
    // data. Bail instead of looping forever.
    if (offset > 100000) {
      console.log(`   ⚠ abandoning pagination at offset ${offset} — unexpected paging behaviour`);
      return { clamped: false, facets };
    }
  }
}

/**
 * Facets usable for splitting a clamped query: multi-valued, and every value
 * carries an id and a real count. Ordered by largest bucket ascending, so the
 * facet that divides the result set most evenly is tried first.
 *
 * `locationMainGroup` and `distance` are naturally excluded — their values
 * come back with undefined ids/counts and aren't real filters.
 */
function partitionCandidates(facets) {
  return (facets || [])
    .filter(
      (f) =>
        f.facetParameter &&
        Array.isArray(f.values) &&
        f.values.length > 1 &&
        f.values.every((v) => v.id && Number.isFinite(v.count)),
    )
    .sort(
      (a, b) =>
        Math.max(...a.values.map((v) => v.count)) -
        Math.max(...b.values.map((v) => v.count)),
    );
}

/**
 * Collect every reachable posting, splitting the query by facet whenever the
 * tenant's offset cap gets in the way.
 *
 * This matters more than it sounds. Target reports `total: 2000` and refuses
 * to page past it, but its own facet counts add up to ~12,000 postings — so
 * plain pagination silently collected 16% of the board and looked successful.
 * Filtering by state brings each slice under the cap (California, the largest,
 * is 1,634) and the slices are disjoint, so the union is the full set.
 *
 * Recursion handles tenants where one facet isn't enough to get under the cap:
 * a slice that still clamps is split again by the next-best facet.
 */
async function collectListings(
  tenantBase,
  seen,
  appliedFacets = {},
  usedFacets = new Set(),
  depth = 0,
) {
  const { clamped, facets } = await paginateSelection(tenantBase, appliedFacets, seen);
  if (!clamped) return;

  const candidates = partitionCandidates(facets).filter(
    (f) => !usedFacets.has(f.facetParameter),
  );

  if (!candidates.length || depth >= MAX_PARTITION_DEPTH) {
    console.log(
      `   ⚠ offset cap hit with no facet left to split on — ` +
        `${seen.size} postings reachable, some are not`,
    );
    return;
  }

  const facet = candidates[0];
  if (depth === 0) {
    console.log(
      `   ↳ offset cap hit — splitting by ${facet.facetParameter} (${facet.values.length} values)`,
    );
  }

  for (const value of facet.values) {
    if (MAX_LISTINGS_PER_COMPANY && seen.size >= MAX_LISTINGS_PER_COMPANY) break;
    await collectListings(
      tenantBase,
      seen,
      { ...appliedFacets, [facet.facetParameter]: [value.id] },
      new Set([...usedFacets, facet.facetParameter]),
      depth + 1,
    );
  }
}

async function fetchAllListings(tenantBase) {
  const seen = new Map();
  await collectListings(tenantBase, seen);

  return [...seen.values()];
}

// =============================================
// FETCH JOB DETAILS
// =============================================

async function fetchJobDetails(tenantBase, externalPath) {
  try {
    const response = await axios.get(`${tenantBase}${externalPath}`);
    return response.data;
  } catch (err) {
    console.error(`❌ Failed details ${externalPath}`);
    return null;
  }
}

// =============================================
// MAIN
// =============================================

async function run() {
  console.log("\n==========================================");
  console.log("🚀 Workday Collector Started");
  console.log("==========================================\n");

  if (ONLY_COMPANIES.length) {
    console.log(`⚙ ONLY_COMPANIES active — ${selectedCompanies.length} of ${companies.length} tenants\n`);
  }

  for (const { company, host, siteId } of selectedCompanies) {
    try {
      stats.companies++;

      const tenantBase = `https://${company}.${host}.myworkdayjobs.com/wday/cxs/${company}/${siteId}`;
      const applyBase = `https://${company}.${host}.myworkdayjobs.com/${siteId}`;

      const listings = await fetchAllListings(tenantBase);
      stats.fetched += listings.length;

      console.log(`\n🏢 ${company.toUpperCase()} (${listings.length} jobs)`);

      // The Workday jobs list only ever returns currently-active postings
      // (there's no way to ask for "everything, including closed roles"), so
      // every listing here is current by definition — no freshness pre-filter
      // needed. The final last_seen-based deactivation pass handles staleness
      // across runs.
      const normalized = [];
      let idx = 0;
      await Promise.all(
        Array.from({ length: Math.min(DETAIL_CONCURRENCY, listings.length) }, async () => {
          while (idx < listings.length) {
            const listing = listings[idx++];
            const details = await fetchJobDetails(tenantBase, listing.externalPath);
            if (!details) {
              stats.failed++;
              continue;
            }
            const applyUrl = `${applyBase}${listing.externalPath}`;
            const normalizedJob = await normalizeWorkday(listing, details, company, applyUrl);
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

  const staleCutoff = new Date(
    Date.now() - SCRAPE_LAST_HOURS * 60 * 60 * 1000,
  ).toISOString();
  let deactivation = supabase
    .from("jobs")
    .update({ is_active: false })
    .lt("last_seen", staleCutoff)
    .eq("is_active", true)
    .eq("source", "workday");

  // A filtered run only refreshed `last_seen` for the selected tenants, so
  // deactivating on source alone would retire every other tenant's jobs.
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
  if (deErr) console.error(`⚠ Deactivation pass failed: ${deErr.message}`);
  else console.log(`🗑 Deactivated ${count ?? 0} stale jobs`);

  console.log("\n==========================================");
  console.log("✅ Workday Collector Finished");
  console.log("==========================================");

  console.table(stats);

  console.log("==========================================\n");
}

// CLI-only guard — this file used to call run() unconditionally at
// import time, which meant `import()`-ing it for any reason (a test
// harness, a future registry, etc.) triggered a real scrape/save run as a
// side effect. Only run when invoked directly (node collectors/workday.js),
// matching every other collector in this repo (see runtime.js).
const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(path.resolve(entrypoint)).href) {
  withRunLog("workday", run);
}
