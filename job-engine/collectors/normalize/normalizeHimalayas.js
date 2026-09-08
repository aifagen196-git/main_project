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
 * Himalayas jobs carry `locationRestrictions` as an array of country/region
 * names (e.g. ["United States"], ["Worldwide"]) rather than a free-text
 * string, so we join them into one string for isUsJob's location matcher.
 */
export async function normalizeHimalayasJob(job) {
  const description = cleanDescription(job.description || job.excerpt || "");

  const profile = await extractJobProfile(description, { title: job.title });

  const location = Array.isArray(job.locationRestrictions)
    ? job.locationRestrictions.join(", ")
    : job.locationRestrictions || "";

  let salary = null;
  if (job.minSalary || job.maxSalary) {
    const currency = job.currency || "$";
    const min = job.minSalary ? `${currency}${job.minSalary}` : "";
    const max = job.maxSalary ? `${currency}${job.maxSalary}` : "";
    salary = [min, max].filter(Boolean).join(" - ") || null;
  }

  return {
    title: job.title || "",

    company: job.companyName || "",

    location,

    employment_type: job.employmentType || "Full Time",

    salary,

    description,

    source: "himalayas",

    source_job_id: String(job.guid),

    apply_url: job.applicationLink || job.guid || "",

    posted_date: job.pubDate
      ? new Date(job.pubDate * 1000).toISOString()
      : new Date().toISOString(),

    skills:
      job.categories && job.categories.length
        ? job.categories
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

    expires_at: job.expiryDate
      ? new Date(job.expiryDate * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}
