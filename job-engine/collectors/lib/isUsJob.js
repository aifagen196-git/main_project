// collectors/lib/isUsJob.js
//
// Shared US-only filter applied by every collector right before a job is
// saved. Each ATS hands back location data in a different shape, but every
// normalizer already reduces it to the same three fields on the job object
// it returns: `location` (free-text, e.g. "Austin, TX" / "Remote" /
// "Tel Aviv, Israel"), `country` (from extractJobProfile — LLM/heuristic
// inferred, not always populated), and `is_remote_us` (best-effort bool).
// This checks all three rather than relying on any single one, since none
// of them is reliable alone across 12 different ATS's.

const US_STATE_ABBR = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC",
]);

const US_STATE_NAMES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming", "District of Columbia",
];

// Case-sensitive \bUS\b (no /i) deliberately: bare "US" is a common
// remote-location marker ("Remote - US", "Remote (US)"), but lowercase
// "us" is also the common English pronoun, so only the all-caps form is
// treated as a country marker.
const US_MARKERS_RE = /\b(United States|USA|U\.S\.A?\.?)\b/i;
const US_BARE_RE = /\bUS\b/;
const US_STATE_NAME_RE = new RegExp(`\\b(${US_STATE_NAMES.join("|")})\\b`, "i");
// "City, ST" / "City, ST 12345" — the most common ATS location format.
const US_STATE_ABBR_RE = /,\s*([A-Z]{2})\b(?!\.\w)/;

// Non-US countries commonly seen in these ATS's location strings (Nordic/
// EU/Israel/UK-heavy, matching the customer bases scraped in this repo).
// If one of these appears and no US marker also appears, treat as non-US
// even when a two-letter token happens to collide with a US state
// abbreviation (e.g. "Ontario, CA" is a Canadian city, not California).
const NON_US_MARKERS_RE = new RegExp(
  "\\b(" +
    [
      "United Kingdom", "UK", "England", "Scotland", "Wales",
      "Ireland", "Germany", "France", "Netherlands", "Belgium",
      "Sweden", "Norway", "Denmark", "Finland", "Iceland",
      "Spain", "Italy", "Portugal", "Switzerland", "Austria",
      "Poland", "Israel", "India", "Canada", "Mexico", "Brazil",
      "Australia", "New Zealand", "Singapore", "Japan", "China",
      "South Korea", "UAE", "United Arab Emirates", "Philippines",
      "Ukraine", "Serbia", "Romania", "Czech Republic", "Greece",
      "Estonia", "Latvia", "Lithuania", "Luxembourg", "Malta",
    ].join("|") +
    ")\\b",
  "i",
);

/**
 * @param {{location?: string, country?: string|null, is_remote_us?: boolean}} job
 * @returns {boolean}
 */
export function isUsJob(job) {
  if (job.is_remote_us === true) return true;

  if (job.country && /^(us|usa|united states)$/i.test(String(job.country).trim())) {
    return true;
  }

  const location = String(job.location || "").trim();
  if (!location) return false;

  if (NON_US_MARKERS_RE.test(location) && !US_MARKERS_RE.test(location)) {
    return false;
  }

  if (US_MARKERS_RE.test(location)) return true;
  if (US_BARE_RE.test(location)) return true;
  if (US_STATE_NAME_RE.test(location)) return true;

  const abbrMatch = location.match(US_STATE_ABBR_RE);
  if (abbrMatch && US_STATE_ABBR.has(abbrMatch[1])) return true;

  return false;
}
