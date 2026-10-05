// Upload rules that stop a resume being used for the wrong account:
//   1. the resume's field must fit the account's area of interest, so people
//      can't upload a resume from another domain to pull other jobs;
//   2. the name on the resume must match the account's name, so people can't
//      upload a friend's resume.
// The resume's field (role_family) and name (candidate_name) come from the
// AI extraction the upload already runs (resumeProcessing.service.js).

// The Area of interest choices (sign-up form, Settings, admin). For each, the
// resume fields (role_family from the AI read) that count as a fit, and/or
// keywords the resume text must contain. Areas the classifier has no category
// for (SAP, IT support, data center) are checked by keywords instead.
// The frontend and admin lists (utils/areas.js, admin lib/areas.js) must use
// the same ids and labels.
export const AREAS = {
  devops: { label: "DevOps", families: ["devops", "cloud-engineering"] },
  "supply-chain": { label: "Supply Chain", families: ["supply-chain"] },
  "ai-ml": { label: "AI / ML", families: ["ai-ml", "data-engineering"] },
  "data-scientist": { label: "Data Scientist", families: ["ai-ml", "data-analytics", "data-engineering"] },
  "data-center-technician": {
    label: "Data Center Technician",
    keywords: /data\s*cent(?:er|re)|server\s+racks?|racks?\s*(?:and|&)\s*stack|structured\s+cabling/i,
  },
  "network-engineer": { label: "Network Engineer", families: ["network-engineering", "cloud-engineering"] },
  "business-analyst": {
    label: "Business Analyst",
    families: ["business-analysis", "data-analytics", "product-management"],
  },
  "data-analyst": { label: "Data Analyst", families: ["data-analytics", "business-analysis", "data-engineering"] },
  "full-stack": {
    label: "Full Stack",
    families: ["software-engineering", "frontend-engineering", "backend-engineering"],
  },
  "software-engineer": {
    label: "Software Engineer",
    families: ["software-engineering", "frontend-engineering", "backend-engineering", "qa-testing"],
  },
  "quality-automation": { label: "Quality Automation", families: ["qa-testing", "software-engineering"] },
  "it-support": {
    label: "IT Support",
    keywords: /help\s*desk|service\s*desk|desktop\s+support|\bIT\s+support|technical\s+support|end[-\s]user\s+support/i,
  },
  sap: { label: "SAP", keywords: /\bSAP\b|\bS\/4\s*HANA\b|\bABAP\b/ },
};

export const AREA_IDS = Object.keys(AREAS);
export const areaLabel = (id) => AREAS[id]?.label || id;

export function areaMatches(area, resumeFamily, resumeText = "") {
  const rule = AREAS[area];
  if (!rule) return false;
  if (rule.families && !rule.families.includes(resumeFamily)) return false;
  if (rule.keywords && !rule.keywords.test(resumeText)) return false;
  return true;
}

// Older accounts with no area get one from their first resume's field.
// Fields with no clear area (design, security, …) are left for an admin.
const AREA_FOR_FAMILY = {
  devops: "devops",
  "cloud-engineering": "devops",
  "supply-chain": "supply-chain",
  "ai-ml": "ai-ml",
  "data-engineering": "data-scientist",
  "network-engineering": "network-engineer",
  "business-analysis": "business-analyst",
  "data-analytics": "data-analyst",
  "frontend-engineering": "full-stack",
  "backend-engineering": "full-stack",
  "software-engineering": "software-engineer",
  "qa-testing": "quality-automation",
};
export const areaForFamily = (family) => AREA_FOR_FAMILY[family] || null;

function nameTokens(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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

