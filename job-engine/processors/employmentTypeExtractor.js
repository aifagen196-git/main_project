// processors/employmentTypeExtractor.js
//
// Text fallback for employment type when the ATS doesn't provide a structured
// field. Greenhouse's jobs API in particular has none, so normalizeJobs.js
// was hardcoding every posting to "Full Time" regardless of what it actually
// was — this recovers contract/part-time/internship/temporary postings from
// the description text instead of mislabeling them.

const PATTERNS = [
  [/\binternship\b|\bintern\b/i, "Internship"],
  [/\btemporary\b|\btemp\s+position\b/i, "Temporary"],
  [/\bcontract[- ]to[- ]hire\b|\bc2h\b/i, "Contract to Hire"],
  [/\b1099\b|\bcontractor\b|\bcontract(?:or)?\s+position\b|\bcontract\s+role\b/i, "Contract"],
  [/\bpart[- ]time\b/i, "Part Time"],
  [/\bfull[- ]time\b/i, "Full Time"],
];

/**
 * @param {string} text
 * @returns {string} one of the labels above, "" if nothing detected
 */
export function extractEmploymentType(text = "") {
  const t = String(text);
  for (const [pattern, label] of PATTERNS) {
    if (pattern.test(t)) return label;
  }
  return "";
}

export default extractEmploymentType;
