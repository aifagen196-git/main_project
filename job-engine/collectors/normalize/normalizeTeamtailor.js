import { extractJobProfile } from "../processors/extractProfile.js";

/**
 * Strips the rich-text HTML Teamtailor's editor produces in content_html.
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
 * Teamtailor's jobs.json is a JSON Feed (jsonfeed.org) — the useful
 * ATS-specific fields (location, employment type, posted date) live under
 * the embedded schema.org JobPosting object at `_jobposting`, not on the
 * feed item itself.
 */
function extractLocation(posting) {
  const place = posting?.jobLocation?.[0]?.address;
  if (!place) return "";
  return [place.addressLocality, place.addressRegion, place.addressCountry]
    .filter(Boolean)
    .join(", ");
}

export async function normalizeTeamtailor(item, company) {
  const posting = item._jobposting || {};

  const description = cleanDescription(item.content_html || posting.description || "");

  const profile = await extractJobProfile(description, { title: item.title });

  return {
    title: item.title,

    company,

    location: extractLocation(posting),

    employment_type: posting.employmentType || "Full Time",

    salary: null,

    description,

    source: "teamtailor",

    source_job_id: String(item.id),

    apply_url: item.url,

    posted_date: item.date_published || posting.datePosted || null,

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
