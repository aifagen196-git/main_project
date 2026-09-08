import { extractJobProfile } from "../processors/extractProfile.js";

/**
 * Converts a raw Jooble API job result into the enriched job shape the
 * other collectors produce. Field names follow Jooble's documented
 * POST /api/{key} response schema (title, location, snippet, salary,
 * source, type, link, company, updated, id).
 */
export async function normalizeJooble(job) {
  const description = (job.snippet || "").trim();

  const profile = await extractJobProfile(description, { title: job.title });

  return {
    title: job.title || "",

    company: job.company || "",

    location: job.location || "",

    employment_type: job.type || "",

    // Jooble returns salary as free text (e.g. "$80,000 - $100,000 a year"),
    // not min/max numbers like Adzuna — pass it through as-is.
    salary: job.salary || null,

    description,

    source: "jooble",

    // Jooble's own upstream site name ("Indeed", "LinkedIn", ...) — this
    // is an aggregator-of-aggregators, so keep it for dedupe/debugging the
    // way source_publisher is used elsewhere.
    source_publisher: job.source || "",

    source_job_id: String(job.id),

    apply_url: job.link || "",

    posted_date: job.updated || new Date().toISOString(),

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
