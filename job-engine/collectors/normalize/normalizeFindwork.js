import { extractJobProfile } from "../processors/extractProfile.js";

/**
 * Converts a raw Findwork.dev API job result into the enriched job shape
 * the other collectors produce. Field names follow Findwork's publicly
 * documented GET /api/jobs/ response schema (role, title, text,
 * company_name, location, remote, url, date_posted, keywords, source) —
 * NOT independently live-verified against a real API key the way
 * Careerjet's schema was (findwork.dev's docs page requires a logged-in
 * account); double-check field names against a real response before
 * trusting this in a cron run.
 */
export async function normalizeFindwork(job) {
  const description = (job.text || "").trim();

  const profile = await extractJobProfile(description, { title: job.role || job.title });

  return {
    title: job.role || job.title || "",

    company: job.company_name || "",

    location: job.remote ? "Remote" : job.location || "",

    employment_type: job.employment_type || "",

    salary: null,

    description,

    source: "findwork",

    source_publisher: job.source || "",

    source_job_id: String(job.id),

    apply_url: job.url || "",

    posted_date: job.date_posted || new Date().toISOString(),

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
