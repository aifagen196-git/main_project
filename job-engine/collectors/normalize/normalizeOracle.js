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

/**
 * Oracle keeps the posting body in `ExternalDescriptionStr` and the
 * requirements in `ExternalQualificationsStr` / `ExternalResponsibilitiesStr`.
 * Only the first is reliably populated, but where the other two exist they
 * hold the skill keywords, so all three are joined before extraction.
 */
function fullDescription(detail) {
  return [
    detail.ExternalDescriptionStr,
    detail.ExternalResponsibilitiesStr,
    detail.ExternalQualificationsStr,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * `PrimaryLocation` is already a human string ("Bangalore, Karnataka,
 * India") but for US reqs it usually stops at the state ("Austin, TX"), so
 * the ISO-2 `PrimaryLocationCountry` is folded in the way normalizeWorkday
 * folds in its country descriptor — isUsJob() reads the location string, and
 * a bare "US" is one of the markers it recognises.
 */
function extractLocation(listing, detail) {
  const base = detail.PrimaryLocation || listing.PrimaryLocation || "";
  const code = (
    detail.PrimaryLocationCountry ||
    listing.PrimaryLocationCountry ||
    ""
  ).toUpperCase();

  if (!code) return base;
  if (!base) return code === "US" ? "US" : code;

  // Avoid "Austin, TX, US" turning into "...US, US" on reruns.
  if (new RegExp(`\\b${code}\\b`).test(base)) return base;

  return `${base}, ${code}`;
}

/**
 * @param {object} listing - one requisitionList entry
 * @param {object} detail - the recruitingCEJobRequisitionDetails item
 * @param {string} company - config label, e.g. "wesco"
 * @param {string} applyUrl
 */
export async function normalizeOracle(listing, detail, company, applyUrl) {
  const description = cleanDescription(fullDescription(detail));

  const profile = await extractJobProfile(description, { title: (detail.Title || listing.Title) });

  return {
    title: detail.Title || listing.Title,

    company,

    location: extractLocation(listing, detail),

    employment_type: listing.JobSchedule || detail.JobSchedule || "Full Time",

    salary: null,

    description,

    source: "oracle",

    // Requisition ids ("25101") are only unique within a tenant, so
    // namespace by company — same pattern as normalizeWorkday.
    source_job_id: `${company}:${detail.Id || listing.Id}`,

    apply_url: applyUrl,

    // PostedDate is on the LIST row (a plain "2026-08-05" date); the detail
    // payload calls the same thing ExternalPostedStartDate.
    posted_date: listing.PostedDate || detail.ExternalPostedStartDate || null,

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
