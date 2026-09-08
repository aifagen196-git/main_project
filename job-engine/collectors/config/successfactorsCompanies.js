// collectors/config/successfactorsCompanies.js
//
// SAP SuccessFactors Career Site Builder (CSB) sites the collector scrapes.
// Each entry is a base URL — job listings live at `{baseUrl}/search/` and
// detail pages at `{baseUrl}/job/{slug}/{id}/`. CSB is self-hosted per
// customer on their own domain (or an sf-branded one), so there is no
// shared discovery mechanism; verify additions with
// `npm run verify:successfactors <baseUrl>` first.
//
// Only one tenant is verified so far (SAP's own board, which is itself a
// large CSB site — 800+ open reqs). Extending this list requires finding
// other companies' CSB-hosted career sites and confirming they use the
// same /search/ + /job/{slug}/{id}/ URL shape; not every CSB customer does
// (some fully customise the theme/routes).
//
// Verified live 2026-08-05.

const companies = [{ company: "sap", baseUrl: "https://jobs.sap.com" }];

export default companies;
