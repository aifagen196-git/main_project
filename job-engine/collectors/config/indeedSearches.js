// collectors/config/indeedSearches.js
//
// Indeed has no per-company job-board API like Greenhouse/Ashby, so instead
// of a company slug list this collector iterates (keyword, location)
// search pairs against Indeed's public search results pages.

const searches = [
  { keywords: "software engineer", location: "United States" },
  { keywords: "frontend engineer", location: "United States" },
  { keywords: "backend engineer", location: "United States" },
  { keywords: "full stack developer", location: "United States" },
  { keywords: "data engineer", location: "United States" },
  { keywords: "data scientist", location: "United States" },
  { keywords: "devops engineer", location: "United States" },
  { keywords: "product manager", location: "United States" },
  { keywords: "machine learning engineer", location: "United States" },
  { keywords: "qa engineer", location: "United States" },
  { keywords: "network engineer", location: "United States" },
  { keywords: "business analyst", location: "United States" },
  { keywords: "cloud engineer", location: "United States" },
  { keywords: "security engineer", location: "United States" },
  { keywords: "mobile developer", location: "United States" },
  { keywords: "software engineer", location: "Remote" },
  { keywords: "data engineer", location: "Remote" },
  { keywords: "software engineer", location: "New York, NY" },
  { keywords: "software engineer", location: "San Francisco, CA" },
  { keywords: "software engineer", location: "Austin, TX" },

  // Additional domain coverage, added 2026-08-12.
  { keywords: "data analyst", location: "United States" },
  { keywords: "SAP consultant", location: "United States" },
  { keywords: "SAP analyst", location: "United States" },
  { keywords: "AI engineer", location: "United States" },
  { keywords: "ML engineer", location: "United States" },
  { keywords: "IT support specialist", location: "United States" },
  { keywords: "help desk technician", location: "United States" },
  { keywords: "automotive validation engineer", location: "United States" },
  { keywords: "data center technician", location: "United States" },

  // Experience-level variants, added 2026-08-12.
  { keywords: "entry level software engineer", location: "United States" },
  { keywords: "senior software engineer", location: "United States" },
  { keywords: "entry level data analyst", location: "United States" },
  { keywords: "senior data analyst", location: "United States" },
  { keywords: "entry level business analyst", location: "United States" },
  { keywords: "senior business analyst", location: "United States" },
  { keywords: "entry level network engineer", location: "United States" },
  { keywords: "senior network engineer", location: "United States" },
  { keywords: "entry level devops engineer", location: "United States" },
  { keywords: "senior devops engineer", location: "United States" },
  { keywords: "entry level full stack developer", location: "United States" },
  { keywords: "senior full stack developer", location: "United States" },
];

export default searches;
