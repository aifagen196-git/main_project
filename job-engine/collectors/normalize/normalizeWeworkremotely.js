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
 * WWR's RSS <title> is "Company: Job Title" — split on the first colon.
 * Some listings omit the company (rare), in which case we fall back to
 * the raw title.
 */
export function splitTitle(rawTitle = "") {
  const idx = rawTitle.indexOf(":");
  if (idx === -1) return { company: "", title: rawTitle.trim() };
  return {
    company: rawTitle.slice(0, idx).trim(),
    title: rawTitle.slice(idx + 1).trim(),
  };
}

export async function normalizeWeWorkRemotelyJob(item) {
  const { company, title } = splitTitle(item.title);

  const description = cleanDescription(item.description || "");

  const profile = await extractJobProfile(description, { title });

  const location = [item.region, item.state, item.country]
    .filter(Boolean)
    .join(", ");

  return {
    title,

    company,

    location,

    employment_type: item.type || "Full Time",

    salary: null,

    description,

    source: "weworkremotely",

    source_job_id: String(item.guid || item.link),

    apply_url: item.link || "",

    posted_date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),

    skills: item.skills
      ? item.skills.split(",").map((s) => s.trim()).filter(Boolean)
      : profile.skills_required,

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
