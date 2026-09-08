// collectors/config/recruiteeCompanies.js
//
// Recruitee account slugs the collector scrapes.
//
// ⚠️ Companies below are individually confirmed live (checked via web
// search + direct page fetch), but NOT run through verify:recruitee from
// this environment (recruitee.com isn't reachable from the sandbox that
// built this project). Run `npm run verify:recruitee` yourself before a
// real scrape — ATS boards close down over time.
//
// A slug is the subdomain a company uses at https://{slug}.recruitee.com
// Find more slugs by visiting a company's careers page — if it's on
// Recruitee, the URL will be {slug}.recruitee.com or an /o/ job link will
// reveal the subdomain.
//
// Before running `npm run recruitee` for real:
//   1. Add/replace slugs below with companies you actually want to track.
//   2. Run `npm run verify:recruitee` — it hits each slug's public
//      /api/offers/ endpoint and prints which ones are valid.
//   3. Replace this array with the "Valid Companies" output.

const companies = [
  "kpsnacks", // KP Snacks (UK, food manufacturing) — 20 live jobs confirmed
  "greatminds", // Great Minds (US, education) — 21 live jobs confirmed
  "bunq", // bunq (NL, neobank) — 20+ live jobs confirmed
  "trustedshops", // Trusted Shops (DE, e-commerce trust/reviews) — 23 live jobs confirmed
  "bettyblocks", // Betty Blocks (NL, low-code platform) — confirmed via live /o/ job link
  "herasbv", // Heras (NL, perimeter security/fencing) — confirmed live careers page
  "swordtech", // Sword Group — Switzerland tech entity — confirmed live
  "swordservices", // Sword Group — services entity — confirmed live
  "swordtechnologies", // Sword Group — technologies entity — confirmed live
  "sirclecollection", // Sircle Collection (NL/EU hospitality group) — confirmed live

  // Sourced from Prospeo's Recruitee-customer list, slugs verified live via
  // the /api/offers/ endpoint on 2026-07-30 (job counts as of that check).
  "duravermeer", // Dura Vermeer (NL, construction) — 365 live jobs
  "vionfoodgroup", // Vion Food Group (NL, meat processing) — 99 live jobs
  "boggimilano", // Boggi Milano (IT, fashion retail) — 89 live jobs
  "institutminestelecom", // Institut Mines-Télécom (FR, education) — 60 live jobs
  "bitfinex", // Bitfinex (crypto exchange) — 33 live jobs
  "hemeriagroup", // HEMERIA (FR, aerospace/defense) — 29 live jobs
  "iliabeauty", // ILIA Beauty (US, cosmetics) — 28 live jobs
  "amiparis", // Ami Paris (FR, fashion) — 27 live jobs
  "castolin", // Castolin Eutectic (industrial coatings) — 17 live jobs
  "pur", // PUR (fashion/lifestyle) — 10 live jobs
  "msf", // Médecins Sans Frontières (international NGO) — 7 live jobs
  "oneworks", // One Works (IT, architecture) — 6 live jobs
  "italconsult", // Italconsult (IT, engineering consultancy) — 6 live jobs
  "atheneum", // Atheneum (expert network/consulting) — 5 live jobs
  "goodwall", // Goodwall (edtech/social platform) — 2 live jobs
  "lagarderetravelretail", // Lagardère Travel Retail (FR, travel retail) — 1 live job

  // Additional brands, individually probed against /api/offers/ on
  // 2026-08-03 (job counts as of that check).
  "channable", // Channable (NL, e-commerce feed/marketing platform) — 13 live jobs
  "personio", // Personio (DE, HR software) — 1 live job

  // Batch-probed against /api/offers/ on 2026-08-04 from a candidate list
  // of ~190 Benelux/DACH/French brand-name guesses (job counts as of that
  // check).
  "greenchoice", // Greenchoice (NL, green energy supplier) — 15 live jobs
  "vandebron", // Vandebron (NL, energy supplier) — 11 live jobs
];

// More likely Recruitee customers, per Recruitee's own case-studies page
// (https://recruitee.com/customer-success-stories). These are GUESSED
// slugs based on common naming patterns (lowercase, no spaces/punctuation)
// — NOT individually confirmed. Paste this whole block into the array
// above and run `npm run verify:recruitee` to see which guesses are
// actually correct; delete the ones that come back invalid.
//
// const candidates = [
//   "stroeerx", "stroeer-x", "vancranenbroek", "woonzorgflevoland",
//   "specto", "swordgroup", "sword-group", "incentro", "teamleader",
//   "cm", "cmcom", "originmaterials", "greenpeacecee",
//   "greenpeace-cee", "makerstreet", "marksandspencer", "mands",
//   "slingshotgroup", "slingshot-group", "solutions4delivery", "s4d",
// ];

// Cross-portal sweep of company wishlist, verified live via /api/offers/ on 2026-08-14
companies.push(
  "parallel", // Parallel — 5 live jobs
  "zeotap", // Zeotap (DE, adtech) — 1 live job
  "hostaway", // Hostaway (vacation rental software) — 11 live jobs
  "stormreply", // Storm Reply (AWS consultancy, Reply Group) — 1 live job
  "knapsack", // Knapsack (design systems platform) — 2 live jobs
  "crowdsec", // CrowdSec (cybersecurity/threat intel) — 1 live job
);

export default companies;
