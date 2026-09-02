import { extractJobProfile } from "../processors/extractProfile.js";

/**
 * Converts a raw The Muse API job into the enriched job shape the other
 * collectors produce. Field names follow their documented
 * `/api/public/jobs` response schema.
 */
export async function normalizeMuse(job) {
  const description = (job.contents || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

  const profile = await extractJobProfile(description, { title: job.name });

  // Muse jobs can carry several locations (e.g. multiple offices) — join
  // them into one free-text string for isUsJob/location, same convention as
  // Jobicy's geo field.
  const location = (job.locations || []).map((l) => l.name).join(", ");

  const levels = (job.levels || []).map((l) => l.name).join(", ");

  return {
    title: job.name || "",

    company: job.company?.name || "",

    location,

    employment_type: levels,

    salary: null,

    description,

    source: "muse",

    source_job_id: String(job.id),

    apply_url: job.refs?.landing_page || "",

    posted_date: job.publication_date || new Date().toISOString(),

    skills: job.categories?.length
      ? job.categories.map((c) => c.name)
      : profile.skills_required,

    skills_required: profile.skills_required,

    skills_preferred: profile.skills_preferred,

    role_family: profile.role_family,

    min_years: profile.min_years,

    country: profile.country,

    state: profile.state,

    // The collector always requests location=United States server-side (see
    // muse.js fetchSearch), so every job reaching this normalizer already
    // passed Muse's own US-location filter. Their `locations[].name` values
    // are often a city or "Flexible / Remote" with no country token at all,
    // which isUsJob's generic text matching would otherwise reject as a
    // false negative -- so this is asserted true rather than re-derived from
    // free text, same trust placed in Jobicy's server-side geo=usa param.
    is_remote_us: true,

    profile,

    match_score: 0,

    is_active: true,

    last_seen: new Date().toISOString(),

    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}
