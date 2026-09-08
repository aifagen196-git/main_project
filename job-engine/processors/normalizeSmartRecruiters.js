import { extractJobProfile } from "../collectors/processors/extractProfile.js";
import normalizeCompany from "./companyNormalizer.js";
import extractEmploymentType from "./employmentTypeExtractor.js";
import {
  normalizeCountry,
  normalizeEmploymentType,
  isUnitedStates,
} from "./canonicalFields.js";

/**
 * Removes HTML tags
 */
function cleanDescription(text = "") {
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export async function normalizeSmartRecruiters(job) {

  const description = cleanDescription(
    (job.jobAd?.sections?.jobDescription?.text || "") +
    "\n" +
    (job.jobAd?.sections?.qualifications?.text || "") +
    "\n" +
    (job.jobAd?.sections?.additionalInformation?.text || "")
  );

  const profile = await extractJobProfile(description);

  return {

    title: job.name,

    company: normalizeCompany(job.company?.name) || job.company?.name || "",

    location: job.location?.fullLocation || "",

    employment_type: normalizeEmploymentType(
      job.typeOfEmployment?.label || extractEmploymentType(description),
    ),

    salary: null,

    description,

    source: "smartrecruiters",

    source_job_id: String(job.id),

    apply_url: job.applyUrl,

    posted_date: job.releasedDate,

    skills: profile.skills_required,

    skills_required: profile.skills_required,

    skills_preferred: profile.skills_preferred,

    role_family: profile.role_family,

    min_years: profile.min_years,

    country: normalizeCountry(job.location?.country),

    state: job.location?.region || null,

    is_remote_us:
      job.location?.remote === true && isUnitedStates(job.location?.country),

    profile,

    match_score: 0,

    is_active: true,

    last_seen: new Date().toISOString(),

    expires_at: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ).toISOString(),

  };
}