import { extractJobProfile } from "../processors/extractProfile.js";

/**
 * Converts a raw "Who is hiring?" top-level comment (as returned by the
 * Algolia HN Search API's /items/{id} endpoint) into the enriched job shape
 * the other collectors produce.
 *
 * Unlike every other source in this repo, HN's "Who is hiring?" postings are
 * not structured JSON fields — they're a single freeform HTML-ish text blob
 * per comment. The de-facto convention most posters follow (not enforced by
 * HN) is a first line shaped like:
 *
 *   Company Name (https://company.com) | Role | Location | Type
 *
 * separated by pipe characters, followed by a longer free-text description.
 * This normalizer parses that first line best-effort and falls back to
 * putting the whole thing in `description` and leaving `company`/`location`
 * blank when a poster didn't follow the convention — extractJobProfile's
 * heuristics on the full text are the backstop, same role they play for
 * every other source when a structured field is missing.
 */

function decodeEntities(str) {
  return String(str || "")
    .replace(/&#x2F;/g, "/")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function stripTags(html) {
  return decodeEntities(String(html || "").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function firstUrl(html) {
  const m = String(html || "").match(/href="([^"]+)"/);
  return m ? decodeEntities(m[1]) : null;
}

function parseHeader(html) {
  // The first <p>...</p> (or the whole text if there's no paragraph break
  // yet) is the "header line" posters use for the Company | Role | Location
  // | Type convention. Everything after the first tag boundary is treated
  // as the description body instead of re-parsed for fields.
  const firstParaEnd = String(html || "").indexOf("<p>");
  const headerHtml = firstParaEnd === -1 ? html : html.slice(0, firstParaEnd);
  const header = stripTags(headerHtml);
  const parts = header.split("|").map((p) => p.trim()).filter(Boolean);

  let company = parts[0] || "";
  // Strip a trailing/embedded URL and parenthetical from the company field,
  // e.g. "Snout (https://snout.com/)" -> "Snout".
  company = company.replace(/\(?https?:\/\/\S+\)?/g, "").replace(/[-–|]\s*$/, "").trim();

  return {
    company,
    title: parts[1] || "",
    location: parts[2] || "",
    employment_type: parts[3] || "",
  };
}

export async function normalizeHackernews(comment) {
  const rawHtml = comment.text || "";
  const description = stripTags(rawHtml);
  const header = parseHeader(rawHtml);

  const profile = await extractJobProfile(description, {
    title: header.title || description.slice(0, 80),
  });

  const applyUrl = firstUrl(rawHtml) || `https://news.ycombinator.com/item?id=${comment.id}`;

  return {
    title: header.title || description.slice(0, 120),

    company: header.company || "",

    location: header.location || "",

    employment_type: header.employment_type || "",

    salary: null,

    description,

    source: "hackernews",

    source_job_id: String(comment.id),

    apply_url: applyUrl,

    posted_date: comment.created_at || new Date().toISOString(),

    skills: profile.skills_required,

    skills_required: profile.skills_required,

    skills_preferred: profile.skills_preferred,

    role_family: profile.role_family,

    min_years: profile.min_years,

    country: profile.country,

    state: profile.state,

    // No structured location/geo field exists to check first (unlike
    // Jobicy's jobGeo or Remotive's candidate_required_location), so this
    // relies entirely on the parsed header location text plus
    // extractJobProfile's inference over the full description.
    is_remote_us: /\b(usa|u\.s\.a?\.?|united states)\b/i.test(header.location) || profile.is_remote_us,

    profile,

    match_score: 0,

    is_active: true,

    last_seen: new Date().toISOString(),

    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}
