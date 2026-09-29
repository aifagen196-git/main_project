// Display cleanup for job fields that arrive as raw collector text.

const usd = (n) => "$" + Math.round(n).toLocaleString("en-US");

const COMPANY_NAMES = {
  capitalone: "Capital One",
  jpmorgan: "JPMorgan",
  jpmorganchase: "JPMorgan Chase",
  kforce: "Kforce",
  ibm: "IBM",
  att: "AT&T",
  hp: "HP",
  hpe: "HPE",
  aws: "AWS",
  ey: "EY",
  pwc: "PwC",
  kpmg: "KPMG",
};

// Collectors sometimes store an ATS tenant slug ("oracle-tenant-hcgn",
// "capitalone") instead of a display name.
export function formatCompany(raw) {
  const name = String(raw || "").trim();
  if (!name) return "";
  if (/[A-Z]/.test(name) || /\s/.test(name)) return name;
  const base = name.replace(/-tenant-[a-z0-9]+$/i, "");
  if (COMPANY_NAMES[base]) return COMPANY_NAMES[base];
  return base
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Lakh-style grouping ("1,14,000") → western grouping ("114,000").
function regroup(text) {
  return text.replace(/\b\d{1,2}(?:,\d{2})+,\d{3}\b/g, (m) =>
    Number(m.replace(/,/g, "")).toLocaleString("en-US"),
  );
}

export function formatSalary(raw) {
  let s = String(raw ?? "").trim();
  if (!s || s === "0") return "";
  s = regroup(s);

  const bare = s.match(/^\$?\s*([\d,.]+)\s*(?:-|–|to)\s*\$?\s*([\d,.]+)$/i) ||
    s.match(/^\$?\s*([\d,.]+)$/);
  if (bare) {
    const lo = Number(bare[1].replace(/,/g, ""));
    const hi = bare[2] ? Number(bare[2].replace(/,/g, "")) : null;
    if (!Number.isFinite(lo) || lo <= 0) return "";
    const unit = lo >= 1000 ? "/yr" : lo < 500 ? "/hr" : "";
    return (hi && hi !== lo ? `${usd(lo)} – ${usd(hi)}` : usd(lo)) + unit;
  }

  if (/^\d/.test(s)) s = "$" + s;
  return s;
}
