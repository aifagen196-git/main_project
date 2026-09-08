// processors/educationExtractor.js
//
// Regex/dictionary fallback for minimum education level, mirroring the
// pattern used by experienceExtractor.js / roleFamilyExtractor.js. Only runs
// when COLLECTOR_LLM is off (the default) — Claude extraction covers this
// field directly when enabled.

const LEVELS = ["none", "highschool", "associate", "bachelor", "master", "phd"];

const PATTERNS = [
  [/\bph\.?d\.?\b|\bdoctorate\b/i, "phd"],
  [/\bmaster'?s?\b|\bm\.?s\.?\b(?!c)|\bmba\b|\bm\.?eng\.?\b/i, "master"],
  [
    /\bbachelor'?s?\b|\bb\.?s\.?\b|\bb\.?a\.?\b|\bundergraduate degree\b|\b4-year degree\b/i,
    "bachelor",
  ],
  [/\bassociate'?s?\b|\ba\.?a\.?\b|\b2-year degree\b/i, "associate"],
  [/\bhigh school diploma\b|\bged\b/i, "highschool"],
];

const NO_DEGREE_REQUIRED =
  /\bno degree required\b|\bdegree not required\b|\bequivalent experience\b/i;

/**
 * @param {string} text
 * @returns {string} one of LEVELS, "" if nothing detected
 */
export function extractEducation(text = "") {
  const t = String(text);
  if (NO_DEGREE_REQUIRED.test(t)) return "none";
  for (const [pattern, level] of PATTERNS) {
    if (pattern.test(t)) return level;
  }
  return "";
}

export { LEVELS as EDUCATION_LEVELS };
export default extractEducation;
