// collectors/config/weworkremotelyCompanies.js
//
// Optional allowlist for weworkremotely.js. Names captured live from
// https://weworkremotely.com/remote-jobs.rss (WWR's RSS <title> is
// "Company: Job Title" — the collector splits on the first colon to get
// this exact string, so entries here must match that format).
//
// EMPTY ARRAY = no filtering (default) — the collector keeps every job on
// the feed, same as before this list existed. Populate it to restrict to
// specific companies only.
//
// "DataAnnotation.tech" was removed 2026-08-14: it's a gig/microtask
// platform (paid per AI-rating/data-labeling task, not a real employer
// role) — same category of listing rejected wholesale from WorkingNomads
// for its repeated TELUS Digital rating-task postings. Any future
// candidate whose business model is "pay per completed rating/labeling
// task" rather than an actual job should be rejected the same way.

const companies = [
  "A.Team",
  "Abnormal",
  "Airbnb",
  "AlgaeCal",
  "Amwell",
  "Apex Trade",
  "Asana",
  "Azumo",
  "BlueLeaders",
  "Bybit",
  "CapsLock",
  "ClickHouse",
  "Coinbase",
  "Collibra",
  "Customer.io",
  "Descript",
  "Druva",
  "Forager",
  "GitLab",
  "Grafana Labs",
  "Headway",
  "Ignition, Inc.",
  "Instacart",
  "JetBrains",
  "Joby",
  "Jumio",
  "Keeper Security",
  "LaunchDarkly",
  "Lemon.io",
  "MemberSpace",
  "MobiLoud",
  "Nuuly",
  "PerkinElmer",
  "Platform.sh",
  "Porkbun",
  "Power Digital",
  "PressW",
  "REDspace",
  "Reddit",
  "Remote",
  "Reveleer",
  "Roblox",
  "Sinclair Broadcast Group",
  "Smartsheet",
  "Speechify Inc",
  "Spiralyze",
  "Stripe",
  "Systra",
  "Tines",
  "Toptal",
  "Truelogic",
  "Twilio",
  "Webflow",
  "Zapiet",
  "commercetools",
];

export default companies;
