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
 * Jobvite's JSON-LD `jobLocation` is an array of Place objects (usually one,
 * sometimes several for multi-location postings). Flatten to a single
 * free-text string, same shape every other normalizer in this repo hands
 * isUsJob().
 */
function extractLocation(ld) {
  const locations = Array.isArray(ld.jobLocation)
    ? ld.jobLocation
    : ld.jobLocation
      ? [ld.jobLocation]
      : [];

  const strings = locations.map((loc) => {
    const addr = loc?.address || {};
    return [addr.addressLocality, addr.addressRegion, addr.addressCountry]
      .filter(Boolean)
      .join(", ");
  });

  return strings.filter(Boolean).join(" | ");
}

export async function normalizeJobvite(ld, company, applyUrl) {
  const description = cleanDescription(ld.description || "");

  const profile = await extractJobProfile(description, { title: ld.title });

  return {
    title: ld.title,

    company,

    location: extractLocation(ld),

    employment_type: ld.employmentType || "Full Time",

    salary: ld.baseSalary?.value?.minValue || null,

    description,

    source: "jobvite",

    source_job_id: String(ld.identifier),

    apply_url: applyUrl,

    posted_date: ld.datePosted || null,

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
