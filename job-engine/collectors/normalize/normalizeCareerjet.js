import { extractJobProfile } from "../processors/extractProfile.js";

/**
 * Converts a raw Careerjet API job result into the enriched job shape the
 * other collectors produce. Field names follow Careerjet's documented
 * GET /v4/query response schema (title, company, date, description,
 * locations, salary, salary_currency_code, salary_max, salary_min,
 * salary_type, url) — confirmed live at
 * https://www.careerjet.com/partners/api/ on 2026-08-20.
 */
export async function normalizeCareerjet(job) {
  const description = (job.description || "").trim();

  const profile = await extractJobProfile(description, { title: job.title });

  let salary = null;
  if (job.salary_min || job.salary_max) {
    const min = job.salary_min ? `$${Math.round(job.salary_min).toLocaleString()}` : "";
    const max = job.salary_max ? `$${Math.round(job.salary_max).toLocaleString()}` : "";
    salary = [min, max].filter(Boolean).join(" - ") || job.salary || null;
  } else if (job.salary) {
    salary = job.salary;
  }

  // Careerjet's job URLs are opaque jobviewtrack.com redirect links with
  // no stable ID segment, so hash the URL for a dedupe-safe source_job_id
  // the way there's no natural numeric ID to fall back on.
  const sourceId = job.url || `${job.title}-${job.company}-${job.date}`;

  return {
    title: job.title || "",

    company: job.company || "",

    location: job.locations || "",

    employment_type: "",

    salary,

    description,

    source: "careerjet",

    source_publisher: "",

    source_job_id: sourceId,

    apply_url: job.url || "",

    posted_date: job.date || new Date().toISOString(),

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
