// Upload rules that stop a resume being used for the wrong account:
//   1. the resume's field must fit the account's area of interest, so people
//      can't upload a resume from another domain to pull other jobs;
//   2. the name on the resume must match the account's name, so people can't
//      upload a friend's resume.
// The resume's field (role_family) and name (candidate_name) come from the
// AI extraction the upload already runs (resumeProcessing.service.js).

// Fields close enough that a resume in one is a fair upload for the other.
// Anything not listed here only matches itself.
const RELATED = {
  "software-engineering": ["frontend-engineering", "backend-engineering", "qa-testing"],
  "frontend-engineering": ["software-engineering", "backend-engineering"],
  "backend-engineering": ["software-engineering", "frontend-engineering"],
  devops: ["cloud-engineering"],
  "cloud-engineering": ["devops", "network-engineering"],
  "network-engineering": ["cloud-engineering"],
  "security-engineering": ["offensive-security"],
  "offensive-security": ["security-engineering"],
  "data-analytics": ["data-engineering", "business-analysis"],
  "data-engineering": ["data-analytics", "ai-ml"],
  "ai-ml": ["data-engineering"],
  "business-analysis": ["data-analytics"],
  "qa-testing": ["software-engineering"],
};

export function areaMatches(area, resumeFamily) {
  if (!area || !resumeFamily) return false;
  return area === resumeFamily || (RELATED[area] || []).includes(resumeFamily);
}

function nameTokens(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

/** The account's name split into first-name and last-name tokens. */
export function accountName(profile) {
  let first = nameTokens(profile?.first_name);
  let last = nameTokens(profile?.last_name);
  if (!first.length) {
    const all = nameTokens(profile?.full_name);
    first = all.slice(0, 1);
    last = last.length ? last : all.slice(1);
  }
  return { first, last };
}

/**
 * Does the resume belong to this account? Checks the AI-read name, plus the
 * top of the resume text (where the name sits) in case the AI missed it.
 * Order doesn't matter, and either name may be an initial — but not both.
 */
export function nameMatches(profile, candidateName, resumeText = "") {
  const { first, last } = accountName(profile);
  if (!first.length) return false;

  const nameSeen = new Set(nameTokens(candidateName));
  const seen = new Set([...nameSeen, ...nameTokens(String(resumeText).slice(0, 300))]);
  const full = (toks) => toks.some((t) => t.length > 1 && seen.has(t));
  // Initials only count when the AI read them as part of the name — a lone
  // "a" in the text around it shouldn't pass as one.
  const initial = (toks) => toks.some((t) => nameSeen.has(t[0]));

  if (!last.length) return full(first);
  return (full(first) && (full(last) || initial(last))) || (initial(first) && full(last));
}

const AREA_LABEL = {
  "software-engineering": "Software Engineering",
  "frontend-engineering": "Frontend Development",
  "backend-engineering": "Backend Development",
  devops: "DevOps",
  "cloud-engineering": "Cloud Engineering",
  "data-analytics": "Data Analytics",
  "data-engineering": "Data Engineering",
  "ai-ml": "AI / Machine Learning",
  "security-engineering": "Cybersecurity",
  "offensive-security": "Offensive Security",
  "network-engineering": "Network Engineering",
  "qa-testing": "QA / Testing",
  "business-analysis": "Business Analysis",
  "product-management": "Product Management",
  design: "UI / UX Design",
  "supply-chain": "Supply Chain",
  other: "Other",
};
export const areaLabel = (id) => AREA_LABEL[id] || id;
