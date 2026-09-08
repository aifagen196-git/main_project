// collectors/lib/isGigListing.js
//
// Shared filter for gig/microtask "AI training data" postings that are not
// real jobs in the sense this repo collects: pay-per-completed-task work
// (rate this AI response, label this image, ...) rather than a genuine
// employer role. These slip past isUsJob (they're US-located) and past
// per-company allowlists on aggregators that don't have one (indeed.js has
// no allowlist mechanism at all), and they're SEO-farmed across dozens of
// unrelated job titles ("Backend Engineer - AI Trainer", "Cybersecurity
// Analyst - AI Trainer", ...) so a title-only check would need to enumerate
// every possible base title.
//
// Confirmed live: DataAnnotation.tech alone accounted for 180+ active rows
// in `jobs` via the indeed collector (source=indeed), all titled
// "<Some Role> - AI Trainer" — same category of listing already rejected
// wholesale from the WorkingNomads candidate source for its repeated TELUS
// Digital rating-task postings.
//
// Matches on company name (exact/near-exact, case-insensitive) rather than
// title text, since the company is the reliable signal here.

const GIG_MICROTASK_COMPANIES = [
  "dataannotation",
  "dataannotation.tech",
  "telus digital",
  "telus international ai data solutions",
  "appen",
  "lionbridge ai",
  "remotasks",
  "outlier ai",
  "outlier.ai",
  "toloka",
];

function normalize(name = "") {
  return String(name).toLowerCase().replace(/[^a-z0-9]/g, "");
}

const GIG_SET = new Set(GIG_MICROTASK_COMPANIES.map(normalize));

/**
 * @param {{company?: string, title?: string}} job
 * @returns {boolean} true if this looks like gig/microtask work, not a job
 */
export function isGigListing(job) {
  const company = normalize(job.company || "");
  if (!company) return false;
  if (GIG_SET.has(company)) return true;
  // Also catch "DataAnnotation Tech Inc", "TELUS Digital AI Data Solutions"
  // style variants that normalize() alone won't collapse to an exact match.
  for (const known of GIG_SET) {
    if (company.startsWith(known) || known.startsWith(company)) return true;
  }
  return false;
}
