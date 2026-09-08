// config/targetDomains.js
//
// The specific 13 domains the product needs covered (as given directly, not
// derived from linkedinSearches.js's broader dev-role taxonomy). Used by
// collectors/simplyhired.js and collectors/dice.js — both search every
// keyword here, each against "United States", since both product
// requirements are "USA" and "last 24 hours", not a state-by-state sweep.
export default [
  "Network Engineer",
  "Data Analyst",
  "Data Engineer",
  "Data Scientist",
  "Business Analyst",
  "Supply Chain",
  "DevOps Engineer",
  "AI Engineer",
  "Machine Learning Engineer",
  "Data Center Technician",
  "Full Stack Developer",
  "Software Engineer",
  "QA Automation Engineer",
  "IT Support",
];
