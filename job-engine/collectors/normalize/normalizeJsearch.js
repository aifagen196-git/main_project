import { extractJobProfile } from "../processors/extractProfile.js";

/**
 * Converts a raw JSearch API job object into an enriched AIFAGen job
 * object, matching the shape produced by the other collectors.
 *
 * We keep `source: "jsearch"` (not "indeed") so it's clear in the DB that
 * this row came through the aggregator, not a direct Indeed integration.
 * The original publisher is preserved separately in `source_publisher`
 * in case you want to filter/report on it later.
 */
export async function normalizeJSearch(job) {
  const description = (job.job_description || "").trim();

  const profile = await extractJobProfile(description, { title: job.job_title });

  const location = [job.job_city, job.job_state, job.job_country]
    .filter(Boolean)
    .join(", ");

  let salary = null;
  if (job.job_min_salary || job.job_max_salary) {
    const min = job.job_min_salary ? `$${job.job_min_salary}` : "";
    const max = job.job_max_salary ? `$${job.job_max_salary}` : "";
    salary = [min, max].filter(Boolean).join(" - ") || null;
  }

  return {
    title: job.job_title || "",

    company: job.employer_name || "",

    location: location || "",

    employment_type: job.job_employment_type || "",

    salary,

    description,

    source: "jsearch",

    source_publisher: job.job_publisher || "",

    source_job_id: String(job.job_id),

    apply_url: job.job_apply_link || "",

    posted_date: job.job_posted_at_datetime_utc || new Date().toISOString(),

    skills: profile.skills_required,

    skills_required: profile.skills_required,

    skills_preferred: profile.skills_preferred,

    role_family: profile.role_family,

    min_years: profile.min_years,

    country: profile.country,

    state: profile.state,

    is_remote_us: job.job_is_remote ?? profile.is_remote_us,

    profile,

    match_score: 0,

    is_active: true,

    last_seen: new Date().toISOString(),

    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}
