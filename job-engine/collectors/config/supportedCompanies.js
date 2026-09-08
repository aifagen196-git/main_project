// collectors/config/supportedCompanies.js
//
// One place to answer "which companies do we actually collect from, and
// through which collector?" — derived from the per-ATS config lists rather
// than hand-maintained, so it can't drift out of date the way a checked-in
// list would.
//
// Run it directly for a human-readable roster:
//
//   node config/supportedCompanies.js          # counts per source
//   node config/supportedCompanies.js --list   # every company, grouped
//   node config/supportedCompanies.js walmart  # which source covers X
//
// Two collectors are deliberately absent: `kforce` scrapes a single fixed
// board and has no config list, and `indeed`/`jsearch` are keyword-driven
// aggregators rather than per-company boards (their coverage is whatever
// the query returns, so they're reported separately as UNVERIFIED_SOURCES).

import ashby from "./ashbyCompanies.js";
import avature from "./avatureCompanies.js";
import bamboohr from "./bamboohrCompanies.js";
import breezyhr from "./breezyhrCompanies.js";
import comeet from "./comeetCompanies.js";
import greenhouse from "./greenhouseCompanies.js";
import himalayas from "./himalayasCompanies.js";
import icims from "./icimsCompanies.js";
import jazzhr from "./jazzhrCompanies.js";
import jobvite from "./jobviteCompanies.js";
import lever from "./leverCompanies.js";
import oracle from "./oracleCompanies.js";
import personio from "./personioCompanies.js";
import pinpoint from "./pinpointCompanies.js";
import recruitee from "./recruiteeCompanies.js";
import remoteok from "./remoteokCompanies.js";
import smartrecruiters from "./smartrecruitersCompanies.js";
import successfactors from "./successfactorsCompanies.js";
import teamtailor from "./teamtailorCompanies.js";
import ukg from "./ukgCompanies.js";
import weworkremotely from "./weworkremotelyCompanies.js";
import workable from "./workableCompanies.js";
import workday from "./workdayCompanies.js";

const RAW = {
  ashby,
  avature,
  bamboohr,
  breezyhr,
  comeet,
  greenhouse,
  himalayas,
  icims,
  jazzhr,
  jobvite,
  lever,
  oracle,
  personio,
  pinpoint,
  recruitee,
  remoteok,
  smartrecruiters,
  successfactors,
  teamtailor,
  ukg,
  weworkremotely,
  workable,
  workday,
};

/**
 * The config lists don't share a shape — some are bare slug strings
 * (Greenhouse, Lever, ...), others are objects keyed on `company` (Workday,
 * Oracle, iCIMS, ...) or `name` (Comeet). Reduce all of them to one label.
 */
function label(entry) {
  if (typeof entry === "string") return entry;
  return entry.company ?? entry.name ?? entry.slug ?? JSON.stringify(entry);
}

/** { [source]: string[] } — company labels per collector, sorted. */
export const SUPPORTED_COMPANIES = Object.fromEntries(
  Object.entries(RAW).map(([source, entries]) => [
    source,
    entries.map(label).sort((a, b) => a.localeCompare(b)),
  ]),
);

/**
 * Keyword-driven collectors. These have no fixed company list — coverage is
 * whatever the search returns on a given run, so a company appearing here is
 * "reachable", not "guaranteed present". Walmart and Verizon are covered
 * only this way; see SUPPORTED_COMPANIES.md for why they have no board
 * collector of their own.
 */
export const UNVERIFIED_SOURCES = {
  jsearch: "keyword + employer queries — see jsearchSearches.js",
  indeed: "keyword + location queries — see indeedSearches.js",
  usajobs: "federal-agency keyword queries — see usajobsSearches.js (needs USAJOBS_API_KEY)",
  adzuna: "keyword + category queries — see adzunaSearches.js (needs ADZUNA_APP_ID/APP_KEY)",
  remotive: "keyword queries, no key required — see remotiveSearches.js",
  arbeitnow: "keyword queries, no key required — see arbeitnowSearches.js",
  jobicy: "tag queries, no key required — see jobicySearches.js",
  muse: "category queries, no key required — see museCategories.js",
  hackernews: "keyword filters over the monthly 'Who is hiring?' thread, no key required — see hackernewsSearches.js",
  jooble: "keyword queries, needs JOOBLE_API_KEY (free) — see joobleSearches.js",
  careerjet: "keyword queries, needs CAREERJET_API_KEY (free, manual approval) — see careerjetSearches.js",
  findwork: "keyword queries, needs FINDWORK_API_KEY (free) — see findworkSearches.js",
  workingnomads: "single flat feed of currently-live postings, no key, no query params — see workingnomads.js",
};

/** Total distinct company labels across all board collectors. */
export function totalCompanies() {
  return new Set(Object.values(SUPPORTED_COMPANIES).flat().map((c) => c.toLowerCase())).size;
}

/** Sources covering a company, matched case-insensitively on substrings. */
export function findCompany(query) {
  const q = query.toLowerCase();
  const hits = [];
  for (const [source, list] of Object.entries(SUPPORTED_COMPANIES)) {
    for (const company of list) {
      if (company.toLowerCase().includes(q)) hits.push({ source, company });
    }
  }
  return hits;
}

export default SUPPORTED_COMPANIES;

// =============================================
// CLI
// =============================================

// `import.meta.main` isn't available on the Node versions this repo targets,
// so fall back to comparing argv[1] against this module's own path.
const invokedDirectly =
  process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop());

if (invokedDirectly) {
  const args = process.argv.slice(2);
  const query = args.find((a) => !a.startsWith("--"));

  if (query) {
    const hits = findCompany(query);
    if (!hits.length) {
      console.log(`No board collector covers "${query}".`);
      console.log(`Keyword sources that might still surface it: ${Object.keys(UNVERIFIED_SOURCES).join(", ")}`);
    } else {
      for (const { source, company } of hits) console.log(`${source.padEnd(18)} ${company}`);
    }
  } else {
    const rows = Object.entries(SUPPORTED_COMPANIES)
      .map(([source, list]) => ({ source, companies: list.length }))
      .sort((a, b) => b.companies - a.companies);
    console.table(rows);
    console.log(`${rows.length} board collectors, ${totalCompanies()} distinct companies.`);
    console.log(`Keyword-driven (no fixed list): ${Object.keys(UNVERIFIED_SOURCES).join(", ")}`);

    if (args.includes("--list")) {
      for (const [source, list] of Object.entries(SUPPORTED_COMPANIES)) {
        console.log(`\n## ${source} (${list.length})`);
        console.log(list.join(", "));
      }
    }
  }
}
