// Job links come from scraped postings and admin input. React 18 renders
// `javascript:` hrefs as-is, so only allow real web links (and mailto:, which
// the admin page offers for "apply by email" postings).
const SAFE_PROTOCOLS = new Set(["https:", "http:", "mailto:"]);
export function safeUrl(url) {
  try {
    const u = new URL(String(url || "").trim());
    return SAFE_PROTOCOLS.has(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}
