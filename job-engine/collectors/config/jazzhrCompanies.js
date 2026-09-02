// collectors/config/jazzhrCompanies.js
//
// JazzHR career-site slugs the collector scrapes.
//
// A slug is the subdomain a company uses at https://{slug}.applytojob.com
// JazzHR (formerly The Resumator) has no public per-company JSON API —
// the REST API and XML feed both need a private per-account API key
// (Settings > Integrations, or Settings > Career Page > XML Feed) that
// only the account owner has. What IS public, with no auth, is the
// candidate-facing job list HTML at /apply/jobs/ — the same page anyone
// applying to a job would see — so the collector scrapes that instead
// (see comeet.js's sibling, jazzhr.js).
//
// A subdomain with no real JazzHR account 302-redirects to jazzhr.com's
// marketing site rather than 404ing, so slug-guessing has a lot of silent
// false positives if you only check the HTTP status. A real board is one
// that responds 200 on ITS OWN subdomain with the actual `#jobs_table`
// markup present — that's what verifyJazzhrBoards.js checks for. Boards
// below confirmed live that way on 2026-08-04 (job counts as of that
// check). Run `npm run verify:jazzhr` before a real scrape — boards close
// down over time.

const companies = [
  "crunchfitness", // Crunch Fitness (US, gym franchise) — 747 live jobs confirmed
  "bellababyphotography", // Bella Baby Photography (US, newborn photography) — 79 live jobs confirmed
  "moonlightcompanies", // Moonlight Companies (US) — 46 live jobs confirmed
  "firstadvantage", // First Advantage (US, background screening) — 31 live jobs confirmed
  "company3", // Company 3 (US, post-production/VFX) — 18 live jobs confirmed
  "goodwill", // Goodwill (US, nonprofit/retail) — 18 live jobs confirmed
  "nro", // National Reconnaissance Office contractor board (US, aerospace/defense) — 13 live jobs confirmed
  "tvag", // The VA Group, LLC (US, staffing) — 7 live jobs confirmed
  "clubpilates", // Club Pilates (US, fitness franchise) — 4 live jobs confirmed
  "flexcompany", // The Flex Company (US) — 2 live jobs confirmed
  "talentwwinc", // Career.io (US, career services) — 2 live jobs confirmed
  "homeinstead", // Home Instead (US, senior in-home care franchise) — 1 live job confirmed
  "wraptechnologies", // Wrap Technologies, Inc. (US, public safety tech) — board live, 0 jobs open as of 2026-08-04
  "redcross", // American Red Cross (US, nonprofit) — board live, 0 jobs open as of 2026-08-04

  // Cross-portal sweep of company wishlist, verified live via /apply/jobs/ on 2026-08-14
  "bluevoyant", // BlueVoyant (cybersecurity) — 8 live jobs
  "fusionauth", // FusionAuth (auth platform) — 10 live jobs
  "sendoso", // Sendoso (corporate gifting platform) — 4 live jobs
  "arangodb", // ArangoDB (multi-model database) — 30 live jobs
  "attackiq", // AttackIQ (cybersecurity) — 8 live jobs
  "h2oai", // H2O.ai (AI platform) — 24 live jobs
  "linearb", // LinearB (dev analytics) — 6 live jobs
  "parity", // Parity (building intelligence) — 4 live jobs
  "lightbend", // Lightbend (Akka/Scala enterprise software) — 12 live jobs
];

export default companies;
