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
 * @param {object} detail - fields already pulled from the microdata detail
 *   page by the collector: { title, descriptionHtml, locality, region,
 *   country, datePosted }
 * @param {string} company
 * @param {string} applyUrl
 */
export async function normalizeSuccessfactors(detail, company, applyUrl) {
  const description = cleanDescription(detail.descriptionHtml || "");

  const profile = await extractJobProfile(description, { title: detail.title });

  const location = [detail.locality, detail.region, detail.country]
    .filter(Boolean)
    .join(", ");

  return {
    title: detail.title,

    company,

    location,

    employment_type: "Full Time",

    salary: null,

    description,

    source: "successfactors",

    source_job_id: detail.jobId,

    apply_url: applyUrl,

    posted_date: detail.datePosted || null,

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
