// collectors/config/museCategories.js
//
// Category searches against The Muse's public jobs API
// (themuse.com/api/public/jobs) — no key required (500 req/hr unauthenticated,
// which this collector's pacing stays well under). Unlike Remotive/Arbeitnow/
// Jobicy, The Muse has no free-text search param; `category`, `location`, and
// `level` are the only filters, so this list is built from category names
// confirmed live via manual probing (bad category names return total:0
// silently, not an error, so entries here are the ones verified to return
// results for location=United States).

const categories = [
  { category: "Software Engineering" },
  { category: "Data and Analytics" },
  { category: "Data Science" },
  { category: "Project Management" },
  { category: "Product Management" },
  { category: "Design and UX" },

  // Additional domain coverage, added 2026-08-20 — probed live against
  // location=United States (total as of probe date): Sales (739), Human
  // Resources and Recruitment (100), Legal Services (142), Healthcare (59),
  // Retail (3), Administration and Office (46), Advertising and Marketing
  // (104), Science and Engineering (228), Account Management (381). Names
  // that returned total:0 on probe (IT, Cybersecurity, Operations, Finance,
  // Customer Service and Support, Education and Training, etc.) were left
  // out rather than added silently-broken.
  { category: "Sales" },
  { category: "Human Resources and Recruitment" },
  { category: "Legal Services" },
  { category: "Healthcare" },
  { category: "Retail" },
  { category: "Administration and Office" },
  { category: "Advertising and Marketing" },
  { category: "Science and Engineering" },
  { category: "Account Management" },
];

export default categories;
