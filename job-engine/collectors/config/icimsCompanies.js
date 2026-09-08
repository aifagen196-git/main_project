// collectors/config/icimsCompanies.js
//
// iCIMS-hosted career sites the collector scrapes via the public
// `https://{host}/api/jobs` JSON endpoint.
//
// Entries are career-site HOSTS, not company slugs. iCIMS' current platform
// lets each customer front the site on their own domain (careers.acme.com)
// or on an icims.com subdomain, and there is no pattern linking the two to a
// company name — so each host has to be discovered and verified rather than
// derived. Verify additions with `npm run verify:icims <host>` first.
//
// IMPORTANT: this is the current career-site platform only. Classic iCIMS
// boards (careers-{company}.icims.com/jobs/search) 404 on /api/jobs — they
// are server-rendered HTML and would need a separate scraper, so do not add
// one here expecting it to work; verifyIcimsBoards.js will reject it.
//
// Verified live 2026-08-05.

const companies = [
  { company: "Foot Locker", host: "careers.footlocker.com" },
  { company: "PepsiCo", host: "careers.pepsico.com" },
  { company: "iCIMS HR Jobs", host: "hrjobs.icims.com" },
  { company: "iCIMS", host: "careers.icims.com" },
];

export default companies;
