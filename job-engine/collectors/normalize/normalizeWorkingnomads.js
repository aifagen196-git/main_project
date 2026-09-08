import { extractJobProfile } from "../processors/extractProfile.js";

/**
 * Converts a raw Working Nomads job into the enriched job shape the other
 * collectors produce. Field names confirmed live against
 * https://www.workingnomads.com/api/exposed_jobs/ on 2026-08-20 (url,
 * title, description (HTML), company_name, category_name, tags
 * (comma-separated string), location, pub_date).
 */
export async function normalizeWorkingnomads(job) {
  const description = (job.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  const profile = await extractJobProfile(description, { title: job.title });

  return {
    title: job.title || "",

    company: job.company_name || "",

    location: job.location || "Remote",

    employment_type: "",

    salary: null,

    description,

    source: "workingnomads",

    source_publisher: job.category_name || "",

    // No numeric id in the feed — the job's own URL carries a stable
    // numeric slug (.../job/go/1802649/), so use the full URL as the id.
    source_job_id: job.url || `${job.title}-${job.company_name}-${job.pub_date}`,

    apply_url: job.url || "",

    posted_date: job.pub_date || new Date().toISOString(),

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
