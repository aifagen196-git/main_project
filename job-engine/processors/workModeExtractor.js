// processors/workModeExtractor.js
//
// Detects remote / hybrid / onsite from job text. Distinct from is_remote_us
// (extractProfile.js) which also requires a US signal — this is mode only,
// used as a stored field for filtering regardless of country.

const HYBRID = /\bhybrid\b/i;
const REMOTE = /\bremote\b|\bwork from home\b|\bwfh\b|\b100% remote\b/i;
const ONSITE =
  /\bon-?site\b|\bin[- ]office\b|\bmust (be|work) (in|from) (the )?office\b|\bno remote\b/i;

/**
 * @param {string} text
 * @returns {"remote"|"hybrid"|"onsite"|""}
 */
export function extractWorkMode(text = "") {
  const t = String(text);
  // Check hybrid first — postings that mention both "remote" and "hybrid"
  // (e.g. "hybrid, remote-friendly") mean hybrid, not fully remote.
  if (HYBRID.test(t)) return "hybrid";
  if (REMOTE.test(t)) return "remote";
  if (ONSITE.test(t)) return "onsite";
  return "";
}

export default extractWorkMode;
