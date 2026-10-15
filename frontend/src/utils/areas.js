// "Area of interest" choices (sign-up, Settings), alphabetical with Others
// last. Ids and labels must match the backend's list in
// backend/src/services/resume/resumeOwnership.js (AREAS), which also decides
// which resumes fit each area.
export const AREAS_OF_INTEREST = [
  ["dotnet-developer", ".NET Developer"],
  ["ai-ml", "AI / ML"],
  ["bi-developer", "BI Developer (Power BI / Tableau)"],
  ["business-analyst", "Business Analyst"],
  ["cloud-engineer", "Cloud Engineer"],
  ["cybersecurity", "Cybersecurity"],
  ["data-analyst", "Data Analyst"],
  ["data-center-technician", "Data Center Technician"],
  ["data-engineer", "Data Engineer"],
  ["data-scientist", "Data Scientist"],
  ["database-administrator", "Database Administrator (DBA)"],
  ["devops", "DevOps"],
  ["frontend-developer", "Frontend / UI Developer"],
  ["full-stack", "Full Stack"],
  ["it-support", "IT Support"],
  ["java-developer", "Java Developer"],
  ["mobile-developer", "Mobile App Developer"],
  ["network-engineer", "Network Engineer"],
  ["product-manager", "Product Manager"],
  ["project-manager", "Project Manager / Scrum Master"],
  ["python-developer", "Python Developer"],
  ["quality-automation", "Quality Automation"],
  ["salesforce", "Salesforce"],
  ["sap", "SAP"],
  ["servicenow", "ServiceNow"],
  ["software-engineer", "Software Engineer"],
  ["supply-chain", "Supply Chain"],
  ["ui-ux-designer", "UI / UX Designer"],
  ["workday", "Workday"],
  ["others", "Others"],
];

export const AREA_LABEL = Object.fromEntries(AREAS_OF_INTEREST);
