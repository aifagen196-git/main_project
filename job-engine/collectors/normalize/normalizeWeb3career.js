import { extractJobProfile } from "../processors/extractProfile.js";

export async function normalizeWeb3career(raw) {
  const description = raw.tags?.length ? `Tags: ${raw.tags.join(", ")}.` : "";

  const profile = await extractJobProfile(description, { title: raw.title });

  return {
    title: raw.title || "",

    company: raw.company || "",

    location: raw.location || "",

    employment_type: "",

    salary: raw.salary || null,

    description,

    source: "web3career",

    source_publisher: "",

    source_job_id: raw.id,

    apply_url: raw.applyUrl || "",

    posted_date: raw.postedDate || new Date().toISOString(),

    skills: raw.tags?.length ? raw.tags : profile.skills_required,

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

    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}
