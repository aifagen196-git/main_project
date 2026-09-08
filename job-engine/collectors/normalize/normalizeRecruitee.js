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

/**
 * Recruitee locations can show up in a few shapes depending on how the
 * board is configured: a flat city/state/country on the offer itself, or a
 * `locations` array for boards with multiple openings. We handle both.
 */
function extractLocation(job) {
  if (Array.isArray(job.locations) && job.locations.length) {
    return job.locations
      .map((l) => [l.city, l.state, l.country].filter(Boolean).join(", "))
      .filter(Boolean)
      .join(" | ");
  }

  return [job.city, job.state, job.country].filter(Boolean).join(", ");
}

function extractEmploymentType(job) {
  const code = job.employment_type_code || job.employment_type;

  const map = {
    fulltime: "Full Time",
    parttime: "Part Time",
    internship: "Internship",
    temporary: "Temporary",
    contract: "Contract",
    other: "Other",
  };

  return map[code] || code || "Full Time";
}

export async function normalizeRecruiteeJob(job, company) {
  const description = cleanDescription(
    `${job.description || ""}

${job.requirements || ""}

${job.remark || ""}`,
  );

  const profile = await extractJobProfile(description, { title: job.title });

  return {
    title: job.title,

    company,

    location: extractLocation(job),

    employment_type: extractEmploymentType(job),

    salary: null,

    description,

    source: "recruitee",

    source_job_id: String(job.id),

    apply_url:
      job.careers_apply_url ||
      job.careers_url ||
      `https://${company}.recruitee.com/o/${job.slug}`,

    posted_date: job.published_at || job.created_at || null,

    skills: profile.skills_required || [],

    skills_required: profile.skills_required || [],

    skills_preferred: profile.skills_preferred || [],

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
