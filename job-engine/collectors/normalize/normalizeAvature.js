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
 * @param {object} detail - already-extracted fields from avature.js's
 *   per-template scraper: { title, location, descriptionHtml, jobId }
 * @param {string} company
 * @param {string} applyUrl
 */
export async function normalizeAvature(detail, company, applyUrl) {
  const description = cleanDescription(detail.descriptionHtml || "");

  const profile = await extractJobProfile(description, { title: detail.title });

  return {
    title: detail.title,

    company,

    location: detail.location || "",

    employment_type: "Full Time",

    salary: null,

    description,

    source: "avature",

    source_job_id: `${company}:${detail.jobId}`,

    apply_url: applyUrl,

    // No template observed so far exposes a machine-readable posted date
    // (Koch's "Job Number" table has no date row) -- left null rather than
    // stamping "now", same convention as normalizeBamboohr/normalizePinpoint.
    posted_date: null,

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
