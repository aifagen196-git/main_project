// collectors/config/breezyhrCompanies.js
//
// Breezy HR career-site slugs the collector scrapes.
//
// A slug is the subdomain a company uses at https://{slug}.breezy.hr
// The public, unauthenticated feed lives at https://{slug}.breezy.hr/json
// (add ?verbose=true to include the HTML job description — the collector
// does this). Requests need a browser-like User-Agent or Breezy's CDN
// (CloudFront) returns a 403 "request could not be satisfied" error page
// even for slugs that do exist.
//
// Companies below verified live via /json on 2026-07-31 (job counts as of
// that check). Random guessed slugs 403 on Breezy's CDN, so a 200 + array
// response means the slug is a real company. Run `npm run verify:breezyhr`
// before a real scrape — boards close down over time.

const companies = [
  "jobs", // Breezy HR's own careers board — 1 live job confirmed

  // Sourced from Bloomberry's Breezy HR-customer list
  "ourbond", // Bond (fintech/lending) — 10 live jobs
  "ucardia", // Ucardia (healthcare/wellness) — 3 live jobs
  "bond", // Bond — a second board under the shorter slug — 2 live jobs
  "dependentsaudit", // DependentsAudit (benefits/dependent verification) — 1 live job
  "spotlock", // Spotlock (marketing/media) — 1 live job
  "algolia", // Algolia (search-as-a-service) — board live, 0 jobs open as of 2026-08-03

  // Batch-probed against /json on 2026-08-04 from a second candidate list
  // (~140 more brands, skewed toward consumer/DTC/real-estate/delivery
  // companies) — boards live but 0 jobs open as of that check.
  "ro", // Ro (US, telehealth) — board live, 0 jobs open
  "seamless", // Seamless (US, food delivery) — board live, 0 jobs open
  "gopuff", // Gopuff (US, on-demand delivery) — board live, 0 jobs open
  "compass", // Compass (US, real estate brokerage) — board live, 0 jobs open
  "keller-williams", // Keller Williams (US, real estate franchise) — board live, 0 jobs open

  // Tried ~35 well-known tech brands (Buffer, Zapier, Notion, Figma,
  // Vercel, Sentry, etc.) on 2026-08-03, and another ~140 consumer/DTC
  // brands on 2026-08-04 — nearly all 403'd (no board). Breezy HR's
  // customer base skews toward small/regional companies rather than
  // well-known brands, so guessing slugs from brand-name lists has a low
  // hit rate. Better sources: Bloomberry-style BuiltWith/customer lists,
  // or searching `site:*.breezy.hr` for live boards.

  // Cross-portal sweep of company wishlist, verified live via /json on 2026-08-14
  "duolingo", // Duolingo — 4 live jobs
  "attentive", // Attentive (SMS marketing) — 1 live job
];

export default companies;
