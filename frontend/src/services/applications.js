import { api } from "./api";

export const APPLICATION_STATUSES = [
  "applied",
  "interviewing",
  "assessment",
  "offer",
  "rejected",
];

export async function getApplications() {
  const { applications } = await api.get("/api/applications");
  return applications || [];
}

export async function addApplication(payload) {
  const { application } = await api.post("/api/applications", payload);
  return application;
}

/** Set of job ids the user has already marked as applied. */
export async function getAppliedJobIds() {
  const apps = await getApplications();
  return apps.map((a) => a.job_id).filter(Boolean);
}

/** One-click "I applied" from a job card. Backend dedupes per job. */
export async function markJobApplied(job) {
  const { application } = await api.post("/api/applications", {
    company: job.company || "Unknown",
    role: job.title || "Unknown role",
    status: "applied",
    match_score: job.match_score ?? null,
    apply_url: job.apply_url ?? null,
    job_id: job.id,
  });
  return application;
}

export async function updateApplicationStatus(id, status) {
  const { application } = await api.patch(`/api/applications/${id}`, { status });
  return application;
}

export async function deleteApplication(id) {
  await api.del(`/api/applications/${id}`);
}
