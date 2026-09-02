import { extractJobProfile } from "../processors/extractProfile.js";

/**
 * Converts a raw Jobicy API job into the enriched job shape the other
 * collectors produce. Field names follow their documented `/api/v2/remote-
 * jobs` response schema.
 */
export async function normalizeJobicy(job) {
  const description = (job.jobDescription || job.jobExcerpt || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&hellip;/g, "...").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

  const profile = await extractJobProfile(description, { title: job.jobTitle });

  // jobGeo is Jobicy's own field, already a clean signal ("USA", "Anywhere",
  // "EMEA, LATAM, Canada, USA", ...) — better than deriving location from
  // free text, so it's used directly for both `location` and `is_remote_us`
  // rather than routed only through isUsJob's generic string matching.
  const geo = job.jobGeo || "";

  return {
    title: job.jobTitle || "",

    company: job.companyName || "",

    location: geo,

    employment_type: job.jobType?.length ? job.jobType.join(", ") : "",

    salary: job.annualSalaryMin || job.annualSalaryMax
      ? `$${job.annualSalaryMin || "?"} - $${job.annualSalaryMax || "?"} ${job.salaryCurrency || ""}`.trim()
      : null,

    description,

    source: "jobicy",

    source_job_id: String(job.id),

    apply_url: job.url || "",

    posted_date: job.pubDate || new Date().toISOString(),

    skills: job.jobIndustry?.length ? job.jobIndustry : profile.skills_required,

    skills_required: profile.skills_required,

    skills_preferred: profile.skills_preferred,

    role_family: profile.role_family,

    min_years: profile.min_years,

    country: profile.country,

    state: profile.state,

    // "Anywhere" deliberately isn't treated as US here — same call made for
    // Remotive's "Worldwide" — it means no restriction, not "open to US
    // applicants specifically", and asserting country eligibility we don't
    // actually know is worse than a false negative isUsJob can't recover.
    is_remote_us: /\busa\b/i.test(geo) || profile.is_remote_us,

    profile,

    match_score: 0,

    is_active: true,

    last_seen: new Date().toISOString(),

    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}
