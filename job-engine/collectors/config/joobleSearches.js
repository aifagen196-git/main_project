// collectors/config/joobleSearches.js
//
// Keyword searches against the Jooble Jobs API (jooble.org/api/{key}) — a
// general aggregator pulling from thousands of source sites, with a free
// developer key (instant signup at https://jooble.org/api/about, no
// approval wait, unlike JSearch's paid-plan quota this repo is currently
// blocked on). Jooble's search takes free-text `keywords` plus an optional
// `location`, no fixed category taxonomy the way Adzuna has — every entry
// here mirrors the same keyword set the other aggregators use.

const searches = [
  { keywords: "business analyst" },
  { keywords: "data analyst" },
  { keywords: "network engineer" },
  { keywords: "full stack developer" },
  { keywords: "devops engineer" },
  { keywords: "supply chain" },
  { keywords: "data scientist" },
  { keywords: "machine learning engineer" },
  { keywords: "data engineer" },
  { keywords: "backend developer" },
  { keywords: "frontend developer" },
  { keywords: "site reliability engineer" },
  { keywords: "security engineer" },
  { keywords: "cloud engineer" },
  { keywords: "product manager" },
  { keywords: "project manager" },
  { keywords: "systems administrator" },

  // Additional domain coverage, added 2026-08-20.
  { keywords: "SAP consultant" },
  { keywords: "AI engineer" },
  { keywords: "cybersecurity analyst" },
  { keywords: "QA engineer" },
  { keywords: "mobile developer" },
  { keywords: "iOS developer" },
  { keywords: "android developer" },
  { keywords: "embedded software engineer" },
  { keywords: "solutions engineer" },
  { keywords: "sales engineer" },
  { keywords: "IT support specialist" },
  { keywords: "help desk technician" },
  { keywords: "database administrator" },
  { keywords: "network administrator" },
  { keywords: "software architect" },
  { keywords: "engineering manager" },
  { keywords: "scrum master" },
  { keywords: "technical writer" },
  { keywords: "UX designer" },
  { keywords: "UI designer" },
  { keywords: "data warehouse engineer" },
  { keywords: "business intelligence analyst" },
  { keywords: "quality assurance analyst" },
  { keywords: "release engineer" },

  // Experience-level variants, added 2026-08-20 — mirrors adzunaSearches.js.
  { keywords: "entry level data analyst" },
  { keywords: "senior data analyst" },
  { keywords: "entry level software engineer" },
  { keywords: "senior software engineer" },
  { keywords: "entry level devops engineer" },
  { keywords: "senior devops engineer" },
];

export default searches;
