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
 * @param {object} listing - one entry from the /jobs list endpoint
 * @param {object} detail - the /job/{externalPath} detail response
 * @param {string} company - config slug, e.g. "nvidia"
 * @param {string} applyUrl
 */
export async function normalizeWorkday(listing, detail, company, applyUrl) {
  const info = detail?.jobPostingInfo || {};
  const description = cleanDescription(info.jobDescription || "");

  const profile = await extractJobProfile(description, { title: (info.title || listing.title) });

  // Workday's list endpoint only gives a bare city ("BOSTON") with no state
  // or country, which isUsJob() can't recognize on its own (needs a comma +
  // state, a full state name, or a country marker). The detail endpoint does
  // carry a real country descriptor, so fold that into the location string
  // isUsJob() checks rather than relying solely on the LLM-inferred country
  // in `profile`.
  const countryName = info.country?.descriptor || "";
  const location = [listing.locationsText, countryName].filter(Boolean).join(", ");

  return {
    title: info.title || listing.title,

    company,

    location,

    employment_type: "Full Time",

    salary: null,

    description,

    source: "workday",

    source_job_id: `${company}:${info.id || listing.bulletFields?.[0] || listing.externalPath}`,

    apply_url: applyUrl,

    posted_date: info.startDate || info.postedOn || listing.postedOn || null,

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
