import { extractJobProfile } from "../processors/extractProfile.js";

/**
 * jobright.ai's category pages only embed company name on the per-job
 * DETAIL page (dataSource.companyResult.companyName), not in the listing's
 * __NEXT_DATA__ payload jobright.js scrapes — and fetching each job's detail
 * page individually would multiply request volume ~20x for one extra field.
 * Instead this pulls a best-effort company name out of the listing's own
 * `jdLogo` CDN URL, whose filename is almost always `<company-slug>_logo`
 * (e.g. ".../toolsgroup_logo?..." -> "Toolsgroup"). Falls back to "" when the
 * filename is a bare numeric asset id with no slug (~13% of listings, spot
 * checked 2026-08-26) — better to leave company blank than guess wrong.
 */
function companyFromLogo(logoUrl) {
  if (!logoUrl) return "";
  try {
    const seg = new URL(logoUrl).pathname.split("/").pop() || "";
    const stem = seg.replace(/_logo$|-logo$/i, "");
    if (!stem || /^\d+$/.test(stem)) return "";
    return stem
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  } catch {
    return "";
  }
}

export async function normalizeJobright(raw) {
  const description = [raw.jobSummary, (raw.coreResponsibilities || []).join(" ")]
    .filter(Boolean)
    .join(" ")
    .trim();

  const profile = await extractJobProfile(description, { title: raw.jobTitle });

  const isRemote = !!raw.isRemote || /remote/i.test(raw.workModel || "");

  return {
    title: raw.jobTitle || "",

    company: companyFromLogo(raw.jdLogo),

    location: raw.jobLocation || (isRemote ? "Remote" : ""),

    employment_type: raw.employmentType || "",

    salary: null,

    description,

    source: "jobright",

    source_publisher: raw.jobSeniority || "",

    source_job_id: raw.jobId,

    apply_url: raw.applyLink || raw.url || "",

    posted_date: raw.publishTime ? `${raw.publishTime.replace(" ", "T")}Z` : new Date().toISOString(),

    skills: profile.skills_required,

    skills_required: profile.skills_required,

    skills_preferred: profile.skills_preferred,

    role_family: profile.role_family,

    min_years: raw.minYearsOfExperience ?? profile.min_years,

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
