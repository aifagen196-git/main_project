import { extractJobProfile } from "../processors/extractProfile.js";

/**
 * Cleans HTML from Ashby descriptions
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

export async function normalizeAshby(job, company) {
  const description = cleanDescription(
    job.descriptionHtml || job.descriptionPlain || ""
  );

  const profile = await extractJobProfile(description, { title: job.title });

  return {
    title: job.title,
    company,
    location: job.location || "",
    employment_type: job.employmentType || "",
    salary: null,
    description,
    source: "ashby",
    source_job_id: String(job.id),
    apply_url: job.applyUrl,
    posted_date: job.publishedAt,
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
    expires_at: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ).toISOString(),
  };
}