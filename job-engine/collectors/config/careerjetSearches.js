// collectors/config/careerjetSearches.js
//
// Keyword searches against the Careerjet Partner API
// (search.api.careerjet.net/v4/query) — a general aggregator, free for
// publishers after signup at https://www.careerjet.com/partners/api/
// (API key issued from your Publisher account; no fixed category
// taxonomy, just free-text `keywords` + `location`).

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
];

export default searches;
