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
  return [loc.city, loc.state, loc.country].filter(Boolean).join(", ") || loc.name || "";
}

export async function normalizeComeet(job, company) {
  const descriptionHtml = (job.details || [])
    .map((d) => d.value)
    .filter(Boolean)
    .join(" ");
  const description = cleanDescription(descriptionHtml);

  const profile = await extractJobProfile(description, { title: job.name });

  return {
    title: job.name || "",

    company: job.company_name || company,

    location: extractLocation(job),

    employment_type: job.employment_type || "Full Time",

    salary: null,

    description,

    source: "comeet",

    source_job_id: String(job.uid),

    apply_url: job.url_active_page || job.url_comeet_hosted_page || "",

    posted_date: job.time_updated || null,

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
