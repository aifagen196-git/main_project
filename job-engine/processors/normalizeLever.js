import { extractJobProfile } from "./extractProfile.js";
import normalizeCompany from "./companyNormalizer.js";
import parseLocation from "./locationParser.js";
import extractEmploymentType from "./employmentTypeExtractor.js";
import { normalizeCountry, normalizeEmploymentType } from "./canonicalFields.js";

function cleanDescription(html = "") {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function normalizeLever(job, company) {
  const description = cleanDescription(
    job.descriptionPlain || job.description || "",
  );

  const profile = await extractJobProfile(description);
  const location = job.categories?.location || "";
  const loc = parseLocation(location);

  return {
    title: job.text || "Untitled",

    company: normalizeCompany(company) || company,

    location,

    employment_type:
      normalizeEmploymentType(
        job.categories?.commitment || extractEmploymentType(description),
      ) || "Full Time",

    salary: null,

    description,

    source: "lever",

    source_job_id: String(job.id),

    apply_url: job.hostedUrl,

    posted_date: job.createdAt ? new Date(job.createdAt).toISOString() : null,

    skills: profile.skills_required || [],

    skills_required: profile.skills_required || [],

    skills_preferred: profile.skills_preferred || [],

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

    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}
