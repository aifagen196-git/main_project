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
 * BambooHR's /careers/list entries and /careers/{id}/detail responses both
 * carry a `location` (city/state, often null) and `atsLocation` (country/
 * state/province/city, also often null) object -- most boards simply don't
 * fill these in, so we fall back to the free-text `employmentStatusLabel`
 * (e.g. "US Employee") which is populated far more consistently and is a
 * reasonable US signal on its own.
 */
function extractLocation(job) {
  const loc = job.location || {};
  const ats = job.atsLocation || {};
  const parts = [loc.city, loc.state || ats.state || ats.province, ats.country]
    .filter(Boolean);
  if (parts.length) return parts.join(", ");
  if (job.isRemote) return "Remote";
  if (job.employmentStatusLabel) return job.employmentStatusLabel;
  return "";
}

export async function normalizeBamboohr(job, company, detail) {
  const description = cleanDescription(
    detail?.description || job.description || "",
  );

  const profile = await extractJobProfile(description, { title: job.jobOpeningName });

  return {
    title: job.jobOpeningName,

    company,

    location: extractLocation(job),

    employment_type: job.employmentType || "Full Time",

    salary: null,

    description,

    source: "bamboohr",

    source_job_id: String(job.id),

    apply_url:
      detail?.jobOpeningShareUrl ||
      `https://${company}.bamboohr.com/careers/${job.id}`,

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
