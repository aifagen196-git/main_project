import { extractJobProfile } from "../processors/extractProfile.js";

/**
 * BuiltIn (builtin.com) only exposes plain HTML — no JSON API, no
 * `__NEXT_DATA__`-style embedded state like hiringcafe.js gets. Every field
 * here is scraped straight off the job-card markup by builtin.js's cheerio
 * pass and handed in as this plain object; this file just turns that into
 * the shared job row shape.
 */
export async function normalizeBuiltinJob(raw) {
  const description = [raw.summary, raw.skills?.length ? `Top skills: ${raw.skills.join(", ")}.` : ""]
    .filter(Boolean)
    .join(" ")
    .trim();

  const profile = await extractJobProfile(description, { title: raw.title });

  const isRemote = /remote/i.test(raw.workplaceType || "");

  return {
    title: raw.title || "",

    company: raw.company || "",

    location: raw.location || (isRemote ? "Remote" : ""),

    employment_type: raw.seniority || "",

    salary: raw.salary || null,

    description,

    source: "builtin",

    source_publisher: raw.category || "",

    source_job_id: String(raw.id),

    apply_url: raw.applyUrl || "",

    posted_date: new Date().toISOString(),

    skills: raw.skills?.length ? raw.skills : profile.skills_required,

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
