// processors/normalizeDice.js
//
// Maps one dataset item from unfenced-group/dice-scraper (Apify) into this
// app's row shape.
//
// VERIFIED against real live responses (2026-08-24, two throwaway test
// calls, ~10 real jobs total) — not a documentation-only guess. Real fields
// confirmed: diceJobId, title, company, city, state, country, workplaceType,
// employmentType, salaryText/salaryMin/salaryMax/salaryPeriod, description,
// skills (array), detailsPageUrl.
//
// Three real data-quality issues found in the live response, all handled
// below:
//   1. `company` comes back URL-encoded (e.g. "iconectiv%2C LLC." for
//      "iconectiv, LLC.") — decoded here.
//   2. `state` is sometimes contaminated with a trailing "• Xd ago" /
//      "• Today" fragment that belongs to a different field entirely —
//      stripped here.
//   3. `postedDate` is NOT a date — it holds badge text instead
//      ("Sponsored", "Easy Apply"). The real, reliable timestamp is
//      `publishDateISO`. Do not use postedDate for anything.
//
// description and skills are both EMPTY unless the collector's request sets
// fetchDetails: true (see collectors/dice.js) — confirmed by testing the
// same query with and without that flag.

function cleanCompany(raw) {
  if (!raw) return "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw; // malformed % sequence — fall back to the raw string
  }
}

// Strips a trailing "• Xd ago" / "• Today" fragment that can contaminate
// either `state` or `jobLocation` — same cleanup, two possible fields.
function stripAgeSuffix(raw) {
  if (!raw) return "";
  return raw.replace(/\s*•.*$/, "").trim();
}

function salaryText(job) {
  if (job.salaryText) return job.salaryText;
  if (job.salaryMin && job.salaryMax) {
    const currency = job.salaryCurrency || "$";
    const period = job.salaryPeriod ? ` / ${job.salaryPeriod}` : "";
    return `${currency}${job.salaryMin} - ${currency}${job.salaryMax}${period}`;
  }
  return "";
}

export default function normalizeDice(job) {
  const location =
    [job.city, stripAgeSuffix(job.state)].filter(Boolean).join(", ") ||
    stripAgeSuffix(job.jobLocation || ""); // same "• Xd ago" contamination can
  // land in jobLocation too when city/state are both empty — clean it the
  // same way rather than passing it through raw.

  return {
    source: "dice",
    source_job_id: String(job.diceJobId || job.guid || ""),
    title: job.title || "",
    company: cleanCompany(job.company),
    location,
    country: job.country || "",
    apply_url: job.detailsPageUrl || "",
    salary: salaryText(job),
    // publishDateISO, not postedDate — see header.
    posted_date: job.publishDateISO ? new Date(job.publishDateISO).toISOString() : null,
    description: job.description || job.descriptionPreview || "",
    employment_type: job.employmentType || "",
    skills: Array.isArray(job.skills) ? job.skills : [],
    is_remote_us: job.workplaceType === "Remote",
  };
}
