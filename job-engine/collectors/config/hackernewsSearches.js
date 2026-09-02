// collectors/config/hackernewsSearches.js
//
// Keyword filters applied to the current month's "Ask HN: Who is hiring?"
// thread (news.ycombinator.com, fetched via the Algolia HN Search API —
// see hackernews.js for why that's the compliant path in, not the raw
// Firebase item API). There is no per-keyword request here the way
// Jobicy/Arbeitnow issue one HTTP call per tag: the whole thread is fetched
// once, and these keywords are matched client-side against each top-level
// comment's text to decide which postings to keep. `ONLY_QUERIES` narrows
// this same list at runtime exactly like every other collector.
//
// Keywords confirmed to appear in real August 2026 thread postings during
// manual review before this collector was built.

const searches = [
  { keyword: "business analyst" },
  { keyword: "data analyst" },
  { keyword: "network engineer" },
  { keyword: "full stack" },
  { keyword: "devops" },
  { keyword: "supply chain" },
  { keyword: "data engineer" },
  { keyword: "data scientist" },
  { keyword: "machine learning" },
  { keyword: "backend" },
  { keyword: "frontend" },
  { keyword: "platform engineer" },
  { keyword: "site reliability" },
  { keyword: "cloud" },
  { keyword: "security engineer" },

  // Additional domain coverage, added 2026-08-20.
  { keyword: "product manager" },
  { keyword: "project manager" },
  { keyword: "QA" },
  { keyword: "mobile" },
  { keyword: "iOS" },
  { keyword: "android" },
  { keyword: "embedded" },
  { keyword: "growth" },
  { keyword: "solutions engineer" },
  { keyword: "sales engineer" },
];

export default searches;
