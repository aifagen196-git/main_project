// collectors/config/avatureCompanies.js
//
// Avature-hosted career portals the collector scrapes. Each entry needs a
// `template` matching one of avature.js's TEMPLATES extractors, because
// (unlike every other ATS in this repo) Avature customers fully re-theme
// their portal HTML -- there's no shared class-name scheme to scrape
// generically. Confirmed templates so far:
//
//   "bem"              -- koch.avature.net's generic framework
//   "jobdetail-table"  -- traderjoes.avature.net's bespoke layout
//
// Adding a new tenant means opening its /JobDetail/ page, matching it to an
// existing template (or writing a new extractor + registering it), then
// checking with `npm run verify:avature` -- which also confirms the chosen
// template actually extracts a non-empty description, not just that the
// board responds.
//
// Verified live 2026-08-05.

const companies = [
  { company: "koch", portalBase: "https://koch.avature.net/en_US/careers", template: "bem" },
  {
    company: "traderjoes",
    portalBase: "https://traderjoes.avature.net/careers",
    template: "jobdetail-table",
  },
  { company: "avature", portalBase: "https://careers.avature.net/en_US/main", template: "bem" },
  {
    company: "deloitte",
    portalBase: "https://deloittecm.avature.net/en_US/careers",
    template: "bem",
  },
];

export default companies;
