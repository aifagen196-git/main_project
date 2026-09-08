import { extractJobProfile } from "../processors/extractProfile.js";

// DailyRemote's location "pill" is often a broad region (e.g. "North
// America", "Worldwide") even when the title is explicit about the country
// ("Content Reviewer - English Speaker in United States"). Falling back to
// the title when it names the US keeps isUsJob() from wrongly dropping a
// US-targeted posting just because the pill text was vague.
const US_TITLE_RE = /\b(in the united states|in united states|\(us\)|- us\b|,\s*usa?\b)/i;

function resolveLocation(pillLocation, title) {
  if (pillLocation && /united states/i.test(pillLocation)) return pillLocation;
  if (US_TITLE_RE.test(title || "")) return "United States";
  return pillLocation || "";
}

export async function normalizeDailyremote(raw) {
  const description = raw.tags?.length ? `Tags: ${raw.tags.join(", ")}.` : "";

  const profile = await extractJobProfile(description, { title: raw.title });

  const location = resolveLocation(raw.location, raw.title);
  const isRemote = true; // every listing on this board is remote by definition

  return {
    title: raw.title || "",

    company: raw.company || "",

    location: location || "Remote",

    employment_type: raw.employmentType || "",

    salary: raw.salary || null,

    description,

    source: "dailyremote",

    source_publisher: "",

    source_job_id: raw.id,

    apply_url: raw.applyUrl || "",

    posted_date: new Date().toISOString(),

    skills: raw.tags?.length ? raw.tags : profile.skills_required,

    skills_required: profile.skills_required,

    skills_preferred: profile.skills_preferred,

    role_family: profile.role_family,

    min_years: profile.min_years,

    country: profile.country,

    state: profile.state,

    is_remote_us: /united states/i.test(location) ? true : profile.is_remote_us,

    profile,

    match_score: 0,

    is_active: true,

    last_seen: new Date().toISOString(),

    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}
