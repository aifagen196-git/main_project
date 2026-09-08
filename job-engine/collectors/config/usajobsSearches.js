// collectors/config/usajobsSearches.js
//
// Keyword searches against the official USAJOBS.gov Search API. USAJOBS
// aggregates postings from every US federal agency (DoD, VA, DHS, GSA,
// national labs, ...) — a source none of the ATS-based collectors reach,
// since federal agencies mostly don't run Greenhouse/Lever/Workday for
// public postings, they run USAJOBS directly.
//
// This is a deliberately federal-IT/ops-heavy list rather than a mirror of
// jsearchSearches.js: federal agencies post huge volumes of network
// engineer, data center technician, and supply-chain/logistics roles (often
// clearance-adjacent) that rarely surface on startup-oriented ATS boards,
// which is the gap this collector exists to fill.

const searches = [
  { keyword: "network engineer" },
  { keyword: "data center technician" },
  { keyword: "business analyst" },
  { keyword: "data analyst" },
  { keyword: "full stack developer" },
  { keyword: "devops engineer" },
  { keyword: "supply chain" },
  { keyword: "systems administrator" },
  { keyword: "cybersecurity engineer" },
  { keyword: "cloud engineer" },
  { keyword: "software engineer" },
  { keyword: "IT specialist" },
  { keyword: "telecommunications specialist" },
  { keyword: "logistics management specialist" },

  // Additional domain coverage, added 2026-08-12.
  { keyword: "data scientist" },
  { keyword: "artificial intelligence" },
  { keyword: "machine learning" },
  { keyword: "SAP" },
  { keyword: "IT support" },
  { keyword: "help desk" },
  { keyword: "automotive engineer" },
];

export default searches;
