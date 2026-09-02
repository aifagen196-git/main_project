import { extractJobProfile } from "../processors/extractProfile.js";

/**
 * Cleans HTML entities and tags from job descriptions.
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

export async function normalizeWorkableJob(job, company) {
 const description = cleanDescription(
  `${job.description || ""}

${job.requirements || ""}

${job.benefits || ""}`
);

  const profile = await extractJobProfile(description, { title: job.title });

  return {
    title: job.title,

    company,

   location:
  job.locations?.map(l =>
    [l.city, l.region, l.country].filter(Boolean).join(", ")
  ).join(" | ") ||
  [job.location?.city, job.location?.region, job.location?.country]
    .filter(Boolean)
    .join(", "),

    employment_type: job.type || "Full Time",

    salary: null,

    description,

    source: "workable",

    source_job_id: String(job.id),

   apply_url: `https://apply.workable.com/${company}/j/${job.shortcode}/`,

   posted_date: job.published,

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
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  };
}