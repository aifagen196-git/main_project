import { extractJobProfile } from "../processors/extractProfile.js";

/**
 * Converts a raw Adzuna API job result into the enriched job shape the
 * other collectors produce. Field names follow Adzuna's documented
 * `/v1/api/jobs/{country}/search/{page}` response schema.
 */
export async function normalizeAdzuna(job) {
  const description = (job.description || "").trim();

  const profile = await extractJobProfile(description, { title: job.title });

  const location = job.location?.display_name || "";

  let salary = null;
  if (job.salary_min || job.salary_max) {
    const min = job.salary_min ? `$${Math.round(job.salary_min).toLocaleString()}` : "";
    const max = job.salary_max ? `$${Math.round(job.salary_max).toLocaleString()}` : "";
    salary = [min, max].filter(Boolean).join(" - ") || null;
  }

  return {
    title: job.title || "",

    company: job.company?.display_name || "",

    location,

    employment_type: job.contract_time || job.contract_type || "",

    salary,

    description,

    source: "adzuna",

    // Adzuna's job category label ("IT Jobs", "Logistics & Warehouse Jobs",
    // ...) reuses the `source_publisher` column jsearch.js already writes to
    // (there's no dedicated category column) — useful so a broad "supply
    // chain" text search doesn't drown in unrelated results.
    source_publisher: job.category?.label || "",

    source_job_id: String(job.id),

    apply_url: job.redirect_url || "",

    posted_date: job.created || new Date().toISOString(),

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
