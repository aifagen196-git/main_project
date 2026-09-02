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
 * iCIMS splits a posting into `description`, `responsibilities` and
 * `qualifications` -- the years-of-experience and skill keywords live almost
 * entirely in the last two, so all three are joined before extraction.
 */
function fullDescription(job) {
  return [job.description, job.responsibilities, job.qualifications]
    .filter(Boolean)
    .join(" ");
}

/**
 * iCIMS gives a free-text `location_name` ("United States (Remote)",
 * "Newark, NJ") plus a separate authoritative `country`/`country_code`. Fold
 * the country into the location string isUsJob() reads -- same approach as
 * normalizeWorkday -- but only when it isn't already in there, since for US
 * remote roles location_name usually already says so.
 */
function extractLocation(job) {
  const base = job.location_name || job.full_location || job.short_location || "";
  const country = job.country || "";

  if (!country) return base;
  if (!base) return country;
  if (base.toLowerCase().includes(country.toLowerCase())) return base;

  return `${base}, ${country}`;
}

/**
 * @param {object} job - one `jobs[].data` entry from /api/jobs
 * @param {string} company - config label, e.g. "Foot Locker"
 * @param {string} host - career-site host, used to namespace source_job_id
 */
export async function normalizeIcims(job, company, host) {
  const description = cleanDescription(fullDescription(job));

  const profile = await extractJobProfile(description, { title: job.title });

  return {
    title: (job.title || "").trim(),

    company,

    location: extractLocation(job),

    employment_type: job.employment_type || "Full Time",

    salary: null,

    description,

    source: "icims",

    // req_id is only unique within a tenant, so namespace it by host --
    // several iCIMS career sites hand out low integer ids like "6504".
    source_job_id: `${host}:${job.req_id || job.slug}`,

    apply_url: job.apply_url,

    posted_date: job.posted_date || job.create_date || null,

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
