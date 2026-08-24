// processors/relativeDate.js
//
// Converts a relative-time string ("3 days ago", "Today", "yesterday") into
// an approximate ISO timestamp. Job boards give a relative string, not an
// absolute one, in their search-results view (an exact timestamp usually
// only exists on the individual job's detail page, which isn't always worth
// an extra page load just for this). Originally lived only in
// collectors/linkedin.js; pulled out here once collectors/dice.js needed the
// same conversion for its "Today" / "• 3d ago" text, so it doesn't drift
// into two slightly different copies.
export default function relativeToISO(text = "") {
  const t = String(text).toLowerCase().trim();
  if (!t) return null;
  if (/^today$|just now|moments? ago/.test(t)) {
    return new Date().toISOString();
  }
  if (/yesterday/.test(t)) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString();
  }
  const m = t.match(/(\d+)\s*(hour|day|week|month|year)s?\s*ago/);
  if (!m) return null;
  const n = Number(m[1]);
  const unitDays = { hour: 1 / 24, day: 1, week: 7, month: 30, year: 365 }[m[2]];
  return new Date(Date.now() - n * unitDays * 86400000).toISOString();
}
