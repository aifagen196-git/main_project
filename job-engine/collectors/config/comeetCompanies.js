// collectors/config/comeetCompanies.js
//
// Comeet (now Spark Hire Recruit) companies the collector scrapes.
//
// Unlike Greenhouse/Lever/etc, Comeet's public Careers API isn't reachable
// from a guessable company slug alone — every tenant has its own numeric
// `uid` AND a public `token`, both required as query params:
//
//   GET https://www.comeet.co/careers-api/2.0/company/{uid}/positions?token={token}
//
// Neither is guessable, but both are embedded client-side in every
// company's own public careers page HTML (https://www.comeet.com/jobs/
// {slug}/{uid}) — that page's JS uses them to fetch and render the job
// list in the browser, so they're public-by-design (like a restricted API
// key), not a secret. The collector re-derives the token itself at
// runtime by fetching that HTML page and regexing it out — see comeet.js
// — so only { name, uid } needs to be listed below; `token` here is just
// a cached copy from the last verify run to skip that extra fetch.
//
// Companies below confirmed live on 2026-08-04 by hitting the Careers API
// directly with the extracted token. Run `npm run verify:comeet` before a
// real scrape — boards close down and tokens can rotate over time.

const companies = [
  { name: "tripleten", uid: "98.008" }, // TripleTen (US, edtech/bootcamps) — 281 live jobs confirmed
  { name: "comm-it", uid: "76.008" }, // CommIT (IL/US/UA, tech services) — 147 live jobs confirmed
  { name: "team8", uid: "61.003" }, // Team8 (IL, venture group) — 52 live jobs confirmed
  { name: "cognyte", uid: "f2.009" }, // Cognyte (IL, investigative analytics) — 51 live jobs confirmed
  { name: "port", uid: "59.004" }, // Port (IL, workplace platform) — 41 live jobs confirmed
  { name: "dreamgroup", uid: "99.002" }, // Dream (IL, AI cybersecurity) — 32 live jobs confirmed
  { name: "riverside-fm", uid: "66.009" }, // Riverside.fm (IL, content creation platform) — 30 live jobs confirmed
  { name: "guardio", uid: "57.000" }, // Guardio (IL, browser security) — 25 live jobs confirmed
  { name: "fiverr", uid: "60.002" }, // Fiverr (IL, freelance marketplace) — 17 live jobs confirmed
  { name: "codevalue", uid: "81.009" }, // CodeValue (IL, software consultancy) — 16 live jobs confirmed
  { name: "rounds", uid: "59.005" }, // Rounds (IL, mobile/internet) — 12 live jobs confirmed
  { name: "bounce", uid: "E9.00C" }, // Bounce AI (US, fintech/debt management) — 9 live jobs confirmed
  { name: "joinattil", uid: "38.00A" }, // AT&T Israel — 7 live jobs confirmed
  { name: "israeltechguard", uid: "29.009" }, // Israel Tech Guard — 3 live jobs confirmed
  { name: "cymotive", uid: "F1.008" }, // Cymotive Technologies (IL, automotive cybersecurity) — 1 live job confirmed
  { name: "comeet", uid: "30.005" }, // Comeet's own careers board — 0 live jobs as of 2026-08-04
  { name: "comunix", uid: "86.006" }, // Communix (IL, multiplayer gaming) — 0 live jobs as of 2026-08-04
];

export default companies;
