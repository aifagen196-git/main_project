// collectors/config/findworkSearches.js
//
// Keyword searches against the Findwork.dev API (findwork.dev/api/jobs/) —
// a smaller, tech/remote-focused aggregator, free API key from
// https://findwork.dev after signup. Much lower volume than
// Jooble/Careerjet/Adzuna, but clean listings and generous rate limits —
// a quality-over-quantity source, not a primary one.

const searches = [
  { search: "business analyst" },
  { search: "data analyst" },
  { search: "network engineer" },
  { search: "full stack developer" },
  { search: "devops" },
  { search: "data scientist" },
  { search: "machine learning" },
  { search: "backend" },
  { search: "frontend" },
  { search: "site reliability" },
  { search: "security engineer" },
  { search: "cloud engineer" },
  { search: "product manager" },
];

export default searches;
