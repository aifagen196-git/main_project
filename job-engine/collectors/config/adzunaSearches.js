// collectors/config/adzunaSearches.js
//
// Keyword searches against the Adzuna Jobs API (api.adzuna.com), a general
// aggregator with a genuinely free tier (unlike JSearch's paid-plan quota).
// Adzuna's `category` values (see ADZUNA_CATEGORY below) let a query target
// a specific job family, which JSearch's free-text-only search can't do —
// useful for pulling business-analyst/data-analyst/supply-chain postings
// that get drowned out in a generic "engineer" search.
//
// `category` is optional per entry; omit it to search that `what` term
// across all Adzuna categories.

const searches = [
  { what: "business analyst", category: "accounting-finance-jobs" },
  { what: "data analyst", category: "it-jobs" },
  { what: "data center technician", category: "it-jobs" },
  { what: "network engineer", category: "it-jobs" },
  { what: "full stack developer", category: "it-jobs" },
  { what: "devops engineer", category: "it-jobs" },
  { what: "supply chain", category: "logistics-warehouse-jobs" },
  { what: "supply chain analyst", category: "logistics-warehouse-jobs" },
  { what: "systems administrator", category: "it-jobs" },
  { what: "cloud engineer", category: "it-jobs" },
  { what: "cybersecurity analyst", category: "it-jobs" },

  // Additional domain coverage, added 2026-08-12.
  { what: "data scientist", category: "it-jobs" },
  { what: "SAP consultant", category: "it-jobs" },
  { what: "SAP analyst", category: "it-jobs" },
  { what: "machine learning engineer", category: "it-jobs" },
  { what: "AI engineer", category: "it-jobs" },
  { what: "IT support specialist", category: "it-jobs" },
  { what: "help desk technician", category: "it-jobs" },
  { what: "automotive validation engineer", category: "engineering-jobs" },

  // Experience-level variants, added 2026-08-12.
  { what: "entry level data analyst", category: "it-jobs" },
  { what: "senior data analyst", category: "it-jobs" },
  { what: "entry level business analyst", category: "accounting-finance-jobs" },
  { what: "senior business analyst", category: "accounting-finance-jobs" },
  { what: "entry level network engineer", category: "it-jobs" },
  { what: "senior network engineer", category: "it-jobs" },
  { what: "entry level devops engineer", category: "it-jobs" },
  { what: "senior devops engineer", category: "it-jobs" },

  // User's role list, added 2026-08-20 — combined "AI/ML engineer" phrasing
  // wasn't in here yet (only the separate "AI engineer" / "machine learning
  // engineer" terms above), plus entry/senior variants for the rest of the
  // list that didn't already have them.
  { what: "AI/ML engineer", category: "it-jobs" },
  { what: "entry level AI/ML engineer", category: "it-jobs" },
  { what: "senior AI/ML engineer", category: "it-jobs" },
  { what: "entry level full stack developer", category: "it-jobs" },
  { what: "senior full stack developer", category: "it-jobs" },
  { what: "entry level IT support specialist", category: "it-jobs" },
  { what: "senior IT support specialist", category: "it-jobs" },
  { what: "entry level supply chain analyst", category: "logistics-warehouse-jobs" },
  { what: "senior supply chain analyst", category: "logistics-warehouse-jobs" },
  { what: "entry level data center technician", category: "it-jobs" },
  { what: "senior data center technician", category: "it-jobs" },
];

export default searches;
