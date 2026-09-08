// collectors/config/remoteokCompanies.js
//
// Optional allowlist for remoteok.js. RemoteOK's public /api feed is
// dominated by low-effort/spam postings (single-person "companies",
// outreach-blog listings, placeholder titles) far more than the other two
// aggregators — a snapshot of today's feed turned up ~80 distinct company
// names and only a handful were recognizable, legitimate employers. This
// list starts short and intentionally curated rather than padded with
// noise; add to it as real companies show up in future runs.
//
// EMPTY ARRAY = no filtering (default) — the collector keeps every job on
// the feed, same as before this list existed.

const companies = [
  "Capgemini",
  "Robert Half",
  "Carnival Corporation",

  // Added 2026-08-20 — pulled from a live snapshot of remoteok.com/api
  // (93 distinct company names that day) and filtered down to recognizable,
  // legitimate employers; the rest of that snapshot was single-person
  // "companies", regional agencies, and unrecognizable names, left out per
  // the curation rule at the top of this file.
  "FedEx",
  "Hilton",
  "Four Seasons",
  "Grand Hyatt",
  "W Hotels",
  "The Home Depot Canada",
  "Walmart Canada",
  "Skanska",
  "HighLevel",
  "Benchling",
  "Midjourney",
  "Delinea",
  "Chaos",
  "Bupa Australia",
  "Cotton On Group",
  "Chico's FAS, Inc.",
  "Costa Coffee Ireland",
  "Larsen & Toubro",
  "Reliance Industries Limited",
  "First Quantum Minerals",
  "Aecon Group Inc.",
  "Menzies Aviation",
  "MDPI",
  "Adani Airport Holdings Ltd",
];

export default companies;
