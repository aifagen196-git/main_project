// processors/companyNormalizer.js
//
// Normalizes company names so the same employer doesn't fragment into
// multiple rows across sources (e.g. "Acme Inc.", "Acme, Inc", "ACME" should
// all match for company-based dedupe/enrichment later).

const LEGAL_SUFFIXES =
  /,?\s*(inc\.?|incorporated|llc\.?|ltd\.?|limited|corp\.?|corporation|co\.?|company|plc\.?|gmbh|s\.?a\.?|pte\.?\s*ltd\.?)\s*$/i;

/**
 * @param {string} raw
 * @returns {string} normalized display name, title-cased with legal suffixes stripped
 */
export function normalizeCompany(raw = "") {
  let s = String(raw).trim();
  if (!s) return "";

  s = s.replace(/\s+/g, " ");
  // Strip a trailing legal suffix once (companies rarely have two).
  s = s.replace(LEGAL_SUFFIXES, "").trim();

  return s;
}

/**
 * Lowercase, suffix-stripped key for grouping/dedupe — not for display.
 * @param {string} raw
 * @returns {string}
 */
export function companyKey(raw = "") {
  return normalizeCompany(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export default normalizeCompany;
