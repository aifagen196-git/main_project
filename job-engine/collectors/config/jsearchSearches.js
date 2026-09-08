// config/jsearchSearches.js
//
// JSearch takes a single free-text query (role + location combined) rather
// than separate keyword/location params. Keep this list roughly aligned
// with your other collectors' role coverage so match scoring stays
// consistent across sources.

const searches = [
  { query: "software engineer jobs in United States" },
  { query: "frontend engineer jobs in United States" },
  { query: "backend engineer jobs in United States" },
  { query: "full stack developer jobs in United States" },
  { query: "data engineer jobs in United States" },
  { query: "data scientist jobs in United States" },
  { query: "devops engineer jobs in United States" },
  { query: "network engineer jobs in United States" },
  { query: "machine learning engineer jobs in United States" },
  { query: "supply chain analyst jobs in United States" },
  { query: "qa engineer jobs in United States" },
  { query: "business analyst jobs in United States" },
  { query: "cloud engineer jobs in United States" },
  { query: "security engineer jobs in United States" },
  { query: "mobile developer jobs in United States" },
  { query: "product manager jobs in United States" },
  { query: "software engineer jobs remote" },
  { query: "data engineer jobs remote" },

  // Additional domain coverage, added 2026-08-12 — SAP, AI/ML, IT support,
  // automotive validation, and data center/analyst roles were previously
  // absent from this list entirely.
  { query: "data analyst jobs in United States" },
  { query: "SAP consultant jobs in United States" },
  { query: "SAP analyst jobs in United States" },
  { query: "AI engineer jobs in United States" },
  { query: "ML engineer jobs in United States" },
  { query: "AI/ML engineer jobs in United States" },
  { query: "IT support specialist jobs in United States" },
  { query: "help desk technician jobs in United States" },
  { query: "automotive validation engineer jobs in United States" },
  { query: "data center technician jobs in United States" },

  // Experience-level variants, added 2026-08-12 — the base queries above
  // skew toward mid-level titles as posted; explicit entry/senior modifiers
  // pull in postings at the ends of the range that free-text matching on
  // the bare title otherwise misses.
  { query: "entry level software engineer jobs in United States" },
  { query: "senior software engineer jobs in United States" },
  { query: "entry level data analyst jobs in United States" },
  { query: "senior data analyst jobs in United States" },
  { query: "entry level business analyst jobs in United States" },
  { query: "senior business analyst jobs in United States" },
  { query: "entry level network engineer jobs in United States" },
  { query: "senior network engineer jobs in United States" },
  { query: "entry level devops engineer jobs in United States" },
  { query: "senior devops engineer jobs in United States" },
  { query: "entry level full stack developer jobs in United States" },
  { query: "senior full stack developer jobs in United States" },
  { query: "entry level supply chain analyst jobs in United States" },
  { query: "senior supply chain analyst jobs in United States" },

  // Employer-targeted queries, added 2026-08-11.
  //
  // Unlike every other company in config/, Walmart and Verizon have no
  // collectable board of their own (see SUPPORTED_COMPANIES.md for the full
  // write-up): Walmart's only live job data sits behind /api/graphql, which
  // careers.walmart.com/robots.txt disallows, and Verizon's job pages are
  // behind a Cloudflare managed challenge. Routing them through JSearch —
  // a licensed aggregator we already pay for — is the compliant way to get
  // their postings in. Coverage is a subset of their real board and the
  // rows arrive with source "jsearch", not a per-company source.
  { query: "Walmart jobs in United States" },
  { query: "Verizon jobs in United States" },
];

export default searches;
