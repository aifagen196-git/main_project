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

const EMPLOYMENT_TYPE_MAP = {
  permanent: "Full Time",
  temporary: "Contract",
  trainee: "Internship",
  intern: "Internship",
  freelance: "Contract",
};

export async function normalizePersonio(job, company) {
  const description = cleanDescription(job.descriptionHtml || "");

  const profile = await extractJobProfile(description, { title: job.name });

  return {
    title: job.name,

    company,

    location: [job.office, ...job.additionalOffices].filter(Boolean).join(" | "),

    employment_type:
      EMPLOYMENT_TYPE_MAP[String(job.employmentType || "").toLowerCase()] ||
      "Full Time",

    salary: null,

    description,

    source: "personio",

    source_job_id: String(job.id),

    apply_url: `https://${company}.jobs.personio.de/job/${job.id}`,

    posted_date: job.createdAt || null,

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
