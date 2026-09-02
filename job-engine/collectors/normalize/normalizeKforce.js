import { extractJobProfile } from "../processors/extractProfile.js";

function cleanDescription(html = "") {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Kforce's search index splits a posting into `Responsibilities` (the body)
 * and `Skills` (a separate requirements blob) -- both are plain text, not
 * HTML, but cleanDescription() is harmless to run over plain text too and
 * keeps this consistent with every other normalizer in this repo.
 */
function fullDescription(doc) {
  return [doc.Responsibilities, doc.Skills].filter(Boolean).join(" ");
}

/**
 * Kforce is a US domestic staffing firm -- City/State/Zip are always
 * populated with real US locations in practice, so this is already the
 * "City, ST" shape isUsJob() recognizes without any extra folding.
 */
function extractLocation(doc) {
  return [doc.City, doc.State].filter(Boolean).join(", ");
}

/**
 * @param {object} doc - one result from the kforcewebjobentity search index
 */
export async function normalizeKforce(doc) {
  const description = cleanDescription(fullDescription(doc));

  const profile = await extractJobProfile(description, { title: doc.Title });

  return {
    title: doc.Title,

    // Kforce posts jobs on behalf of client companies rather than for
    // itself -- there is no per-posting client name in this index (only
    // Industry/ClientIndustry facets), so "company" is the staffing firm
    // itself, same convention Indeed/JSearch use for third-party postings.
    company: "kforce",

    location: extractLocation(doc),

    employment_type: doc.TypeCode || "Contract",

    salary: doc.SalaryMin ? Number(doc.SalaryMin) : null,

    description,

    source: "kforce",

    source_job_id: doc.ReferenceCode || doc.Id,

    apply_url: doc.ApplyUrl,

    posted_date: doc.PostDate || null,

    skills: profile.skills_required || [],

    skills_required: profile.skills_required || [],

    skills_preferred: profile.skills_preferred || [],

    role_family: profile.role_family,

    min_years: profile.min_years,

    country: profile.country,

    state: profile.state,

    is_remote_us: profile.is_remote_us,

    profile,

    match_score: 0,

    is_active: true,

    last_seen: new Date().toISOString(),

    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}
