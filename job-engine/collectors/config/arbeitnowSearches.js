// collectors/config/arbeitnowSearches.js
//
// Keyword searches against the Arbeitnow public job-board API
// (arbeitnow.com/api/job-board-api) — no key required. Their terms just ask
// for a link back and no abuse of the free tier (see the collector's
// REQUEST_DELAY_MS).
//
// Arbeitnow is EU-headquartered and most listings are Berlin/Munich/etc —
// expect a low US-match yield after isUsJob filters, same as Pfizer's global
// Workday board. Kept in because "low yield" isn't "zero yield": their
// `location` field includes "Remote" often enough, and the API has no
// per-country param to pre-filter with, so a broad search is the only way
// to find the US-remote subset.

const searches = [
  { search: "business analyst" },
  { search: "data analyst" },
  { search: "network engineer" },
  { search: "full stack developer" },
  { search: "devops" },
  { search: "supply chain" },

  // Additional domain coverage, added 2026-08-12.
  { search: "data scientist" },
  { search: "machine learning" },
  { search: "SAP" },

  // Additional domain coverage, added 2026-08-20.
  { search: "data engineer" },
  { search: "backend" },
  { search: "frontend" },
  { search: "site reliability" },
  { search: "security engineer" },
  { search: "product manager" },
  { search: "project manager" },
  { search: "QA engineer" },
  { search: "cloud engineer" },
  { search: "cybersecurity" },
];

export default searches;
