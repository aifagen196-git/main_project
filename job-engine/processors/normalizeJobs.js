import { extractJobProfile } from "../collectors/processors/extractProfile.js";
import cleanDescription from "./cleanDescription.js";
import normalizeCompany from "./companyNormalizer.js";
import parseLocation from "./locationParser.js";
import extractEmploymentType from "./employmentTypeExtractor.js";
import { normalizeCountry, normalizeEmploymentType } from "./canonicalFields.js";

/**
 * Converts a raw Greenhouse job into an enriched AIFAGen job object.
 */
export async function normalizeJob(job, company, details) {
  const description = cleanDescription(
    details?.content || details?.description || "",
  );

  const profile = await extractJobProfile(description);
  const location = job.location?.name || "";
  const loc = parseLocation(location);

  return {
    title: job.title,

    company: normalizeCompany(company) || company,

    location,

    // Greenhouse's jobs API has no structured employment-type field —
    // recover it from the description instead of blindly labeling every
    // posting "Full Time" (mislabels contract/intern/part-time postings).
    employment_type:
      normalizeEmploymentType(extractEmploymentType(description)) ||
      "Full Time",

    salary: null,

    description,

    source: "greenhouse",

    source_job_id: String(job.id),

    apply_url: job.absolute_url,

    posted_date: job.updated_at,

    skills: profile.skills_required,

    skills_required: profile.skills_required,

    skills_preferred: profile.skills_preferred,

    role_family: profile.role_family,

    min_years: profile.min_years,

    // ATS-provided location string is more reliable than description-based
    // detection — prefer it, fall back to the heuristic profile's guess.
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
