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
 * RemoteOK jobs are remote-first with `location` holding either a blank
 * string, a region hint ("USA Only", "Worldwide"), or a specific place.
 * We pass the raw string through and let isUsJob's heuristics do the rest.
 */
export async function normalizeRemoteOkJob(job) {
  const description = cleanDescription(job.description || "");

  const profile = await extractJobProfile(description, {
    title: job.position || job.title,
  });

  const location = job.location || "";

  let salary = null;
  if (job.salary_min || job.salary_max) {
    const min = job.salary_min ? `$${job.salary_min}` : "";
    const max = job.salary_max ? `$${job.salary_max}` : "";
    salary = [min, max].filter(Boolean).join(" - ") || null;
  }

  return {
    title: job.position || job.title || "",

    company: job.company || "",

    location,

    employment_type: "Full Time",

    salary,

    description,

    source: "remoteok",

    source_job_id: String(job.id || job.slug),

    apply_url: job.url || job.apply_url || "",

    posted_date: job.date || new Date().toISOString(),

    skills: job.tags && job.tags.length ? job.tags : profile.skills_required,

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
