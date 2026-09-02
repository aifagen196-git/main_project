// collectors/config/personioCompanies.js
//
// Personio career-site slugs the collector scrapes.
//
// A slug is the subdomain a company uses at https://{slug}.jobs.personio.de
// (some tenants use .com instead of .de -- the collector tries .de first
// and falls back to .com). The public, unauthenticated XML feed lives at
// https://{slug}.jobs.personio.de/xml and returns a <workzag-jobs> document
// with one <position> per open role (id, office, department, name,
// jobDescriptions, employmentType, seniority, schedule, keywords, createdAt).
//
// Unlike Greenhouse/Lever/BambooHR, there is no public multi-tenant company
// list for Personio, so this list is hand-built and every slug below was
// fetched live on 2026-08-04 and confirmed to return a valid XML feed with
// at least one <position> -- no guessed/fabricated slugs. Personio's
// customer base skews German/EU (DACH region), so most postings here will
// not pass the US-only isUsJob() filter -- that's expected, not a bug; the
// collector still exercises the same code path as the other ATS's.

const companies = [
  "personio", // Personio itself (HR software, Munich) -- 1 job confirmed
  "dci", // Digital Career Institute & Social Impact School (Berlin/Cologne) -- 20 jobs confirmed
  "teamative", // Teamative (IT consulting, Hamburg) -- 20 jobs confirmed
  "jobleads", // JobLeads (job search platform, Hamburg) -- 10 jobs confirmed
  "iits", // iits-consulting GmbH (cloud/IT consulting) -- 4 jobs confirmed
  "koro-handels-gmbh", // KoRo Handels GmbH (D2C food retail, Berlin) -- 10 jobs confirmed
  "wwp", // WWP (Munich/Vienna) -- 10 jobs confirmed
  "now-gmbh", // NOW GmbH -- Nationale Organisation Wasserstoff- und Brennstoffzellentechnologie (Berlin) -- 3 jobs confirmed
  "urbansportsclub", // Urban Sports Club (fitness membership platform, Berlin) -- 38 jobs confirmed
  "smava", // smava (fintech/loan comparison, Berlin) -- 2 jobs confirmed
  "clark", // Clark (insurtech, Frankfurt) -- 3 jobs confirmed
  "ecosia", // Ecosia (search engine, Berlin) -- 2 jobs confirmed
];

export default companies;
