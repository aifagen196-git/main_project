// "Area of interest" choices (sign-up, Settings). Ids and labels must match
// the backend's list in backend/src/services/resume/resumeOwnership.js
// (AREAS), which also decides which resumes fit each area.
export const AREAS_OF_INTEREST = [
  ["devops", "DevOps"],
  ["supply-chain", "Supply Chain"],
  ["ai-ml", "AI / ML"],
  ["data-scientist", "Data Scientist"],
  ["data-center-technician", "Data Center Technician"],
  ["network-engineer", "Network Engineer"],
  ["business-analyst", "Business Analyst"],
  ["data-analyst", "Data Analyst"],
  ["full-stack", "Full Stack"],
  ["software-engineer", "Software Engineer"],
  ["quality-automation", "Quality Automation"],
  ["it-support", "IT Support"],
  ["sap", "SAP"],
];

export const AREA_LABEL = Object.fromEntries(AREAS_OF_INTEREST);
