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
 * UKG (UltiPro/UKG Pro Recruiting) opportunities carry one or more
 * `Locations`, each with a full postal `Address` including a reliable
 * `Country.Code`. Flatten the first location -- multi-location postings are
 * rare on UKG boards in practice -- into the "City, ST, US" shape isUsJob()
 * expects.
 */
function extractLocation(opportunity) {
  const loc = opportunity.Locations?.[0];
  const addr = loc?.Address;
  if (!addr) return loc?.LocalizedName || "";

  const parts = [addr.City, addr.State?.Code, addr.Country?.Code].filter(
    Boolean,
  );
  return parts.length ? parts.join(", ") : loc?.LocalizedName || "";
}

/**
 * @param {object} opportunity - the `US.Opportunity.CandidateOpportunityDetail(...)`
 *   bootstrap object extracted from an OpportunityDetail page
 * @param {string} company - config label, e.g. "bridgetown-windows"
 * @param {string} applyUrl
 */
export async function normalizeUkg(opportunity, company, applyUrl) {
  const description = cleanDescription(opportunity.Description || "");

  const profile = await extractJobProfile(description, { title: opportunity.Title });

  return {
    title: opportunity.Title,

    company,

    location: extractLocation(opportunity),

    // UKG only ever asserts FullTime as true or false, never omits it, but
    // guard against an unexpectedly missing field defaulting to "Part
    // Time" rather than the safer "Full Time" every other normalizer uses.
    employment_type: opportunity.FullTime === false ? "Part Time" : "Full Time",

    salary: null,

    description,

    source: "ukg",

    source_job_id: String(opportunity.Id),

    apply_url: applyUrl,

    posted_date: opportunity.PostedDate || null,

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
