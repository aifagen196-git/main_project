import { extractJobProfile } from "../processors/extractProfile.js";

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
 * Pinpoint splits a posting across four separate HTML fields rather than one
 * `description` blob -- the requirements (`skills_knowledge_expertise`) live
 * apart from the intro, and that is exactly where the skill keywords are. Join
 * them so extractJobProfile() sees the whole posting, not just the intro.
 */
function fullDescription(job) {
  return [
    job.description,
    job.key_responsibilities,
    job.skills_knowledge_expertise,
    job.benefits,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Pinpoint's `location` object has city/province/postal_code but no country
 * field at all, so "Austin, Texas" is the most isUsJob() can be given. The
 * separate `name` field is the recruiter's own label for the location and is
 * often "Remote" rather than a place, so it is only used as a fallback.
 */
function extractLocation(job) {
  const loc = job.location || {};
  const parts = [loc.city, loc.province].filter(Boolean);
  if (parts.length) return parts.join(", ");
  if (loc.name) return loc.name;
  return job.workplace_type === "remote" ? "Remote" : "";
}

export async function normalizePinpoint(job, company) {
  const description = cleanDescription(fullDescription(job));

  const profile = await extractJobProfile(description, { title: job.title });

  return {
    title: (job.title || "").trim(),

    company,

    location: extractLocation(job),

    employment_type: job.employment_type_text || "Full Time",

    salary: job.compensation_minimum ?? null,

    description,

    source: "pinpoint",

    source_job_id: String(job.id),

    apply_url: job.url,

    // Pinpoint's public postings.json carries no created/published
    // timestamp on the posting -- only `deadline_at`. Left null rather
    // than stamping "now", same convention as normalizeBamboohr.
    posted_date: null,

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

    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}
