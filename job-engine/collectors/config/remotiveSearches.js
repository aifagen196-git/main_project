// collectors/config/remotiveSearches.js
//
// Keyword searches against the Remotive public API (remotive.com/api) — no
// key, no registration, no rate-limit tier to manage. Remotive is
// remote-job-only, so coverage skews toward roles that are commonly remote
// (full stack, devops) and thinner on roles that rarely are (data center
// technician is almost definitionally on-site — kept in the list anyway
// since a handful of remote NOC/monitoring roles do show up).

const searches = [
  { search: "business analyst" },
  { search: "data analyst" },
  { search: "network engineer" },
  { search: "full stack developer" },
  { search: "devops engineer" },
  { search: "supply chain" },
  { search: "data center" },
  { search: "cloud engineer" },
  { search: "site reliability engineer" },

  // Additional domain coverage, added 2026-08-12.
  { search: "data scientist" },
  { search: "machine learning engineer" },
  { search: "SAP" },
  { search: "IT support" },
];

export default searches;
