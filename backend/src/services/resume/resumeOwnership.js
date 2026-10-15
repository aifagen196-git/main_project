// Upload rules that stop a resume being used for the wrong account:
//   1. the resume's field must fit the account's area of interest, so people
//      can't upload a resume from another domain to pull other jobs;
//   2. the name on the resume must match the account's name, so people can't
//      upload a friend's resume.
// The resume's field (role_family) and name (candidate_name) come from the
// AI extraction the upload already runs (resumeProcessing.service.js).

// The Area of interest choices (sign-up form, Settings, admin). For each, the
// resume fields (role_family from the AI read) that count as a fit, and/or
// keywords the resume text must contain (both, when both are given). Areas
// the classifier has no category for (SAP, Salesforce, IT support, …) are
// checked by keywords only. "Others" accepts any resume.
// The frontend and admin lists (utils/areas.js, admin lib/areas.js) and the
// sign-up database function (handle_new_user, latest in migration 0029) must
// use the same ids.
const SOFTWARE = ["software-engineering", "frontend-engineering", "backend-engineering"];

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

  // Added Oct 2026: the other domains US IT staffing clients ask for most.
  "cloud-engineer": {
    label: "Cloud Engineer",
    families: ["cloud-engineering", "devops", "network-engineering", ...SOFTWARE],
    keywords: /\bAWS\b|\bazure\b|\bGCP\b|google\s+cloud|\bcloud\b/i,
  },
  "data-engineer": {
    label: "Data Engineer",
    families: ["data-engineering", "data-analytics", "ai-ml", "cloud-engineering", ...SOFTWARE],
    keywords: /\bETL\b|data\s+pipelines?|\bspark\b|hadoop|airflow|databricks|snowflake|kafka|data\s+engineer|informatica|redshift|bigquery|data\s+warehous/i,
  },
  "bi-developer": {
    label: "BI Developer (Power BI / Tableau)",
    families: ["data-analytics", "business-analysis", "data-engineering"],
    keywords: /power\s*bi|tableau|looker|qlik|\bSSRS\b|\bSSAS\b|business\s+intelligence/i,
  },
  "java-developer": {
    label: "Java Developer",
    families: SOFTWARE,
    keywords: /\bjava\b|spring\s*boot|\bJ2EE\b|hibernate/i,
  },
  "dotnet-developer": {
    label: ".NET Developer",
    families: SOFTWARE,
    keywords: /\.net\b|\bC#|asp\.net|\bdotnet\b/i,
  },
  "python-developer": {
    label: "Python Developer",
    families: [...SOFTWARE, "data-engineering", "ai-ml", "devops"],
    keywords: /\bpython\b|django|flask|fastapi/i,
  },
  "frontend-developer": {
    label: "Frontend / UI Developer",
    families: ["frontend-engineering", "software-engineering"],
    keywords: /react|angular|\bvue\b|javascript|typescript|front[-\s]?end/i,
  },
  "mobile-developer": {
    label: "Mobile App Developer",
    families: SOFTWARE,
    keywords: /\biOS\b|android|\bswift\b|kotlin|flutter|react\s+native|xamarin|mobile\s+app/i,
  },
  cybersecurity: {
    label: "Cybersecurity",
    families: ["security-engineering", "offensive-security", "network-engineering", "cloud-engineering", "devops"],
    keywords: /security|\bSOC\b|\bSIEM\b|splunk|penetration|vulnerabilit|\bCISSP\b|firewall|incident\s+response|\bIAM\b/i,
  },
  "database-administrator": {
    label: "Database Administrator (DBA)",
    keywords: /\bDBA\b|database\s+administrat|oracle\s+database|sql\s+server|postgres|mysql|mongodb/i,
  },
  salesforce: {
    label: "Salesforce",
    keywords: /salesforce|\bSFDC\b|\bapex\b|lightning\s+web\s+components|\bLWC\b/i,
  },
  servicenow: { label: "ServiceNow", keywords: /service\s*now/i },
  workday: { label: "Workday", keywords: /\bworkday\b/i },
  "project-manager": {
    label: "Project Manager / Scrum Master",
    keywords: /project\s+manag|program\s+manag|scrum\s+master|\bPMP\b|\bCSM\b|agile\s+coach|delivery\s+manag|\bPMO\b/i,
  },
  "product-manager": {
    label: "Product Manager",
    families: ["product-management", "business-analysis"],
  },
  "ui-ux-designer": {
    label: "UI / UX Designer",
    families: ["design", "frontend-engineering"],
    keywords: /\bUX\b|\bUI\b|figma|user\s+experience|user\s+interface|adobe\s+xd|wireframe|prototyp/i,
  },
  others: { label: "Others", any: true },
};

export const AREA_IDS = Object.keys(AREAS);
export const areaLabel = (id) => AREAS[id]?.label || id;

export function areaMatches(area, resumeFamily, resumeText = "") {
  const rule = AREAS[area];
  if (!rule) return false;
  if (rule.any) return true;
  if (rule.families && !rule.families.includes(resumeFamily)) return false;
  if (rule.keywords && !rule.keywords.test(resumeText)) return false;
  return true;
}

// Older accounts with no area get one from their first resume's field.
// Fields with no clear area ("other") are left for an admin.
const AREA_FOR_FAMILY = {
  devops: "devops",
  "cloud-engineering": "cloud-engineer",
  "supply-chain": "supply-chain",
  "ai-ml": "ai-ml",
  "data-engineering": "data-engineer",
  "security-engineering": "cybersecurity",
  "offensive-security": "cybersecurity",
  "product-management": "product-manager",
  design: "ui-ux-designer",
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
  // The text only fills gaps in what the AI read. When the AI read a name and
  // none of it is the account's, the text can't overrule it — otherwise the
  // account holder's email (jane.doe@…) at the top of someone else's resume
  // would pass.
  const own = [...first, ...last];
  if (nameSeen.size && !own.some((t) => nameSeen.has(t) || nameSeen.has(t[0]))) return false;
  const seen = new Set([...nameSeen, ...nameTokens(String(resumeText).slice(0, 300))]);
  const full = (toks) => toks.some((t) => t.length > 1 && seen.has(t));
  // Initials only count when the AI read them as part of the name — a lone
  // "a" in the text around it shouldn't pass as one.
  const initial = (toks) => toks.some((t) => nameSeen.has(t[0]));

  if (!last.length) return full(first);
  return (full(first) && (full(last) || initial(last))) || (initial(first) && full(last));
}

