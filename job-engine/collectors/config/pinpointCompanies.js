// collectors/config/pinpointCompanies.js
//
// Pinpoint-hosted career sites the collector scrapes via the public
// `https://{slug}.pinpointhq.com/postings.json` feed.
//
// The slug is the career-site subdomain the customer picked, NOT a
// normalised company name — Pinpoint's own board is "workwithus" and
// Multiplier's is "multiplier-careers" — so it is not derivable from the
// company name and each entry carries both. Verify additions with
// `npm run verify:pinpoint <slug>` before adding them: an unknown slug
// still resolves (Pinpoint wildcards *.pinpointhq.com) and returns a 404
// HTML page rather than a network error.
//
// Pinpoint's customer base skews UK/EU, so a large share of postings on
// these boards are filtered out by lib/isUsJob.js — that is expected, not
// a bug. Verified live 2026-08-05.

const companies = [
  { company: "Impulse Space", slug: "impulsespace" },
  { company: "Breakthrough New York", slug: "btny" },
  { company: "RBW", slug: "rbw" },
  { company: "Multiplier", slug: "multiplier-careers" },
  { company: "Pinpoint", slug: "workwithus" },

  // Cross-portal sweep of company wishlist, verified live via postings.json on
  // 2026-08-14. NOTE: Pinpoint wildcards *.pinpointhq.com, and a large share
  // of guessed slugs matching well-known tech-company names turned out to be
  // demo/template accounts (identical boilerplate postings like "Head of DEI
  // - UK", "Marketing Manager", "Customer Service Rep" repeated verbatim
  // across dozens of unrelated slugs) or genuinely different, unrelated
  // small businesses that happen to share the name. Only slugs below were
  // kept after spot-checking that their posting titles/locations plausibly
  // match the named company's actual business.
  { company: "Sendbird", slug: "sendbird" }, // 4 live jobs
  { company: "Riskified", slug: "riskified" }, // 4 live jobs
  { company: "Exabeam", slug: "exabeam" }, // 6 live jobs
  { company: "Zoox", slug: "zoox" }, // 5 live jobs
  { company: "Skims", slug: "skims" }, // 102 live jobs
  { company: "Fender", slug: "fender" }, // 4 live jobs
  { company: "Magic", slug: "magic" }, // 70 live jobs
  { company: "SafetyWing", slug: "safetywing" }, // 4 live jobs
  { company: "GetYourGuide", slug: "getyourguide" }, // 4 live jobs
  { company: "Hazelcast", slug: "hazelcast" }, // 5 live jobs
  { company: "OpenX", slug: "openx" }, // 4 live jobs
  { company: "Pairwise", slug: "pairwise" }, // 4 live jobs
];

export default companies;
