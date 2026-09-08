// processors/canonicalFields.js
//
// Canonicalizes the small enum-ish fields that every ATS spells differently.
// A live audit of 40,677 collected rows found SIX spellings of "full time"
// ("Full Time", "FullTime", "Full-time", "Full-Time", "fulltime_permanent",
// "fulltime_fixed_term") and three of the United States ("USA", "United
// States", "US") — which makes filtering, faceting and grouping unreliable
// even though the matcher itself defends against the country variants.

// ---------------------------------------------------------------- country

const US_FORMS = new Set([
  "us", "usa", "u.s.", "u.s.a.", "united states", "united states of america",
  "america",
]);

const COUNTRY_ALIASES = {
  uk: "United Kingdom",
  "u.k.": "United Kingdom",
  "great britain": "United Kingdom",
  gb: "United Kingdom",
  england: "United Kingdom",
  ca: "Canada",
  can: "Canada",
  de: "Germany",
  deutschland: "Germany",
  nl: "Netherlands",
  holland: "Netherlands",
  in: "India",
  ind: "India",
  au: "Australia",
  aus: "Australia",
  sg: "Singapore",
  jp: "Japan",
  fr: "France",
  es: "Spain",
  it: "Italy",
  ie: "Ireland",
  il: "Israel",
  br: "Brazil",
  mx: "Mexico",
};

/**
 * Canonical country name. US variants all collapse to "United States".
 * @returns {string|null}
 */
export function normalizeCountry(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const key = s.toLowerCase().replace(/\s+/g, " ");
  if (US_FORMS.has(key)) return "United States";
  if (COUNTRY_ALIASES[key]) return COUNTRY_ALIASES[key];
  // Already a proper name — just tidy the casing of an all-caps/all-lower
  // blob. Lowercase FIRST: title-casing "JAPAN" in place leaves "JAPAN",
  // since \b\w only touches the already-capital leading letter.
  if (s === s.toLowerCase() || s === s.toUpperCase()) {
    return key.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return s;
}

export function isUnitedStates(raw) {
  return normalizeCountry(raw) === "United States";
}

// -------------------------------------------------------- employment type

// Order matters. The hours dimension (full- vs part-time) is what a job
// seeker actually filters on, so it wins over duration nuances: a
// "parttime_fixed_term" role is surfaced as Part Time rather than being
// flattened into Contract, which would hide it from part-time seekers.
// Only postings with NO hours signal fall through to the duration labels.
const EMPLOYMENT_RULES = [
  [/^(intern(ship)?|co-?op)/i, "Internship"],
  [/contract[\s_-]*to[\s_-]*hire|^c2h$/i, "Contract to Hire"],
  [/full[\s_-]*time\s*\/\s*part[\s_-]*time|part[\s_-]*time\s*\/\s*full/i, "Full Time/Part Time"],
  [/part[\s_-]*time|^pt$/i, "Part Time"],
  [/full[\s_-]*time|^ft$/i, "Full Time"],
  [/temp(orary)?|seasonal/i, "Temporary"],
  [/contract(or)?|freelance|1099|fixed[\s_-]*term/i, "Contract"],
  [/permanent|regular/i, "Full Time"],
];

/**
 * Canonical employment type. Returns "" when nothing is recognizable so
 * callers can fall back to their own default rather than guessing wrong.
 * @returns {string}
 */
export function normalizeEmploymentType(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  for (const [pattern, label] of EMPLOYMENT_RULES) {
    if (pattern.test(s)) return label;
  }
  return s;
}

export default { normalizeCountry, normalizeEmploymentType, isUnitedStates };
