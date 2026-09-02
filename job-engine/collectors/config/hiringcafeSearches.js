// collectors/config/hiringcafeSearches.js
//
// Keyword searches against HiringCafe's public search endpoint
// (hiringcafe.com/api/search-jobs) — no key, no registration. HiringCafe
// aggregates postings scraped directly from ~46 different ATS platforms
// (Greenhouse, Lever, Workday, iCIMS, ADP, ...), each already deduplicated
// and enriched with structured fields (workplace_type, compensation,
// seniority, YOE) by HiringCafe itself, so one collector here effectively
// covers thousands of companies without a per-company slug list — the same
// role-family-search approach used by remotive.js / jobicy.js, just against
// a far larger underlying index (~5.7M live postings across the whole US).
//
// Scoped to the platform's actual supported role families
// (backend/src/services/matching/scoreMatch.js's TITLE_FAMILIES) rather
// than a generic "every job on the internet" spread — one query per family,
// picking the phrase most likely to surface that family's postings. This
// list previously included nurse/warehouse/sales/marketing/accountant
// queries that inflated request count and Supabase storage without
// producing a single job the matcher would ever route to anyone (those
// titles don't resolve to any TITLE_FAMILIES pattern); hiringcafe.js's
// isDomainJob() re-checks every result's title against the same regexes
// as a second gate, but trimming the queries themselves means those
// off-domain pages are never fetched at all.

const searches = [
  // legal
  { search: "counsel" },
  // talent-hr
  { search: "recruiter" },
  // supply-chain
  { search: "supply chain" },
  { search: "logistics" },
  // ai-ml
  { search: "machine learning engineer" },
  { search: "data scientist" },
  // data-engineering
  { search: "data engineer" },
  // data-analytics
  { search: "data analyst" },
  // offensive-security
  { search: "penetration tester" },
  // security-engineering
  { search: "security engineer" },
  // network-engineering
  { search: "network engineer" },
  // devops
  { search: "devops engineer" },
  { search: "site reliability engineer" },
  // cloud-engineering
  { search: "cloud engineer" },
  // frontend-engineering
  { search: "frontend developer" },
  // backend-engineering
  { search: "backend engineer" },
  // qa-testing
  { search: "qa engineer" },
  { search: "sdet" },
  // software-engineering
  { search: "software engineer" },
  { search: "full stack developer" },
  { search: "mobile engineer" },
  // product-management
  { search: "product manager" },
  { search: "program manager" },
  // design
  { search: "product designer" },
  { search: "ux designer" },
  // business-analysis
  { search: "business analyst" },
  { search: "revenue operations" },
];

export default searches;
