// collectors/config/jobicySearches.js
//
// Tag searches against the Jobicy public API (jobicy.com/api/v2) — no key
// required. Jobicy is remote-only and supports a `geo` filter server-side
// (unlike Remotive/Arbeitnow, which have no such param), so every search
// here is pre-filtered to geo=usa at the collector level rather than relying
// solely on isUsJob after the fact.
//
// `tag` values are Jobicy's own free-text tag search (not a fixed
// taxonomy — bad tags just return 0 results, not an error), confirmed
// working: devops, business, data, network, supply-chain.

const searches = [
  { tag: "business analyst" },
  { tag: "data analyst" },
  { tag: "network engineer" },
  { tag: "full stack" },
  { tag: "devops" },
  { tag: "supply chain" },
  { tag: "cloud" },

  // Additional domain coverage, added 2026-08-12.
  { tag: "data science" },
  { tag: "machine learning" },
  { tag: "sap" },

  // Additional domain coverage, added 2026-08-20 — each probed live for a
  // non-zero jobCount. Note: Jobicy rejects tags under 3 chars, which is why
  // this is "quality assurance" rather than "qa".
  { tag: "data engineer" },
  { tag: "backend" },
  { tag: "frontend" },
  { tag: "site reliability" },
  { tag: "security" },
  { tag: "product manager" },
  { tag: "project manager" },
  { tag: "quality assurance" },
  { tag: "cybersecurity" },
];

export default searches;
