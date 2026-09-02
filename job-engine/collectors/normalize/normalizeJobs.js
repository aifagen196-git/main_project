import { extractJobProfile } from "../processors/extractProfile.js";

/**
 * Cleans HTML entities and tags from job descriptions.
 */
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
 * Converts a raw Greenhouse job into
 * an enriched AIFAGen job object.
 */
export async function normalizeJob(job, company, details) {
  const description = cleanDescription(
    details?.content || details?.description || "",
  );

  const profile = await extractJobProfile(description, { title: job.title });

  return {
    title: job.title,

    company,

    location: job.location?.name || "",

    employment_type: "Full Time",

    salary: null,

    description,

    source: "greenhouse",

    source_job_id: String(job.id),

    apply_url: job.absolute_url,

    posted_date: job.updated_at,

    skills: profile.skills_required,

    skills_required: profile.skills_required,

    skills_preferred: profile.skills_preferred,

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
