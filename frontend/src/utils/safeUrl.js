// Job links come from scraped postings and admin input. React 18 renders
// `javascript:` hrefs as-is, so only allow real web links.
export function safeUrl(url) {
  try {
    const u = new URL(String(url || "").trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch {
    return null;
  }
}
