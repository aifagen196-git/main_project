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
 * Converts a raw JazzHR job listing row + detail-page HTML into an
 * enriched AIFAGen job object, matching the shape produced by the other
 * collectors.
 */
export async function normalizeJazzhr(job, company, descriptionHtml) {
  const description = cleanDescription(descriptionHtml || "");

  const profile = await extractJobProfile(description, { title: job.title });

  return {
    title: job.title,

    company,

    location: job.location || "",

    employment_type: "",

    salary: null,

    description,

    source: "jazzhr",

    source_job_id: job.jobId,

    apply_url: job.applyUrl,

    posted_date: job.postedDate || new Date().toISOString(),

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
