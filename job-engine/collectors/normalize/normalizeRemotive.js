import { extractJobProfile } from "../processors/extractProfile.js";

/**
 * Converts a raw Remotive API job into the enriched job shape the other
 * collectors produce. Field names follow Remotive's documented
 * `/api/remote-jobs` response schema.
 */
export async function normalizeRemotive(job) {
  const description = (job.description || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  const profile = await extractJobProfile(description, { title: job.title });

  // Remotive's `candidate_required_location` is the only location signal it
  // gives — often "Worldwide" (all-remote listings with no country
  // restriction), sometimes a real country/region. isUsJob treats a bare
  // "Worldwide" as non-US, which is the conservative and correct call: it
  // means "no restriction", not "US-based".
  const location = job.candidate_required_location || "";

  return {
    title: job.title || "",

    company: job.company_name || "",

    location,

    employment_type: job.job_type || "",

    salary: job.salary || null,

    description,

    source: "remotive",

    source_job_id: String(job.id),

    apply_url: job.url || "",

    posted_date: job.publication_date || new Date().toISOString(),

    skills: job.tags?.length ? job.tags : profile.skills_required,

    skills_required: profile.skills_required,

    skills_preferred: profile.skills_preferred,

    role_family: profile.role_family,

    min_years: profile.min_years,

    country: profile.country,

    state: profile.state,

    is_remote_us: /\b(usa|u\.s\.a?\.?|united states)\b/i.test(location) || profile.is_remote_us,

    profile,

    match_score: 0,

    is_active: true,

    last_seen: new Date().toISOString(),

    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}
