import { extractJobProfile } from "../processors/extractProfile.js";

export async function normalizeJobvertise(raw) {
  const profile = await extractJobProfile(raw.description, { title: raw.title });

  const isRemote = /\bremote\b/i.test(raw.title) || /\bremote\b/i.test(raw.description);

  return {
    title: raw.title || "",

    company: raw.company || "",

    location: raw.location || (isRemote ? "Remote" : ""),

    employment_type: "",

    salary: null,

    description: raw.description,

    source: "jobvertise",

    source_publisher: "",

    source_job_id: raw.id,

    apply_url: raw.applyUrl || "",

    posted_date: raw.postedDate || new Date().toISOString(),

    skills: profile.skills_required,

    skills_required: profile.skills_required,

    skills_preferred: profile.skills_preferred,

    role_family: profile.role_family,

    min_years: profile.min_years,

    country: profile.country,

    state: raw.state || profile.state,

    is_remote_us: isRemote ? true : profile.is_remote_us,

    profile,

    match_score: 0,

    is_active: true,

    last_seen: new Date().toISOString(),

    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}
