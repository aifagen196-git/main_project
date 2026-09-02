// collectors/config/jobvertiseSearches.js
//
// Keyword queries against Jobvertise's RSS feed
// (jobvertise.com/jobs/rss?query=...) — a huge, old-school free US/Canada
// job board ("Search over 1 Million jobs", ~78k added per week as of
// 2026-08-27). No key, no auth — just a plain RSS GET.

const searches = [
  { keywords: "software engineer" },
  { keywords: "software developer" },
  { keywords: "full stack developer" },
  { keywords: "backend developer" },
  { keywords: "frontend developer" },
  { keywords: "mobile developer" },
  { keywords: "devops engineer" },
  { keywords: "site reliability engineer" },
  { keywords: "cloud engineer" },
  { keywords: "data engineer" },
  { keywords: "data scientist" },
  { keywords: "machine learning engineer" },
  { keywords: "data analyst" },
  { keywords: "business intelligence analyst" },
  { keywords: "security engineer" },
  { keywords: "network engineer" },
  { keywords: "qa engineer" },
  { keywords: "test engineer" },
  { keywords: "product manager" },
  { keywords: "program manager" },
  { keywords: "project manager" },
  { keywords: "ux designer" },
  { keywords: "product designer" },
  { keywords: "business analyst" },
  { keywords: "operations manager" },
  { keywords: "supply chain manager" },
  { keywords: "logistics manager" },
  { keywords: "procurement manager" },
  { keywords: "technical recruiter" },
  { keywords: "hr business partner" },
  { keywords: "corporate counsel" },
  { keywords: "paralegal" },
  { keywords: "accountant" },
  { keywords: "financial analyst" },
  { keywords: "systems administrator" },
  { keywords: "database administrator" },
];

export default searches;
