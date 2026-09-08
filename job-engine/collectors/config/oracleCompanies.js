// collectors/config/oracleCompanies.js
//
// Oracle Recruiting Cloud (Fusion HCM Candidate Experience) tenants the
// collector scrapes via the public `recruitingCEJobRequisitions` /
// `recruitingCEJobRequisitionDetails` REST resources.
//
// Oracle has no multi-tenant discovery like Greenhouse — every customer runs
// its own pod (a random 4-letter subdomain, e.g. "eklm") on a regional shard
// (us2, em2, us6, ca2, ...) plus a `siteNumber` naming their specific career
// site ("CX", "CX_1", ...). None of that is derivable from the company name,
// so entries here are hand-verified with `npm run verify:oracle` rather than
// generated. Two tenants below have generic page titles ("Candidate
// Experience site") that didn't resolve to a company name during
// verification — kept in because the API itself is confirmed live and
// returning real US requisitions; relabel once the owning company is known.
//
// An entry may also carry an optional `host`, which replaces the derived
// `{pod}.fa.{region}.oraclecloud.com` base for customers who serve the
// Candidate Experience app from their own domain (see Dell below).
//
// Verified live 2026-08-05.

const companies = [
  { company: "wesco", pod: "eklm", region: "us2", siteNumber: "CX" },
  { company: "oracle", pod: "eeho", region: "us2", siteNumber: "CX_1" },
  { company: "apparel-career-site", pod: "ediu", region: "em2", siteNumber: "CX_1" },
  { company: "oracle-tenant-ejee", pod: "ejee", region: "us6", siteNumber: "CX" },
  { company: "oracle-tenant-ejov", pod: "ejov", region: "ca2", siteNumber: "CX" },
  { company: "oracle-tenant-hcgn", pod: "hcgn", region: "us2", siteNumber: "CX_1" },

  // Added 2026-08-11. Dell's public board (jobs.dell.com) is Oracle
  // Recruiting Cloud served from Dell's own domain — the marketing host
  // redirects API calls to enterpriseplatform.dell.com, which is where the
  // hcmRestApi resources actually live, so `host` is set and pod/region are
  // left null (they're never used when `host` is present). siteNumber is
  // read off the site's own favicon URLs in the jobs.dell.com HTML. Note the
  // ORC API ignores an unknown siteNumber and falls back to the tenant's
  // default site, so a typo here would NOT error — it would silently collect
  // the same reqs. ~370 US reqs at verification.
  {
    company: "dell",
    pod: null,
    region: null,
    siteNumber: "CX_1001",
    host: "enterpriseplatform.dell.com",
  },

  // Added 2026-09-01, requested bulk-volume free/no-key US coverage. Found by
  // fetching each company's own careers vanity domain and reading the
  // `{pod}.fa.{region}.oraclecloud.com` favicon/asset URLs out of the HTML —
  // same discovery method noted for Dell above, just without a `host`
  // override since these two serve the API straight off the oraclecloud.com
  // pod rather than their own domain. Both verified live: non-zero
  // `TotalJobsCount` and a populated `requisitionList` with real titles.
  {
    company: "kroger",
    pod: "eluq",
    region: "us2",
    siteNumber: "CX_2001",
  }, // ~12,000 reqs, overwhelmingly US retail/grocery roles
  {
    company: "honeywell",
    pod: "ibqbjb",
    region: "ocs",
    siteNumber: "CX_1",
  }, // ~1,340 reqs, global board — expect a large fraction dropped by isUsJob
];

export default companies;
