import { extractJobProfile } from "../processors/extractProfile.js";

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

  const profile = await extractJobProfile(description, { title: job.text });

  return {
    title: job.text || "Untitled",

    company,

    location: job.categories?.location || "",

    employment_type: job.categories?.commitment || "Full Time",

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
