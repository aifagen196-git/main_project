import { extractJobProfile } from "./extractProfile.js";
import normalizeCompany from "./companyNormalizer.js";
import parseLocation from "./locationParser.js";
import extractEmploymentType from "./employmentTypeExtractor.js";
import { normalizeCountry, normalizeEmploymentType } from "./canonicalFields.js";

/**
 * Cleans HTML from Ashby descriptions
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

export async function normalizeAshby(job, company) {
  const description = cleanDescription(
    job.descriptionHtml || job.descriptionPlain || ""
  );

  const profile = await extractJobProfile(description);
  const location = job.location || "";
  const loc = parseLocation(location);

  return {
    title: job.title,
    company: normalizeCompany(company) || company,
    location,
    employment_type: normalizeEmploymentType(
      job.employmentType || extractEmploymentType(description),
    ),
    salary: null,
    description,
    source: "ashby",
    source_job_id: String(job.id),
    apply_url: job.applyUrl,
    posted_date: job.publishedAt,
    skills: profile.skills_required,
    skills_required: profile.skills_required,
    skills_preferred: profile.skills_preferred,
    role_family: profile.role_family,
    min_years: profile.min_years,
    country: normalizeCountry(loc.country || profile.country),
    state: loc.state || profile.state,
    is_remote_us:
      profile.is_remote_us || (loc.remote && loc.country === "United States"),
    profile,
    match_score: 0,
    is_active: true,
    last_seen: new Date().toISOString(),
    expires_at: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ).toISOString(),
  };
}