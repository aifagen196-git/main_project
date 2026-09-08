import { extractJobProfile } from "../processors/extractProfile.js";

/**
 * PostJobFree only exposes plain server-rendered HTML — no JSON API. Every
 * field here is scraped off the search-result snippet markup by
 * postjobfree.js's cheerio pass and handed in as this plain object.
 */
export async function normalizePostjobfree(raw) {
  const description = (raw.snippet || "").replace(/\s+/g, " ").trim();

  const profile = await extractJobProfile(description, { title: raw.title });

  const isRemote = /remote/i.test(raw.location || "");

  return {
    title: raw.title || "",

    company: raw.company || "",

    location: raw.location || (isRemote ? "Remote" : ""),

    employment_type: "",

    salary: null,

    description,

    source: "postjobfree",

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

    state: profile.state,

    is_remote_us: isRemote ? true : profile.is_remote_us,

    profile,

    match_score: 0,

    is_active: true,

    last_seen: new Date().toISOString(),

    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}
