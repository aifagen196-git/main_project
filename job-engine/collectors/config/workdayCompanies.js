// collectors/config/workdayCompanies.js
//
// Workday-hosted career sites the collector scrapes via the internal
// `wday/cxs/{tenant}/{siteId}/jobs` JSON API.
//
// Unlike Greenhouse/BambooHR/Lever, Workday has no public multi-tenant
// discovery mechanism — every company runs its own host shard (wd1, wd5,
// wd12, ...) and an arbitrary siteId with no naming pattern tied to the
// company name. Each entry below was individually verified live (company,
// host, and siteId all confirmed to return real job postings) on 2026-08-04.
// Do not add an entry without verifying it the same way — a wrong siteId
// silently returns "0 jobs found" rather than an error (confirmed with
// Dell's `External` site — Dell's real board turned out to be Oracle
// Recruiting Cloud, so it lives in oracleCompanies.js instead).

const companies = [
  { company: "roberthalf", host: "wd1", siteId: "RobertHalfStaffingCareers" },
  { company: "nvidia", host: "wd5", siteId: "NVIDIAExternalCareerSite" },
  { company: "salesforce", host: "wd12", siteId: "External_Career_Site" },
  { company: "adobe", host: "wd5", siteId: "external_experienced" },
  { company: "mastercard", host: "wd1", siteId: "CorporateCareers" },

  // Added 2026-08-11. Each verified live the same way as the entries above:
  // the cxs `/jobs` endpoint returns a non-zero `total` and a detail fetch on
  // the first `externalPath` returns a populated `jobPostingInfo`. Job counts
  // at time of verification are noted so a future run returning wildly fewer
  // postings is recognisable as a broken siteId rather than a quiet week.
  { company: "target", host: "wd5", siteId: "targetcareers" }, // ~2,000 reqs
  { company: "capitalone", host: "wd12", siteId: "Capital_One" }, // ~1,800 reqs
  // CVS is by far the largest tenant in this list. The collector fetches one
  // detail request per posting, so a full CVS pass is ~19k extra requests —
  // budget for it (or lower DETAIL_CONCURRENCY) before running `npm run all`
  // on a schedule.
  { company: "cvshealth", host: "wd1", siteId: "CVS_Health_Careers" }, // ~19,000 reqs
  // Pfizer's board is global and skews non-US; expect most postings to be
  // dropped by the isUsJob filter rather than saved.
  { company: "pfizer", host: "wd1", siteId: "PfizerCareers" }, // ~540 reqs
  { company: "boeing", host: "wd1", siteId: "EXTERNAL_CAREERS" }, // ~720 reqs

  // Added 2026-09-01, part of the same bulk-volume no-key sweep that found
  // Kroger/Honeywell on Oracle (see SUPPORTED_COMPANIES.md). Verified live:
  // the cxs `/jobs` endpoint returns a non-zero total and a populated first
  // posting.
  { company: "intel", host: "wd1", siteId: "External" }, // ~609 reqs
];

export default companies;
