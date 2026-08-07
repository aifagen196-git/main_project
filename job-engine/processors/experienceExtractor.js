/**
 * Extract minimum required years of experience from a job description.
 * Returns 0 if no reliable requirement is found.
 */

const PATTERNS = [
  /\bat\s+least\s+(\d+)\+?\s+years?\s+of\s+experience\b/i,
  /\bminimum\s+of\s+(\d+)\+?\s+years?\s+of\s+experience\b/i,
  /\bminimum\s+(\d+)\+?\s+years?\s+of\s+experience\b/i,
  /\brequires?\s+(\d+)\+?\s+years?\s+of\s+experience\b/i,
  /\b(\d+)\+\s+years?\s+of\s+experience\b/i,
  /\b(\d+)\s*-\s*(\d+)\s+years?\s+of\s+experience\b/i,
  /\b(\d+)\s+years?\s+of\s+experience\b/i,
  /\bexperience\s+of\s+(\d+)\+?\s+years?\b/i,
];

const IGNORE_PATTERNS = [
  /\byears?\s+of\s+innovation/i,
  /\byears?\s+of\s+history/i,
  /\byears?\s+in\s+business/i,
  /\bestablished\s+in/i,
  /\bfounded\s+in/i,
];

export default function extractExperience(text = "") {
  const content = String(text).replace(/\s+/g, " ");

  // Ignore company history
  for (const pattern of IGNORE_PATTERNS) {
    if (pattern.test(content)) {
      return 0;
    }
  }

  for (const pattern of PATTERNS) {
    const match = content.match(pattern);

    if (!match) continue;

    // Handle ranges like "2-5 years"
    if (match[2]) {
      return Number(match[1]);
    }

    return Number(match[1]);
  }

  return 0;
}
