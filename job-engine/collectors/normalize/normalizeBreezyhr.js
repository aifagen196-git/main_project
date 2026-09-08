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

function extractLocation(job) {
  const loc = job.location;
  if (!loc) return "";
  if (loc.is_remote) return "Remote";
  return [loc.state?.name, loc.country?.name].filter(Boolean).join(", ") || loc.name || "";
}

export async function normalizeBreezyhr(job, company) {
  const description = cleanDescription(job.description || "");

  const profile = await extractJobProfile(description, { title: job.name });

  return {
    title: job.name,

    company,

    location: extractLocation(job),

    employment_type: job.type?.name || "Full Time",

    salary: job.salary || null,

    description,

    source: "breezyhr",

    source_job_id: String(job.id),

    apply_url: job.url,

    posted_date: job.published_date || null,

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
