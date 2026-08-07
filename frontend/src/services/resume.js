import { api, apiUpload, apiDownload } from "./api";

const ALLOWED_EXTENSIONS = new Set(["pdf", "docx"]);
const MAX_RESUME_BYTES = 10 * 1024 * 1024;

// Client-side pre-check for instant feedback; the backend re-validates.
export function validateResumeFile(file) {
  const ext = file?.name?.split(".").pop()?.toLowerCase();
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error("Please upload a PDF or DOCX resume.");
  }
  if (file.size > MAX_RESUME_BYTES) {
    throw new Error("Resume files must be 10 MB or smaller.");
  }
}

/**
 * Uploads a resume. The backend stores it, extracts text + skills, builds the
 * structured profile, and runs ATS analysis — then returns the processed row.
 */
export async function uploadResume(file) {
  validateResumeFile(file);
  const form = new FormData();
  form.append("file", file);
  const { resume } = await apiUpload("/api/resumes", form);
  return resume;
}

export async function getResumes() {
  const { resumes } = await api.get("/api/resumes");
  return resumes || [];
}

export async function getLatestResume() {
  const { resume } = await api.get("/api/resumes/latest");
  return resume;
}

/** Re-run ATS analysis on a resume (backend). */
export async function analyzeResume(resumeId) {
  const { analysis } = await api.post(`/api/resumes/${resumeId}/analyze`, {});
  return analysis;
}

/** Generate improvement suggestions for a resume (backend). */
export async function improveResume(resumeId) {
  const { improvement } = await api.post(`/api/resumes/${resumeId}/improve`, {});
  return improvement;
}

/** Download the improvement notes as a Word document (no AI usage). */
export async function downloadImprovedResume(improvement) {
  await apiDownload("/api/resumes/improved/docx", { improvement }, "Improved-Resume.docx");
}

/**
 * Download the FULL rewritten resume as a Word document — complete history
 * with improved wording (one AI call server-side; may take up to a minute).
 */
export async function downloadFullResume(resumeId) {
  await apiDownload(`/api/resumes/${resumeId}/rewrite/docx`, {}, "Improved-Resume.docx");
}
