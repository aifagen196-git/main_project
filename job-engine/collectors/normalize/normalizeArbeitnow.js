import { extractJobProfile } from "../processors/extractProfile.js";

/**
 * Converts a raw Arbeitnow API job into the enriched job shape the other
 * collectors produce. Field names follow their documented
 * `/api/job-board-api` response schema.
 */
export async function normalizeArbeitnow(job) {
  const description = (job.description || "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const profile = await extractJobProfile(description, { title: job.title });

  // Arbeitnow's `location` is free text, often multiple cities joined by
  // "; " (e.g. "Berlin; Munich; Remote") rather than one canonical value —
  // left as-is for isUsJob's substring matching rather than picked apart,
  // same treatment WWR gives its region/state/country fields.
  const location = job.location || "";

  return {
    title: job.title || "",

    company: job.company_name || "",

    location,

    employment_type: job.job_types?.length ? job.job_types.join(", ") : (job.remote ? "Remote" : ""),

    salary: null,

    description,

    source: "arbeitnow",

    source_job_id: String(job.slug),

    apply_url: job.url || "",

    posted_date: job.created_at
      ? new Date(job.created_at * 1000).toISOString()
      : new Date().toISOString(),

    skills: job.tags?.length ? job.tags : profile.skills_required,

    skills_required: profile.skills_required,

    skills_preferred: profile.skills_preferred,

    role_family: profile.role_family,

    min_years: profile.min_years,

    country: profile.country,

    state: profile.state,

    is_remote_us: (job.remote && /\b(usa|u\.s\.a?\.?|united states)\b/i.test(location)) || profile.is_remote_us,

    profile,

    match_score: 0,

    is_active: true,

    last_seen: new Date().toISOString(),

    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}
