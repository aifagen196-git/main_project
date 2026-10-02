// "Area of interest" choices on sign-up. Values are the matcher's role-family
// ids (backend/src/prompts/prompts.js ROLE_FAMILY_ENUM) so they can feed job
// matching later without a mapping table.
export const AREAS_OF_INTEREST = [
  ["software-engineering", "Software Engineering"],
  ["frontend-engineering", "Frontend Development"],
  ["backend-engineering", "Backend Development"],
  ["devops", "DevOps"],
  ["cloud-engineering", "Cloud Engineering"],
  ["data-analytics", "Data Analytics"],
  ["data-engineering", "Data Engineering"],
  ["ai-ml", "AI / Machine Learning"],
  ["security-engineering", "Cybersecurity"],
  ["network-engineering", "Network Engineering"],
  ["qa-testing", "QA / Testing"],
  ["business-analysis", "Business Analysis"],
  ["product-management", "Product Management"],
  ["design", "UI / UX Design"],
  ["supply-chain", "Supply Chain"],
  ["other", "Other"],
];

export const AREA_LABEL = Object.fromEntries(AREAS_OF_INTEREST);
