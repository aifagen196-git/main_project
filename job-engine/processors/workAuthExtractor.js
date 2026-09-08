// processors/workAuthExtractor.js
//
// Detects whether a posting requires US work authorization / citizenship, or
// explicitly offers sponsorship. Feeds the matcher's work-auth hard gate.

const REQUIRES_AUTH =
  /\bmust be authorized to work\b|\bwork authorization required\b|\bno sponsorship\b|\bwe (are|'re) unable to (sponsor|provide sponsorship)\b|\bwithout (the need for |requiring )?(visa )?sponsorship\b|\bmust be a u\.?s\.? citizen\b|\brequires? u\.?s\.? citizenship\b|\bsecurity clearance required\b/i;

const SPONSORSHIP_AVAILABLE =
  /\bvisa sponsorship (is )?available\b|\bwill sponsor\b|\bsponsorship (is )?(available|offered|provided)\b|\bh-?1b sponsorship\b/i;

/**
 * @param {string} text
 * @returns {boolean|null} true = auth required / no sponsorship, false = sponsorship offered, null = unknown
 */
export function extractWorkAuth(text = "") {
  const t = String(text);
  // Check REQUIRES_AUTH first: "no sponsorship available" would otherwise
  // match SPONSORSHIP_AVAILABLE's looser "sponsorship available" substring.
  if (REQUIRES_AUTH.test(t)) return true;
  if (SPONSORSHIP_AVAILABLE.test(t)) return false;
  return null;
}

export default extractWorkAuth;
