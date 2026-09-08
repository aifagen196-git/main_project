import { extractJobProfile } from "../processors/extractProfile.js";

/**
 * HiringCafe doesn't expose the original job-ad body text (it only ever
 * shows/stores its own AI-generated `requirements_summary`), so the
 * "description" we feed extractJobProfile is synthesized from every text
 * field HiringCafe already extracted — summary, role activities, and
 * technical tools — rather than a single HTML blob like the ATS collectors
 * get. This is thinner than a real JD but still enough for
 * skills/role-family heuristics to work off of.
 */
function buildDescription(v5 = {}) {
  const parts = [
    v5.requirements_summary,
    Array.isArray(v5.role_activities) && v5.role_activities.length
      ? `Responsibilities: ${v5.role_activities.join(", ")}.`
      : "",
    Array.isArray(v5.technical_tools) && v5.technical_tools.length
      ? `Tools: ${v5.technical_tools.join(", ")}.`
      : "",
  ];
  return parts.filter(Boolean).join(" ").trim();
}

function formatMoney(n) {
  return `$${Math.round(Number(n)).toLocaleString()}`;
}

/**
 * HiringCafe reports compensation across five possible frequencies
 * (yearly/monthly/weekly/bi-weekly/daily/hourly — all-or-nothing per job,
 * never more than one populated), so we check each in priority order
 * rather than assuming yearly like the other normalizers can.
 */
function buildSalary(v5 = {}) {
  const pairs = [
    ["yearly_min_compensation", "yearly_max_compensation"],
    ["monthly_min_compensation", "monthly_max_compensation"],
    ["weekly_min_compensation", "weekly_max_compensation"],
    ["bi-weekly_min_compensation", "bi-weekly_max_compensation"],
    ["daily_min_compensation", "daily_max_compensation"],
    ["hourly_min_compensation", "hourly_max_compensation"],
  ];
  for (const [minKey, maxKey] of pairs) {
    const min = v5[minKey];
    const max = v5[maxKey];
    if (min || max) {
      const parts = [min ? formatMoney(min) : "", max ? formatMoney(max) : ""];
      return parts.filter(Boolean).join(" - ") || null;
    }
  }
  return null;
}

function buildLocation(v5 = {}) {
  if (v5.formatted_workplace_location) return v5.formatted_workplace_location;
  if (v5.workplace_type === "Remote") {
    const countries = v5.workplace_countries || [];
    return countries.includes("US") ? "Remote - US" : "Remote";
  }
  return (v5.workplace_cities || v5.workplace_states || [])[0] || "";
}

export async function normalizeHiringcafeJob(hit) {
  const v5 = hit.v5_processed_job_data || {};
  const title = v5.core_job_title || hit.job_information?.title || hit.job_information?.job_title_raw || "";
  const description = buildDescription(v5);

  const profile = await extractJobProfile(description, { title });

  const countries = v5.workplace_countries || [];
  const isRemote = v5.workplace_type === "Remote";
  const isRemoteUs = isRemote && (countries.includes("US") || countries.length === 0);

  return {
    title,

    company: v5.company_name || hit.enriched_company_data?.name || "",

    location: buildLocation(v5),

    employment_type: (v5.commitment || [])[0] || "",

    salary: buildSalary(v5),

    description,

    source: "hiringcafe",

    // Which underlying ATS/board HiringCafe scraped this from — useful for
    // dedup/debugging since the same posting can also surface through this
    // repo's own direct ATS collectors (greenhouse.js, lever.js, ...).
    source_publisher: hit.source || "",

    source_job_id: String(hit.id),

    apply_url: hit.apply_url || "",

    posted_date: v5.estimated_publish_date || new Date().toISOString(),

    skills: (v5.technical_tools && v5.technical_tools.length) ? v5.technical_tools : profile.skills_required,

    skills_required: profile.skills_required,

    skills_preferred: profile.skills_preferred,

    role_family: profile.role_family,

    // HiringCafe reports YOE at half-year granularity (0.5, 1.5, 2.5, ...)
    // but the jobs table's min_years column is an integer — round down so a
    // "1.5+ years" posting doesn't get bumped up to the 2-year bucket.
    min_years: v5.min_industry_and_role_yoe != null
      ? Math.floor(v5.min_industry_and_role_yoe)
      : profile.min_years,

    country: countries.includes("US") ? "US" : (profile.country || null),

    state: (v5.workplace_states || [])[0] || profile.state,

    is_remote_us: isRemoteUs || profile.is_remote_us,

    profile,

    match_score: 0,

    is_active: true,

    last_seen: new Date().toISOString(),

    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}
