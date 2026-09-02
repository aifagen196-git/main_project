import { extractJobProfile } from "../processors/extractProfile.js";

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

  const profile = await extractJobProfile(description, { title: job.name });

  return {

    title: job.name,

    company: job.company?.name || "",

    location: job.location?.fullLocation || "",

    employment_type: job.typeOfEmployment?.label || "",

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

   country:
  job.location?.country?.toLowerCase() === "us"
    ? "USA"
    : (job.location?.country || "").toUpperCase(),

state: job.location?.region || null,

is_remote_us:
  job.location?.remote === true &&
  job.location?.country?.toLowerCase() === "us",

    profile,

    match_score: 0,

    is_active: true,

    last_seen: new Date().toISOString(),

    expires_at: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ).toISOString(),

  };
}