import { extractJobProfile } from "../processors/extractProfile.js";

/**
 * Converts a raw USAJOBS `SearchResultItem` into the enriched job shape the
 * other collectors produce. Field names below follow the public API's
 * `MatchedObjectDescriptor` schema (data.usajobs.gov/api-reference).
 */
export async function normalizeUsajobs(item) {
  const d = item.MatchedObjectDescriptor || {};
  const userArea = d.UserArea?.Details || {};

  const description = [
    userArea.JobSummary || d.QualificationSummary || "",
    userArea.MajorDuties ? (Array.isArray(userArea.MajorDuties) ? userArea.MajorDuties.join(" ") : userArea.MajorDuties) : "",
    userArea.Requirements || "",
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();

  const profile = await extractJobProfile(description, { title: d.PositionTitle });

  const location =
    d.PositionLocationDisplay ||
    (d.PositionLocation || []).map((l) => l.LocationName).filter(Boolean).join("; ") ||
    "";

  const pay = (d.PositionRemuneration || [])[0];
  const salary =
    pay && (pay.MinimumRange || pay.MaximumRange)
      ? `$${pay.MinimumRange} - $${pay.MaximumRange}${pay.RateIntervalCode ? ` (${pay.RateIntervalCode})` : ""}`
      : null;

  return {
    title: d.PositionTitle || "",

    company: d.OrganizationName || d.DepartmentName || "",

    location,

    employment_type: (d.PositionSchedule || [])[0]?.Name || "",

    salary,

    description,

    source: "usajobs",

    source_job_id: String(item.MatchedObjectId || d.PositionID),

    apply_url: d.ApplyURI?.[0] || d.PositionURI || "",

    posted_date: d.PublicationStartDate || new Date().toISOString(),

    skills: profile.skills_required,

    skills_required: profile.skills_required,

    skills_preferred: profile.skills_preferred,

    role_family: profile.role_family,

    min_years: profile.min_years,

    // USAJOBS is federal-agency-only by definition — every posting is a US
    // position (occasionally overseas federal postings exist, e.g. embassy
    // IT staff, but those are rare enough that isUsJob's normal string
    // matching on `location` is left to make the final call rather than
    // hardcoding true here).
    country: profile.country || "US",

    state: profile.state,

    is_remote_us: /\bremote\b/i.test(location) ? true : profile.is_remote_us,

    profile,

    match_score: 0,

    is_active: true,

    last_seen: new Date().toISOString(),

    expires_at: d.ApplicationCloseDate
      ? new Date(d.ApplicationCloseDate).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}
