// collectors/config/jobviteCompanies.js
//
// Jobvite career-site slugs the collector scrapes.
//
// A slug is the path segment at https://jobs.jobvite.com/{slug} -- Jobvite
// boards are server-rendered HTML (Angular directives are present but the
// job list/detail markup is already in the initial response, no headless
// browser needed). The listing page has a table of <a href="/{slug}/job/{id}">
// links per open role, and each job detail page embeds a full JobPosting
// schema.org JSON-LD block (title, description, employmentType, jobLocation,
// datePosted) in a <script type="application/ld+json"> tag, which the
// collector parses directly instead of scraping the visible HTML.
//
// Source: verify/jobvite.json (18 companies, pre-verified boards).
// Spot-checked live on 2026-08-04: optimizely/uplight/egnyte/exabeam/nutanix/
// veson/ninjaone/cascade/iboss had open jobs; convoy/peloton/sparkpost/
// stellar/xero/cirruslogic/controlup/icon/azul boards were live but showed
// 0 open jobs at check time (kept in the list -- that changes over time).

const companies = [
  "convoy",
  "optimizely",
  "peloton",
  "uplight",
  "egnyte",
  "exabeam",
  "nutanix",
  "sparkpost",
  "stellar",
  "veson",
  "ninjaone",
  "xero",
  "cascade",
  "cirruslogic",
  "controlup",
  "iboss",
  "icon",
  "azul",
];

export default companies;
