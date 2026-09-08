/**
 * Extract minimum required years of experience from a job description.
 * Returns 0 if no reliable requirement is found.
 *
 * Rewritten after an audit found it only matched the literal phrase
 * "N years of experience" — real postings routinely phrase this as "4+
 * years with SQL", "3-5 years building APIs", "Senior role, 6+ years", or
 * "5+ years' experience", none of which the old pattern set caught, leaving
 * min_years at 0 for most jobs.
 *
 * Also fixed a real bug in the old version: it checked IGNORE_PATTERNS
 * against the WHOLE text and returned 0 for the entire posting if a phrase
 * like "founded in 2010" appeared anywhere — even when a real "5+ years
 * required" also appeared elsewhere in the same posting. The ignore check is
 * now scoped to a window around each candidate match, not the whole text.
 */

// Ordered by specificity — an explicit "of experience"/"minimum" phrase is
// unambiguous, so those run first; the bare "N+ years" pattern is the most
// permissive and runs last, after specific patterns have had first pick.
const PATTERNS = [
  /\bat\s+least\s+(\d+)\+?\s*years?\s+(?:of\s+)?experience\b/i,
  /\bminimum\s+(?:of\s+)?(\d+)\+?\s*years?\s+(?:of\s+)?experience\b/i,
  /\brequires?\s+(\d+)\+?\s*years?\s+(?:of\s+)?experience\b/i,
  /\bexperience\s*(?:of|:)?\s+(\d+)\+?\s*years?\b/i,
  // Ranges: "3-5 years", "3 to 5 years" — the LOWER bound is the minimum.
  /\b(\d+)\s*(?:-|–|to)\s*\d+\+?\s*years?\b/i,
  /\b(\d+)\s+years?\s+(?:of\s+)?experience\b/i,
  // Possessive form: "5+ years' experience" / "5+ years experience" (no "of").
  /\b(\d+)\+?\s*years?['’]?\s+experience\b/i,
  // "N+ years with/in/using/building/developing X" — experience implied by
  // the preposition, "of experience" never said explicitly.
  /\b(\d+)\+?\s*years?\s+(?:with|in|using|building|developing|working\s+with|of\s+hands-on|hands-on)\b/i,
  // Bare "N+ years" — most permissive, tried last so more specific patterns
  // above get first pick when a posting matches several.
  /\b(\d+)\+\s*years?\b/i,
];

// Scoped to a window around a candidate match, not the whole text — a
// company-history blurb elsewhere in the posting shouldn't blank out a real
// requirement stated separately.
const IGNORE_PATTERNS = [
  /\byears?\s+of\s+innovation/i,
  /\byears?\s+of\s+history/i,
  /\byears?\s+in\s+business/i,
  /\bestablished\s+in\b/i,
  /\bfounded\s+in\b/i,
  /\bcelebrat(?:e|ing|ed)\b/i,
  /\banniversary\b/i,
];

const WINDOW = 40; // chars of context on each side of a match to check
const MAX_PLAUSIBLE_YEARS = 20; // beyond this, almost certainly not a real requirement

export default function extractExperience(text = "") {
  const content = String(text).replace(/\s+/g, " ");

  for (const pattern of PATTERNS) {
    const match = content.match(pattern);
    if (!match) continue;

    const value = Number(match[1]);
    if (!Number.isFinite(value) || value <= 0 || value > MAX_PLAUSIBLE_YEARS) {
      continue;
    }

    const start = Math.max(0, match.index - WINDOW);
    const end = match.index + match[0].length + WINDOW;
    const window = content.slice(start, end);
    if (IGNORE_PATTERNS.some((ignore) => ignore.test(window))) continue;

    return value;
  }

  return 0;
}
