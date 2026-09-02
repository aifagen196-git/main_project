// collectors/config/postjobfreeSearches.js
//
// Keyword searches against PostJobFree's public search page
// (postjobfree.com/jobs?q=...&l=United+States) — a free job board where
// employers/individuals post directly, no key/registration needed to read.
//
// Scoped to the platform's supported role families (same list as
// scoreMatch.js's TITLE_FAMILIES) — postjobfree.js also runs isDomainJob()
// on every title as a hard gate, so an off-domain query result never
// reaches saveJobs anyway, but keeping the searches themselves on-domain
// means far fewer wasted requests/pages per run.

const searches = [
  // software-engineering
  { keywords: "software engineer" },
  { keywords: "software developer" },
  { keywords: "full stack developer" },
  { keywords: "mobile engineer" },
  { keywords: "ios engineer" },
  { keywords: "android engineer" },
  { keywords: "solutions engineer" },
  { keywords: "solutions architect" },

  // frontend / backend
  { keywords: "frontend developer" },
  { keywords: "backend developer" },
  { keywords: "react developer" },

  // devops / cloud / infra
  { keywords: "devops engineer" },
  { keywords: "site reliability engineer" },
  { keywords: "platform engineer" },
  { keywords: "cloud engineer" },
  { keywords: "cloud architect" },
  { keywords: "aws engineer" },
  { keywords: "infrastructure engineer" },

  // data / ai-ml
  { keywords: "data engineer" },
  { keywords: "data scientist" },
  { keywords: "machine learning engineer" },
  { keywords: "ai engineer" },
  { keywords: "data analyst" },
  { keywords: "business intelligence analyst" },
  { keywords: "analytics engineer" },

  // security / network
  { keywords: "security engineer" },
  { keywords: "cybersecurity analyst" },
  { keywords: "penetration tester" },
  { keywords: "network engineer" },
  { keywords: "network administrator" },

  // qa
  { keywords: "qa engineer" },
  { keywords: "test engineer" },
  { keywords: "sdet" },

  // product / program / design
  { keywords: "product manager" },
  { keywords: "product owner" },
  { keywords: "program manager" },
  { keywords: "project manager" },
  { keywords: "ux designer" },
  { keywords: "product designer" },

  // business analysis / ops
  { keywords: "business analyst" },
  { keywords: "operations analyst" },
  { keywords: "revenue operations" },

  // supply-chain
  { keywords: "supply chain manager" },
  { keywords: "logistics manager" },
  { keywords: "procurement manager" },
  { keywords: "demand planner" },

  // talent-hr
  { keywords: "technical recruiter" },
  { keywords: "talent acquisition" },
  { keywords: "hr business partner" },

  // legal
  { keywords: "corporate counsel" },
  { keywords: "paralegal" },
];

export default searches;
